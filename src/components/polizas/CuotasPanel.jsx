// src/components/polizas/CuotasPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";
import toast from "react-hot-toast";

import { pagarCuota } from "../../store/slices/polizasSlice";

// 🎯 ÚNICA fuente de verdad para toda la lógica de cuotas
import { resumenCuotas, getProximaCuota } from "../../utils/cuotas";

// 🎯 Componente reutilizable para mostrar una cuota
import CuotaInfoCard from "./CuotaInfoCard";


/* ===================== Panel principal ===================== */
export default function CuotasPanel({ poliza, polizaId }) {
  const dispatch = useDispatch();

  const [rows, setRows] = useState(Array.isArray(poliza?.cuotas) ? poliza.cuotas : []);
  useEffect(() => {
    setRows(Array.isArray(poliza?.cuotas) ? poliza.cuotas : []);
  }, [poliza?.cuotas]);

  const [busyIds, setBusyIds] = useState({});

  // ─── Resumen agregado (delegado al utils unificado) ─────────────────
  const resumen = useMemo(() => resumenCuotas(rows), [rows]);

  // ─── Próxima cuota a pagar (la que se usa para recordatorios) ───────
  const proximaCuota = useMemo(() => getProximaCuota(rows), [rows]);

  const handleMarcarPagada = async (cuota) => {
    if (!cuota?.id || cuota.pagado) return;
    setBusyIds((m) => ({ ...m, [cuota.id]: true }));
    try {
      const payload = { fecha_pago: dayjs().format("YYYY-MM-DD") };
      const updated = await dispatch(pagarCuota({ cuotaId: cuota.id, data: payload })).unwrap();
      setRows((prev) =>
        prev.map((c) =>
          c.id === cuota.id
            ? { ...c, ...updated, pagado: true, fecha_pago: updated?.fecha_pago || payload.fecha_pago }
            : c
        )
      );
      toast.success(`Cuota #${cuota.cuota_nro} marcada como pagada`);
    } catch (e) {
      toast.error(e?.message || "No se pudo marcar la cuota como pagada");
    } finally {
      setBusyIds((m) => {
        const copy = { ...m };
        delete copy[cuota.id];
        return copy;
      });
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 sm:p-5 shadow-lg shadow-black/40">

      {/* Header */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/60">Sección operativa</div>
          <h3 className="text-lg sm:text-xl font-semibold text-white">Gestión de Cuotas</h3>
        </div>
      </div>

      {/* 🚀 Fechas clave de la póliza — alta + próximo pago, lado a lado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Fecha de alta */}
        {poliza?.fecha_emision ? (
          <div className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5">
            <span className="text-sky-300 text-lg shrink-0">📅</span>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-sky-300/80">Póliza dada de alta el</span>
              <span className="text-sm font-bold text-white">
                {dayjs(poliza.fecha_emision).format("DD/MM/YYYY")}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5">
            <span className="text-amber-300 text-lg shrink-0">⚠️</span>
            <span className="text-xs font-medium text-amber-200">
              Sin fecha de alta cargada. Cargala con EDITAR para que las fechas se calculen bien.
            </span>
          </div>
        )}

        {/* Próximo pago (usado para recordatorios) */}
        {proximaCuota?.fecha_vencimiento ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
            <span className="text-emerald-300 text-lg shrink-0">🔔</span>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-emerald-300/80">Vence (cuota #{proximaCuota.cuota_nro})</span>
              <span className="text-sm font-bold text-white">
                {dayjs(proximaCuota.fecha_vencimiento).format("DD/MM/YYYY")}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900/60 px-4 py-2.5">
            <span className="text-neutral-400 text-lg shrink-0">✅</span>
            <span className="text-xs font-medium text-neutral-300">
              No hay cuotas pendientes de pago.
            </span>
          </div>
        )}
      </div>

      {/* Resumen numérico */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-neutral-900/90 border border-neutral-800 p-3">
          <div className="text-[11px] text-neutral-400">Total Cuotas</div>
          <div className="text-xl font-semibold text-white">{resumen.total}</div>
        </div>
        <div className="rounded-xl bg-neutral-900/90 border border-neutral-800 p-3">
          <div className="text-[11px] text-neutral-400">Pagadas</div>
          <div className="text-xl font-semibold text-emerald-400">{resumen.pagadas}</div>
        </div>
        <div className="rounded-xl bg-neutral-900/90 border border-neutral-800 p-3">
          <div className="text-[11px] text-neutral-400">Pendientes</div>
          <div className="text-xl font-semibold text-amber-300">{resumen.pendientes}</div>
        </div>
        <div className="rounded-xl bg-neutral-900/90 border border-neutral-800 p-3">
          <div className="text-[11px] text-neutral-400">Vencidas</div>
          <div className="text-xl font-semibold text-red-400">{resumen.vencidas}</div>
        </div>
      </div>

      {/* Lista de cuotas — cada una usa el componente reutilizable */}
      <div className="rounded-2xl border border-neutral-800 overflow-hidden bg-neutral-950/70 divide-y divide-neutral-800">
        {rows.map((cuota, idx) => (
          <CuotaInfoCard
            key={cuota.id}
            cuota={cuota}
            todasLasCuotas={rows}
            idx={idx}
            polizaFechaEmision={poliza?.fecha_emision}
            onMarcarPagada={handleMarcarPagada}
            busy={!!busyIds[cuota.id]}
            variant="full"
          />
        ))}

        {rows.length === 0 && (
          <div className="p-8 text-center text-neutral-500 text-sm">
            Esta póliza no tiene cuotas registradas.
          </div>
        )}
      </div>
    </div>
  );
}