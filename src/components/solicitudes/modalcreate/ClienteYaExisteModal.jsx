// src/components/solicitudes/modalcreate/ClienteYaExisteModal.jsx
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  HiExclamation,
  HiX,
  HiOfficeBuilding,
  HiTruck,
  HiCheckCircle,
  HiXCircle,
  HiQuestionMarkCircle,
  HiArrowRight,
  HiUser,
  HiCurrencyDollar,
  HiRefresh,
  HiEye,
  HiInformationCircle,
  HiBan,
  HiSparkles,
} from "react-icons/hi";
import { useAuth } from "../../../context/AuthContext";

/**
 * Modal que se muestra cuando hay coincidencia en la verificación previa.
 *
 * Casos (resultado.caso):
 *  - "PATENTE_VIGENTE"   → 🔴 Auto ya asegurado y vigente → solo pagar/renovar
 *  - "PATENTE_BAJA"      → 🟡 Patente existe pero baja → permite crear nueva
 *  - "CLIENTE_OTRO_AUTO" → 🟢 Cliente existe + patente nueva → vincular y continuar
 *
 * Props:
 *  - open: boolean
 *  - resultado: { caso, cliente_match, patente_match }
 *  - onClose(): cierra el modal
 *  - onContinuarVinculando(clienteId): cuando se vincula al cliente existente y se sigue al alta
 */
export default function ClienteYaExisteModal({ open, resultado, onClose, onContinuarVinculando }) {
  const { user } = useAuth();
  const isAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const navigate = useNavigate();

  if (!resultado) return null;

  const { caso, cliente_match, patente_match } = resultado;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="w-full max-w-2xl rounded-3xl bg-gradient-to-br from-[#1a0e15] via-[#0f0c1e] to-[#0b0f1e] border border-white/10 shadow-2xl overflow-hidden"
          >
            {caso === "PATENTE_VIGENTE" && (
              <CasoPatenteVigente
                patenteMatch={patente_match}
                isAdmin={isAdmin}
                onClose={onClose}
                navigate={navigate}
              />
            )}

            {caso === "PATENTE_BAJA" && (
              <CasoPatenteBaja
                patenteMatch={patente_match}
                clienteMatch={cliente_match}
                onClose={onClose}
                onContinuar={() => onContinuarVinculando?.(patente_match?.cliente?.id || null)}
              />
            )}

            {caso === "CLIENTE_OTRO_AUTO" && (
              <CasoClienteOtroAuto
                clienteMatch={cliente_match}
                onClose={onClose}
                onVincular={() => onContinuarVinculando?.(cliente_match?.id || null)}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* =====================================================================
   CASO B1 — PATENTE_VIGENTE (auto ya asegurado y al día/con deuda)
   ===================================================================== */
function CasoPatenteVigente({ patenteMatch, isAdmin, onClose, navigate }) {
  const cli = patenteMatch?.cliente || {};
  const alDia = patenteMatch?.al_dia;

  const irAPagar = () => {
    onClose?.();
    navigate?.(`/pagos?poliza=${patenteMatch?.poliza_id}`);
  };

  const irAVerPoliza = () => {
    onClose?.();
    navigate?.(`/polizas/${patenteMatch?.poliza_id}`);
  };

  const renovarPoliza = () => {
    onClose?.();
    navigate?.(`/renovaciones?poliza=${patenteMatch?.poliza_id}`);
  };

  return (
    <>
      {/* Header rojo */}
      <div className="relative px-6 pt-6 pb-5 bg-gradient-to-r from-rose-500/25 via-orange-500/10 to-transparent border-b border-rose-500/30">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
        >
          <HiX className="text-lg" />
        </button>
        <div className="flex items-start gap-4">
          <motion.div
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="p-3 rounded-2xl bg-rose-500/25 border border-rose-500/40 text-rose-300 shadow-lg shadow-rose-900/40 shrink-0"
          >
            <HiBan className="text-3xl" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-xl sm:text-2xl leading-tight">
              Este auto ya está asegurado
            </h2>
            <p className="text-rose-200/90 text-sm mt-1 font-medium">
              No se puede crear una nueva póliza porque el vehículo ya tiene una póliza vigente.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Datos del auto/póliza */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3">
            <HiTruck className="text-rose-400 text-lg" />
            <span className="text-[10px] uppercase tracking-widest font-black text-rose-300">
              Póliza encontrada
            </span>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Vigente
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DataPill label="Patente" value={patenteMatch?.patente || "—"} accent="amber" />
            <DataPill label="N° Póliza" value={patenteMatch?.numero_poliza || "—"} accent="sky" />
            <DataPill label="Vehículo" value={`${patenteMatch?.marca || ""} ${patenteMatch?.modelo || ""}`.trim() || "—"} accent="violet" />
            <DataPill label="Compañía" value={patenteMatch?.compania || "—"} accent="emerald" />
            <DataPill
              label="Sucursal"
              value={patenteMatch?.oficina_nombre || "—"}
              icon={HiOfficeBuilding}
              accent="sky"
              fullWidth
            />
          </div>
        </div>

        {/* Datos del cliente */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3">
            <HiUser className="text-violet-400 text-lg" />
            <span className="text-[10px] uppercase tracking-widest font-black text-violet-300">
              Cliente titular
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DataPill label="Nombre" value={cli?.nombre_apellido || "—"} accent="violet" />
            <DataPill label="DNI" value={cli?.dni_cuit_cuil || "—"} accent="sky" />
          </div>
        </div>

        {/* Estado de pago */}
        <div
          className={`rounded-xl border p-3 flex items-center gap-3 ${
            alDia === true
              ? "bg-emerald-500/10 border-emerald-500/30"
              : alDia === false
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-white/5 border-white/10"
          }`}
        >
          {alDia === true ? (
            <>
              <HiCheckCircle className="text-emerald-400 text-2xl shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-black text-emerald-200">Al día con los pagos</p>
                <p className="text-xs text-emerald-300/70">No hay cuotas pendientes.</p>
              </div>
            </>
          ) : alDia === false ? (
            <>
              <HiCurrencyDollar className="text-amber-400 text-2xl shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-black text-amber-200">
                  {patenteMatch?.cuotas_pendientes} cuota{patenteMatch?.cuotas_pendientes !== 1 ? "s" : ""} pendiente{patenteMatch?.cuotas_pendientes !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-amber-300/70">Podés registrar los pagos desde esta misma sucursal.</p>
              </div>
            </>
          ) : (
            <>
              <HiQuestionMarkCircle className="text-white/40 text-2xl shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-black text-white/60">Estado de pago no determinado</p>
              </div>
            </>
          )}
        </div>

        {/* Info admin / no admin */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 flex items-start gap-2">
          <HiInformationCircle className="text-sky-400 text-base mt-0.5 shrink-0" />
          <p className="text-xs text-sky-200/90 leading-relaxed">
            Como trabajamos en grupo unificado, podés <strong className="text-white">registrar pagos desde esta sucursal</strong>.
            {!isAdmin && (
              <>
                <br />
                <span className="text-amber-300/80">⚠️ La renovación solo puede hacerla un administrador.</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Footer con acciones */}
      <div className="px-6 py-4 bg-black/30 border-t border-white/10 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold uppercase text-[11px] tracking-widest transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={irAVerPoliza}
          className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold uppercase text-[11px] tracking-widest transition-all flex items-center justify-center gap-2"
        >
          <HiEye /> Ver detalle
        </button>
        {isAdmin && (
          <button
            onClick={renovarPoliza}
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-black uppercase text-[11px] tracking-widest shadow-lg shadow-sky-900/40 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <HiRefresh /> Renovar
          </button>
        )}
        <button
          onClick={irAPagar}
          className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[11px] tracking-widest shadow-lg shadow-emerald-900/40 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <HiCurrencyDollar /> Pagar cuota
        </button>
      </div>
    </>
  );
}

/* =====================================================================
   CASO B2 — PATENTE_BAJA (patente existió pero fue dada de baja)
   ===================================================================== */
function CasoPatenteBaja({ patenteMatch, clienteMatch, onClose, onContinuar }) {
  const cli = patenteMatch?.cliente || {};
  // Si el cliente del DNI coincide con el de la patente, lo vinculamos
  const clienteIdVincular = clienteMatch?.id || cli?.id || null;

  return (
    <>
      {/* Header ámbar */}
      <div className="relative px-6 pt-6 pb-5 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-b border-amber-500/30">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
        >
          <HiX className="text-lg" />
        </button>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-lg shrink-0">
            <HiExclamation className="text-3xl" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-xl sm:text-2xl leading-tight">
              Patente con baja previa
            </h2>
            <p className="text-amber-200/80 text-sm mt-1 font-medium">
              Este vehículo estuvo asegurado pero la póliza fue dada de baja. Podés crear una póliza nueva.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DataPill label="Patente" value={patenteMatch?.patente || "—"} accent="amber" />
            <DataPill label="Vehículo" value={`${patenteMatch?.marca || ""} ${patenteMatch?.modelo || ""}`.trim() || "—"} accent="violet" />
            <DataPill label="Compañía anterior" value={patenteMatch?.compania || "—"} accent="sky" />
            <DataPill label="Cliente histórico" value={cli?.nombre_apellido || "—"} accent="emerald" />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-start gap-2">
          <HiSparkles className="text-emerald-400 text-base mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-200/90 leading-relaxed">
            {clienteIdVincular
              ? "Vamos a vincular esta nueva póliza al cliente existente para no duplicarlo en la base."
              : "Vas a crear una póliza nueva para este vehículo."}
          </p>
        </div>
      </div>

      <div className="px-6 py-4 bg-black/30 border-t border-white/10 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold uppercase text-[11px] tracking-widest transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={onContinuar}
          className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[11px] tracking-widest shadow-lg shadow-emerald-900/40 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          Continuar al alta <HiArrowRight />
        </button>
      </div>
    </>
  );
}

/* =====================================================================
   CASO C — CLIENTE_OTRO_AUTO (cliente existe, patente es nueva)
   ===================================================================== */
function CasoClienteOtroAuto({ clienteMatch, onClose, onVincular }) {
  const polizas = clienteMatch?.polizas || [];
  const totalPolizas = polizas.length;
  const polizasActivas = polizas.filter((p) => p?.esta_vigente);

  return (
    <>
      {/* Header verde/azul */}
      <div className="relative px-6 pt-6 pb-5 bg-gradient-to-r from-emerald-500/20 via-sky-500/10 to-transparent border-b border-emerald-500/30">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
        >
          <HiX className="text-lg" />
        </button>
        <div className="flex items-start gap-4">
          <motion.div
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-900/40 shrink-0"
          >
            <HiUser className="text-3xl" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-xl sm:text-2xl leading-tight">
              Cliente ya registrado en el grupo
            </h2>
            <p className="text-emerald-200/80 text-sm mt-1 font-medium">
              Vamos a vincular esta nueva póliza a su perfil para no duplicar el cliente.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Datos del cliente */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3">
            <HiUser className="text-violet-400 text-lg" />
            <span className="text-[10px] uppercase tracking-widest font-black text-violet-300">
              Datos del cliente
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DataPill label="Nombre" value={clienteMatch?.nombre_apellido || "—"} accent="violet" />
            <DataPill label="DNI" value={clienteMatch?.dni_cuit_cuil || "—"} accent="sky" />
            <DataPill label="Teléfono" value={clienteMatch?.telefono || "—"} accent="emerald" />
            <DataPill
              label="Sucursal de origen"
              value={clienteMatch?.oficina_nombre || "—"}
              icon={HiOfficeBuilding}
              accent="amber"
            />
          </div>
        </div>

        {/* Pólizas */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HiTruck className="text-amber-400 text-lg" />
              <span className="text-[10px] uppercase tracking-widest font-black text-amber-300">
                Pólizas existentes ({totalPolizas})
              </span>
            </div>
            {polizasActivas.length > 0 && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {polizasActivas.length} vigente{polizasActivas.length !== 1 && "s"}
              </span>
            )}
          </div>

          {totalPolizas === 0 ? (
            <p className="text-xs text-white/50 italic text-center py-4">Sin pólizas registradas.</p>
          ) : (
            <div className="space-y-2">
              {polizas.slice(0, 5).map((p, i) => (
                <PolizaRow key={p.poliza_id || i} p={p} />
              ))}
              {polizas.length > 5 && (
                <p className="text-[10px] text-white/40 italic text-center pt-2">
                  + {polizas.length - 5} más...
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-start gap-2">
          <HiSparkles className="text-emerald-400 text-base mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-200/90 leading-relaxed">
            Como vas a asegurar <strong className="text-white">otro vehículo</strong>, vinculamos la nueva
            póliza al cliente existente. <strong className="text-white">La promo aplica</strong> porque es un
            vehículo nuevo en el sistema.
          </p>
        </div>
      </div>

      <div className="px-6 py-4 bg-black/30 border-t border-white/10 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold uppercase text-[11px] tracking-widest transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={onVincular}
          disabled={!clienteMatch?.id}
          className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[11px] tracking-widest shadow-lg shadow-emerald-900/40 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          Vincular y continuar <HiArrowRight />
        </button>
      </div>
    </>
  );
}

/* ===================== Subcomponentes ===================== */
function DataPill({ label, value, icon: Icon, accent = "sky", fullWidth = false }) {
  const colors = {
    sky: "text-sky-300",
    violet: "text-violet-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
  };
  return (
    <div className={`p-3 rounded-xl bg-black/30 border border-white/5 ${fullWidth ? "sm:col-span-2" : ""}`}>
      <span className={`text-[9px] uppercase tracking-widest font-black ${colors[accent]} flex items-center gap-1`}>
        {Icon && <Icon className="text-xs" />} {label}
      </span>
      <p className="text-sm font-bold text-white mt-1 break-words">{value}</p>
    </div>
  );
}

function PolizaRow({ p }) {
  const dadaDeBaja = !p?.esta_vigente;
  const alDia = p?.al_dia;

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/30 border border-white/5 hover:border-white/10 transition-all">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-white truncate">
            {p?.patente || "Sin patente"}
          </span>
          <span className="text-[10px] text-white/50 font-medium">• {p?.compania || "Compañía s/d"}</span>
        </div>
        <p className="text-[11px] text-white/50 truncate mt-0.5">
          {`${p?.marca || ""} ${p?.modelo || ""}`.trim() || "Sin datos"}
          {p?.oficina_nombre && (
            <span className="ml-1.5 text-emerald-400/80 font-bold">→ {p.oficina_nombre}</span>
          )}
        </p>
      </div>
      <div className="shrink-0">
        {dadaDeBaja ? (
          <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] uppercase tracking-widest font-black text-white/50">
            Dada de baja
          </span>
        ) : alDia === true ? (
          <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[9px] uppercase tracking-widest font-black text-emerald-300 flex items-center gap-1">
            <HiCheckCircle /> Al día
          </span>
        ) : alDia === false ? (
          <span className="px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[9px] uppercase tracking-widest font-black text-rose-300 flex items-center gap-1">
            <HiXCircle /> Con deuda
          </span>
        ) : (
          <span className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[9px] uppercase tracking-widest font-black text-amber-300 flex items-center gap-1">
            <HiQuestionMarkCircle /> Verificar
          </span>
        )}
      </div>
    </div>
  );
}