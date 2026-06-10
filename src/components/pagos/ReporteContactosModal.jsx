// src/components/pagos/ReporteContactosModal.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiDocumentText, HiTable, HiOfficeBuilding, HiDownload } from "react-icons/hi";
import { toast } from "react-toastify";
import api from "../../services/api";

const DELTAS_INFO = [
  { delta: -7, label: "Vencidas hace 7 días",  color: "text-red-300",     bg: "bg-red-500/10  border-red-500/30"     },
  { delta: -3, label: "Vencidas hace 3 días",  color: "text-rose-300",    bg: "bg-rose-500/10 border-rose-500/30"    },
  { delta:  0, label: "Vencen HOY",            color: "text-amber-300",   bg: "bg-amber-500/10 border-amber-500/30"  },
  { delta:  3, label: "Vencen en 3 días",      color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/30" },
  { delta:  7, label: "Vencen en 7 días",      color: "text-sky-300",     bg: "bg-sky-500/10 border-sky-500/30"      },
];

export default function ReporteContactosModal({
  isOpen,
  onClose,
  isWebAdmin = false,
  userOficina = null,
}) {
  // "" = Todas las oficinas (solo para admin)
  const [oficina, setOficina]         = useState(isWebAdmin ? "" : (userOficina ? String(userOficina) : ""));
  const [oficinas, setOficinas]       = useState([]);   // 🆕 lista dinámica desde el backend
  const [loadingOfis, setLoadingOfis] = useState(false);
  const [downloading, setDownloading] = useState(null); // "pdf" | "excel" | null

  // 🏢 Carga de oficinas reales (solo si es admin y el modal está abierto)
  useEffect(() => {
    if (!isOpen || !isWebAdmin) return;

    let cancelado = false;
    const cargarOficinas = async () => {
      setLoadingOfis(true);
      try {
        const res = await api.get("usuarios/oficinas/");
        const data = res?.data;
        const arr = Array.isArray(data?.results) ? data.results
                  : Array.isArray(data)          ? data
                  : [];
        if (!cancelado) setOficinas(arr);
      } catch (err) {
        console.error("Error cargando oficinas:", err);
        if (!cancelado) {
          toast.error("No se pudieron cargar las oficinas.");
          setOficinas([]);
        }
      } finally {
        if (!cancelado) setLoadingOfis(false);
      }
    };

    cargarOficinas();
    return () => { cancelado = true; };
  }, [isOpen, isWebAdmin]);

  if (!isOpen) return null;

  const handleDescargar = async (formato) => {
    setDownloading(formato);
    try {
      const params = { formato };
      if (oficina) params.oficina = oficina;

      const response = await api.get("notificaciones/cuotas/reporte-contactos/", {
        params,
        responseType: "blob",
      });

      // Generar nombre de archivo
      const hoy = new Date().toISOString().slice(0, 10);
      const ofiLabel = oficina || "todas";
      const ext = formato === "pdf" ? "pdf" : "xlsx";
      const filename = `contactos_pendientes_${ofiLabel}_${hoy}.${ext}`;

      // Disparar descarga
      const blob = new Blob([response.data], {
        type: formato === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Reporte ${formato.toUpperCase()} descargado ✅`);
    } catch (err) {
      console.error("Error descargando reporte:", err);
      toast.error("No se pudo generar el reporte.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:w-[min(580px,92vw)] max-h-[92vh] flex flex-col bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-semibold text-slate-50 flex items-center gap-2">
                <HiDownload className="w-5 h-5 text-violet-400" />
                Reporte de contactos pendientes
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Clientes con cuotas en los próximos/pasados 7 días — para gestión manual
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 inline-flex items-center justify-center"
            >
              <HiX className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
            {/* Selector de oficina (solo admin) */}
            {isWebAdmin && (
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2 mb-2">
                  <HiOfficeBuilding className="w-4 h-4" />
                  Oficina
                  {loadingOfis && (
                    <span className="text-[10px] text-slate-500 normal-case tracking-normal font-normal">
                      cargando...
                    </span>
                  )}
                </label>
                <select
                  value={oficina}
                  onChange={(e) => setOficina(e.target.value)}
                  disabled={loadingOfis}
                  className="w-full h-11 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-60"
                >
                  <option value="">Todas las oficinas</option>
                  {oficinas.map((o) => (
                    <option key={o.id} value={String(o.id)}>
                      {o.nombre || o.codigo || `Oficina ${o.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Info de qué incluye */}
            <div>
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">
                El reporte incluye
              </div>
              <div className="grid grid-cols-1 gap-2">
                {DELTAS_INFO.map(({ delta, label, color, bg }) => (
                  <div
                    key={delta}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${bg}`}
                  >
                    <span className={`font-bold ${color} text-sm w-10 text-center`}>
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                    <span className="text-sm text-slate-200">{label}</span>
                  </div>
                ))}

                {/* 🆕 Marca de renovaciones */}
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl border bg-violet-500/10 border-violet-500/30">
                  <span className="font-bold text-violet-300 text-[10px] w-10 text-center">RENOV</span>
                  <span className="text-sm text-slate-200">
                    Las primeras cuotas de pólizas renovadas salen marcadas en violeta.
                  </span>
                </div>
              </div>
            </div>

            {/* Botones de descarga */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDescargar("pdf")}
                disabled={downloading !== null}
                className="inline-flex items-center justify-center gap-2 h-12 px-4 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg transition-colors"
              >
                <HiDocumentText className="w-5 h-5" />
                {downloading === "pdf" ? "Generando..." : "Descargar PDF"}
              </button>
              <button
                type="button"
                onClick={() => handleDescargar("excel")}
                disabled={downloading !== null}
                className="inline-flex items-center justify-center gap-2 h-12 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg transition-colors"
              >
                <HiTable className="w-5 h-5" />
                {downloading === "excel" ? "Generando..." : "Descargar Excel"}
              </button>
            </div>

            <p className="text-[11px] text-slate-500 text-center pt-2">
              El archivo incluye solo clientes con teléfono cargado.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}