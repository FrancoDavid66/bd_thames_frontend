// src/pages/RenovacionesPage.jsx
//
// Bandeja de renovaciones con 3 tabs:
//   - Pendientes:   pólizas que aún no se renovaron y siguen vivas
//   - Renovadas:    pólizas que ya tienen una versión nueva (es_renovacion=true)
//   - No renovaron: vencidas hace 30+ días sin renovar, o marcadas manualmente
//
// El front filtra/segmenta los datos. El backend se ajustará después para
// devolver campos extra (primera_cuota_pagada, cuotas_pagadas, no_renueva_manual, etc.)

import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import toast from "react-hot-toast";
import {
  HiRefresh,
  HiClipboardCheck,
  HiExclamation,
  HiCheckCircle,
  HiXCircle,
} from "react-icons/hi";

import {
  fetchRenovaciones,
  renovarPoliza,
  marcarNoRenueva,
  desmarcarNoRenueva,
  fetchRenovacionesOficinas,
  fetchRenovacionesResumen,
  fetchRenovacionesGlobalResumen,
  selectRenovacionesItems,
  selectRenovacionesStatus,
  selectRenovacionesError,
  selectRenovacionesCount,
  selectRenovacionesOficinas,
  selectRenovacionesResumen,
  selectRenovacionesGlobalResumen,
} from "../store/slices/renovacionesSlice";

import RenovacionModal from "../components/renovaciones/RenovacionModal";
import RenovacionesFiltersBar from "../components/renovaciones/RenovacionesFiltersBar";
import RenovacionesBucketsBar from "../components/renovaciones/RenovacionesBucketsBar";
import RenovacionesTabs from "../components/renovaciones/RenovacionesTabs";
import Renovacionestable from "../components/renovaciones/Renovacionestable";
import { useAuth } from "../context/AuthContext";

const cx = (...a) => a.filter(Boolean).join(" ");

/* =========================================================
 * Helpers de detección de estado en frontend
 * (mientras el backend no devuelva los flags)
 * ========================================================= */

const DIAS_SIN_GESTION_LIMITE = 30;

function getVencimiento(p) {
  return (
    p?.ultima_cuota_vencimiento ||
    p?.vto_referencia ||
    p?.fecha_vencimiento ||
    p?.proxima_vencimiento_impaga ||
    null
  );
}

function diasVencidaDe(p) {
  const v = getVencimiento(p);
  if (!v) return 0;
  try {
    const d = dayjs().startOf("day").diff(dayjs(v).startOf("day"), "day");
    return d > 0 ? d : 0;
  } catch {
    return 0;
  }
}

function isRenovada(p) {
  return !!p?.es_renovacion || !!p?.poliza_origen || !!p?.poliza_origen_id;
}

function isMarcadaNoRenueva(p) {
  return !!(p?.no_renueva_manual || p?.motivo_no_renueva || p?.no_renueva);
}

function isVencidaSinGestion(p) {
  // Vencida hace 30+ días, no renovada, sin marca manual
  if (isRenovada(p)) return false;
  if (isMarcadaNoRenueva(p)) return false;
  const dv = diasVencidaDe(p);
  return dv >= DIAS_SIN_GESTION_LIMITE;
}

/* =========================================================
 * Badges chiquitos
 * ========================================================= */

const Badge = ({ children, tone = "neutral" }) => {
  const map = {
    neutral: "bg-white/10 text-white border-white/15",
    green: "bg-emerald-500/15 text-emerald-100 border-emerald-400/30",
    yellow: "bg-amber-500/15 text-amber-100 border-amber-400/30",
    red: "bg-rose-500/15 text-rose-100 border-rose-400/30",
    blue: "bg-sky-500/15 text-sky-100 border-sky-400/30",
    sky: "bg-sky-500/15 text-sky-100 border-sky-400/30",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        map[tone] || map.neutral
      )}
    >
      {children}
    </span>
  );
};

/* =========================================================
 * KPIs en cards
 * ========================================================= */

function KpiCard({ label, value, tone = "neutral", hint }) {
  const toneMap = {
    neutral: "border-white/10 bg-white/5",
    green: "border-emerald-400/20 bg-emerald-500/5",
    yellow: "border-amber-400/20 bg-amber-500/5",
    red: "border-rose-400/20 bg-rose-500/5",
    sky: "border-sky-400/20 bg-sky-500/5",
  };
  const valueColor = {
    neutral: "text-white",
    green: "text-emerald-200",
    yellow: "text-amber-200",
    red: "text-rose-200",
    sky: "text-sky-200",
  };
  return (
    <div
      className={cx(
        "rounded-xl border px-3 py-2.5",
        toneMap[tone] || toneMap.neutral
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">
        {label}
      </div>
      <div className={cx("mt-0.5 text-xl font-extrabold tabular-nums", valueColor[tone] || valueColor.neutral)}>
        {value ?? 0}
      </div>
      {hint && (
        <div className="mt-0.5 text-[10px] text-white/40">{hint}</div>
      )}
    </div>
  );
}

/* =========================================================
 * Normalización de oficinas
 * ========================================================= */

function normalizeOficinaOption(x) {
  if (x == null) return null;
  if (typeof x === "string" || typeof x === "number") {
    const s = String(x).trim();
    if (!s) return null;
    return { value: s, label: s };
  }
  if (typeof x === "object") {
    const value =
      x.value ??
      x.id ??
      x.pk ??
      x.codigo ??
      x.key ??
      x.nombre ??
      x.name ??
      x.label ??
      "";
    const label =
      x.label ??
      x.nombre ??
      x.name ??
      x.descripcion ??
      x.value ??
      x.id ??
      "";
    const v = String(value || "").trim();
    const l = String(label || "").trim();
    if (!v && !l) return null;
    return { value: v || l, label: l || v };
  }
  return null;
}

/* =========================================================
 * Componente principal
 * ========================================================= */

const TABS_VALIDAS = ["pendientes", "renovadas", "no_renovaron"];

export default function RenovacionesPage() {
  dayjs.locale("es");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isWebAdmin =
    user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const items = useSelector(selectRenovacionesItems);
  const status = useSelector(selectRenovacionesStatus);
  const error = useSelector(selectRenovacionesError);
  const count = useSelector(selectRenovacionesCount);

  const oficinas = useSelector(selectRenovacionesOficinas);
  const resumen = useSelector(selectRenovacionesResumen);
  const globalResumen = useSelector(selectRenovacionesGlobalResumen) || {};

  // 🆕 Tab activo (persistido en localStorage)
  const [tab, setTab] = useState(() => {
    const saved = localStorage.getItem("renovaciones.tab");
    return TABS_VALIDAS.includes(saved) ? saved : "pendientes";
  });

  useEffect(() => {
    localStorage.setItem("renovaciones.tab", tab);
  }, [tab]);

  // Oficina (admin elige, no-admin forzado)
  const [oficina, setOficina] = useState(() => {
    if (!isWebAdmin && user?.perfil?.oficina) {
      return String(user.perfil.oficina.id || user.perfil.oficina);
    }
    return localStorage.getItem("scope.renovaciones.oficina") || "";
  });

  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal de "marcar no renueva" con motivo opcional
  const [noRenuevaModal, setNoRenuevaModal] = useState({ open: false, item: null });
  const [noRenuevaMotivo, setNoRenuevaMotivo] = useState("");

  const loading = status === "loading";

  useEffect(() => {
    dispatch(fetchRenovacionesOficinas());
  }, [dispatch]);

  const oficinasOptions = useMemo(() => {
    const arr = Array.isArray(oficinas) ? oficinas : [];
    const seen = new Map();
    const out = [];
    for (const raw of arr) {
      const opt = normalizeOficinaOption(raw);
      if (!opt) continue;
      const key = String(opt.value || "").trim();
      if (!key) continue;
      if (!seen.has(key)) {
        seen.set(key, true);
        out.push({ value: key, label: String(opt.label || key).trim() || key });
      }
    }
    out.sort((a, b) => String(a.label).localeCompare(String(b.label), "es"));
    return out;
  }, [oficinas]);

  /* ============ CARGA DE DATOS según TAB ============
     Estrategia:
     - tab=pendientes  → endpoint normal (oculta ya renovadas por default).
     - tab=renovadas   → include_renovadas=1 (trae también las renovadas).
                         Después filtramos en frontend con es_renovacion=true.
     - tab=no_renovaron → include_renovadas=1 (necesitamos verlas).
                         Filtramos en frontend a las que entran en la regla.
  ============================================================== */

  const includeRenovadas = tab !== "pendientes";

  const load = useCallback(
    async (opts = {}) => {
      const ofi =
        !isWebAdmin && user?.perfil?.oficina
          ? String(user.perfil.oficina.id || user.perfil.oficina)
          : opts.oficina !== undefined
          ? opts.oficina
          : oficina;

      const payload = {
        dias: 30,
        solo_pendientes: soloPendientes,
        search: (search || "").trim(),
        ordering: "vto_referencia",
        oficina: ofi || undefined,
        bucket: bucket || undefined,
        page,
        page_size: pageSize,
        tab, // 🆕 (informativo; el backend puede ignorarlo por ahora)
        include_renovadas: includeRenovadas ? 1 : undefined,
        ...opts,
      };

      try {
        await dispatch(fetchRenovaciones(payload)).unwrap();
      } catch {}
    },
    [
      soloPendientes,
      search,
      oficina,
      bucket,
      page,
      pageSize,
      dispatch,
      isWebAdmin,
      user,
      tab,
      includeRenovadas,
    ]
  );

  const loadResumen = useCallback(
    async (opts = {}) => {
      const ofi =
        !isWebAdmin && user?.perfil?.oficina
          ? String(user.perfil.oficina.id || user.perfil.oficina)
          : opts.oficina !== undefined
          ? opts.oficina
          : oficina;

      const payload = {
        dias: 30,
        solo_pendientes: soloPendientes,
        search: (search || "").trim(),
        oficina: ofi || undefined,
        ...opts,
      };

      try {
        dispatch(fetchRenovacionesResumen(payload));

        if (isWebAdmin) {
          dispatch(
            fetchRenovacionesGlobalResumen({
              dias: 30,
              solo_pendientes: soloPendientes,
              search: (search || "").trim(),
            })
          );
        }
      } catch {}
    },
    [soloPendientes, search, oficina, dispatch, isWebAdmin, user]
  );

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    loadResumen();
  }, [loadResumen]);

  // Guardamos preferencia si es Admin
  useEffect(() => {
    if (isWebAdmin) {
      localStorage.setItem("scope.renovaciones.oficina", oficina);
    }
  }, [oficina, isWebAdmin]);

  // Cuando cambia el tab, volvemos a página 1
  useEffect(() => {
    setPage(1);
  }, [tab]);

  /* ============ FILTRADO EN FRONTEND POR TAB ============ */
  const itemsRaw = Array.isArray(items) ? items : [];

  const itemsForTab = useMemo(() => {
    if (tab === "pendientes") {
      // Quitamos las que ya están renovadas o marcadas como no renueva
      return itemsRaw.filter(
        (p) => !isRenovada(p) && !isMarcadaNoRenueva(p)
      );
    }
    if (tab === "renovadas") {
      return itemsRaw.filter(isRenovada);
    }
    if (tab === "no_renovaron") {
      return itemsRaw.filter(
        (p) => isMarcadaNoRenueva(p) || isVencidaSinGestion(p)
      );
    }
    return itemsRaw;
  }, [itemsRaw, tab]);

  /* ============ CONTADORES PARA TABS Y KPIs ============ */
  const tabCounts = useMemo(() => {
    return {
      pendientes: itemsRaw.filter(
        (p) => !isRenovada(p) && !isMarcadaNoRenueva(p)
      ).length,
      renovadas: itemsRaw.filter(isRenovada).length,
      no_renovaron: itemsRaw.filter(
        (p) => isMarcadaNoRenueva(p) || isVencidaSinGestion(p)
      ).length,
    };
  }, [itemsRaw]);

  // KPIs específicos del tab activo
  const kpis = useMemo(() => {
    if (tab === "pendientes") {
      const urgentes = itemsForTab.filter((x) => {
        const d = x?.dias_para_vencer_poliza;
        return d != null && Number(d) <= 3;
      }).length;
      const venceHoy = itemsForTab.filter((x) => {
        const d = x?.dias_para_vencer_poliza;
        return d != null && Number(d) === 0;
      }).length;
      const vencidas = itemsForTab.filter((x) => diasVencidaDe(x) > 0).length;
      return {
        total: itemsForTab.length,
        urgentes,
        venceHoy,
        vencidas,
      };
    }

    if (tab === "renovadas") {
      const pago1ra = itemsForTab.filter(
        (x) => x?.primera_cuota_pagada === true
      ).length;
      const noPago1ra = itemsForTab.filter(
        (x) => x?.primera_cuota_pagada === false
      ).length;
      const enMora = itemsForTab.filter(
        (x) => x?.estado_pago_renovacion === "mora"
      ).length;
      const alDia = itemsForTab.filter(
        (x) => x?.estado_pago_renovacion === "al_dia"
      ).length;
      const pagadasTotal = itemsForTab.filter(
        (x) => x?.estado_pago_renovacion === "pagada_total"
      ).length;
      return {
        total: itemsForTab.length,
        pago1ra,
        noPago1ra,
        enMora,
        alDia,
        pagadasTotal,
      };
    }

    if (tab === "no_renovaron") {
      const manuales = itemsForTab.filter(isMarcadaNoRenueva).length;
      const automaticas = itemsForTab.filter(
        (p) => !isMarcadaNoRenueva(p) && isVencidaSinGestion(p)
      ).length;
      const masDe60 = itemsForTab.filter((p) => diasVencidaDe(p) >= 60).length;
      return {
        total: itemsForTab.length,
        manuales,
        automaticas,
        masDe60,
      };
    }
    return {};
  }, [tab, itemsForTab]);

  const totalCount = Number(count || 0);
  const receivedCount = itemsForTab.length;
  // ⚠️ Mientras el backend no implemente tabs, totalPages se basa en `count`
  // que viene del endpoint (NO del filtro local). Por eso forzamos al menos 1.
  const totalPages =
    pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [safePage, page]);

  const applyFilters = () => {
    setPage(1);
    load({ force: true, page: 1 });
    loadResumen({ force: true });
  };

  const canPrev = safePage > 1;
  const canNext = totalCount
    ? safePage < totalPages
    : receivedCount === pageSize;

  /* ============ Quick buttons (solo en tab pendientes) ============ */
  const quickButtons = useMemo(
    () => [
      { id: "", label: "Todas", count: resumen?.buckets?.todas, tone: "neutral" },
      { id: "proximos_3", label: "Próx. 3 días", count: resumen?.buckets?.proximos_3, tone: "blue" },
      { id: "vence_hoy", label: "Hoy", count: resumen?.buckets?.vence_hoy, tone: "yellow" },
      { id: "vencidas_3", label: "Venc. 3 días", count: resumen?.buckets?.vencidas_3, tone: "red" },
      { id: "vencidas", label: "Vencidas Antiguas", count: resumen?.buckets?.vencidas, tone: "red" },
    ],
    [resumen]
  );

  const globalQuickButtons = useMemo(
    () => [
      { id: "", label: "Todas", count: globalResumen?.buckets?.todas, tone: "neutral" },
      { id: "proximos_3", label: "Próx. 3 días", count: globalResumen?.buckets?.proximos_3, tone: "blue" },
      { id: "vence_hoy", label: "Hoy", count: globalResumen?.buckets?.vence_hoy, tone: "yellow" },
      { id: "vencidas_3", label: "Venc. 3 días", count: globalResumen?.buckets?.vencidas_3, tone: "red" },
      { id: "vencidas", label: "Vencidas Antiguas", count: globalResumen?.buckets?.vencidas, tone: "red" },
    ],
    [globalResumen]
  );

  /* ============ Handlers de "No renueva" ============ */
  const openNoRenuevaModal = useCallback((item) => {
    setNoRenuevaMotivo("");
    setNoRenuevaModal({ open: true, item });
  }, []);

  const closeNoRenuevaModal = useCallback(() => {
    setNoRenuevaModal({ open: false, item: null });
    setNoRenuevaMotivo("");
  }, []);

  const confirmarNoRenueva = useCallback(async () => {
    const item = noRenuevaModal.item;
    if (!item?.id) return;
    try {
      await dispatch(
        marcarNoRenueva({ polizaId: item.id, motivo: noRenuevaMotivo })
      ).unwrap();
      toast.success("Marcada como no renueva");
      closeNoRenuevaModal();
      await load({ force: true });
      await loadResumen({ force: true });
    } catch (e) {
      toast.error(e?.message || "No se pudo marcar (¿endpoint backend pendiente?)");
    }
  }, [dispatch, noRenuevaModal.item, noRenuevaMotivo, load, loadResumen, closeNoRenuevaModal]);

  const handleDesmarcarNoRenueva = useCallback(
    async (item) => {
      if (!item?.id) return;
      try {
        await dispatch(desmarcarNoRenueva({ polizaId: item.id })).unwrap();
        toast.success("Marca eliminada");
        await load({ force: true });
        await loadResumen({ force: true });
      } catch (e) {
        toast.error(e?.message || "No se pudo deshacer (¿endpoint backend pendiente?)");
      }
    },
    [dispatch, load, loadResumen]
  );

  /* =========================================================
   * Render
   * ========================================================= */
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-3 md:p-6">
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 shadow-lg">
        {/* ============ Header ============ */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <HiClipboardCheck className="text-emerald-400" />
              Renovaciones
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Gestioná las pólizas próximas a vencer, las renovadas y las que no se renovarán.
              {!isWebAdmin && (
                <span className="text-sky-400 ml-2 font-bold uppercase tracking-widest text-[10px]">
                  ({user?.perfil?.oficina_nombre || "Tu Sucursal"})
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
              onClick={() => {
                load({ force: true });
                loadResumen({ force: true });
              }}
              disabled={loading}
              type="button"
            >
              <HiRefresh className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>
          </div>
        </div>

        <RenovacionesFiltersBar
          loading={loading}
          search={search}
          setSearch={setSearch}
          oficina={oficina}
          setOficina={setOficina}
          soloPendientes={soloPendientes}
          setSoloPendientes={setSoloPendientes}
          bucket={bucket}
          setBucket={setBucket}
          oficinasOptions={oficinasOptions}
          resumenBuckets={resumen?.buckets}
          onApply={applyFilters}
          isWebAdmin={isWebAdmin}
          totalCount={totalCount}
        />

        {/* Buckets bar — solo visible en tab Pendientes (es lo que tiene sentido ahí) */}
        {tab === "pendientes" && (
          <>
            {isWebAdmin ? (
              <div className="flex flex-col gap-6 mt-6">
                <div>
                  <h3 className="text-[11px] font-black text-sky-400/80 uppercase tracking-[0.2em] mb-3 ml-2">
                    Métricas Globales (Toda la Empresa)
                  </h3>
                  <RenovacionesBucketsBar
                    quickButtons={globalQuickButtons}
                    activeBucket={bucket}
                    onSelectBucket={setBucket}
                  />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-sky-400/80 uppercase tracking-[0.2em] mb-3 ml-2">
                    Métricas por Sucursal (Según filtro actual)
                  </h3>
                  <RenovacionesBucketsBar
                    quickButtons={quickButtons}
                    activeBucket={bucket}
                    onSelectBucket={setBucket}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <h3 className="text-[11px] font-black text-sky-400/80 uppercase tracking-[0.2em] mb-3 ml-2">
                  Métricas de Tu Sucursal
                </h3>
                <RenovacionesBucketsBar
                  quickButtons={quickButtons}
                  activeBucket={bucket}
                  onSelectBucket={setBucket}
                />
              </div>
            )}
          </>
        )}

        {!!error && (
          <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-200 flex items-center gap-2">
            <HiExclamation className="text-lg" />
            No se pudieron cargar las pólizas. Intenta actualizar.
          </div>
        )}
      </div>

      {/* ============ TABS ============ */}
      <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/40 px-4 pt-3">
        <RenovacionesTabs
          activeTab={tab}
          onChange={setTab}
          counts={tabCounts}
        />

        {/* KPIs del tab activo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 py-4">
          {tab === "pendientes" && (
            <>
              <KpiCard label="Total" value={kpis.total} tone="neutral" />
              <KpiCard label="Urgentes ≤3d" value={kpis.urgentes} tone="yellow" />
              <KpiCard label="Vence hoy" value={kpis.venceHoy} tone="red" />
              <KpiCard label="Ya vencidas" value={kpis.vencidas} tone="red" />
            </>
          )}
          {tab === "renovadas" && (
            <>
              <KpiCard label="Total renovadas" value={kpis.total} tone="sky" />
              <KpiCard label="Pagó 1ª cuota" value={kpis.pago1ra} tone="green" hint="Confirmadas" />
              <KpiCard label="No pagó 1ª" value={kpis.noPago1ra} tone="yellow" hint="Riesgo" />
              <KpiCard label="Al día" value={kpis.alDia} tone="green" />
              <KpiCard label="En mora" value={kpis.enMora} tone="red" />
              <KpiCard label="Pagadas total" value={kpis.pagadasTotal} tone="sky" />
            </>
          )}
          {tab === "no_renovaron" && (
            <>
              <KpiCard label="Total" value={kpis.total} tone="neutral" />
              <KpiCard label="Marcadas manual" value={kpis.manuales} tone="red" />
              <KpiCard label="Automáticas (30+d)" value={kpis.automaticas} tone="yellow" hint="Sin gestión" />
              <KpiCard label="60+ días vencidas" value={kpis.masDe60} tone="red" />
            </>
          )}
        </div>
      </div>

      {/* ============ Paginación ============ */}
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-white/65">
          {tab !== "pendientes" ? (
            <span>
              Mostrando <span className="text-white font-semibold">{receivedCount}</span>{" "}
              {tab === "renovadas" ? "renovadas" : "sin renovar"} de{" "}
              <span className="text-white font-semibold">{totalCount}</span> pólizas en pantalla
            </span>
          ) : (
            <span>
              Página <span className="text-white font-semibold">{safePage}</span> de{" "}
              <span className="text-white font-semibold">{totalPages}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="text-xs font-semibold text-white/50">Ver:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value || 25));
                setPage(1);
              }}
              className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer"
              aria-label="Tamaño de página"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n} className="bg-slate-900 text-white">
                  {n}
                </option>
              ))}
            </select>
          </div>

          <button
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
            disabled={!canPrev || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <button
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
            disabled={!canNext || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* ============ TABLA ============ */}
      <Renovacionestable
        items={itemsForTab}
        oficinasOptions={oficinasOptions}
        loading={loading}
        submitting={submitting}
        tab={tab}
        onRenovar={(p) => {
          setSelected(p);
          setModalOpen(true);
        }}
        onMarcarNoRenueva={openNoRenuevaModal}
        onDesmarcarNoRenueva={handleDesmarcarNoRenueva}
      />

      {/* ============ Modal de renovación ============ */}
      <RenovacionModal
        open={modalOpen}
        item={selected}
        onClose={() => {
          if (submitting) return;
          setModalOpen(false);
          setSelected(null);
        }}
        onSubmit={async (payload) => {
          if (!selected?.id) return;
          setSubmitting(true);

          const finalPayload = {
            ...(payload || {}),
            transferir_grua:
              payload?.transferir_grua ??
              payload?.transferirGrua ??
              payload?.grua ??
              1,
          };

          try {
            const res = await dispatch(
              renovarPoliza({ id: selected.id, payload: finalPayload })
            ).unwrap();
            const nuevaId = res?.data?.id;

            toast.success("Póliza renovada correctamente");
            setModalOpen(false);
            setSelected(null);

            if (nuevaId) {
              navigate(`/polizas/${nuevaId}`);
              return;
            }

            await load({ force: true });
            await loadResumen({ force: true });
          } catch (e) {
            toast.error(e?.message || "No se pudo renovar");
          } finally {
            setSubmitting(false);
          }
        }}
        submitting={submitting}
      />

      {/* ============ Modal "Marcar no renueva" ============ */}
      {noRenuevaModal.open && (
        <NoRenuevaModal
          item={noRenuevaModal.item}
          motivo={noRenuevaMotivo}
          setMotivo={setNoRenuevaMotivo}
          onConfirm={confirmarNoRenueva}
          onClose={closeNoRenuevaModal}
        />
      )}
    </div>
  );
}

/* =========================================================
 * Modal simple para marcar "no renueva" con motivo opcional
 * ========================================================= */

function NoRenuevaModal({ item, motivo, setMotivo, onConfirm, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <div className="text-lg font-extrabold text-white">
              Marcar como "no renueva"
            </div>
            <div className="mt-1 text-xs text-white/70">
              {item?.patente ? (
                <>
                  <span className="font-semibold text-white font-mono">{item.patente}</span>
                  {" · "}
                  {item?.cliente?.apellido}, {item?.cliente?.nombre}
                </>
              ) : (
                "Confirmá la acción"
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-white hover:bg-white/15 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-100">
            La póliza saldrá del tab "Pendientes" y aparecerá en "No renovaron".
            Podés revertirlo desde ese tab con "Deshacer".
          </div>

          <div>
            <label className="text-xs font-semibold text-white/80 mb-1.5 block">
              Motivo (opcional)
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: el cliente vendió el auto, migró a otra compañía, no contesta…"
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30 transition-colors"
              maxLength={300}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-white hover:bg-white/15 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-xl bg-rose-500/80 hover:bg-rose-500 px-5 py-2 font-extrabold text-white transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}