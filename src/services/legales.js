// src/services/legales.js
// ============================================================
// ⚖️ LEGALES — todas las llamadas al servidor en un solo lugar.
//
// La plata (honorarios, %, comisión, comprobantes) la filtra el SERVIDOR
// según quién pide: a la oficina directamente no le llega. Acá no se esconde
// nada, solo se pide y se manda.
//
// Ejemplo:
//   const casos = await listarAbiertos();                // tablero
//   const e = await cambiarEstado(12, { estado: "EN_TRAMITE" });
//   const { dias } = await horariosLibres(3, { modalidad: "OFICINA" });
// ============================================================
import api from "./api";
import { uploadToCloudinary } from "../utils/cloudinary";
import { comprimirImagen } from "../utils/comprimirImagen";

const B = "/legales/";
const datos = (p) => p.then((r) => r.data);

// El catálogo (motivos, preguntas, papeles, estados, glosario) casi no cambia:
// se pide 1 vez por sesión. Trae datos del usuario (su oficina, su rol): si
// entra otra persona en la misma pestaña, se vuelve a pedir.
let catalogoPromesa = null;
let catalogoDe = null;
export function pedirCatalogo(forzar = false) {
  const sesion = localStorage.getItem("access_token") || "";
  if (!catalogoPromesa || forzar || catalogoDe !== sesion) {
    catalogoDe = sesion;
    catalogoPromesa = datos(api.get(`${B}catalogo/`)).catch((e) => {
      catalogoPromesa = null;
      throw e;
    });
  }
  return catalogoPromesa;
}

// ── casos ──
export const pedirResumen = () => datos(api.get(`${B}resumen/`));
export const listarAbiertos = (params = {}) => datos(api.get(`${B}expedientes/`, { params }));
export const listarCerrados = (page = 1, params = {}) =>
  datos(api.get(`${B}expedientes/`, { params: { ...params, cerrados: 1, page } }));
export const pedirCaso = (id) => datos(api.get(`${B}expedientes/${id}/`));
export const crearCaso = (body) => datos(api.post(`${B}expedientes/`, body));
export const editarCaso = (id, body) => datos(api.patch(`${B}expedientes/${id}/`, body));
export const cambiarEstado = (id, body) => datos(api.post(`${B}expedientes/${id}/estado/`, body));
export const asignarAbogado = (id, abogado) =>
  datos(api.post(`${B}expedientes/${id}/asignar/`, { abogado: abogado || null }));
export const anotar = (id, body) => datos(api.post(`${B}expedientes/${id}/nota/`, body));
export const agregarFecha = (id, body) => datos(api.post(`${B}expedientes/${id}/fechas/`, body));
export const editarFecha = (id, fechaId, body) => datos(api.patch(`${B}expedientes/${id}/fechas/${fechaId}/`, body));
export const borrarFecha = (id, fechaId) => datos(api.delete(`${B}expedientes/${id}/fechas/${fechaId}/`));
/**
 * Guarda una novedad (una nota o un cambio de estado) y, si hay, una fecha nueva.
 * Primero la FECHA: si está mal (ej: ya pasó), no se guardó nada todavía.
 * `hecho` recuerda qué partes ya se guardaron: si se corta a la mitad y se toca
 * "Guardar" de nuevo, no se repiten (ni la nota dos veces ni la fecha dos veces).
 * `alGuardar(caso)` recibe el caso actualizado después de cada parte.
 */
export async function guardarNovedadEnPartes(e, { texto, estado, visible, fecha }, hecho = {}, alGuardar = null) {
  let nuevo = e;
  if (fecha && !hecho.fecha) {
    nuevo = await agregarFecha(e.id, fecha);
    hecho.fecha = true;
    alGuardar?.(nuevo);
  }
  if (estado && !hecho.estado) {
    nuevo = await cambiarEstado(e.id, { estado, nota: texto, visible });
    hecho.estado = true;
    alGuardar?.(nuevo);
  } else if (!estado && texto && !hecho.texto) {
    nuevo = await anotar(e.id, { texto, visible });
    hecho.texto = true;
    alGuardar?.(nuevo);
  }
  return nuevo;
}
export const guardarDocumento = (id, body) => datos(api.post(`${B}expedientes/${id}/documentos/`, body));
export const borrarDocumento = (id, docId) => datos(api.delete(`${B}expedientes/${id}/documentos/${docId}/`));
export const cargarHonorarios = (id, body) => datos(api.post(`${B}expedientes/${id}/honorarios/`, body));
export const cobrarComision = (id, body) => datos(api.post(`${B}expedientes/${id}/cobrar-comision/`, body));
export const deshacerComision = (id) => datos(api.post(`${B}expedientes/${id}/deshacer-comision/`, {}));
/** La oficina mandó un WhatsApp a mano: queda anotado. motivo: link | novedad | turno | fecha. */
export const avisoWhatsapp = (id, motivo, extra = {}) =>
  datos(api.post(`${B}expedientes/${id}/aviso-whatsapp/`, { motivo, ...extra }));
export const buscarClientes = (q) => datos(api.get(`${B}buscar/`, { params: { q } }));

// ── 🆕 05/10: la app del abogado (listas propias, mover, casos propios, agenda, plazos) ──
/** { ESTADO: [...], INSTANCIA: [...], ETIQUETA: [...], puede_editar } — las listas que arma el estudio. */
export const pedirListas = () => datos(api.get(`${B}listas/`));
/** body: { tipo: "ESTADO" | "INSTANCIA" | "ETIQUETA", nombre, color?, etapa? } → { opcion, ESTADO, INSTANCIA, ETIQUETA } */
export const crearOpcion = (body) => datos(api.post(`${B}listas/`, body));
export const editarOpcion = (id, body) => datos(api.patch(`${B}listas/${id}/`, body));
export const borrarOpcion = (id) => datos(api.delete(`${B}listas/${id}/`));
export const ordenarOpciones = (tipo, ids) => datos(api.post(`${B}listas/ordenar/`, { tipo, ids }));
/** Pasar el caso a uno de los estados propios. body: { estado: id, nota?, visible? } */
export const moverCaso = (id, body) => datos(api.post(`${B}expedientes/${id}/mover/`, body));
/** El abogado carga un caso suyo (sin oficina ni comisión). */
export const crearCasoPropio = (body) => datos(api.post(`${B}expedientes/propio/`, body));
/** Las fechas de sus casos. params: { desde, hasta, vencidas: 1 } → { fechas, vencidas?, feriados, hoy } */
export const pedirAgenda = (params = {}) => datos(api.get(`${B}agenda/`, { params }));
/** La calculadora. params: { desde: "AAAA-MM-DD", dias: 5, habiles: 1 | 0 } → { vence, texto, detalle, ya_paso } */
export const calcularPlazo = (params) => datos(api.get(`${B}plazo/`, { params }));

// ── abogados ──
export const listarAbogados = () => datos(api.get(`${B}abogados/`));
export const pedirAbogado = (id) => datos(api.get(`${B}abogados/${id}/`));
export const crearAbogado = (body) => datos(api.post(`${B}abogados/`, body));
export const editarAbogado = (id, body) => datos(api.patch(`${B}abogados/${id}/`, body));
export const borrarAbogado = (id) => datos(api.delete(`${B}abogados/${id}/`));
export const cobrarAbogado = (id, formaPago = "TRANSFERENCIA") =>
  datos(api.post(`${B}abogados/${id}/cobrar/`, { forma_pago: formaPago }));
export const usuariosSinFicha = () => datos(api.get(`${B}abogados/usuarios-sin-ficha/`));
/** Horarios LIBRES del abogado. params: { desde: "AAAA-MM-DD", dias: 14, modalidad: "OFICINA" | "TELEFONO" } */
export const horariosLibres = (abogadoId, params = {}) =>
  datos(api.get(`${B}abogados/${abogadoId}/horarios/`, { params }));

// ── turnos y días bloqueados ──
/** params: { desde, hasta, abogado, oficina, estado, activos } */
export const listarTurnos = (params = {}) => datos(api.get(`${B}turnos/`, { params }));
/** Devuelve { turno, expediente }. Si el horario se ocupó: error con codigo "ocupado". */
export const darTurno = (body) => datos(api.post(`${B}turnos/`, body));
export const cambiarEstadoTurno = (id, estado) => datos(api.post(`${B}turnos/${id}/estado/`, { estado }));
export const listarBloqueos = (params = {}) => datos(api.get(`${B}bloqueos/`, { params }));
export const bloquearDia = (body) => datos(api.post(`${B}bloqueos/`, body));
export const desbloquearDia = (id) => datos(api.delete(`${B}bloqueos/${id}/`));

// ── plata ──
export const pedirComisiones = (dias = 90) => datos(api.get(`${B}comisiones/`, { params: { dias } }));
export const listarAvisosPago = () => datos(api.get(`${B}avisos/`));
export const avisarPago = (archivo) => datos(api.post(`${B}avisos/`, archivo));
export const descartarAviso = (id) => datos(api.post(`${B}avisos/${id}/descartar/`, {}));

/** El mensaje que mandó el servidor (o uno por defecto). */
export function mensajeError(e, porDefecto = "No se pudo guardar. Probá de nuevo.") {
  const d = e?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  if (Array.isArray(d?.detail) && d.detail.length) return String(d.detail[0]);
  if (!e?.response) return e?.message && !/network|fetch/i.test(e.message) ? e.message : "No hay conexión con el servidor. Probá de nuevo.";
  return porDefecto;
}

/** ¿El servidor dijo que el horario del turno se acaba de ocupar? */
export function esOcupado(e) {
  return e?.response?.data?.codigo === "ocupado";
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Sube una foto o PDF a Cloudinary y devuelve lo que hay que mandarle al
 * servidor: { url, public_id, nombre, mime, tamano }.
 * Las fotos del celu se achican antes (sin eso, una foto tarda 30 s en subir).
 */
export async function subirArchivo(file, carpeta = "legales/papeles") {
  if (!file) throw new Error("No elegiste ningún archivo.");
  const esImagen = String(file.type || "").startsWith("image/");
  const esPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
  if (!esImagen && !esPdf) throw new Error("Solo fotos o PDF.");
  let final = file;
  if (esImagen && file.size > 400 * 1024) {
    try {
      final = await comprimirImagen(file);
    } catch {
      final = file;
    }
  }
  if (final.size > MAX_BYTES) throw new Error("El archivo pesa más de 10 MB.");
  const up = await uploadToCloudinary(final, { folder: carpeta });
  return {
    url: up.secure_url,
    public_id: up.public_id || "",
    nombre: file.name || "archivo",
    mime: esPdf ? "application/pdf" : final.type || up.mime || "image/jpeg",
    tamano: final.size || null,
  };
}

const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * 👤 Foto (o logo) del perfil de un abogado. Se achica a 512 px (queda en
 * ~50 KB). Devuelve { url, public_id }.
 */
export async function subirFotoPerfil(file) {
  if (!file) throw new Error("No elegiste ninguna foto.");
  const tipo = String(file.type || "").toLowerCase();
  if (!TIPOS_FOTO.includes(tipo)) throw new Error("Elegí una foto JPG o PNG.");
  let final = file;
  if (tipo !== "image/gif" && file.size > 150 * 1024) {
    try {
      final = await comprimirImagen(file, { max: 512, calidad: 0.85 });
    } catch {
      final = file;
    }
  }
  if (final.size > MAX_BYTES) throw new Error("La foto pesa más de 10 MB.");
  const up = await uploadToCloudinary(final, { folder: "legales/abogados" });
  return { url: up.secure_url, public_id: up.public_id || "" };
}
