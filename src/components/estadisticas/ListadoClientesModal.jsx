// src/components/estadisticas/ListadoClientesModal.jsx  (diseño Duo)
import { Fragment, useEffect, useState, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  HiX, HiUserGroup, HiChevronLeft, HiChevronRight,
  HiRefresh, HiExclamation, HiBadgeCheck, HiTrash, HiDownload, HiChartBar,
  HiOutlineClipboardCopy
} from "react-icons/hi";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function ListadoClientesModal({
  isOpen,
  onClose,
  tipo,
  filtros,
  apiBase,
  getOficinaNombre
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ results: [], count: 0, total_pages: 1 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const config = useMemo(() => {
    switch (tipo) {
      case "VENCIDAS":
        return { title: "Asegurados en Mora (Vencidos)", icon: <HiExclamation className="text-[#d97706] dark:text-tarjeta-claro" />, accent: "border-tarjeta/40", btn: "hover:border-tarjeta hover:text-[#d97706] dark:hover:text-tarjeta-claro" };
      case "BAJAS":
        return { title: "Pólizas Dadas de Baja", icon: <HiTrash className="text-egreso" />, accent: "border-egreso/40", btn: "hover:border-egreso hover:text-egreso" };
      case "ACTIVAS":
        return { title: "Asegurados Activos", icon: <HiBadgeCheck className="text-ingreso" />, accent: "border-ingreso/40", btn: "hover:border-ingreso hover:text-ingreso" };
      case "ACTIVAS_AL_DIA":
        return { title: "Activos al día — última cuota paga", icon: <HiBadgeCheck className="text-ingreso" />, accent: "border-ingreso/40", btn: "hover:border-ingreso hover:text-ingreso" };
      case "ACTIVAS_EN_MORA":
        return { title: "Activos con última cuota vencida", icon: <HiExclamation className="text-[#d97706] dark:text-tarjeta-claro" />, accent: "border-tarjeta/40", btn: "hover:border-tarjeta hover:text-[#d97706] dark:hover:text-tarjeta-claro" };
      case "ALTAS":
        return { title: "Nuevas Pólizas (Altas)", icon: <HiUserGroup className="text-oficina" />, accent: "border-oficina/40", btn: "hover:border-oficina hover:text-oficina" };
      case "TOTALES":
        return { title: "Stock Total de Pólizas", icon: <HiChartBar className="text-oficina" />, accent: "border-oficina/40", btn: "hover:border-oficina hover:text-oficina" };
      default:
        return { title: "Listado de Asegurados", icon: <HiUserGroup className="text-suave dark:text-suave-dark" />, accent: "border-linea dark:border-linea-dark", btn: "hover:border-oficina hover:text-oficina" };
    }
  }, [tipo]);

  const fetchListado = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", "15");

      if (filtros.oficina && filtros.oficina !== "TODAS") {
        params.set("oficina", filtros.oficina);
      }

      let url = "";

      if (tipo === "ACTIVAS" || tipo === "TOTALES" || tipo === "ACTIVAS_AL_DIA" || tipo === "ACTIVAS_EN_MORA") {
        url = `${apiBase}estadisticas/vehiculos/list/`;
        params.set("orden", "id");
        params.set("dir", "desc");
        if (tipo === "ACTIVAS")        params.set("solo_activas", "1");
        if (tipo === "ACTIVAS_AL_DIA") { params.set("solo_activas", "1"); params.set("solo_al_dia", "1"); }
        if (tipo === "ACTIVAS_EN_MORA"){ params.set("solo_activas", "1"); params.set("solo_en_mora", "1"); }
      }
      else {
        url = `${apiBase}polizas/`;
        params.set("ordering", "-id");
        if (tipo === "VENCIDAS") params.set("estado", "Vencida");
        if (tipo === "BAJAS") params.set("estado", "Cancelada");
        if (tipo === "ALTAS") params.set("estado", "Activa");
      }

      let res = await fetch(`${url}?${params.toString()}`, { headers });
      let json = await res.json();

      if (url.includes("/polizas/") && (json.count === 0 || !json.results)) {
         params.set("estado", params.get("estado").toUpperCase());
         const res2 = await fetch(`${url}?${params.toString()}`, { headers });
         const json2 = await res2.json();
         if (json2.count > 0) json = json2;
      }

      if (url.includes("/polizas/") && (json.count === 0 || !json.results)) {
         params.delete("estado");
         params.delete("ordering");
         params.set("orden", "id");
         params.set("dir", "desc");

         if (tipo === "VENCIDAS") params.set("search", "Vencida");
         if (tipo === "BAJAS") params.set("search", "Cancelada");
         if (tipo === "ALTAS") params.set("solo_activas", "1");

         const res3 = await fetch(`${apiBase}estadisticas/vehiculos/list/?${params.toString()}`, { headers });
         const json3 = await res3.json();
         if (json3.count > 0) json = json3;
      }

      let itemsArray = [];
      let totalCount = 0;

      if (Array.isArray(json)) {
        itemsArray = json;
        totalCount = json.length;
      } else if (Array.isArray(json.results)) {
        itemsArray = json.results;
        totalCount = json.count || itemsArray.length;
      } else if (Array.isArray(json.data)) {
        itemsArray = json.data;
        totalCount = json.count || itemsArray.length;
      }

      setData({
        results: itemsArray,
        count: totalCount,
        total_pages: json.total_pages || Math.ceil(totalCount / 15) || 1
      });

    } catch (e) {
      console.error(e);
      setError("No se pudo cargar la lista. Verificá la conexión.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchListado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, page, tipo, filtros.oficina]);

  useEffect(() => { if (isOpen) setPage(1); }, [tipo, isOpen]);

  // 🚀 FUNCIÓN PARA COPIAR AL PORTAPAPELES
  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copiado: ${text}`, {
        style: { background: '#10b981', color: '#fff', fontWeight: 'bold' },
        iconTheme: { primary: '#fff', secondary: '#10b981' }
      });
    }).catch(() => {
      toast.error("Error al copiar");
    });
  };

  const downloadCsv = () => {
    if (!data.results.length) return;
    const rows = data.results.map((item) => {
      const clienteNombre = item.cliente ? `${item.cliente.apellido || ""} ${item.cliente.nombre || ""}`.trim() : (item.cliente_nombre_completo || item.asegurado || "");
      return {
        Poliza: item.numero_poliza || item.id || "",
        Asegurado: clienteNombre,
        DNI: item.cliente?.dni_cuit_cuil || item.dni_cuit_cuil || "",
        Patente: item.patente || "",
        Vehiculo: `${item.marca || ""} ${item.modelo || ""}`.trim(),
        Compania: item.compania_nombre || item.compania?.nombre || item.compania || "",
        Estado: item.estado || ""
      };
    });

    const header = Object.keys(rows[0]);
    const csv = [
      header.join(","),
      ...rows.map((r) => header.map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reporte_${tipo}_Pagina${page}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" />

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className={`w-full max-w-5xl overflow-hidden rounded-3xl border-2 ${config.accent} bg-card dark:bg-card-dark shadow-2xl transition-all`}>

              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-linea dark:border-linea-dark px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-xl">
                    {config.icon}
                  </div>
                  <div>
                    <Dialog.Title className="text-lg font-black text-titulo dark:text-titulo-dark leading-none">
                      {config.title}
                    </Dialog.Title>
                    <p className="mt-1 text-xs font-bold text-suave dark:text-suave-dark">
                      Total encontrados: <span className="font-black text-titulo dark:text-titulo-dark">{Number(data.count).toLocaleString("es-AR")}</span> registros.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadCsv}
                    disabled={data.results.length === 0}
                    className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-linea dark:border-linea-dark text-xs font-black transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-titulo dark:text-titulo-dark ${config.btn}`}
                  >
                    <HiDownload className="text-sm" /> Exportar a Excel
                  </button>
                  <button onClick={onClose} className="rounded-xl border-2 border-linea dark:border-linea-dark p-2 text-suave dark:text-suave-dark hover:border-egreso hover:text-egreso transition-colors cursor-pointer">
                    <HiX className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Contenido / Tabla */}
              <div className="p-4 sm:p-6">
                {error ? (
                  <div className="flex flex-col items-center justify-center py-10 text-egreso">
                    <HiExclamation className="h-10 w-10 mb-2" />
                    <p className="font-black">{error}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
                          <th className="px-4 py-3 text-left font-black text-suave dark:text-suave-dark uppercase tracking-tight text-[10px]">Asegurado</th>
                          <th className="px-4 py-3 text-left font-black text-suave dark:text-suave-dark uppercase tracking-tight text-[10px]">Póliza / Cía</th>
                          <th className="px-4 py-3 text-left font-black text-suave dark:text-suave-dark uppercase tracking-tight text-[10px]">Vehículo</th>
                          <th className="px-4 py-3 text-left font-black text-suave dark:text-suave-dark uppercase tracking-tight text-[10px]">Oficina</th>
                          <th className="px-4 py-3 text-right font-black text-suave dark:text-suave-dark uppercase tracking-tight text-[10px]">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-linea/50 dark:divide-linea-dark/50">
                        {loading ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-20 text-center text-suave dark:text-suave-dark">
                              <HiRefresh className="h-8 w-8 animate-spin mx-auto mb-2 opacity-40" />
                              Cargando registros...
                            </td>
                          </tr>
                        ) : data.results.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-10 text-center text-suave dark:text-suave-dark italic font-bold">No se encontraron registros para este filtro.</td>
                          </tr>
                        ) : (
                          data.results.map((item, idx) => {
                            const clienteNombre = item.cliente ? `${item.cliente.apellido || ""} ${item.cliente.nombre || ""}`.trim() : (item.cliente_nombre_completo || item.asegurado || "—");
                            const dni = item.cliente?.dni_cuit_cuil || item.dni_cuit_cuil || "—";
                            const compania = item.compania_nombre || item.compania?.nombre || item.compania || "—";
                            const nroPoliza = item.numero_poliza || item.id || "—";

                            return (
                              <tr key={item.id || idx} className="hover:bg-oficina/5 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <div className="font-black text-titulo dark:text-titulo-dark">{clienteNombre}</div>
                                    <button onClick={() => handleCopy(clienteNombre, "Asegurado")} className="cursor-pointer text-suave dark:text-suave-dark hover:text-ingreso transition-colors" title="Copiar Asegurado">
                                      <HiOutlineClipboardCopy size={14} />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="text-[11px] font-bold text-suave dark:text-suave-dark">DNI: {dni}</div>
                                    {dni !== "—" && (
                                      <button onClick={() => handleCopy(dni, "DNI")} className="cursor-pointer text-suave dark:text-suave-dark hover:text-ingreso transition-colors" title="Copiar DNI">
                                        <HiOutlineClipboardCopy size={12} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <div className="font-black text-titulo dark:text-titulo-dark">N° {nroPoliza}</div>
                                    {nroPoliza !== "—" && (
                                      <button onClick={() => handleCopy(nroPoliza, "N° de Póliza")} className="cursor-pointer text-suave dark:text-suave-dark hover:text-ingreso transition-colors" title="Copiar Póliza">
                                        <HiOutlineClipboardCopy size={14} />
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-[11px] font-bold text-suave dark:text-suave-dark">{compania}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-bold text-titulo dark:text-titulo-dark">{item.marca} {item.modelo}</div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="text-[11px] font-mono font-black text-oficina">{item.patente || "SIN PATENTE"}</div>
                                    {item.patente && (
                                      <button onClick={() => handleCopy(item.patente, "Patente")} className="cursor-pointer text-suave dark:text-suave-dark hover:text-ingreso transition-colors" title="Copiar Patente">
                                        <HiOutlineClipboardCopy size={14} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-xs font-bold text-suave dark:text-suave-dark">
                                  {item.oficina_nombre || getOficinaNombre(item.oficina)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`inline-flex rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest border-2 ${
                                    String(item.estado).toUpperCase() === 'ACTIVA' ? 'bg-ingreso/10 text-ingreso border-ingreso/30' :
                                    String(item.estado).toUpperCase() === 'VENCIDA' ? 'bg-tarjeta/10 text-[#d97706] dark:text-tarjeta-claro border-tarjeta/30' :
                                    item.estado === 'CANCELADA' || item.estado === 'ANULADA' ? 'bg-egreso/10 text-egreso border-egreso/30' :
                                    'bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark'
                                  }`}>
                                    {item.estado}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Paginación */}
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs font-bold text-suave dark:text-suave-dark">
                    Página <span className="font-black text-titulo dark:text-titulo-dark">{page}</span> de {data.total_pages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={page === 1 || loading}
                      onClick={() => setPage(p => p - 1)}
                      className="inline-flex items-center gap-1 rounded-xl border-2 border-linea dark:border-linea-dark px-3 py-2 text-xs font-black text-titulo dark:text-titulo-dark hover:border-oficina hover:text-oficina disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                    >
                      <HiChevronLeft /> Anterior
                    </button>
                    <button
                      disabled={page >= data.total_pages || loading}
                      onClick={() => setPage(p => p + 1)}
                      className="inline-flex items-center gap-1 rounded-xl border-2 border-linea dark:border-linea-dark px-3 py-2 text-xs font-black text-titulo dark:text-titulo-dark hover:border-oficina hover:text-oficina disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente <HiChevronRight />
                    </button>
                  </div>
                </div>
              </div>

            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
