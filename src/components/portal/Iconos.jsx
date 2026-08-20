// src/components/portal/Iconos.jsx
//
// 🎨 Íconos SVG de línea, monocromáticos.
//
// No se usan emojis: en pantalla se ven amateur, cambian de forma según el
// sistema operativo, y no toman el color del contenedor. Estos heredan
// `currentColor`, así que basta con darle color al padre.

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconAuto({ size = 20, w = 1.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M5 17h14M4 17v-4.5L6 7h12l2 5.5V17M4 17v2h3v-2M17 17v2h3v-2" />
      <circle cx="7.5" cy="13.5" r="1.2" />
      <circle cx="16.5" cy="13.5" r="1.2" />
    </svg>
  );
}

export function IconMoto({ size = 20, w = 1.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <circle cx="5" cy="17" r="3" />
      <circle cx="19" cy="17" r="3" />
      <path d="M8 17h8l-3-6h-4M13 11l2-4h3" />
    </svg>
  );
}

export function IconCelular({ size = 20, w = 1.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18.5h2" />
    </svg>
  );
}

export function IconVida({ size = 20, w = 1.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M20.8 6.6a5 5 0 00-7.1 0L12 8.3l-1.7-1.7a5 5 0 00-7.1 7.1l1.7 1.7L12 22.4l7.1-7L20.8 13.7a5 5 0 000-7.1z" />
    </svg>
  );
}

export function IconHogar({ size = 20, w = 1.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z" />
    </svg>
  );
}

export function IconBici({ size = 20, w = 1.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M6 17.5l4-8h5l3.5 8M10 9.5h5" />
    </svg>
  );
}

export function IconViaje({ size = 20, w = 1.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M17.8 19.2L16 11l3.5-3.5a2.1 2.1 0 00-3-3L13 8 4.8 6.2a.5.5 0 00-.5.8L8 11l-3 3H3l-.5.5L5 16l1.5 2.5L7 18v-2l3-3 4 3.7a.5.5 0 00.8-.5z" />
    </svg>
  );
}

export function IconCamion({ size = 20, w = 1.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M2 17V6h11v11M13 9h4l4 4v4M2 17h2M9 17h6M19 17h3" />
      <circle cx="6.5" cy="17.5" r="1.6" />
      <circle cx="17.5" cy="17.5" r="1.6" />
    </svg>
  );
}

/** Devuelve el ícono del tipo (ver `tipoIcono` en utils.js). */
export function IconoTipo({ tipo, size = 20, w = 1.7 }) {
  const M = {
    auto: IconAuto, moto: IconMoto, celular: IconCelular, vida: IconVida,
    hogar: IconHogar, bici: IconBici, viaje: IconViaje, camion: IconCamion,
  };
  const C = M[tipo] || IconAuto;
  return <C size={size} w={w} />;
}

/* ── Navegación y acciones ── */

export function IconInicio({ size = 21, w = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z" />
    </svg>
  );
}

export function IconPagos({ size = 21, w = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2 10h20" />
    </svg>
  );
}

export function IconSeguros({ size = 21, w = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M12 3l8 3v6c0 5-3.4 8.5-8 9.9C7.4 20.5 4 17 4 12V6z" />
    </svg>
  );
}

export function IconPapeles({ size = 21, w = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

export function IconDoc({ size = 19, w = 1.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  );
}

export function IconChat({ size = 19, w = 1.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.5 8.5 0 01-3.8-.9L3 21l2-4.9A8.4 8.4 0 0112 3a8.4 8.4 0 019 8.5z" />
    </svg>
  );
}

export function IconAlerta({ size = 19, w = 1.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function IconFoto({ size = 20, w = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2h3l1.6-2.5h6.8L17 7h3a2 2 0 012 2z" />
      <circle cx="12" cy="13.5" r="3.6" />
    </svg>
  );
}

export function IconLocal({ size = 18, w = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6" />
    </svg>
  );
}

export function IconBanco({ size = 18, w = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M3 10l9-6 9 6M5 10v9M19 10v9M9 10v9M15 10v9M2 20h20" />
    </svg>
  );
}

export function IconEfectivo({ size = 18, w = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function IconTransfer({ size = 18, w = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M17 2l4 4-4 4M21 6H8M7 22l-4-4 4-4M3 18h13" />
    </svg>
  );
}

export function IconCodigo({ size = 21, w = 1.9 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10v4M10 10v4M14 10v4M18 10v4" />
    </svg>
  );
}

export function IconChevron({ size = 17, w = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function IconAtras({ size = 18, w = 2.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function IconAbajo({ size = 13, w = 2.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconTick({ size = 16, w = 2.4 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function IconOjo({ size = 15, w = 1.9, tachado = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      {tachado ? (
        <>
          <path d="M4 4l16 16" />
          <path d="M9.9 5.3A9.9 9.9 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-2.6 3.5M6.5 7.5A17 17 0 002 12s3.6 7 10 7a9.7 9.7 0 003.8-.8" />
        </>
      ) : (
        <>
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export function IconPersona({ size = 19, w = 1.9 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function IconFlecha({ size = 16, w = 2.4 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

/** Medio círculo relleno: el botón de cambiar contraste del header. */
export function IconContraste({ size = 15, w = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17" strokeWidth="1.6" />
      <path d="M12 5.5a6.5 6.5 0 010 13z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Reloj: marca el pago que todavía no venció. */
export function IconReloj({ size = 13, w = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

/** Clip: adjuntar un archivo que ya está en el celular. */
export function IconClip({ size = 18, w = 1.9 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.4 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.82-2.83l8.49-8.48" />
    </svg>
  );
}

/** WhatsApp. */
export function IconWhatsapp({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.5 14.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.1-.7.1l-.6.8c-.1.2-.3.2-.5.1a8 8 0 01-3.9-3.4c-.1-.2-.1-.4.1-.5l.7-.6c.2-.2.2-.4.1-.7l-.9-2.1c-.1-.3-.4-.5-.7-.4-1 .2-1.9 1-2 2.1a9.9 9.9 0 008.6 8.6c1.1-.1 1.9-1 2.1-2 .1-.3-.1-.6-.2-.7z" />
      <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20z" />
    </svg>
  );
}

/** Cámara: el botón de sacar foto del comprobante. */
export function IconCamara({ size = 17, w = 1.9 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2h3l1.6-2.5h6.8L17 7h3a2 2 0 012 2z" />
      <circle cx="12" cy="13.5" r="3.6" />
    </svg>
  );
}

/** Sol: el tema claro del interruptor del pie. */
export function IconSol({ size = 14, w = 1.9 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={w} strokeLinecap="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </svg>
  );
}

/** Luna: el tema oscuro. */
export function IconLuna({ size = 14, w = 1.9 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 14.3A8.5 8.5 0 019.7 3.5a8.5 8.5 0 1010.8 10.8z" />
    </svg>
  );
}
