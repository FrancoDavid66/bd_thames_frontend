// src/components/polizas/CuotasPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import axios from "axios";
import { HiShieldCheck, HiShieldExclamation } from "react-icons/hi";

import { pagarCuota } from "../../store/slices/polizasSlice";
import CuotaInfoCard from "./CuotaInfoCard";
import CardDuo from "../ui/CardDuo";
import BarraProgreso from "../ui/BarraProgreso";
import ModalDuo from "../ui/ModalDuo";
import InputDuo from "../ui/InputDuo";
import Boton3D from "../ui/Boton3D";

const BASE_URL = import.meta.env.VITE_API_URL || "/api/";

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
          className={`flex items-center gap-3 rounded-2xl border-2 p-4 ${
            coberturaResumen.vigente
              ? "border-duo-verde/40 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]"
              : "border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)]"
          }`}
        >
          {coberturaResumen.vigente ? (
            <HiShieldCheck className="h-6 w-6 shrink-0 text-duo-verde" />
          ) : (
            <HiShieldExclamation className="h-6 w-6 shrink-0 text-duo-rojo" />
          )}
          <div>
            <div
              className={`text-[10px] font-black uppercase tracking-wide ${
                coberturaResumen.vigente ? "text-duo-verde-sombra/70 dark:text-duo-verde/70" : "text-duo-rojo/70"
              }`}
            >
              {coberturaResumen.vigente ? "Cobertura vigente hasta" : "Cobertura vencida desde"}
            </div>
            <div
              className={`text-lg font-black ${
                coberturaResumen.vigente ? "text-duo-verde-sombra dark:text-duo-verde" : "text-duo-rojo"
              }`}
            >
              {fmtFecha(coberturaResumen.hasta)}
            </div>
          </div>
        </div>
      ) : (
        <CardDuo className="p-4 text-sm font-bold text-suave dark:text-suave-dark">
          Sin pagos registrados todavía · no hay cobertura activa.
        </CardDuo>
      )}

      {/* Progreso */}
      <BarraProgreso valor={progreso} label={`${resumen.pagadas} de ${resumen.total} pagadas`} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        <CardDuo className="p-3 text-center">
          <div className="text-lg font-black text-duo-verde-sombra dark:text-duo-verde">{resumen.pagadas}</div>
          <div className="text-[10px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark">Pagadas</div>
        </CardDuo>
        <CardDuo className="p-3 text-center">
          <div className="text-lg font-black text-duo-amarillo-sombra dark:text-duo-amarillo">{resumen.pendientes}</div>
          <div className="text-[10px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark">Pendientes</div>
        </CardDuo>
        <CardDuo className="p-3 text-center">
          <div className="text-lg font-black text-duo-rojo">{resumen.vencidas}</div>
          <div className="text-[10px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark">Vencidas</div>
        </CardDuo>
      </div>

      {/* Lista de cuotas */}
      <CardDuo className="overflow-hidden divide-y-2 divide-linea dark:divide-linea-dark">
        {cuotasOrdenadas.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-suave dark:text-suave-dark">
            Esta póliza no tiene cuotas registradas.
          </div>
        ) : (
          cuotasOrdenadas.map((c, i) => {
            // 🎯 Para AMCA/cuponera (usarPropio) la fecha límite de pago es la PROPIA;
            // para el resto (NRE, pago adelantado) es la de la cuota ANTERIOR.
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
      </CardDuo>

      {/* Modal: Cambiar fecha de vencimiento (cualquier cuota, pagada o no) */}
      <ModalDuo
        isOpen={modalFechaOpen && !!cuotaFechaSeleccionada}
        onClose={cerrarModalFecha}
        title="Cambiar Vencimiento"
        subtitle={cuotaFechaSeleccionada ? `Cuota #${cuotaFechaSeleccionada.cuota_nro}` : ""}
        size="sm"
        footer={
          <>
            <Boton3D variant="blanco" onClick={cerrarModalFecha} disabled={isSubmittingFecha} full>
              Cancelar
            </Boton3D>
            <Boton3D variant="verde" onClick={handleCambiarFecha} disabled={isSubmittingFecha || !nuevaFecha} full>
              {isSubmittingFecha ? "Guardando..." : "Guardar cambios"}
            </Boton3D>
          </>
        }
      >
        <div className="space-y-4">
          <InputDuo
            type="date"
            label="Nueva fecha"
            value={nuevaFecha}
            onChange={(e) => setNuevaFecha(e.target.value)}
          />
          <label className="flex items-start gap-3 cursor-pointer rounded-2xl border-2 border-duo-azul/30 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] p-3">
            <input
              type="checkbox"
              checked={ajustarSiguientes}
              onChange={(e) => setAjustarSiguientes(e.target.checked)}
              className="mt-1 accent-duo-azul w-4 h-4"
            />
            <span className="text-sm font-bold text-duo-azul">
              Ajustar automáticamente los vencimientos de las <strong>cuotas siguientes</strong> (+1 mes a cada una).
            </span>
          </label>
        </div>
      </ModalDuo>
    </div>
  );
}
