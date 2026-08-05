/* src/components/tareas/TareaWizard.jsx
 *
 * Wizard ÚNICO que reemplaza los 5 modales viejos:
 *   CompletarDatoClienteModal · CompletarDatosPolizaModal ·
 *   SubirFotosDniModal · SubirFotosVehiculoModal · SubirPolizaSistemaModal
 *
 * Un solo componente que, según `flujo` (item.tipo), muestra los pasos que
 * correspondan. Comparte header, barra de progreso, navegación y footer.
 * Usa la paleta semántica real (surface/card/titulo/marca) — modo claro+oscuro.
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  HiX, HiCheck, HiChevronLeft, HiChevronRight, HiUpload,
  HiCheckCircle, HiExclamation, HiSparkles,
} from "react-icons/hi";

import { UI } from "./tareasUI";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { updateCliente } from "../../store/slices/clientesSlice";
import { updatePoliza } from "../../store/slices/polizasSlice";
import { registrarTareaCompletada } from "../../store/slices/tareasSlice";
import { PolizasAPI } from "../../api/polizas";
import api from "../../services/api";

const LECTOR_PDF_ENDPOINT = "polizas/lector-pdf/";
const TIPOS_FOTO_VEH = ["FRENTE", "PATENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA", "INTERIOR", "EQUIPO_GNC", "OTRA"];
const SLOTS_PDF = [
  { key: "POLIZA", label: "Póliza / frente" },
  { key: "MERCOSUR", label: "Mercosur" },
  { key: "CUPONERA", label: "Cuponera (si es con robo)" },
];

/* ── helpers de comparación (para el flujo subir-poliza) ── */
const fmtFecha = (iso) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  return d && m && y ? `${d}/${m}/${y}` : String(iso);
};
const normPat = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const normDni = (v) => String(v || "").replace(/\D/g, "");
const normNom = (v) =>
  String(v || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
function nombreCoincide(a, b) {
  const pa = normNom(a).split(" ").filter((w) => w.length >= 3);
  const pb = normNom(b).split(" ").filter((w) => w.length >= 3);
  if (!pa.length || !pb.length) return true;
  return pa.some((w) => pb.includes(w));
}

/* ════════════════════════════════════════════════════════════════
 *  Sub-piezas visuales chicas (internas, no se exportan)
 * ════════════════════════════════════════════════════════════════ */

function FotoSlot({ titulo, url, subiendo, onPick, accept = "image/*" }) {
  const ref = useRef(null);
  return (
    <div className={`${UI.card} p-4 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark">{titulo}</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${url ? UI.chipOk : UI.chipPend}`}>
          {url ? <><HiCheckCircle /> Cargado</> : "Pendiente"}
        </span>
      </div>
      {/* El recuadro de imagen queda oscuro a propósito (resalta la foto) */}
      <div className="relative overflow-hidden rounded-xl border-2 border-linea dark:border-linea-dark bg-slate-900 aspect-[3/2] flex items-center justify-center">
        {url
          ? <img src={url} alt={titulo} className="w-full h-full object-cover" />
          : <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Sin imagen</span>}
      </div>
      <button type="button" onClick={() => ref.current?.click()} disabled={subiendo}
        className={`h-11 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest ${url ? UI.btnGhost : UI.btnPrimary}`}>
        {subiendo
          ? <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          : <><HiUpload className="text-sm" /> {url ? "Cambiar" : "Subir"}</>}
      </button>
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) await onPick(f); e.target.value = ""; }} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 *  WIZARD
 * ════════════════════════════════════════════════════════════════ */
export default function TareaWizard({ isOpen, flujo, item, onClose, onSaved }) {
  const dispatch = useDispatch();
  const [paso, setPaso] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hecho, setHecho] = useState(null); // resumen final para la pantalla de éxito

  // Estado compartido de todos los flujos
  const [fNac, setFNac] = useState("");                       // datos-cliente
  const [compania, setCompania] = useState("");               // datos-poliza
  const [numero, setNumero] = useState("");
  const [companias, setCompanias] = useState([]);
  const [dniFrente, setDniFrente] = useState(null);           // fotos-dni
  const [dniDorso, setDniDorso] = useState(null);
  const [upF, setUpF] = useState(false);
  const [upD, setUpD] = useState(false);
  const [tipoVeh, setTipoVeh] = useState("FRENTE");           // fotos-vehiculo
  const [subVeh, setSubVeh] = useState(false);
  const [fotosVeh, setFotosVeh] = useState([]);
  const [filesPdf, setFilesPdf] = useState({ POLIZA: null, MERCOSUR: null, CUPONERA: null }); // subir-poliza
  const [fechaIni, setFechaIni] = useState("");
  const [incs, setIncs] = useState([]);
  const [idxInc, setIdxInc] = useState(0);
  const [correcciones, setCorrecciones] = useState({});
  const [datosLeidos, setDatosLeidos] = useState(null);
  const fileVehRef = useRef(null);

  // Reset al abrir
  useEffect(() => {
    if (!isOpen) return;
    setPaso(0); setSaving(false); setHecho(null);
    setFNac(""); setCompania(item?.compania || ""); setNumero(item?.numero_poliza || "");
    setDniFrente(null); setDniDorso(null); setUpF(false); setUpD(false);
    setTipoVeh("FRENTE"); setSubVeh(false); setFotosVeh([]);
    setFilesPdf({ POLIZA: null, MERCOSUR: null, CUPONERA: null }); setFechaIni("");
    setIncs([]); setIdxInc(0); setCorrecciones({}); setDatosLeidos(null);
  }, [isOpen, item]);

  // Cargar compañías (solo flujo datos-poliza)
  useEffect(() => {
    if (!isOpen || flujo !== "datos-poliza") return;
    api.get("companias/")
      .then((res) => {
        const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setCompanias(arr.filter((c) => c.activa).map((c) => c.nombre));
      })
      .catch(() => {});
  }, [isOpen, flujo]);

  const opcionesComp = useMemo(
    () => Array.from(new Set([item?.compania, ...companias].filter(Boolean))),
    [companias, item?.compania]
  );

  /* ── Config de cada flujo: título, subtítulo y pasos ── */
  const cfg = useMemo(() => {
    const cli = item?.cliente || "";
    const pat = item?.patente && item.patente !== "—" ? ` · ${item.patente}` : "";
    switch (flujo) {
      case "datos-cliente": return { titulo: "Datos del cliente", sub: cli, npasos: 1 };
      case "datos-poliza":  return { titulo: "Datos de la póliza", sub: cli + pat, npasos: 1 };
      case "fotos-dni":     return { titulo: "Fotos del DNI", sub: cli, npasos: 1 };
      case "fotos-vehiculo":return { titulo: "Fotos del vehículo", sub: cli + pat, npasos: 1 };
      case "subir-poliza":  return { titulo: "Subir póliza a sistema", sub: cli + pat, npasos: 1 };
      default:              return { titulo: "Tarea", sub: cli, npasos: 1 };
    }
  }, [flujo, item]);

  /* ════════ Acciones de guardado por flujo ════════ */

  const guardarDatoCliente = async () => {
    if (!fNac) { toast.error("Cargá la fecha de nacimiento"); return; }
    setSaving(true);
    try {
      await dispatch(updateCliente({ id: item.cliente_id, fecha_nacimiento: fNac })).unwrap();
      dispatch(registrarTareaCompletada({ tipo: "datos_cliente", cliente_id: item.cliente_id }));
      setHecho({ titulo: "¡Dato completado!", lineas: ["Fecha de nacimiento guardada."] });
    } catch { toast.error("No se pudo guardar"); }
    finally { setSaving(false); }
  };

  const guardarDatosPoliza = async () => {
    if (!compania.trim()) { toast.error("Elegí la compañía"); return; }
    setSaving(true);
    try {
      const num = numero.trim();
      await dispatch(updatePoliza({
        id: item.poliza_id, compania: compania.trim(),
        numero_poliza: num || null, sin_numero: !num,
      })).unwrap();
      dispatch(registrarTareaCompletada({ tipo: "datos_poliza", poliza_id: item.poliza_id }));
      setHecho({ titulo: "¡Datos completados!", lineas: [`Compañía: ${compania.trim()}`, num ? `N° ${num}` : "Sin número"] });
    } catch { toast.error("No se pudo guardar"); }
    finally { setSaving(false); }
  };

  const subirFotoDni = async (file, field, setUrl, setUp) => {
    if (!(file.type || "").toLowerCase().startsWith("image/")) { toast.error("Solo imágenes"); return; }
    setUp(true);
    try {
      const folder = `de-thames/clientes/${item.cliente_id}/documentacion`;
      const { secure_url } = await uploadToCloudinary(file, folder);
      if (!secure_url) throw new Error("Sin URL");
      await dispatch(updateCliente({ id: item.cliente_id, [field]: secure_url })).unwrap();
      setUrl(secure_url);
      toast.success("Foto subida ✅");
    } catch (e) { toast.error(e?.message || "No se pudo subir"); }
    finally { setUp(false); }
  };

  const finDni = () => {
    dispatch(registrarTareaCompletada({ tipo: "fotos_dni", cliente_id: item.cliente_id }));
    setHecho({ titulo: "¡DNI cargado!", lineas: ["Frente y dorso subidos."] });
  };

  const subirFotoVeh = async (file) => {
    if (!file) return;
    if (!(file.type || "").toLowerCase().startsWith("image/")) { toast.error("Solo imágenes"); return; }
    setSubVeh(true);
    try {
      const { secure_url, public_id } = await uploadToCloudinary(file, "rc-admin/polizas/vehiculos");
      await PolizasAPI.crearFotoVehiculo({
        poliza: Number(item.poliza_id), tipo: tipoVeh, url: secure_url, public_id, origen: "OFICINA",
      });
      setFotosVeh((p) => [...p, { url: secure_url, tipo: tipoVeh }]);
      toast.success("Foto subida ✅");
    } catch (e) { toast.error(e?.message || "No se pudo subir"); }
    finally { setSubVeh(false); if (fileVehRef.current) fileVehRef.current.value = ""; }
  };

  const finVeh = () => {
    dispatch(registrarTareaCompletada({ tipo: "fotos_poliza", poliza_id: item.poliza_id }));
    setHecho({ titulo: "¡Fotos cargadas!", lineas: [`${fotosVeh.length} foto(s) del vehículo.`] });
  };

  /* ── Flujo subir-poliza (lee PDF, detecta inconsistencias, guarda) ── */
  const pickPdf = (key, file) => {
    if ((file.type || "").toLowerCase() !== "application/pdf") { toast.error("Tiene que ser un PDF"); return; }
    setFilesPdf((s) => ({ ...s, [key]: file }));
  };
  const seleccionadosPdf = () => SLOTS_PDF.map((s) => ({ tipo: s.key, file: filesPdf[s.key] })).filter((x) => x.file);

  const analizarPdf = async () => {
    const archivos = seleccionadosPdf();
    if (!archivos.length) { toast.error("Subí al menos un papel"); return; }
    setSaving(true);
    try {
      let d = { numero: "", compania: "", cupones: [], _patente: "", _dni: "", _nombre: "", _apellido: "", _vig_hasta: "" };
      try {
        const fd = new FormData();
        archivos.forEach((x) => fd.append("archivos", x.file));
        const lectura = await api.post(LECTOR_PDF_ENDPOINT, fd, { headers: { "Content-Type": "multipart/form-data" } });
        const datos = lectura?.data?.datos || {};
        d = {
          numero: datos?.poliza?.numero || "", compania: datos?.poliza?.compania || "",
          cupones: datos?.cupones || [], _patente: datos?.vehiculo?.patente || "",
          _dni: datos?.cliente?.dni || "", _nombre: datos?.cliente?.nombre || "",
          _apellido: datos?.cliente?.apellido || "", _vig_hasta: datos?.poliza?.vigencia_hasta || "",
        };
      } catch {
        toast("No se pudieron leer los datos, pero se guardan los papeles.", { icon: "⚠️" });
        await guardarFinalPdf(d, {}); return;
      }
      const patPol = item.patente_real || (item.patente !== "—" ? item.patente : "");
      const list = [];
      if (d._patente && patPol && normPat(d._patente) !== normPat(patPol))
        list.push({ campo: "patente", label: "Patente", valorPdf: d._patente, valorPol: patPol, correccion: { patente: d._patente } });
      if (d._dni && item.cliente_dni && normDni(d._dni) !== normDni(item.cliente_dni))
        list.push({ campo: "dni", label: "DNI", valorPdf: d._dni, valorPol: item.cliente_dni, correccion: { dni: d._dni } });
      const nomPdf = `${d._apellido} ${d._nombre}`.trim();
      if (nomPdf && item.cliente && item.cliente !== "—" && !nombreCoincide(nomPdf, item.cliente))
        list.push({ campo: "nombre", label: "Titular", valorPdf: nomPdf, valorPol: item.cliente, correccion: { nombre: d._nombre, apellido: d._apellido } });
      const hoyStr = new Date().toISOString().slice(0, 10);
      if (d._vig_hasta && d._vig_hasta < hoyStr)
        list.unshift({ campo: "vigencia", label: "Vigencia", valorPdf: d._vig_hasta, vieja: true });

      if (list.length) {
        setDatosLeidos(d); setIncs(list); setIdxInc(0); setCorrecciones({});
        setPaso(1); setSaving(false); // pasamos al paso de revisión
      } else {
        await guardarFinalPdf(d, {});
      }
    } catch (e) { toast.error(e?.message || "No se pudo procesar"); setSaving(false); }
  };

  const resolverInc = (usarPdf) => {
    const inc = incs[idxInc];
    const nuevas = usarPdf ? { ...correcciones, ...inc.correccion } : correcciones;
    setCorrecciones(nuevas);
    if (idxInc + 1 < incs.length) { setIdxInc(idxInc + 1); }
    else { setIncs([]); setPaso(0); setSaving(true); guardarFinalPdf(datosLeidos, nuevas); }
  };

  const guardarFinalPdf = async (datos, corr) => {
    try {
      const archivos = seleccionadosPdf();
      const documentos = [];
      for (const x of archivos) {
        const { secure_url, public_id } = await uploadToCloudinary(x.file, "de-thames/polizas/documentos");
        if (!secure_url) throw new Error("Sin URL de Cloudinary");
        documentos.push({ tipo: x.tipo, url: secure_url, public_id: public_id || "", nombre: x.file.name, mime: x.file.type });
      }
      const body = {
        poliza_id: item.poliza_id, documentos,
        datos: { numero: datos.numero, compania: datos.compania, cupones: datos.cupones },
        correcciones: corr || {},
      };
      if (!filesPdf.CUPONERA && fechaIni) body.fecha_inicial_cuotas = fechaIni;
      const res = await api.post("tareas/subir-papeles-sistema/", body);
      const r = res?.data?.resumen || { documentos_guardados: documentos.length, autocompletado: [], cupones_actualizados: 0, cuotas_actualizadas: 0 };
      const lineas = [`${r.documentos_guardados} archivo(s) guardado(s).`];
      if (r.autocompletado?.length) lineas.push(`Autocompletado: ${r.autocompletado.join(", ")}.`);
      if (r.cupones_actualizados) lineas.push(`${r.cupones_actualizados} cupón(es) de robo.`);
      if (r.cuotas_actualizadas) lineas.push(`${r.cuotas_actualizadas} cuota(s) reprogramada(s).`);
      setHecho({ titulo: "¡Papeles cargados!", lineas });
    } catch (e) { toast.error(e?.message || "No se pudo cargar"); }
    finally { setSaving(false); }
  };

  /* ════════ Contenido de cada paso según el flujo ════════ */
  const incActual = incs[idxInc] || null;

  const contenido = () => {
    if (flujo === "datos-cliente") return (
      <div className="p-6">
        <label className={UI.label}>Fecha de nacimiento</label>
        <input type="date" value={fNac} onChange={(e) => setFNac(e.target.value)} className={`mt-2 ${UI.input}`} />
      </div>
    );

    if (flujo === "datos-poliza") return (
      <div className="p-6 space-y-4">
        <div>
          <label className={UI.label}>Compañía</label>
          <select value={compania} onChange={(e) => setCompania(e.target.value)} className={`mt-2 ${UI.input} appearance-none dark:[color-scheme:dark]`}>
            <option value="">— Seleccionar —</option>
            {opcionesComp.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className={UI.label}>Número de póliza</label>
          <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ej: 123456" className={`mt-2 ${UI.input}`} />
        </div>
      </div>
    );

    if (flujo === "fotos-dni") return (
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FotoSlot titulo="DNI · Frente" url={dniFrente} subiendo={upF}
          onPick={(f) => subirFotoDni(f, "archivo_dni_frente", setDniFrente, setUpF)} />
        <FotoSlot titulo="DNI · Dorso" url={dniDorso} subiendo={upD}
          onPick={(f) => subirFotoDni(f, "archivo_dni_dorso", setDniDorso, setUpD)} />
      </div>
    );

    if (flujo === "fotos-vehiculo") return (
      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={UI.label}>Tipo de foto</label>
            <select value={tipoVeh} onChange={(e) => setTipoVeh(e.target.value)} className={`mt-2 ${UI.input} appearance-none dark:[color-scheme:dark]`}>
              {TIPOS_FOTO_VEH.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => fileVehRef.current?.click()} disabled={subVeh}
              className={`h-12 px-5 rounded-xl inline-flex items-center gap-2 text-sm ${UI.btnPrimary}`}>
              {subVeh ? <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><HiUpload /> Subir</>}
            </button>
          </div>
        </div>
        {fotosVeh.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {fotosVeh.map((f, i) => (
              <div key={i} className="rounded-lg overflow-hidden border-2 border-linea dark:border-linea-dark bg-slate-900 aspect-[3/2]">
                <img src={f.url} alt={f.tipo} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
        <input ref={fileVehRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) subirFotoVeh(f); }} />
      </div>
    );

    if (flujo === "subir-poliza") {
      // Paso 1: revisión de inconsistencias
      if (paso === 1 && incActual) {
        if (incActual.campo === "vigencia") return (
          <div className="p-6">
            <div className="flex flex-col items-center text-center gap-2 mb-4">
              <div className="h-14 w-14 rounded-full bg-tarjeta/15 border-2 border-tarjeta/30 flex items-center justify-center text-[#d97706] dark:text-tarjeta-claro"><HiExclamation className="text-3xl" /></div>
              <div className="text-lg font-bold text-titulo dark:text-titulo-dark">¿Es el papel correcto?</div>
              <div className="text-[11px] text-suave dark:text-suave-dark">{idxInc + 1} de {incs.length}</div>
            </div>
            <div className="rounded-2xl border-2 border-tarjeta/25 bg-tarjeta/10 p-4 mb-4">
              <p className="text-[13px] leading-snug text-[#d97706] dark:text-tarjeta-claro">
                La vigencia termina el <b>{fmtFecha(incActual.valorPdf)}</b>, una fecha que ya pasó.
                Puede ser el papel de la <b>póliza anterior</b>, no de la renovación.
              </p>
            </div>
            <div className="space-y-2">
              <button onClick={() => resolverInc(false)} className={`w-full h-11 rounded-xl text-sm ${UI.btnPrimary}`}>Está bien, continuar</button>
              <button onClick={onClose} className={`w-full h-11 rounded-xl text-sm ${UI.btnGhost}`}>Cancelar, es el viejo</button>
            </div>
          </div>
        );
        return (
          <div className="p-6">
            <div className="flex flex-col items-center text-center gap-2 mb-4">
              <div className="h-14 w-14 rounded-full bg-marca/10 border-2 border-marca/30 flex items-center justify-center text-marca"><HiExclamation className="text-3xl" /></div>
              <div className="text-lg font-bold text-titulo dark:text-titulo-dark">El dato no coincide</div>
              <div className="text-[11px] text-suave dark:text-suave-dark">{idxInc + 1} de {incs.length}</div>
            </div>
            <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark divide-y-2 divide-linea dark:divide-linea-dark mb-4">
              <div className="px-4 py-3">
                <div className="text-[10px] uppercase tracking-widest text-suave dark:text-suave-dark mb-1">{incActual.label} en el PDF</div>
                <div className="text-sm font-bold text-marca">{incActual.valorPdf}</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-[10px] uppercase tracking-widest text-suave dark:text-suave-dark mb-1">{incActual.label} en la póliza</div>
                <div className="text-sm font-bold text-titulo dark:text-titulo-dark">{incActual.valorPol}</div>
              </div>
            </div>
            <div className="space-y-2">
              <button onClick={() => resolverInc(false)} className={`w-full h-11 rounded-xl text-sm ${UI.btnGhost}`}>Dejar la de la póliza</button>
              <button onClick={() => resolverInc(true)} className={`w-full h-11 rounded-xl text-sm ${UI.btnPrimary}`}>Usar la del PDF</button>
              <button onClick={onClose} className={`w-full h-11 rounded-xl text-sm ${UI.btnGhost}`}>Cancelar</button>
            </div>
          </div>
        );
      }
      // Paso 0: elegir PDFs
      return (
        <div className="p-5 space-y-3">
          {SLOTS_PDF.map((s) => (
            <div key={s.key} className={`${UI.card} p-4 flex items-center gap-3`}>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-titulo dark:text-titulo-dark">{s.label}</div>
                <div className="text-[11px] text-suave dark:text-suave-dark truncate">{filesPdf[s.key] ? filesPdf[s.key].name : "Sin archivo"}</div>
              </div>
              <label className={`h-10 px-4 rounded-xl inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest cursor-pointer ${filesPdf[s.key] ? UI.btnGhost : UI.btnPrimary}`}>
                <HiUpload className="text-sm" /> {filesPdf[s.key] ? "Cambiar" : "Elegir"}
                <input type="file" accept="application/pdf" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) pickPdf(s.key, f); e.target.value = ""; }} />
              </label>
            </div>
          ))}
          {!filesPdf.CUPONERA && (
            <div className={`${UI.card} p-4`}>
              <label className={UI.label}>Fecha de la 1ª cuota (sin cuponera)</label>
              <input type="date" value={fechaIni} onChange={(e) => setFechaIni(e.target.value)} className={`mt-2 ${UI.input}`} />
              <p className="mt-1.5 text-[11px] text-suave dark:text-suave-dark">Las demás cuotas se calculan +1 mes cada una.</p>
            </div>
          )}
          <p className="text-[11px] text-suave dark:text-suave-dark leading-snug pt-1">
            La app lee los PDFs y completa número y compañía. Si algo no coincide, te avisa antes de guardar.
          </p>
        </div>
      );
    }

    return null;
  };

  /* Acción del botón principal según flujo/paso */
  const accionPrincipal = () => {
    switch (flujo) {
      case "datos-cliente": return { label: "Guardar", fn: guardarDatoCliente, disabled: saving };
      case "datos-poliza":  return { label: "Guardar", fn: guardarDatosPoliza, disabled: saving };
      case "fotos-dni":     return { label: "Listo", fn: finDni, disabled: !(dniFrente && dniDorso) };
      case "fotos-vehiculo":return { label: "Listo", fn: finVeh, disabled: fotosVeh.length === 0 };
      case "subir-poliza":  return { label: "Subir y leer", fn: analizarPdf, disabled: saving, icon: <HiUpload /> };
      default:              return { label: "Listo", fn: onClose, disabled: false };
    }
  };
  const acc = accionPrincipal();
  const enRevision = flujo === "subir-poliza" && paso === 1; // el paso de revisión tiene sus propios botones

  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl ${UI.sheet} shadow-2xl overflow-hidden`}
            initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }} onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-linea dark:border-linea-dark">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-titulo dark:text-titulo-dark truncate">{cfg.titulo}</h2>
                {cfg.sub ? <p className="text-[11px] text-suave dark:text-suave-dark truncate">{cfg.sub}</p> : null}
              </div>
              <button onClick={onClose} className="shrink-0 p-2 rounded-lg bg-titulo/5 dark:bg-white/5 text-suave dark:text-suave-dark hover:opacity-70"><HiX className="text-xl" /></button>
            </div>

            {/* Cuerpo: éxito o contenido del paso */}
            <AnimatePresence mode="wait">
              {hecho ? (
                <motion.div key="exito" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-6">
                  <div className="flex flex-col items-center text-center gap-3 py-4">
                    <div className="h-16 w-16 rounded-full bg-ingreso/10 border-2 border-ingreso/20 flex items-center justify-center text-ingreso"><HiCheckCircle className="text-4xl" /></div>
                    <div className="text-xl font-bold text-titulo dark:text-titulo-dark">{hecho.titulo}</div>
                    <div className="text-sm text-suave dark:text-suave-dark space-y-1">
                      {hecho.lineas.map((l, i) => (
                        <div key={i} className={l.startsWith("Autocompletado") ? "inline-flex items-center gap-1 text-marca" : ""}>
                          {l.startsWith("Autocompletado") && <HiSparkles />} {l}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => onSaved?.()} className={`mt-4 w-full h-12 rounded-xl text-sm ${UI.btnPrimary}`}>Listo</button>
                </motion.div>
              ) : (
                <motion.div key={`paso-${flujo}-${paso}`} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  {contenido()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer (no se muestra en éxito ni en revisión, que traen sus botones) */}
            {!hecho && !enRevision && (
              <div className="px-6 py-5 border-t-2 border-linea dark:border-linea-dark flex justify-end gap-3">
                <button onClick={onClose} disabled={saving} className={`px-6 py-2.5 rounded-xl text-sm ${UI.btnGhost}`}>Cancelar</button>
                <button onClick={acc.fn} disabled={acc.disabled} className={`px-6 py-2.5 rounded-xl text-sm inline-flex items-center gap-2 ${UI.btnPrimary}`}>
                  {saving
                    ? <><div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Procesando…</>
                    : <>{acc.icon || <HiCheck />} {acc.label}</>}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
