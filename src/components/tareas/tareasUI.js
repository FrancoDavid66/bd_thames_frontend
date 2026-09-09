// src/components/tareas/tareasUI.js
//
// Configuración central de la app de Tareas.
// Usa la PALETA SEMÁNTICA real de la app (definida en index.css con @theme):
//   surface / card / linea / titulo / suave  (+ variantes -dark para modo oscuro)
//   marca (#B80000) = acento de acción
//   ingreso/egreso/oficina/tarjeta = colores de estado
//
// Todo soporta modo CLARO y OSCURO con dark:. Un solo lugar para estilos,
// iconos y textos, así los componentes no repiten nada.
//
// 🆕 Rediseño "profesional": btnPrimary y btnGhost ya NO tienen el relieve
// 3D de Duolingo (el borde de 4px que se hundía al apretar) — ahora son
// botones planos, como Stripe/Linear. Como esto se usa en TODA la app de
// Tareas y Control diario, con tocar acá quedan todos actualizados.
//
// 📱 RESPONSIVE: los tokens `input` y los botones mantienen h-12 (48px),
// buen tap target para mobile — eso no cambió.
import {
  HiPaperAirplane, HiDocumentText, HiUser, HiIdentification,
  HiCamera, HiCloudUpload,
} from "react-icons/hi";

/* Tokens de estilo reutilizables (clases Tailwind con la paleta semántica). */
export const UI = {
  // Superficies (claro + oscuro automático)
  screen: "min-h-screen bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark",
  card: "rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark",
  cardHover: "hover:border-marca/40 transition-colors",
  sheet: "bg-card dark:bg-card-dark border border-linea dark:border-linea-dark",

  // Acción principal (rojo marca) — plano, sin relieve 3D
  btnPrimary:
    "bg-marca text-white font-medium hover:brightness-110 transition-colors " +
    "disabled:opacity-40 disabled:cursor-not-allowed",
  // Acción secundaria (gris) — plano
  btnGhost:
    "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark font-medium border border-linea dark:border-linea-dark " +
    "hover:bg-titulo/5 dark:hover:bg-white/5 disabled:opacity-40 transition-colors",

  // Inputs (h-12 = 48px → buen tap target en mobile, sin cambios)
  input:
    "h-12 w-full rounded-lg bg-surface dark:bg-surface-dark border border-linea " +
    "dark:border-linea-dark px-4 text-[14px] text-titulo dark:text-titulo-dark " +
    "placeholder:text-suave/50 focus:outline-none focus:border-marca dark:[color-scheme:dark]",
  label: "text-[13px] font-medium text-suave dark:text-suave-dark",

  // Textos
  txtTitulo: "text-titulo dark:text-titulo-dark",
  txtSuave: "text-suave dark:text-suave-dark",

  // Chips de estado
  chipOk: "bg-ingreso/10 text-ingreso border border-ingreso/25",
  chipPend: "bg-marca/10 text-marca border border-marca/25",
};

/* Definición de cada tipo de tarea del día.
 * key   → clave que devuelve el backend (data[key] = lista de items)
 * tipo  → identificador de flujo para el wizard
 */
export const SECCIONES = [
  { key: "subir_poliza",  titulo: "Subir póliza a sistema", accion: "Subir",     icon: HiCloudUpload,    tipo: "subir-poliza" },
  { key: "datos_poliza",  titulo: "Datos de la póliza",     accion: "Completar",  icon: HiDocumentText,   tipo: "datos-poliza" },
  { key: "datos_cliente", titulo: "Datos del cliente",      accion: "Completar",  icon: HiUser,           tipo: "datos-cliente" },
  { key: "fotos_dni",     titulo: "Fotos del DNI",          accion: "Subir",      icon: HiIdentification, tipo: "fotos-dni" },
  { key: "fotos_poliza",  titulo: "Fotos del vehículo",     accion: "Subir",      icon: HiCamera,         tipo: "fotos-vehiculo" },
];

/* La tarea "enviar" se resuelve con 1 tap (no abre wizard). */
export const SECCION_ENVIAR = {
  key: "enviar_poliza", titulo: "Enviar póliza", icon: HiPaperAirplane, tipo: "enviar",
};

/* Todas las secciones que cuentan para el total (incluye enviar). */
export const TODAS_SECCIONES = [SECCION_ENVIAR, ...SECCIONES];

/* Mensaje del header según el progreso. */
export function mensajeProgreso(pct, total) {
  if (total === 0) return "Todo listo por hoy";
  if (pct >= 75) return "Ya casi, última milla";
  if (pct >= 40) return "Buen ritmo, seguí así";
  if (pct > 0) return "Arrancaste, dale que se puede";
  return "A darle al día";
}

/* Key única para cada item de lista (póliza o cliente). */
export const itemKey = (sec, item) =>
  `${sec.key}-${item.poliza_id ?? item.cliente_id}`;
