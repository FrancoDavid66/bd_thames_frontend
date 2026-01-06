/* src/components/pagos/PagosSearch.jsx — Optimizado: chips recientes + atajo "/" + status separado */
import { useEffect, useRef, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { HiSearch, HiX } from "react-icons/hi";
import { fetchPolizas } from "../../store/slices/pagosSlice";

export default function PagosSearch({ onBuscar }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const dispatch = useDispatch();

  const {
    searchStatus = "idle",
    polizasCache = {},
    polizasCacheOrder = [],
  } = useSelector((state) => state.pagos || {});
  const cargando = searchStatus === "loading";

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Atajo: "/" enfoca el buscador (tipo Instagram/Twitter)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const active = document.activeElement;
        const isTyping =
          active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.getAttribute?.("contenteditable") === "true");
        if (isTyping) return;

        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const recientes = useMemo(() => {
    const order = Array.isArray(polizasCacheOrder) ? polizasCacheOrder : [];
    return order
      .map((k) => polizasCache?.[k])
      .filter(Boolean)
      .map((e) => e.originalQuery || "")
      .filter(Boolean)
      .slice(0, 6);
  }, [polizasCache, polizasCacheOrder]);

  const handleSubmit = async (e, qOverride = null) => {
    e?.preventDefault?.();

    const q = String(qOverride ?? query).trim();
    if (!q) {
      toast.error("Escribí algo para buscar (cliente, patente, póliza…)");
      return;
    }

    try {
      const action = await dispatch(fetchPolizas(q));
      const payload = action?.payload;

      const polizas =
        payload?.polizas ??
        payload ??
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

  const usarReciente = (q) => {
    setQuery(q);
    handleSubmit({ preventDefault() {} }, q);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      <motion.form
        onSubmit={handleSubmit}
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
          Tip: <span className="font-semibold">Enter</span> para buscar •{" "}
          <span className="font-semibold">/</span> para enfocar rápido.
        </p>
      </motion.form>

      {recientes.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-500 mr-1">Recientes:</span>
          {recientes.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => usarReciente(q)}
              className="h-9 px-3 rounded-xl border border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900 text-neutral-200 text-sm transition"
              title={`Buscar: ${q}`}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
