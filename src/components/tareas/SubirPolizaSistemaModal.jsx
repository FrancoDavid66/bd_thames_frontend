/* src/components/tareas/SubirPolizaSistemaModal.jsx */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  HiDocumentText, HiX, HiUpload, HiCheckCircle, HiSparkles, HiExclamation,
} from "react-icons/hi";
import { uploadToCloudinary } from "../../utils/cloudinary";
import api from "../../services/api";

/* ⚠️ AJUSTÁ ESTA RUTA si tu lector de PDF está en otra URL.
   Es el endpoint del LectorPdfView (el que usa la subida rápida). */
const LECTOR_PDF_ENDPOINT = "polizas/lector-pdf/";

const SLOTS = [
  { key: "POLIZA", label: "Póliza / frente" },
  { key: "MERCOSUR", label: "Mercosur" },
  { key: "CUPONERA", label: "Cuponera (si es con robo)" },
];

/* ── normalizadores para comparar ── */
const fmtFecha = (iso) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  return d && m && y ? `${d}/${m}/${y}` : String(iso);
};
const normPat = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const normDni = (v) => String(v || "").replace(/\D/g, "");
const normNom = (v) =>
  String(v || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

/* Dos nombres "coinciden" si comparten al menos una palabra de 3+ letras */
function nombreCoincide(a, b) {
  const pa = normNom(a).split(" ").filter((w) => w.length >= 3);
  const pb = normNom(b).split(" ").filter((w) => w.length >= 3);
  if (!pa.length || !pb.length) return true;
  return pa.some((w) => pb.includes(w));
}

function SlotPdf({ slot, archivo, onPick }) {
  const ref = useRef(null);
  return (
    <div className="rounded-2xl bg-black/40 border border-white/5 p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
        <HiDocumentText className="text-xl" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-white">{slot.label}</div>
        <div className="text-[11px] text-white/40 truncate">{archivo ? archivo.name : "Sin archivo"}</div>
      </div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`h-10 px-4 rounded-xl inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all ${
          archivo ? "bg-white/5 text-white border border-white/10 hover:bg-white/10" : "bg-indigo-500 text-white hover:bg-indigo-400"
        }`}
      >
        <HiUpload className="text-sm" /> {archivo ? "Cambiar" : "Elegir"}
      </button>
      <input ref={ref} type="file" accept="application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
    </div>
  );
}

export default function SubirPolizaSistemaModal({ isOpen, item, onClose, onSaved }) {
  const [files, setFiles] = useState({ POLIZA: null, MERCOSUR: null, CUPONERA: null });
  const [saving, setSaving] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [fechaInicial, setFechaInicial] = useState("");

  // flujo de inconsistencias
  const [inconsistencias, setInconsistencias] = useState([]);
  const [idxInc, setIdxInc] = useState(0);
  const [correcciones, setCorrecciones] = useState({});
  const [datosLeidos, setDatosLeidos] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFiles({ POLIZA: null, MERCOSUR: null, CUPONERA: null });
      setResultado(null); setFechaInicial("");
      setInconsistencias([]); setIdxInc(0); setCorrecciones({}); setDatosLeidos(null);
    }
  }, [isOpen]);

  const pick = (key, file) => {
    if ((file.type || "").toLowerCase() !== "application/pdf") { toast.error("Tiene que ser un PDF"); return; }
    setFiles((s) => ({ ...s, [key]: file }));
  };

  const seleccionados = () =>
    SLOTS.map((s) => ({ tipo: s.key, file: files[s.key] })).filter((x) => x.file);

  /* Lee el PDF, calcula inconsistencias y decide si frenar o guardar */
  const analizar = async () => {
    const archivos = seleccionados();
    if (!archivos.length) { toast.error("Subí al menos un papel"); return; }

    setSaving(true);
    try {
      let datosOut = { numero: "", compania: "", cupones: [], _patente: "", _dni: "", _nombre: "", _apellido: "" };
      try {
        const fd = new FormData();
        archivos.forEach((x) => fd.append("archivos", x.file));
        const lectura = await api.post(LECTOR_PDF_ENDPOINT, fd, { headers: { "Content-Type": "multipart/form-data" } });
        const datos = lectura?.data?.datos || {};
        datosOut = {
          numero: datos?.poliza?.numero || "",
          compania: datos?.poliza?.compania || "",
          cupones: datos?.cupones || [],
          _patente: datos?.vehiculo?.patente || "",
          _dni: datos?.cliente?.dni || "",
          _nombre: datos?.cliente?.nombre || "",
          _apellido: datos?.cliente?.apellido || "",
          _vig_desde: datos?.poliza?.vigencia_desde || "",
          _vig_hasta: datos?.poliza?.vigencia_hasta || "",
        };
      } catch {
        toast("No se pudieron leer los datos del PDF, pero se guardan los papeles.", { icon: "⚠️" });
        await guardarFinal(datosOut, {});
        return;
      }

      // comparar lo que NO debería cambiar
      const patPol = item.patente_real || (item.patente !== "—" ? item.patente : "");
      const incs = [];
      if (datosOut._patente && patPol && normPat(datosOut._patente) !== normPat(patPol)) {
        incs.push({ campo: "patente", label: "Patente", valorPdf: datosOut._patente, valorPol: patPol, correccion: { patente: datosOut._patente } });
      }
      if (datosOut._dni && item.cliente_dni && normDni(datosOut._dni) !== normDni(item.cliente_dni)) {
        incs.push({ campo: "dni", label: "DNI", valorPdf: datosOut._dni, valorPol: item.cliente_dni, correccion: { dni: datosOut._dni } });
      }
      const nomPdf = `${datosOut._apellido} ${datosOut._nombre}`.trim();
      if (nomPdf && item.cliente && item.cliente !== "—" && !nombreCoincide(nomPdf, item.cliente)) {
        incs.push({ campo: "nombre", label: "Titular", valorPdf: nomPdf, valorPol: item.cliente, correccion: { nombre: datosOut._nombre, apellido: datosOut._apellido } });
      }

      // Vigencia vieja: si el papel ya venció, probablemente es el de la póliza anterior.
      // Se avisa PRIMERO (lo más importante a chequear en una renovación).
      const hoyStr = new Date().toISOString().slice(0, 10);
      if (datosOut._vig_hasta && datosOut._vig_hasta < hoyStr) {
        incs.unshift({ campo: "vigencia", label: "Vigencia", valorPdf: datosOut._vig_hasta, vieja: true });
      }

      if (incs.length) {
        setDatosLeidos(datosOut);
        setInconsistencias(incs);
        setIdxInc(0);
        setCorrecciones({});
        setSaving(false); // pausamos para que el usuario decida
      } else {
        await guardarFinal(datosOut, {});
      }
    } catch (e) {
      toast.error(e?.message || "No se pudo procesar");
      setSaving(false);
    }
  };

  /* El usuario resuelve la inconsistencia actual */
  const resolver = (usarPdf) => {
    const inc = inconsistencias[idxInc];
    const nuevas = usarPdf ? { ...correcciones, ...inc.correccion } : correcciones;
    setCorrecciones(nuevas);
    if (idxInc + 1 < inconsistencias.length) {
      setIdxInc(idxInc + 1);
    } else {
      setInconsistencias([]);
      setSaving(true);
      guardarFinal(datosLeidos, nuevas);
    }
  };

  /* Sube los PDFs y manda todo al backend */
  const guardarFinal = async (datos, corr) => {
    try {
      const archivos = seleccionados();
      const documentos = [];
      for (const x of archivos) {
        const { secure_url, public_id } = await uploadToCloudinary(x.file, "de-thames/polizas/documentos");
        if (!secure_url) throw new Error("Sin URL de Cloudinary");
        documentos.push({ tipo: x.tipo, url: secure_url, public_id: public_id || "", nombre: x.file.name, mime: x.file.type });
      }
      const datosOut = { numero: datos.numero, compania: datos.compania, cupones: datos.cupones };
      const body = { poliza_id: item.poliza_id, documentos, datos: datosOut, correcciones: corr || {} };
      if (!files.CUPONERA && fechaInicial) body.fecha_inicial_cuotas = fechaInicial;
      const res = await api.post("tareas/subir-papeles-sistema/", body);
      setResultado(res?.data?.resumen || { documentos_guardados: documentos.length, autocompletado: [], cupones_actualizados: 0 });
      toast.success("Papeles cargados ✅");
    } catch (e) {
      toast.error(e?.message || "No se pudo cargar");
    } finally {
      setSaving(false);
    }
  };

  const incActual = inconsistencias[idxInc] || null;

  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#0b0f1e] border border-white/10 shadow-2xl overflow-hidden"
            initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <HiDocumentText className="text-xl" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Subir póliza a sistema</h2>
                  <p className="text-[11px] text-white/40">{item.cliente} · {item.patente}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white"><HiX className="text-xl" /></button>
            </div>

            {resultado ? (
              <div className="p-6">
                <div className="flex flex-col items-center text-center gap-3 py-4">
                  <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <HiCheckCircle className="text-3xl" />
                  </div>
                  <div className="text-lg font-bold text-white">¡Papeles cargados!</div>
                  <div className="text-sm text-white/60 space-y-1">
                    <div>{resultado.documentos_guardados} archivo(s) guardado(s).</div>
                    {resultado.autocompletado?.length > 0 && (
                      <div className="inline-flex items-center gap-1 text-indigo-300"><HiSparkles /> {resultado.autocompletado.join(", ")}.</div>
                    )}
                    {resultado.cupones_actualizados > 0 && (
                      <div className="text-amber-300">{resultado.cupones_actualizados} cupón(es) de robo actualizado(s).</div>
                    )}
                    {resultado.cuotas_actualizadas > 0 && (
                      <div className="text-sky-300">{resultado.cuotas_actualizadas} cuota(s) reprogramada(s).</div>
                    )}
                  </div>
                </div>
                <button onClick={() => onSaved?.()} className="mt-4 w-full h-12 rounded-xl bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400">Listo</button>
              </div>
            ) : incActual ? (
              incActual.campo === "vigencia" ? (
                <div className="p-6">
                  <div className="flex flex-col items-center text-center gap-2 mb-4">
                    <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <HiExclamation className="text-3xl" />
                    </div>
                    <div className="text-lg font-bold text-white">¿Es el papel correcto?</div>
                    <div className="text-[11px] text-white/40">{idxInc + 1} de {inconsistencias.length}</div>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 mb-4">
                    <p className="text-[13px] leading-snug text-amber-100">
                      La vigencia de este papel termina el <b>{fmtFecha(incActual.valorPdf)}</b>, una fecha que ya pasó.
                      Puede ser el papel de la <b>póliza anterior</b>, no el de la renovación nueva.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button onClick={() => resolver(false)} className="w-full h-11 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-200 font-bold text-sm hover:bg-sky-500/25">
                      Está bien, continuar
                    </button>
                    <button onClick={onClose} className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white/60 font-bold text-sm hover:bg-white/10">
                      Cancelar, es el papel viejo
                    </button>
                  </div>
                </div>
              ) : (
              <div className="p-6">
                <div className="flex flex-col items-center text-center gap-2 mb-4">
                  <div className="h-14 w-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <HiExclamation className="text-3xl" />
                  </div>
                  <div className="text-lg font-bold text-white">El dato no coincide</div>
                  <div className="text-[11px] text-white/40">{idxInc + 1} de {inconsistencias.length}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 divide-y divide-white/5 mb-4">
                  <div className="px-4 py-3">
                    <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{incActual.label} en el PDF</div>
                    <div className="text-sm font-bold text-rose-300">{incActual.valorPdf}</div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{incActual.label} en la póliza</div>
                    <div className="text-sm font-bold text-sky-300">{incActual.valorPol}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button onClick={() => resolver(false)} className="w-full h-11 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-200 font-bold text-sm hover:bg-sky-500/25">
                    Dejar la de la póliza
                  </button>
                  <button onClick={() => resolver(true)} className="w-full h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 font-bold text-sm hover:bg-amber-500/25">
                    Usar la del PDF
                  </button>
                  <button onClick={onClose} className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white/60 font-bold text-sm hover:bg-white/10">
                    Cancelar, me equivoqué de papel
                  </button>
                </div>
              </div>
              )
            ) : (
              <>
                <div className="p-5 space-y-3">
                  {SLOTS.map((s) => (
                    <SlotPdf key={s.key} slot={s} archivo={files[s.key]} onPick={(f) => pick(s.key, f)} />
                  ))}
                  {!files.CUPONERA && (
                    <div className="rounded-2xl bg-black/40 border border-white/5 p-4">
                      <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">
                        Fecha de la 1ª cuota (sin cuponera)
                      </label>
                      <input
                        type="date"
                        value={fechaInicial}
                        onChange={(e) => setFechaInicial(e.target.value)}
                        className="mt-2 h-12 w-full rounded-xl bg-black/40 border border-white/10 px-4 text-sm font-bold text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                      <p className="mt-1.5 text-[11px] text-white/40">Las demás cuotas se calculan +1 mes cada una.</p>
                    </div>
                  )}
                  <p className="text-[11px] text-white/40 leading-snug pt-1">
                    La app lee los PDFs y completa sola número y compañía. Si la patente, el DNI o el titular no coinciden, te avisa antes de guardar.
                  </p>
                </div>

                <div className="px-6 py-5 border-t border-white/5 flex justify-end gap-3">
                  <button onClick={onClose} disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-white/5 text-white/60 font-bold text-sm hover:bg-white/10 disabled:opacity-50">Cancelar</button>
                  <button onClick={analizar} disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-400 disabled:opacity-50 inline-flex items-center gap-2">
                    {saving ? (<><div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Procesando…</>) : (<><HiUpload /> Subir y leer</>)}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}