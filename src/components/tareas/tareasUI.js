// src/components/tareas/tareasUI.js
import {
  HiCloudUpload, HiDocumentText, HiUser, HiPaperAirplane,
} from "react-icons/hi";

/* Paleta de estilos compartida por TareasPage (border-2, relieve Duo). */
export const UI = {
  surface: "bg-[var(--surface)]",
  card: "bg-[var(--card)]",
  titulo: "text-[var(--titulo)]",
  suave: "text-[var(--suave)]",
  linea: "border-[var(--linea)]",
  marca: "text-[var(--marca)]",
};

/* Secciones que abren wizard.
 * key   → clave que devuelve el backend (data[key] = lista de items)
 * tipo  → identificador de flujo para el wizard
 */
export const SECCIONES = [
  { key: "subir_poliza",  titulo: "Subir póliza a sistema", accion: "Subir",     icon: HiCloudUpload,    tipo: "subir-poliza" },
  { key: "datos_poliza",  titulo: "Datos de la póliza",     accion: "Completar",  icon: HiDocumentText,   tipo: "datos-poliza" },
  { key: "datos_cliente", titulo: "Datos del cliente",      accion: "Completar",  icon: HiUser,           tipo: "datos-cliente" },
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