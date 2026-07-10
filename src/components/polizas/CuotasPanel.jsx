// src/components/polizas/CuotasPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import axios from "axios";
import { HiX, HiShieldCheck, HiShieldExclamation } from "react-icons/hi";

import { pagarCuota } from "../../store/slices/polizasSlice";
import CuotaInfoCard from "./CuotaInfoCard";

const BASE_URL = import.meta.env.VITE_API_URL || "/api/";

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

export default function CuotasPanel({ poliza }) {
  const dispatch = useDispatch();

  const [rows, setRows] = useState(Array.isArray(poliza?.cuotas) ? poliza.cuotas : []);
  useEffect(() => {
    setRows(Array.isArray(poliza?.cuotas) ? poliza.cuotas : []);
  }, [poliza?.cuotas]);

  const [busyIds, setBusyIds] = useState({});

  // 🆕 Estados del modal "Cambiar fecha de vencimiento"
  const [modalFechaOpen, setModalFechaOpen] = useState(false);
  const [cuotaFechaSeleccionada, setCuotaFechaSeleccionada] = useState(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [ajustarSiguientes, setAjustarSiguientes] = useState(true);
  const [isSubmittingFecha, setIsSubmittingFecha] = useState(false);

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

  // 🆕 Abrir modal de cambio de fecha (para CUALQUIER cuota, pagada o no)
  const abrirModalFecha = (cuota) => {
    setCuotaFechaSeleccionada(cuota);
    setNuevaFecha(cuota?.fecha_vencimiento ? String(cuota.fecha_vencimiento).slice(0, 10) : dayjs().format("YYYY-MM-DD"));
    setAjustarSiguientes(true);
    setModalFechaOpen(true);
  };
  const cerrarModalFecha = () => {
    if (isSubmittingFecha) return;
    setModalFechaOpen(false);
    setCuotaFechaSeleccionada(null);
  };

  const handleCambiarFecha = async () => {
    if (!cuotaFechaSeleccionada || !nuevaFecha) return;
    setIsSubmittingFecha(true);
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("jwt");
      const res = await axios.patch(
        `${BASE_URL.replace(/\/+$/, "")}/cuotas/${cuotaFechaSeleccionada.id}/cambiar-fecha/`,
        { nueva_fecha: nuevaFecha, ajustar_siguientes: ajustarSiguientes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const nuevasFechas = new Map();
      nuevasFechas.set(cuotaFechaSeleccionada.id, nuevaFecha);

      if (ajustarSiguientes) {
        let currentBaseDate = dayjs(nuevaFecha);
        rows
          .filter((c) => Number(c.cuota_nro) > Number(cuotaFechaSeleccionada.cuota_nro))
          .sort((a, b) => Number(a.cuota_nro) - Number(b.cuota_nro))
          .forEach((c) => {
            currentBaseDate = currentBaseDate.add(1, "month");
            nuevasFechas.set(c.id, currentBaseDate.format("YYYY-MM-DD"));
          });
      }

      setRows((prev) =>
        prev.map((c) => (nuevasFechas.has(c.id) ? { ...c, fecha_vencimiento: nuevasFechas.get(c.id) } : c))
      );

      toast.success(`¡Listo! Se actualizaron ${res.data?.cuotas_modificadas || 1} cuotas.`);
      setModalFechaOpen(false);
      setCuotaFechaSeleccionada(null);
    } catch (error) {
      toast.error(error.response?.data?.nueva_fecha || error.response?.data?.detail || "Error al cambiar la fecha");
    } finally {
      setIsSubmittingFecha(false);
    }
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
      <div className={`${CARD} overflow-hidden divide-y divide-white/5`}>
        {cuotasOrdenadas.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Esta póliza no tiene cuotas registradas.
          </div>
        ) : (
          cuotasOrdenadas.map((c, i) => {
            // 🎯 Para AMCA/cuponera (usarPropio) la fecha límite de pago es la PROPIA;
            // para el resto (NRE, pago adelantado) es la de la cuota ANTERIOR.
            // Se la inyectamos como fecha_limite_pago: utils/cuotas.js ya la prioriza
            // (fechaLimitePago) sin que haya que tocar ese archivo compartido.
            const objetivo = fechaObjetivo(i, cuotasOrdenadas, usarPropio);
            const cuotaConLimite = {
              ...c,
              fecha_limite_pago: objetivo && objetivo.isValid() ? objetivo.format("YYYY-MM-DD") : null,
            };

            return (
              <CuotaInfoCard
                key={c.id}
                cuota={cuotaConLimite}
                todasLasCuotas={cuotasOrdenadas}
                idx={i}
                polizaFechaEmision={poliza?.fecha_emision}
                onMarcarPagada={handleMarcarPagada}
                onCambiarFecha={abrirModalFecha}
                busy={!!busyIds[c.id]}
                variant="full"
              />
            );
          })
        )}
      </div>

      {/* Modal: Cambiar fecha de vencimiento (cualquier cuota, pagada o no) */}
      {modalFechaOpen && cuotaFechaSeleccionada && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-3">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={isSubmittingFecha ? undefined : cerrarModalFecha} />
          <div className="relative z-[71] w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 px-5 py-5 sm:px-6 sm:py-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-white">Cambiar Vencimiento</h3>
              <button onClick={cerrarModalFecha} disabled={isSubmittingFecha} className="h-8 w-8 rounded-lg border flex items-center justify-center text-slate-300 bg-slate-700 hover:bg-slate-600 border-slate-600 cursor-pointer">
                <HiX className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Cuota <span className="font-bold text-emerald-400">#{cuotaFechaSeleccionada.cuota_nro}</span>
              </p>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">Nueva fecha</label>
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-600 text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                />
              </div>
              <label className="flex items-start gap-3 cursor-pointer mt-2 bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20">
                <input
                  type="checkbox"
                  checked={ajustarSiguientes}
                  onChange={(e) => setAjustarSiguientes(e.target.checked)}
                  className="mt-1 accent-indigo-500 w-4 h-4"
                />
                <span className="text-sm text-indigo-200">
                  Ajustar automáticamente los vencimientos de las <strong>cuotas siguientes</strong> (+1 mes a cada una).
                </span>
              </label>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={cerrarModalFecha} disabled={isSubmittingFecha} className="h-10 px-4 rounded-xl border border-slate-600 bg-slate-700 text-sm text-white hover:bg-slate-600 cursor-pointer font-medium">
                  Cancelar
                </button>
                <button
                  onClick={handleCambiarFecha}
                  disabled={isSubmittingFecha || !nuevaFecha}
                  className="h-10 px-4 rounded-xl border border-transparent bg-indigo-500 text-sm font-bold text-white hover:bg-indigo-400 flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/30"
                >
                  {isSubmittingFecha ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}