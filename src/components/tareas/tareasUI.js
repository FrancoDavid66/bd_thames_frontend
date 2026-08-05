/* src/components/tareas/tareasUI.js
 *
 * Configuración central de la app de Tareas.
 * Usa la PALETA SEMÁNTICA real de la app (definida en index.css con @theme):
 *   surface / card / linea / titulo / suave  (+ variantes -dark para modo oscuro)
 *   marca (#B80000) = acento de acción
 *   ingreso/egreso/oficina/tarjeta = colores de estado
 *
 * Todo soporta modo CLARO y OSCURO con dark:. Un solo lugar para estilos,
 * iconos y textos, así los componentes no repiten nada.
 *
 * 🦉 BOTONES 3D (estilo Duolingo): btnPrimary y btnGhost traen relieve de 4px
 *    (borde inferior sólido que se "hunde" al apretar). Como se aplican en TODA
 *    la app de Tareas y Control diario, con tocar acá quedan todos en 3D.
 */
import {
  HiPaperAirplane, HiDocumentText, HiUser, HiIdentification,
  HiCamera, HiCloudUpload,
} from "react-icons/hi";

/* Tokens de estilo reutilizables (clases Tailwind con la paleta semántica). */
export const UI = {
  // Superficies (claro + oscuro automático)
  screen: "min-h-screen bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark",
  card: "rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark",
  cardHover: "hover:border-marca/40 transition-colors",
  sheet: "bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark",

  // 🦉 Acción principal (rojo marca) — botón 3D profundo (4px)
  btnPrimary:
    "bg-marca text-white font-black " +
    "shadow-[0_4px_0_#8a0000] active:translate-y-[3px] active:shadow-[0_1px_0_#8a0000] " +
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-[0_4px_0_#8a0000] disabled:active:translate-y-0 " +
    "transition-all",
  // 🦉 Acción secundaria (gris) — botón 3D 4px
  btnGhost:
    "bg-titulo/5 dark:bg-white/5 text-suave dark:text-suave-dark font-black " +
    "shadow-[0_4px_0_rgba(0,0,0,0.15)] dark:shadow-[0_4px_0_rgba(0,0,0,0.5)] " +
    "active:translate-y-[3px] active:shadow-[0_1px_0_rgba(0,0,0,0.15)] dark:active:shadow-[0_1px_0_rgba(0,0,0,0.5)] " +
    "hover:bg-titulo/10 dark:hover:bg-white/10 disabled:opacity-40 transition-all",

  // Inputs
  input:
    "h-12 w-full rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea " +
    "dark:border-linea-dark px-4 text-sm font-bold text-titulo dark:text-titulo-dark " +
    "placeholder:text-suave/50 focus:outline-none focus:ring-2 focus:ring-marca/50 dark:[color-scheme:dark]",
  label: "text-[11px] font-bold text-suave dark:text-suave-dark uppercase tracking-widest",

  // Textos
  txtTitulo: "text-titulo dark:text-titulo-dark",
  txtSuave: "text-suave dark:text-suave-dark",

  // Chips de estado
  chipOk: "bg-ingreso/10 text-ingreso border-2 border-ingreso/25",
  chipPend: "bg-marca/10 text-marca border-2 border-marca/25",
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

/* Mensaje motivacional del header según el progreso. */
export function mensajeProgreso(pct, total) {
  if (total === 0) return "¡Todo listo por hoy! 🎉";
  if (pct >= 75) return "¡Ya casi! Última milla 💪";
  if (pct >= 40) return "¡Buen ritmo, seguí así!";
  if (pct > 0) return "¡Arrancaste, dale que se puede!";
  return "¡A darle al día!";
}

/* Key única para cada item de lista (póliza o cliente). */
export const itemKey = (sec, item) =>
  `${sec.key}-${item.poliza_id ?? item.cliente_id}`;
