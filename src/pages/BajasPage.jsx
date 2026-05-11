// src/pages/BajasPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import {
  HiDownload,
  HiChevronRight,
  HiChevronLeft,
  HiX,
  HiPaperAirplane,
  HiClipboardList,
  HiCheckCircle,
  HiSearch,
  HiChevronDown,
  HiOfficeBuilding,
  HiExclamationCircle,
  HiMail,
  HiRefresh,
  HiEye,
  HiArrowNarrowRight,
} from "react-icons/hi";
import ExcelJS from "exceljs";

import {
  fetchBajas,
  fetchBajasOficinas,
  fetchBajasCounters,
  fetchBajasGlobalCounters,
  selectBajas,
  selectBajasCount,
  selectBajasOficinas,
  selectBajasCounters,
  selectBajasGlobalCounters,
  apiGet,
  apiAction,
} from "../store/slices/bajasSlice";

import BajasTable from "../components/bajas/BajasTable";
import { useAuth } from "../context/AuthContext";

const STATUS = {
  ENVIAR: "PENDIENTE_ENVIO",
  ENVIADA: "ENVIADA",
  REALIZADA: "REALIZADA",
};

const LS = { oficina: "scope.bajas.oficina" };

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseDateRobusta(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [yy, mm, dd] = s.split("-").map(Number);
    return new Date(yy, mm - 1, dd);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a, b) {
  if (!a || !b) return 0;
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function getClienteInfo(p) {
  const nombre =
    (
      p?.cliente_nombre_completo ||
      `${p?.cliente_apellido || ""} ${p?.cliente_nombre || ""}`
    ).trim() || "Asegurado";
  return { nombre };
}

function formatDateTime(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const map = {
    PENDIENTE_ENVIO: { label: "Pendiente",  cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    ENVIADA:         { label: "Enviada",    cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    REALIZADA:       { label: "Realizada",  cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  };
  const cfg = map[status] || { label: status, cls: "bg-zinc-700/40 text-zinc-400 border-zinc-600/30" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold tracking-wide border ${cfg.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {cfg.label}
    </span>
  );
}

function KpiCard({ label, value, sub, accent = false, onClick, active = false }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative text-left p-5 rounded-xl border transition-all duration-200
        ${active
          ? "bg-zinc-800 border-zinc-600 shadow-lg shadow-black/20"
          : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60"
        }
        ${onClick ? "cursor-pointer" : "cursor-default"}
      `}
    >
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-light tabular-nums ${accent ? "text-rose-400" : "text-zinc-100"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
      {active && (
        <span className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-400 to-transparent" />
      )}
    </button>
  );
}

function SectionHeader({ children }) {
  return (
    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.18em] mb-3">
      {children}
    </p>
  );
}

// ─── Panel "Bajas del día" ────────────────────────────────────────────────────

function BajasDelDiaPanel({ umbralDias, oficina, isWebAdmin }) {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [preview, setPreview] = useState(null);
  const [sent, setSent] = useState({});

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet("bajas/operativo/digest-del-dia/", {
        dias: umbralDias,
        oficina: oficina || "",
      });
      setDigest(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [umbralDias, oficina]);

  useEffect(() => { cargar(); }, [cargar]);

  const toggleExpand = (cia) =>
    setExpanded((p) => ({ ...p, [cia]: !p[cia] }));

  const enviarGrupo = async (compania) => {
    setSending(true);
    try {
      await apiAction("bajas/operativo/enviar-baja-email/", "POST", { compania });
      setSent((p) => ({ ...p, [compania]: true }));
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const enviarTodos = async () => {
    setSending(true);
    try {
      await apiAction("bajas/operativo/enviar-bajas-del-dia/", "POST", {
        dias: umbralDias,
        oficina: oficina || "",
      });
      await cargar();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const grupos = digest?.grupos || [];
  const pendientes = grupos.filter(
    (g) => !sent[g.compania] && g.estado !== "ENVIADA"
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      {/* Header del panel */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
            <HiArrowNarrowRight className="text-zinc-400 text-base" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">Bajas del día</p>
            <p className="text-xs text-zinc-600">
              Pólizas con mora ≥ {umbralDias} días · agrupadas por compañía
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendientes.length > 0 && (
            <button
              onClick={enviarTodos}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 text-zinc-900 text-xs font-semibold hover:bg-white transition-colors disabled:opacity-40"
            >
              <HiArrowNarrowRight className="text-sm" />
              Enviar {pendientes.length} pendiente{pendientes.length > 1 ? "s" : ""}
            </button>
          )}
          <button
            onClick={cargar}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <HiRefresh className={`text-base ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Métricas rápidas */}
      {digest && (
        <div className="grid grid-cols-3 divide-x divide-zinc-800 border-b border-zinc-800">
          {[
            { label: "Compañías", value: grupos.length },
            { label: "Pólizas", value: digest.total_polizas || 0 },
            { label: "Ya enviadas", value: grupos.filter((g) => g.estado === "ENVIADA" || sent[g.compania]).length },
          ].map((m) => (
            <div key={m.label} className="px-6 py-3">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">{m.label}</p>
              <p className="text-xl font-light text-zinc-200 tabular-nums">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grupos */}
      <div className="divide-y divide-zinc-800/60">
        {loading && (
          <div className="py-12 flex justify-center">
            <div className="w-5 h-5 border border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
          </div>
        )}
        {!loading && grupos.length === 0 && (
          <div className="py-10 text-center text-xs text-zinc-600 uppercase tracking-widest">
            Sin bajas pendientes para hoy
          </div>
        )}
        {!loading &&
          grupos.map((g) => {
            const yaEnviada = sent[g.compania] || g.estado === "ENVIADA";
            const isOpen = expanded[g.compania];
            return (
              <div key={g.compania}>
                <button
                  onClick={() => toggleExpand(g.compania)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-800/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                      {(g.compania || "?").slice(0, 3).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{g.compania}</p>
                      <p className="text-xs text-zinc-600 truncate">
                        {g.email_destino || "Sin correo configurado"} · {g.polizas?.length || 0} pólizas
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {yaEnviada ? (
                      <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1.5">
                        <HiCheckCircle /> Enviado
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-500/80 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Pendiente
                      </span>
                    )}
                    <HiChevronDown
                      className={`text-zinc-600 text-base transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      {/* Mini tabla de pólizas */}
                      <div className="border-t border-zinc-800/60 bg-zinc-950/40">
                        <div className="grid grid-cols-4 px-6 py-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                          <span>Asegurado</span>
                          <span>Póliza</span>
                          <span>Patente</span>
                          <span>Mora</span>
                        </div>
                        {(g.polizas || []).slice(0, 5).map((p) => (
                          <div
                            key={p.id}
                            className="grid grid-cols-4 px-6 py-2.5 text-xs border-t border-zinc-800/40 hover:bg-zinc-800/20"
                          >
                            <span className="text-zinc-300 truncate">{p.asegurado || "—"}</span>
                            <span className="text-zinc-500 font-mono">{p.numero_poliza || "—"}</span>
                            <span className="text-zinc-400 font-mono uppercase">{p.patente || "—"}</span>
                            <span className={`font-semibold tabular-nums ${p.mora_dias > 15 ? "text-rose-400" : "text-amber-400"}`}>
                              {p.mora_dias}d
                            </span>
                          </div>
                        ))}
                        {(g.polizas?.length || 0) > 5 && (
                          <div className="px-6 py-2 text-xs text-zinc-700 border-t border-zinc-800/40">
                            + {g.polizas.length - 5} más
                          </div>
                        )}
                      </div>

                      {/* Acciones del grupo */}
                      <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800/60 bg-zinc-900/60">
                        <p className="text-xs text-zinc-600">
                          Para: <span className="text-zinc-400">{g.email_destino || "—"}</span>
                        </p>
                        {!yaEnviada && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setPreview(g)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
                            >
                              <HiEye className="text-sm" />
                              Preview
                            </button>
                            <button
                              onClick={() => enviarGrupo(g.compania)}
                              disabled={sending}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-900 bg-zinc-200 hover:bg-white font-semibold transition-colors disabled:opacity-40"
                            >
                              <HiArrowNarrowRight className="text-sm" />
                              Enviar
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
      </div>

      {/* Modal preview del email */}
      <AnimatePresence>
        {preview && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-black/60"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Preview del email</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{preview.compania}</p>
                </div>
                <button
                  onClick={() => setPreview(null)}
                  className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <HiX />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-1 text-xs text-zinc-500">
                  <p><span className="text-zinc-600 font-medium w-16 inline-block">Para:</span> <span className="text-zinc-300">{preview.email_destino}</span></p>
                  <p><span className="text-zinc-600 font-medium w-16 inline-block">Asunto:</span> <span className="text-zinc-300">Solicitud de baja — {preview.polizas?.length} pólizas por falta de pago</span></p>
                </div>
                <div className="h-px bg-zinc-800" />
                <div className="text-xs text-zinc-400 leading-relaxed space-y-3">
                  <p>Estimado equipo de <span className="text-zinc-200">{preview.compania}</span>,</p>
                  <p>Por medio de la presente solicitamos la baja de las siguientes pólizas por incumplimiento de pago:</p>
                  <div className="rounded-lg overflow-hidden border border-zinc-800">
                    <div className="grid grid-cols-4 px-4 py-2 bg-zinc-800/60 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                      <span>N° Póliza</span><span>Asegurado</span><span>Patente</span><span>Mora</span>
                    </div>
                    {(preview.polizas || []).map((p) => (
                      <div key={p.id} className="grid grid-cols-4 px-4 py-2 border-t border-zinc-800/60 text-zinc-400">
                        <span className="font-mono">{p.numero_poliza || "—"}</span>
                        <span className="truncate">{p.asegurado || "—"}</span>
                        <span className="font-mono uppercase">{p.patente || "—"}</span>
                        <span className={p.mora_dias > 15 ? "text-rose-400" : "text-amber-400"}>{p.mora_dias}d</span>
                      </div>
                    ))}
                  </div>
                  <p>Quedamos a disposición ante cualquier consulta.</p>
                  <p className="text-zinc-600">Thames Seguros · Sistema de gestión</p>
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-zinc-800">
                <button onClick={() => setPreview(null)} className="flex-1 py-2 rounded-lg text-xs text-zinc-400 border border-zinc-700 hover:border-zinc-500 transition-colors">Cerrar</button>
                <button
                  onClick={() => { enviarGrupo(preview.compania); setPreview(null); }}
                  disabled={sending}
                  className="flex-[2] py-2 rounded-lg text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <HiArrowNarrowRight /> Enviar a {preview.compania}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function BajasPage() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const items            = useSelector(selectBajas);
  const totalItemsCount  = useSelector(selectBajasCount);
  const oficinas         = useSelector(selectBajasOficinas);
  const sucursalKpis     = useSelector(selectBajasCounters)       || { total: 0, pendiente_envio: 0, enviada: 0, realizada: 0 };
  const adminGlobalKpis  = useSelector(selectBajasGlobalCounters) || { total: 0, pendiente_envio: 0, enviada: 0, realizada: 0 };

  const [oficina, setOficina] = useState(() => {
    if (!isWebAdmin && user?.perfil?.oficina)
      return String(user.perfil.oficina.id || user.perfil.oficina);
    return localStorage.getItem(LS.oficina) || "";
  });

  const [compania,     setCompania]     = useState("");
  const [search,       setSearch]       = useState("");
  const [activeTab,    setActiveTab]    = useState(STATUS.ENVIAR);
  const [umbralDias,   setUmbralDias]   = useState(15);
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState(15);
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [sortConfig,   setSortConfig]   = useState({ key: "_diasMora", direction: "desc" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: "", ids: [] });
  const [includeExcel, setIncludeExcel] = useState(false);
  const [historyOpen,  setHistoryOpen]  = useState(false);
  const [historyData,  setHistoryData]  = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [downloadingTab, setDownloadingTab] = useState(null);
  const [showDigest,   setShowDigest]   = useState(false);

  const companiasUnicas = useMemo(() => {
    const names = (items || []).map((p) => p.compania).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [items]);

  const loadGlobalTotals = useCallback((opts = {}) => {
    const ofi = opts.oficina !== undefined
      ? opts.oficina
      : (!isWebAdmin && user?.perfil?.oficina
        ? String(user.perfil.oficina.id || user.perfil.oficina)
        : oficina);
    const cia = opts.compania   !== undefined ? opts.compania   : compania;
    const d   = opts.umbralDias !== undefined ? opts.umbralDias : umbralDias;
    const q   = opts.search     !== undefined ? opts.search     : search;

    dispatch(fetchBajasCounters({ dias: d, oficina: ofi, compania: cia, search: q, include_canceladas: "1" }));
    if (isWebAdmin)
      dispatch(fetchBajasGlobalCounters({ dias: d, compania: cia, search: q, include_canceladas: "1" }));
  }, [dispatch, umbralDias, oficina, compania, search, isWebAdmin, user]);

  const loadTableData = useCallback((opts = {}) => {
    const o   = opts?.overrides || {};
    const tab = o.activeTab  ?? activeTab;
    const cia = o.compania   ?? compania;
    const dias= o.umbralDias ?? umbralDias;
    const q   = o.search     ?? search;
    const ofi = !isWebAdmin && user?.perfil?.oficina
      ? String(user.perfil.oficina.id || user.perfil.oficina)
      : (o.oficina ?? oficina);
    const pg  = o.page     ?? page;
    const ps  = o.pageSize ?? pageSize;

    dispatch(fetchBajas({
      params: {
        page: String(pg), page_size: String(ps),
        oficina: ofi, search: q, dias,
        include_finalizadas: "0", include_canceladas: "1",
        compania: cia || "",
        baja_estado: tab && tab !== "TODAS" ? tab : "",
      },
      force: !!opts.force,
    }));
    loadGlobalTotals({ oficina: ofi, compania: cia, umbralDias: dias, search: q });
  }, [dispatch, pageSize, oficina, search, umbralDias, compania, activeTab, loadGlobalTotals, isWebAdmin, user]);

  useEffect(() => { loadTableData(); }, [loadTableData]);
  useEffect(() => { dispatch(fetchBajasOficinas()); }, [dispatch]);
  useEffect(() => {
    if (isWebAdmin) localStorage.setItem(LS.oficina, oficina);
  }, [oficina, isWebAdmin]);
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadTableData({ force: true, overrides: { page: 1, search } });
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const enriched = useMemo(() => {
    const hoy = new Date();
    let data = (items || []).map((p) => {
      const proximaImpaga = parseDateRobusta(p.min_vto_impaga || p.proxima_vencimiento_impaga);
      const diasMora = proximaImpaga ? daysBetween(hoy, proximaImpaga) : 0;
      const { nombre } = getClienteInfo(p);
      return { ...p, _clienteNombre: nombre, _diasMora: diasMora, _requiereBaja: true, _bajaStatus: p.baja_estado || STATUS.ENVIAR };
    });
    if (sortConfig.key) {
      data.sort((a, b) => {
        let valA = a[sortConfig.key], valB = b[sortConfig.key];
        if (typeof valA === "string")
          return sortConfig.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        return sortConfig.direction === "asc" ? valA - valB : valB - valA;
      });
    }
    return data;
  }, [items, sortConfig]);

  const filtered = enriched.filter(
    (x) => (activeTab === "TODAS" || x._bajaStatus === activeTab) &&
            (compania === "" || x.compania === compania)
  );

  const totalPages = Math.ceil(totalItemsCount / pageSize) || 1;

  const handleSort = (key) =>
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));

  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await apiGet("bajas/historial/");
      if (data) setHistoryData(data.results || data);
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  };

  const updateBajaStatus = async (idsArray, nuevoEstado) => {
    try {
      await Promise.all(idsArray.map((id) =>
        apiAction(`bajas/operativo/${id}/estado/`, "POST", { estado: nuevoEstado })
      ));
      setSelectedIds(new Set());
      loadTableData({ force: true });
    } catch (e) { console.error(e); }
  };

  const generateAndDownloadExcel = async (rows) => {
    if (!rows?.length) return;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Bajas por Mora");
    ws.addRow(["Nombre y Apellido", "Patente", "Número de Póliza", "Compañía"]).eachCell((cell) => {
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FF18181B" } };
      cell.font   = { color: { argb: "FFFFFFFF" }, bold: true };
      cell.border = { bottom: { style: "thin", color: { argb: "FF3F3F46" } } };
    });
    rows.forEach((p) =>
      ws.addRow([p._clienteNombre || "Asegurado", p.patente || "S/D", p.numero_poliza || "S/N", p.compania || "S/D"])
    );
    ws.columns = [{ width: 35 }, { width: 15 }, { width: 25 }, { width: 25 }];
    const buffer = await wb.xlsx.writeBuffer();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    link.setAttribute("download", `Bajas_${activeTab}_${new Date().toLocaleDateString("es-AR")}.xlsx`);
    link.click();
  };

  const handleDownloadExcelFromBackend = async (e, tabId, isGlobal) => {
    e.stopPropagation();
    if (downloadingTab) return;
    setDownloadingTab(tabId);
    try {
      const token       = localStorage.getItem("access_token");
      const ofiFiltro   = isGlobal ? "ALL" : (!isWebAdmin && user?.perfil?.oficina ? String(user.perfil.oficina.id || user.perfil.oficina) : oficina);
      const estadoMap   = { [STATUS.ENVIAR]: "PENDIENTES", [STATUS.ENVIADA]: "ENVIADAS", [STATUS.REALIZADA]: "REALIZADAS" };
      const estadoBackend = estadoMap[tabId] || "UNIVERSO";

      const url = new URL(`${import.meta.env.VITE_API_URL}bajas/operativo/exportar-excel/`);
      url.searchParams.append("estado_tarjeta", estadoBackend);
      url.searchParams.append("dias", umbralDias);
      url.searchParams.append("include_canceladas", "1");
      if (ofiFiltro) url.searchParams.append("oficina", ofiFiltro);
      if (compania)  url.searchParams.append("compania", compania);
      if (search)    url.searchParams.append("search", search);

      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Error al descargar");
      const blob     = await res.blob();
      let   filename = `Bajas_${estadoBackend}_${new Date().toLocaleDateString("es-AR")}.xlsx`;
      const disp     = res.headers.get("Content-Disposition");
      if (disp?.includes("filename="))
        filename = disp.split("filename=")[1].replace(/"/g, "");
      const objectUrl = window.URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: objectUrl, download: filename });
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingTab(null);
    }
  };

  const executeAction = async () => {
    const { type, ids } = confirmModal;
    const safeIds       = ids.map((id) => String(id));
    const rowsToExport  = enriched.filter((p) => safeIds.includes(String(p.id)));
    if (type === "EXCEL") {
      await generateAndDownloadExcel(rowsToExport);
      setSelectedIds(new Set());
    } else {
      await updateBajaStatus(safeIds, type);
      if (includeExcel) await generateAndDownloadExcel(rowsToExport);
    }
    closeConfirmModal();
  };

  const openConfirmModal  = (type, ids) => { setIncludeExcel(false); setConfirmModal({ isOpen: true, type, ids }); };
  const closeConfirmModal = ()           => { setConfirmModal({ isOpen: false, type: "", ids: [] }); setIncludeExcel(false); };

  const MODAL_CONFIG = {
    EXCEL:    { title: "Exportar a Excel",    desc: "Descargar las pólizas seleccionadas en formato Excel.",           btnText: "Descargar",      icon: <HiDownload /> },
    ENVIADA:  { title: "Marcar como enviada", desc: "Las pólizas seleccionadas pasarán al estado 'Enviada'.",          btnText: "Confirmar",      icon: <HiPaperAirplane /> },
    REALIZADA:{ title: "Marcar como realizada", desc: "La compañía confirmó la baja. Esta acción cancela las pólizas.", btnText: "Sí, confirmar",  icon: <HiCheckCircle /> },
  };
  const activeModalConfig = MODAL_CONFIG[confirmModal.type] || MODAL_CONFIG.EXCEL;

  // ─── KPI tabs ─────────────────────────────────────────────────────────────

  const kpiTabs = [
    { id: STATUS.ENVIAR,   label: "Pendientes",  key: "pendiente_envio" },
    { id: STATUS.ENVIADA,  label: "Enviadas",    key: "enviada" },
    { id: STATUS.REALIZADA,label: "Realizadas",  key: "realizada" },
    { id: "TODAS",         label: "Total",       key: "total" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Encabezado ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-light text-zinc-100 tracking-tight flex items-center gap-3">
              <HiExclamationCircle className="text-rose-500 text-2xl shrink-0" />
              Bajas por mora
            </h1>
            <p className="text-sm text-zinc-600 mt-1">
              Pólizas candidatas a baja por deuda vencida
              {!isWebAdmin && user?.perfil?.oficina_nombre && (
                <span className="ml-2 text-zinc-500">· {user.perfil.oficina_nombre}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDigest((p) => !p)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${
                showDigest
                  ? "bg-zinc-800 border-zinc-600 text-zinc-200"
                  : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <HiMail className="text-sm" />
              Bajas del día
            </button>
            <button
              onClick={handleOpenHistory}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
            >
              <HiClipboardList className="text-sm" />
              Historial
            </button>
          </div>
        </div>

        {/* ── Panel digest (colapsable) ── */}
        <AnimatePresence>
          {showDigest && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <BajasDelDiaPanel
                umbralDias={umbralDias}
                oficina={oficina}
                isWebAdmin={isWebAdmin}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── KPIs globales (solo admin) ── */}
        {isWebAdmin && (
          <div>
            <SectionHeader>Métricas globales</SectionHeader>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpiTabs.map((t) => (
                <KpiCard
                  key={t.id}
                  label={t.label}
                  value={adminGlobalKpis?.[t.key] ?? 0}
                  accent={t.id === STATUS.ENVIAR}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── KPIs de sucursal / tabs ── */}
        <div>
          {isWebAdmin && <SectionHeader>Sucursal — {oficinas.find((o) => String(o.id) === String(oficina))?.nombre || "Todas"}</SectionHeader>}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpiTabs.map((t) => (
              <KpiCard
                key={t.id}
                label={t.label}
                value={sucursalKpis?.[t.key] ?? 0}
                accent={t.id === STATUS.ENVIAR}
                active={activeTab === t.id}
                onClick={() => {
                  setActiveTab(t.id);
                  setPage(1);
                  setSelectedIds(new Set());
                  loadTableData({ force: true, overrides: { activeTab: t.id, page: 1 } });
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Panel de tabla ── */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">

          {/* Barra de filtros */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-zinc-800">

            {/* Selección info */}
            <div className="flex items-center gap-2 mr-2">
              <span className={`text-xs font-medium tabular-nums transition-colors ${selectedIds.size ? "text-zinc-300" : "text-zinc-700"}`}>
                {selectedIds.size} seleccionadas
              </span>
              {selectedIds.size > 0 && (
                <button onClick={() => setSelectedIds(new Set())} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                  Limpiar
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-wrap gap-2 items-center">
              {/* Búsqueda */}
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Patente, nombre o póliza..."
                  className="w-56 bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg pl-9 pr-3 py-2 text-xs placeholder:text-zinc-700 focus:border-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Oficina (admin) */}
              {isWebAdmin && (
                <select
                  value={oficina}
                  onChange={(e) => { setOficina(e.target.value); setPage(1); loadTableData({ force: true, overrides: { oficina: e.target.value, page: 1 } }); }}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg px-3 py-2 text-xs focus:border-zinc-600 focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="">Todas las sucursales</option>
                  {oficinas.map((o) => (
                    <option key={o.id} value={o.id}>{o.nombre}</option>
                  ))}
                </select>
              )}

              {/* Compañía */}
              <select
                value={compania}
                onChange={(e) => { setCompania(e.target.value); setPage(1); loadTableData({ force: true, overrides: { compania: e.target.value, page: 1 } }); }}
                className="bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg px-3 py-2 text-xs focus:border-zinc-600 focus:outline-none transition-colors cursor-pointer"
              >
                <option value="">Todas las compañías</option>
                {companiasUnicas.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Umbral días */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-600">Mora mín.</span>
                <input
                  type="number"
                  value={umbralDias}
                  onChange={(e) => { setUmbralDias(Number(e.target.value)); setPage(1); loadTableData({ force: true, overrides: { umbralDias: Number(e.target.value), page: 1 } }); }}
                  className="w-16 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-2 py-2 text-xs text-center focus:border-zinc-600 focus:outline-none transition-colors"
                />
                <span className="text-xs text-zinc-600">días</span>
              </div>
            </div>

            {/* Acciones masivas */}
            <div className="flex items-center gap-2">
              <button
                disabled={!selectedIds.size}
                onClick={() => openConfirmModal("EXCEL", Array.from(selectedIds))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                <HiDownload className="text-sm" /> Excel
              </button>
              <button
                disabled={!selectedIds.size}
                onClick={() => openConfirmModal("ENVIADA", Array.from(selectedIds))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                <HiPaperAirplane className="text-sm" /> Enviada
              </button>
              <button
                disabled={!selectedIds.size}
                onClick={() => openConfirmModal("REALIZADA", Array.from(selectedIds))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                <HiCheckCircle className="text-sm" /> Realizada
              </button>
            </div>
          </div>

          {/* Tabla */}
          <BajasTable
            items={filtered}
            selectedIds={selectedIds}
            sortConfig={sortConfig}
            onSort={handleSort}
            onToggleSelect={(id) =>
              setSelectedIds((prev) => {
                const n = new Set(prev);
                const s = String(id);
                n.has(s) ? n.delete(s) : n.add(s);
                return n;
              })
            }
            onSelectAllVisible={(check) =>
              setSelectedIds(check ? new Set(filtered.map((x) => String(x.id))) : new Set())
            }
            onComposeEmail={(ids) => openConfirmModal("EXCEL", ids)}
            onSetStatus={(id, s) => openConfirmModal(s, [id])}
          />

          {/* Paginación */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-800">
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-600">Filas</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); loadTableData({ force: true, overrides: { pageSize: Number(e.target.value), page: 1 } }); }}
                className="bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg px-2 py-1.5 text-xs focus:border-zinc-600 focus:outline-none transition-colors cursor-pointer"
              >
                {[15, 30, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={page === 1}
                onClick={() => { const np = page - 1; setPage(np); loadTableData({ force: true, overrides: { page: np } }); }}
                className="p-2 rounded-lg text-zinc-500 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                <HiChevronLeft />
              </button>
              <span className="text-xs text-zinc-500 tabular-nums min-w-[80px] text-center">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => { const np = page + 1; setPage(np); loadTableData({ force: true, overrides: { page: np } }); }}
                className="p-2 rounded-lg text-zinc-500 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                <HiChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal historial ── */}
      <AnimatePresence>
        {historyOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl shadow-black/60"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <HiClipboardList className="text-zinc-400 text-lg" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Historial de bajas</p>
                    <p className="text-xs text-zinc-600 mt-0.5">Registro de cambios de estado</p>
                  </div>
                </div>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <HiX />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-2">
                {historyLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="w-5 h-5 border border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
                  </div>
                ) : historyData.length === 0 ? (
                  <p className="text-center text-xs text-zinc-700 uppercase tracking-widest py-16">Sin registros</p>
                ) : (
                  historyData.map((mov) => (
                    <div
                      key={mov.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-4 rounded-xl border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-600 mb-1">{formatDateTime(mov.fecha)}</p>
                        <p className="text-sm font-medium text-zinc-200 truncate">
                          {mov.cliente_nombre}
                          <span className="text-zinc-500 font-normal ml-2 text-xs">· {mov.compania}</span>
                        </p>
                        <p className="text-xs text-zinc-600 mt-0.5 font-mono">
                          {mov.poliza_numero || "S/N"} · {mov.patente || "S/P"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusPill status={mov.estado_anterior || "PENDIENTE_ENVIO"} />
                        <HiChevronRight className="text-zinc-700 text-sm" />
                        <StatusPill status={mov.estado_nuevo} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal confirmar acción ── */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/60"
            >
              <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-800">
                <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                  {activeModalConfig.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{activeModalConfig.title}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{confirmModal.ids.length} póliza{confirmModal.ids.length !== 1 ? "s" : ""} seleccionada{confirmModal.ids.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-zinc-400 leading-relaxed">{activeModalConfig.desc}</p>
                {confirmModal.type !== "EXCEL" && (
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={includeExcel}
                      onChange={(e) => setIncludeExcel(e.target.checked)}
                      className="w-4 h-4 accent-zinc-300 cursor-pointer"
                    />
                    <span className="text-xs text-zinc-400">Generar Excel simultáneamente</span>
                  </label>
                )}
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-zinc-800">
                <button
                  onClick={closeConfirmModal}
                  className="flex-1 py-2.5 rounded-xl text-xs text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeAction}
                  className="flex-[2] py-2.5 rounded-xl text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-white transition-colors"
                >
                  {activeModalConfig.btnText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
