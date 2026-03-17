// src/components/clientes/ClientesFilter.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HiSearch, HiFilter } from "react-icons/hi";

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
    { value: "todos", label: "Todos los Clientes" },
    { value: "activos", label: "Con Pólizas Activas" },
    { value: "inactivos", label: "Sin Pólizas (Inactivos)" },
  ];

  return (
    <motion.section
      className="rounded-2xl bg-white/[0.02] border border-white/10 p-4 sm:p-5 shadow-2xl backdrop-blur-md"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-4">
        
        {/* Título + Resumen */}
        <div className="flex items-center gap-2">
           <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
             <HiFilter className="text-sm" />
           </div>
           <div>
             <h3 className="text-xs font-black uppercase tracking-widest text-white">
               Filtros de Búsqueda
             </h3>
             <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5">
               Localizá clientes rápidamente en tu base de datos.
             </p>
           </div>
        </div>

        {/* Buscador + Chips (Grid/Flex layout para que respire) */}
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
          
          {/* Buscador Principal */}
          <div className="w-full lg:flex-1 relative group">
            <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg group-focus-within:text-sky-400 transition-colors" />
            <input
              type="text"
              placeholder="Buscar por Nombre, Apellido, DNI o CUIT..."
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-black/40 border border-white/10 text-sm font-bold text-white placeholder:text-white/20 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/30 transition-all shadow-inner"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {/* Filtro por estado (Chips) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-widest text-white/30 mr-2">Estado:</span>
            {estados.map((opt) => {
              const active = estado === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEstado(opt.value)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    active
                      ? "bg-sky-500 text-white shadow-lg shadow-sky-900/40"
                      : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white"
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
};

export default ClientesFilter;