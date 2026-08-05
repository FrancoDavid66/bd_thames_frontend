// src/components/polizas/CuponRoboModal.jsx
import { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { HiCalendar } from "react-icons/hi";

import { createCuponRobo } from "../../store/slices/cuponesRoboSlice";
import ModalDuo from "../ui/ModalDuo";
import SelectDuo from "../ui/SelectDuo";
import InputDuo from "../ui/InputDuo";
import Boton3D from "../ui/Boton3D";

const ESTADOS = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "PAGADA", label: "Pagada" },
  { value: "VENCIDA", label: "Vencida" },
];

export default function CuponRoboModal({ isOpen, onClose, poliza }) {
  const dispatch = useDispatch();
  const creating = useSelector((s) => s.cuponesRobo?.creating);

  const polizaId = poliza?.id;
  const cuotas = poliza?.cuotas || [];

  const [cuotaId, setCuotaId] = useState("");
  const [estado, setEstado] = useState("PENDIENTE");

  // Metadata de pago
  const [pagoFecha, setPagoFecha] = useState("");
  const [medioCobro, setMedioCobro] = useState("");
  const [notas, setNotas] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");

  const isPagada = useMemo(() => estado === "PAGADA", [estado]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!polizaId) {
      toast.error("Falta la póliza.");
      return;
    }
    if (!cuotaId) {
      toast.error("Elegí una cuota correspondiente.");
      return;
    }

    const cuotaSeleccionada = cuotas.find((c) => String(c.id) === String(cuotaId));
    if (!cuotaSeleccionada || !cuotaSeleccionada.fecha_vencimiento) {
      toast.error("La cuota seleccionada no tiene fecha de vencimiento válida.");
      return;
    }

    const start = dayjs(cuotaSeleccionada.fecha_vencimiento).startOf("month");
    const periodo_desde = start.format("YYYY-MM-DD");
    const periodo_hasta = start.endOf("month").format("YYYY-MM-DD");

    const payload = {
      polizaId,
      periodo_desde,
      periodo_hasta,
      estado,
    };

    if (isPagada) {
      if (pagoFecha) {
        const iso = dayjs(pagoFecha).isValid() ? dayjs(pagoFecha).toISOString() : null;
        if (iso) payload.fecha_pago = iso;
      }
      if (medioCobro.trim()) payload.medio_cobro = medioCobro.trim();
      if (notas.trim()) payload.notas = notas.trim();
      if (fotoUrl.trim()) payload.foto_url = fotoUrl.trim();
    }

    try {
      await dispatch(createCuponRobo(payload)).unwrap();
      toast.success("Cupón de robo creado exitosamente");
      setCuotaId("");
      setEstado("PENDIENTE");
      setPagoFecha("");
      setMedioCobro("");
      setNotas("");
      setFotoUrl("");
      onClose?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = () => {
    if (creating) return;
    onClose?.();
  };

  return (
    <ModalDuo
      isOpen={isOpen}
      onClose={handleClose}
      title="Vincular cupón de robo"
      subtitle="Asigná el cupón a una cuota existente"
      icon={<HiCalendar />}
      iconTono="azul"
      size="md"
      footer={
        <>
          <Boton3D variant="blanco" onClick={handleClose} disabled={creating} full>
            Cancelar
          </Boton3D>
          <Boton3D variant="verde" type="submit" form="form-cupon-robo" disabled={creating} full>
            {creating ? "Guardando..." : "Guardar cupón"}
          </Boton3D>
        </>
      }
    >
      <form id="form-cupon-robo" onSubmit={handleSubmit} className="space-y-4">
        {/* Selector de Cuota */}
        <SelectDuo
          label="Cuota correspondiente"
          required
          value={cuotaId}
          onChange={(e) => setCuotaId(e.target.value)}
          placeholder="Seleccioná una cuota de la póliza..."
        >
          {cuotas.map((cuota) => (
            <option key={cuota.id} value={cuota.id}>
              Cuota #{cuota.cuota_nro} - Vence: {dayjs(cuota.fecha_vencimiento).format("DD/MM/YYYY")}
            </option>
          ))}
        </SelectDuo>

        {/* Estado */}
        <SelectDuo
          label="Estado inicial"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          options={ESTADOS}
        />

        {isPagada && (
          <div className="space-y-3 rounded-2xl border-2 border-duo-azul/30 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-3 py-4">
            <p className="text-[10px] font-black text-duo-azul uppercase tracking-widest text-center">
              Registro de Egreso (Compañía)
            </p>
            <InputDuo
              type="datetime-local"
              label="Fecha y hora de pago"
              value={pagoFecha}
              onChange={(e) => setPagoFecha(e.target.value)}
            />
            <InputDuo
              type="text"
              label="Medio / billetera usada"
              value={medioCobro}
              onChange={(e) => setMedioCobro(e.target.value)}
            />
            <InputDuo
              type="url"
              label="Foto del cupón (URL)"
              value={fotoUrl}
              onChange={(e) => setFotoUrl(e.target.value)}
            />
          </div>
        )}
      </form>
    </ModalDuo>
  );
}
