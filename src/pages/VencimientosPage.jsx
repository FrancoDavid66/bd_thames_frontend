// src/pages/VencimientosPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  fetchVencimientos,
  fetchVencimientosResumen,
  fetchVencimientosOficinas,
  selectVencimientos,
  selectVencimientosResumen,
  selectVencimientosStatus,
  selectVencimientosOficinas,
  selectVencimientosOficinasStatus,
} from "../store/slices/vencimientosSlice";

import { FaSyncAlt, FaFileExport, FaFileAlt, FaUsers, FaSpinner } from "react-icons/fa";

import VencimientosTabs from "../components/vencimientos/VencimientosTabs";
import VencimientosSummary from "../components/vencimientos/VencimientosSummary";
import VencimientosFiltersBar from "../components/vencimientos/VencimientosFiltersBar";
import VencimientosPagination from "../components/vencimientos/VencimientosPagination";
import VencimientosPolizasTable from "../components/vencimientos/VencimientosPolizasTable";
import VencimientosAseguradosTable from "../components/vencimientos/VencimientosAseguradosTable";
import VencimientosExportModal from "../components/vencimientos/VencimientosExportModal";

// 🎯 Lógica unificada (compartida con Bajas y Renovaciones)
import { getDiasParaVencer } from "../utils/cuotas";

// 🔹 helper debounce simple
function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function toneByDias(d) {
  if (d === null || d === undefined) return "slate";
  if (d < 0) return "red";
  if (d === 0) return "amber";
  if (d > 0 && d <= 3) return "emerald";
  return "slate";
}

// 🚀 Helper de estilos actualizado para los pills (píldoras) de días restantes en las tablas
function pillCls(tone) {
  const base = "font-bold shadow-sm transition-colors";
  if (tone === "red") return `${base} bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border border-red-200 dark:border-red-500/30`;
  if (tone === "amber") return `${base} bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30`;
  if (tone === "emerald") return `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30`;
  return `${base} bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600`;
}

function badgeCls(kind) {
  if (kind === "finalizada") return "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-none";
  if (kind === "vencida") return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-none";
  if (kind === "activa") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-none";
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-none";
}

// ✅ dd/mm/aaaa (soporta "YYYY-MM-DD" o ISO "YYYY-MM-DDTHH:mm...")
function fmtVto(v) {
  if (!v) return "—";
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const m2 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m2) return m2[0];
  return s.slice(0, 10);
}

function toNonNegInt(x, fallback = 0) {
  const n = Number(x);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

// ✅ parsea "YYYY-MM-DD" o ISO y devuelve Date local a las 00:00
function parseToLocalDateOnly(v) {
  if (!v) return null;

  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const d = new Date(v);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const da = Number(m[3]);
    if (!y || !mo || !da) return null;
    const d = new Date(y, mo - 1, da);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    d.setHours(0, 0, 0, 0);
    return d;
  }

  return null;
}

function isFinalizada(p) {
  const e = (p?.estado || "").toString().trim().toLowerCase();
  return e === "finalizada";
}

function computeDiasFallback(p) {
  if (isFinalizada(p)) return null;
  // 🎯 Misma fuente que Bajas y Renovaciones (vto última cuota − hoy, con signo)
  const d = getDiasParaVencer(p);
  return Number.isFinite(d) ? d : null;
}

// 📞 TEL robusto
function getTelefonoFromPoliza(p) {
  const direct = p?.cliente_telefono ?? p?.clienteTelefono ?? "";
  if (direct !== null && direct !== undefined) {
    const s = String(direct).trim();
    if (s) return s;
  }

  const c = p?.cliente || {};
  const candidates = ["telefono", "celular", "whatsapp", "telefono1", "telefono2", "tel", "movil", "mobile", "phone", "numero"];
  for (const k of candidates) {
    const v = c?.[k];
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function normalizePhoneDigits(phone) {
  if (!phone) return "";
  return String(phone).replace(/[^\d]/g, "");
}

function waUrl(phone) {
  const digits0 = normalizePhoneDigits(phone);
  if (!digits0) return "";

  let d = digits0;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (!d.startsWith("54")) d = `54${d}`;
  return `https://wa.me/${d}`;
}

export default function VencimientosPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  // 🚀 BUSCAMOS AL USUARIO EN EL ESTADO GLOBAL DE REDUX
  const authUser = useSelector((state) => state.auth?.user || state.user?.user || state.usuarios?.me || null);
  const esAdmin = authUser ? (authUser.is_superuser || authUser?.perfil?.rol === 'ADMIN') : true;

  const items = useSelector(selectVencimientos);
  const resumen = useSelector(selectVencimientosResumen);
  const status = useSelector(selectVencimientosStatus);

  const oficinas = useSelector(selectVencimientosOficinas);
  const oficinasStatus = useSelector(selectVencimientosOficinasStatus);

  // paginación DRF
  const totalCount = useSelector((s) => Number(s?.vencimientos?.count ?? 0));
  const nextUrl = useSelector((s) => s?.vencimientos?.next ?? null);
  const prevUrl = useSelector((s) => s?.vencimientos?.previous ?? null);

  const [tab, setTab] = useState("por_vencer");
  const [viewMode, setViewMode] = useState("polizas");

  const [reloadToken, setReloadToken] = useState(0);

  const [oficina, setOficina] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 350);

  const [includeFinalizadas, setIncludeFinalizadas] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [useCustomRange, setUseCustomRange] = useState(false);
  const [draftPastDays, setDraftPastDays] = useState(2);
  const [draftFutureDays, setDraftFutureDays] = useState(2);
  const [customPastDays, setCustomPastDays] = useState(2);
  const [customFutureDays, setCustomFutureDays] = useState(2);

  const [baseDate, setBaseDate] = useState("");

  const [sortMode, setSortMode] = useState("urgente");

  const bumpReload = useCallback(() => setReloadToken((t) => t + 1), []);

  const applyCustomRange = useCallback(() => {
    const p = toNonNegInt(draftPastDays, 0);
    const f = toNonNegInt(draftFutureDays, 0);
    setCustomPastDays(p);
    setCustomFutureDays(f);
    setUseCustomRange(true);
    setPage(1);
    setViewMode("polizas");
    bumpReload();
  }, [draftPastDays, draftFutureDays, bumpReload]);

  const { pastDays, futureDays } = useMemo(() => {
    if (useCustomRange) return { pastDays: customPastDays, futureDays: customFutureDays };
    if (tab === "hoy") return { pastDays: 0, futureDays: 0 };
    if (tab === "vencidas") return { pastDays: 30, futureDays: 0 };
    return { pastDays: 0, futureDays: 3 };
  }, [tab, useCustomRange, customPastDays, customFutureDays]);

  const modo = useMemo(() => {
    if (useCustomRange) return "all";
    if (tab === "hoy") return "hoy";
    if (tab === "vencidas") return "vencidas";
    return "por_vencer";
  }, [tab, useCustomRange]);

  const ordering = useMemo(() => {
    if (sortMode === "lejos") return "-vto_referencia";
    return "vto_referencia";
  }, [sortMode]);

  useEffect(() => {
    dispatch(fetchVencimientosOficinas());
  }, [dispatch]);

  // mantener oficina en querystring
  useEffect(() => {
    try {
      const sp = new URLSearchParams(location.search || "");
      const fromUrl = (sp.get("oficina") || "").trim();
      if (fromUrl) setOficina(fromUrl);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(location.search || "");
      if (oficina) sp.set("oficina", oficina);
      else sp.delete("oficina");
      navigate({ search: sp.toString() ? `?${sp.toString()}` : "" }, { replace: true });
    } catch {}
  }, [oficina, location.search, navigate]);

  const params = useMemo(
    () => ({
      oficina: oficina || undefined,
      search: debouncedSearch || undefined,
      past_days: pastDays,
      future_days: futureDays,
      modo,
      page,
      page_size: pageSize,
      ordering,
      include_finalizadas: includeFinalizadas ? 1 : undefined,
      fecha: baseDate || undefined,
    }),
    [oficina, debouncedSearch, pastDays, futureDays, modo, page, pageSize, ordering, includeFinalizadas, baseDate]
  );

  const load = useCallback(
    (opts = {}) => {
      dispatch(fetchVencimientos({ params, force: !!opts.force }));
      dispatch(fetchVencimientosResumen({ params, force: !!opts.force }));
    },
    [dispatch, params]
  );

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const oficinaNameById = useMemo(() => {
    const map = new Map();
    if (Array.isArray(oficinas)) {
      for (const o of oficinas) {
        const id = String(o?.id ?? "").trim();
        const nombre = String(o?.nombre ?? "").trim();
        if (id) map.set(id, nombre || id);
      }
    }
    return map;
  }, [oficinas]);

  const getOficinaLabel = useCallback(
    (p) => {
      const raw = p?.oficina;
      if (raw === null || raw === undefined) return "—";
      const key = String(raw).trim();
      if (!key) return "—";
      return oficinaNameById.get(key) || key;
    },
    [oficinaNameById]
  );

  const polizas = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    const withDias = arr.map((p) => ({ ...p, _dias: Number.isFinite(computeDiasFallback(p)) ? computeDiasFallback(p) : null }));

    if (sortMode === "dias_asc") {
      return [...withDias].sort((a, b) => {
        const da = a._dias ?? 999999;
        const db = b._dias ?? 999999;
        return da - db;
      });
    }

    if (sortMode === "dias_desc") {
      return [...withDias].sort((a, b) => {
        const da = a._dias ?? -999999;
        const db = b._dias ?? -999999;
        return db - da;
      });
    }

    return withDias;
  }, [items, sortMode]);

  const asegurados = useMemo(() => {
    const arr = Array.isArray(polizas) ? polizas : [];
    const map = new Map();

    for (const p of arr) {
      const c = p?.cliente || {};
      const clienteId = p?.cliente_id ?? c?.id ?? null;
      const dni = c?.dni ?? c?.dni_cuit_cuil ?? "";

      const hasClienteKey = !!(clienteId || dni);
      const key = String(clienteId ?? dni ?? `POLIZA_${p?.id ?? "?"}`).trim();
      if (!key) continue;

      const vto = p?.vto_referencia || p?.fecha_vencimiento || null;
      const vtoStr = vto ? fmtVto(vto) : null;

      const dias = p?._dias;
      const diasOk = typeof dias === "number";

      const nombreReal = `${c?.apellido || ""}, ${c?.nombre || ""}`.trim().replace(/^, /, "");
      const nombre = hasClienteKey ? nombreReal || "—" : `Asegurado desconocido (póliza #${p?.id ?? "?"})`;

      const ofi = getOficinaLabel(p);
      const tel = getTelefonoFromPoliza(p);
      const finalizada = isFinalizada(p);

      if (!map.has(key)) {
        map.set(key, {
          key,
          cliente_id: clienteId,
          nombre,
          dni: hasClienteKey ? dni : "",
          telefono: tel,
          oficina: ofi,
          polizas_count: 0,
          vto_mas_proximo: vtoStr,
          dias_mas_proximo: diasOk ? dias : null,
          vencidas: 0,
          hoy: 0,
          por_vencer: 0,
          poliza_id_ref: hasClienteKey ? null : p?.id ?? null,
        });
      }

      const row = map.get(key);
      row.polizas_count += 1;
      if (!row.telefono && tel) row.telefono = tel;

      if (!finalizada && diasOk) {
        if (dias < 0) row.vencidas += 1;
        else if (dias === 0) row.hoy += 1;
        else if (dias > 0) row.por_vencer += 1;
      }

      if (!finalizada && diasOk) {
        if (row.dias_mas_proximo === null || dias < row.dias_mas_proximo) {
          row.dias_mas_proximo = dias;
          row.vto_mas_proximo = vtoStr;
          row.oficina = ofi || row.oficina;
          if (!hasClienteKey) row.poliza_id_ref = p?.id ?? row.poliza_id_ref;
        }
      } else if (!row.vto_mas_proximo && vtoStr) {
        row.vto_mas_proximo = vtoStr;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const da = a.dias_mas_proximo ?? 999999;
      const db = b.dias_mas_proximo ?? 999999;
      return da - db;
    });
  }, [polizas, getOficinaLabel]);

  const totalPages = useMemo(() => {
    const ps = Math.max(1, Number(pageSize) || 1);
    const c = Math.max(0, Number(totalCount) || 0);
    return Math.max(1, Math.ceil(c / ps));
  }, [totalCount, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const showingFrom = useMemo(() => (!totalCount ? 0 : (page - 1) * pageSize + 1), [totalCount, page, pageSize]);
  const showingTo = useMemo(() => (!totalCount ? 0 : Math.min(page * pageSize, totalCount)), [totalCount, page, pageSize]);

  const gotoTab = useCallback(
    (nextTab) => {
      setUseCustomRange(false);
      setTab(nextTab);
      setPage(1);
      setViewMode("polizas");
      bumpReload();
    },
    [bumpReload]
  );

  const title = useCustomRange
    ? `Rango personalizado (-${pastDays} / +${futureDays})`
    : tab === "vencidas"
    ? "Vencidas"
    : tab === "hoy"
    ? "Vence hoy"
    : "Por vencer (1-3 días)";

  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="p-4 sm:p-6 text-slate-800 dark:text-slate-100 min-h-full">
      
      {/* 🚀 HEADER SUPERIOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800 dark:text-white">
            Vencimientos
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Mostrando: <span className="text-blue-600 dark:text-blue-400 font-bold">{title}</span>
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium">
              Pólizas en vista: {polizas.length} de {totalCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-600 focus:outline-none"
            onClick={() => load({ force: true })}
            disabled={status === "loading"}
          >
            <FaSyncAlt className={status === "loading" ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Recargar</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 hover:shadow-blue-500/40 transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:outline-none"
            onClick={() => setExportOpen(true)}
          >
            <FaFileExport />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      <VencimientosTabs tab={tab} onChangeTab={gotoTab} />

      <VencimientosSummary
        resumen={resumen}
        useCustomRange={useCustomRange}
        tab={tab}
        onSelectTab={gotoTab}
      />

      <VencimientosFiltersBar
        search={search}
        onChangeSearch={(v) => {
          setSearch(v);
          setPage(1);
          bumpReload();
        }}
        oficina={oficina}
        oficinas={oficinas}
        oficinasStatus={oficinasStatus}
        onChangeOficina={(v) => {
          setOficina(v);
          setPage(1);
          bumpReload();
        }}
        pageSize={pageSize}
        onChangePageSize={(n) => {
          setPageSize(n);
          setPage(1);
          bumpReload();
        }}
        includeFinalizadas={includeFinalizadas}
        onToggleFinalizadas={(v) => {
          setIncludeFinalizadas(v);
          setPage(1);
          bumpReload();
        }}
        sortMode={sortMode}
        onChangeSortMode={(v) => {
          setSortMode(v);
          setPage(1);
          bumpReload();
        }}
        baseDate={baseDate}
        onChangeBaseDate={(v) => {
          setBaseDate(v);
          setPage(1);
          bumpReload();
        }}
        useCustomRange={useCustomRange}
        onToggleCustomRange={(v) => {
          setUseCustomRange(v);
          setPage(1);
          setViewMode("polizas");
          bumpReload();
        }}
        draftPastDays={draftPastDays}
        setDraftPastDays={setDraftPastDays}
        draftFutureDays={draftFutureDays}
        setDraftFutureDays={setDraftFutureDays}
        onApplyCustomRange={applyCustomRange}
        status={status}
        esAdmin={esAdmin}
      />

      {/* 🚀 SWITCH DE VISTA (Pólizas / Asegurados) TIPO SEGMENTED CONTROL */}
      <div className="flex justify-center md:justify-start mt-6 mb-2">
        <div className="inline-flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode("polizas")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === "polizas" 
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent"
            }`}
          >
            <FaFileAlt /> Pólizas ({polizas.length})
          </button>

          <button
            type="button"
            onClick={() => setViewMode("asegurados")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === "asegurados" 
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent"
            }`}
          >
            <FaUsers /> Asegurados ({asegurados.length})
          </button>
        </div>
      </div>

      <VencimientosPagination
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        showingFrom={showingFrom}
        showingTo={showingTo}
        nextUrl={nextUrl}
        prevUrl={prevUrl}
      />

      {/* 🚀 ESTADO DE CARGA MODERNIZADO */}
      {status === "loading" ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
          <FaSpinner className="text-4xl animate-spin mb-4 text-blue-500" />
          <p className="text-sm font-semibold tracking-wide uppercase">Cargando vencimientos...</p>
        </div>
      ) : viewMode === "polizas" ? (
        <VencimientosPolizasTable
          polizas={polizas}
          getOficinaLabel={getOficinaLabel}
          fmtVto={fmtVto}
          pillCls={pillCls}
          toneByDias={toneByDias}
          badgeCls={badgeCls}
          isFinalizada={isFinalizada}
          getTelefonoFromPoliza={getTelefonoFromPoliza}
          waUrl={waUrl}
          NavLink={NavLink}
        />
      ) : (
        <VencimientosAseguradosTable
          asegurados={asegurados}
          waUrl={waUrl}
          pillCls={pillCls}
          toneByDias={toneByDias}
          NavLink={NavLink}
        />
      )}

      <div className="mt-4">
        <VencimientosPagination
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
          showingFrom={showingFrom}
          showingTo={showingTo}
          nextUrl={nextUrl}
          prevUrl={prevUrl}
        />
      </div>

      {exportOpen ? (
        <VencimientosExportModal
          onClose={() => setExportOpen(false)}
          currentParams={params}
          context={{
            oficina,
            search: debouncedSearch,
            includeFinalizadas,
            baseDate,
            sortMode,
            useCustomRange,
            customPastDays,
            customFutureDays,
          }}
          pageData={{
            polizas,
            asegurados,
            getOficinaLabel,
            fmtVto,
          }}
        />
      ) : null}
    </div>
  );
}