// src/components/polizas/CuotasPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { HiRefresh, HiX, HiCheck, HiChatAlt2 } from "react-icons/hi"; // ✅ Agregamos el ícono de Chat
import { PolizasAPI } from "../../api/polizas";
import { pagarCuota } from "../../store/slices/polizasSlice";
import axios from "axios";

// Configuración base para llamadas directas
const RAW_BASE = (import.meta.env?.VITE_API_URL || "/api/").toString().trim();
const BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;
const http = axios.create({ baseURL: BASE, withCredentials: true });

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

/* ===================== Modal Renovación (Se mantiene igual) ===================== */
function RenovarPolizaNumeroModal({ open, onClose, polizaId, numeroActual, onSuccess }) {
  const [nuevoNumero, setNuevoNumero] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const sugerido = (() => {
    const base = numeroActual || "";
    if (!base) return "";
    const y = new Date().getFullYear();
    return `${base}-R${y}`;
  })();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setNuevoNumero("");
  }, [open]);

  const handleSubmit = async () => {
    if (!polizaId) return;
    setBusy(true);
    try {
      const payload = {};
      const trimmed = String(nuevoNumero).trim();
      if (trimmed !== "") payload.nuevo_numero = trimmed;
      const nueva = await PolizasAPI.renovarPoliza(polizaId, payload);
      toast.success("Póliza renovada");
      onSuccess?.(nueva);
      onClose?.();
    } catch (e) {
      toast.error(e?.message || "No se pudo renovar");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-br from-sky-500/40 via-slate-900 to-black p-[1px] shadow-2xl shadow-black/60">
        <div className="rounded-2xl bg-slate-950">
          <div className="border-b border-white/10 px-4 py-3">
            <h3 className="text-white text-base sm:text-lg font-semibold">Renovar póliza</h3>
            <p className="text-white/70 text-xs sm:text-sm mt-1">Ingresá el nuevo número de póliza.</p>
          </div>
          <div className="p-4 grid gap-3">
            <div>
              <input
                ref={inputRef}
                value={nuevoNumero}
                onChange={(e) => setNuevoNumero(e.target.value)}
                placeholder={sugerido || "Ej: 12-345678-R2025"}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-sky-400/60"
              />
            </div>
          </div>
          <div className="border-t border-white/10 px-4 py-3 flex gap-2 justify-end">
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-white/5 text-white text-sm">Cancelar</button>
            <button onClick={handleSubmit} disabled={busy} className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-sm">{busy ? "Creando..." : "Confirmar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== Panel principal ===================== */
export default function CuotasPanel({ poliza, polizaId, onRenovada }) {
  const dispatch = useDispatch();

  const [rows, setRows] = useState(Array.isArray(poliza?.cuotas) ? poliza.cuotas : []);
  useEffect(() => {
    setRows(Array.isArray(poliza?.cuotas) ? poliza.cuotas : []);
  }, [poliza?.cuotas]);

  const [busyIds, setBusyIds] = useState({});
  const [enviandoPostVenta, setEnviandoPostVenta] = useState(false); // ✅ Estado de carga para el mensaje

  const resumen = useMemo(() => {
    const total = rows.length;
    const pagadas = rows.filter((c) => c?.pagado).length;
    const pendientes = rows.filter((c) => !c?.pagado).length;
    const vencidas = rows.filter((c) => !c?.pagado && estadoCuota(c) === "vencida").length;
    return { total, pagadas, pendientes, vencidas };
  }, [rows]);

  const id = Number(polizaId ?? poliza?.id);
  const numeroActual = poliza?.numero_poliza || poliza?.numero || poliza?.nro_poliza || "";

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

  // ✅ FUNCIÓN PARA ENVIAR POST-VENTA
  const handleEnviarPostVenta = async () => {
    if (!id) return;
    setEnviandoPostVenta(true);
    try {
      await http.post(`polizas/${id}/enviar-postventa/`);
      toast.success("Mensaje de post-venta enviado con UltraMsg ✅");
    } catch (err) {
      toast.error("Hubo un error al enviar el mensaje.");
    } finally {
      setEnviandoPostVenta(false);
    }
  };

  const [openRenovar, setOpenRenovar] = useState(false);

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 sm:p-5 shadow-lg shadow-black/40">
      
      {/* Header + CTAs */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/60">Sección operativa</div>
          <h3 className="text-lg sm:text-xl font-semibold text-white">Gestión de Cuotas</h3>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
          {/* ✅ NUEVO BOTÓN POST VENTA */}
          <button
            onClick={handleEnviarPostVenta}
            disabled={enviandoPostVenta}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-3 py-2 transition-colors disabled:opacity-60"
            title="Enviar mensaje de bienvenida y postventa al cliente"
          >
            {enviandoPostVenta ? <HiRefresh className="w-4 h-4 animate-spin" /> : <HiChatAlt2 className="w-4 h-4" />}
            Enviar Post-Venta
          </button>

          <button
            onClick={() => setOpenRenovar(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm px-3 py-2 transition-colors"
          >
            <HiRefresh className="w-4 h-4" />
            Renovar póliza
          </button>
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

      {/* Lista de cuotas (CON FECHAS ACLARADAS) */}
      <div className="rounded-2xl border border-neutral-800 overflow-hidden bg-neutral-950/70 divide-y divide-neutral-800">
        {rows.map((cuota) => {
          const estado = estadoCuota(cuota);
          const isBusy = !!busyIds[cuota.id];

          // ✅ LÓGICA VISUAL DE COBERTURA: Calculamos 1 mes extra para mostrarlo clarito
          const vto = cuota?.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento) : null;
          const vtoFormat = vto ? vto.format("DD/MM/YYYY") : "-";
          const cubreHasta = vto ? vto.add(1, 'month').format("DD/MM/YYYY") : "-";

          return (
            <div key={cuota.id} className="p-4 sm:p-5 bg-neutral-950 hover:bg-neutral-900/90 transition-colors">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                
                {/* Título de la cuota */}
                <div className="flex flex-col gap-1.5 md:w-32">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">#{cuota.cuota_nro}</span>
                    {estadoCuotaBadge(estado)}
                  </div>
                  <div className="text-xs text-neutral-400">
                    Monto: <span className="text-white font-medium">{currency(cuota?.monto ?? cuota?.importe)}</span>
                  </div>
                </div>

                {/* ✅ DATOS DE FECHA MEJORADOS */}
                <div className="grid grid-cols-2 gap-4 flex-1 md:px-6">
                  {/* Fecha exigible de pago */}
                  <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                    <div className="text-[10px] uppercase tracking-wide text-rose-300/80 mb-0.5">Día de Pago (Vto)</div>
                    <div className="font-bold text-white text-sm">{vtoFormat}</div>
                  </div>
                  
                  {/* Período de cobertura (Elimina confusión) */}
                  <div className="bg-sky-500/5 rounded-lg p-2 border border-sky-500/10">
                    <div className="text-[10px] uppercase tracking-wide text-sky-300/80 mb-0.5">Cubre Cobertura del:</div>
                    <div className="font-medium text-white text-xs">
                      {vtoFormat} <span className="text-sky-400 mx-1">al</span> {cubreHasta}
                    </div>
                  </div>
                </div>

                {/* Acción de Pago */}
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
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-xs sm:text-sm border border-emerald-500/60 disabled:opacity-60 font-semibold"
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

      <RenovarPolizaNumeroModal
        open={openRenovar}
        onClose={() => setOpenRenovar(false)}
        polizaId={id}
        numeroActual={numeroActual}
        onSuccess={(nuevaPoliza) => {
          toast.success(`Se creó la póliza #${nuevaPoliza?.numero_poliza || nuevaPoliza?.id}`);
          onRenovada?.(nuevaPoliza);
        }}
      />
    </div>
  );
}