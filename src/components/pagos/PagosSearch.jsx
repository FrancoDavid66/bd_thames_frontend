/* src/components/pagos/PagosSearch.jsx — DNI-first (rápido, con Redux)
   ✅ Busca CLIENTE + PÓLIZAS por DNI: thunk fetchBuscarClientePorDni -> GET /api/pagos/buscar-cliente/?dni=...
   ✅ Luego trae SOLO CUOTAS por póliza: thunk fetchCuotasPorPoliza -> GET /api/pagos/buscar/?poliza_id=...&solo_pendientes=1
   ✅ Mantiene: recientes, "/", anti-stale (via abort en thunks), Esc limpia.
*/

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { HiSearch, HiX } from "react-icons/hi";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchBuscarClientePorDni,
  fetchCuotasPorPoliza,
  pushRecienteDni,
  clearBuscarCliente,
} from "../../store/slices/pagosSlice";

/* Solo dígitos (para DNI) */
const onlyDigits = (s) => String(s || "").replace(/\D+/g, "");

export default function PagosSearch({ onBuscar }) {
  const dispatch = useDispatch();

  const inputRef = useRef(null);

  const [query, setQuery] = useState("");
  const [selectedPolizaId, setSelectedPolizaId] = useState("");

  const {
    buscarClienteData,
    buscarClienteStatus,
    buscarClienteError,
    cuotasPolizaStatus,
    cuotasPolizaError,
    recientesDni,
  } = useSelector((s) => s.pagos);

  const busy = buscarClienteStatus === "loading" || cuotasPolizaStatus === "loading";

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

  const recientes = useMemo(() => {
    const arr = Array.isArray(recientesDni) ? recientesDni : [];
    return arr.slice(0, 6);
  }, [recientesDni]);

  const limpiar = useCallback(() => {
    setQuery("");
    setSelectedPolizaId("");
    dispatch(clearBuscarCliente());
    requestAnimationFrame(() => inputRef.current?.focus?.());
  }, [dispatch]);

  const usarReciente = useCallback((q) => {
    setQuery(String(q || ""));
    setSelectedPolizaId("");
    dispatch(clearBuscarCliente());
    requestAnimationFrame(() => inputRef.current?.focus?.());
  }, [dispatch]);

  // 1) Buscar cliente + pólizas (por DNI)
  const buscarClientePorDni = useCallback(
    async (dniRaw) => {
      const dniDigits = onlyDigits(dniRaw);
      if (!dniDigits) {
        toast.error("Escribí un DNI (solo números).");
        return;
      }

      const res = await dispatch(fetchBuscarClientePorDni({ dni: dniDigits })).unwrap();

      // res: { cliente, polizas }
      const polizas = Array.isArray(res?.polizas) ? res.polizas : [];
      const cliente = res?.cliente || null;

      if (!cliente) {
        toast("No se encontró cliente con ese DNI.");
        return;
      }

      // Guardar recientes
      dispatch(pushRecienteDni(dniDigits));

      if (polizas.length === 0) {
        toast("No encontré pólizas para ese DNI.");
        return;
      }

      // Auto-selección si hay 1 póliza
      if (polizas.length === 1 && polizas[0]?.poliza_id) {
        setSelectedPolizaId(String(polizas[0].poliza_id));
      } else {
        setSelectedPolizaId(""); // que elija
      }
    },
    [dispatch]
  );

  // 2) Traer SOLO cuotas de una póliza
  const traerCuotasDePoliza = useCallback(
    async (polizaId, dniDigitsForMeta = "") => {
      const pid = String(polizaId || "").trim();
      if (!pid) {
        toast.error("Elegí una póliza.");
        return;
      }

      const res = await dispatch(
        fetchCuotasPorPoliza({
          poliza_id: pid,
          solo_pendientes: 1,
          page_size: 200,
          // opcional: usar dni para key/caché (y para devolverlo al onBuscar)
          dni: dniDigitsForMeta,
        })
      ).unwrap();

      const items = Array.isArray(res?.items) ? res.items : [];
      const meta = res?.meta || { count: items.length, next: null, previous: null };

      onBuscar?.(items, meta, dniDigitsForMeta || pid);

      if (!items || items.length === 0) {
        toast("No hay cuotas pendientes para esa póliza.");
      }
    },
    [dispatch, onBuscar]
  );

  const handleSubmit = useCallback(
    async (e, qOverride = null) => {
      e?.preventDefault?.();
      const q = String(qOverride ?? query).trim();
      await buscarClientePorDni(q);
    },
    [buscarClientePorDni, query]
  );

  // Mensajes de error (si querés verlos)
  useEffect(() => {
    if (buscarClienteError && typeof buscarClienteError === "string") {
      // opcional: toast.error(buscarClienteError)
    }
  }, [buscarClienteError]);

  useEffect(() => {
    if (cuotasPolizaError && typeof cuotasPolizaError === "string") {
      // opcional: toast.error(cuotasPolizaError)
    }
  }, [cuotasPolizaError]);

  const clienteLabel = useMemo(() => {
    const c = buscarClienteData?.cliente;
    if (!c) return "";
    const dni = String(c?.dni || "").trim();
    const nom = String(c?.nombre_apellido || "").trim();
    const ofi = String(c?.oficina || "").trim();
    return [dni, nom, ofi].filter(Boolean).join(" · ");
  }, [buscarClienteData]);

  const polizas = useMemo(() => {
    const arr = buscarClienteData?.polizas;
    return Array.isArray(arr) ? arr : [];
  }, [buscarClienteData]);

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
        aria-label="Buscar cliente por DNI para gestionar pagos"
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
              placeholder="Buscar por DNI…"
              inputMode="numeric"
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
            disabled={busy}
            className="h-14 px-6 rounded-2xl bg-primary-500/90 hover:bg-primary-500 text-white font-semibold shadow-sm ring-1 ring-primary-400/40 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {buscarClienteStatus === "loading" ? (
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

      {/* Resultados: Cliente + Pólizas */}
      {buscarClienteData?.cliente && (
        <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Datos del cliente
              </div>
              <div className="mt-1 text-sm md:text-base text-neutral-100 font-semibold">
                {clienteLabel || "Cliente"}
              </div>
            </div>

            <button
              type="button"
              onClick={limpiar}
              className="h-9 px-3 rounded-xl border border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900 text-neutral-200 text-sm transition"
              title="Nueva búsqueda"
            >
              Nueva búsqueda
            </button>
          </div>

          <div className="mt-4">
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Pólizas del cliente
            </div>

            {polizas.length > 0 ? (
              <>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {polizas.map((p, idx) => {
                    const pid = String(p?.poliza_id ?? "");
                    const isSelected = pid && pid === String(selectedPolizaId);

                    return (
                      <button
                        key={pid || `${idx}`}
                        type="button"
                        onClick={() => setSelectedPolizaId(pid)}
                        className={[
                          "text-left p-3 rounded-2xl border transition",
                          isSelected
                            ? "border-primary-400/60 bg-primary-500/10"
                            : "border-neutral-800 bg-neutral-950/40 hover:bg-neutral-900/60",
                        ].join(" ")}
                      >
                        <div className="text-sm font-semibold text-neutral-100">
                          {String(p?.patente || "").trim() || "Sin patente"}{" "}
                          <span className="text-neutral-400 font-normal">
                            · {String(p?.compania || "").trim() || "Sin compañía"}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400 mt-1">
                          {String(p?.modelo || "").trim() || "Sin modelo"}{" "}
                          {p?.oficina ? (
                            <span className="text-neutral-500">· {String(p.oficina)}</span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    disabled={!selectedPolizaId || cuotasPolizaStatus === "loading"}
                    onClick={() =>
                      traerCuotasDePoliza(
                        selectedPolizaId,
                        onlyDigits(buscarClienteData?.cliente?.dni || query)
                      )
                    }
                    className="h-11 px-4 rounded-2xl bg-emerald-500/90 hover:bg-emerald-500 text-white font-semibold shadow-sm ring-1 ring-emerald-400/40 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    {cuotasPolizaStatus === "loading" ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                        Cargando cuotas…
                      </span>
                    ) : (
                      <>Ver cuotas para pagar</>
                    )}
                  </motion.button>

                  <div className="text-xs text-neutral-500">
                    Elegí una póliza y tocá “Ver cuotas para pagar”.
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-2 text-sm text-neutral-400">
                No hay pólizas para este cliente.
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
