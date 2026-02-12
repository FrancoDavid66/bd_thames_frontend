/* src/components/pagos/PagosSearch.jsx — PRO: busca PÓLIZAS (usa fetchPolizas del slice)
   ✅ Busca solo con Enter o click en Buscar.
   ✅ Mantiene: recientes, "/", anti-stale, Esc limpia.
   ✅ NUEVO: devuelve CUOTAS FLAT (aplanadas) para PagosPage (clientes → modal cuotas).
*/

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { HiSearch, HiX } from "react-icons/hi";

import { fetchPolizas } from "../../store/slices/pagosSlice";

// ------- helpers: aplanar cuotas desde pólizas
function flattenCuotasFromPolizas(polizas) {
  const out = [];
  const list = Array.isArray(polizas) ? polizas : [];

  for (const p of list) {
    if (!p || typeof p !== "object") continue;

    const cuotas = Array.isArray(p.cuotas) ? p.cuotas : [];
    if (cuotas.length === 0) continue;

    for (const c of cuotas) {
      if (!c || typeof c !== "object") continue;

      // devolvemos cuota "flat" pero con poliza embebida (para normalizar en PagosPage)
      out.push({
        ...c,
        poliza: p,
        poliza_id: p?.id ?? c?.poliza_id ?? c?.poliza ?? null,
        numero_poliza: p?.numero_poliza ?? p?.numero ?? c?.numero_poliza ?? "",
        patente: p?.patente ?? c?.patente ?? "",
        compania: p?.compania ?? c?.compania ?? "",
        oficina: p?.oficina ?? c?.oficina ?? "",
      });
    }
  }

  return out;
}

export default function PagosSearch({ onBuscar }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const dispatch = useDispatch();

  const {
    searchStatus = "idle",
    polizasCache = {},
    polizasCacheOrder = [],
    buscarCache = {},
    buscarCacheOrder = [],
  } = useSelector((state) => state.pagos || {});

  const cargando = searchStatus === "loading";

  // anti-stale
  const lastRequestIdRef = useRef(null);
  const lastToastKeyRef = useRef("");

  useEffect(() => {
    inputRef.current?.focus?.();
  }, []);

  // Atajo: "/" enfoca el buscador
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
        inputRef.current?.focus?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ✅ Recientes: preferimos buscarCacheOrder, si no, polizasCacheOrder.
  const recientes = useMemo(() => {
    const out = [];
    const seen = new Set();

    const pushFrom = (order, cache) => {
      const arr = Array.isArray(order) ? order : [];
      for (const k of arr) {
        const entry = cache?.[k];
        const q = String(entry?.originalQuery || "").trim();
        if (!q) continue;
        const norm = q.toLowerCase();
        if (seen.has(norm)) continue;
        seen.add(norm);
        out.push(q);
        if (out.length >= 6) break;
      }
    };

    pushFrom(buscarCacheOrder, buscarCache);
    if (out.length < 6) pushFrom(polizasCacheOrder, polizasCache);

    return out.slice(0, 6);
  }, [buscarCache, buscarCacheOrder, polizasCache, polizasCacheOrder]);

  const limpiar = useCallback(() => {
    setQuery("");
    lastToastKeyRef.current = "";
    inputRef.current?.focus?.();
  }, []);

  const usarReciente = useCallback((q) => {
    setQuery(q);
    lastToastKeyRef.current = "";
    requestAnimationFrame(() => inputRef.current?.focus?.());
  }, []);

  const handleSubmit = useCallback(
    async (e, qOverride = null) => {
      e?.preventDefault?.();

      const q = String(qOverride ?? query).trim();
      if (!q) {
        const key = "empty";
        if (lastToastKeyRef.current !== key) {
          lastToastKeyRef.current = key;
          toast.error("Escribí algo para buscar (cliente, patente o póliza).");
        }
        return;
      }

      try {
        const promise = dispatch(
          fetchPolizas({
            query: q,
            limit: 25,
            withCuotas: true, // ✅ necesitamos cuotas para pagos (flujo por cliente)
          })
        );

        lastRequestIdRef.current = promise?.requestId || null;

        const action = await promise;

        // Ignorar si llegó tarde
        if (
          lastRequestIdRef.current &&
          action?.meta?.requestId &&
          lastRequestIdRef.current !== action.meta.requestId
        ) {
          return;
        }

        const payload = action?.payload || {};
        const polizas = Array.isArray(payload?.polizas)
          ? payload.polizas
          : Array.isArray(payload)
          ? payload
          : [];

        // ✅ aplanar cuotas desde polizas[].cuotas
        const cuotasFlat = flattenCuotasFromPolizas(polizas);

        // meta simple (porque slice no trae paginado real aquí)
        const meta = { count: cuotasFlat.length, next: null, previous: null };

        onBuscar?.(cuotasFlat, meta, q);

        if (cuotasFlat.length === 0) {
          const key = `nores:${q.toLowerCase()}`;
          if (lastToastKeyRef.current !== key) {
            lastToastKeyRef.current = key;
            toast("Sin resultados para esa búsqueda.");
          }
        } else {
          lastToastKeyRef.current = "";
        }
      } catch (err) {
        if (err?.payload?._aborted) return;
        console.error(err);
        toast.error("Ocurrió un error buscando pólizas.");
      }
    },
    [dispatch, onBuscar, query]
  );

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
              onKeyDown={(e) => {
                if (e.key === "Escape") limpiar();
              }}
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
          <span className="font-semibold">/</span> para enfocar rápido •{" "}
          <span className="font-semibold">Esc</span> para limpiar.
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
              title={`Usar: ${q}`}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
