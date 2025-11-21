// src/components/polizas/VehiculoDocsPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiPhotograph,
  HiDocumentText,
  HiExternalLink,
  HiRefresh,
  HiTrash,
  HiPlus,
  HiUpload,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { PolizasAPI } from "../../api/polizas";
import { uploadToCloudinary } from "../../utils/cloudinary";

/**
 * Props:
 *  - polizaId (number | string) [requerido]
 *
 * Flujo:
 *  - Lee pack con PolizasAPI.refreshPack() (o fallbacks)
 *  - Normaliza claves/labels
 *  - CRUD de fotos: subir por slot o libre ("OTRA"), eliminar por id
 */

const FOTO_ORDER = [
  "FRENTE",
  "LATERAL_IZQ",
  "LATERAL_DER",
  "TRASERA",
  "INTERIOR",
  "RUEDA_AUXILIO",
  "OBLEA_GNC",
  "TUBO_GNC", // 🔹 GNC canónico
  "PATENTE",
];

const LABELS = {
  FRENTE: "Frente",
  LATERAL_IZQ: "Lateral izq.",
  LATERAL_DER: "Lateral der.",
  TRASERA: "Trasera",
  INTERIOR: "Interior",
  RUEDA_AUXILIO: "Rueda de auxilio",
  OBLEA_GNC: "Oblea GNC",
  TUBO_GNC: "Equipo/Tubo GNC",      // 🔹 clave nueva
  EQUIPO_GNC: "Equipo/Tubo GNC",    // compat viejo
  PATENTE: "Patente",
  CEDULA_VERDE: "Cédula verde",
  CEDULA_VERDE_FRENTE: "Cédula verde (frente)",
  CEDULA_VERDE_DORSO: "Cédula verde (dorso)",
  CEDULA_AZUL: "Cédula azul",
  CEDULA_AZUL_FRENTE: "Cédula azul (frente)",
  CEDULA_AZUL_DORSO: "Cédula azul (dorso)",
  LICENCIA: "Licencia",
  TITULO: "Título",
  VTV: "VTV",
  PERMISO: "Permiso",
  OTRA: "Otra",
};

const stripAccents = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const KEY_SYNONYMS = {
  // Fotos vehículo
  RUEDA: "RUEDA_AUXILIO",
  RUEDA_DE_AUXILIO: "RUEDA_AUXILIO",
  RUEDA_AUX: "RUEDA_AUXILIO",
  RUEDA_AUXILIAR: "RUEDA_AUXILIO",
  LATERAL_IZQUIERDO: "LATERAL_IZQ",
  IZQUIERDO: "LATERAL_IZQ",
  LAT_IZQ: "LATERAL_IZQ",
  LATERAL_DERECHO: "LATERAL_DER",
  DERECHO: "LATERAL_DER",
  LAT_DER: "LATERAL_DER",
  DOMINIO: "PATENTE",
  PLACA: "PATENTE",
  CHAPA: "PATENTE",
  MATRICULA: "PATENTE",
  MATRÍCULA: "PATENTE",

  // Docs
  REGISTRO: "LICENCIA",
  REGISTRO_CONDUCIR: "LICENCIA",
  LICENCIA_CONDUCIR: "LICENCIA",
  RTO: "VTV",
  REVISION_TECNICA: "VTV",
  REVISION_TÉCNICA: "VTV",
  VERIFICACION_TECNICA: "VTV",
  VERIFICACIÓN_TÉCNICA: "VTV",
  OBL_GNC: "OBLEA_GNC",

  // 🔹 GNC: todo converge a TUBO_GNC (coincide con backend)
  EQUIPO: "TUBO_GNC",
  EQUIPO_GNC: "TUBO_GNC",
  TUBO_GNC: "TUBO_GNC",
  CILINDRO_GNC: "TUBO_GNC",

  CEDULA: "CEDULA_VERDE",
  CÉDULA: "CEDULA_VERDE",
  CEDULA_FRENTE: "CEDULA_VERDE_FRENTE",
  CÉDULA_FRENTE: "CEDULA_VERDE_FRENTE",
  CEDULA_DORSO: "CEDULA_VERDE_DORSO",
  CÉDULA_DORSO: "CEDULA_VERDE_DORSO",
};

const DOCUMENT_KEYS = new Set([
  "CEDULA_VERDE",
  "CEDULA_VERDE_FRENTE",
  "CEDULA_VERDE_DORSO",
  "CEDULA_AZUL",
  "CEDULA_AZUL_FRENTE",
  "CEDULA_AZUL_DORSO",
  "LICENCIA",
  "TITULO",
  "VTV",
  "PERMISO",
]);

// 🔹 Algunos tipos deben tratarse siempre como FOTO, aunque vengan como documento
const FORCE_AS_PHOTO_KEYS = new Set(["TUBO_GNC", "RUEDA_AUXILIO"]);

const canonicalKey = (k = "") => {
  let x = stripAccents(k.toUpperCase())
    .replace(/\s+/g, "_")
    .replace(/__+/g, "_")
    .replace(/\bDE_/g, "_");
  return KEY_SYNONYMS[x] || x;
};

const toLabel = (k = "") =>
  LABELS[k] ||
  k
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const isImage = (mime = "", url = "") => {
  const m = String(mime || "").toLowerCase();
  if (m.startsWith("image/")) return true;
  const u = String(url || "").toLowerCase();
  return /\.(jpg|jpeg|png|webp|gif|bmp|heic|avif)$/.test(u);
};

const isPdf = (mime = "", url = "") => {
  const m = String(mime || "").toLowerCase();
  if (m === "application/pdf") return true;
  const u = String(url || "").toLowerCase();
  return /\.pdf(\?.*)?$/.test(u);
};

/* ===== Normalizadores ===== */
const toKey = (item = {}) => {
  const raw = String(
    item.key ??
      item.tipo ??
      item.nombre ??
      item.clave ??
      item.lado ??
      item.etiqueta ??
      item.label ??
      item.categoria ??
      ""
  ).trim();
  if (!raw) return "";
  return canonicalKey(raw);
};

function normalizeFotos(arr = []) {
  const out = [];
  for (const it of arr) {
    const keyRaw = toKey(it) || "OTRA";
    const key = canonicalKey(keyRaw);
    if (DOCUMENT_KEYS.has(key)) continue; // no mezclar docs en galería
    const url = it?.url || it?.secure_url || "";
    if (!url) continue;
    out.push({
      id: it?.id,
      key,
      label: toLabel(key),
      url,
      public_id: it?.public_id || "",
    });
  }
  const priority = new Map(FOTO_ORDER.map((k, i) => [k, i]));
  out.sort((a, b) => {
    const ai = priority.has(a.key) ? priority.get(a.key) : 999;
    const bi = priority.has(b.key) ? priority.get(b.key) : 999;
    return ai - bi || a.label.localeCompare(b.label);
  });
  const seen = new Set();
  return out.filter((x) => {
    const k = `${x.key}|${x.url}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function normalizeDocs(arr = []) {
  const out = [];
  for (const it of arr) {
    const keyRaw = toKey(it) || "DOCUMENTO";
    const key = canonicalKey(keyRaw);
    const url = it?.url || it?.secure_url || "";
    if (!url) continue;
    const mime = it?.mime || it?.content_type || "";
    out.push({
      id: it?.id,
      key,
      label: toLabel(key),
      url,
      public_id: it?.public_id || "",
      mime,
    });
  }
  const seen = new Set();
  return out.filter((x) => {
    const k = `${x.key}|${x.url}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Une y separa evitando duplicados; preferimos FOTO si su clave está en FOTO_ORDER o si es imagen. */
function consolidate(rawFotos = [], rawDocs = []) {
  const preferFoto = new Set(FOTO_ORDER);

  const fN = normalizeFotos(rawFotos);
  const dN = normalizeDocs(rawDocs);

  // 🔹 Forzar que ciertas claves se traten siempre como FOTOS (aunque vengan en documentos)
  const extraFotos = [];
  const dFiltered = [];
  for (const d of dN) {
    if (FORCE_AS_PHOTO_KEYS.has(d.key)) {
      extraFotos.push({
        id: d.id,
        key: d.key,
        label: d.label,
        url: d.url,
        public_id: d.public_id || "",
      });
    } else {
      dFiltered.push(d);
    }
  }

  const allFotos = [...fN, ...extraFotos];

  const fByUrl = new Map(allFotos.map((x) => [x.url, x]));
  const dByUrl = new Map(dFiltered.map((x) => [x.url, x]));

  const fotos = [];
  const documentos = [];

  for (const f of allFotos) {
    const d = dByUrl.get(f.url);
    if (!d) {
      fotos.push(f);
      continue;
    }
    if (preferFoto.has(f.key) || isImage(d.mime, d.url)) fotos.push(f);
    else documentos.push(d);
    dByUrl.delete(f.url);
  }
  for (const d of dByUrl.values()) documentos.push(d);

  // dedup final
  const seenF = new Set();
  const fotosFinal = fotos.filter((x) => {
    const k = `${x.key}|${x.url}`;
    if (seenF.has(k)) return false;
    seenF.add(k);
    return true;
  });
  const seenD = new Set();
  const documentosFinal = documentos.filter((x) => {
    const k = `${x.key}|${x.url}`;
    if (seenD.has(k)) return false;
    seenD.add(k);
    return true;
  });

  return { fotos: fotosFinal, documentos: documentosFinal };
}

export default function VehiculoDocsPanel({ polizaId }) {
  const [loading, setLoading] = useState(false);
  const [poliza, setPoliza] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [documentos, setDocumentos] = useState([]);

  // CRUD: subir por slot / libre
  const fileInputRef = useRef(null);
  const pendingSlotRef = useRef(null); // "FRENTE", "LATERAL_IZQ", "OTRA", etc.
  const [uploading, setUploading] = useState(false);
  const OTHER_KEY = "OTRA";

  const title = useMemo(() => {
    if (!poliza) return `Póliza #${polizaId}`;
    const cli = poliza?.cliente;
    const nombre = `${cli?.apellido || ""} ${cli?.nombre || ""}`.trim();
    const patente = poliza?.patente || "";
    const num = poliza?.numero_poliza || "";
    return [nombre || null, patente || null, num ? `#${num}` : null]
      .filter(Boolean)
      .join(" · ");
  }, [poliza, polizaId]);

  async function fetchVehiculoDocs() {
    if (!polizaId) return;
    setLoading(true);
    try {
      try {
        const { poliza, documentos, fotos } = await PolizasAPI.refreshPack(polizaId);
        const { fotos: f, documentos: d } = consolidate(fotos || [], documentos || []);
        setPoliza(poliza || null);
        setFotos(f);
        setDocumentos(d);
        setLoading(false);
        return;
      } catch {
        /* sigue con fallbacks */
      }

      const [p, docsRaw, fotosRaw] = await Promise.all([
        PolizasAPI.getById(polizaId).catch(() => null),
        PolizasAPI.getDocumentos(polizaId).catch(() => ({ results: [] })),
        PolizasAPI.getFotosVehiculo({ poliza: polizaId }).catch(() => ({ results: [] })),
      ]);

      const docsArr = Array.isArray(docsRaw) ? docsRaw : docsRaw?.results || [];
      const fotosArr = Array.isArray(fotosRaw) ? fotosRaw : fotosRaw?.results || [];

      const { fotos: f, documentos: d } = consolidate(fotosArr, docsArr);
      setPoliza(p || null);
      setFotos(f);
      setDocumentos(d);
    } catch (err) {
      console.error("[VehiculoDocsPanel] Error cargando datos:", err);
      toast.error("No se pudieron cargar las imágenes/documentos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVehiculoDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polizaId]);

  const docsAgrupados = useMemo(() => {
    const imgDocs = [];
    const pdfDocs = [];
    const otros = [];
    for (const d of documentos) {
      if (isPdf(d.mime, d.url)) pdfDocs.push(d);
      else if (isImage(d.mime, d.url)) imgDocs.push(d);
      else otros.push(d);
    }
    return { imgDocs, pdfDocs, otros };
  }, [documentos]);

  /* ================== CRUD — Subir ================== */
  const chooseFilesForSlot = (slotKey = OTHER_KEY) => {
    pendingSlotRef.current = slotKey || OTHER_KEY;
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const onFilesChosen = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // reset input para permitir resubir el mismo archivo
    if (!files.length) return;

    const slot = pendingSlotRef.current || OTHER_KEY;
    setUploading(true);
    try {
      for (const file of files) {
        const up = await uploadToCloudinary(file);
        const url = up?.secure_url || up?.url;
        const public_id = up?.public_id || "";
        if (!url) {
          toast.error("No se obtuvo URL del archivo subido.");
          continue;
        }
        const payload = {
          poliza: Number(polizaId),
          url,
          public_id,
          // mandamos varias variantes por compatibilidad del backend
          key: slot,
          tipo: slot,
          lado: slot,
          etiqueta: LABELS[slot] || slot,
        };
        await PolizasAPI.crearFotoVehiculo(payload);
      }
      toast.success(files.length > 1 ? "Fotos subidas" : "Foto subida");
      await fetchVehiculoDocs();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo subir la foto.");
    } finally {
      setUploading(false);
    }
  };

  /* ================== CRUD — Eliminar ================== */
  const removePhoto = async (item) => {
    if (!item?.id) {
      toast("No puedo eliminar: falta 'id' en la foto.", { icon: "⚠️" });
      return;
    }
    if (!confirm("¿Eliminar esta foto?")) return;
    try {
      await PolizasAPI.borrarFotoVehiculo(item.id);
      setFotos((prev) => prev.filter((x) => x.id !== item.id));
      toast.success("Foto eliminada");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo eliminar la foto.");
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[.05] p-3 text-white">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-white/70">Vehículo & Documentos</div>
          <div className="truncate font-semibold">{title}</div>
          {poliza?.cobertura ? (
            <div className="mt-0.5 text-xs text-white/60">
              Cobertura: <b>{String(poliza.cobertura).replace(/_/g, " ")}</b>
              {poliza?.patente ? (
                <>
                  {" "}
                  · Patente: <b>{poliza.patente}</b>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => chooseFilesForSlot(OTHER_KEY)}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-400/20 px-3 py-2 text-sm hover:bg-emerald-400/30 disabled:opacity-50"
            title="Agregar foto (libre)"
          >
            <HiUpload /> {uploading ? "Subiendo…" : "Agregar foto"}
          </button>
          <button
            onClick={() => fetchVehiculoDocs()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm hover:bg-white/20 disabled:opacity-50"
            title="Refrescar"
          >
            <HiRefresh className={loading ? "animate-spin" : ""} />
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {/* input oculto para uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onFilesChosen}
        className="hidden"
      />

      <div className="grid lg:grid-cols-2 gap-3">
        {/* Galería */}
        <section className="rounded-xl border border-white/10 bg-white/[.04] p-3">
          <header className="mb-2 flex items-center gap-2 text-white/85">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <HiPhotograph className="text-lg" />
            </span>
            <h3 className="font-medium">Galería del vehículo</h3>
          </header>

          <AnimatePresence initial={false}>
            {loading ? (
              <motion.div
                key="gal-skel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 md:grid-cols-3 gap-2"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-video rounded-lg bg-white/10 animate-pulse" />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="gal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 md:grid-cols-3 gap-2"
              >
                {FOTO_ORDER.map((slot) => {
                  const item = fotos.find((f) => f.key === slot);
                  if (!item)
                    return (
                      <button
                        key={slot}
                        onClick={() => chooseFilesForSlot(slot)}
                        className="group aspect-video rounded-lg border border-dashed border-white/15 bg-white/[.03] flex flex-col items-center justify-center text-xs text-white/40 hover:border-white/30 hover:text-white/70"
                        title={`Subir ${toLabel(slot)}`}
                      >
                        <HiPlus className="mb-1" />
                        {toLabel(slot)}
                      </button>
                    );
                  return (
                    <figure
                      key={item.url}
                      className="relative rounded-lg overflow-hidden border border-white/10 bg-black/20"
                    >
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={item.url}
                          alt={item.label}
                          className="aspect-video w-full object-cover"
                          loading="lazy"
                        />
                      </a>
                      {/* Overlay de acciones */}
                      <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/50 via-black/0 to-black/0 opacity-0 hover:opacity-100 transition">
                        <figcaption className="px-2 py-1 text-xs">
                          <span
                            className="inline-block max-w-[10rem] truncate"
                            title={item.label}
                          >
                            {item.label}
                          </span>
                        </figcaption>
                        <div className="p-1 flex items-center gap-1">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] bg-white/10 hover:bg-white/20"
                            title="Ver"
                          >
                            <HiExternalLink /> Ver
                          </a>
                          <button
                            onClick={() => removePhoto(item)}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] bg-rose-500/20 hover:bg-rose-500/30"
                            title="Eliminar"
                          >
                            <HiTrash /> Eliminar
                          </button>
                        </div>
                      </div>
                    </figure>
                  );
                })}
                {/* Resto de fotos sin slot prioritario */}
                {fotos
                  .filter((f) => !FOTO_ORDER.includes(f.key))
                  .map((item) => (
                    <figure
                      key={item.url}
                      className="relative rounded-lg overflow-hidden border border-white/10 bg-black/20"
                    >
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={item.url}
                          alt={item.label}
                          className="aspect-video w-full object-cover"
                          loading="lazy"
                        />
                      </a>
                      <div className="absolute inset-0 flex items=end justify-between bg-gradient-to-t from-black/50 via-black/0 to-black/0 opacity-0 hover:opacity-100 transition">
                        <figcaption className="px-2 py-1 text-xs">
                          <span
                            className="inline-block max-w-[10rem] truncate"
                            title={item.label}
                          >
                            {item.label}
                          </span>
                        </figcaption>
                        <div className="p-1 flex items-center gap-1">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] bg-white/10 hover:bg-white/20"
                            title="Ver"
                          >
                            <HiExternalLink /> Ver
                          </a>
                          <button
                            onClick={() => removePhoto(item)}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] bg-rose-500/20 hover:bg-rose-500/30"
                            title="Eliminar"
                          >
                            <HiTrash /> Eliminar
                          </button>
                        </div>
                      </div>
                    </figure>
                  ))}

                {/* Tile para subir libre */}
                <button
                  onClick={() => chooseFilesForSlot(OTHER_KEY)}
                  className="aspect-video rounded-lg border border-dashed border-white/15 bg-white/[.03] flex flex-col items-center justify-center text-xs text-white/40 hover:border-white/30 hover:text-white/70"
                  title="Agregar foto (libre)"
                >
                  <HiPlus className="mb-1" />
                  {LABELS[OTHER_KEY]}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Documentos */}
        <section className="rounded-xl border border-white/10 bg-white/[.04] p-3">
          <header className="mb-2 flex items-center gap-2 text-white/85">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <HiDocumentText className="text-lg" />
            </span>
            <h3 className="font-medium">Documentos</h3>
          </header>

          <AnimatePresence initial={false}>
            {loading ? (
              <motion.ul
                key="docs-skel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-white/10 bg-white/10 h-16 animate-pulse"
                  />
                ))}
              </motion.ul>
            ) : documentos.length ? (
              <motion.div
                key="docs-ok"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {/* Imagenes como miniaturas */}
                {docsAgrupados.imgDocs.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs text.white/60">Imágenes</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {docsAgrupados.imgDocs.map((d) => (
                        <figure
                          key={d.url}
                          className="rounded-lg overflow-hidden border border-white/10 bg-black/20"
                        >
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={d.url}
                              alt={d.label}
                              className="aspect-video w-full object-cover transition hover:opacity-95"
                              loading="lazy"
                            />
                          </a>
                          <figcaption className="flex items-center justify-between px-2 py-1 text-xs">
                            <span className="truncate" title={d.label}>
                              {d.label}
                            </span>
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] bg-white/10 hover:bg-white/20"
                              title="Abrir"
                            >
                              <HiExternalLink /> Ver
                            </a>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}

                {/* PDFs */}
                {docsAgrupados.pdfDocs.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs text-white/60">PDF</div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {docsAgrupados.pdfDocs.map((d) => (
                        <li
                          key={d.url}
                          className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                        >
                          <span className="truncate" title={d.label}>
                            {d.label}
                          </span>
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs bg-white/10 hover:bg.white/20"
                            title="Abrir"
                          >
                            <HiExternalLink /> Abrir
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Otros tipos */}
                {docsAgrupados.otros.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs text-white/60">Otros</div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {docsAgrupados.otros.map((d) => (
                        <li
                          key={d.url}
                          className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                        >
                          <span className="truncate" title={d.label}>
                            {d.label}
                          </span>
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs bg-white/10 hover:bg-white/20"
                            title="Abrir"
                          >
                            <HiExternalLink /> Abrir
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="docs-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-white/60"
              >
                No hay documentos cargados para esta póliza.
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
