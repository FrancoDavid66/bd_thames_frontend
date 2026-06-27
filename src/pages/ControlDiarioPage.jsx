/* src/pages/ControlDiarioPage.jsx
 *
 * Control diario (tareas recurrentes con foto).
 *   - Cada tarea es una tarjeta. Verde al alcanzar el  mínimo de fotos.
 *   - Varias fotos por tarea (galería). Wizard de responsable en la 1ª foto.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  HiCheckCircle, HiCamera, HiPhotograph, HiX, HiCalendar, HiRefresh,
  HiArrowRight, HiBadgeCheck, HiPlus,
} from "react-icons/hi";
import api from "../services/api";
import { uploadToCloudinary } from "../utils/cloudinary";

function FotoModal({ foto, onClose }) {
  return (
    <AnimatePresence>
      {foto && (
        <motion.div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/85 p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        >
          <motion.div
            className="relative max-h-[85vh] max-w-lg overflow-hidden rounded-2xl border border-white/10"
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute right-2 top-2 rounded-lg bg-black/60 p-2 text-white">
              <HiX className="text-xl" />
            </button>
            <img src={foto} alt="Foto de la tarea" className="max-h-[85vh] w-full object-contain" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function WizardResponsable({ open, tarea, oficina, empleados, onClose, onElegido }) {
  const emps = empleados || [];
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-t-2xl border border-white/10 bg-slate-900 p-5 sm:rounded-2xl"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] text-slate-400">Paso 1 de 2</span>
              <button onClick={onClose} className="text-slate-400 hover:text-white"><HiX className="text-lg" /></button>
            </div>
            <div className="mb-3.5 flex gap-1">
              <div className="h-[3px] flex-1 rounded-full bg-indigo-500" />
              <div className="h-[3px] flex-1 rounded-full bg-white/10" />
            </div>

            <div className="text-base font-bold text-white">¿Quién hizo esta tarea?</div>
            <div className="mb-4 text-[13px] text-slate-400">{tarea?.nombre} · {oficina?.oficina_nombre}</div>

            {emps.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-slate-800 p-4 text-center text-[13px] text-slate-400">
                No hay empleados cargados en esta oficina.
                <button onClick={() => onElegido(null)} className="mt-3 w-full rounded-lg bg-indigo-600 py-2.5 text-[13px] font-bold text-white">
                  Subir igual sin responsable
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {emps.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onElegido(e.id)}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-800 p-3 text-left transition hover:border-indigo-500 hover:bg-indigo-600/20"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-600 text-[12px] font-bold text-slate-100">
                      {String(e.nombre || "").slice(0, 2).toUpperCase()}
                    </span>
                    <span className="flex-1 text-[14px] font-semibold text-white">{e.nombre}</span>
                    <HiArrowRight className="text-slate-400" />
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 text-center text-[11px] text-slate-500">Después de elegir se abre la cámara 📸</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TareaCard({ tarea, oficina, empleados, onCumplida, subiendo, setSubiendo, setFoto }) {
  const ref = useRef(null);
  const respRef = useRef(null);
  const key = `${tarea.tarea_id}-${oficina.oficina_id}`;
  const cargando = subiendo === key;
  const [wizard, setWizard] = useState(false);

  const fotos = tarea.fotos || [];
  const fmin = tarea.fotos_min || 1;
  const fmax = tarea.fotos_max || 1;
  const subidas = tarea.fotos_subidas != null ? tarea.fotos_subidas : (tarea.cumplida ? 1 : 0);
  const done = tarea.cumplida;
  const puedeSumar = tarea.puede_sumar != null ? tarea.puede_sumar : (subidas < fmax);
  const yaEligioResp = subidas > 0; // el responsable se elige en la 1ª foto

  // Tocar el botón: si es la 1ª foto, wizard; si ya hay, abre cámara directo.
  const onSubirClick = () => {
    if (!yaEligioResp) setWizard(true);
    else { setTimeout(() => ref.current?.click(), 0); }
  };

  const onElegido = (empId) => {
    respRef.current = empId;
    setWizard(false);
    setTimeout(() => ref.current?.click(), 80);
  };

  const pick = async (file) => {
    if (!file) return;
    if (!(file.type || "").startsWith("image/")) { toast.error("Tiene que ser una foto"); return; }
    setSubiendo(key);
    try {
      const { secure_url, public_id } = await uploadToCloudinary(file, "de-thames/tareas-fijas");
      if (!secure_url) throw new Error("Sin URL");
      const res = await api.post("tareas-fijas/cumplir/", {
        tarea_id: tarea.tarea_id,
        oficina_id: oficina.oficina_id,
        foto_url: secure_url,
        foto_public_id: public_id || "",
        responsable_empleado_id: respRef.current || "",
      });
      const d = res?.data || {};
      if (d.cumplida) toast.success(d.puntos ? `¡Completa! +${d.puntos} pts` : "¡Tarea completa! ✅");
      else toast.success(`Foto subida (${d.fotos_subidas}/${d.fotos_min})`);
      onCumplida();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo subir");
    } finally {
      setSubiendo(null);
    }
  };

  const quienHizo = tarea.responsable_real || tarea.cumplido_por || "";
  const variasFotos = fmin > 1 || fmax > 1;
  const faltan = Math.max(0, fmin - subidas);

  return (
    <>
      <div className={`rounded-xl border p-3.5 transition ${
        done ? "border-emerald-500/30 bg-emerald-500/[0.09]" : "border-white/10 bg-slate-800/60"
      }`}>
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            done ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"
          }`}>
            {done ? <HiCheckCircle className="text-lg" /> : <HiCamera className="text-base" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className={`text-[14px] font-semibold ${done ? "text-emerald-200" : "text-slate-100"}`}>{tarea.nombre}</div>
            <div className={`text-[11px] ${done ? "text-emerald-300/80" : "text-slate-400"}`}>
              {(done || subidas > 0) && quienHizo ? `por ${quienHizo}${tarea.cargado_por_admin ? " (admin)" : ""}` : (tarea.responsable || "Sin responsable")}
              {tarea.hora_esperada ? ` · ${tarea.hora_esperada}` : ""}
            </div>
            {tarea.instruccion_foto && !done ? (
              <div className="mt-1 flex items-start gap-1 text-[11px] font-medium text-sky-300">
                <HiCamera className="mt-0.5 shrink-0" /> {tarea.instruccion_foto}
              </div>
            ) : null}
          </div>

          {/* Contador de fotos */}
          {variasFotos ? (
            <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${
              done ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/15 text-amber-300"
            }`}>
              {subidas} de {fmin}{fmax > fmin ? `+` : ""}
            </span>
          ) : null}
        </div>

        {/* Galería de miniaturas */}
        {(subidas > 0 || variasFotos) ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {fotos.map((f, i) => (
              <button
                key={f.id || i}
                onClick={() => setFoto(f.url)}
                className="h-12 w-12 overflow-hidden rounded-lg border border-emerald-500/30"
              >
                <img src={f.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
            {/* Huecos faltantes (solo si es de varias) */}
            {variasFotos && !done
              ? Array.from({ length: Math.max(0, fmin - subidas) }).map((_, i) => (
                  <div key={`g${i}`} className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/20 text-slate-600">
                    <HiCamera className="text-sm" />
                  </div>
                ))
              : null}
          </div>
        ) : null}

        {/* Botón subir / agregar */}
        {puedeSumar ? (
          <button
            onClick={onSubirClick}
            disabled={cargando}
            className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-bold text-white disabled:opacity-50 ${
              done ? "bg-slate-700 hover:bg-slate-600" : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {cargando ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Subiendo…</>
            ) : subidas === 0 ? (
              <><HiCamera className="text-sm" /> Subir foto{variasFotos ? ` (faltan ${faltan})` : ""}</>
            ) : (
              <><HiPlus className="text-sm" /> Agregar foto{faltan > 0 ? ` (faltan ${faltan})` : ""}</>
            )}
          </button>
        ) : null}
      </div>

      <WizardResponsable
        open={wizard}
        tarea={tarea}
        oficina={oficina}
        empleados={empleados}
        onClose={() => setWizard(false)}
        onElegido={onElegido}
      />

      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; pick(f); e.target.value = ""; }}
      />
    </>
  );
}

export default function ControlDiarioPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(null);
  const [foto, setFoto] = useState(null);

  const cargar = async () => {
    try {
      const res = await api.get("tareas-fijas/dia/");
      setData(res.data);
    } catch {
      toast.error("No se pudieron cargar las tareas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const oficinas = data?.oficinas || [];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-5">
      <div className="mx-auto max-w-lg lg:max-w-7xl">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Control diario</h1>
          <button onClick={() => { setLoading(true); cargar(); }} className="rounded-full border border-white/10 bg-slate-900 p-2 text-slate-400 hover:text-white">
            <HiRefresh className="text-lg" />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-1.5 text-[13px] text-slate-400">
              <HiCalendar className="text-sm" /> {data?.fecha}
              {data?.total > 0 ? <span>· {data.cumplidas} de {data.total} cumplidas</span> : null}
            </div>

            {data?.feriado ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-5 text-center">
                <div className="text-base font-bold text-amber-300">🎌 Feriado — {data.feriado_nombre}</div>
                <p className="mt-1 text-[13px] text-slate-400">Hoy no se esperan tareas fijas.</p>
              </div>
            ) : oficinas.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 text-center text-slate-400">
                No hay tareas fijas cargadas todavía.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {oficinas.map((ofi) => {
                  const completa = ofi.total > 0 && ofi.cumplidas === ofi.total;
                  return (
                    <div key={ofi.oficina_id} className={`overflow-hidden rounded-2xl border ${
                      completa ? "border-emerald-500/40 bg-emerald-500/[0.05]" : "border-white/10 bg-slate-900"
                    }`}>
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-[15px] font-bold text-white">{ofi.oficina_nombre}</span>
                        {completa ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[12px] font-bold text-emerald-300">
                            <HiBadgeCheck className="text-sm" /> ¡Completo!
                          </span>
                        ) : (
                          <span className="text-[12px] font-bold text-amber-400">{ofi.cumplidas} de {ofi.total}</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2.5 px-3 pb-3">
                        {ofi.tareas.length === 0 ? (
                          <div className="px-1 py-2 text-[13px] text-slate-500">Sin tareas para hoy.</div>
                        ) : (
                          ofi.tareas.map((t) => (
                            <TareaCard
                              key={`${t.tarea_id}-${ofi.oficina_id}`}
                              tarea={t}
                              oficina={ofi}
                              empleados={ofi.empleados}
                              onCumplida={cargar}
                              subiendo={subiendo}
                              setSubiendo={setSubiendo}
                              setFoto={setFoto}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <FotoModal foto={foto} onClose={() => setFoto(null)} />
    </div>
  );
}