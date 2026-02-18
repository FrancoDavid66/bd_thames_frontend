// src/components/gruas/AdhesionesModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HiSearch, HiX, HiCheckCircle } from "react-icons/hi";
import { useDispatch, useSelector } from "react-redux";
import { buscarPolizas } from "../../store/slices/gruasSlice";

function safeStr(v) {
  return v == null ? "" : String(v);
}

export default function AdhesionesModal({ open, onClose, onSelectPoliza }) {
  const dispatch = useDispatch();
  const inputRef = useRef(null);

  const [q, setQ] = useState("");

  const status = useSelector((s) => s.gruas?.polizasBuscar?.status || "idle");
  const items = useSelector((s) => s.gruas?.polizasBuscar?.items || []);
  const error = useSelector((s) => s.gruas?.polizasBuscar?.error || null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus?.(), 50);
    return () => clearTimeout(t);
  }, [open]);

  // reset al abrir
  useEffect(() => {
    if (!open) return;
    setQ("");
  }, [open]);

  // buscar remoto (debounce)
  useEffect(() => {
    if (!open) return;
    const s = q.trim();
    if (s.length < 2) return;

    const t = setTimeout(() => {
      dispatch(buscarPolizas({ q: s }));
    }, 250);

    return () => clearTimeout(t);
  }, [q, open, dispatch]);

  const loading = status === "loading";

  const visible = useMemo(() => {
    // el backend ya filtra, pero dejamos filtro local suave
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return (items || []).filter((p) => {
      const nombre = `${safeStr(p?.cliente?.apellido)} ${safeStr(p?.cliente?.nombre)}`.trim().toLowerCase();
      const pat = safeStr(p?.patente).toLowerCase();
      const comp = safeStr(p?.compania).toLowerCase();
      const nro = safeStr(p?.numero_poliza).toLowerCase();
      const dni = safeStr(p?.cliente?.dni_cuit_cuil || p?.cliente?.dni).toLowerCase();
      return (
        nombre.includes(s) ||
        pat.includes(s) ||
        comp.includes(s) ||
        nro.includes(s) ||
        dni.includes(s)
      );
    });
  }, [items, q]);

  const close = () => {
    if (loading) return;
    onClose?.();
  };

  const pick = (p) => {
    onSelectPoliza?.(p);
    onClose?.();
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={close} />

          <motion.div
            className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden"
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 p-4">
              <div>
                <div className="text-lg font-semibold text-slate-100">Crear adhesión</div>
                <div className="text-xs text-slate-500">
                  Buscá y seleccioná la póliza.
                </div>
              </div>

              <button
                onClick={close}
                className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-200 hover:bg-slate-800"
                aria-label="Cerrar"
                disabled={loading}
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2">
                <HiSearch className="h-5 w-5 text-slate-400" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por patente, asegurado, DNI, compañía o número…"
                  className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
                />
                {loading ? <span className="text-xs text-slate-400">Buscando…</span> : null}
              </div>

              {error ? (
                <div className="mt-2 text-xs text-red-300">{safeStr(error)}</div>
              ) : null}

              <div className="mt-3 text-[11px] text-slate-500">
                Escribí al menos <b>2</b> caracteres.
              </div>
            </div>

            {/* List */}
            <div className="max-h-[55vh] overflow-auto border-t border-slate-800">
              {q.trim().length < 2 ? (
                <div className="p-6 text-sm text-slate-400">Escribí para buscar pólizas.</div>
              ) : visible.length ? (
                <div className="divide-y divide-slate-800">
                  {visible.map((p) => {
                    const nombre =
                      `${safeStr(p?.cliente?.apellido)} ${safeStr(p?.cliente?.nombre)}`.trim() || "Asegurado";
                    const dni = safeStr(p?.cliente?.dni_cuit_cuil || p?.cliente?.dni || "");
                    const pat = safeStr(p?.patente || "—");
                    const veh = [p?.marca, p?.modelo, p?.anio].filter(Boolean).join(" ");

                    return (
                      <button
                        key={p.id}
                        onClick={() => pick(p)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-900 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-100">{nombre}</span>
                              {dni ? <span className="text-xs text-slate-400">DNI: {dni}</span> : null}
                            </div>

                            <div className="mt-0.5 text-xs text-slate-400">
                              <span className="font-semibold text-slate-200">Patente:</span> {pat}
                              {veh ? <span className="ml-2">· {veh}</span> : null}
                            </div>

                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {p?.compania ? `Compañía: ${p.compania}` : null}
                              {p?.numero_poliza ? ` · Póliza: ${p.numero_poliza}` : null}
                            </div>
                          </div>

                          <div className="shrink-0">
                            <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-800 bg-emerald-950 px-2 py-1 text-[11px] text-emerald-200">
                              <HiCheckCircle className="h-4 w-4" />
                              Elegir
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-sm text-slate-400">
                  {loading ? "Buscando..." : "Sin resultados."}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-800 p-4">
              <div className="text-xs text-slate-500">
                Mostrando: <b>Patente</b>, <b>Asegurado</b>, <b>DNI</b> y <b>Vehículo</b>.
              </div>
              <button
                onClick={close}
                disabled={loading}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
