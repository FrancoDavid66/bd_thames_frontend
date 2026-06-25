// src/components/polizas/CuponesRoboPanel.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import {
  HiShieldCheck,
  HiRefresh,
  HiClock,
  HiBadgeCheck,
  HiExclamationCircle,
  HiPhotograph,
  HiPlus,
  HiCurrencyDollar,
  HiX,
  HiPencil,
  HiCheckCircle,
} from "react-icons/hi";
import toast from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";
import {
  fetchCuponesRobo,
  actualizarEstadoCuponRobo,
} from "../../store/slices/cuponesRoboSlice";
import { uploadToCloudinary } from "../../utils/cloudinary";
import CuponRoboModal from "./CuponRoboModal";

const shell = "rounded-2xl border border-white/[0.06] bg-[#121829] backdrop-blur-sm shadow-xl shadow-black/20";

const badgeByEstado = {
  PENDIENTE: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  AL_DIA: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  PAGADA: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  VENCIDA: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
};

const labelByEstado = {
  PENDIENTE: "Pendiente",
  AL_DIA: "Al día",
  PAGADA: "Pagada",
  VENCIDA: "Vencida",
};

export default function CuponesRoboPanel({ poliza, polizaId, cupones: cuponesProp }) {
  const { user } = useAuth();
  const dispatch = useDispatch();

  const isAdmin = user?.rol === "ADMIN" || user?.perfil?.rol === "ADMIN";

  const finalPolizaId = poliza?.id || polizaId;
  const cuotas = poliza?.cuotas || [];

  const [uploadingById, setUploadingById] = useState({});
  const [uploadTarget, setUploadTarget] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  // 🚀 ESTADO MODAL: 'isConfirming' para el paso de doble validación
  const [montoModal, setMontoModal] = useState({
    isOpen: false,
    file: null,
    cuponId: null,
    editMode: false,
    isConfirming: false,
  });
  const [montoValue, setMontoValue] = useState("");
  const [costoCompaniaValue, setCostoCompaniaValue] = useState("");

  const { byPoliza, loadingByPoliza, updatingById } = useSelector((s) => s.cuponesRobo || {});

  useEffect(() => {
    if (!finalPolizaId) return;
    dispatch(fetchCuponesRobo(finalPolizaId));
  }, [dispatch, finalPolizaId]);

  const loading = !!loadingByPoliza?.[finalPolizaId];
  const cuponesState = byPoliza?.[finalPolizaId];

  const cupones = useMemo(() => cuponesState || cuponesProp || [], [cuponesState, cuponesProp]);

  const handleClickUpload = (cupon) => {
    setUploadTarget(cupon);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleEditMonto = (cupon) => {
    setMontoValue(cupon.monto !== null ? String(cupon.monto) : "");
    setCostoCompaniaValue("");
    setMontoModal({ isOpen: true, file: null, cuponId: cupon.id, editMode: true, isConfirming: false });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    const cuponId = uploadTarget.id;
    const defaultMonto = uploadTarget.monto ? String(uploadTarget.monto) : "";

    setMontoValue(defaultMonto);
    setCostoCompaniaValue("");
    setMontoModal({ isOpen: true, file, cuponId, editMode: false, isConfirming: false });
    setUploadTarget(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 🚀 PASO 1: validar el número y pasar a confirmación
  const handleInitiateConfirm = () => {
    const normalized = montoValue.replace(",", ".").trim();
    if (!normalized) {
      toast.error("Debes ingresar un monto.");
      return;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Monto inválido. Ingresá un número mayor a cero.");
      return;
    }
    setMontoModal((prev) => ({ ...prev, isConfirming: true }));
  };

  // 🚀 PASO 2: subir y guardar
  const executeConfirmMonto = async () => {
    const { file, cuponId, editMode } = montoModal;
    if (!cuponId) return;

    const parsed = Number(montoValue.replace(",", ".").trim());
    const costoCompaniaParsed = !editMode
      ? Number((costoCompaniaValue || "0").replace(",", ".").trim()) || 0
      : 0;

    try {
      setUploadingById((prev) => ({ ...prev, [cuponId]: true }));

      let secure_url;
      let public_id;

      if (file) {
        const uploadRes = await uploadToCloudinary(file, "rc-admin/cupones-robo");
        secure_url = uploadRes.secure_url;
        public_id = uploadRes.public_id;
      }

      const payload = {
        id: cuponId,
        polizaId: finalPolizaId,
        estado: "PAGADA",
        monto: parsed,
        costo_compania: costoCompaniaParsed,
      };

      if (secure_url) {
        payload.foto_url = secure_url;
        payload.foto_public_id = public_id;
      }

      await dispatch(actualizarEstadoCuponRobo(payload)).unwrap();

      toast.success(editMode ? "Monto corregido correctamente." : "Pago de cupón registrado correctamente.");
      setMontoModal({ isOpen: false, file: null, cuponId: null, editMode: false, isConfirming: false });
      setCostoCompaniaValue("");
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al procesar la solicitud.");
    } finally {
      setUploadingById((prev) => {
        const clone = { ...prev };
        delete clone[cuponId];
        return clone;
      });
    }
  };

  const isModalUploading = montoModal.cuponId ? !!uploadingById[montoModal.cuponId] : false;

  const closeModal = () => {
    if (isModalUploading) return;
    setMontoModal({ isOpen: false, file: null, cuponId: null, editMode: false, isConfirming: false });
    setCostoCompaniaValue("");
  };

  return (
    <div className={shell}>
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-400 border border-emerald-500/20">
            {user?.perfil?.oficina_nombre || "Local"}
          </span>
          <p className="text-[11px] leading-snug text-slate-400">
            Cupones de las cuotas de la compañía.
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-400 sm:w-auto"
          >
            <HiPlus className="mr-1 h-3 w-3" /> Vincular cupón
          </button>
          <button
            type="button"
            onClick={() => finalPolizaId && dispatch(fetchCuponesRobo(finalPolizaId))}
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700 sm:w-auto"
          >
            <HiRefresh className="mr-1 h-3 w-3" /> Refrescar
          </button>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        {loading && (
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-slate-950/70 px-3 py-2 text-[11px] text-slate-300">
            <span className="h-3 w-3 animate-spin rounded-full border border-slate-600 border-t-transparent" />
            Cargando cupones vinculados a las cuotas...
          </div>
        )}

        {!loading && cupones.length === 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-3 py-3 text-[11px] text-slate-400">
            <HiClock className="mt-0.5 h-4 w-4 text-slate-500" />
            <span>Todavía no hay cupones de robo para esta póliza. Se generan en base a las cuotas de la compañía.</span>
          </div>
        )}

        {!loading && cupones.length > 0 && (
          <div className="space-y-2">
            {cupones
              .slice()
              .sort((a, b) => String(a.periodo_desde || "").localeCompare(String(b.periodo_desde || "")))
              .map((cupon) => {
                const baseEstado = (cupon.estado || "PENDIENTE").toUpperCase();
                const isPagada = baseEstado === "PAGADA";
                const hoy = dayjs();
                const tieneVto = !!cupon.fecha_vencimiento;
                const isVencida = !isPagada && tieneVto && dayjs(cupon.fecha_vencimiento).isBefore(hoy, "day");
                const visualEstado = isPagada ? "PAGADA" : isVencida ? "VENCIDA" : "AL_DIA";
                const badgeClass = badgeByEstado[visualEstado] || "bg-slate-700/40 text-slate-100 border border-slate-600/40";

                const updating = !!updatingById?.[cupon.id];
                const uploading = !!uploadingById?.[cupon.id];
                const tienePagoMeta = !!cupon.fecha_pago || !!cupon.medio_cobro || !!cupon.foto_url || cupon.monto != null;
                const cardTone =
                  visualEstado === "PAGADA"
                    ? "border-emerald-500/40 bg-emerald-950/30"
                    : visualEstado === "VENCIDA"
                    ? "border-rose-500/40 bg-rose-950/30"
                    : "border-amber-500/40 bg-amber-950/30";

                const cuotaAsociada = cuotas.find((c) => dayjs(c.fecha_vencimiento).isSame(dayjs(cupon.fecha_vencimiento), "month"));
                const tituloCupon = cuotaAsociada ? `Cupón de cuota #${cuotaAsociada.cuota_nro}` : "Cupón de robo";

                return (
                  <motion.div
                    key={cupon.id}
                    layout
                    className={`flex flex-col gap-3 rounded-xl border px-3 py-2 sm:px-4 sm:py-3 md:flex-row md:items-stretch ${cardTone}`}
                  >
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold uppercase tracking-tight text-slate-50">{tituloCupon}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${badgeClass}`}>
                          {visualEstado === "PAGADA" && <HiBadgeCheck className="h-3 w-3" />}
                          {visualEstado === "AL_DIA" && <HiClock className="h-3 w-3" />}
                          {visualEstado === "VENCIDA" && <HiExclamationCircle className="h-3 w-3" />}
                          <span>{labelByEstado[visualEstado] || visualEstado}</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-200">
                        {cupon.periodo_desde && cupon.periodo_hasta && (
                          <span className="rounded-full border border-slate-700 bg-slate-800/50 px-2 py-0.5">
                            Período: {dayjs(cupon.periodo_desde).format("MM/YYYY")}
                          </span>
                        )}
                        {cupon.fecha_vencimiento && (
                          <span className="rounded-full border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-[10px] text-slate-100">
                            Vence: {dayjs(cupon.fecha_vencimiento).format("DD/MM/YYYY")}
                          </span>
                        )}

                        {visualEstado === "PAGADA" && tienePagoMeta && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-100">
                            <HiBadgeCheck className="h-4 w-4" />
                            <span>
                              Pagado
                              {cupon.fecha_pago && <> el <strong>{dayjs(cupon.fecha_pago).format("DD/MM/YYYY HH:mm")}</strong></>}
                              {cupon.monto != null && <> · <strong>${Number(cupon.monto).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></>}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex w-full flex-col items-end gap-2 md:w-64">
                      <div className="w-full">
                        {cupon.foto_url ? (
                          <div className="relative w-full overflow-hidden rounded-xl border border-emerald-500/40 bg-black/40">
                            <img src={cupon.foto_url} alt="Cupón de robo" className="h-28 w-full object-cover sm:h-32 md:h-36" />
                          </div>
                        ) : (
                          <div className="flex h-28 w-full items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/70 text-[11px] text-slate-500 sm:h-32 md:h-36">
                            Sin comprobante adjunto
                          </div>
                        )}
                      </div>

                      <div className="flex w-full flex-wrap items-center justify-end gap-2">
                        {visualEstado === "PAGADA" ? (
                          <>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleEditMonto(cupon)}
                                disabled={uploading || updating}
                                className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/20 px-3 py-1.5 text-[10px] font-bold uppercase text-amber-300 transition-colors hover:bg-amber-500/30 disabled:opacity-60 sm:flex-none"
                              >
                                <HiPencil className="h-3 w-3" /> Corregir monto
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleClickUpload(cupon)}
                              disabled={uploading || updating}
                              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 text-[10px] font-bold uppercase text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-60 sm:flex-none"
                            >
                              {uploading || updating ? <span className="h-3 w-3 animate-spin rounded-full border border-emerald-400 border-t-transparent" /> : <HiPhotograph className="h-3 w-3" />}
                              Cambiar foto
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleClickUpload(cupon)}
                            disabled={uploading || updating}
                            className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                          >
                            {uploading || updating ? <span className="h-3 w-3 animate-spin rounded-full border border-slate-900 border-t-transparent" /> : <HiPhotograph className="h-3 w-3" />}
                            <span>Subir comprobante y marcar pagado</span>
                          </button>
                        )}
                      </div>

                      {cupon.foto_url && (
                        <a href={cupon.foto_url} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-sky-300 hover:text-sky-200">
                          <HiPhotograph className="h-3 w-3" /> Ver completo
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <CuponRoboModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} poliza={poliza} />

      {/* Modal de monto (2 pasos) */}
      <AnimatePresence>
        {montoModal.isOpen && (
          <motion.div
            className="fixed inset-0 z-[150] flex items-start justify-center bg-black/70 p-4 pt-24 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.06] bg-[#121829] p-5 shadow-2xl sm:p-6"
              initial={{ scale: 0.9, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
            >
              <button
                type="button"
                onClick={closeModal}
                disabled={isModalUploading}
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800/60 text-slate-400 transition-colors hover:bg-slate-700 disabled:opacity-50"
              >
                <HiX className="h-4 w-4" />
              </button>

              <div className="mb-5 flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${montoModal.isConfirming ? "border-amber-500/20 bg-amber-500/20 text-amber-400" : "border-emerald-500/20 bg-emerald-500/20 text-emerald-400"}`}>
                  {montoModal.isConfirming ? <HiExclamationCircle className="h-5 w-5" /> : <HiCurrencyDollar className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-tight text-slate-50">
                    {montoModal.isConfirming ? "Confirmación" : montoModal.editMode ? "Corregir monto" : "Monto del seguro"}
                  </h2>
                  <p className="text-[10px] font-medium text-slate-400">
                    {montoModal.isConfirming ? "Verificá antes de continuar." : "Ingresá el egreso hacia la compañía."}
                  </p>
                </div>
              </div>

              {!montoModal.isConfirming ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-500">Monto cobrado al cliente</label>
                    <div className={`flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-3 transition-all focus-within:ring-2 focus-within:ring-emerald-500/40 ${isModalUploading ? "cursor-not-allowed opacity-60" : ""}`}>
                      <span className="font-bold text-slate-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full flex-1 bg-transparent text-sm font-bold text-slate-50 outline-none"
                        value={montoValue}
                        onChange={(e) => setMontoValue(e.target.value)}
                        autoFocus
                        disabled={isModalUploading}
                        onKeyDown={(e) => { if (e.key === "Enter" && !isModalUploading) handleInitiateConfirm(); }}
                      />
                    </div>
                  </div>

                  {!montoModal.editMode && (
                    <div>
                      <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                        Costo de la compañía
                        <span className="ml-1 normal-case text-slate-600">(para calcular comisión)</span>
                      </label>
                      <div className={`flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-3 transition-all focus-within:ring-2 focus-within:ring-sky-500/40 ${isModalUploading ? "cursor-not-allowed opacity-60" : ""}`}>
                        <span className="font-bold text-slate-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full flex-1 bg-transparent text-sm font-bold text-slate-50 outline-none"
                          value={costoCompaniaValue}
                          onChange={(e) => setCostoCompaniaValue(e.target.value)}
                          disabled={isModalUploading}
                        />
                      </div>
                      {montoValue && costoCompaniaValue && (() => {
                        const ganancia = (Number(montoValue) || 0) - (Number(costoCompaniaValue) || 0);
                        return (
                          <p className={`mt-1.5 font-mono text-xs ${ganancia > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            Ganancia: $ {ganancia.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </p>
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={closeModal} disabled={isModalUploading} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold uppercase text-slate-400 transition-all hover:bg-slate-800 disabled:opacity-50">Cancelar</button>
                    <button type="button" onClick={handleInitiateConfirm} disabled={isModalUploading} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-black uppercase text-slate-950 shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-400 active:scale-95 disabled:opacity-60">Siguiente</button>
                  </div>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Cobrado al cliente</span>
                      <strong className="font-mono text-emerald-400">$ {Number(montoValue || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong>
                    </div>
                    {!montoModal.editMode && costoCompaniaValue && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Costo compañía</span>
                          <strong className="font-mono text-rose-400">$ {Number(costoCompaniaValue || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-700 pt-2 text-sm">
                          <span className="font-medium text-slate-300">Ganancia</span>
                          <strong className="font-mono text-sky-400">$ {(Number(montoValue || 0) - Number(costoCompaniaValue || 0)).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col justify-end gap-2 pt-2 sm:flex-row">
                    <button type="button" onClick={() => setMontoModal((prev) => ({ ...prev, isConfirming: false }))} disabled={isModalUploading} className="w-full rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold uppercase text-slate-400 transition-all hover:bg-slate-800 disabled:opacity-50 sm:w-auto">No, corregir</button>
                    <button type="button" onClick={executeConfirmMonto} disabled={isModalUploading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-black uppercase text-slate-950 shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-400 active:scale-95 disabled:opacity-60 sm:w-auto">
                      {isModalUploading ? (
                        <>
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                          {montoModal.editMode ? "Guardando..." : "Enviando..."}
                        </>
                      ) : (
                        <>
                          <HiCheckCircle className="h-4 w-4" />
                          {montoModal.editMode ? "Sí, guardar" : "Sí, confirmar pago"}
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}