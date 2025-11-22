// src/components/polizas/PolizaGruasTab.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { GruasAPI } from "../../api/gruas";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { Link } from "react-router-dom";
import {
  HiX,
  HiPhotograph,
  HiUpload,
  HiChevronRight,
  HiChevronLeft,
  HiCheckCircle,
  HiInformationCircle,
} from "react-icons/hi";

const TipoFotoAdhesionOpts = [
  { v: "PATENTE", label: "Patente visible (OBLIGATORIA)" },
  { v: "FRENTE", label: "Frente" },
  { v: "LATERAL_IZQ", label: "Lateral izquierda" },
  { v: "LATERAL_DER", label: "Lateral derecha" },
  { v: "TRASERA", label: "Trasera" },
  { v: "VIN", label: "VIN / chasis" },
  { v: "INTERIOR", label: "Interior" },
  { v: "OTRA", label: "Otra" },
];

const pill = (text, tone = "gray") => {
  const map = {
    green:
      "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
    yellow:
      "bg-amber-500/10 text-amber-200 border-amber-500/40",
    red:
      "bg-red-500/10 text-red-300 border-red-500/40",
    gray:
      "bg-gray-500/10 text-gray-200 border-gray-500/40",
    blue:
      "bg-sky-500/10 text-sky-200 border-sky-500/40",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${map[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {text}
    </span>
  );
};

// ✅ Ahora acepta polizaId o poliza
export default function PolizaGruasTab({ polizaId: propPolizaId, poliza }) {
  const polizaId = propPolizaId ?? poliza?.id;

  const [loading, setLoading] = useState(true);
  const [planes, setPlanes] = useState([]);
  const [adhesion, setAdhesion] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);

  // Uploader rápido (para adhesión ya activa)
  const [quickTipo, setQuickTipo] = useState("PATENTE");
  const [quickFile, setQuickFile] = useState(null);
  const [subiendoQuick, setSubiendoQuick] = useState(false);

  // Modal de activación
  const [showActivate, setShowActivate] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const [plansResp, adhResp, solResp] = await Promise.all([
          GruasAPI.getPlanes(),
          polizaId
            ? GruasAPI.getAdhesionesPorPoliza(polizaId)
            : Promise.resolve([]),
          polizaId
            ? GruasAPI.getSolicitudesPorPoliza(polizaId)
            : Promise.resolve([]),
        ]);
        if (!mounted) return;
        setPlanes(Array.isArray(plansResp) ? plansResp : []);
        const adh =
          Array.isArray(adhResp) && adhResp.length ? adhResp[0] : null;
        setAdhesion(adh);
        setSolicitudes(Array.isArray(solResp) ? solResp : []);
      } catch (e) {
        toast.error(e?.message || "Error cargando Grúas");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [polizaId]);

  const operable = useMemo(() => {
    if (!adhesion) return false;
    if (adhesion.estado !== "ACTIVA") return false;
    const hoy = dayjs().startOf("day");
    const carOk =
      !adhesion.fecha_carencia_fin ||
      dayjs(adhesion.fecha_carencia_fin).isSameOrBefore(hoy, "day");
    const moraOk =
      !adhesion.rehabilitar_desde ||
      dayjs(adhesion.rehabilitar_desde).isSameOrBefore(hoy, "day");
    return carOk && moraOk;
  }, [adhesion]);

  // ---- Agregar foto a adhesión activa ----
  const subirFotoAdhesion = async () => {
    if (!adhesion?.id || !quickFile) return;
    try {
      setSubiendoQuick(true);
      const { secure_url, public_id } = await uploadToCloudinary(
        quickFile,
        "rc-admin/gruas/adhesiones"
      );
      await GruasAPI.crearAdhesionFoto({
        adhesion: adhesion.id,
        tipo: quickTipo || "OTRA",
        url: secure_url,
        public_id,
      });
      const adhResp = await GruasAPI.getAdhesionesPorPoliza(polizaId);
      setAdhesion(adhResp?.[0] || adhesion);
      setQuickFile(null);
      toast.success("Foto agregada");
    } catch (e) {
      toast.error(e?.message || "Error subiendo foto");
    } finally {
      setSubiendoQuick(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-7 bg-gray-800/80 rounded w-1/2" />
          <div className="h-20 bg-gray-900/80 rounded" />
          <div className="h-40 bg-gray-900/80 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header compacto */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-50">
            Asistencia de Grúa
          </h2>
          <p className="text-xs text-gray-400">
            Activación, fotos de adhesión y últimas solicitudes de esta póliza.
          </p>
        </div>
        <Link
          to="/gruas"
          className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-700"
        >
          Ir al módulo de Grúas
        </Link>
      </div>

      {adhesion ? (
        <>
          {/* Card principal de estado */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-800 bg-gray-950/80 p-4 space-y-4"
          >
            {/* Estado + chips */}
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  Estado de la adhesión
                </span>
                {adhesion.estado === "ACTIVA" && pill("Activa", "green")}
                {adhesion.estado === "PAUSADA" && pill("Pausada", "yellow")}
                {adhesion.estado === "CANCELADA" && pill("Cancelada", "red")}
                {operable
                  ? pill("Operable", "blue")
                  : pill("No operable (carencia / suspensión)", "yellow")}
              </div>
              <span className="text-[11px] text-gray-400">
                ID adhesión:{" "}
                <span className="text-gray-200 font-medium">
                  #{adhesion.id}
                </span>
              </span>
            </div>

            {/* Datos clave en 2 filas para que no sature */}
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Plan" value={adhesion.plan_display || "-"} />
              <Info
                label="Activación"
                value={
                  adhesion.fecha_activacion
                    ? dayjs(adhesion.fecha_activacion).format("DD/MM/YYYY")
                    : "-"
                }
              />
              <Info
                label="Fin de carencia"
                value={
                  adhesion.fecha_carencia_fin
                    ? dayjs(adhesion.fecha_carencia_fin).format("DD/MM/YYYY")
                    : "-"
                }
              />
              <Info
                label="Rehabilita desde"
                value={
                  adhesion.rehabilitar_desde
                    ? dayjs(adhesion.rehabilitar_desde).format("DD/MM/YYYY")
                    : "—"
                }
              />
            </div>
          </motion.div>

          {/* Sección de fotos + quick upload */}
          <div className="grid gap-4 lg:grid-cols-[2fr,1.1fr]">
            {/* Fotos existentes */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-50">
                    Fotos registradas
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Galería de imágenes asociadas a esta adhesión.
                  </p>
                </div>
                <span className="inline-flex items-center justify-center rounded-full bg-gray-800 px-2.5 py-1 text-[11px] text-gray-300">
                  {(adhesion?.fotos_adhesion?.length || 0)} fotos
                </span>
              </div>

              {adhesion?.fotos_adhesion?.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {adhesion.fotos_adhesion.map((f) => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group block overflow-hidden rounded-xl border border-gray-800 bg-gray-900/80"
                    >
                      <img
                        src={f.url}
                        alt={f.tipo}
                        className="h-32 w-full object-cover transition-transform duration-150 group-hover:scale-[1.02]"
                      />
                      <div className="flex items-center justify-between px-2 py-1.5 text-[11px] text-gray-200">
                        <span className="truncate">{f.tipo}</span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="mt-2 rounded-xl border border-dashed border-gray-700 bg-gray-900/60 px-3 py-4 text-center text-sm text-gray-400">
                  No hay fotos cargadas todavía.
                </div>
              )}
            </motion.div>

            {/* Quick uploader compacto */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-gray-50">
                Agregar foto rápida
              </h3>
              <p className="text-[11px] text-gray-400">
                Cargá una imagen puntual (patente, frente, lateral, etc.) sin
                pasar por el flujo completo.
              </p>

              <div className="space-y-2">
                <label className="block text-xs text-gray-300 mb-1">
                  Tipo de foto
                </label>
                <select
                  value={quickTipo}
                  onChange={(e) => setQuickTipo(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/30"
                >
                  {TipoFotoAdhesionOpts.map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="relative inline-flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-700 bg-gray-900/60 px-3 py-2 text-xs text-gray-200 cursor-pointer hover:border-emerald-500/60 hover:bg-gray-900">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setQuickFile(e.target.files?.[0] || null)
                    }
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <HiPhotograph className="mr-2 h-4 w-4" />
                  {quickFile ? quickFile.name : "Seleccionar foto"}
                </label>

                <button
                  disabled={!quickFile || subiendoQuick}
                  onClick={subirFotoAdhesion}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {subiendoQuick ? "Subiendo…" : "Agregar foto"}
                </button>
              </div>

              <p className="text-[11px] text-gray-400">
                Sugerencia: asegurate de que la{" "}
                <b>patente se vea clara</b> en al menos una de las fotos.
              </p>
            </motion.div>
          </div>

          {/* Solicitudes recientes */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-800 bg-gray-950/80 p-4"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-50">
                  Solicitudes de esta póliza
                </h3>
                <p className="text-[11px] text-gray-400">
                  Solo se muestran las últimas 5 para mantener la vista limpia.
                </p>
              </div>
              <span className="inline-flex items-center justify-center rounded-full bg-gray-900 px-2.5 py-1 text-[11px] text-gray-300">
                {solicitudes?.length || 0}{" "}
                {solicitudes?.length === 1 ? "solicitud" : "solicitudes"}
              </span>
            </div>

            {solicitudes?.length ? (
              <div className="space-y-2">
                {solicitudes.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-gray-800 bg-gray-900/80 p-3 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-semibold text-gray-50">
                          Solicitud #{s.id}
                        </div>
                        {pill(
                          s.estado,
                          s.estado === "COMPLETADA"
                            ? "green"
                            : s.estado === "CANCELADA"
                            ? "red"
                            : "gray"
                        )}
                      </div>
                      <div className="grid gap-1 text-[11px] text-gray-300 sm:grid-cols-3">
                        <Info label="Motivo" value={mapMotivo(s.motivo)} mini />
                        <Info
                          label="Fecha"
                          value={dayjs(s.fecha_solicitud).format(
                            "DD/MM/YYYY HH:mm"
                          )}
                          mini
                        />
                        <Info
                          label="Origen"
                          value={s.origen || "-"}
                          mini
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 rounded-xl border border-dashed border-gray-700 bg-gray-900/60 px-3 py-4 text-center text-sm text-gray-400">
                Sin solicitudes de grúa registradas para esta póliza.
              </div>
            )}
          </motion.div>
        </>
      ) : (
        // CTA para activar (abre modal guiado)
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-800 bg-gray-950/80 p-4 space-y-3"
        >
          <div className="flex items-start gap-2 text-gray-200">
            <div className="mt-0.5">
              <HiInformationCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="space-y-1 text-sm">
              <p>
                Activá la asistencia de grúa para esta póliza. Carencia de{" "}
                <b>15 días</b> desde la activación. Servicio L–S{" "}
                <b>08:00–20:00</b>. Límite <b>100 km</b> (ida+vuelta). Tope de
                uso <b>1/mes</b>, <b>2/6 meses</b>.
              </p>
              <p className="text-xs text-gray-400">
                Podés subir todas las fotos requeridas en un flujo guiado en 2
                pasos.
              </p>
            </div>
          </div>
          <div className="pt-1">
            <button
              onClick={() => setShowActivate(true)}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Activar grúa
            </button>
          </div>
        </motion.div>
      )}

      <ActivateModal
        open={showActivate}
        onClose={() => setShowActivate(false)}
        planes={planes}
        polizaId={polizaId}
        onActivated={async () => {
          // refrescar estado tras activación
          try {
            const adhResp = await GruasAPI.getAdhesionesPorPoliza(polizaId);
            setAdhesion(adhResp?.[0] || null);
            const solResp = await GruasAPI.getSolicitudesPorPoliza(polizaId);
            setSolicitudes(Array.isArray(solResp) ? solResp : []);
          } catch {}
        }}
      />
    </div>
  );
}

function Info({ label, value, mini = false }) {
  return (
    <div>
      <div
        className={`text-gray-400 ${
          mini ? "text-[11px]" : "text-xs"
        }`}
      >
        {label}
      </div>
      <div className={mini ? "text-[11px] text-gray-100" : "text-sm text-gray-100"}>
        {value || "-"}
      </div>
    </div>
  );
}
function mapMotivo(m) {
  switch (m) {
    case "AVERIA":
      return "Avería";
    case "ACCIDENTE":
      return "Accidente";
    default:
      return "Otro";
  }
}

/* ===========================
   MODAL DE ACTIVACIÓN GUIADO
   =========================== */
function ActivateModal({ open, onClose, planes, polizaId, onActivated }) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // Paso 1: datos
  const [planId, setPlanId] = useState(
    planes?.[0]?.id ? String(planes[0].id) : ""
  );
  const [fechaActivacion, setFechaActivacion] = useState(
    dayjs().format("YYYY-MM-DD")
  ); // ✅ obligatoria
  const [carenciaDias, setCarenciaDias] = useState(15); // ✅ control numérico “15 días”
  const carenciaFin = useMemo(() => {
    const base = fechaActivacion ? dayjs(fechaActivacion) : dayjs();
    return base
      .add(
        Number.isFinite(+carenciaDias) ? +carenciaDias : 15,
        "day"
      )
      .format("DD/MM/YYYY");
  }, [fechaActivacion, carenciaDias]);

  // Paso 2: fotos (multi-carga hasta 8)
  const [queue, setQueue] = useState([]); // {file, preview, tipo, name}
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      // reset al cerrar
      setStep(1);
      setBusy(false);
      setPlanId(planes?.[0]?.id ? String(planes[0].id) : "");
      setFechaActivacion(dayjs().format("YYYY-MM-DD"));
      setCarenciaDias(15);
      setQueue([]);
    }
  }, [open, planes]);

  const handleFiles = (files) => {
    const arr = Array.from(files || []).slice(0, 8 - queue.length);
    if (!arr.length) return;
    const next = arr.map((file, idx) => ({
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
      // Heurística mínima: primera foto → PATENTE; resto → FRENTE por defecto
      tipo: queue.length === 0 && idx === 0 ? "PATENTE" : "FRENTE",
    }));
    setQueue((prev) => [...prev, ...next]);
  };

  const removeFromQueue = (i) =>
    setQueue((prev) => prev.filter((_, idx) => idx !== i));

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const activar = async () => {
    if (!planId) {
      toast.error("Seleccioná un plan.");
      return;
    }
    if (!fechaActivacion) {
      toast.error("La fecha de activación es obligatoria.");
      return;
    }
    const tienePatente = queue.some((f) => f.tipo === "PATENTE");
    if (!tienePatente) {
      toast.error("Agregá al menos una foto de PATENTE.");
      return;
    }

    try {
      setBusy(true);
      // 1) Subir todas las fotos (multi)
      const subidas = [];
      for (const f of queue) {
        const { secure_url, public_id } = await uploadToCloudinary(
          f.file,
          "rc-admin/gruas/adhesiones"
        );
        subidas.push({ tipo: f.tipo, url: secure_url, public_id });
      }
      // 2) Activar adhesión
      const payload = {
        poliza: polizaId,
        plan: Number(planId),
        fecha_activacion: fechaActivacion, // ✅ obligatoria
        notas: `Alta desde UI · Carencia ${carenciaDias} días`,
        fotos: subidas,
      };
      await GruasAPI.activarAdhesion(payload);
      toast.success("Grúa activada en la póliza");
      onClose();
      onActivated?.();
    } catch (e) {
      toast.error(e?.message || "No se pudo activar la grúa");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-50">
                Activar asistencia de grúa
              </span>
              <Stepper step={step} />
            </div>
            <button
              className="p-2 rounded-lg hover:bg-gray-900"
              onClick={busy ? undefined : onClose}
              aria-label="Cerrar"
            >
              <HiX className="w-5 h-5 text-gray-300" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  className="grid gap-4 md:grid-cols-2"
                >
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">
                        Plan
                      </label>
                      <select
                        value={planId}
                        onChange={(e) => setPlanId(e.target.value)}
                        className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/30"
                      >
                        {planes.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} — {p.km_incluidos} km incluidos
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs text-gray-300 mb-1">
                        Fecha de activación{" "}
                        <span className="text-red-400">*</span>
                      </label>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <input
                          type="date"
                          required
                          value={fechaActivacion}
                          onChange={(e) => setFechaActivacion(e.target.value)}
                          className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/30"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            value={carenciaDias}
                            onChange={(e) =>
                              setCarenciaDias(
                                parseInt(e.target.value || "0", 10)
                              )
                            }
                            className="w-20 rounded-xl border border-gray-700 bg-gray-900 px-2 py-2 text-xs text-gray-100 outline-none"
                            title="Carencia en días"
                          />
                          <button
                            type="button"
                            onClick={() => setCarenciaDias(15)}
                            className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-200 hover:bg-gray-850"
                          >
                            15 días
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Fin de carencia estimado:{" "}
                        <b className="text-gray-100">{carenciaFin}</b>.
                      </p>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                      <HiCheckCircle className="h-4 w-4 text-emerald-400" />
                      <span>
                        Horario: L–S 08:00–20:00 · Límite: 100 km (ida+vuelta).
                      </span>
                    </div>
                  </div>

                  {/* Ayuda visual */}
                  <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-3">
                    <h4 className="mb-2 text-sm font-semibold text-gray-50">
                      Paso 1 · Configuración
                    </h4>
                    <ul className="list-disc space-y-1 pl-4 text-[12px] text-gray-300">
                      <li>Elegí el plan que corresponde a la póliza.</li>
                      <li>
                        Definí la <b>fecha de activación</b>.
                      </li>
                      <li>
                        Podés ajustar la <b>carencia en días</b> (por defecto
                        15).
                      </li>
                      <li>
                        En el próximo paso vas a cargar las{" "}
                        <b>fotos del vehículo</b>.
                      </li>
                    </ul>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="space-y-3"
                >
                  <h4 className="text-sm font-semibold text-gray-50">
                    Paso 2 · Fotos del vehículo
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Cargá varias imágenes a la vez (hasta 8). Es obligatorio
                    incluir al menos una de <b>PATENTE</b>.
                  </p>

                  {/* Área dropzone + botón */}
                  <div
                    onDrop={onDrop}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="rounded-2xl border-2 border-dashed border-gray-700 bg-gray-950/80 p-4 text-center"
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFiles(e.target.files)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-100 hover:bg-gray-850"
                    >
                      <HiUpload className="h-5 w-5" />
                      Seleccionar fotos
                    </button>
                    <div className="mt-2 text-[11px] text-gray-400">
                      o arrastrá y soltá las imágenes aquí
                    </div>
                  </div>

                  {/* Cola de archivos */}
                  {queue.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {queue.map((f, idx) => (
                        <div
                          key={idx}
                          className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/80"
                        >
                          <img
                            src={f.preview}
                            alt={f.name}
                            className="h-32 w-full object-cover"
                          />
                          <div className="flex items-center gap-2 p-2 text-[11px]">
                            <select
                              value={f.tipo}
                              onChange={(e) =>
                                setQueue((prev) =>
                                  prev.map((it, i) =>
                                    i === idx
                                      ? { ...it, tipo: e.target.value }
                                      : it
                                  )
                                )
                              }
                              className="flex-1 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 outline-none"
                            >
                              {TipoFotoAdhesionOpts.map((o) => (
                                <option key={o.v} value={o.v}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => removeFromQueue(idx)}
                              className="ml-1 text-red-300 hover:text-red-200"
                              title="Quitar"
                            >
                              <HiX className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-800 px-4 py-3">
            <button
              className="inline-flex items-center gap-1 rounded-xl bg-gray-900 px-3 py-2 text-sm text-gray-100 hover:bg-gray-850"
              onClick={step === 1 ? onClose : () => setStep(1)}
              disabled={busy}
            >
              {step === 1 ? (
                <HiX className="h-4 w-4" />
              ) : (
                <HiChevronLeft className="h-4 w-4" />
              )}
              {step === 1 ? "Cancelar" : "Atrás"}
            </button>

            <div className="flex items-center gap-2">
              {step === 1 ? (
                <button
                  className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                  onClick={() => setStep(2)}
                  disabled={!fechaActivacion || !planId || busy}
                >
                  Siguiente
                  <HiChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  onClick={activar}
                  disabled={busy || queue.length === 0}
                >
                  Activar
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Stepper({ step }) {
  return (
    <div className="ml-2 flex items-center gap-1">
      <div
        className={`h-1.5 w-8 rounded-full ${
          step >= 1 ? "bg-sky-500" : "bg-gray-700"
        }`}
      />
      <div
        className={`h-1.5 w-8 rounded-full ${
          step >= 2 ? "bg-sky-500" : "bg-gray-700"
        }`}
      />
    </div>
  );
}
