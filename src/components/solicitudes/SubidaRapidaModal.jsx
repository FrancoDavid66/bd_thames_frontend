// src/components/solicitudes/SubidaRapidaModal.jsx
//
// Modal de "Subida rápida": sube uno o varios PDF (póliza / cupones / certificado),
//   1) los LEE con el lector (/polizas/lector-pdf/) para autocompletar el alta, y
//   2) los GUARDA en Cloudinary para dejarlos asociados a la póliza (documentos).
// Al continuar, pasa { ...datosExtraidos, documentos: [...] } al alta.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiUpload, HiDocumentText, HiSparkles, HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import toast from "react-hot-toast";
import { uploadToCloudinary } from "../../utils/cloudinary";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
function authHeaders() {
  const t = localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("jwt");
  return t ? { Authorization: `Bearer ${t}` } : {};
}
function tipoPorNombre(nombre = "") {
  const n = nombre.toLowerCase();
  if (n.includes("cupon")) return "CUPONERA";
  if (n.includes("certificad") || n.includes("constancia")) return "CERTIFICADO";
  if (n.includes("poliza") || n.includes("póliza") || n.includes("equidad")) return "POLIZA";
  return "POLIZA_PDF";
}

function Fila({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[11px] uppercase tracking-widest text-white/35 font-bold shrink-0">{label}</span>
      <span className="text-sm text-white text-right truncate">{value}</span>
    </div>
  );
}

export default function SubidaRapidaModal({ onClose, onContinuar }) {
  const [files, setFiles] = useState([]);
  const [leyendo, setLeyendo] = useState(false);
  const [datos, setDatos] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const [docs, setDocs] = useState([]);

  const onPick = (e) => {
    const arr = Array.from(e.target.files || []);
    setFiles(arr);
    setDatos(null);
    setAvisos([]);
    setDocs([]);
  };

  const procesar = async () => {
    if (!files.length) return toast.error("Elegí al menos un PDF");
    setLeyendo(true);
    try {
      // 1) Leer con el lector
      const fd = new FormData();
      files.forEach((f) => fd.append("archivos", f));
      const res = await fetch(`${API_BASE}/polizas/lector-pdf/`, { method: "POST", headers: authHeaders(), body: fd });
      let json = {};
      try { json = await res.json(); } catch {}
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo leer el PDF");
      setDatos(json.datos || {});
      setAvisos(json.avisos || []);

      // 2) Subir cada PDF a Cloudinary (para guardarlo en la póliza)
      const subidos = [];
      for (const f of files) {
        try {
          const up = await uploadToCloudinary(f, "rc-admin/polizas/documentos");
          subidos.push({
            tipo: tipoPorNombre(f.name),
            url: up.secure_url,
            public_id: up.public_id,
            nombre: f.name || "documento.pdf",
            mime: up.mime || "application/pdf",
          });
        } catch (e) { /* si uno falla, seguimos con el resto */ }
      }
      setDocs(subidos);
      toast.success(`PDF leído${subidos.length ? ` · ${subidos.length} archivo(s) guardado(s)` : ""}`);
    } catch (e) {
      toast.error(e.message || "Error al procesar el PDF");
    } finally {
      setLeyendo(false);
    }
  };

  const continuar = () => onContinuar?.({ ...(datos || {}), documentos: docs });

  const c = datos?.cliente || {};
  const v = datos?.vehiculo || {};
  const p = datos?.poliza || {};
  const cupones = datos?.cupones || [];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full sm:max-w-lg bg-[#0b0f1e] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh]"
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-sky-500/15 border border-sky-500/20"><HiSparkles className="text-sky-300 text-lg" /></span>
              <h2 className="text-white font-black text-lg">Subida rápida</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/5 text-white/50 hover:text-white transition"><HiX /></button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto space-y-4">
            {/* Selector de archivos */}
            <label className="block cursor-pointer">
              <div className="rounded-2xl border-2 border-dashed border-white/15 hover:border-sky-500/40 bg-white/[0.03] p-6 text-center transition">
                <HiUpload className="mx-auto text-3xl text-white/30 mb-2" />
                <p className="text-sm text-white/70 font-bold">Elegí los PDF (póliza, cupones, certificado)</p>
                <p className="text-[11px] text-white/35 mt-1">Podés subir varios a la vez</p>
              </div>
              <input type="file" accept="application/pdf" multiple className="hidden" onChange={onPick} />
            </label>

            {files.length > 0 && (
              <div className="space-y-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-white/70 bg-white/5 rounded-xl px-3 py-2">
                    <HiDocumentText className="text-sky-300 shrink-0" /> <span className="truncate">{f.name}</span>
                  </div>
                ))}
              </div>
            )}

            {!datos && (
              <button
                onClick={procesar} disabled={leyendo || !files.length}
                className="w-full py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black uppercase text-xs tracking-wider shadow-lg disabled:opacity-40 transition active:scale-95"
              >
                {leyendo ? "Leyendo y guardando…" : "Leer PDF"}
              </button>
            )}

            {/* Avisos */}
            {avisos.length > 0 && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 space-y-1">
                {avisos.map((a, i) => (
                  <p key={i} className="text-[12px] text-amber-200 flex items-start gap-2"><HiExclamationCircle className="shrink-0 mt-0.5" /> {a}</p>
                ))}
              </div>
            )}

            {/* Datos extraídos */}
            {datos && (
              <div className="space-y-3">
                {(c.nombre || c.apellido || c.dni) && (
                  <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-sky-300 mb-1">Cliente</p>
                    <Fila label="Nombre" value={[c.apellido, c.nombre].filter(Boolean).join(", ")} />
                    <Fila label="DNI/CUIT" value={c.dni} />
                    <Fila label="Dirección" value={c.direccion} />
                    <Fila label="Localidad" value={c.localidad} />
                  </div>
                )}
                {(v.marca_modelo || v.patente) && (
                  <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-violet-300 mb-1">Vehículo</p>
                    <Fila label="Vehículo" value={v.marca_modelo} />
                    <Fila label="Patente" value={v.patente} />
                    <Fila label="Año" value={v.anio} />
                    <Fila label="Tipo" value={v.tipo} />
                  </div>
                )}
                {(p.numero || p.compania) && (
                  <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-emerald-300 mb-1">Póliza</p>
                    <Fila label="Compañía" value={p.compania} />
                    <Fila label="N° Póliza" value={p.numero} />
                  </div>
                )}
                {cupones.length > 0 && (
                  <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-amber-300 mb-1">Cupones ({cupones.length})</p>
                    {cupones.slice(0, 3).map((cu, i) => (
                      <Fila key={i} label={`Cuota ${cu.numero || i + 1}`} value={`${cu.vencimiento || ""} · ${cu.importe || ""}`} />
                    ))}
                    {cupones.length > 3 && <p className="text-[11px] text-white/30 mt-1">…y {cupones.length - 3} más</p>}
                  </div>
                )}
                {docs.length > 0 && (
                  <p className="text-[12px] text-emerald-300 flex items-center gap-2"><HiCheckCircle /> {docs.length} archivo(s) guardado(s) en la póliza</p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {datos && (
            <div className="p-4 border-t border-white/10 shrink-0">
              <button
                onClick={continuar}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <HiSparkles /> Continuar al alta
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}