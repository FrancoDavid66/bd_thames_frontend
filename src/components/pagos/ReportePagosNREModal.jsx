// src/components/pagos/ReportePagosNREModal.jsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { HiX, HiDownload, HiCalendar } from "react-icons/hi";

const BASE_URL = import.meta.env.VITE_API_URL || "/api/";

export default function ReportePagosNREModal({ isOpen, onClose }) {
  const hoy = dayjs().format("YYYY-MM-DD");
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [descargando, setDescargando] = useState(false);

  const handleClose = () => {
    if (descargando) return;
    onClose?.();
  };

  const handleDescargar = async () => {
    if (!desde || !hasta) return;
    setDescargando(true);
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("jwt");
      const res = await axios.get(
        `${BASE_URL.replace(/\/+$/, "")}/cuotas/reporte-nre/`,
        {
          params: { desde, hasta },
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      // Si el backend devolvió un error camuflado de JSON en el blob, lo detectamos
      const ct = String(res.headers?.["content-type"] || "").toLowerCase();
      if (!ct.includes("spreadsheet") && !ct.includes("octet")) {
        const txt = await res.data.text();
        let detail = txt;
        try {
          const j = JSON.parse(txt);
          detail = j.detail || j.error || txt;
        } catch {}
        throw new Error(detail || "El servidor no devolvió un Excel.");
      }

      const filename = `pagos_nre_${desde}_a_${hasta}.xlsx`;
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);

      toast.success("Excel descargado");
    } catch (error) {
      const msg = error?.response?.status === 403
        ? "Solo administradores pueden descargar este reporte."
        : error?.message || "No se pudo descargar el reporte.";
      toast.error(msg);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 px-5 py-5 sm:px-6 sm:py-6 shadow-2xl"
            initial={{ scale: 0.9, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 16 }}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Reporte de pagos NRE</h3>
                <p className="text-xs text-slate-400 mt-0.5">Solo altas nuevas · no incluye renovaciones</p>
              </div>
              <button
                onClick={handleClose}
                disabled={descargando}
                className="h-8 w-8 shrink-0 rounded-lg border flex items-center justify-center text-slate-300 bg-slate-700 hover:bg-slate-600 border-slate-600 cursor-pointer disabled:opacity-50"
              >
                <HiX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <HiCalendar className="w-3.5 h-3.5" /> Desde
                  </label>
                  <input
                    type="date"
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-600 text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <HiCalendar className="w-3.5 h-3.5" /> Hasta
                  </label>
                  <input
                    type="date"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-600 text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs text-indigo-200">
                Columnas: Patente · Tipo · Fecha · Monto Cliente · Costo NRE · Margen.
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={handleClose}
                  disabled={descargando}
                  className="h-10 px-4 rounded-xl border border-slate-600 bg-slate-700 text-sm text-white hover:bg-slate-600 cursor-pointer font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDescargar}
                  disabled={descargando || !desde || !hasta}
                  className="h-10 px-4 rounded-xl border border-transparent bg-indigo-500 text-sm font-bold text-white hover:bg-indigo-400 flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/30 disabled:opacity-50"
                >
                  <HiDownload className="w-4 h-4" />
                  {descargando ? "Descargando..." : "Descargar Excel"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}