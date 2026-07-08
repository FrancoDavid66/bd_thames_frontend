// src/components/polizas/CuotasPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { HiCheckCircle, HiClock, HiExclamationCircle, HiShieldCheck, HiShieldExclamation } from "react-icons/hi";

import { pagarCuota } from "../../store/slices/polizasSlice";

const CARD = "rounded-2xl border border-white/[0.06] bg-[#121829]";

/* ═══════════════════════════════════════════════════════════════════
   ¿La póliza usa CUPONERA? (AMCA / Antártida / La Equidad)
   ───────────────────────────────────────────────────────────────────
   En esas compañías, cada cupón trae IMPRESA su propia fecha de pago
   (la de Rapipago / Pago Fácil). Por eso la cuota se muestra y se evalúa
   por su PROPIO fecha_vencimiento, no por el de la cuota anterior.
   ═══════════════════════════════════════════════════════════════════ */
function esCuponera(poliza) {
  const c = `${poliza?.compania || ""} ${poliza?.compania_nombre || ""}`.toLowerCase();
  return /amca|antartida|antártida|equidad|mutual/.test(c);
}

/* ═══════════════════════════════════════════════════════════════════
   FECHA OBJETIVO DE UNA CUOTA
   ───────────────────────────────────────────────────────────────────
   - Cuponera (usarPropio = true) → su PROPIO vto (fecha del cupón).
   - Resto (NRE, etc.)            → vto de la cuota ANTERIOR (pago por
     adelantado). Cuota #1 (no hay anterior) = su propio vto.
   ═══════════════════════════════════════════════════════════════════ */
function fechaObjetivo(idx, lista, usarPropio) {
  const actual = lista[idx];
  const propio = actual?.fecha_vencimiento ? dayjs(actual.fecha_vencimiento).startOf("day") : null;
  if (usarPropio) return propio;
  if (idx > 0) {
    const anterior = lista[idx - 1];
    if (anterior?.fecha_vencimiento) return dayjs(anterior.fecha_vencimiento).startOf("day");
  }
  return propio;
}

function estadoReal(idx, lista, usarPropio) {
  const c = lista[idx];
  if (c?.pagado) return "pagada";
  const payby = fechaObjetivo(idx, lista, usarPropio);
  if (!payby || !payby.isValid()) return "pendiente";
  const diff = payby.diff(dayjs().startOf("day"), "day");
  if (diff < 0) return "vencida";
  if (diff === 0) return "vence_hoy";
  return "pendiente";
}

const ROW = {
  pagada:    { icon: HiCheckCircle,       color: "text-emerald-400" },
  vencida:   { icon: HiExclamationCircle, color: "text-rose-400" },
  vence_hoy: { icon: HiClock,             color: "text-orange-400" },
  pendiente: { icon: HiClock,             color: "text-amber-400" },
};

export default function CuotasPanel({ poliza }) {
  const dispatch = useDispatch();

  const [rows, setRows] = useState(Array.isArray(poliza?.cuotas) ? poliza.cuotas : []);
  useEffect(() => {
    setRows(Array.isArray(poliza?.cuotas) ? poliza.cuotas : []);
  }, [poliza?.cuotas]);

  const [busyIds, setBusyIds] = useState({});

  // ¿Esta póliza usa cuponera? (AMCA/Antártida/La Equidad → fecha propia)
  const usarPropio = useMemo(
    () => esCuponera(poliza),
    [poliza?.compania, poliza?.compania_nombre]
  );

  // Ordenamos por número de cuota para poder mirar la cuota anterior.
  const cuotasOrdenadas = useMemo(
    () => [...rows].sort((a, b) => Number(a?.cuota_nro || 0) - Number(b?.cuota_nro || 0)),
    [rows]
  );

  // Resumen calculado con la fecha objetivo correcta según el tipo de póliza.
  const resumen = useMemo(() => {
    let pagadas = 0, pendientes = 0, vencidas = 0;
    cuotasOrdenadas.forEach((_c, i) => {
      const st = estadoReal(i, cuotasOrdenadas, usarPropio);
      if (st === "pagada") pagadas += 1;
      else if (st === "vencida") vencidas += 1;
      else pendientes += 1; // pendiente + vence_hoy
    });
    return { total: cuotasOrdenadas.length, pagadas, pendientes, vencidas };
  }, [cuotasOrdenadas, usarPropio]);


  // Cobertura real: hasta cuándo quedó cubierto el cliente según la última cuota PAGADA.
  const coberturaResumen = useMemo(() => {
    const pagadas = cuotasOrdenadas.filter((c) => c.pagado);
    if (!pagadas.length) return null;
    const ultima = pagadas.reduce(
      (max, c) => (Number(c.cuota_nro) > Number(max.cuota_nro) ? c : max),
      pagadas[0]
    );
    const hasta = ultima?.fecha_vencimiento ? dayjs(ultima.fecha_vencimiento).startOf("day") : null;
    if (!hasta || !hasta.isValid()) return null;
    const vigente = hasta.diff(dayjs().startOf("day"), "day") >= 0;
    return { hasta, vigente };
  }, [cuotasOrdenadas]);

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
  const fmtFecha = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");

  return (
    <div className="space-y-4">
      {/* Cobertura real (hasta cuándo está cubierto) */}
      {coberturaResumen ? (
        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 ${
            coberturaResumen.vigente
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-rose-500/30 bg-rose-500/10"
          }`}
        >
          {coberturaResumen.vigente ? (
            <HiShieldCheck className="h-6 w-6 shrink-0 text-emerald-400" />
          ) : (
            <HiShieldExclamation className="h-6 w-6 shrink-0 text-rose-400" />
          )}
          <div>
            <div
              className={`text-[10px] uppercase tracking-wide font-bold ${
                coberturaResumen.vigente ? "text-emerald-300/70" : "text-rose-300/70"
              }`}
            >
              {coberturaResumen.vigente ? "Cobertura vigente hasta" : "Cobertura vencida desde"}
            </div>
            <div
              className={`text-lg font-bold ${
                coberturaResumen.vigente ? "text-emerald-200" : "text-rose-200"
              }`}
            >
              {fmtFecha(coberturaResumen.hasta)}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-[#121829] p-4 text-sm text-slate-400">
          Sin pagos registrados todavía · no hay cobertura activa.
        </div>
      )}

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
        {cuotasOrdenadas.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Esta póliza no tiene cuotas registradas.
          </div>
        ) : (
          cuotasOrdenadas.map((c, i) => {
            const monto = fmtMonto(c.monto);
            const st = estadoReal(i, cuotasOrdenadas, usarPropio);
            const payby = fechaObjetivo(i, cuotasOrdenadas, usarPropio);
            const cfg = ROW[st] || ROW.pendiente;
            const Icon = cfg.icon;

            let sub;
            if (st === "pagada") {
              sub = `Pagada${c.fecha_pago ? " · " + fmtFecha(c.fecha_pago) : ""}`;
            } else if (st === "vencida") {
              sub = `Impaga · venció el ${fmtFecha(payby)}`;
            } else if (st === "vence_hoy") {
              sub = "Vence hoy · pagar hoy";
            } else {
              sub = `A pagar antes del ${fmtFecha(payby)}`;
            }

            return (
              <div key={c.id} className="flex items-center justify-between gap-3 border-b border-white/5 px-3.5 py-3 last:border-0">
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className={`h-5 w-5 shrink-0 ${cfg.color}`} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-slate-100">
                      Cuota {c.cuota_nro}{monto ? <span className="ml-1.5 text-slate-500">· {monto}</span> : null}
                    </div>
                    <div className={`text-[11px] ${cfg.color}`}>{sub}</div>
                  </div>
                </div>

                {!c.pagado ? (
                  <button
                    onClick={() => handleMarcarPagada(c)}
                    disabled={!!busyIds[c.id]}
                    className={`shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${
                      st === "vencida"
                        ? "border-rose-500/25 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                        : "border-emerald-500/25 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    }`}
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