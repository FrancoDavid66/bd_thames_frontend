// src/components/polizas/PolizaTable.jsx
import React, { useMemo, useState, useCallback, memo } from "react";
import { FaEdit, FaTrash, FaBuilding } from "react-icons/fa"; // 🚀 Icono de sucursal
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";

// 🚀 IMPORTACIONES DE SEGURIDAD
import { useAuth } from "../../context/AuthContext";

import PolizaEditModal from "./PolizaEditModal";
import ConfirmModal from "./ConfirmModal";
import { deletePoliza } from "../../store/slices/polizasSlice";

/* ---------------- Helpers ---------------- */

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
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

function normalizeEstadoCuotasKey(raw) {
  const v = (raw || "").toString().trim().toLowerCase();
  return v || "";
}

const CUOTAS_STYLES = {
  al_dia: { label: "AL DÍA", clase: "border-emerald-500/60 text-emerald-300 bg-emerald-500/5" },
  por_vencer: { label: "POR VENCER", clase: "border-amber-500/60 text-amber-300 bg-amber-500/5" },
  vence_hoy: { label: "VENCE HOY", clase: "border-rose-500/70 text-rose-300 bg-rose-500/10" },
  vencida_7: { label: "VENCIDA (7 días)", clase: "border-amber-500/70 text-amber-300 bg-amber-500/10" },
  vencida_30: { label: "VENCIDA (30 días)", clase: "border-rose-500/70 text-rose-300 bg-rose-500/10" },
  vencidas: { label: "VENCIDAS", clase: "border-rose-500/70 text-rose-300 bg-rose-500/10" },
};

function computeCuotasBadgeFast(poliza) {
  const keyFromBackend = normalizeEstadoCuotasKey(poliza?.estado_cuotas);
  const impagasCount = toIntOrNaN(poliza?.impagas_count ?? poliza?.impagasCount);
  const cuotasArr = Array.isArray(poliza?.cuotas) ? poliza.cuotas : null;

  const countImpagas = () => {
    if (!Number.isNaN(impagasCount)) return Math.max(0, impagasCount);
    if (!cuotasArr) return 0;
    return cuotasArr.filter(c => !c?.pagado).length;
  };

  const impagas = countImpagas();
  let key = keyFromBackend;

  if (!key) {
    const proxRaw = poliza?.proxima_vencimiento_impaga || poliza?.proximaVencimientoImpaga || poliza?.proxima_vencimiento || null;
    if (impagas <= 0) key = "al_dia";
    else if (proxRaw) {
      const hoy = startOfDay(new Date());
      const prox = startOfDay(new Date(proxRaw));
      if (Number.isNaN(prox.getTime())) key = "vencidas";
      else {
        const d = diffDays(hoy, prox);
        if (d === 0) key = "vence_hoy";
        else if (d > 0) {
          if (d <= 7) key = "vencida_7";
          else if (d <= 30) key = "vencida_30";
          else key = "vencidas";
        } else {
          key = Math.abs(d) <= 7 ? "por_vencer" : "al_dia";
        }
      }
    } else {
      key = impagas <= 0 ? "al_dia" : "vencidas";
    }
  }

  const st = CUOTAS_STYLES[key] || CUOTAS_STYLES.vencidas;
  return { key, label: st.label, clase: st.clase, extra: `${impagas} impagas` };
}

function useCuotasBadge(poliza) {
  return useMemo(() => computeCuotasBadgeFast(poliza), [poliza]);
}

/* ---------------- UI Components ---------------- */

const EstadoPolizaBadge = memo(function EstadoPolizaBadge({ estado }) {
  const statusStr = (estado || "desconocido").toString().toLowerCase();
  const configs = {
    activa: { label: "ACTIVA", clase: "border-emerald-500/60 text-emerald-300 bg-emerald-500/10", dot: "bg-emerald-400" },
    vencida: { label: "VENCIDA", clase: "border-rose-500/60 text-rose-300 bg-rose-500/10", dot: "bg-rose-400 animate-pulse" },
    cancelada: { label: "CANCELADA", clase: "border-gray-600 text-gray-400 bg-gray-800", dot: "bg-gray-500" },
    finalizada: { label: "FINALIZADA", clase: "border-blue-500/60 text-blue-300 bg-blue-500/10", dot: "bg-blue-400" }
  };
  const config = configs[statusStr] || { label: statusStr.toUpperCase(), clase: "border-white/20 text-white/70 bg-white/5", dot: "bg-white/50" };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${config.clase}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
});

const SortHeader = memo(function SortHeader({ label, field, ordering, onOrderingChange, className = "" }) {
  const isActive = ordering && (ordering === field || ordering === `-${field}`);
  const dir = ordering?.startsWith("-") ? "desc" : "asc";

  const toggle = () => {
    if (!onOrderingChange) return;
    onOrderingChange(isActive && dir === "asc" ? `-${field}` : field);
  };

  return (
    <th className={`p-3 border-b border-gray-800 bg-gray-900/90 text-[10px] uppercase font-black tracking-widest text-gray-500 ${onOrderingChange ? "cursor-pointer select-none hover:text-gray-300" : ""} ${className}`} onClick={toggle}>
      <div className="flex items-center gap-1">
        {label} {onOrderingChange && <span className="text-[10px]">{isActive ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>}
      </div>
    </th>
  );
});

/* ---------------- Rows ---------------- */

const DesktopRow = memo(function DesktopRow({ poliza, zebra, isDeleting, onEditClick, onDeleteClick, isWebAdmin }) {
  const cuotasEst = useCuotasBadge(poliza);
  const clienteNombre = `${poliza?.cliente?.nombre || ""} ${poliza?.cliente?.apellido || ""}`.trim();

  return (
    <tr className={`transition-colors ${zebra} hover:bg-white/[0.02] group`}>
      <td className="p-3 border-b border-gray-800/50">
        <Link to={`/polizas/${poliza.id}`} className="text-blue-400 hover:text-blue-300 font-bold text-sm">{poliza.numero_poliza || "-"}</Link>
        <div className="text-[10px] text-gray-500 font-bold uppercase">{poliza.compania || "S/C"}</div>
      </td>

      <td className="p-3 border-b border-gray-800/50">
        <Link to={`/clientes/${poliza.cliente?.id}`} className="text-gray-200 hover:text-white font-medium text-sm">{clienteNombre || "-"}</Link>
        <div className="text-[10px] text-gray-500 font-mono">{poliza.cliente?.dni_cuit_cuil}</div>
      </td>

      {/* 🚀 COLUMNA SUCURSAL (Solo Admin) */}
      {isWebAdmin && (
        <td className="p-3 border-b border-gray-800/50">
          <div className="flex items-center gap-1.5">
             <div className="h-6 w-6 rounded bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20">
                <FaBuilding className="text-[10px]" />
             </div>
             <span className="text-[10px] font-black text-sky-400 uppercase tracking-tighter">
                {poliza?.oficina_nombre || "LOCAL"}
             </span>
          </div>
        </td>
      )}

      <td className="p-3 border-b border-gray-800/50 font-mono text-sm text-gray-300">{poliza.patente || "-"}</td>
      
      <td className="p-3 border-b border-gray-800/50">
        <div className="text-xs text-gray-200">{poliza.marca}</div>
        <div className="text-[10px] text-gray-500 truncate max-w-[120px]">{poliza.modelo}</div>
      </td>

      <td className="p-3 border-b border-gray-800/50">
        <div className={`inline-flex flex-col px-2 py-0.5 rounded border ${cuotasEst.clase}`}>
          <span className="text-[10px] font-black uppercase tracking-tight">{cuotasEst.label}</span>
          <span className="text-[9px] opacity-70 font-bold uppercase">{cuotasEst.extra}</span>
        </div>
      </td>

      <td className="p-3 border-b border-gray-800/50 text-center">
        <EstadoPolizaBadge estado={poliza.estado} />
      </td>

      <td className="p-3 border-b border-gray-800/50 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEditClick(poliza)} className="p-2 rounded-lg bg-gray-800 text-amber-400 hover:bg-amber-400 hover:text-black transition-all" title="Editar">
            <FaEdit className="text-sm" />
          </button>
          {isWebAdmin && (
            <button onClick={() => onDeleteClick(poliza)} className="p-2 rounded-lg bg-gray-800 text-rose-400 hover:bg-rose-500 hover:text-white transition-all" title="Eliminar">
              <FaTrash className="text-sm" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

/* ---------------- Main Component ---------------- */

const PolizaTable = ({
  polizas = [], status = "idle", page = 1, pageSize = 10, total = 0,
  ordering, onOrderingChange, onPageChange, onNext, onPrev,
  cursorEnabled = false, hasNext = false, hasPrev = false
}) => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const [editing, setEditing] = useState(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [openConfirm, setOpenConfirm] = useState(false);

  const totalPages = useMemo(() => cursorEnabled ? 1 : Math.ceil(total / pageSize), [total, pageSize, cursorEnabled]);

  const handleEditClick = useCallback((p) => { setEditing(p); setOpenEdit(true); }, []);
  const handleDeleteClick = useCallback((p) => { setDeleting(p); setOpenConfirm(true); }, []);

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    try {
      await dispatch(deletePoliza(deleting.id)).unwrap();
      toast.success("Póliza eliminada con éxito");
    } catch (e) {
      toast.error(e?.message || "Error al eliminar");
    } finally {
      setOpenConfirm(false); setDeleting(null);
    }
  };

  const isLoading = status === "loading";

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0b0f1e]/80 backdrop-blur-md text-white shadow-2xl overflow-hidden">
      {isLoading && <div className="h-1 bg-emerald-500 animate-pulse w-full" />}
      
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <SortHeader label="Póliza / Cía" field="numero_poliza" ordering={ordering} onOrderingChange={onOrderingChange} />
              <SortHeader label="Cliente" field="cliente__apellido" ordering={ordering} onOrderingChange={onOrderingChange} />
              
              {/* 🚀 HEADER SUCURSAL: Solo Admin */}
              {isWebAdmin && <SortHeader label="Sucursal" field="oficina__nombre" ordering={ordering} onOrderingChange={onOrderingChange} />}
              
              <SortHeader label="Patente" field="patente" ordering={ordering} onOrderingChange={onOrderingChange} />
              <SortHeader label="Vehículo" field="marca" ordering={ordering} onOrderingChange={onOrderingChange} />
              <th className="p-3 border-b border-gray-800 bg-gray-900/90 text-[10px] uppercase font-black tracking-widest text-gray-500">Estado Pago</th>
              <SortHeader label="Estado" field="estado" ordering={ordering} onOrderingChange={onOrderingChange} className="text-center" />
              <th className="p-3 border-b border-gray-800 bg-gray-900/90 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {polizas.map((p, i) => (
              <DesktopRow key={p.id} poliza={p} zebra={i % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"} onEditClick={handleEditClick} onDeleteClick={handleDeleteClick} isWebAdmin={isWebAdmin} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="px-6 py-4 flex items-center justify-between bg-black/40 border-t border-gray-800">
        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          {cursorEnabled ? `Registros: ${polizas.length}` : `Página ${page} de ${totalPages} · Total: ${total}`}
        </div>
        <div className="flex gap-2">
          <button onClick={() => cursorEnabled ? onPrev?.() : onPageChange?.(page - 1)} disabled={(cursorEnabled ? !hasPrev : page <= 1) || isLoading} className="h-9 px-4 rounded-xl border border-gray-700 bg-gray-800 text-[10px] font-black uppercase tracking-widest hover:bg-gray-700 disabled:opacity-20 transition-all">
            Anterior
          </button>
          <button onClick={() => cursorEnabled ? onNext?.() : onPageChange?.(page + 1)} disabled={(cursorEnabled ? !hasNext : page >= totalPages) || isLoading} className="h-9 px-4 rounded-xl border border-gray-700 bg-gray-800 text-[10px] font-black uppercase tracking-widest hover:bg-gray-700 disabled:opacity-20 transition-all">
            Siguiente
          </button>
        </div>
      </div>

      <PolizaEditModal isOpen={openEdit} poliza={editing} onClose={() => { setOpenEdit(false); setEditing(null); }} />
      <ConfirmModal isOpen={openConfirm} onClose={() => setOpenConfirm(false)} onConfirm={handleConfirmDelete} message={`¿Confirmas la eliminación total de la póliza ${deleting?.numero_poliza}? Esta acción no se puede deshacer.`} />
    </div>
  );
};

export default PolizaTable;