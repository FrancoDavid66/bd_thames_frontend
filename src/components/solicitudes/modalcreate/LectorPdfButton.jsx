// src/components/solicitudes/modalcreate/LectorPdfButton.jsx
//
// 🆕 Botón para autocompletar el alta leyendo PDFs (cuponera AMCA, certificado, etc.).
// Sube los archivos al endpoint /api/polizas/lector-pdf/, que devuelve los datos
// extraídos. NO crea nada: solo completa el formulario para que el operador revise.

import { useRef, useState } from "react";
import { HiDocumentText, HiUpload } from "react-icons/hi";
import toast from "react-hot-toast";
import api from "../../../services/api";

export default function LectorPdfButton({ onExtraido }) {
  const inputRef = useRef(null);
  const [cargando, setCargando] = useState(false);

  const handleArchivos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setCargando(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("archivos", f));

      const res = await api.post("/polizas/lector-pdf/", fd);
      const data = res?.data;
      if (!data?.ok) throw new Error("No se pudo leer el PDF.");

      onExtraido?.(data.datos || {});

      const avisos = data.avisos || [];
      if (avisos.length) {
        avisos.forEach((a) => toast(a, { icon: "⚠️", duration: 5000 }));
      } else {
        toast.success("Datos cargados del PDF. Revisalos antes de continuar.");
      }
    } catch (err) {
      console.error("[LectorPdf]", err);
      toast.error("No se pudo leer el PDF. Probá de nuevo.");
    } finally {
      setCargando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
          <HiDocumentText className="text-xl" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-bold text-sm">Autocompletar desde PDF</h4>
          <p className="text-[11px] text-sky-200/70 mt-0.5">
            Subí la cuponera y/o el certificado de la compañía. Leemos los datos y completamos el formulario solo.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={handleArchivos}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={cargando}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-black uppercase text-xs tracking-wider transition-all active:scale-95 disabled:opacity-50"
      >
        {cargando ? "Leyendo PDF..." : (<><HiUpload className="text-base" /> Subir PDF y autocompletar</>)}
      </button>
    </div>
  );
}