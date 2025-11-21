import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { HiX, HiClipboardCopy, HiExternalLink, HiCheck } from "react-icons/hi";
import toast from "react-hot-toast";
import { solicitudesApi } from "../../services/solicitudes";

/* ---------- helpers ---------- */
function isImage(doc) {
  return String(doc?.mime || "").startsWith("image");
}
function format(k, v) {
  return `${k}: ${v ?? "—"}`;
}
const estadoLabel = (estado) => {
  switch (estado) {
    case "VIGENTE_24H":
      return "VIGENTE 24 h";
    case "EN_REVISION":
      return "EN REVISIÓN";
    case "BORRADOR":
      return "BORRADOR";
    case "VENCIDA":
      return "VENCIDA";
    case "CANCELADA":
      return "CANCELADA";
    case "CONVERTIDA":
      return "CONVERTIDA";
    default:
      return estado || "—";
  }
};
function buildResumen(s) {
  const datos = [
    format("Cliente", s?.cliente_nombre),
    format("DNI", s?.cliente_dni),
    format("Teléfono", s?.telefono),
    format(
      "Vehículo",
      `${s?.vehiculo_marca || "—"} ${s?.vehiculo_modelo || ""}`.trim()
    ),
    format("Año", s?.vehiculo_anio),
    format("Patente", s?.vehiculo_patente),
    format("Cobertura", s?.cobertura_solicitada),
    format("Compañía pref.", s?.compania_preferida),
    format("Observaciones", s?.observaciones || "—"),
    format("Código", s?.codigo || s?.id),
    format("Estado", estadoLabel(s?.estado)),
  ];
  return datos.join("\n");
}
/** Separa nombre completo en {nombre, apellido}. */
function splitNombreApellido(fullName) {
  const clean = String(fullName || "").trim().replace(/\s+/g, " ");
  if (!clean) return { nombre: "", apellido: "" };
  const parts = clean.split(" ");
  if (parts.length === 1) return { nombre: parts[0], apellido: "" };
  const apellido = parts.pop();
  return { nombre: parts.join(" "), apellido };
}

/* ================== COMPONENTE ================== */
export default function FichaEmisionModal({ solicitud, onClose }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  const imagenes = useMemo(() => (docs || []).filter(isImage), [docs]);
  const otros = useMemo(() => (docs || []).filter((d) => !isImage(d)), [docs]);

  const { nombre: nombreSolo, apellido: apellidoSolo } = useMemo(
    () => splitNombreApellido(solicitud?.cliente_nombre),
    [solicitud?.cliente_nombre]
  );

  const cargar = async () => {
    if (!solicitud?.id) return;
    setLoading(true);
    try {
      const list = await solicitudesApi.listarDocs(solicitud.id);
      setDocs(Array.isArray(list) ? list : list?.results || []);
    } catch (e) {
      toast.error(e?.message || "No se pudieron cargar documentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitud?.id]);

  const copiarResumen = async () => {
    try {
      await navigator.clipboard.writeText(buildResumen(solicitud));
      toast.success("Resumen copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Contenedor principal */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full h-[100dvh] md:h-auto md:max-w-6xl md:mx-auto md:my-8 md:rounded-2xl md:border md:border-white/10 shadow-2xl"
        style={{
          background:
            "linear-gradient(180deg, rgba(14,11,43,0.98) 0%, rgba(10,9,32,0.98) 100%)",
        }}
      >
        {/* Header sticky (mobile app) */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0f0c28]/90 backdrop-blur"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <h3 className="text-white font-semibold">
            Ficha para Emisión · {solicitud?.codigo || `ID ${solicitud?.id}`}
          </h3>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <HiX className="text-lg text-white" />
          </button>
        </div>

        {/* Área scrollable */}
        <div className="px-4 pb-28 pt-3 overflow-y-auto h-[calc(100dvh-56px)] md:max-h-[78vh] md:pb-4">
          {/* Cliente / Vehículo */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h4 className="text-white/90 font-medium mb-2">Cliente</h4>
              <dl className="grid grid-cols-3 gap-2 text-white/80 text-sm">
                <dt className="col-span-1 text-white/60">Nombre</dt>
                <dd className="col-span-2">
                  <CopyValue text={nombreSolo} />
                </dd>

                <dt className="col-span-1 text-white/60">Apellido</dt>
                <dd className="col-span-2">
                  <CopyValue text={apellidoSolo} />
                </dd>

                <dt className="col-span-1 text-white/60">DNI</dt>
                <dd className="col-span-2">
                  <CopyValue text={solicitud?.cliente_dni} />
                </dd>

                <dt className="col-span-1 text-white/60">Teléfono</dt>
                <dd className="col-span-2">
                  <CopyValue text={solicitud?.telefono} />
                </dd>
              </dl>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h4 className="text-white/90 font-medium mb-2">Vehículo</h4>
              <dl className="grid grid-cols-3 gap-2 text-white/80 text-sm">
                <dt className="col-span-1 text-white/60">Marca</dt>
                <dd className="col-span-2">
                  <CopyValue text={solicitud?.vehiculo_marca} />
                </dd>

                <dt className="col-span-1 text-white/60">Modelo</dt>
                <dd className="col-span-2">
                  <CopyValue text={solicitud?.vehiculo_modelo} />
                </dd>

                <dt className="col-span-1 text-white/60">Año</dt>
                <dd className="col-span-2">
                  <CopyValue text={solicitud?.vehiculo_anio} />
                </dd>

                <dt className="col-span-1 text-white/60">Patente</dt>
                <dd className="col-span-2">
                  <CopyValue text={solicitud?.vehiculo_patente} />
                </dd>
              </dl>
            </section>
          </div>

          {/* Datos de la solicitud */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
            <h4 className="text-white/90 font-medium mb-2">Solicitud</h4>
            <div className="grid md:grid-cols-4 gap-2 text-white/80 text-sm">
              <FieldBox label="Cobertura" value={solicitud?.cobertura_solicitada} />
              <FieldBox
                label="Compañía preferida"
                value={solicitud?.compania_preferida}
              />
              <FieldBox label="Estado" value={estadoLabel(solicitud?.estado)} />
              <FieldBox label="Código" value={solicitud?.codigo || solicitud?.id} />
            </div>

            {solicitud?.observaciones ? (
              <div className="mt-2 text-white/80 text-sm">
                <div className="text-white/60">Observaciones</div>
                <div className="mt-0.5">
                  <CopyValue text={solicitud.observaciones} />
                </div>
              </div>
            ) : null}
          </section>

          {/* Galería de imágenes */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white/90 font-medium">
                Fotos ({imagenes.length})
              </h4>
              {otros.length > 0 && (
                <div className="text-xs text-white/60">
                  También hay {otros.length} documento/s no imagen (DNI, PDFs, etc.).
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-36 rounded-xl bg-white/5 border border-white/10 animate-pulse"
                  />
                ))}
              </div>
            ) : imagenes.length === 0 ? (
              <div className="text-white/70 text-sm">No hay imágenes cargadas.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {imagenes.map((d) => (
                  <a
                    key={d.id}
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl overflow-hidden border border-white/10 bg-white/5"
                    title={`${d.nombre || d.tipo || "Imagen"} — abrir en pestaña`}
                  >
                    <img
                      src={d.url}
                      alt={d.nombre || ""}
                      className="w-full h-36 object-cover"
                    />
                    <div className="px-2 py-1 text-xs text-white/70 flex items-center justify-between">
                      <span className="truncate">
                        {d.nombre || d.tipo || "Imagen"}
                      </span>
                      <HiExternalLink />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Acciones inferiores sticky (mobile) */}
        <div
          className="sticky bottom-0 z-10 flex items-center justify-end gap-2 px-4 py-3 border-t border-white/10 bg-[#0f0c28]/90 backdrop-blur"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <button
            onClick={copiarResumen}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm text-white"
          >
            <HiClipboardCopy /> Copiar resumen
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm text-white"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ----------------- Helpers de UI con copiado ----------------- */

function FieldBox({ label, value }) {
  return (
    <div>
      <div className="text-white/60">{label}</div>
      <CopyValue text={value} />
    </div>
  );
}

function CopyValue({ text }) {
  const [ok, setOk] = useState(false);
  const display = text ?? "—";
  const toCopy = text == null ? "" : String(text);

  const onCopy = async () => {
    if (!toCopy) return;
    try {
      await navigator.clipboard.writeText(toCopy);
      setOk(true);
      setTimeout(() => setOk(false), 900);
      toast.success("Copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="truncate">{String(display)}</span>
      <button
        onClick={onCopy}
        title="Copiar"
        className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/10 border border-white/10 text-xs"
      >
        {ok ? <HiCheck /> : <HiClipboardCopy />}
      </button>
    </div>
  );
}
