// src/components/gruas/AdhesionesTable.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { HiRefresh, HiX } from "react-icons/hi";
import toast from "react-hot-toast";
import GruasAPI from "../../api/gruas";
import ConfirmModal from "../comunes/ConfirmModal";

const normalize = (res) => {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object") {
    for (const k of ["results", "items", "data", "rows"]) {
      if (Array.isArray(res[k])) return res[k];
    }
  }
  return [];
};

const toText = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "sí" : "no";
  if (typeof v === "object") {
    if (v?.nombre) return String(v.nombre);
    return "";
  }
  return "";
};

const STATUS_META = {
  ACTIVA:    { cls: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/30", label: "Activa" },
  CANCELADA: { cls: "bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/30",         label: "Cancelada" },
  VENCIDA:   { cls: "bg-gray-600/20 text-gray-300 ring-1 ring-gray-500/30",         label: "Vencida" },
  DEFAULT:   { cls: "bg-gray-700/40 text-gray-200 ring-1 ring-gray-600/30",         label: "—" },
};

/* -------- helpers de póliza -------- */
async function fetchPolizaById(polizaId) {
  // 1) Si GruasAPI la expone, usarla
  if (typeof GruasAPI?.getPoliza === "function") {
    return await GruasAPI.getPoliza(polizaId);
  }
  // 2) Intento con API de pólizas si existe
  try {
    const mod = await import("../../api/polizas");
    const PolizasAPI = mod.PolizasAPI || mod.default;
    if (PolizasAPI?.getPoliza) {
      return await PolizasAPI.getPoliza(polizaId);
    }
  } catch {
    /* no-op, probamos fetch genérico */
  }
  // 3) Fallback genérico HTTP
  const res = await fetch(`/api/polizas/${polizaId}/`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

const getClienteNombre = (p) => {
  if (!p) return "";
  const nombre = p?.cliente?.nombre || p?.titular?.nombre || p?.asegurado_nombre || "";
  const apellido = p?.cliente?.apellido || p?.titular?.apellido || p?.asegurado_apellido || "";
  const full = [nombre, apellido].filter(Boolean).join(" ").trim();
  return full || p?.cliente_nombre || "";
};

const getVehiculoTexto = (p) => {
  if (!p) return "";
  const partes = [p?.marca, p?.modelo, p?.anio && String(p.anio)].filter(Boolean);
  return partes.join(" ");
};

/* -------- Vista rápida de póliza (modal) -------- */
function PolizaQuickView({ open, onClose, poliza, loading = false }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 230, damping: 22 }}
            className="fixed inset-x-0 top-20 z-50 mx-auto w-full max-w-2xl rounded-2xl border border-gray-700 bg-gray-800 p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-400">Póliza</div>
                <div className="text-xl font-bold text-white">
                  {loading ? "Cargando…" : (poliza?.numero_poliza || poliza?.numero || `#${poliza?.id ?? "—"}`)}
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-9 w-9 rounded-xl bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
                aria-label="Cerrar"
              >
                <HiX />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {loading ? (
                <>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-gray-700/60 animate-pulse" />
                  ))}
                </>
              ) : (
                <>
                  <div className="rounded-lg bg-gray-900 p-3">
                    <div className="text-gray-400">Cliente</div>
                    <div className="font-medium">
                      {getClienteNombre(poliza)}
                    </div>
                    {poliza?.cliente?.dni_cuit_cuil && (
                      <div className="text-xs text-gray-400">{poliza.cliente.dni_cuit_cuil}</div>
                    )}
                  </div>

                  <div className="rounded-lg bg-gray-900 p-3">
                    <div className="text-gray-400">Compañía</div>
                    <div className="font-medium">
                      {poliza?.compania_nombre || poliza?.compania?.nombre || "—"}
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-900 p-3">
                    <div className="text-gray-400">Patente</div>
                    <div className="font-medium">{poliza?.patente || "—"}</div>
                  </div>

                  <div className="rounded-lg bg-gray-900 p-3">
                    <div className="text-gray-400">Vehículo</div>
                    <div className="font-medium">
                      {getVehiculoTexto(poliza) || "—"}
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-900 p-3">
                    <div className="text-gray-400">Vigencia</div>
                    <div className="font-medium">
                      {poliza?.inicio_vigencia ? new Date(poliza.inicio_vigencia).toLocaleDateString("es-AR") : "—"}{" "}
                      —{" "}
                      {poliza?.fin_vigencia ? new Date(poliza.fin_vigencia).toLocaleDateString("es-AR") : "—"}
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-900 p-3">
                    <div className="text-gray-400">Estado</div>
                    <div className="font-medium capitalize">
                      {String(poliza?.estado || "—").toLowerCase()}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              {poliza?.id && (
                <Link
                  to={`/polizas/${poliza.id}`}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm hover:bg-blue-700"
                >
                  Abrir detalle
                </Link>
              )}
              <button
                onClick={onClose}
                className="rounded-lg bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function AdhesionesTable() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filtros
  const [filtros, setFiltros] = useState({ q: "", estado: "" });
  const [qLocal, setQLocal] = useState("");

  // modal póliza
  const [showPoliza, setShowPoliza] = useState(false);
  const [polizaLoading, setPolizaLoading] = useState(false);
  const [polizaData, setPolizaData] = useState(null);

  // confirm eliminar
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // cache de pólizas por id para mostrar Asegurado/Modelo
  const [polizas, setPolizas] = useState({}); // { [id]: polizaData }

  async function load() {
    setLoading(true); setError("");
    try {
      const data = await GruasAPI.getAdhesiones?.({});
      const list = normalize(data);
      setItems(list);
    } catch (e) {
      setError(e?.message || "Error al cargar");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // debounce buscador
  useEffect(() => {
    const t = setTimeout(() => setFiltros((s) => ({ ...s, q: qLocal })), 350);
    return () => clearTimeout(t);
  }, [qLocal]);

  // Estados válidos (sin PAUSADA)
  const estados = useMemo(() => ["", "ACTIVA", "CANCELADA", "VENCIDA"], []);

  // Prefetch de pólizas para filas (cliente + vehículo)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = Array.from(
        new Set(
          (items || [])
            .map((a) => a?.poliza)
            .filter((id) => typeof id === "number" || typeof id === "string")
        )
      );
      const missing = ids.filter((id) => !(id in polizas));
      if (missing.length === 0) return;

      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
              const p = await fetchPolizaById(id);
              return [id, p];
            } catch (e) {
              console.warn("No pude cargar póliza", id, e?.message);
              return [id, null];
            }
          })
        );
        if (!cancelled && results.length) {
          setPolizas((curr) => {
            const next = { ...curr };
            for (const [id, p] of results) next[id] = p;
            return next;
          });
        }
      } catch {
        /* noop */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // ---- Confirmar / Eliminar ----
  const pedirConfirmacionEliminar = (row) => {
    setDeletingId(row?.id ?? null);
    setDeletingRow(row || null);
    setConfirmOpen(true);
  };

  const onConfirmEliminar = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await GruasAPI.eliminarAdhesion(deletingId);
      const labelPoliza = deletingRow?.poliza ? ` (Póliza #${deletingRow.poliza})` : "";
      toast.dismiss(); // 💡 evita toasts duplicados de otros flujos
      toast.success(`Adhesión #${deletingId}${labelPoliza} eliminada correctamente ✅`, { id: "adh-del-success" });
      setConfirmOpen(false);
      setDeletingId(null);
      setDeletingRow(null);
      await load();
    } catch (e) {
      toast.dismiss();
      toast.error(e?.message || "No se pudo eliminar la adhesión", { id: "adh-del-error" });
    } finally {
      setDeleting(false);
    }
  };

  const filtradas = useMemo(() => {
    let arr = Array.isArray(items) ? items.slice() : [];
    if (filtros.estado) arr = arr.filter(a => a?.estado === filtros.estado);
    if (filtros.q) {
      const q = filtros.q.toLowerCase();
      arr = arr.filter(a => {
        const p = polizas[a?.poliza];
        const cliente = getClienteNombre(p);
        const vehiculo = getVehiculoTexto(p);
        const campos = [
          a?.poliza,
          a?.estado,
          a?.plan?.nombre,
          a?.plan?.descripcion,
          a?.notas,
          cliente,
          vehiculo,
        ].map(toText).join(" ").toLowerCase();
        return campos.includes(q);
      });
    }
    return arr;
  }, [items, filtros, polizas]);

  const FilterChip = ({ value, children }) => (
    <button
      onClick={() => setFiltros((s) => ({ ...s, estado: value }))}
      className={`px-3 py-1 rounded text-sm transition border ${
        filtros.estado === value
          ? "bg-gray-600 text-white border-gray-500"
          : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
      }`}
      aria-pressed={filtros.estado === value}
    >
      {children}
    </button>
  );

  /* ---- Abrir modal de Póliza ---- */
  async function openPolizaModal(polizaId) {
    if (!polizaId) return;
    setShowPoliza(true);
    setPolizaLoading(true);
    setPolizaData(null);
    try {
      const data = await fetchPolizaById(polizaId);
      setPolizaData(data);
    } catch (e) {
      console.error(e);
      setPolizaData({ id: polizaId, error: e?.message || "No se pudo cargar la póliza" });
    } finally {
      setPolizaLoading(false);
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        {/* Filtros */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              {/* chips (desktop) — sin PAUSADA */}
              <div className="hidden md:flex items-center gap-2">
                <FilterChip value="">Todas</FilterChip>
                <FilterChip value="ACTIVA">Activa</FilterChip>
                <FilterChip value="CANCELADA">Cancelada</FilterChip>
                <FilterChip value="VENCIDA">Vencida</FilterChip>
              </div>
              {/* select (mobile) — sin PAUSADA */}
              <select
                className="md:hidden px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                value={filtros.estado}
                onChange={(e)=>setFiltros(s=>({...s, estado:e.target.value}))}
              >
                {estados.map(e => <option key={e || "todas"} value={e}>{e || "Todas"}</option>)}
              </select>

              {/* buscador */}
              <div className="flex items-center gap-2">
                <input
                  className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                  placeholder="Buscar (cliente, modelo, plan, estado, #póliza, notas)"
                  value={qLocal}
                  onChange={(e)=>setQLocal(e.target.value)}
                  onKeyDown={(e)=>{ if (e.key==="Enter") setFiltros((s)=>({ ...s, q: qLocal })); }}
                  aria-label="Buscar adhesiones"
                />
                {qLocal && (
                  <button
                    className="p-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
                    onClick={()=>{ setQLocal(""); setFiltros((s)=>({ ...s, q: "" })); }}
                    aria-label="Limpiar búsqueda"
                    title="Limpiar"
                  >
                    <HiX />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(filtros.estado || filtros.q) && (
                <button
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
                  onClick={()=>{ setFiltros({ estado:"", q:"" }); setQLocal(""); }}
                >
                  Limpiar filtros
                </button>
              )}
              <button className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700" onClick={load}>
                <HiRefresh className="inline -mt-0.5" /> Refrescar
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded bg-red-900/40 border border-red-700 text-red-200 text-sm">
              {error} — <button className="underline" onClick={load}>Reintentar</button>
            </div>
          )}
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="overflow-hidden rounded-lg border border-gray-700">
            <div className="p-6">
              <div className="h-3 w-40 bg-gray-700/60 rounded mb-4" />
              {[...Array(6)].map((_,i)=>(
                <div key={i} className="h-6 bg-gray-700/40 rounded mb-2" />
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-auto rounded-lg border border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-800 sticky top-0 z-10">
                <tr className="text-left text-gray-300 uppercase text-xs">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Póliza</th>
                  <th className="px-3 py-2">Asegurado / Vehículo</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Carencia fin</th>
                  <th className="px-3 py-2">Rehabilitar desde</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtradas.map((a) => {
                  const meta = STATUS_META[a?.estado] || STATUS_META.DEFAULT;
                  const usosMes = typeof a?.usos_mes === "number" ? a.usos_mes : null;
                  const usosVig = typeof a?.usos_vigencia === "number" ? a.usos_vigencia : null;
                  const isRowDeleting = deleting && deletingId === a.id;

                  const poliza = polizas[a?.poliza];
                  const cliente = getClienteNombre(poliza);
                  const vehiculo = getVehiculoTexto(poliza);

                  return (
                    <tr key={a.id} className="hover:bg-gray-900/50">
                      <td className="px-3 py-2 text-gray-400">#{a.id}</td>

                      {/* 🔗 Póliza clickeable -> modal */}
                      <td className="px-3 py-2">
                        {a?.poliza ? (
                          <button
                            onClick={() => openPolizaModal(a.poliza)}
                            className="text-blue-300 hover:text-blue-200 hover:underline underline-offset-2 rounded px-1 py-0.5"
                            title="Ver detalles de póliza"
                          >
                            #{toText(a.poliza)}
                          </button>
                        ) : (
                          <span>-</span>
                        )}
                      </td>

                      {/* 👤🚗 Asegurado / Vehículo */}
                      <td className="px-3 py-2">
                        {poliza === undefined ? (
                          <div className="h-5 w-40 bg-gray-700/50 rounded animate-pulse" />
                        ) : (
                          <>
                            <div className="font-medium truncate">{cliente || "—"}</div>
                            <div className="text-xs text-gray-400 truncate">{vehiculo || "—"}</div>
                          </>
                        )}
                      </td>

                      <td className="px-3 py-2">{toText(a.plan?.nombre) || "-"}</td>
                      <td className="px-3 py-2">{toText(a.fecha_carencia_fin) || "-"}</td>
                      <td className="px-3 py-2">{toText(a.rehabilitar_desde) || "-"}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${meta.cls}`}>
                          {meta.label}
                        </span>
                        {(usosMes !== null || usosVig !== null) && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {usosMes !== null && <>Mes: {usosMes}/1</>}
                            {usosMes !== null && usosVig !== null && " · "}
                            {usosVig !== null && <>Vigencia: {usosVig}/2</>}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className={`px-2 py-1 rounded border border-gray-700 ${isRowDeleting ? "bg-gray-700 text-gray-400 cursor-wait" : "bg-gray-800 hover:bg-gray-700"}`}
                            onClick={() => pedirConfirmacionEliminar(a)}
                            disabled={isRowDeleting}
                            title="Eliminar adhesión"
                          >
                            {isRowDeleting ? "Eliminando…" : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!Array.isArray(items) || filtradas.length === 0) && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-gray-400">
                      Sin datos. Probá{" "}
                      <button
                        className="underline"
                        onClick={()=>{ setFiltros({ estado:"", q:"" }); setQLocal(""); }}
                      >
                        limpiar filtros
                      </button>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Modal Vista Rápida de Póliza */}
      <PolizaQuickView
        open={showPoliza}
        onClose={() => setShowPoliza(false)}
        poliza={polizaData}
        loading={polizaLoading}
      />

      {/* Confirmación de eliminación */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => (!deleting ? setConfirmOpen(false) : null)}
        onConfirm={onConfirmEliminar}
        message={`¿Eliminar la adhesión #${deletingId || ""}${deletingRow?.poliza ? ` (Póliza #${deletingRow.poliza})` : ""}? Esta acción no se puede deshacer.`}
      />
    </>
  );
}
