// src/components/pagos/HistorialRecordatorios.jsx
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiClock,
  HiRefresh,
  HiOfficeBuilding,
  HiPhone,
  HiUser,
  HiCheckCircle,
  HiXCircle,
  HiSearch,
} from "react-icons/hi";

// 🚀 IMPORTAMOS CONTEXTO PARA SEGURIDAD
import { useAuth } from "../../context/AuthContext";

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  const horas = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${anio} ${horas}:${mins}`;
}

function formatMoney(value) {
  if (value == null) return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  return `$${num.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function estadoChip(estadoRaw) {
  const estado = (estadoRaw || "").toUpperCase();
  if (estado === "OK") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-200 border border-emerald-400/40 px-2 py-0.5 text-[11px]">
        <HiCheckCircle className="w-3 h-3" />
        OK
      </span>
    );
  }
  if (estado === "ERROR") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-200 border border-rose-400/40 px-2 py-0.5 text-[11px]">
        <HiXCircle className="w-3 h-3" />
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 text-gray-200 border border-gray-500/40 px-2 py-0.5 text-[11px]">
      {estado || "N/D"}
    </span>
  );
}

export default function HistorialRecordatorios({
  items = [],
  loading = false,
  onRefresh,
}) {
  // 🚀 Obtenemos datos del usuario logueado
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const [search, setSearch] = useState("");
  const [oficinaFilter, setOficinaFilter] = useState("TODAS");

  const oficinas = useMemo(() => {
    const set = new Set();
    (items || []).forEach((it) => {
      if (it.oficina) set.add(String(it.oficina));
    });
    return Array.from(set).sort();
  }, [items]);

  const filtrados = useMemo(() => {
    let data = Array.isArray(items) ? [...items] : [];

    if (oficinaFilter !== "TODAS") {
      data = data.filter(
        (it) => String(it.oficina || "") === String(oficinaFilter)
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter((it) => {
        const clienteNombre =
          it.cliente_nombre ||
          it.cliente_nombre_apellido ||
          (it.cliente &&
            `${it.cliente.nombre || ""} ${it.cliente.apellido || ""}`) ||
          "";
        const doc =
          it.cliente_documento ||
          (it.cliente && it.cliente.dni_cuit_cuil) ||
          "";
        const tel = it.telefono || "";
        const resumen = it.texto_resumen || "";
        return (
          clienteNombre.toLowerCase().includes(q) ||
          String(doc).toLowerCase().includes(q) ||
          String(tel).toLowerCase().includes(q) ||
          resumen.toLowerCase().includes(q)
        );
      });
    }

    // Orden: últimos envíos primero
    data.sort((a, b) => {
      const da = new Date(a.created_at || a.fecha || 0).getTime();
      const db = new Date(b.created_at || b.fecha || 0).getTime();
      return db - da;
    });

    return data;
  }, [items, search, oficinaFilter]);

  return (
    <div className="rounded-lg bg-gray-900/70 border border-gray-800 ring-1 ring-gray-800/80 text-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center">
            <HiClock className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              Historial de recordatorios enviados
            </h2>
            <p className="text-[11px] text-gray-300">
              Lista de mensajes masivos enviados por oficina y cliente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-400">
            <span>Mostrando</span>
            <span className="font-semibold text-gray-100">
              {filtrados.length}
            </span>
            <span>envíos</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-700 bg-gray-900/60 px-3 py-1.5 text-[11px] hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-3 h-3 border-2 border-emerald-200/40 border-t-emerald-400 rounded-full animate-spin" />
            ) : (
              <HiRefresh className="w-3.5 h-3.5" />
            )}
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-4 py-3 border-b border-gray-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[11px] text-gray-300">
          <HiOfficeBuilding className="w-3.5 h-3.5" />
          <span>Oficina:</span>
          {/* 🚀 ESCUDO DE SUCURSAL: Mostramos selectores solo si es Admin */}
          {isWebAdmin ? (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setOficinaFilter("TODAS")}
                className={`px-2 py-0.5 rounded-full border text-[11px] ${
                  oficinaFilter === "TODAS"
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-100"
                    : "border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"
                }`}
              >
                Todas
              </button>
              {oficinas.map((of) => (
                <button
                  key={of}
                  type="button"
                  onClick={() => setOficinaFilter(of)}
                  className={`px-2 py-0.5 rounded-full border text-[11px] ${
                    oficinaFilter === of
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-100"
                      : "border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"
                  }`}
                >
                  {of === "1" && "Oficina 1"}
                  {of === "2" && "Oficina 2"}
                  {of !== "1" && of !== "2" && `Oficina ${of}`}
                </button>
              ))}
            </div>
          ) : (
            // 🚀 BÓVEDA CERRADA: Si NO es Admin, solo ve su oficina (sin botón para cambiar)
            <div className="px-2 py-0.5 rounded-full border border-emerald-400 bg-emerald-500/10 text-emerald-100 text-[11px]">
              {user?.perfil?.oficina_nombre || "Tu Sucursal"}
            </div>
          )}
        </div>

        <div className="flex-1 flex items-center gap-2 sm:justify-end">
          <div className="relative w-full sm:w-64">
            <HiSearch className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, doc, teléfono..."
              className="w-full pl-7 pr-2 py-1.5 rounded-xl bg-gray-950 border border-gray-700 text-[11px] text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            />
          </div>
        </div>
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-900/80 border-b border-gray-800 text-gray-300">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Fecha / hora</th>
                <th className="px-3 py-2 text-left font-medium">Oficina</th>
                <th className="px-3 py-2 text-left font-medium">Cliente</th>
                <th className="px-3 py-2 text-left font-medium">Teléfono</th>
                <th className="px-3 py-2 text-left font-medium">Resumen</th>
                <th className="px-3 py-2 text-right font-medium">Monto total</th>
                <th className="px-3 py-2 text-center font-medium">Cuotas</th>
                <th className="px-3 py-2 text-center font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <AnimatePresence initial={false}>
                {loading && filtrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-6 text-center text-gray-400 text-xs"
                    >
                      Cargando historial...
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-6 text-center text-gray-400 text-xs"
                    >
                      No hay envíos registrados con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((it) => {
                    const key = it.id || `${it.telefono}-${it.created_at}`;
                    const clienteNombre =
                      it.cliente_nombre ||
                      it.cliente_nombre_apellido ||
                      (it.cliente &&
                        `${it.cliente.nombre || ""} ${
                          it.cliente.apellido || ""
                        }`.trim()) ||
                      "Sin nombre";
                    const doc =
                      it.cliente_documento ||
                      (it.cliente && it.cliente.dni_cuit_cuil) ||
                      "";
                    const cuotasCount =
                      it.cuotas_count ||
                      (Array.isArray(it.cuotas_ids) ? it.cuotas_ids.length : null);

                    return (
                      <motion.tr
                        key={key}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="hover:bg-gray-900/70"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span>{formatDateTime(it.created_at || it.fecha)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-200">
                            <HiOfficeBuilding className="w-3 h-3" />
                            {it.oficina === "1" && "Oficina 1"}
                            {it.oficina === "2" && "Oficina 2"}
                            {it.oficina !== "1" &&
                              it.oficina !== "2" &&
                              (it.oficina || "-")}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1">
                              <HiUser className="w-3 h-3 text-gray-400" />
                              <span className="truncate max-w-[12rem]">
                                {clienteNombre}
                              </span>
                            </span>
                            {doc && (
                              <span className="text-[10px] text-gray-400">
                                Doc: {doc}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-200">
                            <HiPhone className="w-3 h-3 text-gray-400" />
                            {it.telefono || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-[11px] text-gray-200">
                            {it.texto_resumen || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <span className="font-medium text-gray-100">
                            {formatMoney(it.monto_total)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span className="text-[11px] text-gray-100">
                            {cuotasCount != null ? cuotasCount : "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {estadoChip(it.estado_envio)}
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista mobile */}
      <div className="md:hidden divide-y divide-gray-800">
        {loading && filtrados.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-400">
            Cargando historial...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-400">
            No hay envíos registrados con los filtros actuales.
          </div>
        ) : (
          filtrados.map((it) => {
            const key = it.id || `${it.telefono}-${it.created_at}`;
            const clienteNombre =
              it.cliente_nombre ||
              it.cliente_nombre_apellido ||
              (it.cliente &&
                `${it.cliente.nombre || ""} ${
                  it.cliente.apellido || ""
                }`.trim()) ||
              "Sin nombre";
            const doc =
              it.cliente_documento ||
              (it.cliente && it.cliente.dni_cuit_cuil) ||
              "";
            const cuotasCount =
              it.cuotas_count ||
              (Array.isArray(it.cuotas_ids) ? it.cuotas_ids.length : null);

            return (
              <div key={key} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] text-gray-300">
                    {formatDateTime(it.created_at || it.fecha)}
                  </div>
                  {estadoChip(it.estado_envio)}
                </div>
                <div className="mt-1 text-sm font-medium text-gray-100">
                  {clienteNombre}
                </div>
                {doc && (
                  <div className="text-[11px] text-gray-400">Doc: {doc}</div>
                )}
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-300">
                  <span className="inline-flex items-center gap-1">
                    <HiOfficeBuilding className="w-3 h-3 text-gray-400" />
                    {it.oficina === "1" && "Oficina 1"}
                    {it.oficina === "2" && "Oficina 2"}
                    {it.oficina !== "1" &&
                      it.oficina !== "2" &&
                      (it.oficina || "-")}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <HiPhone className="w-3 h-3 text-gray-400" />
                    {it.telefono || "-"}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-gray-200">
                  {it.texto_resumen || "-"}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-gray-300">
                    Cuotas:{" "}
                    <span className="font-semibold text-gray-100">
                      {cuotasCount != null ? cuotasCount : "-"}
                    </span>
                  </span>
                  <span className="text-gray-300">
                    Total:{" "}
                    <span className="font-semibold text-gray-100">
                      {formatMoney(it.monto_total)}
                    </span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}