// src/components/layout/IndicadorVivo.jsx
// ============================================================
// 📡 "● EN VIVO" al lado del logo (compu) o un puntito (celu).
// Muestra el estado del cartero (src/services/vivo.js):
//   · EN VIVO (verde)        → todo al día, se revisa solo cada 20 s.
//   · ACTUALIZANDO (azul)    → llegaron cambios, se recarga la pantalla.
//   · N CAMBIOS EN ESPERA    → hay un formulario abierto; se aplica al cerrarlo.
//   · SIN CONEXIÓN (rojo)    → se cortó internet; reintenta solo.
// Pasando el mouse, dice cuándo fue la última revisión.
// ============================================================
import { useEffect, useState } from "react";
import { escucharEstado } from "../../services/vivo";

const hora = (d) =>
  d instanceof Date
    ? d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

function vista(e) {
  if (e.modo === "sin_conexion") {
    return {
      texto: "SIN CONEXIÓN",
      titulo: "Se cortó la conexión",
      detalle: "Reintenta solo. Mientras tanto, lo que ves puede estar desactualizado.",
      pill: "border-duo-rojo/40 bg-duo-rojo-soft text-duo-rojo-sombra dark:bg-[var(--color-duo-rojo-soft-dark)] dark:text-duo-rojo",
      punto: "bg-duo-rojo",
      girar: false,
    };
  }
  if (e.enEspera > 0) {
    return {
      texto: e.enEspera === 1 ? "1 CAMBIO EN ESPERA" : `${e.enEspera} CAMBIOS EN ESPERA`,
      titulo: "Tenés un formulario abierto",
      detalle: "Se actualiza cuando lo cerrás, así no se te borra lo que estabas escribiendo.",
      pill: "border-duo-amarillo/40 bg-duo-amarillo-soft text-duo-amarillo-sombra dark:bg-[var(--color-duo-amarillo-soft-dark)] dark:text-duo-amarillo",
      punto: "bg-duo-amarillo",
      girar: false,
    };
  }
  if (e.modo === "actualizando") {
    return {
      texto: "ACTUALIZANDO",
      titulo: "Llegaron cambios",
      detalle: "Se recarga esta pantalla, sin perder los filtros.",
      pill: "border-duo-azul/40 bg-duo-azul-soft text-duo-azul-sombra dark:bg-[var(--color-duo-azul-soft-dark)] dark:text-duo-azul",
      punto: "bg-duo-azul",
      girar: true,
    };
  }
  return {
    texto: "EN VIVO",
    titulo: "Todo al día",
    detalle: `Se revisa solo cada 20 s · última: ${hora(e.ultima)}`,
    pill: "border-duo-verde/40 bg-duo-verde-soft text-duo-verde-sombra dark:bg-[var(--color-duo-verde-soft-dark)] dark:text-duo-verde",
    punto: "bg-duo-verde",
    girar: false,
  };
}

export default function IndicadorVivo({ compacto = false }) {
  const [e, setE] = useState(null);

  useEffect(() => escucharEstado((s) => setE({ ...s })), []);

  if (!e || e.modo === "no_disponible" || e.modo === "sin_sesion") return null;
  const v = vista(e);

  if (compacto) {
    return (
      <span
        role="status"
        aria-label={v.texto}
        title={`${v.titulo} · ${v.detalle}`}
        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${v.punto}`}
      />
    );
  }

  return (
    <div className="group relative">
      <span
        role="status"
        className={`inline-flex h-7 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-[11px] font-bold tracking-wide ${v.pill}`}
      >
        {v.girar ? (
          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 4v5h-5" />
          </svg>
        ) : (
          <span className={`h-2 w-2 rounded-full ${v.punto}`} aria-hidden="true" />
        )}
        {v.texto}
      </span>
      <div className="pointer-events-none invisible absolute left-0 top-9 z-50 w-64 rounded-lg border border-linea bg-card p-3 text-[12px] leading-snug text-suave opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 dark:border-linea-dark dark:bg-card-dark dark:text-suave-dark">
        <div className="font-semibold text-titulo dark:text-titulo-dark">{v.titulo}</div>
        <div>{v.detalle}</div>
      </div>
    </div>
  );
}
