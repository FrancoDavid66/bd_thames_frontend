// src/components/renovaciones/RenovacionModal.jsx
// Modal de renovar póliza — estilo THAMES (ModalDuo + InputDuo/SelectDuo/Boton3D).
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { HiRefresh, HiExclamation } from "react-icons/hi";

import ErrorBanner from "./ErrorBanner";
import ModalDuo from "../ui/ModalDuo";
import Boton3D from "../ui/Boton3D";
import InputDuo from "../ui/InputDuo";
import SelectDuo from "../ui/SelectDuo";

// 🎯 Helper interno: obtener la última cuota de una lista
// (la de mayor cuota_nro y fecha_vencimiento)
function getUltimaCuota(cuotas) {
  if (!Array.isArray(cuotas) || cuotas.length === 0) return null;
  return [...cuotas]
    .filter((c) => c && c.fecha_vencimiento)
    .sort((a, b) => {
      const nroA = Number(a.cuota_nro || 0);
      const nroB = Number(b.cuota_nro || 0);
      if (nroB !== nroA) return nroB - nroA;
      return new Date(b.fecha_vencimiento) - new Date(a.fecha_vencimiento);
    })[0] || null;
}

const TIPOS_VEHICULO = ["Auto", "Camioneta", "Camion", "Moto", "Trailer"];

export default function RenovacionModal({
  open,
  item,
  onClose,
  onSubmit,
  submitting,
  // Error estructurado del backend: { error, message, detail, action, context }
  error = null,
}) {
  const [nuevaCompania, setNuevaCompania] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [tipo, setTipo] = useState("");
  const [precioCuota, setPrecioCuota] = useState("");
  const [cantidadCuotasOverride, setCantidadCuotasOverride] = useState("");

  const necesitaOverride = error?.error === "COBERTURA_NO_CONFIGURADA";

  useEffect(() => {
    if (!open) return;

    // 🆕 NÚMERO AL RENOVAR: ya NO se pide en el modal.
    //    El número lo genera SIEMPRE el sistema solo (corto y correlativo: 1002,
    //    1003…). Si hiciera falta uno específico, se edita después en la póliza.
    setNuevaCompania(item?.compania || "");
    setTipo(item?.tipo || "");
    setPrecioCuota("");
    setCantidadCuotasOverride(item?.cantidad_cuotas ? String(item.cantidad_cuotas) : "");

    // La nueva póliza empieza el MISMO DÍA que venció la última cuota de la vieja.
    let fechaCalculada = null;
    const ultimaCuota = getUltimaCuota(item?.cuotas);
    if (ultimaCuota?.fecha_vencimiento) {
      fechaCalculada = dayjs(ultimaCuota.fecha_vencimiento);
    }
    if (!fechaCalculada) {
      const fallbackStr =
        item?.ultima_cuota_vencimiento ||
        item?.vto_referencia ||
        item?.fecha_vencimiento ||
        item?.primer_pago;
      if (fallbackStr) fechaCalculada = dayjs(fallbackStr);
    }
    setNuevaFecha(fechaCalculada ? fechaCalculada.format("YYYY-MM-DD") : "");
  }, [open, item]);

  const handleSubmit = () => {
    const payload = {
      // 🆕 Ya no se manda `nuevoNumero`: el backend genera el número corto solo.
      nuevaCompania: (nuevaCompania || "").trim() || undefined,
      nuevaFecha: nuevaFecha || undefined,
      tipo: tipo || undefined,
      precio_cuota: precioCuota !== "" ? precioCuota : undefined,
    };
    if (necesitaOverride) {
      const n = parseInt(cantidadCuotasOverride, 10);
      if (Number.isFinite(n) && n > 0) {
        payload.cantidad_cuotas_override = n;
        payload.cantidad_cuotas = n;
      }
    }
    onSubmit(payload);
  };

  const canSubmit =
    !!tipo &&
    (necesitaOverride
      ? Number.isFinite(parseInt(cantidadCuotasOverride, 10)) && parseInt(cantidadCuotasOverride, 10) > 0
      : true);

  const subtitle = item?.patente
    ? `${item.patente}${item?.cliente ? ` · ${item.cliente.apellido}, ${item.cliente.nombre}` : ""}`
    : (item?.cliente ? `${item.cliente.apellido}, ${item.cliente.nombre}` : null);

  return (
    <ModalDuo
      isOpen={open}
      onClose={submitting ? () => {} : onClose}
      title="Renovar póliza"
      subtitle={subtitle}
      icon={<HiRefresh />}
      iconTono="verde"
      size="md"
      footer={
        <>
          <Boton3D variant="blanco" onClick={onClose} disabled={submitting}>
            Cancelar
          </Boton3D>
          <Boton3D variant="verde" onClick={handleSubmit} disabled={submitting || !canSubmit}>
            {submitting ? "Procesando…" : necesitaOverride ? "Reintentar" : "Renovar póliza"}
          </Boton3D>
        </>
      }
    >
      <div className="grid gap-4">
        {/* Banner de error del backend */}
        {error && (
          <ErrorBanner error={error}>
            {necesitaOverride && (
              <div className="bg-surface dark:bg-surface-dark rounded-xl p-3 mt-1">
                <label className="text-xs font-black text-titulo dark:text-titulo-dark mb-1.5 block">
                  Cantidad de cuotas (manual)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={cantidadCuotasOverride}
                    onChange={(e) => setCantidadCuotasOverride(e.target.value)}
                    disabled={submitting}
                    placeholder="Ej: 6"
                    className="w-24 rounded-xl border-[3px] border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 py-1.5 text-titulo dark:text-titulo-dark text-sm font-bold outline-none focus:border-duo-amarillo transition-colors disabled:opacity-50"
                  />
                  <span className="text-[11px] font-bold text-suave dark:text-suave-dark">
                    cuotas mensuales se van a generar
                  </span>
                </div>
              </div>
            )}
          </ErrorBanner>
        )}

        <SelectDuo
          label="Tipo de vehículo"
          required
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          placeholder="— Elegir —"
          options={TIPOS_VEHICULO.map((t) => ({ value: t, label: t }))}
        />

        <InputDuo
          label="Precio de cuota (opcional)"
          type="number"
          min="0"
          step="0.01"
          value={precioCuota}
          onChange={(e) => setPrecioCuota(e.target.value)}
          placeholder="Ej: 35000"
        />

        <InputDuo
          label="Nueva compañía (opcional)"
          value={nuevaCompania}
          onChange={(e) => setNuevaCompania(e.target.value)}
          placeholder="Ej: RUS / SANCOR / etc."
        />

        <InputDuo
          label="Inicio de vigencia (alta)"
          type="date"
          value={nuevaFecha}
          onChange={(e) => setNuevaFecha(e.target.value)}
        />
        <p className="-mt-2 text-[11px] font-bold text-suave dark:text-suave-dark ml-1">
          Es el día que <strong className="text-titulo dark:text-titulo-dark">arranca la cobertura</strong>. Por defecto, el día que vence la última cuota actual (así no queda hueco). La <strong className="text-titulo dark:text-titulo-dark">1ª cuota vence un mes después</strong>.
        </p>

        {/* Aviso */}
        <div className="flex items-start gap-3 rounded-2xl border-2 border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] p-3.5">
          <HiExclamation className="mt-0.5 shrink-0 text-xl text-duo-amarillo-sombra dark:text-duo-amarillo" />
          <div className="text-[13px] font-bold leading-relaxed text-duo-amarillo-sombra dark:text-duo-amarillo">
            <strong className="block text-sm font-black mb-0.5">Atención</strong>
            La póliza actual pasará a <strong>FINALIZADA</strong> y se creará una nueva versión <strong>ACTIVA</strong>.
            <span className="mt-1 block opacity-90">No te olvides de emitir/subir la póliza en la web de la aseguradora si corresponde.</span>
          </div>
        </div>
      </div>
    </ModalDuo>
  );
}