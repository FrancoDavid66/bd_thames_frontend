/* src/components/pagos/AlertaPolizaModal.jsx
   Modal de pantalla completa que aparece ANTES de la pasarela de pago.
   Muestra alertas contextuales según el estado de la póliza.
   Estados: ACTIVA (sin modal) | VENCIDA | CANCELADA | ANULADA | baja reciente
*/
import { useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, Transition } from "@headlessui/react";
import {
  HiShieldExclamation, HiX, HiExclamation,
  HiCheckCircle, HiBan, HiClock, HiArrowRight,
  HiInformationCircle, HiLightningBolt,
} from "react-icons/hi";
import dayjs from "dayjs";

/* ────────────────────────────────────────────
   Detectar estado sospechoso de la póliza
──────────────────────────────────────────── */
export function detectarAlerta(poliza, cuota) {
  const estado = String(poliza?.estado || "").toUpperCase();
  const fechaBaja = poliza?.fecha_baja || poliza?.fecha_cancelacion || null;
  const diasBaja = fechaBaja ? dayjs().diff(dayjs(fechaBaja), "day") : null;

  if (estado === "CANCELADA" || estado === "ANULADA") {
    return { tipo: "cancelada", estado };
  }
  if (estado === "BAJA" || (diasBaja !== null && diasBaja <= 30)) {
    return { tipo: "baja_reciente", diasBaja: diasBaja ?? 0, fechaBaja };
  }
  if (estado === "VENCIDA") {
    const fv = cuota?.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento) : null;
    const diasMora = fv ? dayjs().diff(fv, "day") : 0;
    return { tipo: "vencida", diasMora: Math.max(0, diasMora) };
  }
  return null; // sin alerta → ir directo a la pasarela
}

/* ────────────────────────────────────────────
   Panel de siniestros recientes (anti-fraude)
──────────────────────────────────────────── */
const RESP_LABELS = {
  CHOCO:    "Nuestro asegurado chocó",
  CHOCARON: "Fue chocado",
  ROBO:     "Robo / Hurto",
  INCENDIO: "Incendio",
  OTRO:     "Otro",
};

const ESTADO_COLORS = {
  PENDIENTE:   "bg-amber-900/40 text-amber-300 border-amber-700/50",
  DENUNCIADO:  "bg-blue-900/40 text-blue-300 border-blue-700/50",
  INSPECCION:  "bg-purple-900/40 text-purple-300 border-purple-700/50",
  LIQUIDACION: "bg-indigo-900/40 text-indigo-300 border-indigo-700/50",
};

function SiniestrosRecientesPanel({ siniestros }) {
  if (!siniestros?.length) return null;
  return (
    <div className="rounded-2xl border border-rose-800/60 bg-rose-950/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-rose-900/40 border-b border-rose-800/40">
        <div className="h-9 w-9 rounded-xl bg-rose-800/60 flex items-center justify-center shrink-0">
          <HiLightningBolt className="w-5 h-5 text-rose-300" />
        </div>
        <div>
          <p className="font-black text-rose-200 text-base leading-tight">
            ⚠️ {siniestros.length} siniestro{siniestros.length > 1 ? "s" : ""} reciente{siniestros.length > 1 ? "s" : ""} detectado{siniestros.length > 1 ? "s" : ""}
          </p>
          <p className="text-rose-400/80 text-xs mt-0.5">Este cliente tuvo siniestros activos en los últimos 90 días</p>
        </div>
      </div>

      {/* Lista */}
      <div className="divide-y divide-rose-900/40">
        {siniestros.map((s) => {
          const dias = s.fecha_siniestro
            ? dayjs().diff(dayjs(s.fecha_siniestro), "day")
            : null;
          return (
            <div key={s.id} className="px-5 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${ESTADO_COLORS[s.estado] || "bg-slate-800 text-slate-400 border-slate-700"}`}>
                    {s.estado_label || s.estado}
                  </span>
                  {s.nro_reclamo_cia && (
                    <span className="text-[10px] font-mono text-indigo-400">#{s.nro_reclamo_cia}</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-200">
                  {RESP_LABELS[s.responsabilidad] || s.responsabilidad_label || s.responsabilidad}
                </p>
                {(s.marca_auto || s.patente) && (
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    {[s.marca_auto, s.modelo_auto, s.patente].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono font-bold text-rose-400">
                  {s.fecha_siniestro ? dayjs(s.fecha_siniestro).format("DD/MM/YY") : "—"}
                </p>
                {dias !== null && (
                  <p className="text-xs text-rose-500 mt-0.5">hace {dias}d</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
const CONFIGS = {
  vencida: {
    bg:         "bg-amber-950",
    border:     "border-amber-800/50",
    headerBg:   "bg-amber-900/60",
    iconBg:     "bg-amber-800/60",
    iconColor:  "text-amber-300",
    Icon:       HiClock,
    titleColor: "text-amber-200",
    btnPrimary: "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40",
    btnSecondary:"border-amber-700/50 text-amber-400 hover:bg-amber-900/40",
    accentLine: "bg-amber-600",
    badgeBg:    "bg-amber-900/60 border border-amber-700/50",
    badgeText:  "text-amber-300",
  },
  cancelada: {
    bg:         "bg-rose-950",
    border:     "border-rose-800/50",
    headerBg:   "bg-rose-900/60",
    iconBg:     "bg-rose-800/60",
    iconColor:  "text-rose-300",
    Icon:       HiBan,
    titleColor: "text-rose-200",
    btnPrimary: "bg-rose-700 hover:bg-rose-600 text-white shadow-rose-900/40",
    btnSecondary:"border-rose-700/50 text-rose-400 hover:bg-rose-900/40",
    accentLine: "bg-rose-600",
    badgeBg:    "bg-rose-900/60 border border-rose-700/50",
    badgeText:  "text-rose-300",
  },
  baja_reciente: {
    bg:         "bg-purple-950",
    border:     "border-purple-800/50",
    headerBg:   "bg-purple-900/60",
    iconBg:     "bg-purple-800/60",
    iconColor:  "text-purple-300",
    Icon:       HiShieldExclamation,
    titleColor: "text-purple-200",
    btnPrimary: "bg-purple-700 hover:bg-purple-600 text-white shadow-purple-900/40",
    btnSecondary:"border-purple-700/50 text-purple-400 hover:bg-purple-900/40",
    accentLine: "bg-purple-600",
    badgeBg:    "bg-purple-900/60 border border-purple-700/50",
    badgeText:  "text-purple-300",
  },
};

/* ────────────────────────────────────────────
   Contenido por tipo de alerta
──────────────────────────────────────────── */
function ContenidoVencida({ alerta, cliente, C }) {
  return (
    <div className="space-y-6">
      <div className={`rounded-2xl ${C.badgeBg} p-4 flex items-start gap-4`}>
        <div className={`h-20 w-20 rounded-2xl ${C.iconBg} flex items-center justify-center shrink-0`}>
          <HiClock className={`w-10 h-10 ${C.iconColor}`} />
        </div>
        <div>
          <p className={`text-4xl font-black ${C.titleColor}`}>{alerta.diasMora} días de mora</p>
          <p className="text-amber-400/80 text-sm mt-1">La cuota venció y no fue pagada a tiempo</p>
        </div>
      </div>

      <div className="space-y-3">
        <Item icon={HiShieldExclamation} color="text-rose-400" text="El asegurado no tiene cobertura activa" />
        <Item icon={HiExclamation}       color="text-amber-400" text="Verificar que la póliza no esté dada de baja en la compañía" />
        <Item icon={HiInformationCircle} color="text-sky-400"   text="Al cobrar, la póliza recuperará estado activo si era la última cuota pendiente" />
      </div>

      <div className="rounded-xl bg-slate-900/60 border border-slate-700/40 p-4">
        <p className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-2">Cliente</p>
        <p className="text-slate-100 font-bold text-lg">{cliente || "—"}</p>
      </div>
    </div>
  );
}

function ContenidoCancelada({ alerta, cliente, C }) {
  return (
    <div className="space-y-6">
      <div className={`rounded-2xl ${C.badgeBg} p-4 flex items-start gap-4`}>
        <div className={`h-20 w-20 rounded-2xl ${C.iconBg} flex items-center justify-center shrink-0`}>
          <HiBan className={`w-10 h-10 ${C.iconColor}`} />
        </div>
        <div>
          <p className={`text-4xl font-black ${C.titleColor}`}>Póliza {alerta.estado}</p>
          <p className="text-rose-400/80 text-sm mt-1">Esta póliza fue dada de baja por la compañía</p>
        </div>
      </div>

      <div className="space-y-3">
        <Item icon={HiBan}               color="text-rose-400"   text="NO hay cobertura vigente bajo ningún concepto" />
        <Item icon={HiShieldExclamation} color="text-rose-400"   text="Verificar con la compañía antes de cobrar" />
        <Item icon={HiExclamation}       color="text-amber-400"  text="El cobro registrará la deuda pero no reactiva la póliza" />
        <Item icon={HiInformationCircle} color="text-slate-400"  text="Si cobrás, queda registrado como deuda cobrada post-cancelación" />
      </div>

      <div className="rounded-xl bg-rose-950/40 border border-rose-800/40 p-4">
        <p className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-2">Doble confirmación requerida</p>
        <p className="text-rose-200/90 text-base leading-relaxed">Al continuar, confirmás que entendés que la póliza está cancelada y aun así procedés al cobro.</p>
      </div>

      <div className="rounded-xl bg-slate-900/60 border border-slate-700/40 p-4">
        <p className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-2">Cliente</p>
        <p className="text-slate-100 font-bold text-lg">{cliente || "—"}</p>
      </div>
    </div>
  );
}

function ContenidoBaja({ alerta, cliente, C }) {
  return (
    <div className="space-y-6">
      <div className={`rounded-2xl ${C.badgeBg} p-4 flex items-start gap-4`}>
        <div className={`h-20 w-20 rounded-2xl ${C.iconBg} flex items-center justify-center shrink-0`}>
          <HiShieldExclamation className={`w-10 h-10 ${C.iconColor}`} />
        </div>
        <div>
          <p className={`text-4xl font-black ${C.titleColor}`}>Baja hace {alerta.diasBaja} días</p>
          {alerta.fechaBaja && (
            <p className="text-purple-400/80 text-sm mt-1">
              Fecha de baja: {dayjs(alerta.fechaBaja).format("DD/MM/YYYY")}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Item icon={HiShieldExclamation} color="text-purple-400" text="La póliza tiene una baja reciente registrada" />
        <Item icon={HiExclamation}       color="text-amber-400"  text="Confirmar el motivo de la baja antes de cobrar" />
        <Item icon={HiInformationCircle} color="text-sky-400"    text="Si la baja fue un error, coordinar con el área de bajas" />
      </div>

      <div className="rounded-xl bg-slate-900/60 border border-slate-700/40 p-4">
        <p className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-2">Cliente</p>
        <p className="text-slate-100 font-bold text-lg">{cliente || "—"}</p>
      </div>
    </div>
  );
}

function Item({ icon: Icon, color, text }) {
  return (
    <div className="flex items-start gap-4 py-1">
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${color}`} />
      <p className="text-base text-slate-200">{text}</p>
    </div>
  );
}

/* ────────────────────────────────────────────
   MODAL PRINCIPAL
──────────────────────────────────────────── */
export default function AlertaPolizaModal({
  isOpen,
  alerta,
  cliente,
  numeroPoliza,
  compania,
  siniestrosRecientes = [],
  onContinuar,
  onCancelar,
}) {
  // Mostrar modal si hay alerta de estado O siniestros recientes
  const tieneSiniestros = siniestrosRecientes?.length > 0;
  if (!alerta && !tieneSiniestros) return null;

  const C = alerta?.tipo ? (CONFIGS[alerta.tipo] || CONFIGS.vencida) : CONFIGS.vencida;
  const { Icon } = C;

  const titles = {
    vencida:      "¡Atención! Cuota vencida",
    cancelada:    "Póliza cancelada — Verificar antes de cobrar",
    baja_reciente:"Póliza con baja reciente",
    activa:       "Siniestro reciente detectado",
  };

  const btnLabels = {
    vencida:      "Entiendo, continuar con el pago",
    cancelada:    "Confirmo que soy consciente — cobrar de todos modos",
    baja_reciente:"Confirmo — continuar con el pago",
    activa:       "Entiendo el riesgo — continuar con el pago",
  };

  // Para póliza activa con solo siniestros: usar config naranja
  const configActiva = {
    bg: "bg-orange-950", border: "border-orange-800/50",
    headerBg: "bg-orange-900/60", iconBg: "bg-orange-800/60",
    iconColor: "text-orange-300", Icon: HiLightningBolt,
    titleColor: "text-orange-200",
    btnPrimary: "bg-orange-700 hover:bg-orange-600 text-white shadow-orange-900/40",
    btnSecondary: "border-orange-700/50 text-orange-400 hover:bg-orange-900/40",
    accentLine: "bg-orange-600",
  };
  const cfg = alerta?.tipo === "activa" ? configActiva : C;

  const content = (
    <Transition appear show={!!isOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-[9999]" onClose={onCancelar}>

        {/* Overlay */}
        <Transition.Child as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
        </Transition.Child>

        {/* Panel pantalla completa */}
        <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <Transition.Child as={Fragment}
            enter="ease-out duration-250" enterFrom="opacity-0 scale-95 translate-y-4"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-180" leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-95 translate-y-4">

            <Dialog.Panel className={`
              w-full max-w-2xl rounded-3xl min-h-[500px] border shadow-2xl overflow-hidden
              ${cfg.bg} ${cfg.border}
            `}>
              {/* Línea de acento top */}
              <div className={`h-1.5 w-full ${cfg.accentLine}`} />

              {/* Header */}
              <div className={`px-8 py-6 ${cfg.headerBg} flex items-start justify-between gap-4`}>
                <div className="flex items-center gap-4">
                  <div className={`h-16 w-16 rounded-2xl ${cfg.iconBg} flex items-center justify-center shrink-0`}>
                    <cfg.Icon className={`w-8 h-8 ${cfg.iconColor}`} />
                  </div>
                  <div>
                    <Dialog.Title className={`text-2xl font-black ${cfg.titleColor} leading-tight`}>
                      {titles[alerta?.tipo] || titles.activa}
                    </Dialog.Title>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {numeroPoliza && (
                        <span className="text-sm font-mono text-slate-400">N° {numeroPoliza}</span>
                      )}
                      {compania && (
                        <><span className="text-slate-600">·</span>
                        <span className="text-sm text-slate-400">{compania}</span></>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={onCancelar}
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors shrink-0">
                  <HiX className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido */}
              <div className="px-8 py-7 space-y-6">
                {/* Alerta de estado de póliza */}
                {alerta?.tipo && alerta.tipo !== "activa" && (
                  <>
                    {alerta.tipo === "vencida"       && <ContenidoVencida    alerta={alerta} cliente={cliente} C={cfg} />}
                    {alerta.tipo === "cancelada"      && <ContenidoCancelada  alerta={alerta} cliente={cliente} C={cfg} />}
                    {alerta.tipo === "baja_reciente"  && <ContenidoBaja       alerta={alerta} cliente={cliente} C={cfg} />}
                  </>
                )}

                {/* Panel anti-fraude: siniestros recientes */}
                <SiniestrosRecientesPanel siniestros={siniestrosRecientes} />

                {/* Solo siniestros sin alerta de estado */}
                {alerta?.tipo === "activa" && (
                  <div className="rounded-xl bg-slate-900/60 border border-slate-700/40 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">Cliente</p>
                    <p className="text-slate-100 font-bold text-lg">{cliente || "—"}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 pb-8 flex flex-col gap-3">
                <motion.button
                  type="button"
                  onClick={onContinuar}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    w-full h-16 rounded-2xl text-base flex items-center justify-center gap-3
                    font-bold shadow-lg transition-colors
                    ${cfg.btnPrimary}
                  `}>
                  <span>{btnLabels[alerta?.tipo] || btnLabels.activa}</span>
                  <HiArrowRight className="w-4 h-4" />
                </motion.button>

                <button type="button" onClick={onCancelar}
                  className={`
                    w-full h-12 rounded-2xl border text-sm font-medium
                    transition-colors ${cfg.btnSecondary}
                  `}>
                  Cancelar — no cobrar ahora
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}