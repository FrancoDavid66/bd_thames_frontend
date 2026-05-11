// src/components/polizas/CuotasPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { HiRefresh, HiCheck, HiChatAlt2 } from "react-icons/hi"; 
// 🗑️ PolizasAPI eliminada porque solo se usaba para renovar
import { pagarCuota } from "../../store/slices/polizasSlice";
// 🚀 INSTANCIA SEGURA: Mantenemos el interceptor de Token
import api from "../../services/api";

const today = () => dayjs().startOf("day");

const currency = (n) => {
  if (n == null || n === "") return "-";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(Number(n));
  } catch {
    return String(n);
  }
};

const estadoCuota = (c) => {
  if (c?.pagado) return "pagada";
  const v = c?.fecha_vencimiento ? dayjs(c.fecha_vencimiento) : null;
  if (!v || !v.isValid()) return "pendiente";
  const diff = v.startOf("day").diff(today(), "day");
  if (diff < 0) return "vencida";
  if (diff === 0) return "vence_hoy";
  return "por_vencer";
};

const estadoCuotaBadge = (estado) => {
  const map = {
    pagada: "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
    vencida: "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
    vence_hoy: "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30",
    por_vencer: "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/30",
    pendiente: "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-gray-500/15 text-gray-300 ring-1 ring-gray-500/30",
  };
  return (
    <span className={map[estado] || map.pendiente}>
      {(estado || "").replace("_", " ")}
    </span>
  );
};

/* 🗑️ Modal de Renovación eliminado por completo de este archivo */

/* ===================== Panel principal ===================== */
export default function CuotasPanel({ poliza, polizaId }) {
  const dispatch = useDispatch();

  const [rows, setRows] = useState(Array.isArray(poliza?.cuotas) ? poliza.cuotas : []);
  useEffect(() => {
    setRows(Array.isArray(poliza?.cuotas) ? poliza.cuotas : []);
  }, [poliza?.cuotas]);

  const [busyIds, setBusyIds] = useState({});
  const [enviandoPostVenta, setEnviandoPostVenta] = useState(false); 

  const resumen = useMemo(() => {
    const total = rows.length;
    const pagadas = rows.filter((c) => c?.pagado).length;
    const pendientes = rows.filter((c) => !c?.pagado).length;
    const vencidas = rows.filter((c) => !c?.pagado && estadoCuota(c) === "vencida").length;
    return { total, pagadas, pendientes, vencidas };
  }, [rows]);

  const id = Number(polizaId ?? poliza?.id);

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

  const handleEnviarPostVenta = async () => {
    if (!id) return;
    setEnviandoPostVenta(true);
    try {
      // 🚀 Usamos 'api' centralizada para evitar 401
      await api.post(`polizas/${id}/enviar-postventa/`);
      toast.success("Mensaje de post-venta enviado ✅");
    } catch (err) {
      console.error("Error Post-Venta:", err);
      toast.error("Error al enviar mensaje.");
    } finally {
      setEnviandoPostVenta(false);
    }
  };

  // ─── Helpers de cobertura (misma lógica que PolizaCuotasCard y FacturaCuota) ─

  const sumarDiasHabiles = (fecha, dias) => {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return null;
    let added = 0;
    while (added < dias) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) added++;
    }
    return dayjs(d).startOf("day");
  };

  const calcularCobertura = (cuota, idx) => {
    const fv = cuota?.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).startOf("day") : null;
    const fechaPago = cuota?.pago_registrado_en || cuota?.fecha_pago;
    const fp = fechaPago ? dayjs(fechaPago).startOf("day") : null;

    const cuotaAnterior  = idx > 0 ? rows[idx - 1] : null;
    const cuotaSiguiente = idx < rows.length - 1 ? rows[idx + 1] : null;
    const fvAnterior  = cuotaAnterior?.fecha_vencimiento  ? dayjs(cuotaAnterior.fecha_vencimiento).startOf("day")  : null;
    const fvSiguiente = cuotaSiguiente?.fecha_vencimiento ? dayjs(cuotaSiguiente.fecha_vencimiento).startOf("day") : null;

    const pagoAtrasado = cuota?.pagado && fp && fv ? fp.isAfter(fv) : false;

    if (!cuota?.pagado) {
      return { tipo: "sin_cobertura", desde: fv, hasta: null };
    }
    if (pagoAtrasado) {
      const desde = fp ? sumarDiasHabiles(fechaPago, 2) : null;
      const hasta = fvSiguiente || (fv ? fv.add(1, "month") : null);
      return { tipo: "atrasado", desde, hasta };
    }
    const desde = idx === 0
      ? (poliza?.fecha_emision ? dayjs(poliza.fecha_emision).startOf("day") : fv)
      : (fvAnterior ? fvAnterior.add(1, "day") : null);
    return { tipo: "ok", desde, hasta: fv };
  };

  const fmt = (d) => (d && d.isValid && d.isValid()) ? d.format("DD/MM/YYYY") : "-";

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 sm:p-5 shadow-lg shadow-black/40">

      {/* Header + CTAs */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/60">Sección operativa</div>
          <h3 className="text-lg sm:text-xl font-semibold text-white">Gestión de Cuotas</h3>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
          {/* BOTÓN POST VENTA */}
          <button
            onClick={handleEnviarPostVenta}
            disabled={enviandoPostVenta}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-3 py-2 transition-colors disabled:opacity-60"
            title="Enviar mensaje de bienvenida y postventa al cliente"
          >
            {enviandoPostVenta ? <HiRefresh className="w-4 h-4 animate-spin" /> : <HiChatAlt2 className="w-4 h-4" />}
            Enviar Post-Venta
          </button>

          {/* 🗑️ Botón de Renovación eliminado de aquí */}
        </div>
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

      {/* Lista de cuotas */}
      <div className="rounded-2xl border border-neutral-800 overflow-hidden bg-neutral-950/70 divide-y divide-neutral-800">
        {rows.map((cuota, idx) => {
          const estado = estadoCuota(cuota);
          const isBusy = !!busyIds[cuota.id];
          const vto = cuota?.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento) : null;
          const vtoFormat = vto ? vto.format("DD/MM/YYYY") : "-";

          const cobertura = calcularCobertura(cuota, idx);

          return (
            <div key={cuota.id} className="p-4 sm:p-5 bg-neutral-950 hover:bg-neutral-900/90 transition-colors">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                
                <div className="flex flex-col gap-1.5 md:w-32">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">#{cuota.cuota_nro}</span>
                    {estadoCuotaBadge(estado)}
                  </div>
                  <div className="text-xs text-neutral-400">
                    Monto: <span className="text-white font-medium">{currency(cuota?.monto ?? cuota?.importe)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 flex-1 md:px-6">
                  <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                    <div className="text-[10px] uppercase tracking-wide text-rose-300/80 mb-0.5">Vencimiento</div>
                    <div className="font-bold text-white text-sm">{vtoFormat}</div>
                    {cuota.fecha_pago && (
                      <div className="text-[10px] text-emerald-400/70 mt-0.5">
                        Pagada: {dayjs(cuota.pago_registrado_en || cuota.fecha_pago).format("DD/MM/YYYY")}
                      </div>
                    )}
                  </div>
                  
                  {cobertura.tipo === "sin_cobertura" ? (
                    <div className="bg-rose-500/10 rounded-lg p-2 border border-rose-500/30">
                      <div className="text-[10px] uppercase tracking-wide text-rose-400 mb-0.5">⚠️ Sin cobertura</div>
                      <div className="font-medium text-rose-300 text-xs">
                        Desde {fmt(cobertura.desde)}
                      </div>
                    </div>
                  ) : cobertura.tipo === "atrasado" ? (
                    <div className="bg-orange-500/10 rounded-lg p-2 border border-orange-500/30">
                      <div className="text-[10px] uppercase tracking-wide text-orange-400 mb-0.5">⏱ Cubre (pago tardío)</div>
                      <div className="font-medium text-orange-200 text-xs">
                        {fmt(cobertura.desde)} <span className="text-orange-400 mx-1">al</span> {fmt(cobertura.hasta)}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-sky-500/5 rounded-lg p-2 border border-sky-500/10">
                      <div className="text-[10px] uppercase tracking-wide text-sky-300/80 mb-0.5">Cubre</div>
                      <div className="font-medium text-white text-xs">
                        {fmt(cobertura.desde)} <span className="text-sky-400 mx-1">al</span> {fmt(cobertura.hasta)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex md:justify-end md:w-48">
                  {cuota?.pagado ? (
                    <div className="flex flex-col items-end w-full">
                      <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-700/40 bg-emerald-700/20 px-3 py-2 text-xs sm:text-sm text-emerald-300 font-bold">
                        <HiCheck className="h-4 w-4" /> Pagada
                      </span>
                      {cuota.fecha_pago && (
                        <span className="text-[10px] text-emerald-400/60 mt-1">
                          Abonado el {dayjs(cuota.fecha_pago).format("DD/MM/YYYY")}
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleMarcarPagada(cuota)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-xs sm:text-sm border border-emerald-500/60 disabled:opacity-60 font-semibold transition-all active:scale-95"
                    >
                      {isBusy ? <HiRefresh className="h-4 w-4 animate-spin" /> : <HiCheck className="h-4 w-4" />}
                      Marcar Pagada
                    </button>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}