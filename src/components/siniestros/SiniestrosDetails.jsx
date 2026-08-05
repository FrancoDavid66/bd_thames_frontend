// src/components/siniestros/SiniestrosDetails.jsx  (responsive)
//
// 📱 RESPONSIVE: ya venía muy bien — la bitácora se apila abajo en mobile
//    (flex-col lg:flex-row) y vuelve al costado en desktop. Esta pasada: los
//    grids de datos usan 1 columna en pantallas muy chicas (<380px) y 2 desde
//    ahí, para que los valores largos no se corten; botón "Nota" con buen tap.
//    NOTA: el scroll interno del modal lo maneja <ModalDuo> (no se toca acá).
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import { HiPlus } from "react-icons/hi";

import { getEventosBySiniestro, addEvento } from "../../store/slices/siniestrosSlice";
import SiniestroFotosPanel from "./SiniestroFotosPanel";

import ModalDuo from "../ui/ModalDuo";
import CardDuo from "../ui/CardDuo";
import Boton3D from "../ui/Boton3D";
import Badge from "../ui/Badge";
import InputDuo from "../ui/InputDuo";

const ESTADO_TONO = {
  PENDIENTE: "amarillo", DENUNCIADO: "azul", INSPECCION: "violeta",
  LIQUIDACION: "azul", CERRADO: "verde",
};

// Un dato (label + valor) para la grilla.
function Dato({ label, value, mono = false }) {
  return (
    <div>
      <span className="block text-[10px] font-black uppercase tracking-wide text-suave dark:text-suave-dark mb-0.5">{label}</span>
      <span className={`text-sm font-bold text-titulo dark:text-titulo-dark ${mono ? "font-mono uppercase" : ""}`}>{value || "—"}</span>
    </div>
  );
}

export default function SiniestrosDetails({ isOpen, onClose, siniestro }) {
  const dispatch = useDispatch();
  const sid = siniestro?.id;
  const key = sid != null ? String(sid) : null;

  const eventos = useSelector((s) => (key ? s.siniestros.eventos[key] : null) || []);
  const eventosLoading = useSelector((s) => (key ? s.siniestros.eventosLoading?.[key] : false) || false);
  const eventosError = useSelector((s) => (key ? s.siniestros.eventosError?.[key] : null) || null);

  // Form de evento inline (antes era SiniestroEventoForm.jsx aparte)
  const [notaAbierta, setNotaAbierta] = useState(false);
  const [notaFecha, setNotaFecha] = useState("");
  const [notaTexto, setNotaTexto] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen && sid) dispatch(getEventosBySiniestro(sid));
  }, [dispatch, isOpen, sid]);

  useEffect(() => {
    if (notaAbierta) {
      setNotaFecha(dayjs().format("YYYY-MM-DD"));
      setNotaTexto("");
    }
  }, [notaAbierta]);

  const handleAddEvento = async () => {
    if (!sid || !notaTexto.trim() || guardando) return;
    setGuardando(true);
    try {
      const payload = {
        siniestro_id: sid,
        descripcion_evento: notaTexto.trim(),
        fecha_evento: notaFecha
          ? `${notaFecha}T${new Date().toISOString().slice(11, 19)}`
          : new Date().toISOString(),
      };
      await dispatch(addEvento(payload)).unwrap();
      toast.success("Evento agregado a la bitácora");
      setNotaAbierta(false);
    } catch {
      toast.error("Error al guardar el evento");
    } finally {
      setGuardando(false);
    }
  };

  if (!siniestro) return null;

  return (
    <ModalDuo
      isOpen={isOpen}
      onClose={onClose}
      title={`Siniestro #${siniestro.id}`}
      subtitle={siniestro.estado_label || siniestro.estado}
      icon={<span className="text-xl">🚨</span>}
      iconTono="rojo"
      size="lg"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* IZQUIERDA: datos */}
        <div className="flex-1 space-y-5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tono={ESTADO_TONO[siniestro.estado] || "neutro"}>{siniestro.estado_label || siniestro.estado}</Badge>
            {siniestro.fecha_siniestro && (
              <span className="text-xs font-bold text-suave dark:text-suave-dark">{dayjs(siniestro.fecha_siniestro).format("DD/MM/YYYY")}</span>
            )}
          </div>

          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
            <Dato label="Cliente" value={siniestro.cliente_label} />
            <Dato label="Póliza" value={siniestro.poliza_label} />
            <Dato label="Vehículo" value={[siniestro.marca_auto, siniestro.modelo_auto, siniestro.ano_auto].filter(Boolean).join(" ")} />
            <Dato label="Patente" value={siniestro.patente} mono />
            <Dato label="Responsabilidad" value={siniestro.responsabilidad_label || siniestro.responsabilidad} />
            <Dato label="N° Reclamo Cía" value={siniestro.nro_reclamo_cia} />
          </div>

          <div>
            <span className="block text-[10px] font-black uppercase tracking-wide text-suave dark:text-suave-dark mb-2">Descripción de los hechos</span>
            <div className="p-3 bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark rounded-2xl text-sm font-bold text-titulo dark:text-titulo-dark whitespace-pre-wrap">
              {siniestro.descripcion || "—"}
            </div>
          </div>

          {/* Fotos */}
          <CardDuo className="p-0 overflow-hidden">
            <SiniestroFotosPanel siniestroId={siniestro.id} />
          </CardDuo>

          {/* Tercero (solo si hay) */}
          {(siniestro.tercero_nombre || siniestro.tercero_patente) && (
            <div className="p-4 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] rounded-2xl">
              <span className="block text-[10px] font-black uppercase tracking-wide text-duo-rojo mb-3">Datos del tercero</span>
              <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
                <Dato label="Nombre" value={siniestro.tercero_nombre} />
                <Dato label="Teléfono" value={siniestro.tercero_telefono} />
                <Dato label="Patente" value={siniestro.tercero_patente} mono />
                <Dato label="Seguro" value={`${siniestro.tercero_compania || "—"} (${siniestro.tercero_poliza || "S/P"})`} />
              </div>
            </div>
          )}
        </div>

        {/* DERECHA: bitácora */}
        <div className="w-full lg:w-80 flex flex-col border-t-2 lg:border-t-0 lg:border-l-2 border-linea dark:border-linea-dark pt-5 lg:pt-0 lg:pl-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-black text-titulo dark:text-titulo-dark">⏱️ Bitácora</h3>
            <Boton3D variant="azul" size="sm" onClick={() => setNotaAbierta((v) => !v)}>
              <HiPlus className="w-3.5 h-3.5" /> Nota
            </Boton3D>
          </div>

          {/* Form inline de nota */}
          {notaAbierta && (
            <CardDuo className="p-3 mb-4 space-y-3">
              <InputDuo type="date" label="Fecha" value={notaFecha} onChange={(e) => setNotaFecha(e.target.value)} />
              <div>
                <label className="text-[11px] font-black uppercase tracking-wide text-suave dark:text-suave-dark ml-1">Nota</label>
                <textarea
                  value={notaTexto}
                  onChange={(e) => setNotaTexto(e.target.value)}
                  rows={3}
                  placeholder="Qué pasó / qué se hizo..."
                  className="mt-2 w-full rounded-2xl border-[3px] border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-4 py-3 text-[15px] font-bold text-titulo dark:text-titulo-dark outline-none focus:border-duo-azul resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Boton3D variant="blanco" size="sm" full onClick={() => setNotaAbierta(false)} disabled={guardando}>Cancelar</Boton3D>
                <Boton3D variant="verde" size="sm" full onClick={handleAddEvento} disabled={guardando || !notaTexto.trim()}>
                  {guardando ? "..." : "Guardar"}
                </Boton3D>
              </div>
            </CardDuo>
          )}

          <div className="flex-1 space-y-2.5">
            {eventosLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-duo-azul/25 border-t-duo-azul rounded-full animate-spin" />
              </div>
            ) : eventosError ? (
              <div className="p-3 border-2 border-duo-rojo/40 rounded-2xl bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-center">
                <p className="text-xs font-bold text-duo-rojo">Error al cargar la bitácora</p>
              </div>
            ) : eventos.length > 0 ? (
              eventos.map((evento) => (
                <div key={evento.id} className="p-3 bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark rounded-2xl">
                  <p className="text-[10px] font-black text-duo-azul mb-1 uppercase">{dayjs(evento.fecha_evento).format("DD MMM YYYY")}</p>
                  <p className="text-sm font-bold text-titulo dark:text-titulo-dark leading-relaxed">{evento.descripcion_evento}</p>
                </div>
              ))
            ) : (
              <div className="p-4 border-2 border-dashed border-linea dark:border-linea-dark rounded-2xl text-center">
                <p className="text-sm font-bold text-suave dark:text-suave-dark">No hay movimientos registrados.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalDuo>
  );
}
