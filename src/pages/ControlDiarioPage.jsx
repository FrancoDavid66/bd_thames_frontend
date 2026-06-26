/* src/pages/ControlDiarioPage.jsx
 *
 * Pantalla de "Control diario" (tareas recurrentes con foto).
 *   - Empleado: ve su oficina y sube la foto de cada tarea.
 *   - Admin: ve todas las oficinas como galería de control.
 * (El ranking ahora es un apartado aparte: ver RankingPage.)
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { HiCheckCircle, HiCamera, HiPhotograph, HiX, HiCalendar, HiRefresh } from "react-icons/hi";
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

function TareaRow({ tarea, oficina, onCumplida, subiendo, setSubiendo, setFoto }) {
  const ref = useRef(null);
  const key = `${tarea.tarea_id}-${oficina.oficina_id}`;
  const cargando = subiendo === key;

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
      });
      const pts = res?.data?.puntos;
      toast.success(pts ? `¡Cumplida! ${pts > 0 ? "+" : ""}${pts} pts` : "¡Tarea cumplida! ✅");
      onCumplida();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo subir");
    } finally {
      setSubiendo(null);
    }
  };

  return (
    <div className="flex items-center gap-3 border-t border-white/5 px-3 py-3 first:border-t-0">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
        tarea.cumplida ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-500"
      }`}>
        {tarea.cumplida ? <HiCheckCircle className="text-xl" /> : <HiCamera className="text-xl" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-100">{tarea.nombre}</div>
        <div className="text-[11px] text-slate-400">
          {tarea.responsable || "Sin responsable"}
          {tarea.hora_esperada ? ` · ${tarea.hora_esperada}` : ""}
          {tarea.cumplida && tarea.cumplido_por ? ` · por ${tarea.cumplido_por}` : ""}
        </div>
        {tarea.instruccion_foto && !tarea.cumplida ? (
          <div className="mt-1 flex items-start gap-1 text-[11px] font-medium text-sky-300">
            <HiCamera className="mt-0.5 shrink-0" /> {tarea.instruccion_foto}
          </div>
        ) : null}
      </div>

      {tarea.cumplida ? (
        tarea.foto_url ? (
          <button
            onClick={() => setFoto(tarea.foto_url)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-[11px] font-bold text-emerald-300"
          >
            <HiPhotograph className="text-sm" /> Ver foto
          </button>
        ) : (
          <span className="text-[11px] font-bold text-emerald-400">Hecha</span>
        )
      ) : (
        <>
          <button
            onClick={() => ref.current?.click()}
            disabled={cargando}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 px-3 py-2 text-[11px] font-bold text-indigo-300 hover:bg-indigo-500/10 disabled:opacity-50"
          >
            {cargando ? (
              <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-400/40 border-t-indigo-400" /> Subiendo…</>
            ) : (
              <><HiCamera className="text-sm" /> Subir foto</>
            )}
          </button>
          <input
            ref={ref}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; pick(f); e.target.value = ""; }}
          />
        </>
      )}
    </div>
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
                {oficinas.map((ofi) => (
                  <div key={ofi.oficina_id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-[15px] font-bold text-white">{ofi.oficina_nombre}</span>
                      <span className={`text-[12px] font-bold ${
                        ofi.cumplidas === ofi.total ? "text-emerald-400" : "text-amber-400"
                      }`}>
                        {ofi.cumplidas} de {ofi.total}
                      </span>
                    </div>
                    <div className="px-1 pb-1">
                      {ofi.tareas.length === 0 ? (
                        <div className="px-3 py-3 text-[13px] text-slate-500">Sin tareas para hoy.</div>
                      ) : (
                        ofi.tareas.map((t) => (
                          <TareaRow
                            key={`${t.tarea_id}-${ofi.oficina_id}`}
                            tarea={t}
                            oficina={ofi}
                            onCumplida={cargar}
                            subiendo={subiendo}
                            setSubiendo={setSubiendo}
                            setFoto={setFoto}
                          />
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <FotoModal foto={foto} onClose={() => setFoto(null)} />
    </div>
  );
}