// src/components/gruas/SolicitarGruaModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX, HiCheckCircle, HiExclamationCircle, HiCamera, HiUpload, HiTrash,
  HiArrowRight, HiChevronLeft, HiSearch
} from "react-icons/hi";
import GruasAPI from "../../api/gruas";

/* ================== Utils ================== */
const R = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;
const normalize = (res) => {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object") {
    for (const k of ["results", "items", "data", "rows"]) if (Array.isArray(res[k])) return res[k];
  }
  return [];
};
function haversineM(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function parseLatLon(str) {
  if (!str || typeof str !== "string") return null;
  const parts = str.split(",");
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0].trim());
  const lon = parseFloat(parts[1].trim());
  if (!isFinite(lat) || !isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}
function extractCoordsFromText(str) {
  if (!str) return null;
  const direct = parseLatLon(str);
  if (direct) return direct;
  try {
    const u = new URL(str.startsWith("http") ? str : `https://${str}`);
    const qp = u.searchParams.get("q") || u.searchParams.get("query") || u.searchParams.get("ll");
    if (qp) {
      const m = qp.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
      if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
    }
  } catch {}
  let m = str.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:[,/]|$)/);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
  m = str.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
  m = str.match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/);
  if (m) return { lat: parseFloat(m[2]), lon: parseFloat(m[1]) };
  return null;
}

/* ================== Tokens (dark + color) ================== */
const CARD =
  "relative w-full md:max-w-4xl md:mx-auto md:my-10 md:rounded-3xl " +
  "bg-gradient-to-b from-[#273B59] to-[#1B2B44] text-white ring-1 ring-white/10 shadow-2xl overflow-hidden";
const SECTION = "px-5";
const DIVIDER = "border-b border-white/10";
const FIELD =
  "w-full h-11 px-4 rounded-xl bg-white/10 placeholder-white/60 " +
  "border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 text-white";
const SELECT = FIELD + " appearance-none";
const CHIP = "inline-flex items-center gap-2 h-9 px-3 rounded-xl text-sm ring-1";

const BTN = {
  base: "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
  primary: "bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-400 hover:from-sky-300 hover:via-indigo-300 hover:to-fuchsia-300 text-slate-900 ring-1 ring-white/20 shadow-lg",
  info: "bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 ring-1 ring-sky-400/30",
  danger: "bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 ring-1 ring-rose-400/30",
};
const tap = { scale: 0.98 }, hover = { scale: 1.02 }, spring = { type: "spring", stiffness: 380, damping: 22 };

/* ================== Subcomponentes ================== */
function BadgeOK({ label, ok }) {
  return (
    <motion.div
      initial={{ opacity: 0.9 }} animate={{ opacity: 1 }}
      className={`rounded-xl border px-3 py-2 flex items-center gap-2 ${
        ok ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-200"
           : "bg-rose-500/15 border-rose-400/30 text-rose-200"
      }`}
    >
      <span className="grid place-content-center">
        {ok ? <HiCheckCircle /> : <HiExclamationCircle />}
      </span>
      <span className="text-sm">{label}</span>
    </motion.div>
  );
}

function CardFoto({ tipo, data, onFile, onRemove }) {
  const fileRef = useRef(null);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-3"
    >
      <div className="text-white/90 text-sm mb-2">{tipo.replace("_"," ")}</div>
      {data?.url ? (
        <div className="space-y-2">
          <img src={data.url} alt={tipo} className="w-full aspect-video object-cover rounded-xl ring-1 ring-white/10" />
          <div className="flex gap-2">
            <motion.button
              className={`${BTN.base} ${BTN.info} h-10 px-3`}
              onClick={()=>fileRef.current?.click()}
              whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} transition={spring}
            >
              <HiUpload className="inline -mt-0.5" /> Reemplazar
            </motion.button>
            <motion.button
              className={`${BTN.base} ${BTN.danger} h-10 px-3`}
              onClick={()=>onRemove(tipo)}
              whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} transition={spring}
            >
              <HiTrash className="inline -mt-0.5" /> Quitar
            </motion.button>
          </div>
        </div>
      ) : (
        <motion.button
          onClick={()=>fileRef.current?.click()}
          className="w-full aspect-video grid place-content-center rounded-xl border border-dashed border-white/20 hover:border-white/35 text-white/90"
          whileTap={{ scale: 0.99 }} whileHover={{ scale: 1.01 }} transition={spring}
        >
          <HiCamera className="mx-auto mb-1" /> Subir foto
        </motion.button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e)=>onFile(tipo, e.target.files?.[0])}
      />
    </motion.div>
  );
}

/* ================== Componente principal ================== */
export default function SolicitarGruaModal({
  isOpen = false,
  onClose,
  polizaId: polizaIdProp,   // puede venir de la pantalla de pólizas; si no, se busca
  asegurado = null,
  vehiculo = null,
  onCreated,
}) {
  const [step, setStep] = useState(1);

  // ---- Póliza (puede venir por prop o buscarse) ----
  const [polizaId, setPolizaId] = useState(polizaIdProp ?? null);
  const [searchQ, setSearchQ] = useState("");
  const [foundPolizas, setFoundPolizas] = useState([]);
  useEffect(() => { setPolizaId(polizaIdProp ?? null); }, [polizaIdProp]);

  async function buscarPolizas(q) {
    if (!q || q.trim().length < 2) { setFoundPolizas([]); return; }
    try {
      const res =
        await (GruasAPI?.buscarPolizasConGrua?.(q) ??
               GruasAPI?.buscarPolizas?.(q) ??
               GruasAPI?.searchPolizas?.(q));
      setFoundPolizas(normalize(res));
    } catch {
      setFoundPolizas([]);
    }
  }
  useEffect(() => { const t = setTimeout(()=>buscarPolizas(searchQ), 350); return ()=>clearTimeout(t); }, [searchQ]);

  // ---- Verificación de póliza ----
  const [verifLoading, setVerifLoading] = useState(false);
  const [estadoPoliza, setEstadoPoliza] = useState(null);
  async function verificarPoliza() {
    if (!polizaId) return;
    setVerifLoading(true);
    try {
      const resp = GruasAPI?.estadoPoliza
        ? await GruasAPI.estadoPoliza(polizaId)
        : { carencia_ok: true, pagos_ok: true, suspendida: false, mensajes: [] };
      setEstadoPoliza(resp);
    } catch (e) {
      setEstadoPoliza({
        carencia_ok: false, pagos_ok: false, suspendida: true,
        mensajes: [e?.message || "Error verificando póliza"],
      });
    } finally { setVerifLoading(false); }
  }

  // ---- Fotos obligatorias ----
  const tipos = ["FRENTE","TRASERA","LATERAL_DER","LATERAL_IZQ"];
  const [fotos, setFotos] = useState({ FRENTE:null, TRASERA:null, LATERAL_DER:null, LATERAL_IZQ:null });
  function onFile(tipo, file) { if (!file) return; const url = URL.createObjectURL(file); setFotos(s => ({...s, [tipo]: { file, url }})); }
  function removeFile(tipo) { setFotos(s => ({...s, [tipo]: null})); }
  const fotosOK = tipos.every(t => !!fotos[t]?.file);

  // ---- Ubicación & KM ----
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const coords = useMemo(() => ({ o: parseLatLon(origen), d: parseLatLon(destino) }), [origen, destino]);
  const autodetectKm = useMemo(() => {
    if (!coords.o || !coords.d) return null;
    const dBC = haversineM(coords.o.lat, coords.o.lon, coords.d.lat, coords.d.lon);
    return Math.round((dBC * 2) / 1000);
  }, [coords]);
  const [kmTotal, setKmTotal] = useState("");
  const [kmEdited, setKmEdited] = useState(false);
  useEffect(() => { if (autodetectKm !== null && !kmEdited) setKmTotal(String(autodetectKm)); }, [autodetectKm, kmEdited]);

  // ---- Proveedor (solo WhatsApp) ----
  const [proveedores, setProveedores] = useState([]);
  const [proveedorId, setProveedorId] = useState(null);
  const [destinoEnvio, setDestinoEnvio] = useState(""); // se autocompleta con proveedor
  useEffect(() => {
    (async () => {
      try {
        const res = await (GruasAPI?.getProveedores?.() ?? GruasAPI?.listarProveedores?.());
        setProveedores(normalize(res));
      } catch { setProveedores([]); }
    })();
  }, []);
  useEffect(() => {
    const p = proveedores.find((x) => String(x.id) === String(proveedorId));
    if (p) {
      const tel = p?.whatsapp || p?.telefono || p?.telefono_contacto || "";
      setDestinoEnvio(tel || "");
    }
  }, [proveedorId, proveedores]);

  // ---- Crear + enviar ----
  const [saving, setSaving] = useState(false);
  async function crearYEnviar() {
    setSaving(true);
    try {
      if (!polizaId) throw new Error("Seleccioná una póliza con grúa");
      if (!proveedorId) throw new Error("Elegí un proveedor");
      if (!destinoEnvio) throw new Error("Falta el número de WhatsApp del proveedor");

      const payload = {
        poliza_id: polizaId,
        asegurado, vehiculo,
        origen, destino,
        km_total: Number(kmTotal)||0,
        observaciones: "", // opcional: podés sumar un textarea si querés
        fotos_tipos: tipos.filter(t => !!fotos[t]),
        proveedor_id: proveedorId,
        proveedor_tel: destinoEnvio,
        canal: "whatsapp",
      };

      let solicitud = GruasAPI?.crearSolicitud
        ? await GruasAPI.crearSolicitud(payload)
        : { id: Math.floor(Math.random()*1e7), ...payload };

      if (GruasAPI?.subirFotosSolicitud && solicitud?.id) {
        const fd = new FormData();
        tipos.forEach(t => { if (fotos[t]?.file) { fd.append("fotos", fotos[t].file, `${t}.jpg`); fd.append("tipos", t); }});
        try { await GruasAPI.subirFotosSolicitud(solicitud.id, fd); } catch {}
      }

      if (solicitud?.id && GruasAPI?.enviarWhatsapp) {
        await GruasAPI.enviarWhatsapp(solicitud.id, { to: destinoEnvio, mensaje: "" });
      }

      onCreated?.(solicitud);
      onClose?.();
    } catch (e) {
      alert(e?.message || "No se pudo crear/enviar la solicitud");
    } finally { setSaving(false); }
  }

  // ---- Helpers ----
  function handleOrigen(v){ const f = extractCoordsFromText(v); setOrigen(f?`${f.lat.toFixed(6)},${f.lon.toFixed(6)}`:v); }
  function handleDestino(v){ const f = extractCoordsFromText(v); setDestino(f?`${f.lat.toFixed(6)},${f.lon.toFixed(6)}`:v); }
  function next(disabled=false){ if(!disabled) setStep(s=>Math.min(4,s+1)); }
  function prev(){ setStep(s=>Math.max(1,s-1)); }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        role="dialog" aria-modal="true" aria-label="Solicitar grúa"
        className={CARD}
      >
        {/* Header */}
        <div className={`${SECTION} py-4 flex items-center gap-3 ${DIVIDER}`}>
          <motion.button
            onClick={step > 1 ? prev : onClose}
            className={`h-9 w-9 grid place-content-center rounded-full ${BTN.info}`}
            whileTap={tap} whileHover={hover} transition={spring}
            title={step>1 ? "Volver" : "Cerrar"}
          >
            {step>1 ? <HiChevronLeft /> : <HiX />}
          </motion.button>
          <h2 className="text-xl font-extrabold tracking-wide">Solicitar grúa</h2>
          <span className={`${CHIP} ml-auto bg-emerald-500/15 text-emerald-200 ring-emerald-400/30`}>WhatsApp</span>
        </div>

        {/* Body */}
        <div className="py-4 max-h-[calc(100dvh-16rem)] overflow-auto">
          <AnimatePresence mode="wait">
            {/* Paso 1: Póliza + verificación */}
            {step===1 && (
              <motion.div key="s1" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={spring}>
                <div className={`${SECTION} pb-4 space-y-4 ${DIVIDER}`}>
                  {!polizaId && (
                    <div>
                      <div className="text-white/90 mb-2 font-medium">Elegí la póliza con grúa</div>
                      <div className="relative">
                        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
                        <input
                          className={`${FIELD} pl-10`}
                          placeholder="Buscar por número, DNI/CUIT, patente…"
                          value={searchQ}
                          onChange={(e)=>setSearchQ(e.target.value)}
                        />
                      </div>
                      {!!foundPolizas.length && (
                        <div className="mt-2 rounded-xl overflow-hidden ring-1 ring-white/10">
                          {foundPolizas.slice(0,6).map((p)=>(
                            <button
                              key={p.id}
                              onClick={()=>{ setPolizaId(p.id); setFoundPolizas([]); }}
                              className="w-full text-left px-4 py-2 bg-white/5 hover:bg-white/10"
                            >
                              <div className="text-sm font-medium">#{p.id} • {p?.asegurado?.nombre || p?.cliente || "Cliente"}</div>
                              <div className="text-xs text-white/70">
                                {p?.patente ? `Patente: ${p.patente}` : ""} {p?.compania ? ` • ${p.compania}` : ""}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="text-white/90">Póliza <b>#{polizaId ?? "—"}</b></div>
                    <motion.button
                      onClick={verificarPoliza}
                      className={`${BTN.base} ${BTN.info} h-10 px-4`}
                      disabled={verifLoading || !polizaId}
                      whileTap={tap} whileHover={hover} transition={spring}
                    >
                      {verifLoading ? "Verificando…" : "Verificar ahora"}
                    </motion.button>
                  </div>

                  {estadoPoliza && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <BadgeOK label="Carencia OK" ok={!!estadoPoliza.carencia_ok}/>
                      <BadgeOK label="Pagos al día" ok={!!estadoPoliza.pagos_ok}/>
                      <BadgeOK label="No suspendida" ok={!estadoPoliza.suspendida}/>
                      {(estadoPoliza.mensajes||[]).length>0 && (
                        <div className="md:col-span-3 rounded-xl border border-amber-400/40 bg-amber-500/15 p-3 text-amber-100 text-sm">
                          {estadoPoliza.mensajes.map((m,i)=><div key={i}>• {m}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Paso 2: Fotos */}
            {step===2 && (
              <motion.div key="s2" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={spring}>
                <div className={`${SECTION} pb-4 space-y-3 ${DIVIDER}`}>
                  <div className="text-white/90">
                    Subí las <b className="text-sky-200">4 fotos obligatorias</b>: FRENTE, TRASERA, LATERAL_DER y LATERAL_IZQ.
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["FRENTE","TRASERA","LATERAL_DER","LATERAL_IZQ"].map((t)=>(
                      <CardFoto key={t} tipo={t} data={fotos[t]} onFile={onFile} onRemove={removeFile}/>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Paso 3: Ubicación & KM */}
            {step===3 && (
              <motion.div key="s3" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={spring}>
                <div className={`${SECTION} pb-4 space-y-4 ${DIVIDER}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="text-sm">
                      Origen
                      <input className={FIELD} placeholder='Dirección, "lat,lon" o URL de Google Maps'
                             value={origen} onChange={(e)=>handleOrigen(e.target.value)} />
                    </label>
                    <label className="text-sm">
                      Destino
                      <input className={FIELD} placeholder='Dirección, "lat,lon" o URL de Google Maps'
                             value={destino} onChange={(e)=>handleDestino(e.target.value)} />
                    </label>
                    <label className="text-sm md:col-span-2">
                      KM ida+vuelta
                      <input
                        type="number" className={FIELD}
                        value={kmTotal}
                        placeholder={autodetectKm!==null ? `Autodetectado: ${autodetectKm} km` : "Ej: 120"}
                        onChange={(e)=>{ setKmTotal(e.target.value); setKmEdited(true); }}
                      />
                      {autodetectKm!==null && (
                        <div className="text-[11px] text-emerald-200 mt-1">Detectado por coordenadas: {autodetectKm} km</div>
                      )}
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Paso 4: Resumen & envío (WhatsApp + proveedor) */}
            {step===4 && (
              <motion.div key="s4" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={spring}>
                <div className={`${SECTION} pb-4 space-y-4 ${DIVIDER}`}>
                  <div className="text-white/90 font-semibold">Resumen</div>
                  <div className="text-white/90 text-sm space-y-1">
                    <div><b>Póliza:</b> #{polizaId || "—"}</div>
                    <div><b>KM totales:</b> {Number(kmTotal)||0} km</div>
                    <div><b>Origen:</b> {origen || "—"}</div>
                    <div><b>Destino:</b> {destino || "—"}</div>
                    <div><b>Fotos:</b> {tipos.filter(t=>!!fotos[t]).join(", ") || "—"}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="text-sm">
                      Proveedor
                      <select
                        className={SELECT}
                        value={proveedorId ?? ""}
                        onChange={(e)=>setProveedorId(e.target.value || null)}
                      >
                        <option value="">Elegir proveedor…</option>
                        {proveedores.map(p => (
                          <option key={p.id} value={p.id}>
                            {p?.nombre || p?.razon_social || `Proveedor #${p.id}`}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-sm">
                      WhatsApp del proveedor
                      <input
                        className={FIELD}
                        placeholder="Ej: +54 9 11 1234-5678"
                        value={destinoEnvio}
                        onChange={(e)=>setDestinoEnvio(e.target.value)}
                      />
                    </label>

                    <div className="text-sm">
                      Canal
                      <div className={`${CHIP} h-11 mt-1 bg-emerald-500/15 text-emerald-200 ring-emerald-400/30`}>
                        WhatsApp
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer / Progreso + CTA */}
        <div className={`${SECTION} py-5 ${DIVIDER}`}>
          <div className="flex items-center justify-between text-white/85 text-sm">
            <span>{step<4 ? "Paso" : "Listo"} <b className="text-white">{step}</b> / 4</span>
            {step===3 && <span className="opacity-85">{Number(kmTotal)>0 ? `${kmTotal} km` : "—"}</span>}
          </div>
        </div>
        <div className={`${SECTION} py-5`}>
          {step < 4 ? (
            <motion.button
              onClick={()=>{
                if (step===1) return next(!polizaId);
                if (step===2) return next(!fotosOK);
                if (step===3) return next(!(Number(kmTotal)>0));
              }}
              disabled={(step===1 && !polizaId) || (step===2 && !fotosOK) || (step===3 && !(Number(kmTotal)>0))}
              className={`${BTN.base} ${BTN.primary} w-full h-12 disabled:opacity-50`}
              whileTap={tap} whileHover={hover} transition={spring}
            >
              Continuar <HiArrowRight />
            </motion.button>
          ) : (
            <motion.button
              onClick={crearYEnviar}
              disabled={saving || !polizaId || !proveedorId || !destinoEnvio}
              className={`${BTN.base} ${BTN.primary} w-full h-12 disabled:opacity-50`}
              whileTap={tap} whileHover={hover} transition={spring}
            >
              {saving ? "Enviando…" : "Finalizar y enviar"}
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
