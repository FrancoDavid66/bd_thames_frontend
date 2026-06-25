// src/components/polizas/CuotasPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { HiCheckCircle, HiClock } from "react-icons/hi";

import { pagarCuota } from "../../store/slices/polizasSlice";
import { resumenCuotas } from "../../utils/cuotas";

const CARD = "rounded-2xl border border-white/[0.06] bg-[#121829]";

export default function CuotasPanel({ poliza }) {
  const dispatch = useDispatch();

  const [rows, setRows] = useState(Array.isArray(poliza?.cuotas) ? poliza.cuotas : []);
  useEffect(() => {
    setRows(Array.isArray(poliza?.cuotas) ? poliza.cuotas : []);
  }, [poliza?.cuotas]);

  const [busyIds, setBusyIds] = useState({});
  const resumen = useMemo(() => resumenCuotas(rows), [rows]);
  const progreso = resumen.total ? Math.round((resumen.pagadas / resumen.total) * 100) : 0;

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

  const fmtMonto = (m) => {
    const n = Number(m || 0);
    if (!n) return null;
    return `$ ${n.toLocaleString("es-AR")}`;
  };

  return (
    <div className="space-y-4">
      {/* Progreso */}
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>{resumen.pagadas} de {resumen.total} pagadas</span>
          <span>{progreso}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progreso}%` }} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className={`${CARD} p-3 text-center`}>
          <div className="text-lg font-semibold text-emerald-400">{resumen.pagadas}</div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Pagadas</div>
        </div>
        <div className={`${CARD} p-3 text-center`}>
          <div className="text-lg font-semibold text-amber-400">{resumen.pendientes}</div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Pendientes</div>
        </div>
        <div className={`${CARD} p-3 text-center`}>
          <div className="text-lg font-semibold text-rose-400">{resumen.vencidas}</div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Vencidas</div>
        </div>
      </div>

      {/* Lista de cuotas */}
      <div className={`${CARD} overflow-hidden`}>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Esta póliza no tiene cuotas registradas.
          </div>
        ) : (
          rows.map((c) => {
            const monto = fmtMonto(c.monto);
            return (
              <div key={c.id} className="flex items-center justify-between gap-3 border-b border-white/5 px-3.5 py-3 last:border-0">
                <div className="flex min-w-0 items-center gap-3">
                  {c.pagado ? (
                    <HiCheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
                  ) : (
                    <HiClock className="h-5 w-5 shrink-0 text-amber-400" />
                  )}
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-slate-100">
                      Cuota {c.cuota_nro}{monto ? <span className="ml-1.5 text-slate-500">· {monto}</span> : null}
                    </div>
                    <div className={`text-[11px] ${c.pagado ? "text-emerald-400" : "text-amber-400"}`}>
                      {c.pagado
                        ? `Pagada${c.fecha_pago ? " · " + dayjs(c.fecha_pago).format("DD/MM/YYYY") : ""}`
                        : `Vence ${c.fecha_vencimiento ? dayjs(c.fecha_vencimiento).format("DD/MM/YYYY") : "—"}`}
                    </div>
                  </div>
                </div>

                {!c.pagado ? (
                  <button
                    onClick={() => handleMarcarPagada(c)}
                    disabled={!!busyIds[c.id]}
                    className="shrink-0 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    {busyIds[c.id] ? "..." : "Marcar pagada"}
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}