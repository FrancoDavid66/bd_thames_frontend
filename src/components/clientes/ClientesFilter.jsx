// src/components/clientes/ClientesFilter.jsx
import { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { HiSearch, HiFilter } from "react-icons/hi";

const estados = [
  { value: "todos", label: "Todos los Clientes" },
  { value: "activos", label: "Con Pólizas Activas" },
  { value: "inactivos", label: "Sin Pólizas (Inactivos)" },
];

const ClientesFilter = memo(function ClientesFilter({ onFilterText, onFilterEstado }) {
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

  return (
    <motion.section
      className="rounded-2xl bg-card dark:bg-card-dark border border-linea dark:border-linea-dark p-4 sm:p-5 shadow-2xl backdrop-blur-md"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-4">

        {/* Título + Resumen */}
        <div className="flex items-center gap-2">
           <div className="h-8 w-8 rounded-lg bg-oficina/10 border border-oficina/20 text-oficina flex items-center justify-center">
             <HiFilter className="text-sm" />
           </div>
           <div>
             <h3 className="text-xs font-black uppercase tracking-widest text-titulo dark:text-titulo-dark">
               Filtros de Búsqueda
             </h3>
             <p className="text-[10px] text-suave dark:text-suave-dark font-bold uppercase tracking-wider mt-0.5">
               Localizá clientes rápidamente en tu base de datos.
             </p>
           </div>
        </div>

        {/* Buscador + Chips (Grid/Flex layout para que respire) */}
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center">

          {/* Buscador Principal */}
          <div className="w-full lg:flex-1 relative group">
            <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark text-lg group-focus-within:text-oficina transition-colors" />
            <input
              type="text"
              placeholder="Buscar por Nombre, Apellido, DNI o CUIT..."
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark text-sm font-bold text-titulo dark:text-titulo-dark placeholder:text-suave/50 dark:placeholder:text-suave-dark/50 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-oficina/50 focus:border-oficina/30 transition-all shadow-inner"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {/* Filtro por estado (Chips) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark mr-2">Estado:</span>
            {estados.map((opt) => {
              const active = estado === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEstado(opt.value)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    active
                      ? "bg-oficina text-white shadow-lg shadow-oficina/40 hover:bg-oficina-fuerte"
                      : "bg-card dark:bg-card-dark text-suave dark:text-suave-dark border border-linea dark:border-linea-dark hover:bg-surface dark:hover:bg-surface-dark hover:text-titulo dark:hover:text-titulo-dark"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </motion.section>
  );
});

export default ClientesFilter;