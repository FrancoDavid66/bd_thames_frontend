// src/pages/RenovacionesPage.jsx
//
// Bandeja de renovaciones con 3 pestañas:
//   - Vencen hoy:  pólizas cuya cobertura termina hoy
//   - En 3 días:   vencen dentro de los próximos 3 días
//   - Vencidas:    ya se pasó la fecha y no se renovaron
//
// 🆕 MODO BÚSQUEDA:
//   Si el usuario escribe algo en el buscador (2+ caracteres), las pestañas
//   quedan en pausa y se muestran TODAS las pólizas que coinciden, sin importar
//   cuándo vencen ni si ya se renovaron. Así se puede renovar CUALQUIER póliza
//   buscándola por patente, nombre, DNI, número o compañía.
//   Al limpiar el buscador, vuelven las pestañas normales.

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
  HiSearch,
  HiX,
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
import RenovacionesToolbar from "../components/renovaciones/RenovacionesToolbar";
import Renovacionestable from "../components/renovaciones/Renovacionestable";
import DescartarRenovacionModal from "../components/renovaciones/DescartarRenovacionModal";
import PolizaYaRenovadaModal from "../components/renovaciones/PolizaYaRenovadaModal";
import { useRenovacionesProgreso } from "../hooks/useRenovacionesProgreso";
import { useAuth } from "../context/AuthContext";

// 🎨 UI THAMES
import PageContainer from "../components/ui/PageContainer";
import Boton3D from "../components/ui/Boton3D";

// Helpers compartidos (cx y getVencimiento antes estaban definidos acá)
import { cx, getVencimiento } from "../components/renovaciones/utils";

/* =========================================================
 * Helpers de detección de estado en frontend
 * (mientras el backend no devuelva los flags)
 * ========================================================= */

const DIAS_SIN_GESTION_LIMITE = 30;

// 🆕 A partir de cuántos caracteres se considera "búsqueda activa".
const MIN_CHARS_BUSQUEDA = 2;

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

// Días para que venza la póliza. Negativo = ya vencida, 0 = vence hoy, positivo = futuro.
// Prioriza el campo del backend; si falta, lo calcula desde la fecha de vencimiento.
function diasParaVencer(p) {
  const d = p?.dias_para_vencer_poliza;
  if (d != null && d !== "") return Number(d);
  const v = getVencimiento(p);
  if (!v) return null;
  try {
    return dayjs(v).startOf("day").diff(dayjs().startOf("day"), "day");
  } catch {
    return null;
  }
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

// Clasifica cada póliza en UNO de los 3 filtros, o null si no se muestra.
// Orden de prioridad fijo.
function clasificarTab(p) {
  // Las que marqué "no renueva" no se muestran en ningún lado.
  if (isMarcadaNoRenueva(p)) return null;
  // Las que ya renové tampoco (esta pantalla es solo lo que falta hacer).
  if (isRenovada(p)) return null;

  // Si ya tiene una renovación, o quedó finalizada/cancelada, se va de la tabla.
  if (p?.tiene_renovacion) return null;
  const estado = String(p?.estado || "").toLowerCase();
  if (estado === "finalizada" || estado === "cancelada") return null;

  const d = diasParaVencer(p);
  if (d == null) return null;

  if (d < 0) return "vencidas";       // se me pasó renovarla
  if (d === 0) return "renovar_hoy";  // vence hoy
  if (d <= 3) return "en_3_dias";     // vence dentro de los próximos 3 días
  return null;                         // vence más adelante → no la muestro todavía
}

/* =========================================================
 * Resumen en una línea
 * ========================================================= */

function ResumenInline({ tab, kpis }) {
  const N = ({ children, tone = "titulo" }) => {
    const map = {
      titulo: "text-titulo dark:text-titulo-dark",
      amarillo: "text-duo-amarillo-sombra dark:text-duo-amarillo",
      rojo: "text-duo-rojo",
      azul: "text-duo-azul",
    };
    return <span className={cx("font-black tabular-nums", map[tone])}>{children}</span>;
  };

  // 🆕 Modo búsqueda: no hay "vencen hoy / en 3 días", hay resultados.
  if (tab === "busqueda") {
    return (
      <span className="text-[13px] font-bold text-suave dark:text-suave-dark">
        <N tone="azul">{kpis.total}</N>{" "}
        {kpis.total === 1 ? "póliza encontrada" : "pólizas encontradas"}
        {kpis.yaRenovadas > 0 && (
          <>
            {" · "}
            <N tone="amarillo">{kpis.yaRenovadas}</N> ya renovada
            {kpis.yaRenovadas === 1 ? "" : "s"}
          </>
        )}
      </span>
    );
  }

  if (tab === "vencidas") {
    return (
      <span className="text-[13px] font-bold text-suave dark:text-suave-dark">
        <N tone="rojo">{kpis.total}</N> sin renovar · <N tone="amarillo">{kpis.masDe30}</N> hace 30+ días
      </span>
    );
  }

  const label = tab === "renovar_hoy" ? "que vencen hoy" : "para los próximos 3 días";
  return (
    <span className="text-[13px] font-bold text-suave dark:text-suave-dark">
      <N>{kpis.total}</N> {label}
    </span>
  );
}

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

const TABS_VALIDAS = ["renovar_hoy", "en_3_dias", "vencidas"];

// Mapeo de nombres viejos → nuevos (para no romper el localStorage de quien ya usó la app)
const TAB_LEGACY_MAP = {
  pendientes: "renovar_hoy",
  en_seguimiento: "renovar_hoy",
  por_renovar: "en_3_dias",
  no_renovaron: "vencidas",
  sin_renovar: "vencidas",
  renovadas: "renovar_hoy",
};

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
    const normalized = TAB_LEGACY_MAP[saved] || saved;
    return TABS_VALIDAS.includes(normalized) ? normalized : "renovar_hoy";
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

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal de "marcar no renueva" con motivo opcional
  const [noRenuevaModal, setNoRenuevaModal] = useState({ open: false, item: null });

  // 🆕 Errores estructurados del backend
  const [renovarError, setRenovarError] = useState(null);    // banner dentro del modal de renovar
  const [polizaRenovadaModal, setPolizaRenovadaModal] = useState({ open: false, error: null, item: null });
  // Último payload del modal de renovar, para reintentar con confirmación
  const [ultimoPayload, setUltimoPayload] = useState(null);

  // 🎮 Gamificación: tracking del progreso del día
  const {
    hechasHoy,
    renovadasHoy,
    verificadasHoy,
    descartadasHoy,
    registrar: registrarProgreso,
  } = useRenovacionesProgreso();

  const loading = status === "loading";

  // 🆕 ¿Estamos buscando? Si sí, las pestañas quedan en pausa.
  const searchTrim = (search || "").trim();
  const modoBusqueda = searchTrim.length >= MIN_CHARS_BUSQUEDA;

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

  /* ============ CARGA DE DATOS ============
     Traemos TODA la ventana de una sola vez (sin depender del tab ni de la
     página). Así los contadores de las pestañas y las filas mostradas salen
     siempre del mismo conjunto y nunca quedan desfasados.

     🆕 Cuando hay búsqueda activa mandamos `dias` bien alto: el backend usa
     ese número para marcar "necesita renovar", y así una póliza que vence
     dentro de 8 meses también entra en el resultado.
  ============================================================== */

  const load = useCallback(
    async (opts = {}) => {
      const ofi =
        !isWebAdmin && user?.perfil?.oficina
          ? String(user.perfil.oficina.id || user.perfil.oficina)
          : opts.oficina !== undefined
          ? opts.oficina
          : oficina;

      const buscando = (search || "").trim().length >= MIN_CHARS_BUSQUEDA;

      const payload = {
        dias: buscando ? 3650 : 30,
        solo_pendientes: false,
        search: (search || "").trim(),
        ordering: "vto_referencia",
        oficina: ofi || undefined,
        page: 1,
        page_size: 500,
        include_renovadas: 1, // siempre, para ver también las vencidas viejas
        ...opts,
      };

      try {
        await dispatch(fetchRenovaciones(payload)).unwrap();
      } catch {}
    },
    [search, oficina, dispatch, isWebAdmin, user]
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
        solo_pendientes: false,
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
              solo_pendientes: false,
              search: (search || "").trim(),
            })
          );
        }
      } catch {}
    },
    [search, oficina, dispatch, isWebAdmin, user]
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

  // 🆕 Cuando cambia la búsqueda, también volvemos a página 1
  useEffect(() => {
    setPage(1);
  }, [searchTrim]);

  /* ============ FILTRADO EN FRONTEND POR TAB ============ */
  const itemsRaw = Array.isArray(items) ? items : [];

  const itemsForTab = useMemo(() => {
    // 🆕 MODO BÚSQUEDA: mostramos TODO lo que devolvió el backend, sin colador.
    // Venza cuando venza, esté renovada, descartada o finalizada: si coincide
    // con lo que escribiste, aparece y se puede renovar.
    if (modoBusqueda) return itemsRaw;
    return itemsRaw.filter((p) => clasificarTab(p) === tab);
  }, [itemsRaw, tab, modoBusqueda]);

  /* ============ CONTADORES PARA TABS Y KPIs ============ */
  const tabCounts = useMemo(() => {
    const acc = { renovar_hoy: 0, en_3_dias: 0, vencidas: 0 };
    for (const p of itemsRaw) {
      const t = clasificarTab(p);
      if (t && acc[t] != null) acc[t] += 1;
    }
    return acc;
  }, [itemsRaw]);

  // KPIs específicos del tab activo
  const kpis = useMemo(() => {
    const total = itemsForTab.length;

    // 🆕 En búsqueda avisamos cuántas de esas ya tienen renovación hecha.
    if (modoBusqueda) {
      const yaRenovadas = itemsForTab.filter(
        (p) => isRenovada(p) || !!p?.tiene_renovacion
      ).length;
      return { total, yaRenovadas };
    }

    if (tab === "vencidas") {
      const masDe30 = itemsForTab.filter((p) => diasVencidaDe(p) >= 30).length;
      return { total, masDe30 };
    }
    return { total };
  }, [tab, itemsForTab, modoBusqueda]);

  const totalCount = itemsForTab.length;
  const totalPages =
    pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;
  const safePage = Math.min(Math.max(1, page), totalPages);

  // Página visible (paginamos en frontend sobre el filtro del tab)
  const itemsPaginados = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return itemsForTab.slice(start, start + pageSize);
  }, [itemsForTab, safePage, pageSize]);

  const receivedCount = itemsPaginados.length;

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [safePage, page]);

  const applyFilters = () => {
    setPage(1);
    load({ force: true });
    loadResumen({ force: true });
  };

  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

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

  /* ============ Renovar (centralizado) ============
     Se usa desde el modal de renovar Y desde el aviso "ya se renovó".
     - payload: datos del modal (número, compañía, precio, etc.)
     - confirmar: true cuando el usuario ya vio el aviso "ya se renovó"
       y apretó "Renovar igual" → manda confirmar_renovacion al backend
       para que renueve igual en vez de avisar de nuevo.
     - itemOverride: la póliza a renovar (si no viene, usa `selected`).
  */
  const ejecutarRenovacion = useCallback(
    async (payload, { confirmar = false, itemOverride = null } = {}) => {
      const item = itemOverride || selected;
      if (!item?.id) return;

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
      if (confirmar) finalPayload.confirmar_renovacion = true;

      try {
        const res = await dispatch(
          renovarPoliza({ id: item.id, payload: finalPayload })
        ).unwrap();
        const nuevaId = res?.data?.id;

        registrarProgreso("renovar");
        toast.success("Póliza renovada correctamente");
        setModalOpen(false);
        setSelected(null);
        setRenovarError(null);
        setPolizaRenovadaModal({ open: false, error: null });

        // Abrimos la póliza nueva en otra pestaña, sin salir de Renovaciones.
        if (nuevaId) {
          window.open(`/polizas/${nuevaId}`, "_blank", "noopener,noreferrer");
        }

        // Recargamos para que la póliza renovada desaparezca de la tabla.
        await load({ force: true });
        await loadResumen({ force: true });
      } catch (e) {
        // Detectar error estructurado del backend
        const backendError =
          e?.raw ||
          e?.response?.data ||
          e?.data ||
          (typeof e === "object" && e?.error ? e : null);

        if (backendError?.error) {
          const code = backendError.error;

          if (code === "POLIZA_YA_RENOVADA") {
            // 🆕 AVISO (no bloqueo): cerramos el modal de renovar y abrimos el
            // cartel "¿seguro? ya se renovó". Guardamos la póliza para poder
            // reintentar con confirmación desde ese cartel.
            setModalOpen(false);
            setRenovarError(null);
            setPolizaRenovadaModal({ open: true, error: backendError, item });
          } else if (
            code === "COBERTURA_NO_CONFIGURADA" ||
            code === "SIN_CUOTAS_REFERENCIA" ||
            code === "NUMERO_DUPLICADO" ||
            code === "COMPANIA_INVALIDA"
          ) {
            setRenovarError(backendError);
          } else if (code === "POLIZA_FINALIZADA") {
            setModalOpen(false);
            setSelected(null);
            toast.error(backendError.message);
          } else {
            setRenovarError(backendError);
          }
        } else {
          toast.error(e?.message || "No se pudo renovar");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [dispatch, selected, load, loadResumen, registrarProgreso]
  );

  /* =========================================================
   * Render
   * ========================================================= */
  return (
    <PageContainer width="lg">
      {/* ============ Header ============ */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-titulo dark:text-titulo-dark flex items-center gap-2">
          <HiClipboardCheck className="text-duo-verde" />
          Renovaciones
        </h1>

        <Boton3D
          variant="blanco"
          size="sm"
          onClick={() => {
            load({ force: true });
            loadResumen({ force: true });
          }}
          disabled={loading}
        >
          <HiRefresh className={loading ? "animate-spin" : ""} />
          Actualizar
        </Boton3D>
      </div>

      {/* ============ Toolbar: pestañas + buscador + sucursal ============ */}
      <RenovacionesToolbar
        loading={loading}
        search={search}
        setSearch={setSearch}
        oficina={oficina}
        setOficina={setOficina}
        oficinasOptions={oficinasOptions}
        totalCount={totalCount}
        activeTab={tab}
        onChangeTab={(t) => {
          // 🆕 Si tocás una pestaña estando en búsqueda, se limpia el buscador
          // y volvés al modo normal.
          setSearch("");
          setTab(t);
        }}
        tabCounts={tabCounts}
      />

      {/* ============ 🆕 Aviso de MODO BÚSQUEDA ============ */}
      {modoBusqueda && (
        <div className="mt-4 rounded-2xl bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] border-2 border-duo-azul/40 p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-duo-azul">
            <HiSearch className="text-lg shrink-0" />
            <span>
              Buscando <span className="font-black">“{searchTrim}”</span> — se muestran{" "}
              <span className="font-black">todas</span> las pólizas que coinciden,
              venzan cuando venzan.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="inline-flex items-center gap-1 rounded-xl border-2 border-duo-azul/40 px-3 py-1.5 text-[13px] font-extrabold text-duo-azul transition-transform active:scale-95"
          >
            <HiX /> Limpiar
          </button>
        </div>
      )}

      {!!error && (
        <div className="mt-4 rounded-2xl bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] border-2 border-duo-rojo/40 p-3 text-sm font-bold text-duo-rojo flex items-center gap-2">
          <HiExclamation className="text-lg" />
          No se pudieron cargar las pólizas. Intentá actualizar.
        </div>
      )}

      {/* ============ Resumen en línea ============ */}
      <div className="mt-4 mb-3">
        <ResumenInline tab={modoBusqueda ? "busqueda" : tab} kpis={kpis} />
      </div>

      {/* ============ Paginación ============ */}
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-[13px] font-bold text-suave dark:text-suave-dark">
          {modoBusqueda ? (
            <span>
              Mostrando <span className="text-titulo dark:text-titulo-dark">{receivedCount}</span>{" "}
              de <span className="text-titulo dark:text-titulo-dark">{totalCount}</span> resultados
            </span>
          ) : tab === "vencidas" ? (
            <span>
              Mostrando <span className="text-titulo dark:text-titulo-dark">{receivedCount}</span>{" "}
              sin renovar de{" "}
              <span className="text-titulo dark:text-titulo-dark">{totalCount}</span> en pantalla
            </span>
          ) : (
            <span>
              Página <span className="text-titulo dark:text-titulo-dark">{safePage}</span> de{" "}
              <span className="text-titulo dark:text-titulo-dark">{totalPages}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark">Ver:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value || 25));
                setPage(1);
              }}
              className="bg-transparent text-sm font-bold text-titulo dark:text-titulo-dark outline-none cursor-pointer"
              aria-label="Tamaño de página"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n} className="bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark">
                  {n}
                </option>
              ))}
            </select>
          </div>

          <button
            className="rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-1.5 text-sm font-extrabold text-titulo dark:text-titulo-dark hover:border-duo-azul/40 disabled:opacity-40 transition-colors"
            disabled={!canPrev || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <button
            className="rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-1.5 text-sm font-extrabold text-titulo dark:text-titulo-dark hover:border-duo-azul/40 disabled:opacity-40 transition-colors"
            disabled={!canNext || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* ============ TABLA ============ */}
      <Renovacionestable
        items={itemsPaginados}
        loading={loading}
        submitting={submitting}
        tab={modoBusqueda ? "busqueda" : tab}
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
        error={renovarError}
        onClose={() => {
          if (submitting) return;
          setModalOpen(false);
          setSelected(null);
          setRenovarError(null);
        }}
        onSubmit={(payload) => {
          // Guardamos el último payload por si el usuario tiene que confirmar
          // "renovar igual" en el cartel de aviso.
          setUltimoPayload(payload);
          ejecutarRenovacion(payload);
        }}
        submitting={submitting}
      />

      {/* ============ Modal "Póliza ya renovada" (AVISO Sí/No) ============ */}
      <PolizaYaRenovadaModal
        open={polizaRenovadaModal.open}
        error={polizaRenovadaModal.error}
        submitting={submitting}
        onClose={() => {
          setPolizaRenovadaModal({ open: false, error: null });
          setSelected(null);
        }}
        onConfirmar={() => {
          // 🆕 "Renovar igual": reintenta con confirmar_renovacion=true.
          ejecutarRenovacion(ultimoPayload, {
            confirmar: true,
            itemOverride: polizaRenovadaModal.item,
          });
        }}
      />

      {/* ============ Modal "Marcar no renueva" ============ */}
      <DescartarRenovacionModal
        open={noRenuevaModal.open}
        item={noRenuevaModal.item}
        onClose={closeNoRenuevaModal}
        onSubmit={confirmarNoRenueva}
        submitting={submitting}
      />
    </PageContainer>
  );
}