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
  fetchRenovacionesRecientes,
  renovarPoliza,
  marcarNoRenueva,
  desmarcarNoRenueva,
  verificarRenovacion,
  desVerificarRenovacion,
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
import Renovacionestable from "../components/renovaciones/Renovacionestable";
import DescartarRenovacionModal from "../components/renovaciones/DescartarRenovacionModal";
import PolizaYaRenovadaModal from "../components/renovaciones/PolizaYaRenovadaModal";
import { useRenovacionesProgreso } from "../hooks/useRenovacionesProgreso";
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
  // 🚀 Campo nuevo del backend (renovacion_descartada). Mantenemos legacy por si quedó algo viejo.
  return !!(
    p?.renovacion_descartada ||
    p?.no_renueva_manual ||
    p?.motivo_no_renueva ||
    p?.no_renueva
  );
}

function isVerificada(p) {
  return !!p?.renovacion_verificada;
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

const TABS_VALIDAS = ["pendientes", "en_seguimiento", "renovadas", "no_renovaron"];

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

  // 🆕 Recién finalizadas (≤3 días) sin renovar
  const recientes = useSelector((s) => s.renovaciones?.recientes) || [];

  const oficinas = useSelector(selectRenovacionesOficinas);
  const resumen = useSelector(selectRenovacionesResumen);
  const globalResumen = useSelector(selectRenovacionesGlobalResumen) || {};

  // 🆕 Vista fija en "pendientes" (la app se simplificó: solo lista + buscador)
  const [tab, setTab] = useState("pendientes");

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

  // 🆕 Errores estructurados del backend
  const [renovarError, setRenovarError] = useState(null);    // banner dentro del modal de renovar
  const [polizaRenovadaModal, setPolizaRenovadaModal] = useState({ open: false, error: null });

  // 🎮 Gamificación: tracking del progreso del día
  const {
    hechasHoy,
    renovadasHoy,
    verificadasHoy,
    descartadasHoy,
    registrar: registrarProgreso,
  } = useRenovacionesProgreso();

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

  // 🆕 Admin sin sucursal elegida → autoseleccionamos la primera disponible.
  // (Sin sucursal, el admin no tiene "scope" y el backend devuelve 0 en todo.)
  useEffect(() => {
    if (isWebAdmin && !oficina && oficinasOptions.length > 0) {
      setOficina(oficinasOptions[0].value);
    }
  }, [isWebAdmin, oficina, oficinasOptions]);

  /* ============ CARGA DE DATOS según TAB ============
     Estrategia:
     - tab=pendientes      → endpoint normal (oculta ya renovadas por default).
                             Filtramos en frontend para quitar las "en seguimiento" también.
     - tab=en_seguimiento  → endpoint normal (las verificadas siguen apareciendo).
                             Filtramos en frontend a las que tienen renovacion_verificada=true.
     - tab=renovadas       → include_renovadas=1 (trae también las renovadas).
                             Después filtramos en frontend con es_renovacion=true.
     - tab=no_renovaron    → include_renovadas=1 (necesitamos verlas).
                             Filtramos en frontend a las que entran en la regla.
  ============================================================== */

  const includeRenovadas = tab === "renovadas" || tab === "no_renovaron";

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

      // 🆕 Cargar en paralelo las recién finalizadas (≤3 días) sin renovar
      dispatch(fetchRenovacionesRecientes({ oficina: ofi || undefined }));
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
      // Quitamos las que ya están renovadas, marcadas como no renueva, o en seguimiento
      return itemsRaw.filter(
        (p) => !isRenovada(p) && !isMarcadaNoRenueva(p) && !isVerificada(p)
      );
    }
    if (tab === "en_seguimiento") {
      // Las que el operador está laburando (verificadas pero sin decidir aún)
      return itemsRaw.filter(
        (p) => isVerificada(p) && !isRenovada(p) && !isMarcadaNoRenueva(p)
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
        (p) => !isRenovada(p) && !isMarcadaNoRenueva(p) && !isVerificada(p)
      ).length,
      en_seguimiento: itemsRaw.filter(
        (p) => isVerificada(p) && !isRenovada(p) && !isMarcadaNoRenueva(p)
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

    if (tab === "en_seguimiento") {
      // Mismos KPIs que pendientes (son pólizas en gestión activa)
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

  /* ============ Quick buttons — 3 burbujas: Todas / Próximas / Vencidas ============ */
  // Mantenemos los IDs originales del backend para no romper el filtro server-side.
  // - "" → Todas
  // - "proximos_3" → Próximas (incluye hoy + próximos días hábiles)
  // - "vencidas" → Vencidas (todas las vencidas, antiguas + recientes)
  const quickButtons = useMemo(() => {
    const b = resumen?.buckets || {};
    // Sumamos counts agrupados para reflejar la consolidación
    const proximas = (Number(b.proximos_3) || 0) + (Number(b.vence_hoy) || 0);
    const vencidas = (Number(b.vencidas) || 0) + (Number(b.vencidas_3) || 0);
    return [
      { id: "", label: "Todas", count: b.todas, tone: "neutral" },
      { id: "proximos_3", label: "Próximas", count: proximas, tone: "blue" },
      { id: "vencidas", label: "Vencidas", count: vencidas, tone: "red" },
    ];
  }, [resumen]);

  const globalQuickButtons = useMemo(() => {
    const b = globalResumen?.buckets || {};
    const proximas = (Number(b.proximos_3) || 0) + (Number(b.vence_hoy) || 0);
    const vencidas = (Number(b.vencidas) || 0) + (Number(b.vencidas_3) || 0);
    return [
      { id: "", label: "Todas", count: b.todas, tone: "neutral" },
      { id: "proximos_3", label: "Próximas", count: proximas, tone: "blue" },
      { id: "vencidas", label: "Vencidas", count: vencidas, tone: "red" },
    ];
  }, [globalResumen]);

  /* ============ Contadores para los chips del rediseño ============ */
  const chipCounts = useMemo(() => {
    const b = resumen?.buckets || {};
    const total =
      Number(resumen?.pendientes_ventana) || Number(b.todas) || 0;
    return {
      todas: total,
      hoy: Number(b.vence_hoy) || 0,
      tresdias:
        (Number(b.vence_en_1) || 0) +
        (Number(b.vence_en_2) || 0) +
        (Number(b.vence_en_3) || 0),
      vencidas: (Number(b.vencidas_3) || 0) + (Number(b.vencidas_4_mas) || 0),
    };
  }, [resumen]);

  /* ============ Handlers de "No renueva" ============ */
  const openNoRenuevaModal = useCallback((item) => {
    setNoRenuevaModal({ open: true, item });
  }, []);

  const closeNoRenuevaModal = useCallback(() => {
    setNoRenuevaModal({ open: false, item: null });
  }, []);

  // 🚀 Recibe { motivo, detalle } desde DescartarRenovacionModal
  const confirmarNoRenueva = useCallback(async ({ motivo, detalle }) => {
    const item = noRenuevaModal.item;
    if (!item?.id) return;
    try {
      setSubmitting(true);
      await dispatch(
        marcarNoRenueva({ polizaId: item.id, motivo, detalle })
      ).unwrap();
      registrarProgreso("descartar");
      toast.success("Marcada como 'no renueva'");
      closeNoRenuevaModal();
      await load({ force: true });
      await loadResumen({ force: true });
    } catch (e) {
      toast.error(e?.message || "No se pudo marcar");
    } finally {
      setSubmitting(false);
    }
  }, [dispatch, noRenuevaModal.item, load, loadResumen, closeNoRenuevaModal, registrarProgreso]);

  const handleDesmarcarNoRenueva = useCallback(
    async (item) => {
      if (!item?.id) return;
      try {
        await dispatch(desmarcarNoRenueva({ polizaId: item.id })).unwrap();
        toast.success("Marca eliminada — vuelve a Pendientes");
        await load({ force: true });
        await loadResumen({ force: true });
      } catch (e) {
        toast.error(e?.message || "No se pudo deshacer");
      }
    },
    [dispatch, load, loadResumen]
  );

  /* ============ Handlers de "Verificar" ============ */
  const handleVerificar = useCallback(
    async (item) => {
      if (!item?.id) return;
      try {
        await dispatch(verificarRenovacion({ polizaId: item.id })).unwrap();
        registrarProgreso("verificar");
        toast.success("Verificada");
      } catch (e) {
        toast.error(e?.message || "No se pudo verificar");
      }
    },
    [dispatch, registrarProgreso]
  );

  const handleDesVerificar = useCallback(
    async (item) => {
      if (!item?.id) return;
      try {
        await dispatch(desVerificarRenovacion({ polizaId: item.id })).unwrap();
        toast.success("Verificación deshecha");
      } catch (e) {
        toast.error(e?.message || "No se pudo deshacer");
      }
    },
    [dispatch]
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
          minimal
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

        {!!error && (
          <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-200 flex items-center gap-2">
            <HiExclamation className="text-lg" />
            No se pudieron cargar las pólizas. Intenta actualizar.
          </div>
        )}
      </div>

      {/* ============ FILTROS RÁPIDOS (chips) ============ */}
      <RenovacionesBucketsBar
        activeBucket={bucket}
        onSelectBucket={setBucket}
        counts={chipCounts}
        loading={loading}
      />

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
        onVerificar={handleVerificar}
        onDesVerificar={handleDesVerificar}
      />

      {/* ============ Modal de renovación ============ */}
      <RenovacionModal
        open={modalOpen}
        item={selected}
        error={renovarError}
        onClose={() => {
          if (submitting) return;
          setModalOpen(false);
          setSelected(null);
          setRenovarError(null);
        }}
        onSubmit={async (payload) => {
          if (!selected?.id) return;
          setSubmitting(true);
          setRenovarError(null);

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

            registrarProgreso("renovar");
            toast.success("Póliza renovada correctamente");
            setModalOpen(false);
            setSelected(null);
            setRenovarError(null);

            if (nuevaId) {
              navigate(`/polizas/${nuevaId}`);
              return;
            }

            await load({ force: true });
            await loadResumen({ force: true });
          } catch (e) {
            // 🆕 Detectar error estructurado del backend
            // Puede venir como e.raw (axios) o e.response.data dependiendo del slice
            const backendError =
              e?.raw ||
              e?.response?.data ||
              e?.data ||
              (typeof e === "object" && e?.error ? e : null);

            if (backendError?.error) {
              // Error estructurado
              const code = backendError.error;

              if (code === "POLIZA_YA_RENOVADA") {
                // Cerrar modal de renovar y abrir modal especial
                setModalOpen(false);
                setRenovarError(null);
                setPolizaRenovadaModal({ open: true, error: backendError });
              } else if (
                code === "COBERTURA_NO_CONFIGURADA" ||
                code === "SIN_CUOTAS_REFERENCIA" ||
                code === "NUMERO_DUPLICADO" ||
                code === "COMPANIA_INVALIDA"
              ) {
                // Mostrar banner DENTRO del modal de renovar
                setRenovarError(backendError);
              } else if (code === "POLIZA_FINALIZADA") {
                // Cerrar modal con toast simple
                setModalOpen(false);
                setSelected(null);
                toast.error(backendError.message);
              } else {
                // Otros errores: mostrar banner dentro del modal
                setRenovarError(backendError);
              }
            } else {
              // Error genérico (red, etc.)
              toast.error(e?.message || "No se pudo renovar");
            }
          } finally {
            setSubmitting(false);
          }
        }}
        submitting={submitting}
      />

      {/* ============ Modal "Póliza ya renovada" ============ */}
      <PolizaYaRenovadaModal
        open={polizaRenovadaModal.open}
        error={polizaRenovadaModal.error}
        onClose={() => {
          setPolizaRenovadaModal({ open: false, error: null });
          setSelected(null);
        }}
      />

      {/* ============ Modal "Marcar no renu eva" ============ */}
      <DescartarRenovacionModal
        open={noRenuevaModal.open}
        item={noRenuevaModal.item}
        onClose={closeNoRenuevaModal}
        onSubmit={confirmarNoRenueva}
        submitting={submitting}
      />
    </div>
  );
}