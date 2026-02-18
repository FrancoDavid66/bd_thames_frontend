// src/components/gruas/FlotaModal.jsx
import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function safe(v) {
  return (v ?? "").toString().trim();
}

export default function FlotaModal({ open, onClose, proveedor }) {
  const p = proveedor || null;

  const title = useMemo(() => {
    if (!p) return "Flota";
    return `Flota · ${safe(p?.nombre) || `Proveedor #${p?.id}`}`;
  }, [p]);

  const patente = safe(p?.patente_camion).toUpperCase() || "—";
  const modelo = safe(p?.modelo_camion) || "—";
  const anio = p?.anio_camion ? String(p.anio_camion) : "—";

  const foto1 = safe(p?.foto_camion_1_url);
  const foto2 = safe(p?.foto_camion_2_url);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center px-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />

          <motion.div
            className={classNames(
              "relative w-full max-w-2xl rounded-2xl border border-slate-800",
              "bg-slate-950 shadow-xl"
            )}
            initial={{ y: 16, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.98, opacity: 0 }}
          >
            <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100 truncate">
                  {title}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Por ahora: 1 camión por proveedor.
                </div>
              </div>

              <button
                onClick={onClose}
                className="px-3 py-2 rounded-xl text-xs border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>

            <div className="p-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-xs text-slate-400">Camión</div>
                <div className="mt-1 text-sm text-slate-100">
                  {patente} · {modelo} · {anio}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={foto1 || "#"}
                  target={foto1 ? "_blank" : undefined}
                  rel="noreferrer"
                  className={classNames(
                    "rounded-2xl border border-slate-800 bg-slate-950 p-3",
                    foto1 ? "hover:bg-slate-900 transition" : ""
                  )}
                >
                  <div className="text-xs text-slate-400">Foto camión 1</div>
                  <div className="mt-2 overflow-hidden rounded-xl border border-slate-800 bg-black/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {foto1 ? (
                      <img
                        src={foto1}
                        alt="Foto camión 1"
                        className="h-44 w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-44 w-full flex items-center justify-center text-xs text-slate-500">
                        Sin imagen
                      </div>
                    )}
                  </div>
                </a>

                <a
                  href={foto2 || "#"}
                  target={foto2 ? "_blank" : undefined}
                  rel="noreferrer"
                  className={classNames(
                    "rounded-2xl border border-slate-800 bg-slate-950 p-3",
                    foto2 ? "hover:bg-slate-900 transition" : ""
                  )}
                >
                  <div className="text-xs text-slate-400">Foto camión 2</div>
                  <div className="mt-2 overflow-hidden rounded-xl border border-slate-800 bg-black/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {foto2 ? (
                      <img
                        src={foto2}
                        alt="Foto camión 2"
                        className="h-44 w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-44 w-full flex items-center justify-center text-xs text-slate-500">
                        Sin imagen
                      </div>
                    )}
                  </div>
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
