/* src/components/pagos/PagosSearch.jsx */
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { HiSearch, HiX, HiChevronRight } from "react-icons/hi";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBuscarClientePorDni,
  fetchCuotasPorPoliza,
  fetchCuotasBuscar,
  pushRecienteDni,
  clearBuscarCliente,
} from "../../store/slices/pagosSlice";
import { useAuth } from "../../context/AuthContext";

const onlyDigits = (s) => String(s || "").replace(/\D+/g, "");
const normalizePatente = (s) => String(s || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
const isLikelyDni = (raw) => {
  const d = onlyDigits(raw);
  return d.length >= 6 && d.length <= 11 && d === String(raw || "").replace(/\D+/g, "");
};

const OFICINA_NAMES = { "1": "5 Esquinas", "2": "Axion", "3": "Km 39" };

export default function PagosSearch({ onBuscar }) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [selectedPolizaId, setSelectedPolizaId] = useState("");

  const {
    buscarClienteData,
    buscarClienteStatus,
    cuotasPolizaStatus,
    cuotasBuscarStatus,
    recientesDni,
  } = useSelector((s) => s.pagos || {});

  const busy = buscarClienteStatus === "loading" || cuotasPolizaStatus === "loading" || cuotasBuscarStatus === "loading";
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  useEffect(() => { inputRef.current?.focus?.(); }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const active = document.activeElement;
        if (active?.tagName === "INPUT" || active?.tagName === "TEXTAREA") return;
        e.preventDefault();
        inputRef.current?.focus?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const recientes = useMemo(() => (Array.isArray(recientesDni) ? recientesDni : []).slice(0, 6), [recientesDni]);

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

  const buscarClientePorDni = useCallback(async (dniRaw) => {
    const dniDigits = onlyDigits(dniRaw);
    if (!dniDigits) { toast.error("Escribí un DNI válido."); return; }
    const res = await dispatch(fetchBuscarClientePorDni({ dni: dniDigits })).unwrap();
    const polizas = Array.isArray(res?.polizas) ? res.polizas : [];
    if (!res?.cliente) { toast("No se encontró cliente."); return; }
    dispatch(pushRecienteDni(dniDigits));
    if (polizas.length === 0) { toast("Sin pólizas para ese DNI."); return; }
    if (polizas.length === 1 && polizas[0]?.poliza_id) setSelectedPolizaId(String(polizas[0].poliza_id));
    else setSelectedPolizaId("");
  }, [dispatch]);

  const traerCuotasDePoliza = useCallback(async (polizaId, dniMeta = "") => {
    const pid = String(polizaId || "").trim();
    if (!pid) { toast.error("Elegí una póliza."); return; }
    const res = await dispatch(fetchCuotasPorPoliza({ poliza_id: pid, solo_pendientes: 0, page_size: 200, dni: dniMeta })).unwrap();
    const items = Array.isArray(res?.items) ? res.items : [];
    onBuscar?.(items, res?.meta || { count: items.length }, dniMeta || pid);
    if (!items.length) toast("Sin cuotas para esa póliza.");
  }, [dispatch, onBuscar]);

  const traerCuotasPorPatente = useCallback(async (patenteRaw) => {
    const q = normalizePatente(patenteRaw);
    if (!q) { toast.error("Escribí una patente."); return; }
    dispatch(clearBuscarCliente());
    setSelectedPolizaId("");
    const res = await dispatch(fetchCuotasBuscar({ q, solo_pendientes: 0, page_size: 200 })).unwrap();
    const items = Array.isArray(res?.items) ? res.items : [];
    onBuscar?.(items, res?.meta || { count: items.length }, q);
    if (!items.length) toast("Sin cuotas para esa patente.");
  }, [dispatch, onBuscar]);

  const handleSubmit = useCallback(async (e, qOverride = null) => {
    e?.preventDefault?.();
    const q = String(qOverride ?? query).trim();
    if (!q) return;
    if (isLikelyDni(q)) await buscarClientePorDni(q);
    else await traerCuotasPorPatente(q);
  }, [buscarClientePorDni, query, traerCuotasPorPatente]);

  const polizas = useMemo(() => {
    const arr = buscarClienteData?.polizas;
    return Array.isArray(arr) ? arr : [];
  }, [buscarClienteData]);

  const clienteLabel = useMemo(() => {
    const c = buscarClienteData?.cliente;
    if (!c) return "";
    return [String(c?.dni || "").trim(), String(c?.nombre_apellido || "").trim()].filter(Boolean).join(" · ");
  }, [buscarClienteData]);

  return (
    <div className="w-full space-y-3">
      {/* Buscador */}
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") limpiar(); }}
              placeholder="DNI o patente..."
              inputMode="text"
              className="w-full h-10 bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-slate-500 focus:outline-none rounded-lg pl-9 pr-9 text-sm text-slate-100 placeholder-slate-500 transition-colors"
            />
            {query && (
              <button type="button" onClick={limpiar} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors">
                <HiX className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={busy}
            className="h-10 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {busy
              ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" /> Buscando</>
              : <><HiSearch className="w-4 h-4" /> Buscar</>
            }
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-600">
          <kbd className="font-mono">/</kbd> para enfocar · <kbd className="font-mono">Esc</kbd> para limpiar · DNI o patente
        </p>
      </form>

      {/* Recientes */}
      {recientes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-600 uppercase tracking-wider">Recientes:</span>
          {recientes.map((q) => (
            <button key={q} type="button" onClick={() => usarReciente(q)}
              className="h-7 px-2.5 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors font-mono">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Resultado cliente */}
      {buscarClienteData?.cliente && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 divide-y divide-slate-800">
          {/* Header cliente */}
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Cliente encontrado</div>
              <div className="text-sm font-medium text-slate-100 flex items-center gap-2 flex-wrap">
                {clienteLabel || "Cliente"}
                {isWebAdmin && buscarClienteData?.cliente?.oficina && (
                  <span className="text-[10px] font-mono text-slate-400 border border-slate-700 rounded px-1.5 py-0.5">
                    {OFICINA_NAMES[String(buscarClienteData.cliente.oficina)] || `Ofi ${buscarClienteData.cliente.oficina}`}
                  </span>
                )}
              </div>
            </div>
            <button onClick={limpiar} className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors">
              Limpiar
            </button>
          </div>

          {/* Pólizas */}
          <div className="px-4 py-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
              {polizas.length} póliza{polizas.length !== 1 ? "s" : ""}
            </div>
            {polizas.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {polizas.map((p, idx) => {
                    const pid = String(p?.poliza_id ?? "");
                    const isSel = pid && pid === String(selectedPolizaId);
                    return (
                      <button key={pid || idx} type="button" onClick={() => setSelectedPolizaId(pid)}
                        className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${isSel ? "border-slate-500 bg-slate-800" : "border-slate-800 bg-slate-900/40 hover:bg-slate-800/60"}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono font-medium text-slate-100">
                            {String(p?.patente || "").trim() || "Sin patente"}
                          </span>
                          {isSel && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {String(p?.compania || "").trim() || "—"} · {String(p?.modelo || "").trim() || "—"}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={!selectedPolizaId || cuotasPolizaStatus === "loading"}
                  onClick={() => traerCuotasDePoliza(selectedPolizaId, onlyDigits(buscarClienteData?.cliente?.dni || query))}
                  className="mt-2 h-9 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {cuotasPolizaStatus === "loading"
                    ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/60 border-t-transparent animate-spin" /> Cargando...</>
                    : <><HiChevronRight className="w-4 h-4" /> Ver cuotas</>
                  }
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-500">Sin pólizas para este cliente.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}