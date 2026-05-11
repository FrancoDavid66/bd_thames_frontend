// src/components/estadisticas/ListadoClientesModal.jsx
import { Fragment, useEffect, useState, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  HiX, HiUserGroup, HiChevronLeft, HiChevronRight,
  HiRefresh, HiExclamation, HiBadgeCheck, HiTrash,
  HiDownload, HiChartBar, HiOutlineClipboardCopy,
} from "react-icons/hi";

const token = () => localStorage.getItem("access_token") || localStorage.getItem("token") || "";
const authH = () => token() ? { Authorization: `Bearer ${token()}` } : {};

const CONFIGS = {
  VENCIDAS:  { title: "Asegurados en mora",     icon: HiExclamation,  accent: "text-amber-400",   border: "border-amber-500/20"  },
  BAJAS:     { title: "Pólizas dadas de baja",  icon: HiTrash,        accent: "text-rose-400",    border: "border-rose-500/20"   },
  ACTIVAS:   { title: "Asegurados activos",      icon: HiBadgeCheck,   accent: "text-emerald-400", border: "border-emerald-500/20" },
  ALTAS:     { title: "Nuevas pólizas (altas)",  icon: HiUserGroup,    accent: "text-sky-400",     border: "border-sky-500/20"    },
  TOTALES:   { title: "Stock total de pólizas",  icon: HiChartBar,     accent: "text-violet-400",  border: "border-violet-500/20" },
  _default:  { title: "Listado de asegurados",  icon: HiUserGroup,    accent: "text-slate-400",   border: "border-slate-700"     },
};

const estadoBadge = (estado) => {
  const e = String(estado || "").toUpperCase();
  if (e === "ACTIVA")                          return "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400";
  if (e === "VENCIDA")                         return "bg-amber-500/10 border border-amber-500/20 text-amber-400";
  if (e === "CANCELADA" || e === "ANULADA")    return "bg-rose-500/10 border border-rose-500/20 text-rose-400";
  return "bg-slate-700/30 border border-slate-700 text-slate-400";
};

export default function ListadoClientesModal({ isOpen, onClose, tipo, filtros, apiBase, getOficinaNombre }) {
  const [loading, setLoading] = useState(false);
  const [data,    setData]    = useState({ results: [], count: 0, total_pages: 1 });
  const [page,    setPage]    = useState(1);
  const [error,   setError]   = useState("");

  const cfg = CONFIGS[tipo] || CONFIGS._default;
  const Icon = cfg.icon;

  const fetchListado = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), page_size: "15" });
      if (filtros.oficina && filtros.oficina !== "TODAS") params.set("oficina", filtros.oficina);

      let url = "";
      if (tipo === "ACTIVAS" || tipo === "TOTALES") {
        url = `${apiBase}estadisticas/vehiculos/list/`;
        params.set("orden", "id"); params.set("dir", "desc");
        if (tipo === "ACTIVAS") params.set("solo_activas", "1");
      } else {
        url = `${apiBase}polizas/`;
        params.set("ordering", "-id");
        if (tipo === "VENCIDAS") params.set("estado", "Vencida");
        if (tipo === "BAJAS")    params.set("estado", "Cancelada");
        if (tipo === "ALTAS")    params.set("estado", "Activa");
      }

      let res = await fetch(`${url}?${params}`, { headers: authH() });
      let json = await res.json();

      // Fallbacks
      if (url.includes("/polizas/") && (!json.results || json.count === 0)) {
        params.set("estado", (params.get("estado")||"").toUpperCase());
        const r2 = await fetch(`${url}?${params}`, { headers: authH() }); const j2 = await r2.json();
        if (j2.count > 0) json = j2;
      }
      if (url.includes("/polizas/") && (!json.results || json.count === 0)) {
        params.delete("estado"); params.delete("ordering"); params.set("orden","id"); params.set("dir","desc");
        if (tipo === "ALTAS") params.set("solo_activas","1");
        const r3 = await fetch(`${apiBase}estadisticas/vehiculos/list/?${params}`, { headers: authH() }); const j3 = await r3.json();
        if (j3.count > 0) json = j3;
      }

      const items = Array.isArray(json) ? json : Array.isArray(json.results) ? json.results : Array.isArray(json.data) ? json.data : [];
      const count = Array.isArray(json) ? json.length : json.count || items.length;
      setData({ results: items, count, total_pages: json.total_pages || Math.ceil(count / 15) || 1 });
    } catch {
      setError("No se pudo cargar la lista. Verificá la conexión.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen) fetchListado(); }, [isOpen, page, tipo, filtros.oficina]);
  useEffect(() => { if (isOpen) setPage(1); }, [tipo, isOpen]);

  const copy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copiado`)).catch(() => toast.error("Error al copiar"));
  };

  const downloadCsv = () => {
    if (!data.results.length) return;
    const rows = data.results.map(item => {
      const nombre = item.cliente ? `${item.cliente.apellido||""} ${item.cliente.nombre||""}`.trim() : (item.asegurado || "");
      return { Asegurado: nombre, DNI: item.cliente?.dni_cuit_cuil || item.dni_cuit_cuil || "", Patente: item.patente || "", Vehiculo: `${item.marca||""} ${item.modelo||""}`.trim(), Compania: item.compania_nombre || item.compania?.nombre || item.compania || "", Estado: item.estado || "" };
    });
    const header = Object.keys(rows[0]);
    const csv = [header.join(","), ...rows.map(r => header.map(k => `"${String(r[k]??"")}"`).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));
    a.download = `Reporte_${tipo}_p${page}.csv`; a.click();
  };

  return (
    <Transition.Root show={!!isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95 translate-y-2" enterTo="opacity-100 scale-100 translate-y-0" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className={`w-full max-w-4xl rounded-2xl border ${cfg.border} bg-slate-950 shadow-2xl overflow-hidden`}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800 ${cfg.accent}`}>
                      <Icon className="text-sm" />
                    </div>
                    <div>
                      <Dialog.Title className="text-sm font-semibold text-slate-100">{cfg.title}</Dialog.Title>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {Number(data.count).toLocaleString("es-AR")} registros
                        {filtros.oficina ? ` · ${getOficinaNombre(filtros.oficina)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={downloadCsv} disabled={!data.results.length}
                      className="h-8 flex items-center gap-1.5 px-3 rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors text-xs disabled:opacity-30">
                      <HiDownload className="text-xs" /> CSV
                    </button>
                    <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors">
                      <HiX className="text-sm" />
                    </button>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-5">
                  {error ? (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-3 text-xs text-rose-300">
                      <HiExclamation className="shrink-0" /> {error}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-800 overflow-hidden">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/80">
                            <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Asegurado</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Póliza / Cía</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Vehículo</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Oficina</th>
                            <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {loading ? (
                            <tr><td colSpan={5} className="py-16 text-center">
                              <HiRefresh className="h-6 w-6 animate-spin mx-auto text-slate-700 mb-2" />
                              <span className="text-xs text-slate-600">Cargando registros...</span>
                            </td></tr>
                          ) : data.results.length === 0 ? (
                            <tr><td colSpan={5} className="py-12 text-center text-xs text-slate-600">Sin registros para este filtro.</td></tr>
                          ) : data.results.map((item, idx) => {
                            const nombre  = item.cliente ? `${item.cliente.apellido||""} ${item.cliente.nombre||""}`.trim() : (item.asegurado || "—");
                            const dni     = item.cliente?.dni_cuit_cuil || item.dni_cuit_cuil || "—";
                            const compania = item.compania_nombre || item.compania?.nombre || item.compania || "—";
                            const nro     = item.numero_poliza || item.id || "—";
                            return (
                              <motion.tr key={item.id||idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                                className="hover:bg-slate-800/20 transition-colors group">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-slate-200">{nombre}</span>
                                    <button onClick={() => copy(nombre,"Asegurado")} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-400">
                                      <HiOutlineClipboardCopy className="text-xs" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] text-slate-600">DNI: {dni}</span>
                                    {dni !== "—" && <button onClick={() => copy(dni,"DNI")} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-400"><HiOutlineClipboardCopy className="text-[10px]"/></button>}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-slate-300">N° {nro}</span>
                                    {nro !== "—" && <button onClick={() => copy(nro,"N° Póliza")} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-400"><HiOutlineClipboardCopy className="text-xs"/></button>}
                                  </div>
                                  <div className="text-[10px] text-slate-600 mt-0.5">{compania}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-slate-300">{item.marca} {item.modelo}</div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] font-mono text-sky-400/80">{item.patente || "SIN PATENTE"}</span>
                                    {item.patente && <button onClick={() => copy(item.patente,"Patente")} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-400"><HiOutlineClipboardCopy className="text-xs"/></button>}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-[11px] text-slate-500">{item.oficina_nombre || getOficinaNombre(item.oficina)}</td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${estadoBadge(item.estado)}`}>{item.estado}</span>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Paginación */}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[10px] text-slate-600">Página {page} de {data.total_pages}</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setPage(p => p-1)} disabled={page === 1 || loading}
                        className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors">
                        <HiChevronLeft className="text-xs" />
                      </button>
                      <button onClick={() => setPage(p => p+1)} disabled={page >= data.total_pages || loading}
                        className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors">
                        <HiChevronRight className="text-xs" />
                      </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}