// src/components/clientes/ClientesFilter.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const ClientesFilter = ({ onFilterText, onFilterEstado }) => {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");

  // Debounce búsqueda
  useEffect(() => {
    const timeout = setTimeout(() => {
      onFilterText(busqueda.toLowerCase());
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda, onFilterText]);

  // Cambio de estado
  useEffect(() => {
    onFilterEstado(estado);
  }, [estado, onFilterEstado]);

  const estados = [
    { value: "todos", label: "Todos" },
    { value: "activos", label: "Activos" },
    { value: "inactivos", label: "Inactivos" },
  ];

  return (
    <motion.section
      className="rounded-2xl bg-gradient-to-br from-neutral-800/80 via-neutral-950 to-black p-[1px] shadow-lg shadow-black/40"
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="bg-neutral-950/95 rounded-2xl px-4 py-3 sm:px-5 sm:py-4 flex flex-col gap-3">
        {/* Título + resumen (opcional) */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">
              Filtros de clientes
            </h3>
            <p className="text-[11px] text-neutral-400">
              Buscá por nombre, apellido o DNI y filtrá por estado.
            </p>
          </div>
        </div>

        {/* Buscador */}
        <div className="w-full">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-500 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o DNI"
              className="w-full h-11 pl-9 pr-3 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {/* Filtro por estado (chips) */}
        <div className="flex flex-wrap gap-2">
          {estados.map((opt) => {
            const active = estado === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEstado(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs sm:text-sm transition border ${
                  active
                    ? "bg-primary-500/15 text-primary-200 border-primary-400/40 ring-1 ring-primary-500/40"
                    : "bg-neutral-900 text-neutral-200 border-neutral-700 hover:bg-neutral-800"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
};

export default ClientesFilter;
