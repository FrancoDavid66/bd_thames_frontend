// src/components/gruas/PlanesModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HiX } from "react-icons/hi";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  createPlan,
  fetchProveedores,
  selectProveedores,
  selectProveedoresStatus,
} from "../../store/slices/gruasSlice";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function PlanesModal({ open, onClose }) {
  const dispatch = useDispatch();
  const inputRef = useRef(null);

  const saving = useSelector((s) => s.gruas?.createPlan?.status === "loading");

  // ✅ Proveedores
  const proveedores = useSelector(selectProveedores);
  const proveedoresStatus = useSelector(selectProveedoresStatus);
  const proveedoresError = useSelector((s) => s.gruas?.proveedores?.error || null);

  const [nombre, setNombre] = useState("");
  const [km, setKm] = useState(100);
  const [proveedorNombre, setProveedorNombre] = useState(""); // guardamos string (proveedor_nombre)

  useEffect(() => {
    if (!open) return;

    setNombre("");
    setKm(100);
    setProveedorNombre("");

    // carga proveedores (solo activos)
    dispatch(fetchProveedores({ q: "", activo: "1" }));

    const t = setTimeout(() => inputRef.current?.focus?.(), 50);
    return () => clearTimeout(t);
  }, [open, dispatch]);

  const proveedoresOptions = useMemo(() => {
    const arr = Array.isArray(proveedores) ? proveedores : [];
    // map a { value: nombre, label: nombre + patente }
    const opts = arr
      .map((p) => {
        const nombre = String(p?.nombre || "").trim();
        if (!nombre) return null;
        const patente = String(p?.patente_camion || "").trim().toUpperCase();
        const modelo = String(p?.modelo_camion || "").trim();
        const anio = p?.anio_camion ? String(p.anio_camion) : "";
        const extra = [patente, [modelo, anio].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
        return {
          value: nombre,
          label: extra ? `${nombre} — ${extra}` : nombre,
        };
      })
      .filter(Boolean);

    // dedup por value
    const map = new Map();
    for (const o of opts) {
      if (!map.has(o.value)) map.set(o.value, o);
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [proveedores]);

  const close = () => onClose?.();

  const save = async () => {
    const n = nombre.trim();
    const kmNum = Number(km);
    const prov = (proveedorNombre || "").trim();

    if (!n) return toast.error("Falta el nombre del plan.");
    if (!kmNum || kmNum <= 0) return toast.error("Kilómetros inválidos.");

    try {
      await dispatch(
        createPlan({
          nombre: n,
          km_incluidos: kmNum,
          precio_mensual: 0,
          activo: true,
          // ✅ backend: PlanGrua.proveedor_nombre (string)
          proveedor_nombre: prov,
        })
      ).unwrap();

      toast.success("Plan creado.");
      onClose?.();
    } catch (e) {
      toast.error(e?.detail || e?.message || "No se pudo crear el plan.");
    }
  };

  const proveedoresLoading = proveedoresStatus === "loading";
  const proveedoresDisabled = proveedoresLoading || saving;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={close} />

          <motion.div
            className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 p-4">
              <div>
                <div className="text-lg font-semibold text-slate-100">Crear plan</div>
                <div className="text-xs text-slate-500">Nombre, kilómetros y proveedor.</div>
              </div>

              <button
                onClick={close}
                className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-200 hover:bg-slate-800"
                aria-label="Cerrar"
                disabled={saving}
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              <label className="block">
                <div className="text-xs text-slate-400 mb-1">Nombre del plan</div>
                <input
                  ref={inputRef}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Plan 100km"
                  className={classNames(
                    "w-full rounded-xl px-3 py-2 text-sm",
                    "bg-slate-900 border border-slate-800 text-slate-100",
                    "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                  )}
                  disabled={saving}
                />
              </label>

              <label className="block">
                <div className="text-xs text-slate-400 mb-1">Kilómetros</div>
                <input
                  type="number"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  min={1}
                  className={classNames(
                    "w-full rounded-xl px-3 py-2 text-sm",
                    "bg-slate-900 border border-slate-800 text-slate-100",
                    "focus:outline-none focus:ring-2 focus:ring-slate-700"
                  )}
                  disabled={saving}
                />
              </label>

              <label className="block">
                <div className="text-xs text-slate-400 mb-1">Proveedor (opcional)</div>

                <select
                  value={proveedorNombre}
                  onChange={(e) => setProveedorNombre(e.target.value)}
                  disabled={proveedoresDisabled}
                  className={classNames(
                    "w-full rounded-xl px-3 py-2 text-sm",
                    "bg-slate-900 border border-slate-800",
                    proveedoresDisabled ? "text-slate-500" : "text-slate-100"
                  )}
                >
                  <option value="">Sin proveedor</option>
                  {proveedoresOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>

                <div className="mt-1 text-[11px] text-slate-500">
                  {proveedoresLoading
                    ? "Cargando proveedores…"
                    : proveedoresError
                    ? `No se pudieron cargar proveedores: ${String(proveedoresError)}`
                    : proveedoresOptions.length
                    ? "Se guarda como texto en el plan (proveedor_nombre)."
                    : "No hay proveedores activos."}
                </div>
              </label>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 p-4">
              <button
                onClick={close}
                disabled={saving}
                className="px-3 py-2 rounded-xl text-sm border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-3 py-2 rounded-xl text-sm border border-slate-100 bg-slate-100 text-slate-900 hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
