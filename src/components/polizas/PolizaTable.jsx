// src/components/polizas/PolizaTable.jsx
import React, { useMemo, useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import PolizaEditModal from "./PolizaEditModal";
import ConfirmModal from "./ConfirmModal";
import { deletePoliza } from "../../store/slices/polizasSlice";

const SortHeader = ({ label, field, ordering, onOrderingChange, className = "" }) => {
  const isActive =
    ordering && (ordering === field || ordering === `-${field}`);
  const dir = ordering && ordering.startsWith("-") ? "desc" : "asc";

  const nextOrdering = () => {
    if (!onOrderingChange) return;
    if (!isActive) return onOrderingChange(field);        // activa asc
    if (dir === "asc") return onOrderingChange(`-${field}`); // alterna a desc
    return onOrderingChange(field);                       // vuelve a asc
  };

  return (
    <th
      className={`p-3 border-b border-gray-700 ${
        onOrderingChange ? "cursor-pointer select-none" : ""
      } ${className}`}
      onClick={onOrderingChange ? nextOrdering : undefined}
      title={onOrderingChange ? "Ordenar" : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {onOrderingChange && (
          <span className="text-xs text-gray-400">
            {isActive ? (dir === "asc" ? "▲" : "▼") : "↕"}
          </span>
        )}
      </span>
    </th>
  );
};

const PolizaTable = ({
  polizas = [],
  status = "idle",
  page = 1,
  pageSize = 10,
  total = 0,
  ordering,                 // ej: "numero_poliza" | "-numero_poliza"
  onOrderingChange,         // (ord) => void

  onPageChange,             // (p) => void
  onPageSizeChange,         // (size) => void

  onEdit,                   // opcional: si el padre lo pasa, se usa
  onDelete,                 // opcional: si el padre lo pasa, se usa
}) => {
  const dispatch = useDispatch();

  // Fallbacks locales para editar/eliminar si no vienen handlers desde el padre
  const [editing, setEditing] = useState(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const totalPages = Math.max(
    1,
    Math.ceil((Number(total) || 0) / (Number(pageSize) || 1))
  );

  const handleEditClick = (poliza) => {
    if (onEdit) return onEdit(poliza);
    setEditing(poliza);
    setOpenEdit(true);
  };

  const handleDeleteClick = (poliza) => {
    if (onDelete) return onDelete(poliza);
    setDeleting(poliza);
    setOpenConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setDeletingId(deleting?.id || null);

      const shouldGoPrev =
        polizas.length === 1 &&
        page > 1 &&
        typeof onPageChange === "function";

      await dispatch(deletePoliza(deleting.id)).unwrap();
      toast.success("Póliza eliminada");

      if (shouldGoPrev) onPageChange(page - 1);
    } catch (e) {
      const msg = e?.detail || e?.message || "No se pudo eliminar";
      toast.error(msg);
    } finally {
      setOpenConfirm(false);
      setDeleting(null);
      setDeletingId(null);
    }
  };

  const getEstadoCuotas = (poliza) => {
    const cuotas = poliza?.cuotas || [];
    const impagas = cuotas.filter((c) => !c.pagado);
    if (impagas.length === 0) {
      return {
        key: "AL_DIA",
        label: "AL DÍA",
        clase: "bg-green-500/10 text-green-400 ring-green-500/30",
        extra: "0 impagas",
      };
    }
    const hoy = dayjs().startOf("day");
    const proxima = impagas
      .filter((c) => c.fecha_vencimiento)
      .map((c) => ({ ...c, fv: dayjs(c.fecha_vencimiento) }))
      .sort((a, b) => a.fv.valueOf() - b.fv.valueOf())[0];
    if (!proxima) {
      return {
        key: "VENCIDAS",
        label: "VENCIDAS",
        clase: "bg-red-500/10 text-red-400 ring-red-500/30",
        extra: `${impagas.length} impagas`,
      };
    }
    const diff = hoy.diff(proxima.fv, "day"); // >0 vencida | 0 hoy | <0 futura
    if (diff === 0)
      return {
        key: "VENCE_HOY",
        label: "VENCE HOY",
        clase: "bg-red-500/10 text-red-400 ring-red-500/30",
        extra: `${impagas.length} impagas`,
      };
    if (diff > 0) {
      if (diff <= 7)
        return {
          key: "VENCIDA_7",
          label: "VENCIDA (7 días)",
          clase: "bg-blue-600 text-white",
          extra: `${impagas.length} impagas`,
        };
      if (diff <= 30)
        return {
          key: "VENCIDA_30",
          label: "VENCIDA (30 días)",
          clase: "bg-red-500/10 text-red-400 ring-red-500/30",
          extra: `${impagas.length} impagas`,
        };
      return {
        key: "VENCIDAS",
        label: "VENCIDAS",
        clase: "bg-red-500/10 text-red-400 ring-red-500/30",
        extra: `${impagas.length} impagas`,
      };
    }
    const faltan = Math.abs(diff);
    if (faltan <= 7)
      return {
        key: "POR_VENCER",
        label: "POR VENCER",
        clase: "bg-yellow-500/10 text-yellow-400 ring-yellow-500/30",
        extra: `${impagas.length} impagas`,
      };
    return {
      key: "AL_DIA",
      label: "AL DÍA",
      clase: "bg-green-500/10 text-green-400 ring-green-500/30",
      extra: `${impagas.length} impagas`,
    };
  };

  const CuotasBadge = ({ poliza }) => {
    const est = getEstadoCuotas(poliza);
    return (
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${est.clase}`}
        >
          {est.label}
        </span>
        <span className="text-xs text-gray-400">{est.extra}</span>
      </div>
    );
  };

  const isActiva = (p) =>
    (p?.estado || "").toString().toLowerCase() === "activa";

  const startIdx =
    polizas.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const endIdx = Math.min(startIdx + polizas.length - 1, total || 0);

  return (
    <div className="rounded shadow bg-gray-900 text-white">
      {/* Estado de carga */}
      {status === "loading" && (
        <div className="px-4 py-2 text-sm text-blue-300">
          Cargando pólizas…
        </div>
      )}

      {/* Tabla (md y arriba) */}
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full text-left border-collapse">
          <thead className="bg-gray-800 sticky top-0 z-10">
            <tr className="text-xs uppercase tracking-wide text-gray-300">
              <SortHeader
                label="N° Póliza"
                field="numero_poliza"
                ordering={ordering}
                onOrderingChange={onOrderingChange}
              />
              <SortHeader
                label="Cliente"
                field="cliente__apellido"
                ordering={ordering}
                onOrderingChange={onOrderingChange}
              />
              <SortHeader
                label="Patente"
                field="patente"
                ordering={ordering}
                onOrderingChange={onOrderingChange}
              />
              <SortHeader
                label="Marca"
                field="marca"
                ordering={ordering}
                onOrderingChange={onOrderingChange}
              />
              <SortHeader
                label="Modelo"
                field="modelo"
                ordering={ordering}
                onOrderingChange={onOrderingChange}
              />
              <th className="p-3 border-b border-gray-700">Cuotas</th>
              <SortHeader
                label="Estado"
                field="estado"
                ordering={ordering}
                onOrderingChange={onOrderingChange}
                className="text-center"
              />
              <th className="p-3 border-b border-gray-700 text-center">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {polizas.map((poliza, idx) => (
              <tr
                key={poliza.id}
                className={`hover:bg-gray-800 transition-colors ${
                  idx % 2 === 0 ? "bg-gray-900" : "bg-gray-900/80"
                }`}
              >
                <td className="p-3 border-b border-gray-800 font-medium">
                  <Link
                    to={`/polizas/${poliza.id}`}
                    className="text-blue-400 hover:underline underline-offset-2"
                    title="Ver detalle de póliza"
                  >
                    {poliza.numero_poliza || "-"}
                  </Link>
                  {poliza.compania && (
                    <div className="text-xs text-gray-400">
                      {poliza.compania}
                    </div>
                  )}
                </td>

                <td className="p-3 border-b border-gray-800">
                  <Link
                    to={`/clientes/${poliza.cliente?.id}`}
                    className="text-blue-400 hover:underline underline-offset-2"
                    title="Ver perfil de cliente"
                  >
                    {(poliza.cliente?.nombre || "") +
                      " " +
                      (poliza.cliente?.apellido || "")}
                  </Link>
                  {poliza.cliente?.dni_cuit_cuil && (
                    <div className="text-xs text-gray-400">
                      {poliza.cliente.dni_cuit_cuil}
                    </div>
                  )}
                </td>

                <td className="p-3 border-b border-gray-800">
                  {poliza.patente || "-"}
                </td>
                <td className="p-3 border-b border-gray-800">
                  {poliza.marca || "-"}
                </td>
                <td className="p-3 border-b border-gray-800">
                  {poliza.modelo || "-"}
                </td>

                <td className="p-3 border-b border-gray-800">
                  <CuotasBadge poliza={poliza} />
                </td>

                <td className="p-3 border-b border-gray-800 text-center">
                  {isActiva(poliza) ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 ring-1 ring-green-500/30">
                      Activa
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 ring-1 ring-red-500/30">
                      Inactiva
                    </span>
                  )}
                </td>

                <td className="p-3 border-b border-gray-800 text-center">
                  <div className="inline-flex items-center gap-2">
                    <button
                      className="p-2 rounded bg-gray-800 hover:bg-gray-700 text-yellow-400 hover:text-yellow-300 transition"
                      onClick={() => handleEditClick(poliza)}
                      title="Editar póliza"
                      aria-label="Editar póliza"
                      disabled={!!deletingId}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className={`p-2 rounded bg-gray-800 hover:bg-gray-700 transition ${
                        deletingId === poliza.id
                          ? "opacity-60 cursor-wait"
                          : "text-red-500 hover:text-red-400"
                      }`}
                      onClick={() => handleDeleteClick(poliza)}
                      title="Eliminar póliza"
                      aria-label="Eliminar póliza"
                      disabled={!!deletingId}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lista responsiva (mobile) */}
      <div className="md:hidden divide-y divide-gray-800">
        {polizas.map((poliza) => (
          <div key={poliza.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-gray-300">N° Póliza</div>
                <Link
                  to={`/polizas/${poliza.id}`}
                  className="font-semibold text-blue-400 hover:underline underline-offset-2"
                >
                  {poliza.numero_poliza || "-"}
                </Link>
                {poliza.compania && (
                  <div className="text-xs text-gray-400">
                    {poliza.compania}
                  </div>
                )}
              </div>
              <div className={deletingId === poliza.id ? "opacity-60" : ""}>
                <CuotasBadge poliza={poliza} />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-400">Cliente</div>
                <Link
                  to={`/clientes/${poliza.cliente?.id}`}
                  className="text-blue-400 hover:underline underline-offset-2"
                >
                  {(poliza.cliente?.nombre || "") +
                    " " +
                    (poliza.cliente?.apellido || "")}
                </Link>
                {poliza.cliente?.dni_cuit_cuil && (
                  <div className="text-xs text-gray-400">
                    {poliza.cliente.dni_cuit_cuil}
                  </div>
                )}
              </div>
              <div>
                <div className="text-gray-400">Patente</div>
                <div>{poliza.patente || "-"}</div>
              </div>
              <div>
                <div className="text-gray-400">Marca</div>
                <div>{poliza.marca || "-"}</div>
              </div>
              <div>
                <div className="text-gray-400">Modelo</div>
                <div>{poliza.modelo || "-"}</div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-yellow-400 hover:text-yellow-300 text-sm transition"
                onClick={() => handleEditClick(poliza)}
                title="Editar póliza"
                disabled={!!deletingId}
              >
                <span className="inline-flex items-center gap-2">
                  <FaEdit /> Editar
                </span>
              </button>
              <button
                className={`px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm transition ${
                  deletingId === poliza.id
                    ? "opacity-60 cursor-wait"
                    : "text-red-500 hover:text-red-400"
                }`}
                onClick={() => handleDeleteClick(poliza)}
                title="Eliminar póliza"
                disabled={!!deletingId}
              >
                <span className="inline-flex items-center gap-2">
                  <FaTrash /> Eliminar
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer de paginación (server-side) */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-800 border-t border-gray-700">
        <div className="text-sm text-gray-300">
          Mostrando <strong>{startIdx || 0}</strong>–<strong>{endIdx || 0}</strong> de{" "}
          <strong>{total || 0}</strong>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange?.(1)}
            disabled={page <= 1}
            className="px-2 py-1 rounded border border-gray-700 bg-gray-900 hover:bg-gray-700 disabled:opacity-40"
            title="Primera página"
          >
            «
          </button>
          <button
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1}
            className="px-2 py-1 rounded border border-gray-700 bg-gray-900 hover:bg-gray-700 disabled:opacity-40"
            title="Página anterior"
          >
            ‹
          </button>
          <span className="text-sm text-gray-300 px-2">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </span>
          <button
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= totalPages}
            className="px-2 py-1 rounded border border-gray-700 bg-gray-900 hover:bg-gray-700 disabled:opacity-40"
            title="Página siguiente"
          >
            ›
          </button>
          <button
            onClick={() => onPageChange?.(totalPages)}
            disabled={page >= totalPages}
            className="px-2 py-1 rounded border border-gray-700 bg-gray-900 hover:bg-gray-700 disabled:opacity-40"
            title="Última página"
          >
            »
          </button>

          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className="ml-2 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm"
            title="Tamaño de página"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / pág.
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Modales integrados (fallback interno) */}
      <PolizaEditModal
        isOpen={openEdit}
        poliza={editing}
        onClose={() => {
          setOpenEdit(false);
          setEditing(null);
        }}
        onSuccess={() => {
          setOpenEdit(false);
          setEditing(null);
          toast.success("Póliza actualizada");
        }}
      />

      <ConfirmModal
        isOpen={openConfirm}
        onClose={() => {
          setOpenConfirm(false);
          setDeleting(null);
        }}
        onConfirm={handleConfirmDelete}
        message={`¿Eliminar la póliza ${deleting?.numero_poliza || ""}? Esta acción no se puede deshacer.`}
      />
    </div>
  );
};

export default PolizaTable;
