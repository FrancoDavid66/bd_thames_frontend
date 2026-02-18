// src/components/gruas/PlanesPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { HiPlus, HiRefresh } from "react-icons/hi";
import { useDispatch, useSelector } from "react-redux";
import PlanesModal from "./PlanesModal";
import { fetchPlanes, selectPlanes, selectPlanesStatus } from "../../store/slices/gruasSlice";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function PlanesPanel() {
  const dispatch = useDispatch();

  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const items = useSelector(selectPlanes);
  const status = useSelector(selectPlanesStatus);
  const error = useSelector((s) => s.gruas?.planes?.error || null);

  useEffect(() => {
    dispatch(fetchPlanes({ q: "" }));
  }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => {
      dispatch(fetchPlanes({ q: q.trim() }));
    }, 250);
    return () => clearTimeout(t);
  }, [q, dispatch]);

  const filtered = useMemo(() => {
    // backend ya filtra por q, pero dejo fallback por si cache/latencia
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return (items || []).filter((p) =>
      String(p?.nombre || "").toLowerCase().includes(s)
    );
  }, [items, q]);

  const loading = status === "loading";

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-base font-semibold text-slate-100">Planes</div>
          <div className="text-xs text-slate-500">Crear y administrar planes.</div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar plan…"
            className={classNames(
              "px-3 py-2 rounded-xl text-sm w-full sm:w-72",
              "bg-slate-900 border border-slate-800 text-slate-100",
              "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
            )}
          />

          <button
            onClick={() => dispatch(fetchPlanes({ q: q.trim() }))}
            className={classNames(
              "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm border",
              "bg-slate-950 text-slate-200 border-slate-800 hover:bg-slate-900"
            )}
            title="Refrescar"
          >
            <HiRefresh className={classNames("h-4 w-4", loading ? "animate-spin" : "")} />
            Refrescar
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm border bg-slate-100 text-slate-900 border-slate-100 hover:opacity-90"
          >
            <HiPlus className="h-4 w-4" />
            Nuevo plan
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-3 text-sm text-red-300">{String(error)}</div>
      ) : null}

      {loading && !filtered?.length ? (
        <div className="mt-4 space-y-2 animate-pulse">
          <div className="h-14 rounded-2xl bg-slate-900/60 border border-slate-800" />
          <div className="h-14 rounded-2xl bg-slate-900/60 border border-slate-800" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((p) => (
            <motion.div
              key={p.id}
              layout
              className="rounded-2xl border border-slate-800 bg-slate-950 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    {p.nombre}
                  </div>
                  <div className="text-xs text-slate-400">
                    {p.km_incluidos} km
                    {Number(p.precio_mensual || 0) > 0
                      ? ` · $${Number(p.precio_mensual).toFixed(2)}`
                      : ""}
                  </div>
                </div>

                <span
                  className={classNames(
                    "text-[11px] px-2 py-1 rounded-lg border",
                    p.activo
                      ? "border-emerald-800 bg-emerald-950 text-emerald-200"
                      : "border-slate-800 bg-slate-900 text-slate-300"
                  )}
                >
                  {p.activo ? "ACTIVO" : "INACTIVO"}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && !filtered.length && (
        <div className="mt-6 text-sm text-slate-400">Sin planes.</div>
      )}

      <PlanesModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          dispatch(fetchPlanes({ q: q.trim() }));
        }}
      />
    </div>
  );
}
