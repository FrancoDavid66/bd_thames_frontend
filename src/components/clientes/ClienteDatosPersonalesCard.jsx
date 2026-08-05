// src/components/clientes/ClienteDatosPersonalesCard.jsx
import { memo } from "react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import {
  HiIdentification,
  HiPhone,
  HiMail,
  HiLocationMarker,
  HiCalendar,
} from "react-icons/hi";

const fmt = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "-");

// Normaliza para comparar sin tildes ni mayúsculas ("COMPLETO" -> "completo")
const normEstado = (v) =>
  String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

function ClienteDatosPersonalesCard({ cliente }) {
  if (!cliente) return null;

  // 🚀 FIX: el backend manda estado "COMPLETO" / "BORRADOR" (no true/"activo").
  //    Antes esto siempre daba "Inactivo". Ahora lee el valor real.
  const est = normEstado(cliente.estado);
  const estadoCompleto = est.includes("completo");
  const estadoTone = estadoCompleto
    ? "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde"
    : "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo";
  const estadoLabel = estadoCompleto ? "Completo" : "Incompleto";

  const faltaBadge = "inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo ml-2";

  return (
    <motion.section
      className="rounded-3xl bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark shadow-[0_2px_0_var(--color-duo-linea)] dark:shadow-[0_2px_0_var(--color-linea-dark)] overflow-hidden h-full flex flex-col"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-2xl bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] flex items-center justify-center text-duo-azul-sombra dark:text-duo-azul shrink-0">
            <HiIdentification className="text-xl" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black text-titulo dark:text-titulo-dark truncate">
              Datos Personales
            </h2>
            <p className="text-[10px] text-suave dark:text-suave-dark font-extrabold uppercase tracking-wider mt-0.5 truncate">
              Contacto y Documentación
            </p>
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${estadoTone}`}>
          {estadoLabel}
        </span>
      </div>

      <div className="flex-1 p-4 sm:p-5 flex flex-col gap-5 overflow-y-auto scrollbar-hide">

        {/* Identificadores Principales */}
        <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-4 pb-4 border-b-2 border-linea dark:border-linea-dark">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-suave dark:text-suave-dark">DNI / CUIT</span>
            <span className="text-titulo dark:text-titulo-dark font-mono font-extrabold text-sm sm:text-base">{cliente.dni_cuit_cuil || "—"}</span>
          </div>

          {cliente.alias && (
            <div className="flex flex-col gap-1 border-l-2 border-linea dark:border-linea-dark pl-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-suave dark:text-suave-dark">Alias</span>
              <span className="text-duo-azul font-extrabold text-sm truncate max-w-[120px] sm:max-w-[200px]">{cliente.alias}</span>
            </div>
          )}

          {cliente.id && (
            <div className="flex flex-col gap-1 ml-auto text-right">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-suave dark:text-suave-dark">ID Sist.</span>
              <span className="text-suave dark:text-suave-dark font-mono font-extrabold text-sm">#{cliente.id}</span>
            </div>
          )}
        </div>

        {/* Grid de datos en cajas (Mobile friendly) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

          {/* Teléfono */}
          <div className="flex gap-3 items-start bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark p-3 sm:p-4 rounded-2xl">
            <div className="h-9 w-9 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark flex items-center justify-center shrink-0">
              <HiPhone className="text-duo-azul text-lg" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-suave dark:text-suave-dark mb-0.5">Teléfono / WhatsApp</span>
              {cliente.telefono ? (
                <a href={`tel:${cliente.telefono}`} className="text-sm font-extrabold text-titulo dark:text-titulo-dark hover:text-duo-azul transition-colors truncate">
                  {cliente.telefono}
                </a>
              ) : (
                <span className="text-sm font-extrabold text-suave dark:text-suave-dark">—</span>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="flex gap-3 items-start bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark p-3 sm:p-4 rounded-2xl">
            <div className="h-9 w-9 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark flex items-center justify-center shrink-0">
              <HiMail className="text-duo-azul text-lg" />
            </div>
            <div className="flex flex-col min-w-0 w-full">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-suave dark:text-suave-dark mb-0.5">Correo Electrónico</span>
              {cliente.email ? (
                <a href={`mailto:${cliente.email}`} className="text-sm font-extrabold text-titulo dark:text-titulo-dark hover:text-duo-azul transition-colors block truncate w-full" title={cliente.email}>
                  {cliente.email}
                </a>
              ) : (
                <span className={faltaBadge}>Falta</span>
              )}
            </div>
          </div>

          {/* Dirección */}
          <div className="flex gap-3 items-start bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark p-3 sm:p-4 rounded-2xl sm:col-span-2">
            <div className="h-9 w-9 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark flex items-center justify-center shrink-0">
              <HiLocationMarker className="text-duo-azul text-lg" />
            </div>
            <div className="flex flex-col min-w-0 w-full">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-suave dark:text-suave-dark mb-0.5">Dirección y Localidad</span>
              <span className="text-sm font-extrabold text-titulo dark:text-titulo-dark leading-snug">
                {cliente.direccion || "—"}
                {cliente.localidad && (
                  <span className="text-suave dark:text-suave-dark font-normal ml-1">· {cliente.localidad}</span>
                )}
                {!cliente.localidad && !cliente.direccion && <span className={faltaBadge}>Falta</span>}
              </span>
            </div>
          </div>

          {/* Fecha de Nacimiento */}
          <div className="flex gap-3 items-start bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark p-3 sm:p-4 rounded-2xl sm:col-span-2">
            <div className="h-9 w-9 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark flex items-center justify-center shrink-0">
              <HiCalendar className="text-duo-azul text-lg" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-suave dark:text-suave-dark mb-0.5">Fecha de Nacimiento</span>
              <span className="text-sm font-extrabold text-titulo dark:text-titulo-dark">
                {fmt(cliente.fecha_nacimiento)}
              </span>
            </div>
          </div>

        </div>
      </div>
    </motion.section>
  );
}

export default memo(ClienteDatosPersonalesCard);