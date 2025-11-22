// src/components/polizas/CuponesRoboPanel.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import {
  HiShieldCheck,
  HiRefresh,
  HiClock,
  HiBadgeCheck,
  HiExclamationCircle,
  HiPhotograph,
} from "react-icons/hi";
import toast from "react-hot-toast";

import {
  fetchCuponesRobo,
  actualizarEstadoCuponRobo,
} from "../../store/slices/cuponesRoboSlice";
import { uploadToCloudinary } from "../../utils/cloudinary";

const shell =
  "rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-xl shadow-black/20";

const badgeByEstado = {
  // Visual: AL_DIA y PENDIENTE comparten estilo "amarillo"
  PENDIENTE: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  AL_DIA: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  PAGADA: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  VENCIDA: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
};

const labelByEstado = {
  // Este texto casi no se usará ya, pero lo dejamos por compatibilidad
  PENDIENTE: "Pendiente",
  AL_DIA: "Al día",
  PAGADA: "Pagada",
  VENCIDA: "Vencida",
};

function formatPeriodo(cupon) {
  if (cupon.periodo_desde) {
    return dayjs(cupon.periodo_desde).format("MM/YYYY");
  }
  if (cupon.periodo_hasta) {
    return dayjs(cupon.periodo_hasta).format("MM/YYYY");
  }
  return "Sin período";
}

export default function CuponesRoboPanel({ polizaId, cupones: cuponesProp }) {
  const dispatch = useDispatch();

  const [uploadingById, setUploadingById] = useState({});
  const [uploadTarget, setUploadTarget] = useState(null);
  const fileInputRef = useRef(null);

  const { byPoliza, loadingByPoliza, updatingById } = useSelector(
    (s) => s.cuponesRobo || {}
  );

  useEffect(() => {
    if (!polizaId) return;
    dispatch(fetchCuponesRobo(polizaId));
  }, [dispatch, polizaId]);

  const loading = !!loadingByPoliza?.[polizaId];
  const cuponesState = byPoliza?.[polizaId];
  const cupones = useMemo(
    () => cuponesState || cuponesProp || [],
    [cuponesState, cuponesProp]
  );

  const handleClickUpload = (cupon) => {
    setUploadTarget(cupon);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    const cuponId = uploadTarget.id;
    try {
      setUploadingById((prev) => ({ ...prev, [cuponId]: true }));

      const { secure_url, public_id } = await uploadToCloudinary(
        file,
        "rc-admin/cupones-robo"
      );

      await dispatch(
        actualizarEstadoCuponRobo({
          id: cuponId,
          polizaId,
          estado: "PAGADA", // al subir comprobante, se marca pagada
          foto_url: secure_url,
          foto_public_id: public_id,
        })
      ).unwrap();
      // El toast + mail lo maneja el slice
    } catch (error) {
      console.error(error);
      toast.error("No se pudo subir la foto del cupón.");
    } finally {
      setUploadingById((prev) => {
        const clone = { ...prev };
        delete clone[cuponId];
        return clone;
      });
      setUploadTarget(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={shell}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-primary-500/20 text-primary-300 shrink-0">
            <HiShieldCheck className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-neutral-50">
              Cuponeras de robo
            </h3>
            <p className="text-[11px] leading-snug text-neutral-400 max-w-md">
              Cada casillero representa un mes de cobertura de robo. Verde =
              pagado, rosa = vencido, amarillo = al día.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => polizaId && dispatch(fetchCuponesRobo(polizaId))}
          className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/10"
        >
          <HiRefresh className="mr-1 h-3 w-3" />
          Refrescar
        </button>
      </div>

      {/* Contenido */}
      <div className="px-4 py-3 space-y-3">
        {loading && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-950/70 px-3 py-2 text-[11px] text-neutral-300">
            <span className="h-3 w-3 animate-spin rounded-full border border-neutral-600 border-t-transparent" />
            Cargando cupones de robo...
          </div>
        )}

        {!loading && cupones.length === 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-dashed border-white/15 bg-neutral-950/60 px-3 py-3 text-[11px] text-neutral-400">
            <HiClock className="mt-0.5 h-4 w-4 text-neutral-500" />
            <span>
              Todavía no hay cupones de robo para esta póliza. Se generan en base a
              las cuotas de la póliza.
            </span>
          </div>
        )}

        {!loading && cupones.length > 0 && (
          <div className="space-y-2">
            {cupones
              .slice()
              .sort((a, b) =>
                String(a.periodo_desde || "").localeCompare(
                  String(b.periodo_desde || "")
                )
              )
              .map((cupon) => {
                const baseEstado = (cupon.estado || "PENDIENTE").toUpperCase();
                const isPagada = baseEstado === "PAGADA";

                const hoy = dayjs();
                const tieneVto = !!cupon.fecha_vencimiento;
                const isVencida =
                  !isPagada &&
                  tieneVto &&
                  dayjs(cupon.fecha_vencimiento).isBefore(hoy, "day");

                // 💡 Lógica nueva:
                // - PAGADA  → "Pagada"
                // - no pagada + vencida → "Vencida"
                // - no pagada + NO vencida → "Al día"
                const visualEstado = isPagada
                  ? "PAGADA"
                  : isVencida
                  ? "VENCIDA"
                  : "AL_DIA";

                const badgeClass =
                  badgeByEstado[visualEstado] ||
                  "bg-neutral-700/40 text-neutral-100 border border-neutral-600/40";

                const updating = !!updatingById?.[cupon.id];
                const uploading = !!uploadingById?.[cupon.id];

                const tienePagoMeta =
                  !!cupon.fecha_pago || !!cupon.medio_cobro || !!cupon.foto_url;

                const btnLabel =
                  visualEstado === "PAGADA"
                    ? cupon.foto_url
                      ? "Cambiar foto"
                      : "Subir foto"
                    : "Subir comprobante y marcar pagado";

                const cardTone =
                  visualEstado === "PAGADA"
                    ? "border-emerald-500/40 bg-emerald-950/40"
                    : visualEstado === "VENCIDA"
                    ? "border-rose-500/40 bg-rose-950/40"
                    : // AL_DIA → tono intermedio (amarillo)
                      "border-amber-500/40 bg-amber-950/40";

                return (
                  <motion.div
                    key={cupon.id}
                    layout
                    className={`flex flex-col gap-3 rounded-xl border px-3 py-2 sm:px-4 sm:py-3 md:flex-row md:items-stretch ${cardTone}`}
                  >
                    {/* Columna izquierda: datos del cupón */}
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-neutral-50">
                          {formatPeriodo(cupon)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${badgeClass}`}
                        >
                          {visualEstado === "PAGADA" && (
                            <HiBadgeCheck className="h-3 w-3" />
                          )}
                          {visualEstado === "AL_DIA" && (
                            <HiClock className="h-3 w-3" />
                          )}
                          {visualEstado === "VENCIDA" && (
                            <HiExclamationCircle className="h-3 w-3" />
                          )}
                          <span>
                            {labelByEstado[visualEstado] || visualEstado}
                          </span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-200">
                        {cupon.periodo_desde && cupon.periodo_hasta && (
                          <span className="rounded-full bg-white/5 px-2 py-0.5 border border-white/10">
                            {dayjs(cupon.periodo_desde).format("DD/MM/YYYY")} –{" "}
                            {dayjs(cupon.periodo_hasta).format("DD/MM/YYYY")}
                          </span>
                        )}
                        {cupon.fecha_vencimiento && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-neutral-100">
                            Vence:{" "}
                            {dayjs(cupon.fecha_vencimiento).format(
                              "DD/MM/YYYY"
                            )}
                          </span>
                        )}

                        {/* Meta de pago cuando está pagada */}
                        {visualEstado === "PAGADA" && tienePagoMeta && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                            <HiBadgeCheck className="h-3 w-3" />
                            <span>
                              Pagado
                              {cupon.fecha_pago && (
                                <>
                                  {" "}
                                  el{" "}
                                  {dayjs(cupon.fecha_pago).format(
                                    "DD/MM/YYYY HH:mm"
                                  )}
                                </>
                              )}
                              {cupon.medio_cobro && (
                                <>
                                  {" "}
                                  · {cupon.medio_cobro}
                                </>
                              )}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Columna derecha: preview + botón */}
                    <div className="flex w-full flex-col items-end gap-2 md:w-64">
                      {/* Preview grande a la derecha */}
                      <div className="w-full">
                        {cupon.foto_url ? (
                          <div className="relative w-full overflow-hidden rounded-xl border border-emerald-500/40 bg-black/40">
                            <img
                              src={cupon.foto_url}
                              alt="Cupón de robo"
                              className="h-28 w-full object-cover sm:h-32 md:h-36"
                            />
                          </div>
                        ) : (
                          <div className="flex h-28 w-full items-center justify-center rounded-xl border border-dashed border-white/15 bg-neutral-950/70 text-[11px] text-neutral-500 sm:h-32 md:h-36">
                            Sin comprobante adjunto
                          </div>
                        )}
                      </div>

                      {/* Botón de acción */}
                      <div className="flex flex-wrap items-center justify-end gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => handleClickUpload(cupon)}
                          disabled={uploading || updating}
                          className="inline-flex w-full sm:w-auto items-center justify-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-neutral-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {uploading || updating ? (
                            <span className="h-3 w-3 animate-spin rounded-full border border-neutral-900 border-t-transparent" />
                          ) : (
                            <HiPhotograph className="h-3 w-3" />
                          )}
                          <span>{btnLabel}</span>
                        </button>
                      </div>

                      {cupon.foto_url && (
                        <a
                          href={cupon.foto_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-sky-300 hover:text-sky-200 mt-0.5"
                        >
                          <HiPhotograph className="h-3 w-3" />
                          Ver en tamaño completo
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>

      {/* Input oculto para subir fotos de cupones */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
