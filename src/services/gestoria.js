// src/services/gestoria.js
// ============================================================
// 🚗 GESTORÍA — todas las llamadas al servidor en un solo lugar.
//
// La plata (precio, %, comisión, comprobantes) la filtra el SERVIDOR según
// quién pide: a la oficina directamente no le llega y al gestor, nada de la
// comisión de THAMES (solo el admin). Acá no se esconde nada, solo se pide y se manda.
//
// Ejemplo:
//   const lista = await listarAbiertos();          // tablero
//   const t = await cambiarEstado(12, { estado: "EN_REGISTRO" });
// ============================================================
import api from "./api";
import { uploadToCloudinary } from "../utils/cloudinary";
import { comprimirImagen } from "../utils/comprimirImagen";

const B = "/gestoria/";
const datos = (p) => p.then((r) => r.data);

// El catálogo (tipos, estados, formas de pago) casi no cambia: se pide 1 vez
// por sesión. Trae datos del usuario (su oficina, su rol): si entra otra
// persona en la misma pestaña, se vuelve a pedir.
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

export const pedirResumen = () => datos(api.get(`${B}resumen/`));
// 💵 App de la gestora («Cobros», 30/09): lo que le pagaron en el mes y sus últimos cobros.
export const pedirMisCobros = () => datos(api.get(`${B}mis-cobros/`));
export const listarAbiertos = (params = {}) => datos(api.get(`${B}tramites/`, { params }));
export const listarCerrados = (page = 1) => datos(api.get(`${B}tramites/`, { params: { cerrados: 1, page } }));
export const pedirTramite = (id) => datos(api.get(`${B}tramites/${id}/`));
export const crearTramite = (body) => datos(api.post(`${B}tramites/`, body));
export const editarTramite = (id, body) => datos(api.patch(`${B}tramites/${id}/`, body));
export const cambiarEstado = (id, body) => datos(api.post(`${B}tramites/${id}/estado/`, body));
export const asignarGestor = (id, gestor) => datos(api.post(`${B}tramites/${id}/asignar/`, { gestor: gestor || null }));
export const cargarPrecio = (id, body) => datos(api.post(`${B}tramites/${id}/precio/`, body));
// 💵 "Recibí plata": {monto, archivo | documento, precio_gestoria?, pasar_a_listo?}
export const registrarCobro = (id, body) => datos(api.post(`${B}tramites/${id}/cobros/`, body));
export const anotar = (id, body) => datos(api.post(`${B}tramites/${id}/nota/`, body));
export const guardarDocumento = (id, body) => datos(api.post(`${B}tramites/${id}/documentos/`, body));
export const borrarDocumento = (id, docId) => datos(api.delete(`${B}tramites/${id}/documentos/${docId}/`));
export const cobrarComision = (id, body) => datos(api.post(`${B}tramites/${id}/cobrar-comision/`, body));
export const deshacerComision = (id) => datos(api.post(`${B}tramites/${id}/deshacer-comision/`, {}));
/** La oficina mandó el WhatsApp a mano ("alta" = el link, "listo" = que pase a retirarlo): queda anotado. */
export const avisoWhatsapp = (id, motivo) => datos(api.post(`${B}tramites/${id}/aviso-whatsapp/`, { motivo }));
export const buscarClientes = (q) => datos(api.get(`${B}buscar/`, { params: { q } }));

export const listarGestores = () => datos(api.get(`${B}gestores/`));
export const pedirPanelGestores = () => datos(api.get(`${B}gestores/panel/`));
export const crearGestor = (body) => datos(api.post(`${B}gestores/`, body));
export const editarGestor = (id, body) => datos(api.patch(`${B}gestores/${id}/`, body));
export const borrarGestor = (id) => datos(api.delete(`${B}gestores/${id}/`));
export const cobrarGestor = (id, formaPago = "TRANSFERENCIA") =>
  datos(api.post(`${B}gestores/${id}/cobrar/`, { forma_pago: formaPago }));

// 🔒 Comisiones: solo el admin (29/09). El gestor ya no manda "Ya pagué": los avisos
//    viejos se ven y se descartan en Gestoría → Gestores.
export const pedirComisiones = (dias = 90) => datos(api.get(`${B}comisiones/`, { params: { dias } }));
export const descartarAviso = (id) => datos(api.post(`${B}avisos/${id}/descartar/`, {}));

/** El mensaje que mandó el servidor (o uno por defecto). */
export function mensajeError(e, porDefecto = "No se pudo guardar. Probá de nuevo.") {
  const d = e?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  if (Array.isArray(d?.detail) && d.detail.length) return String(d.detail[0]);
  if (!e?.response) return "No hay conexión con el servidor. Probá de nuevo.";
  return porDefecto;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Sube una foto o PDF a Cloudinary y devuelve lo que hay que mandarle al
 * servidor: { url, public_id, nombre, mime, tamano }.
 * Las fotos del celu se achican antes (sin eso, una foto tarda 30 s en subir).
 */
export async function subirArchivo(file, carpeta = "gestoria") {
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
 * 👤 Foto (o logo) del perfil de un gestor. Se achica a 512 px (queda en
 * ~50 KB, carga al toque en el tablero). Devuelve { url, public_id }.
 * Ej: const { url, public_id } = await subirFotoPerfil(file);
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
  const up = await uploadToCloudinary(final, { folder: "gestoria/gestores" });
  return { url: up.secure_url, public_id: up.public_id || "" };
}
