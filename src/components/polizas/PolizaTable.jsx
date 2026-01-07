// src/components/polizas/PolizaTable.jsx
import React, { useMemo, useState, useCallback, memo } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import PolizaEditModal from "./PolizaEditModal";
import ConfirmModal from "./ConfirmModal";
import { deletePoliza } from "../../store/slices/polizasSlice";

/* ---------------- Helpers (sin dayjs) ---------------- */

function toIntOrNaN(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffDays(a, b) {
  // a - b en días, ambos startOfDay
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

function normalizeEstadoCuotasKey(raw) {
  const v = (raw || "").toString().trim().toLowerCase();
  // soporta backend: al_dia, por_vencer, vence_hoy, vencida_7, vencida_30, vencidas
  // soporta variantes: mora_*, etc (si aparecieran)
  if (!v) return "";
  return v;
}

function computeCuotasBadge(poliza) {
  const keyFromBackend = normalizeEstadoCuotasKey(poliza?.estado_cuotas);

  const impagasCount = toIntOrNaN(poliza?.impagas_count ?? poliza?.impagasCount);
  const cuotasArr = Array.isArray(poliza?.cuotas) ? poliza.cuotas : null;

  const countImpagas = () => {
    if (!Number.isNaN(impagasCount)) return Math.max(0, impagasCount);
    if (!cuotasArr) return 0;
    let n = 0;
    for (const c of cuotasArr) if (!c?.pagado) n += 1;
    return n;
  };

  const impagas = countImpagas();

  // Si backend ya nos dice el estado → usarlo
  let key = keyFromBackend;

  // Si no vino key, intentamos con proxima_vencimiento_impaga (barato)
  if (!key) {
    const proxRaw =
      poliza?.proxima_vencimiento_impaga ||
      poliza?.proximaVencimientoImpaga ||
      poliza?.proxima_vencimiento ||
      null;

    if (impagas <= 0) key = "al_dia";
    else if (proxRaw) {
      const hoy = startOfDay(new Date());
      const prox = startOfDay(new Date(proxRaw));
      if (Number.isNaN(prox.getTime())) {
        key = "vencidas";
      } else {
        const d = diffDays(hoy, prox); // >0 vencida | 0 hoy | <0 futura
        if (d === 0) key = "vence_hoy";
        else if (d > 0) {
          if (d <= 7) key = "vencida_7";
          else if (d <= 30) key = "vencida_30";
          else key = "vencidas";
        } else {
          const faltan = Math.abs(d);
          key = faltan <= 7 ? "por_vencer" : "al_dia";
        }
      }
    } else if (cuotasArr) {
      // Fallback caro (solo si no vino nada útil)
      if (impagas <= 0) key = "al_dia";
      else {
        const hoy = startOfDay(new Date());
        let proxima = null;

        for (const c of cuotasArr) {
          if (c?.pagado) continue;
          if (!c?.fecha_vencimiento) continue;
          const fv = startOfDay(new Date(c.fecha_vencimiento));
          if (Number.isNaN(fv.getTime())) continue;
          if (!proxima || fv.getTime() < proxima.getTime()) proxima = fv;
        }

        if (!proxima) key = "vencidas";
        else {
          const d = diffDays(hoy, proxima);
          if (d === 0) key = "vence_hoy";
          else if (d > 0) {
            if (d <= 7) key = "vencida_7";
            else if (d <= 30) key = "vencida_30";
            else key = "vencidas";
          } else {
            const faltan = Math.abs(d);
            key = faltan <= 7 ? "por_vencer" : "al_dia";
          }
        }
      }
    } else {
      key = impagas <= 0 ? "al_dia" : "vencidas";
    }
  }

  const styles = {
    al_dia: {
      label: "AL DÍA",
      clase: "border-emerald-500/60 text-emerald-300 bg-emerald-500/5",
    },
    por_vencer: {
      label: "POR VENCER",
      clase: "border-amber-500/60 text-amber-300 bg-amber-500/5",
    },
    vence_hoy: {
      label: "VENCE HOY",
      clase: "border-rose-500/70 text-rose-300 bg-rose-500/10",
    },
    vencida_7: {
      label: "VENCIDA (7 días)",
      clase: "border-amber-500/70 text-amber-300 bg-amber-500/10",
    },
    vencida_30: {
      label: "VENCIDA (30 días)",
      clase: "border-rose-500/70 text-rose-300 bg-rose-500/10",
    },
    vencidas: {
      label: "VENCIDAS",
      clase: "border-rose-500/70 text-rose-300 bg-rose-500/10",
    },
  };

  const st = styles[key] || styles.vencidas;

  return {
    key,
    label: st.label,
    clase: st.clase,
    extra: `${impagas} impagas`,
  };
}

/* ---------------- UI Pieces ---------------- */

const SortHeader = memo(function SortHeader({
  label,
  field,
  ordering,
  onOrderingChange,
  className = "",
}) {
  const isActive = ordering && (ordering === field || ordering === `-${field}`);
  const dir = ordering && ordering.startsWith("-") ? "desc" : "asc";

  const nextOrdering = useCallback(() => {
    if (!onOrderingChange) return;
    if (!isActive) return onOrderingChange(field);
    if (dir === "asc") return onOrderingChange(`-${field}`);
    return onOrderingChange(field);
  }, [onOrderingChange, isActive, dir, field]);

  return (
    <th
      className={`p-3 border-b border-gray-800 bg-gray-900/90 text-xs uppercase tracking-wide text-gray-300 ${
        onOrderingChange ? "cursor-pointer select-none" : ""
      } ${className}`}
      onClick={onOrderingChange ? nextOrdering : undefined}
      title={onOrderingChange ? "Ordenar" : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {onOrderingChange && (
          <span className="text-[10px] text-gray-500">
            {isActive ? (dir === "asc" ? "▲" : "▼") : "↕"}
          </span>
        )}
      </span>
    </th>
  );
});

const CuotasBadge = memo(function CuotasBadge({ poliza }) {
  const est = computeCuotasBadge(poliza);
  return (
    <div className="flex flex-col gap-1 text-xs">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border ${est.clase}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {est.label}
      </span>
      <span className="text-[11px] text-gray-400">{est.extra}</span>
    </div>
  );
});

/* ---------------- Rows (memo) ---------------- */

const DesktopRow = memo(function DesktopRow({
  poliza,
  zebra,
  isDeleting,
  onEditClick,
  onDeleteClick,
}) {
  const activa = (poliza?.estado || "").toString().toLowerCase() === "activa";

  const clienteNombre = `${poliza?.cliente?.nombre || ""} ${poliza?.cliente?.apellido || ""}`.trim();

  return (
    <tr
      className={`transition-colors ${zebra} hover:bg-gray-850`}
    >
      {/* N° Póliza */}
      <td className="p-3 border-b border-gray-850 align-top">
        <Link
          to={`/polizas/${poliza.id}`}
          className="text-primary-300 hover:text-primary-200 font-medium text-sm"
          title="Ver detalle de póliza"
        >
          {poliza.numero_poliza || "-"}
        </Link>
        {poliza.compania && (
          <div className="mt-0.5 text-[11px] text-gray-400">
            {poliza.compania}
          </div>
        )}
      </td>

      {/* Cliente */}
      <td className="p-3 border-b border-gray-850 align-top">
        <Link
          to={`/clientes/${poliza.cliente?.id}`}
          className="text-sm text-primary-200 hover:text-primary-100"
          title="Ver perfil de cliente"
        >
          {clienteNombre || "-"}
        </Link>
        {poliza.cliente?.dni_cuit_cuil && (
          <div className="mt-0.5 text-[11px] text-gray-400">
            {poliza.cliente.dni_cuit_cuil}
          </div>
        )}
      </td>

      {/* Patente / Marca / Modelo */}
      <td className="p-3 border-b border-gray-850 align-top text-sm text-gray-100">
        {poliza.patente || "-"}
      </td>
      <td className="p-3 border-b border-gray-850 align-top text-sm text-gray-100">
        {poliza.marca || "-"}
      </td>
      <td className="p-3 border-b border-gray-850 align-top text-sm text-gray-100">
        {poliza.modelo || "-"}
      </td>

      {/* Cuotas */}
      <td className="p-3 border-b border-gray-850 align-top">
        <CuotasBadge poliza={poliza} />
      </td>

      {/* Estado */}
      <td className="p-3 border-b border-gray-850 align-top text-center">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
            activa
              ? "border-emerald-500/60 text-emerald-300 bg-emerald-500/5"
              : "border-rose-500/60 text-rose-300 bg-rose-500/5"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {activa ? "Activa" : "Inactiva"}
        </span>
      </td>

      {/* Acciones */}
      <td className="p-3 border-b border-gray-850 align-top text-center">
        <div className="inline-flex items-center gap-2">
          <button
            className="p-2 rounded-lg bg-gray-850 hover:bg-gray-800 text-amber-300 hover:text-amber-200 text-xs transition disabled:opacity-50"
            onClick={() => onEditClick(poliza)}
            title="Editar póliza"
            aria-label="Editar póliza"
            disabled={isDeleting}
          >
            <FaEdit className="w-3.5 h-3.5" />
          </button>
          <button
            className={`p-2 rounded-lg bg-gray-850 hover:bg-gray-800 text-xs transition disabled:opacity-50 ${
              isDeleting
                ? "opacity-60 cursor-wait text-rose-300"
                : "text-rose-400 hover:text-rose-300"
            }`}
            onClick={() => onDeleteClick(poliza)}
            title="Eliminar póliza"
            aria-label="Eliminar póliza"
            disabled={isDeleting}
          >
            <FaTrash className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});

const MobileCard = memo(function MobileCard({
  poliza,
  isDeleting,
  onEditClick,
  onDeleteClick,
}) {
  const clienteNombre = `${poliza?.cliente?.nombre || ""} ${poliza?.cliente?.apellido || ""}`.trim();

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-gray-400">N° Póliza</div>
          <Link
            to={`/polizas/${poliza.id}`}
            className="font-semibold text-sm text-primary-300 hover:text-primary-200"
          >
            {poliza.numero_poliza || "-"}
          </Link>
          {poliza.compania && (
            <div className="mt-0.5 text-[11px] text-gray-500">
              {poliza.compania}
            </div>
          )}
        </div>
        <div className={isDeleting ? "opacity-60 shrink-0" : "shrink-0"}>
          <CuotasBadge poliza={poliza} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[11px] text-gray-400">Cliente</div>
          <Link
            to={`/clientes/${poliza.cliente?.id}`}
            className="text-sm text-primary-200 hover:text-primary-100"
          >
            {clienteNombre || "-"}
          </Link>
          {poliza.cliente?.dni_cuit_cuil && (
            <div className="mt-0.5 text-[11px] text-gray-500">
              {poliza.cliente.dni_cuit_cuil}
            </div>
          )}
        </div>
        <div>
          <div className="text-[11px] text-gray-400">Patente</div>
          <div className="text-sm text-gray-100">{poliza.patente || "-"}</div>
        </div>
        <div>
          <div className="text-[11px] text-gray-400">Marca</div>
          <div className="text-sm text-gray-100">{poliza.marca || "-"}</div>
        </div>
        <div>
          <div className="text-[11px] text-gray-400">Modelo</div>
          <div className="text-sm text-gray-100">{poliza.modelo || "-"}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          className="flex-1 px-3 py-2 rounded-lg bg-gray-850 hover:bg-gray-800 text-amber-300 hover:text-amber-200 text-xs font-medium transition disabled:opacity-50"
          onClick={() => onEditClick(poliza)}
          title="Editar póliza"
          disabled={isDeleting}
        >
          <span className="inline-flex items-center gap-2 justify-center">
            <FaEdit className="w-3.5 h-3.5" /> Editar
          </span>
        </button>
        <button
          className={`flex-1 px-3 py-2 rounded-lg bg-gray-850 hover:bg-gray-800 text-xs font-medium transition ${
            isDeleting
              ? "opacity-60 cursor-wait text-rose-300"
              : "text-rose-400 hover:text-rose-300"
          }`}
          onClick={() => onDeleteClick(poliza)}
          title="Eliminar póliza"
          disabled={isDeleting}
        >
          <span className="inline-flex items-center gap-2 justify-center">
            <FaTrash className="w-3.5 h-3.5" /> Eliminar
          </span>
        </button>
      </div>
    </div>
  );
});

/* ---------------- Main ---------------- */

const PolizaTable = ({
  polizas = [],
  status = "idle",
  page = 1,
  pageSize = 10,
  total = 0,
  ordering,
  onOrderingChange,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
}) => {
  const dispatch = useDispatch();

  // Fallbacks locales para editar/eliminar si no vienen handlers desde el padre
  const [editing, setEditing] = useState(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const totalPages = useMemo(() => {
    const t = Number(total) || 0;
    const ps = Number(pageSize) || 1;
    return Math.max(1, Math.ceil(t / ps));
  }, [total, pageSize]);

  const { startIdx, endIdx } = useMemo(() => {
    const ps = Number(pageSize) || 1;
    const p = Number(page) || 1;
    const t = Number(total) || 0;

    if (!polizas.length) return { startIdx: 0, endIdx: 0 };
    const start = (p - 1) * ps + 1;
    const end = Math.min(start + polizas.length - 1, t);
    return { startIdx: start, endIdx: end };
  }, [polizas.length, page, pageSize, total]);

  const handleEditClick = useCallback(
    (poliza) => {
      if (onEdit) return onEdit(poliza);
      setEditing(poliza);
      setOpenEdit(true);
    },
    [onEdit]
  );

  const handleDeleteClick = useCallback(
    (poliza) => {
      if (onDelete) return onDelete(poliza);
      setDeleting(poliza);
      setOpenConfirm(true);
    },
    [onDelete]
  );

  const handleConfirmDelete = useCallback(async () => {
    try {
      const id = deleting?.id;
      if (!id) return;

      setDeletingId(id);

      const shouldGoPrev =
        polizas.length === 1 && page > 1 && typeof onPageChange === "function";

      await dispatch(deletePoliza(id)).unwrap();
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
  }, [deleting, dispatch, onPageChange, page, polizas.length]);

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/95 text-white shadow-sm overflow-hidden">
      {/* Estado de carga */}
      {status === "loading" && (
        <div className="px-4 py-2 text-sm text-primary-300 border-b border-gray-800">
          Cargando pólizas…
        </div>
      )}

      {/* Tabla (md y arriba) */}
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
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
              <th className="p-3 border-b border-gray-800 bg-gray-900/90 text-xs uppercase tracking-wide text-gray-300">
                Cuotas
              </th>
              <SortHeader
                label="Estado"
                field="estado"
                ordering={ordering}
                onOrderingChange={onOrderingChange}
                className="text-center"
              />
              <th className="p-3 border-b border-gray-800 bg-gray-900/90 text-xs uppercase tracking-wide text-gray-300 text-center">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {polizas.map((poliza, idx) => (
              <DesktopRow
                key={poliza.id}
                poliza={poliza}
                zebra={idx % 2 === 0 ? "bg-gray-900" : "bg-gray-900/90"}
                isDeleting={!!deletingId}
                onEditClick={handleEditClick}
                onDeleteClick={handleDeleteClick}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Lista responsiva (mobile) */}
      <div className="md:hidden divide-y divide-gray-850">
        {polizas.map((poliza) => (
          <MobileCard
            key={poliza.id}
            poliza={poliza}
            isDeleting={!!deletingId}
            onEditClick={handleEditClick}
            onDeleteClick={handleDeleteClick}
          />
        ))}
      </div>

      {/* Footer de paginación (server-side) */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-900 border-t border-gray-800">
        <div className="text-xs sm:text-sm text-gray-300">
          Mostrando <strong>{startIdx || 0}</strong>–<strong>{endIdx || 0}</strong> de{" "}
          <strong>{total || 0}</strong>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => onPageChange?.(1)}
            disabled={page <= 1}
            className="px-2 py-1 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 disabled:opacity-40"
            title="Primera página"
          >
            «
          </button>
          <button
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1}
            className="px-2 py-1 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 disabled:opacity-40"
            title="Página anterior"
          >
            ‹
          </button>
          <span className="text-xs sm:text-sm text-gray-300 px-2">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </span>
          <button
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= totalPages}
            className="px-2 py-1 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 disabled:opacity-40"
            title="Página siguiente"
          >
            ›
          </button>
          <button
            onClick={() => onPageChange?.(totalPages)}
            disabled={page >= totalPages}
            className="px-2 py-1 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 disabled:opacity-40"
            title="Última página"
          >
            »
          </button>

          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className="ml-2 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-xs sm:text-sm"
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
