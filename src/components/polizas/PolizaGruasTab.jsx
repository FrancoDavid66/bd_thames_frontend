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
    green: "bg-emerald-600/20 text-emerald-300 border-emerald-600/40",
    yellow: "bg-yellow-600/20 text-yellow-200 border-yellow-600/40",
    red: "bg-red-600/20 text-red-300 border-red-600/40",
    gray: "bg-gray-600/20 text-gray-200 border-gray-600/40",
    blue: "bg-blue-600/20 text-blue-200 border-blue-600/40",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${map[tone]}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
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
          polizaId ? GruasAPI.getAdhesionesPorPoliza(polizaId) : Promise.resolve([]),
          polizaId ? GruasAPI.getSolicitudesPorPoliza(polizaId) : Promise.resolve([]),
        ]);
        if (!mounted) return;
        setPlanes(Array.isArray(plansResp) ? plansResp : []);
        const adh = Array.isArray(adhResp) && adhResp.length ? adhResp[0] : null;
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
      !adhesion.fecha_carencia_fin || dayjs(adhesion.fecha_carencia_fin).isSameOrBefore(hoy, "day");
    const moraOk =
      !adhesion.rehabilitar_desde || dayjs(adhesion.rehabilitar_desde).isSameOrBefore(hoy, "day");
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
          <div className="h-8 bg-gray-800 rounded w-1/2" />
          <div className="h-24 bg-gray-800 rounded" />
          <div className="h-48 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Asistencia de Grúa</h2>
        <Link
          to="/gruas"
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
        >
          Ir al módulo de Grúas
        </Link>
      </div>

      {adhesion ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm text-gray-400">Estado</div>
              {adhesion.estado === "ACTIVA" && pill("Activa", "green")}
              {adhesion.estado === "PAUSADA" && pill("Pausada", "yellow")}
              {adhesion.estado === "CANCELADA" && pill("Cancelada", "red")}
              {operable ? pill("Operable", "blue") : pill("No operable (carencia/suspensión)", "yellow")}
            </div>

            <div className="grid md:grid-cols-4 gap-3 text-sm">
              <Info label="Plan" value={adhesion.plan_display || "-"} />
              <Info
                label="Activación"
                value={
                  adhesion.fecha_activacion ? dayjs(adhesion.fecha_activacion).format("DD/MM/YYYY") : "-"
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

            {/* Fotos adhesión */}
            <div className="mt-2">
              <h3 className="text-base font-semibold mb-2">Fotos registradas (adhesión)</h3>
              {adhesion?.fotos_adhesion?.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {adhesion.fotos_adhesion.map((f) => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group block rounded-lg overflow-hidden border border-gray-700 bg-gray-800"
                    >
                      <img
                        src={f.url}
                        alt={f.tipo}
                        className="w-full h-36 object-cover group-hover:opacity-90"
                      />
                      <div className="px-2 py-1 text-xs text-gray-300">{f.tipo}</div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400">No hay fotos cargadas.</div>
              )}

              {/* Agregar una foto (rápido) */}
              <div className="mt-3 grid md:grid-cols-[1fr_1fr_auto] gap-2">
                <select
                  value={quickTipo}
                  onChange={(e) => setQuickTipo(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm"
                >
                  {TipoFotoAdhesionOpts.map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <label className="relative inline-flex items-center justify-center px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm cursor-pointer hover:bg-gray-750">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setQuickFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <HiPhotograph className="w-5 h-5 mr-2" />
                  Seleccionar foto
                </label>
                <button
                  disabled={!quickFile || subiendoQuick}
                  onClick={subirFotoAdhesion}
                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60"
                >
                  {subiendoQuick ? "Subiendo..." : "Agregar foto"}
                </button>
              </div>
            </div>

            {/* Solicitudes recientes */}
            <div className="mt-4">
              <h3 className="text-base font-semibold mb-2">Solicitudes de esta póliza</h3>
              {solicitudes?.length ? (
                <div className="space-y-2">
                  {solicitudes.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg border border-gray-800 bg-gray-950 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">Solicitud #{s.id}</div>
                        <div>
                          {pill(
                            s.estado,
                            s.estado === "COMPLETADA"
                              ? "green"
                              : s.estado === "CANCELADA"
                              ? "red"
                              : "gray"
                          )}
                        </div>
                      </div>
                      <div className="grid md:grid-cols-3 gap-2 mt-1">
                        <Info label="Motivo" value={mapMotivo(s.motivo)} mini />
                        <Info
                          label="Fecha"
                          value={dayjs(s.fecha_solicitud).format("DD/MM/YYYY HH:mm")}
                          mini
                        />
                        <Info label="Origen" value={s.origen || "-"} mini />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400">Sin solicitudes aún.</div>
              )}
            </div>
          </motion.div>
        </>
      ) : (
        // CTA para activar (abre modal guiado)
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-gray-800 bg-gray-900 p-4"
        >
          <div className="flex items-center gap-2 text-gray-200">
            <HiInformationCircle className="w-5 h-5 text-yellow-400" />
            <p className="text-sm">
              Activá la asistencia de grúa para esta póliza. Carencia de <b>15 días</b> desde la activación.
              Servicio L–S <b>08:00–20:00</b>. Límite <b>100 km</b> (ida+vuelta). Tope de uso <b>1/mes</b>, <b>2/6 meses</b>.
            </p>
          </div>
          <div className="mt-3">
            <button
              onClick={() => setShowActivate(true)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
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
      <div className={`text-gray-400 ${mini ? "text-xs" : "text-sm"}`}>{label}</div>
      <div className={mini ? "text-xs" : ""}>{value || "-"}</div>
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
  const [planId, setPlanId] = useState(planes?.[0]?.id ? String(planes[0].id) : "");
  const [fechaActivacion, setFechaActivacion] = useState(dayjs().format("YYYY-MM-DD")); // ✅ obligatoria
  const [carenciaDias, setCarenciaDias] = useState(15); // ✅ control numérico “15 días”
  const carenciaFin = useMemo(() => {
    const base = fechaActivacion ? dayjs(fechaActivacion) : dayjs();
    return base.add(Number.isFinite(+carenciaDias) ? +carenciaDias : 15, "day").format("DD/MM/YYYY");
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

  const removeFromQueue = (i) => setQueue((prev) => prev.filter((_, idx) => idx !== i));

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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl rounded-2xl border border-gray-800 bg-gray-900 shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">Activar asistencia de grúa</span>
              <Stepper step={step} />
            </div>
            <button
              className="p-2 rounded-lg hover:bg-gray-800"
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
                  className="grid md:grid-cols-2 gap-4"
                >
                  <div className="space-y-3">
                    <label className="block text-sm text-gray-300">Plan</label>
                    <select
                      value={planId}
                      onChange={(e) => setPlanId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
                    >
                      {planes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} — {p.km_incluidos} km incluidos
                        </option>
                      ))}
                    </select>

                    <div>
                      <label className="block text-sm text-gray-300 mb-1">
                        Fecha de activación <span className="text-red-400">*</span>
                      </label>
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <input
                          type="date"
                          required
                          value={fechaActivacion}
                          onChange={(e) => setFechaActivacion(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
                        />
                        {/* Control de carencia (días) con botón 15 */}
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            value={carenciaDias}
                            onChange={(e) => setCarenciaDias(parseInt(e.target.value || "0", 10))}
                            className="w-20 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm"
                            title="Carencia en días"
                          />
                          <button
                            type="button"
                            onClick={() => setCarenciaDias(15)}
                            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm hover:bg-gray-750"
                            title="Usar 15 días"
                          >
                            15 días
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Fin de carencia: <b>{carenciaFin}</b> (se calcula según la fecha y los días de carencia).
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                      <HiCheckCircle className="w-4 h-4 text-emerald-400" />
                      Horario: L–S 08:00–20:00 · Límite: 100 km (ida+vuelta).
                    </div>
                  </div>

                  {/* Ayuda visual */}
                  <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
                    <h4 className="text-sm font-semibold mb-2">¿Qué necesitás?</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                      <li>Seleccionar el plan correcto.</li>
                      <li>Elegir la <b>fecha de activación</b> (obligatoria).</li>
                      <li>El sistema calculará el <b>fin de carencia</b>.</li>
                      <li>En el próximo paso subís las <b>fotos del vehículo</b>.</li>
                    </ul>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                >
                  <h4 className="text-sm font-semibold mb-2">Fotos del vehículo (adhesión)</h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Cargá varias imágenes a la vez (hasta 8). Debe haber al menos una de <b>PATENTE</b>.
                  </p>

                  {/* Área dropzone + botón didáctico */}
                  <div
                    onDrop={onDrop}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="rounded-xl border-2 border-dashed border-gray-700 bg-gray-950 p-4 text-center"
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
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm hover:bg-gray-750"
                    >
                      <HiUpload className="w-5 h-5" />
                      Seleccionar fotos
                    </button>
                    <div className="mt-2 text-xs text-gray-400">
                      o arrastrá y soltá aquí tus imágenes
                    </div>
                  </div>

                  {/* Cola de archivos */}
                  {queue.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {queue.map((f, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg overflow-hidden border border-gray-700 bg-gray-800"
                        >
                          <img src={f.preview} alt={f.name} className="w-full h-36 object-cover" />
                          <div className="p-2 text-xs flex items-center justify-between gap-2">
                            <select
                              value={f.tipo}
                              onChange={(e) =>
                                setQueue((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, tipo: e.target.value } : it))
                                )
                              }
                              className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1"
                            >
                              {TipoFotoAdhesionOpts.map((o) => (
                                <option key={o.v} value={o.v}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => removeFromQueue(idx)}
                              className="text-red-300 hover:text-red-200 ml-2"
                              title="Quitar"
                            >
                              <HiX className="w-4 h-4" />
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <button
              className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-750"
              onClick={step === 1 ? onClose : () => setStep(1)}
              disabled={busy}
            >
              {step === 1 ? <HiX className="w-4 h-4" /> : <HiChevronLeft className="w-4 h-4" />}
              {step === 1 ? "Cancelar" : "Atrás"}
            </button>

            <div className="flex items-center gap-2">
              {step === 1 ? (
                <button
                  className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setStep(2)}
                  disabled={!fechaActivacion || !planId || busy}
                >
                  Siguiente
                  <HiChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
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
    <div className="ml-2 flex items-center gap-2">
      <div className={`h-2 w-10 rounded-full ${step >= 1 ? "bg-blue-500" : "bg-gray-700"}`} />
      <div className={`h-2 w-10 rounded-full ${step >= 2 ? "bg-blue-500" : "bg-gray-700"}`} />
    </div>
  );
}
