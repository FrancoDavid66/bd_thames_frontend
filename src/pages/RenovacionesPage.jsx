// src/pages/RenovacionesPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/es";
import toast from "react-hot-toast";
import {
  HiRefresh,
  HiSearch,
  HiX,
  HiClipboardCheck,
  HiArrowRight,
  HiExclamation,
} from "react-icons/hi";

import {
  fetchRenovaciones,
  renovarPoliza,
  fetchRenovacionesOficinas,
  fetchRenovacionesResumen, // ✅ usar resumen desde slice
  selectRenovacionesItems,
  selectRenovacionesStatus,
  selectRenovacionesError,
  selectRenovacionesCount,
  selectRenovacionesOficinas,
  selectRenovacionesOficinasStatus,
  selectRenovacionesOficinasError,
  selectRenovacionesResumen, // ✅ selector resumen
  selectRenovacionesResumenStatus,
  selectRenovacionesResumenError,
} from "../store/slices/renovacionesSlice";

const cx = (...a) => a.filter(Boolean).join(" ");

const Badge = ({ children, tone = "neutral" }) => {
  const map = {
    neutral: "bg-white/10 text-white border-white/15",
    green: "bg-emerald-500/15 text-emerald-100 border-emerald-400/30",
    yellow: "bg-amber-500/15 text-amber-100 border-amber-400/30",
    red: "bg-rose-500/15 text-rose-100 border-rose-400/30",
    blue: "bg-sky-500/15 text-sky-100 border-sky-400/30",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold",
        map[tone] || map.neutral
      )}
    >
      {children}
    </span>
  );
};

const Chip = ({ active, tone = "neutral", children, onClick, title }) => {
  const tones = {
    neutral: active
      ? "border-white/30 bg-white/15 text-white"
      : "border-white/10 bg-white/10 text-white/90 hover:bg-white/15",
    red: active
      ? "border-rose-400/40 bg-rose-500/20 text-rose-50"
      : "border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15",
    yellow: active
      ? "border-amber-400/40 bg-amber-500/20 text-amber-50"
      : "border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15",
    blue: active
      ? "border-sky-400/40 bg-sky-500/20 text-sky-50"
      : "border-sky-400/20 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15",
    green: active
      ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-50"
      : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15",
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold transition",
        tones[tone] || tones.neutral
      )}
    >
      {children}
    </button>
  );
};

function fmtDate(d) {
  if (!d) return "—";
  try {
    return dayjs(d).format("DD/MM/YYYY");
  } catch {
    return String(d);
  }
}

function pickVtoRef(item) {
  return (
    item?.vto_referencia ||
    item?.ultima_cuota_vencimiento ||
    item?.fecha_vencimiento ||
    item?.proxima_vencimiento_impaga ||
    null
  );
}

function calcUrgencyTone(dias) {
  if (dias == null || Number.isNaN(Number(dias))) return "neutral";
  const n = Number(dias);
  if (n < 0) return "red";
  if (n === 0) return "yellow";
  if (n <= 3) return "yellow";
  if (n <= 7) return "blue";
  return "neutral";
}

// =====================
// Modal renovar
// =====================
function RenovacionModal({ open, item, onClose, onSubmit, submitting }) {
  const [nuevoNumero, setNuevoNumero] = useState("");
  const [nuevaCompania, setNuevaCompania] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");

  useEffect(() => {
    if (!open) return;

    setNuevoNumero(item?.numero_poliza || "");
    setNuevaCompania(item?.compania || "");
    setNuevoPrecio(
      item?.precio_cuota != null && item?.precio_cuota !== ""
        ? String(item?.precio_cuota)
        : ""
    );

    const base = pickVtoRef(item) || item?.primer_pago || null;
    setNuevaFecha(base ? dayjs(base).format("YYYY-MM-DD") : "");
  }, [open, item]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl"
          initial={{ y: 18, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 18, opacity: 0, scale: 0.98 }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <div className="text-lg font-extrabold text-white">
                Renovar póliza
              </div>
              <div className="mt-1 text-sm text-white/80">
                {item?.patente ? (
                  <>
                    <span className="font-semibold text-white">
                      {item.patente}
                    </span>{" "}
                    · {item?.cliente?.apellido}, {item?.cliente?.nombre}
                  </>
                ) : (
                  <>
                    {item?.cliente?.apellido}, {item?.cliente?.nombre}
                  </>
                )}
              </div>
            </div>

            <button
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white hover:bg-white/15"
              onClick={onClose}
              disabled={submitting}
              title="Cerrar"
              type="button"
            >
              <HiX />
            </button>
          </div>

          <div className="grid gap-3 p-4">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/90">
                Nuevo número (opcional)
              </label>
              <input
                value={nuevoNumero}
                onChange={(e) => setNuevoNumero(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-white/30"
                placeholder="Ej: 12345-ABC"
              />
              <div className="text-xs text-white/60">
                Si existe, el backend lo hace único (agrega sufijo -R1, -R2…).
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/90">
                Nueva compañía (opcional)
              </label>
              <input
                value={nuevaCompania}
                onChange={(e) => setNuevaCompania(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-white/30"
                placeholder="Ej: RUS / SANCOR / etc."
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-white/90">
                  Nuevo precio cuota (opcional)
                </label>
                <input
                  value={nuevoPrecio}
                  onChange={(e) => setNuevoPrecio(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-white/30"
                  placeholder="Ej: 12000"
                  inputMode="decimal"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-semibold text-white/90">
                  Nueva fecha (primer pago)
                </label>
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-white/30"
                />
              </div>
            </div>

            <div className="mt-2 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
              <button
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-white hover:bg-white/15"
                onClick={onClose}
                disabled={submitting}
                type="button"
              >
                Cancelar
              </button>

              <button
                className={cx(
                  "rounded-xl px-4 py-2 font-extrabold text-black",
                  submitting
                    ? "bg-white/40"
                    : "bg-emerald-300 hover:bg-emerald-200"
                )}
                disabled={submitting}
                type="button"
                onClick={() =>
                  onSubmit({
                    nuevoNumero: (nuevoNumero || "").trim() || undefined,
                    nuevaCompania: (nuevaCompania || "").trim() || undefined,
                    nuevoPrecio:
                      nuevoPrecio === "" ? undefined : Number(nuevoPrecio),
                    nuevaFecha: nuevaFecha || undefined,
                  })
                }
              >
                {submitting ? "Procesando..." : "Renovar"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// =====================
// Page
// =====================
export default function RenovacionesPage() {
  dayjs.locale("es");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const items = useSelector(selectRenovacionesItems);
  const status = useSelector(selectRenovacionesStatus);
  const error = useSelector(selectRenovacionesError);
  const count = useSelector(selectRenovacionesCount);

  const oficinas = useSelector(selectRenovacionesOficinas);
  const oficinasStatus = useSelector(selectRenovacionesOficinasStatus);
  const oficinasError = useSelector(selectRenovacionesOficinasError);

  // ✅ resumen desde slice
  const resumen = useSelector(selectRenovacionesResumen);
  const resumenStatus = useSelector(selectRenovacionesResumenStatus);
  const resumenError = useSelector(selectRenovacionesResumenError);

  // =========================
  // ✅ Estados "UI" (draft)
  // =========================
  const [uiDias, setUiDias] = useState(30);
  const [uiSoloPendientes, setUiSoloPendientes] = useState(true);
  const [uiSearch, setUiSearch] = useState("");
  const [uiOrdering, setUiOrdering] = useState("vto_referencia");
  const [uiOficina, setUiOficina] = useState("");
  const [uiBucket, setUiBucket] = useState(""); // "" = todos

  // =========================
  // ✅ Estados "Aplicados"
  // =========================
  const [dias, setDias] = useState(30);
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("vto_referencia");
  const [oficina, setOficina] = useState("");
  const [bucket, setBucket] = useState("");

  // paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loading = status === "loading";

  // ✅ cargar oficinas UNA vez (cacheado en slice)
  useEffect(() => {
    dispatch(fetchRenovacionesOficinas());
  }, [dispatch]);

  const oficinasOptions = useMemo(() => {
    const arr = Array.isArray(oficinas) ? oficinas : [];
    return ["", ...arr];
  }, [oficinas]);

  const load = useCallback(
    async (opts = {}) => {
      const payload = {
        dias,
        solo_pendientes: soloPendientes,
        search: (search || "").trim(),
        ordering: ordering || "",
        oficina: oficina || undefined,
        bucket: bucket || undefined, // ✅ filtro rápido
        page,
        page_size: pageSize,
        ...opts,
      };

      try {
        await dispatch(fetchRenovaciones(payload)).unwrap();
      } catch {
        // error queda en state
      }
    },
    [
      dias,
      soloPendientes,
      search,
      ordering,
      oficina,
      bucket,
      page,
      pageSize,
      dispatch,
    ]
  );

  const loadResumen = useCallback(
    async (opts = {}) => {
      const payload = {
        dias,
        solo_pendientes: soloPendientes,
        search: (search || "").trim(),
        oficina: oficina || undefined,
        ...opts,
      };

      try {
        await dispatch(fetchRenovacionesResumen(payload)).unwrap();
      } catch {
        // error queda en state
      }
    },
    [dias, soloPendientes, search, oficina, dispatch]
  );

  // ✅ cada vez que cambian filtros aplicados / paginación => load
  useEffect(() => {
    load();
  }, [load]);

  // ✅ cada vez que cambian filtros aplicados (no bucket) => resumen
  useEffect(() => {
    loadResumen();
  }, [loadResumen]);

  const counters = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    const total = arr.length;
    const urgentes = arr.filter((x) => {
      const d = x?.dias_para_vencer_poliza;
      return d != null && Number(d) <= 3;
    }).length;
    return { total, urgentes };
  }, [items]);

  const openModal = (item) => {
    setSelected(item);
    setModalOpen(true);
  };

  const handleSubmitModal = async (payload) => {
    if (!selected?.id) return;
    setSubmitting(true);

    try {
      const res = await dispatch(
        renovarPoliza({ id: selected.id, payload })
      ).unwrap();

      const nuevaId = res?.data?.id;

      toast.success("Póliza renovada ✅");

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
  };

  const totalCount = Number(count || 0);
  const receivedCount = Array.isArray(items) ? items.length : 0;

  const totalPages =
    pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;
  const safePage = Math.min(Math.max(1, page), totalPages);

  // ✅ clamp page si cambia count/pageSize y quedaste fuera de rango
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  const from = totalCount ? (safePage - 1) * pageSize + 1 : 0;
  const to = totalCount ? Math.min(safePage * pageSize, totalCount) : 0;

  const canPrev = safePage > 1;
  const canNext = totalCount ? safePage < totalPages : receivedCount === pageSize;

  // =========================
  // ✅ Aplicar filtros (ahora sí)
  // =========================
  const applyFilters = () => {
    setPage(1);
    setDias(Number(uiDias || 0));
    setSoloPendientes(!!uiSoloPendientes);
    setSearch((uiSearch || "").trim());
    setOrdering(uiOrdering || "");
    setOficina(uiOficina || "");
    setBucket(uiBucket || "");
  };

  // ✅ bucket rápido (backend espera: hoy/en_1/en_2/en_3/proximos_3/vencida_1/..../vencidas_3/vencidas)
  const applyBucketQuick = (b) => {
    setUiBucket(b || "");
    setBucket(b || "");
    setPage(1);
  };

  const resumenBuckets = resumen?.buckets || {};
  const pendientesVentana = Number(resumen?.pendientes_ventana || 0);

  const allVencidasCount = useMemo(() => {
    const v3 = Number(resumenBuckets?.vencidas_3 || 0);
    const v4 = Number(resumenBuckets?.vencidas_4_mas || 0);
    return v3 + v4;
  }, [resumenBuckets]);

  const quickButtons = useMemo(() => {
    return [
      {
        id: "",
        label: "Todos",
        tone: "neutral",
        count: pendientesVentana,
        title: "Sin filtro rápido",
      },

      { id: "hoy", label: "Hoy", tone: "yellow", count: Number(resumenBuckets?.vence_hoy || 0), title: "Vence hoy" },
      { id: "en_1", label: "+1", tone: "blue", count: Number(resumenBuckets?.vence_en_1 || 0), title: "Vence mañana" },
      { id: "en_2", label: "+2", tone: "blue", count: Number(resumenBuckets?.vence_en_2 || 0), title: "Vence en 2 días" },
      { id: "en_3", label: "+3", tone: "blue", count: Number(resumenBuckets?.vence_en_3 || 0), title: "Vence en 3 días" },
      { id: "proximos_3", label: "Próx 3", tone: "blue", count: Number(resumenBuckets?.proximos_3 || 0), title: "Vence entre hoy y +3" },

      { id: "vencida_1", label: "-1", tone: "red", count: Number(resumenBuckets?.vencida_1 || 0), title: "Venció ayer" },
      { id: "vencida_2", label: "-2", tone: "red", count: Number(resumenBuckets?.vencida_2 || 0), title: "Venció hace 2 días" },
      { id: "vencida_3", label: "-3", tone: "red", count: Number(resumenBuckets?.vencida_3 || 0), title: "Venció hace 3 días" },

      {
        id: "vencidas_3",
        label: "Vencidas ≤3",
        tone: "red",
        count: Number(resumenBuckets?.vencidas_3 || 0),
        title: "Vencidas entre 1 y 3 días",
      },

      {
        id: "vencidas",
        label: "Vencidas 4+",
        tone: "red",
        count: Number(resumenBuckets?.vencidas_4_mas || 0),
        title: "Vencidas hace 4+ días",
      },

      // opcional informativo (no filtra): “total vencidas” = ≤3 + 4+
      {
        id: "__all_vencidas__",
        label: "Vencidas (todas)",
        tone: "red",
        count: allVencidasCount,
        title: "Solo informativo (conteo total vencidas). Para verlas: usá Vencidas ≤3 y Vencidas 4+",
        disabled: true,
      },
    ];
  }, [resumenBuckets, pendientesVentana, allVencidasCount]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-3 md:p-6">
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-4 shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xl font-extrabold text-white">Renovaciones</div>

            <div className="mt-1 text-sm text-white/75">
              Bandeja operativa ·{" "}
              <span className="text-white/60">Total backend: {totalCount || 0}</span>
              <span className="text-white/60"> · Recibidos (página): {receivedCount}</span>
              {!!totalCount && (
                <span className="text-white/60"> · Mostrando: {from}-{to}</span>
              )}
            </div>

            {(oficinasStatus === "failed" || oficinasError) && (
              <div className="mt-2 text-xs text-rose-200/90">
                No se pudieron cargar oficinas:{" "}
                {typeof oficinasError === "string"
                  ? oficinasError
                  : oficinasError
                  ? JSON.stringify(oficinasError)
                  : ""}
              </div>
            )}

            {resumenStatus === "failed" && (
              <div className="mt-2 text-xs text-amber-200/90">
                No se pudo cargar el resumen:{" "}
                {typeof resumenError === "string"
                  ? resumenError
                  : resumenError
                  ? JSON.stringify(resumenError)
                  : ""}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">Visible (página): {counters.total}</Badge>
            <Badge tone="red">Urgentes ≤ 3d: {counters.urgentes}</Badge>

            <button
              className="ml-auto inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
              onClick={() => {
                load({ force: true });
                loadResumen({ force: true });
              }}
              disabled={loading}
              type="button"
            >
              <HiRefresh className={loading ? "animate-spin" : ""} />
              {loading ? "Cargando..." : "Actualizar"}
            </button>
          </div>
        </div>

        {/* ✅ BOTONES FILTRO RÁPIDO */}
        <div className="mt-4 flex flex-wrap gap-2">
          {quickButtons.map((b) => {
            const isDisabled = !!b.disabled;
            const active = !isDisabled && (bucket || "") === b.id;

            return (
              <button
                key={b.id || "__all__"}
                type="button"
                title={b.title}
                onClick={() => {
                  if (isDisabled) return;
                  applyBucketQuick(b.id);
                }}
                className={cx(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold transition",
                  isDisabled
                    ? "border-white/10 bg-white/5 text-white/40 cursor-default"
                    : active
                    ? b.tone === "red"
                      ? "border-rose-400/40 bg-rose-500/20 text-rose-50"
                      : b.tone === "yellow"
                      ? "border-amber-400/40 bg-amber-500/20 text-amber-50"
                      : b.tone === "blue"
                      ? "border-sky-400/40 bg-sky-500/20 text-sky-50"
                      : "border-white/30 bg-white/15 text-white"
                    : b.tone === "red"
                    ? "border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                    : b.tone === "yellow"
                    ? "border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
                    : b.tone === "blue"
                    ? "border-sky-400/20 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15"
                    : "border-white/10 bg-white/10 text-white/90 hover:bg-white/15"
                )}
              >
                <span>{b.label}</span>
                <span
                  className={cx(
                    "rounded-full px-2 py-0.5 text-[11px] font-black",
                    isDisabled ? "bg-black/10" : "bg-black/20"
                  )}
                >
                  {Number.isFinite(Number(b.count)) ? Number(b.count) : 0}
                </span>
              </button>
            );
          })}

          {bucket ? (
            <button
              type="button"
              className="ml-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/15"
              onClick={() => applyBucketQuick("")}
              title="Limpiar filtro rápido"
            >
              <HiX className="text-white/70" />
              Limpiar
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-white/90">Días</label>
            <input
              value={uiDias}
              onChange={(e) => setUiDias(Number(e.target.value || 0))}
              type="number"
              min={0}
              className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-white/30"
            />
            <div className="text-[11px] text-white/55">
              Ventana de trabajo (ej: 30).
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-white/90">
              Solo pendientes
            </label>
            <button
              className={cx(
                "w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold",
                uiSoloPendientes
                  ? "border-emerald-400/30 bg-emerald-300/15 text-emerald-50"
                  : "border-white/10 bg-white/10 text-white hover:bg-white/15"
              )}
              onClick={() => setUiSoloPendientes((v) => !v)}
              type="button"
            >
              {uiSoloPendientes ? "✅ Sí" : "No"}
            </button>
          </div>

          {/* Oficina */}
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-white/90">
              Oficina
            </label>
            <select
              value={uiOficina}
              onChange={(e) => setUiOficina(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 text-white px-3 py-2 outline-none focus:border-white/30"
            >
              <option value="" className="bg-slate-900 text-white">
                Todas
              </option>
              {oficinasOptions
                .filter((o) => o)
                .map((o) => (
                  <option key={o} value={o} className="bg-slate-900 text-white">
                    {o}
                  </option>
                ))}
            </select>
            <div className="text-[11px] text-white/55">
              {oficinasStatus === "loading"
                ? "Cargando oficinas..."
                : "Oficinas cargadas desde backend (no depende del paginado)."}
            </div>
          </div>

          <div className="grid gap-2 md:col-span-2">
            <label className="text-xs font-semibold text-white/90">Buscar</label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2">
              <HiSearch className="text-white/70" />
              <input
                value={uiSearch}
                onChange={(e) => setUiSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters();
                }}
                className="w-full bg-transparent text-white outline-none"
                placeholder="Asegurado, patente, número, compañía..."
              />
              {!!uiSearch && (
                <button
                  className="rounded-lg p-1 text-white/80 hover:bg-white/10"
                  onClick={() => setUiSearch("")}
                  title="Limpiar"
                  type="button"
                >
                  <HiX />
                </button>
              )}
            </div>
            <div className="text-[11px] text-white/55">
              Enter o “Aplicar filtros”.
            </div>
          </div>

          {/* Orden */}
          <div className="grid gap-2 md:col-span-3">
            <label className="text-xs font-semibold text-white/90">Orden</label>
            <select
              value={uiOrdering}
              onChange={(e) => setUiOrdering(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 text-white px-3 py-2 outline-none focus:border-white/30"
            >
              <option value="vto_referencia" className="bg-slate-900 text-white">
                Vto referencia (asc)
              </option>
              <option
                value="-vto_referencia"
                className="bg-slate-900 text-white"
              >
                Vto referencia (desc)
              </option>
              <option
                value="fecha_vencimiento"
                className="bg-slate-900 text-white"
              >
                Vto póliza (asc)
              </option>
              <option
                value="-fecha_vencimiento"
                className="bg-slate-900 text-white"
              >
                Vto póliza (desc)
              </option>
              <option value="id" className="bg-slate-900 text-white">
                ID (asc)
              </option>
              <option value="-id" className="bg-slate-900 text-white">
                ID (desc)
              </option>
            </select>
          </div>

          {/* Page size */}
          <div className="grid gap-2 md:col-span-2">
            <label className="text-xs font-semibold text-white/90">
              Tamaño página
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                const v = Number(e.target.value || 25);
                setPageSize(v);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-900 text-white px-3 py-2 outline-none focus:border-white/30"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n} className="bg-slate-900 text-white">
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-end gap-2">
            <button
              className="w-full rounded-xl bg-sky-300 px-4 py-2 text-sm font-extrabold text-black hover:bg-sky-200 disabled:opacity-70"
              onClick={applyFilters}
              disabled={loading}
              type="button"
            >
              Aplicar filtros
            </button>
          </div>
        </div>

        {!!error && (
          <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/15 p-3 text-sm text-rose-50">
            <div className="flex items-start gap-2">
              <HiExclamation className="mt-0.5" />
              <div>
                <div className="font-bold">Error</div>
                <div className="opacity-90">
                  {typeof error === "string"
                    ? error
                    : JSON.stringify(error, null, 2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controles paginación */}
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-white/65">
          Página{" "}
          <span className="text-white/90 font-semibold">{safePage}</span> de{" "}
          <span className="text-white/90 font-semibold">{totalPages}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
            disabled={!canPrev || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            type="button"
          >
            Anterior
          </button>
          <button
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
            disabled={!canNext || loading}
            onClick={() => setPage((p) => p + 1)}
            type="button"
          >
            Siguiente
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {loading && receivedCount === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 text-white/80">
            Cargando bandeja...
          </div>
        ) : receivedCount === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 text-white/80">
            No hay pólizas para mostrar con estos filtros.
          </div>
        ) : (
          items.map((p) => {
            const vtoRef = pickVtoRef(p);
            const diasVto = p?.dias_para_vencer_poliza;
            const tone = calcUrgencyTone(diasVto);

            return (
              <motion.div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-4 shadow-lg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/polizas/${p.id}`}
                        className="inline-flex items-center gap-2 text-base font-extrabold text-white hover:underline"
                      >
                        {p?.patente || "SIN PATENTE"}{" "}
                        <HiArrowRight className="text-white/60" />
                      </Link>

                      <Badge tone={tone}>
                        Vto ref: {fmtDate(vtoRef)}{" "}
                        {diasVto != null ? `· ${diasVto}d` : ""}
                      </Badge>

                      <Badge tone="neutral">Oficina: {p?.oficina || "—"}</Badge>
                    </div>

                    <div className="mt-2 grid gap-1 text-sm text-white/85">
                      <div className="truncate">
                        <span className="text-white/60">Asegurado:</span>{" "}
                        <span className="font-semibold text-white">
                          {p?.cliente?.apellido || ""} {p?.cliente?.nombre || ""}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/70">
                        <span>
                          <span className="text-white/60">N°:</span>{" "}
                          {p?.numero_poliza || "—"}
                        </span>
                        <span>
                          <span className="text-white/60">Compañía:</span>{" "}
                          {p?.compania_nombre || p?.compania || "—"}
                        </span>
                        <span>
                          <span className="text-white/60">Precio cuota:</span>{" "}
                          {p?.precio_cuota ?? "—"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/70">
                        <span>
                          <span className="text-white/60">Primer pago:</span>{" "}
                          {fmtDate(p?.primer_pago)}
                        </span>
                        <span>
                          <span className="text-white/60">Vto póliza:</span>{" "}
                          {fmtDate(p?.fecha_vencimiento)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:min-w-[220px]">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-2 text-sm font-extrabold text-black hover:bg-emerald-200 disabled:opacity-60"
                      disabled={submitting}
                      onClick={() => openModal(p)}
                      type="button"
                    >
                      <HiClipboardCheck />
                      Renovar
                    </button>

                    <Link
                      to={`/polizas/${p.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                    >
                      Ver detalle
                      <HiArrowRight />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <RenovacionModal
        open={modalOpen}
        item={selected}
        onClose={() => {
          if (submitting) return;
          setModalOpen(false);
          setSelected(null);
        }}
        onSubmit={handleSubmitModal}
        submitting={submitting}
      />
    </div>
  );
}
