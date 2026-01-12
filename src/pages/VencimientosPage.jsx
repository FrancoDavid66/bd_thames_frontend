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

function pillCls(tone) {
  if (tone === "red") return "bg-red-500/15 text-red-200 border-red-500/30";
  if (tone === "amber") return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  if (tone === "emerald") return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
  return "bg-slate-500/15 text-slate-200 border-slate-500/30";
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

function KpiButton({ label, value, active, onClick, tone = "slate" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border p-3 text-left transition ${
        active ? "ring-2 ring-white/30" : "hover:bg-white/5"
      } ${pillCls(tone)}`}
      title={label}
    >
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-lg font-semibold">{value ?? "—"}</div>
    </button>
  );
}

// ✅ parsea "YYYY-MM-DD" o ISO y devuelve Date local a las 00:00
function parseToLocalDateOnly(v) {
  if (!v) return null;

  // Date instance
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

  // fallback: intentamos Date()
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    d.setHours(0, 0, 0, 0);
    return d;
  }

  return null;
}

function computeDiasFallback(p) {
  // 1) si viene del backend, usarlo
  const dRaw = p?.dias_para_vencer;
  const d = typeof dRaw === "number" ? dRaw : Number(dRaw);
  if (Number.isFinite(d)) return d;

  // 2) fallback: vto_referencia / fecha_vencimiento
  const vto = p?.vto_referencia || p?.fecha_vencimiento;
  const vtoDate = parseToLocalDateOnly(vto);
  if (!vtoDate) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const ms = vtoDate.getTime() - hoy.getTime();
  return Math.round(ms / 86400000);
}

export default function VencimientosPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const items = useSelector(selectVencimientos);
  const resumen = useSelector(selectVencimientosResumen);
  const status = useSelector(selectVencimientosStatus);

  // ✅ oficinas
  const oficinas = useSelector(selectVencimientosOficinas);
  const oficinasStatus = useSelector(selectVencimientosOficinasStatus);

  // tabs
  const [tab, setTab] = useState("por_vencer"); // por_vencer | hoy | vencidas
  const [viewMode, setViewMode] = useState("polizas"); // polizas | asegurados

  // 🔥 forzar recarga aunque el filtro “no cambie”
  const [reloadToken, setReloadToken] = useState(0);

  // filtros
  const [oficina, setOficina] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 350);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // ✅🆕 Rango personalizado (-X / +Y)
  const [useCustomRange, setUseCustomRange] = useState(false);

  // drafts (inputs)
  const [draftPastDays, setDraftPastDays] = useState(2);
  const [draftFutureDays, setDraftFutureDays] = useState(2);

  // applied (lo que realmente se manda al backend)
  const [customPastDays, setCustomPastDays] = useState(2);
  const [customFutureDays, setCustomFutureDays] = useState(2);

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

  // Ventana dinámica según tab (o rango personalizado)
  const { pastDays, futureDays } = useMemo(() => {
    if (useCustomRange) return { pastDays: customPastDays, futureDays: customFutureDays };

    if (tab === "hoy") return { pastDays: 0, futureDays: 0 };
    if (tab === "vencidas") return { pastDays: 30, futureDays: 0 };
    // por_vencer (1-3)
    return { pastDays: 0, futureDays: 3 };
  }, [tab, useCustomRange, customPastDays, customFutureDays]);

  // ✅ modo explícito (backend lo soporta)
  const modo = useMemo(() => {
    if (useCustomRange) return "all";
    if (tab === "hoy") return "hoy";
    if (tab === "vencidas") return "vencidas";
    return "por_vencer";
  }, [tab, useCustomRange]);

  // Cargar oficinas (una vez)
  useEffect(() => {
    dispatch(fetchVencimientosOficinas());
  }, [dispatch]);

  // Persistir oficina desde querystring (solo mount)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(location.search || "");
      const fromUrl = (sp.get("oficina") || "").trim();
      if (fromUrl) setOficina(fromUrl);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantener querystring sincronizado cuando cambia oficina
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
      ordering: "vto_referencia",
    }),
    [oficina, debouncedSearch, pastDays, futureDays, modo, page, pageSize]
  );

  const load = useCallback(
    (opts = {}) => {
      dispatch(fetchVencimientos({ params, force: !!opts.force }));
      dispatch(fetchVencimientosResumen({ params, force: !!opts.force }));
    },
    [dispatch, params]
  );

  // ✅ ahora también recarga con reloadToken
  useEffect(() => {
    load();
  }, [load, reloadToken]);

  // ✅ CAMBIO: calcular _dias con fallback y NO filtrar afuera por null
  const filtered = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    return arr.map((p) => {
      const d = computeDiasFallback(p);
      return { ...p, _dias: Number.isFinite(d) ? d : null };
    });
  }, [items]);

  // ✅ Asegurados deduplicados (NO descarta pólizas sin cliente: crea fila “desconocido”)
  const asegurados = useMemo(() => {
    const arr = Array.isArray(filtered) ? filtered : [];
    const map = new Map();

    for (const p of arr) {
      const c = p?.cliente || {};
      const clienteId = p?.cliente_id ?? c?.id ?? null;
      const dni = c?.dni ?? "";

      const hasClienteKey = !!(clienteId || dni);
      const key = String(clienteId ?? dni ?? `POLIZA_${p?.id ?? "?"}`).trim();
      if (!key) continue;

      const vto = p?.vto_referencia || p?.fecha_vencimiento || null;
      const vtoStr = vto ? fmtVto(vto) : null;

      const dias = p?._dias;
      const diasOk = typeof dias === "number";

      const nombreReal = `${c?.apellido || ""}, ${c?.nombre || ""}`.trim().replace(/^, /, "");
      const nombre = hasClienteKey
        ? nombreReal || "—"
        : `Asegurado desconocido (póliza #${p?.id ?? "?"})`;

      const ofi = p?.oficina ?? "";

      if (!map.has(key)) {
        map.set(key, {
          key,
          cliente_id: clienteId,
          nombre,
          dni: hasClienteKey ? dni : "",
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

      if (diasOk) {
        if (dias < 0) row.vencidas += 1;
        else if (dias === 0) row.hoy += 1;
        else if (dias > 0) row.por_vencer += 1;
      }

      if (diasOk) {
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
  }, [filtered]);

  const title = useCustomRange
    ? `Rango personalizado (-${pastDays} / +${futureDays})`
    : tab === "vencidas"
    ? "Vencidas"
    : tab === "hoy"
    ? "Vence hoy"
    : "Por vencer (1-3 días)";

  const info = useMemo(() => {
    return { polizas: filtered.length, asegurados: asegurados.length };
  }, [filtered, asegurados]);

  const gotoTab = useCallback(
    (nextTab) => {
      setUseCustomRange(false);
      setTab(nextTab);
      setPage(1);
      setViewMode("polizas"); // 🔥 evita “parece que no funciona”
      bumpReload(); // 🔥 recarga aunque sea el mismo tab
    },
    [bumpReload]
  );

  return (
    <div className="p-4 text-slate-100">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h1 className="text-xl font-semibold">Vencimientos</h1>
          <div className="text-sm opacity-75">Mostrando: {title}</div>
          <div className="text-xs opacity-60 mt-1">
            {viewMode === "asegurados"
              ? `Pólizas en filtro: ${info.polizas} • Asegurados listados: ${info.asegurados}`
              : `Pólizas listadas: ${info.polizas}`}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700"
            onClick={() => load({ force: true })}
          >
            Recargar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-3">
        {[
          { id: "por_vencer", label: "Por vencer (1-3)", tone: "emerald" },
          { id: "hoy", label: "Vence hoy", tone: "amber" },
          { id: "vencidas", label: "Vencidas", tone: "red" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => gotoTab(t.id)}
            className={`px-3 py-2 rounded border text-sm transition ${
              !useCustomRange && tab === t.id ? "bg-white/10" : "hover:bg-white/5"
            } ${pillCls(t.tone)}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Rango personalizado */}
      <div className="rounded border border-slate-700 bg-slate-950 p-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useCustomRange}
              onChange={(e) => {
                const next = e.target.checked;
                setUseCustomRange(next);
                setPage(1);
                setViewMode("polizas");
                bumpReload();
                if (next) {
                  setCustomPastDays(toNonNegInt(customPastDays, 0));
                  setCustomFutureDays(toNonNegInt(customFutureDays, 0));
                }
              }}
            />
            <div className="text-sm">
              <span className="font-semibold">Rango personalizado</span>{" "}
              <span className="opacity-70">(vencidas + por vencer juntas)</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs opacity-70">Vencidas (días):</div>
            <input
              className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700"
              type="number"
              min="0"
              value={draftPastDays}
              onChange={(e) => setDraftPastDays(e.target.value)}
              disabled={status === "loading"}
            />

            <div className="text-xs opacity-70">Por vencer (días):</div>
            <input
              className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700"
              type="number"
              min="0"
              value={draftFutureDays}
              onChange={(e) => setDraftFutureDays(e.target.value)}
              disabled={status === "loading"}
            />

            <button
              type="button"
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm"
              onClick={applyCustomRange}
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>

      {/* Switch vista */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setViewMode("polizas")}
          className={`px-3 py-2 rounded border text-sm transition ${
            viewMode === "polizas" ? "bg-white/10" : "hover:bg-white/5"
          }`}
        >
          Vista: Pólizas ({filtered.length})
        </button>

        <button
          type="button"
          onClick={() => setViewMode("asegurados")}
          className={`px-3 py-2 rounded border text-sm transition ${
            viewMode === "asegurados" ? "bg-white/10" : "hover:bg-white/5"
          }`}
        >
          Vista: Asegurados ({asegurados.length})
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
        <KpiButton
          label="Vencidas 30"
          value={resumen?.vencidas_30}
          tone="red"
          active={!useCustomRange && tab === "vencidas"}
          onClick={() => gotoTab("vencidas")}
        />
        <KpiButton
          label="Vencidas 14"
          value={resumen?.vencidas_14}
          tone="red"
          active={!useCustomRange && tab === "vencidas"}
          onClick={() => gotoTab("vencidas")}
        />
        <KpiButton
          label="Vencidas 7"
          value={resumen?.vencidas_7}
          tone="red"
          active={!useCustomRange && tab === "vencidas"}
          onClick={() => gotoTab("vencidas")}
        />
        <KpiButton
          label="Vencidas 3"
          value={resumen?.vencidas_3}
          tone="red"
          active={!useCustomRange && tab === "vencidas"}
          onClick={() => gotoTab("vencidas")}
        />
        <KpiButton
          label="Vence hoy"
          value={resumen?.vence_hoy}
          tone="amber"
          active={!useCustomRange && tab === "hoy"}
          onClick={() => gotoTab("hoy")}
        />
        <KpiButton
          label="Por vencer (3)"
          value={resumen?.por_vencer_3}
          tone="emerald"
          active={!useCustomRange && tab === "por_vencer"}
          onClick={() => gotoTab("por_vencer")}
        />
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
        <input
          className="px-3 py-2 rounded bg-slate-900 border border-slate-700"
          placeholder="Buscar (cliente, patente, póliza...)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
            bumpReload();
          }}
        />

        <select
          className="px-3 py-2 rounded bg-slate-900 border border-slate-700"
          value={oficina}
          disabled={oficinasStatus === "loading" || (Array.isArray(oficinas) && oficinas.length === 0)}
          onChange={(e) => {
            setOficina(e.target.value);
            setPage(1);
            bumpReload();
          }}
          title="Filtrar por oficina"
        >
          <option value="">
            {oficinasStatus === "loading"
              ? "Cargando oficinas…"
              : oficinas?.length
              ? "Todas las oficinas"
              : "Sin oficinas"}
          </option>

          {Array.isArray(oficinas) &&
            oficinas.map((o) => (
              <option key={String(o.id)} value={String(o.id)}>
                {o.nombre}
              </option>
            ))}
        </select>

        <select
          className="px-3 py-2 rounded bg-slate-900 border border-slate-700"
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
            bumpReload();
          }}
        >
          {[25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}/pág
            </option>
          ))}
        </select>
      </div>

      {status === "loading" ? (
        <div className="opacity-80">Cargando…</div>
      ) : (
        <>
          {viewMode === "polizas" ? (
            <div className="rounded border border-slate-700 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-900 text-xs font-semibold border-b border-slate-700">
                <div className="col-span-2">Patente</div>
                <div className="col-span-3">Asegurado</div>
                <div className="col-span-2">Vto</div>
                <div className="col-span-1 text-center">Días</div>
                <div className="col-span-2">Compañía</div>
                <div className="col-span-1">Oficina</div>
                <div className="col-span-1 text-right">Abrir</div>
              </div>

              {filtered.length === 0 ? (
                <div className="p-4 text-sm opacity-80">Sin resultados.</div>
              ) : (
                filtered.map((p) => {
                  const d = p?._dias;
                  const tone = toneByDias(d);

                  const cliente = p?.cliente
                    ? `${p.cliente.apellido || ""}, ${p.cliente.nombre || ""}`.trim()
                    : "—";

                  return (
                    <div
                      key={p.id}
                      className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-800 bg-slate-950 hover:bg-white/5 text-sm"
                    >
                      <div className="col-span-2 font-semibold">{p?.patente || "—"}</div>

                      <div className="col-span-3">
                        <div className="truncate">{cliente}</div>
                        <div className="text-xs opacity-70 truncate">Póliza: {p?.numero_poliza || "s/n"}</div>
                      </div>

                      <div className="col-span-2">{fmtVto(p?.vto_referencia || p?.fecha_vencimiento)}</div>

                      <div className="col-span-1 flex justify-center">
                        <span className={`px-2 py-1 rounded border text-xs ${pillCls(tone)}`}>
                          {d ?? "—"}
                        </span>
                      </div>

                      <div className="col-span-2 truncate">{p?.compania_nombre || p?.compania || "—"}</div>

                      <div className="col-span-1 truncate">{p?.oficina ?? "—"}</div>

                      <div className="col-span-1 text-right">
                        <NavLink
                          to={`/polizas/${p.id}`}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs"
                        >
                          Ver
                        </NavLink>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="rounded border border-slate-700 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-900 text-xs font-semibold border-b border-slate-700">
                <div className="col-span-4">Asegurado</div>
                <div className="col-span-2">DNI</div>
                <div className="col-span-2">Oficina</div>
                <div className="col-span-1 text-center">Pólizas</div>
                <div className="col-span-2">Vto más próximo</div>
                <div className="col-span-1 text-center">Urgencia</div>
              </div>

              {asegurados.length === 0 ? (
                <div className="p-4 text-sm opacity-80">Sin asegurados en este filtro.</div>
              ) : (
                asegurados.map((a) => {
                  const d = a?.dias_mas_proximo;
                  const tone = toneByDias(typeof d === "number" ? d : null);

                  return (
                    <div
                      key={a.key}
                      className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-800 bg-slate-950 hover:bg-white/5 text-sm"
                    >
                      <div className="col-span-4">
                        <div className="font-semibold truncate">{a.nombre}</div>
                        <div className="text-xs opacity-70">
                          {a.vencidas ? `Vencidas:${a.vencidas} ` : ""}
                          {a.hoy ? `Hoy:${a.hoy} ` : ""}
                          {a.por_vencer ? `PorVencer:${a.por_vencer}` : ""}
                        </div>

                        {a.cliente_id ? (
                          <NavLink
                            to={`/clientes/${a.cliente_id}`}
                            className="text-xs underline opacity-80 hover:opacity-100"
                          >
                            Ver cliente
                          </NavLink>
                        ) : a.poliza_id_ref ? (
                          <NavLink
                            to={`/polizas/${a.poliza_id_ref}`}
                            className="text-xs underline opacity-80 hover:opacity-100"
                          >
                            Ver póliza
                          </NavLink>
                        ) : null}
                      </div>

                      <div className="col-span-2 truncate">{a.dni || "—"}</div>
                      <div className="col-span-2 truncate">{a.oficina || "—"}</div>

                      <div className="col-span-1 text-center font-semibold">{a.polizas_count}</div>

                      <div className="col-span-2">{a.vto_mas_proximo || "—"}</div>

                      <div className="col-span-1 flex justify-center">
                        <span className={`px-2 py-1 rounded border text-xs ${pillCls(tone)}`}>
                          {d ?? "—"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
