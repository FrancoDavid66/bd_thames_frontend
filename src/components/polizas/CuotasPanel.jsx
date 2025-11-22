// src/components/polizas/CuotasPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { HiRefresh, HiX, HiCheck } from "react-icons/hi";
import { PolizasAPI } from "../../api/polizas";
import { pagarCuota } from "../../store/slices/polizasSlice";

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
    pagada:
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30",
    vencida:
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-300 ring-1 ring-red-500/30",
    vence_hoy:
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-300 ring-1 ring-orange-500/30",
    por_vencer:
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-300 ring-1 ring-yellow-500/30",
    pendiente:
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-300 ring-1 ring-gray-500/30",
  };
  return (
    <span className={map[estado] || map.pendiente}>
      {(estado || "").replace("_", " ")}
    </span>
  );
};

/* ===================== Modal integrado: Renovar con nuevo número ===================== */
function RenovarPolizaNumeroModal({ open, onClose, polizaId, numeroActual, onSuccess }) {
  const [nuevoNumero, setNuevoNumero] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  // Placeholder sugerido (podés quitarlo si no lo querés)
  const sugerido = (() => {
    const base = numeroActual || "";
    if (!base) return "";
    const y = new Date().getFullYear();
    return `${base}-R${y}`;
  })();

  // Autofocus cuando abre
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setNuevoNumero("");
    }
  }, [open]);

  // Atajos de teclado
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Enter") handleSubmit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nuevoNumero, polizaId]);

  const handleSubmit = async () => {
    if (!polizaId) {
      toast.error("No se encontró la póliza");
      return;
    }
    setBusy(true);
    try {
      const payload = {};
      const trimmed = String(nuevoNumero).trim();
      if (trimmed !== "") payload.nuevo_numero = trimmed; // snake_case para Django
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
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-br from-sky-500/40 via-slate-900 to-black p-[1px] shadow-2xl shadow-black/60">
        <div className="rounded-2xl bg-slate-950">
          <div className="border-b border-white/10 px-4 py-3">
            <h3 className="text-white text-base sm:text-lg font-semibold">
              Renovar póliza
            </h3>
            <p className="text-white/70 text-xs sm:text-sm mt-1">
              Ingresá el <b>nuevo número de póliza</b>. Si lo dejás vacío, el
              sistema puede asignarlo automáticamente (según backend).
            </p>
          </div>

          <div className="p-4 grid gap-3">
            <div>
              <label className="block text-xs text-white/70 mb-1">
                Nuevo número de póliza
              </label>
              <input
                ref={inputRef}
                value={nuevoNumero}
                onChange={(e) => setNuevoNumero(e.target.value)}
                placeholder={sugerido || "Ej: 12-345678-R2025"}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-sky-400/60"
              />
              <p className="mt-1 text-[11px] text-white/60">
                Actual: <span className="font-mono">{numeroActual || "—"}</span>
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 px-4 py-3 flex flex-col sm:flex-row sm:justify-end gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm border border-white/10 transition-colors cursor-pointer w-full sm:w-auto"
            >
              <HiX className="w-4 h-4" /> Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-60 w-full sm:w-auto"
            >
              {busy ? (
                <HiRefresh className="w-4 h-4 animate-spin" />
              ) : (
                <HiCheck className="w-4 h-4" />
              )}
              {busy ? "Creando…" : "Confirmar renovación"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== Panel principal ===================== */
export default function CuotasPanel({ poliza, polizaId, onRenovada }) {
  const dispatch = useDispatch();

  // Trabajamos con una copia local para poder reflejar la acción “marcar pagada”
  const [rows, setRows] = useState(Array.isArray(poliza?.cuotas) ? poliza.cuotas : []);
  useEffect(() => {
    setRows(Array.isArray(poliza?.cuotas) ? poliza.cuotas : []);
  }, [poliza?.cuotas]);

  // Busy por cuota (para deshabilitar botón mientras se marca)
  const [busyIds, setBusyIds] = useState({}); // { [id]: true }

  const resumen = useMemo(() => {
    const total = rows.length;
    const pagadas = rows.filter((c) => c?.pagado).length;
    const pendientes = rows.filter((c) => !c?.pagado).length;
    const vencidas = rows.filter((c) => !c?.pagado && estadoCuota(c) === "vencida").length;
    return { total, pagadas, pendientes, vencidas };
  }, [rows]);

  const id = Number(polizaId ?? poliza?.id);
  const numeroActual =
    poliza?.numero_poliza || poliza?.numero || poliza?.nro_poliza || "";

  const handleMarcarPagada = async (cuota) => {
    if (!cuota?.id) return;
    if (cuota.pagado) return;
    setBusyIds((m) => ({ ...m, [cuota.id]: true }));
    try {
      const payload = { fecha_pago: dayjs().format("YYYY-MM-DD") };
      const updated = await dispatch(pagarCuota({ cuotaId: cuota.id, data: payload })).unwrap();
      // Optimista: reflejar el cambio en la lista local
      setRows((prev) =>
        prev.map((c) =>
          c.id === cuota.id
            ? {
                ...c,
                ...updated,
                pagado: true,
                fecha_pago: updated?.fecha_pago || payload.fecha_pago,
              }
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

  const [openRenovar, setOpenRenovar] = useState(false);

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 sm:p-5 shadow-lg shadow-black/40">
      {/* Header + CTA Renovar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/60">
            Sección
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-white">
            Cuotas
          </h3>
        </div>
        <button
          onClick={() => setOpenRenovar(true)}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm px-3 py-2 transition-colors cursor-pointer"
          title="Generar una nueva póliza con sus cuotas"
        >
          <HiRefresh className="w-4 h-4" />
          Renovar póliza
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-neutral-900/90 border border-neutral-800 p-3">
          <div className="text-[11px] text-neutral-400">Total</div>
          <div className="text-xl font-semibold text-white">
            {resumen.total}
          </div>
        </div>
        <div className="rounded-xl bg-neutral-900/90 border border-neutral-800 p-3">
          <div className="text-[11px] text-neutral-400">Pagadas</div>
          <div className="text-xl font-semibold text-emerald-400">
            {resumen.pagadas}
          </div>
        </div>
        <div className="rounded-xl bg-neutral-900/90 border border-neutral-800 p-3">
          <div className="text-[11px] text-neutral-400">Pendientes</div>
          <div className="text-xl font-semibold text-amber-300">
            {resumen.pendientes}
          </div>
        </div>
        <div className="rounded-xl bg-neutral-900/90 border border-neutral-800 p-3">
          <div className="text-[11px] text-neutral-400">Vencidas</div>
          <div className="text-xl font-semibold text-red-400">
            {resumen.vencidas}
          </div>
        </div>
      </div>

      {/* Lista de cuotas con acción de pago */}
      <div className="rounded-2xl border border-neutral-800 overflow-hidden bg-neutral-950/70 divide-y divide-neutral-800">
        {rows.map((cuota) => {
          const estado = estadoCuota(cuota);
          const isBusy = !!busyIds[cuota.id];
          return (
            <div
              key={cuota.id}
              className="p-4 sm:p-5 bg-neutral-950 hover:bg-neutral-900/90 transition-colors"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                {/* Izquierda: título + badge */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs text-neutral-400">Cuota</div>
                  <div className="text-lg font-semibold text-white">
                    #{cuota.cuota_nro}
                  </div>
                  {estadoCuotaBadge(estado)}
                </div>

                {/* Centro: datos */}
                <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm md:min-w-[320px]">
                  <div>
                    <div className="text-neutral-400">Vencimiento</div>
                    <div className="font-medium text-white">
                      {cuota?.fecha_vencimiento
                        ? dayjs(cuota.fecha_vencimiento).format("DD/MM/YYYY")
                        : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral-400">Monto</div>
                    <div className="font-medium text-white">
                      {currency(cuota?.monto ?? cuota?.importe)}
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral-400">Pago</div>
                    <div className="font-medium text-white">
                      {cuota?.pagado
                        ? dayjs(cuota?.fecha_pago).isValid()
                          ? dayjs(cuota.fecha_pago).format("DD/MM/YYYY")
                          : "-"
                        : "-"}
                    </div>
                  </div>
                </div>

                {/* Derecha: acción */}
                <div className="flex md:justify-end">
                  {cuota?.pagado ? (
                    <span className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-lg border border-emerald-700/40 bg-emerald-700/20 px-3 py-2 text-xs sm:text-sm text-emerald-200">
                      <HiCheck className="h-4 w-4" />
                      Pagada
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleMarcarPagada(cuota)}
                      className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-xs sm:text-sm border border-emerald-500/60 disabled:opacity-60"
                      title="Marcar esta cuota como pagada"
                    >
                      {isBusy ? (
                        <HiRefresh className="h-4 w-4 animate-spin" />
                      ) : (
                        <HiCheck className="h-4 w-4" />
                      )}
                      {isBusy ? "Marcando…" : "Marcar como pagada"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Renovación */}
      <RenovarPolizaNumeroModal
        open={openRenovar}
        onClose={() => setOpenRenovar(false)}
        polizaId={id}
        numeroActual={numeroActual}
        onSuccess={(nuevaPoliza) => {
          toast.success(
            `Se creó la póliza #${nuevaPoliza?.numero_poliza || nuevaPoliza?.id}`
          );
          onRenovada?.(nuevaPoliza);
        }}
      />
    </div>
  );
}
