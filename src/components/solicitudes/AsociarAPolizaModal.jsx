// src/components/solicitudes/AsociarAPolizaModal.jsx
import { useEffect, useMemo, useState } from "react";
import {
  HiX,
  HiLink,
  HiSearch,
  HiCloudUpload,
  HiDocumentText,
  HiExclamationCircle,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { PolizasAPI } from "../../api/polizas";
import { solicitudesApi } from "../../api/solicitudes";

// Definimos variants inline para animaciones profesionales
const modalVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.25 } },
};

const sectionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const cardVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

/* ========= Helpers ========= */
// Política vigente: SOLO Cédula (verde/azul) y Título
const DOC_TYPES = [
  { key: "CEDULA_VERDE", label: "Cédula verde" },
  { key: "CEDULA_AZUL", label: "Cédula azul (si aplica)" },
  { key: "TITULO", label: "Título" },
];

const CLIENTE_FLAGS = [
  { key: "DNI_FRENTE", label: "DNI (frente)" },
  { key: "DNI_DORSO", label: "DNI (dorso)" },
  { key: "PASAPORTE_FRENTE", label: "Pasaporte (frente)" },
  { key: "PASAPORTE_DORSO", label: "Pasaporte (dorso)" },
];

const VALID_SELECT_KEYS = new Set([...DOC_TYPES, ...CLIENTE_FLAGS].map((x) => x.key));
const ONLY_POLIZA_DOC_KEYS = new Set(DOC_TYPES.map((d) => d.key));

function normalizeKey(k) {
  return String(k || "").toUpperCase();
}
function isPdf(url = "", mime = "") {
  return (mime || "").includes("pdf") || /\.pdf(\?|$)/i.test(url);
}
function toISODate(d) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
function labelFor(key) {
  const K = normalizeKey(key);
  const all = [...DOC_TYPES, ...CLIENTE_FLAGS];
  return all.find((x) => x.key === K)?.label || K || "—";
}
function toHttps(u) {
  if (!u || typeof u !== "string") return u;
  try {
    const url = new URL(u);
    if (url.protocol === "http:") {
      url.protocol = "https:";
      return url.toString();
    }
    return u;
  } catch {
    return u;
  }
}
// Backend: ya no se usa REGISTRO → devolvemos el tipo normalizado
function mapTipoToBackend(t) {
  return normalizeKey(t);
}

/* ========= Componente ========= */
export default function AsociarAPolizaModal({ solicitud, onClose, onDone }) {
  const solicitudId = solicitud?.id;
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [netErr, setNetErr] = useState("");

  // edición por doc
  const [edits, setEdits] = useState({});

  // destino
  const [polizaId, setPolizaId] = useState(solicitud?.poliza || solicitud?.poliza_id || "");

  // toggles de asociación
  const [setPerfil, setSetPerfil] = useState(true);
  const [overwritePerfil, setOverwritePerfil] = useState(false);
  const [modoMover, setModoMover] = useState(false);

  // buscador pólizas
  const [qPoliza, setQPoliza] = useState("");
  const [polizasRes, setPolizasRes] = useState([]);

  /* Carga inicial de documentos de la solicitud */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!solicitudId) return;
      setLoading(true);
      setNetErr("");
      try {
        const arr = await solicitudesApi
          .listarDocs(solicitudId)
          .then((r) => (Array.isArray(r) ? r : r?.results || r?.data || []));
        const norm = (arr || []).map((d) => ({
          ...d,
          url: toHttps(d.secure_url || d.url),
          vencimiento: toISODate(d.vencimiento), // se conserva si existe, pero no se exige ni se edita aquí
        }));
        if (!alive) return;
        setDocs(norm);

        const init = {};
        for (const d of norm) {
          init[d.id] = {
            tipo: normalizeKey(d.tipo || ""),
            // ya no editamos vencimiento
            nombre: d.nombre || "",
            notas: d.notas || "",
            mime: d.mime || "",
          };
        }
        setEdits(init);
      } catch (e) {
        if (!alive) return;
        setNetErr("No se pudieron cargar los documentos.");
        toast.error(e?.message || "No se pudieron cargar los documentos.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [solicitudId]);

  const byTipo = useMemo(() => {
    const map = {};
    for (const d of docs) {
      const t = normalizeKey(edits[d.id]?.tipo || d.tipo || "");
      if (!map[t]) map[t] = [];
      map[t].push(d);
    }
    return map;
  }, [docs, edits]);

  const buscarPolizas = async () => {
    try {
      const list = await PolizasAPI.list({ search: qPoliza, page_size: 10 });
      const arr = Array.isArray(list) ? list : list?.results || list?.data || [];
      setPolizasRes(arr);
    } catch (e) {
      toast.error(e.message || "No se pudieron buscar pólizas");
    }
  };

  const setDocField = (id, patch) =>
    setEdits((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        ...patch,
        ...(patch.tipo ? { tipo: normalizeKey(patch.tipo) } : {}),
      },
    }));

  // ===== Copiar/Mover DOCUMENTOS de SOLICITUD -> PÓLIZA (post-asociación) =====
  async function copiarDocumentosAPoliza(finalPolizaId) {
    // 1) Seleccionar sólo los que son de póliza y tienen tipo válido
    const seleccionados = docs
      .map((d) => {
        const e = edits[d.id] || {};
        const selTipo = normalizeKey(e.tipo || d.tipo || "");
        if (!selTipo || !VALID_SELECT_KEYS.has(selTipo)) return null; // ignora fotos/flags no seleccionados
        if (!ONLY_POLIZA_DOC_KEYS.has(selTipo)) return null; // ignora flags de cliente
        return { src: d, edit: e, tipo: selTipo };
      })
      .filter(Boolean);

    if (!seleccionados.length) return { creados: 0, movidos: 0, saltados: 0 };

    // 2) Obtener existentes de la póliza para deduplicar (por tipo + url)
    const docsRaw = await PolizasAPI.getDocumentos(finalPolizaId);
    const existentesArr = Array.isArray(docsRaw) ? docsRaw : docsRaw?.results || docsRaw || [];
    const ya = new Set(
      existentesArr.map((x) => `${normalizeKey(x.tipo || "")}|${toHttps(x.url || x.secure_url || "")}`)
    );

    // 3) Crear los que no existan, y si modo "mover", eliminar el original
    let creados = 0;
    let movidos = 0;
    let saltados = 0;

    for (const { src, edit, tipo } of seleccionados) {
      const url = toHttps(src.secure_url || src.url || "");
      const tipoBackend = mapTipoToBackend(tipo);
      const key = `${tipoBackend}|${url}`;
      const payload = {
        poliza: Number(finalPolizaId),
        tipo: tipoBackend,
        url,
        public_id: src.public_id || src.publicId || "",
        nombre: (edit.nombre ?? src.nombre ?? "").trim() || labelFor(tipo),
        notas: (edit.notas ?? src.notas ?? "").trim() || "",
        mime: edit.mime || src.mime || "",
        // vencimiento: no requerido → lo dejamos en null
        vencimiento: null,
      };

      if (ya.has(key)) {
        saltados++;
      } else {
        try {
          await PolizasAPI.crearDocumento(payload);
          creados++;
          ya.add(key);
        } catch (e) {
          toast.error(e?.message || `No se pudo crear ${labelFor(tipo)} en la póliza`);
          continue;
        }
      }

      if (modoMover) {
        try {
          await solicitudesApi.eliminarDoc(src.id);
          movidos++;
        } catch {
          /* no frenamos el flujo */
        }
      }
    }

    return { creados, movidos, saltados };
  }

  /* Guardar etiquetas y asociar + copiar documentos a póliza */
  const guardarYAsociar = async () => {
    if (!polizaId) {
      toast.error("Indicá la póliza destino");
      return;
    }

    // 1) PATCH metadatos si hubo cambios (sin tocar vencimiento)
    try {
      const ops = docs.map(async (d) => {
        const cur = {
          tipo: normalizeKey(d.tipo || ""),
          nombre: d.nombre || "",
          notas: d.notas || "",
        };
        const next = edits[d.id] || {};
        const changed =
          cur.tipo !== normalizeKey(next.tipo) ||
          (cur.nombre || "") !== (next.nombre || "") ||
          (cur.notas || "") !== (next.notas || "");
        if (!changed) return;

        const body = {
          ...(next.tipo ? { tipo: normalizeKey(next.tipo) } : {}),
          ...(typeof next.nombre === "string" ? { nombre: next.nombre } : {}),
          ...(typeof next.notas === "string" ? { notas: next.notas } : {}),
        };

        await solicitudesApi.actualizarDoc(d.id, body);
      });
      await Promise.all(ops);
    } catch (e) {
      toast.error(e.message || "Error al guardar etiquetas");
      return;
    }

    // 2) POST de asociación con opciones
    const tiposFinales = new Set(
      docs
        .map((d) => normalizeKey((edits[d.id]?.tipo ?? d.tipo) || ""))
        .filter((t) => t && VALID_SELECT_KEYS.has(t))
    );

    const clienteFlags = {
      dni_frente: tiposFinales.has("DNI_FRENTE"),
      dni_dorso: tiposFinales.has("DNI_DORSO"),
      pasaporte_frente: tiposFinales.has("PASAPORTE_FRENTE"),
      pasaporte_dorso: tiposFinales.has("PASAPORTE_DORSO"),
    };
    const copiarDocsCliente =
      clienteFlags.dni_frente ||
      clienteFlags.dni_dorso ||
      clienteFlags.pasaporte_frente ||
      clienteFlags.pasaporte_dorso;

    let finalPolizaId = Number(polizaId);

    try {
      const payload = {
        poliza_id: Number(polizaId),
        set_foto_perfil_frente: !!setPerfil,
        sobreescribir_foto_perfil: !!overwritePerfil,
        // Deshabilitamos el import automático: el front copia controladamente
        importar_documentos: false,
        copiar_docs_cliente: !!copiarDocsCliente,
        cliente: clienteFlags,
        modo: modoMover ? "mover" : "copiar",
      };

      setLoading(true);
      const { summary, poliza, documentos, fotos } = await solicitudesApi.asociarAPolizaYRefrescar(
        solicitudId,
        payload
      );

      // determina ID de póliza retornado por backend (por si difiere)
      finalPolizaId = Number(poliza?.id || summary?.poliza_id || finalPolizaId) || finalPolizaId;

      // 3) Copiar/Mover DOCUMENTOS de SOLICITUD -> PÓLIZA
      const { creados, movidos, saltados } = await copiarDocumentosAPoliza(finalPolizaId);

      // 4) Refrescar pack de póliza y avisar a la vista de detalle
      try {
        await PolizasAPI.refreshPack(finalPolizaId);
      } catch {
        /* no es crítico, igual disparamos evento */
      }

      // Eventos para que PolizaDetails.jsx refresque y abra "Documentos"
      window.dispatchEvent(
        new CustomEvent("poliza:media_importada", {
          detail: { poliza_id: finalPolizaId, focusTab: "documentos" },
        })
      );
      window.dispatchEvent(
        new CustomEvent("solicitud:asociada", {
          detail: { poliza_id: finalPolizaId, focusTab: "documentos" },
        })
      );

      // Toasters
      toast.success("Asociación realizada");
      if (creados) toast.success(`Copiados ${creados} documento(s) a la póliza`);
      if (saltados) toast(`Saltados ${saltados} (ya existían)`);
      if (modoMover && movidos) toast(`Movidos ${movidos} archivo(s) desde la solicitud`);

      onDone?.({ summary, poliza, documentos, fotos, creados, movidos, saltados });
    } catch (e) {
      toast.error(e.message || "Error al asociar");
    } finally {
      setLoading(false);
    }
  };

  /* Tarjetas */
  const docCards = docs.map((d) => {
    const e = edits[d.id] || {};
    const rawType = e.tipo || d.tipo || "";
    const rawTypeU = normalizeKey(rawType);
    const selectType = VALID_SELECT_KEYS.has(rawTypeU) ? rawTypeU : "";
    const pdf = isPdf(d.url, d.mime || e.mime);
    const eraFoto = rawTypeU && !VALID_SELECT_KEYS.has(rawTypeU);

    return (
      <motion.div
        key={d.id}
        className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm shadow-[0_12px_40px_-20px_rgba(0,0,0,0.6)]"
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        whileTap="tap"
      >
        <div className="aspect-[4/3] bg-white/5 flex items-center justify-center overflow-hidden">
          {pdf ? (
            <div className="flex flex-col items-center gap-2 text-white/80">
              <HiDocumentText className="text-4xl" />
              <span className="text-xs">PDF</span>
            </div>
          ) : (
            <img
              src={toHttps(d.url)}
              alt={d.nombre || d.tipo || "documento"}
              className="w-full h-full object-cover"
              onError={(ev) => {
                ev.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>

        <div className="p-3 space-y-2">
          <div>
            <label className="text-xs text-white/70">Etiqueta</label>
            <select
              value={selectType}
              onChange={(evt) => setDocField(d.id, { tipo: evt.target.value })}
              className="bd-select mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-white outline-none appearance-none"
              style={{ colorScheme: "dark" }}
            >
              <option value="">— Seleccionar —</option>
              <optgroup label="Documentos de la póliza">
                {DOC_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Documentos del cliente">
                {CLIENTE_FLAGS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            </select>
            {eraFoto && (
              <p className="mt-1 text-xs text-amber-200 flex items-center gap-1">
                <HiExclamationCircle /> Este archivo estaba etiquetado como foto (p. ej. PATENTE). Elegí un tipo de documento.
              </p>
            )}
          </div>

          <details className="mt-1 group">
            <summary className="cursor-pointer select-none text-xs text-white/70 hover:text-white/90">
              Opcional (nombre / notas)
            </summary>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="text-xs text-white/70">Nombre</label>
                <input
                  value={e.nombre ?? ""}
                  onChange={(evt) => setDocField(d.id, { nombre: evt.target.value })}
                  className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-white outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/70">Notas</label>
                <input
                  value={e.notas ?? ""}
                  onChange={(evt) => setDocField(d.id, { notas: evt.target.value })}
                  className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-white outline-none"
                />
              </div>
            </div>
          </details>
        </div>
      </motion.div>
    );
  });

  const tiposResumen = useMemo(() => {
    const arr = [];
    for (const [k, v] of Object.entries(byTipo)) {
      if (!k || !VALID_SELECT_KEYS.has(k)) continue;
      arr.push(`${labelFor(k)} (${v.length})`);
    }
    return arr.join(" · ") || "—";
  }, [byTipo]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Overlay */}
        <motion.div
          className="absolute inset-0 bg-black/70"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* === Estilos SCOPED para selects oscuros === */}
        <style>{`
          .bd-select,
          .bd-select:focus {
            background-color: rgba(255,255,255,0.08) !important;
            color: #fff !important;
            border-color: rgba(255,255,255,0.15) !important;
          }
          .bd-select option,
          .bd-select optgroup {
            background-color: #0f0c28;
            color: #fff;
          }
          .bd-select optgroup[label] { font-weight: 600; }
        `}</style>

        {/* Contenedor principal */}
        <motion.div
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative w-full max-w-md sm:max-w-6xl h-[90vh] sm:h-auto mx-auto rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(14,11,43,0.98) 0%, rgba(10,9,32,0.98) 100%)",
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Asociar documentos a póliza"
        >
          {/* Header */}
          <div
            className="sticky top-0 z-10 flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-white/10 bg-[#0f0c28]/90 backdrop-blur"
          >
            <h3 className="text-white font-semibold flex items-center gap-2 text-base sm:text-lg">
              <HiLink className="opacity-80" />
              Asociar a póliza
            </h3>
            <motion.button
              onClick={onClose}
              className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Cerrar"
              title="Cerrar"
              variants={buttonVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
            >
              <HiX className="text-lg" />
            </motion.button>
          </div>

          {/* Contenido */}
          <div className="px-3 sm:px-4 pb-28 pt-3 overflow-y-auto h-[calc(90vh-56px)] sm:max-h-[78vh] sm:pb-3">
            {/* Póliza destino */}
            <motion.fieldset
              className="rounded-2xl border border-white/10 p-3 bg-white/5"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
            >
              <legend className="px-1 text-white/80 text-xs sm:text-sm">
                Póliza destino <span className="text-red-300">*</span>
              </legend>

              <label className="text-xs text-white/70">ID póliza</label>
              <input
                value={polizaId}
                onChange={(e) => setPolizaId(e.target.value.replace(/\D/g, ""))}
                placeholder="Ej: 101"
                className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 outline-none text-white"
              />

              <div className="mt-3 flex items-center gap-2">
                <input
                  value={qPoliza}
                  onChange={(e) => setQPoliza(e.target.value)}
                  placeholder="Buscar por patente, cliente o nro. póliza"
                  className="flex-1 rounded-xl bg-white/10 border border-white/10 px-3 py-2 outline-none text-white"
                />
                <motion.button
                  onClick={buscarPolizas}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-black font-semibold hover:brightness-95"
                  variants={buttonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <HiSearch /> Buscar
                </motion.button>
              </div>

              {polizasRes.length > 0 && (
                <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-white/10 bg-white/5">
                  {polizasRes.map((p) => (
                    <motion.button
                      type="button"
                      key={p.id}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 ${
                        String(polizaId) === String(p.id) ? "bg-white/10" : ""
                      }`}
                      onClick={() => setPolizaId(String(p.id))}
                      title={`Elegir póliza #${p.id}`}
                      variants={buttonVariants}
                      initial="initial"
                      whileHover="hover"
                      whileTap="tap"
                    >
                      #{p.id} • {p?.cliente?.apellido} {p?.cliente?.nombre} · {p?.patente || "—"}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.fieldset>

            {/* Opciones de asociación */}
            <motion.div
              className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
            >
              <label className="flex items-center gap-2 text-xs sm:text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={setPerfil}
                  onChange={(e) => setSetPerfil(e.target.checked)}
                  className="w-4 h-4 accent-current"
                />
                Usar foto FRENTE como foto de perfil
              </label>
              <label className="flex items-center gap-2 text-xs sm:text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={overwritePerfil}
                  onChange={(e) => setOverwritePerfil(e.target.checked)}
                  className="w-4 h-4 accent-current"
                />
                Sobrescribir foto de perfil si ya existe
              </label>
              <label className="flex items-center gap-2 text-xs sm:text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={modoMover}
                  onChange={(e) => setModoMover(e.target.checked)}
                  className="w-4 h-4 accent-current"
                />
                Mover (no copiar) archivos usados
              </label>
            </motion.div>

            {/* Grilla */}
            <motion.div className="mt-4" variants={sectionVariants} initial="initial" animate="animate">
              <div className="flex items-baseline justify-between">
                <h4 className="text-white/90 font-semibold text-sm sm:text-base">Documentos detectados</h4>
                <div className="text-xs text-white/60">
                  {loading ? "Cargando…" : netErr ? "Error de red" : tiposResumen}
                </div>
              </div>

              <div className="mt-1 text-xs text-white/65">
                Tip: Para <b>Cédula verde</b>, podés subir frente y dorso como piezas separadas usando la misma etiqueta.
              </div>

              <div className="mt-2 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {docCards}
              </div>

              {docs.length === 0 && !loading && !netErr && (
                <div className="mt-6 text-sm text-white/70 text-center">
                  — No hay documentos en esta solicitud —
                </div>
              )}
              {netErr && (
                <div className="mt-6 text-sm text-rose-200/90 text-center">{netErr}</div>
              )}
            </motion.div>
          </div>

          {/* Bottom actions */}
          <div
            className="sticky bottom-0 z-10 flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-3 border-t border-white/10 bg-[#0f0c28]/90 backdrop-blur"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="text-xs text-white/70 flex items-center gap-2">
              <HiCloudUpload className="opacity-80" />
              <span>
                POST <b>/api/solicitudes/{solicitudId}/asociar_a_poliza/</b>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-white/10 text-sm text-white transition hover:bg-white/20"
                variants={buttonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
              >
                Cancelar
              </motion.button>
              <motion.button
                onClick={guardarYAsociar}
                disabled={!polizaId || loading}
                className="px-4 py-2 rounded-xl bg-primary-400 text-white font-semibold hover:brightness-95 disabled:opacity-60"
                variants={buttonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
              >
                Guardar y asociar
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}