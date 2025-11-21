/* src/components/pagos/PagosSearch.jsx — Minimal + tamaños grandes (dark) */
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { HiSearch, HiX } from "react-icons/hi";
import { fetchPolizas } from "../../store/slices/pagosSlice";

export default function PagosSearch({ onBuscar }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const dispatch = useDispatch();
  const { status } = useSelector((state) => state.pagos);
  const cargando = status === "loading";

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      toast.error("Escribí algo para buscar (cliente, patente, póliza…)");
      return;
    }
    try {
      const action = await dispatch(fetchPolizas(q));
      const polizas =
        action?.payload?.polizas ??
        action?.payload ??
        action?.polizas ??
        (Array.isArray(action) ? action : []);
      if (!Array.isArray(polizas)) {
        toast.error("No pude interpretar el resultado de la búsqueda.");
        return;
      }
      onBuscar?.(polizas);
      if (polizas.length === 0) toast("Sin resultados para esa búsqueda.");
    } catch (err) {
      console.error(err);
      toast.error("Ocurrió un error buscando pólizas.");
    }
  };

  const limpiar = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full"
      role="search"
      aria-label="Buscar pólizas para gestionar pagos"
    >
      <div className="flex w-full gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Buscar</span>
          <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60">
            <HiSearch className="w-6 h-6" />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente, patente o nº de póliza…"
            className="w-full h-14 bg-neutral-900/70 border border-neutral-700/70 focus:border-primary-400/60 focus:ring-4 focus:ring-primary-400/20 rounded-2xl pl-12 pr-12 text-base md:text-lg outline-none transition"
          />
          {query && (
            <button
              type="button"
              onClick={limpiar}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-neutral-800/80 border border-transparent hover:border-neutral-700 transition"
              aria-label="Limpiar búsqueda"
              title="Limpiar"
            >
              <HiX className="w-5 h-5 opacity-70" />
            </button>
          )}
        </label>

        <motion.button
            type="submit"
            whileTap={{ scale: 0.98 }}
            disabled={cargando}
            className="h-14 px-6 rounded-2xl bg-primary-500/90 hover:bg-primary-500 text-white font-semibold shadow-sm ring-1 ring-primary-400/40 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-2"
        >
          {cargando ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
              Buscando…
            </span>
          ) : (
            <>
              <HiSearch className="w-5 h-5" />
              Buscar
            </>
          )}
        </motion.button>
      </div>

      <p className="mt-2 text-xs md:text-sm text-neutral-400">
        Tip: presioná <span className="font-semibold">Enter</span> para buscar.
      </p>
    </motion.form>
  );
}
