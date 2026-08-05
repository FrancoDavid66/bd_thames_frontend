// src/components/solicitudes/FichaEmisionModal.jsx
//
// Ficha técnica de emisión: muestra los datos de la solicitud (copiables) y
// la evidencia fotográfica / documentos cargados. Solo lectura.
// Carga documentos con `api` (axios con JWT).

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HiClipboardCopy, HiCheck, HiExternalLink, HiUser, HiTruck, HiPhotograph } from "react-icons/hi";
import toast from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

import ModalDuo from "../ui/ModalDuo";
import Boton3D from "../ui/Boton3D";
import Badge, { estadoATono } from "../ui/Badge";

/* ── helpers ── */
const isImage = (doc) => String(doc?.mime || "").startsWith("image");
const fmt = (k, v) => `${k}: ${v ?? "—"}`;

const ESTADO_LABEL = {
  VIGENTE_24H: "Vigente 24h",
  EN_REVISION: "En revisión",
  BORRADOR: "Borrador",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
  CONVERTIDA: "Convertida",
  TERMINADA: "Terminada",
};
const estadoLabel = (e) => ESTADO_LABEL[e] || e || "—";

function buildResumen(s) {
  return [
    fmt("Cliente", s?.cliente_nombre),
    fmt("DNI", s?.cliente_dni),
    fmt("Teléfono", s?.telefono),
    fmt("Vehículo", `${s?.vehiculo_marca || "—"} ${s?.vehiculo_modelo || ""}`.trim()),
    fmt("Año", s?.vehiculo_anio),
    fmt("Patente", s?.vehiculo_patente),
    fmt("Cobertura", s?.cobertura_solicitada),
    fmt("Compañía pref.", s?.compania_preferida),
    fmt("Observaciones", s?.observaciones || "—"),
    fmt("Código", s?.codigo || s?.id),
    fmt("Estado", estadoLabel(s?.estado)),
  ].join("\n");
}

function splitNombreApellido(fullName) {
  const clean = String(fullName || "").trim().replace(/\s+/g, " ");
  if (!clean) return { nombre: "", apellido: "" };
  const parts = clean.split(" ");
  if (parts.length === 1) return { nombre: parts[0], apellido: "" };
  const apellido = parts.pop();
  return { nombre: parts.join(" "), apellido };
}

/* ═══════════ COMPONENTE ═══════════ */
export default function FichaEmisionModal({ solicitud, onClose }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  const imagenes = useMemo(() => (docs || []).filter(isImage), [docs]);
  const otros = useMemo(() => (docs || []).filter((d) => !isImage(d)), [docs]);

  const { nombre: nombreSolo, apellido: apellidoSolo } = useMemo(
    () => splitNombreApellido(solicitud?.cliente_nombre),
    [solicitud?.cliente_nombre]
  );

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!solicitud?.id) return;
      setLoading(true);
      try {
        const res = await api.get(`/solicitudes/${solicitud.id}/documentos/`);
        if (!vivo) return;
        setDocs(res.data?.results || res.data || []);
      } catch {
        toast.error("Error al sincronizar documentos");
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [solicitud?.id]);

  const copiarResumen = async () => {
    try {
      await navigator.clipboard.writeText(buildResumen(solicitud));
      toast.success("Resumen copiado para emitir");
    } catch {
      toast.error("Error al copiar");
    }
  };

  return (
    <ModalDuo
      isOpen
      onClose={onClose}
      icon={<HiClipboardCopy />}
      iconTono="azul"
      size="lg"
      title="Ficha de Emisión"
      subtitle={`#${solicitud?.codigo || solicitud?.id} · ${user?.perfil?.oficina_nombre || "Local"}`}
      footer={
        <>
          <Boton3D variant="blanco" onClick={onClose}>
            Cerrar
          </Boton3D>
          <Boton3D variant="azul" onClick={copiarResumen}>
            <HiClipboardCopy /> Copiar resumen
          </Boton3D>
        </>
      }
    >
      <div className="space-y-4">
        {/* Estado */}
        <div className="flex items-center gap-2">
          <Badge tono={estadoATono(solicitud?.estado)}>{estadoLabel(solicitud?.estado)}</Badge>
          {solicitud?.poliza_id && (
            <Link
              to={`/polizas/${solicitud.poliza_id}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-duo-azul hover:opacity-80"
            >
              Póliza #{solicitud.poliza_id} <HiExternalLink />
            </Link>
          )}
        </div>

        {/* Asegurado + Vehículo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Bloque icon={<HiUser />} tono="azul" titulo="Asegurado">
            <Dato label="Nombre" value={nombreSolo} linkTo={solicitud?.cliente_id ? `/clientes/${solicitud.cliente_id}` : null} />
            <Dato label="Apellido" value={apellidoSolo} linkTo={solicitud?.cliente_id ? `/clientes/${solicitud.cliente_id}` : null} />
            <Dato label="DNI / CUIT" value={solicitud?.cliente_dni} />
            <Dato label="Teléfono" value={solicitud?.telefono} />
          </Bloque>

          <Bloque icon={<HiTruck />} tono="amarillo" titulo="Vehículo">
            <Dato label="Marca" value={solicitud?.vehiculo_marca} />
            <Dato label="Modelo" value={solicitud?.vehiculo_modelo} />
            <Dato label="Año" value={solicitud?.vehiculo_anio} />
            <Dato label="Patente" value={solicitud?.vehiculo_patente} mono />
          </Bloque>
        </div>

        {/* Config solicitud */}
        <Bloque icon={<HiClipboardCopy />} tono="verde" titulo="Configuración" cols={2}>
          <Dato label="Cobertura" value={solicitud?.cobertura_solicitada} />
          <Dato label="Compañía pref." value={solicitud?.compania_preferida} />
          <Dato label="Referencia" value={solicitud?.codigo || solicitud?.id} />
          <Dato label="Estado" value={estadoLabel(solicitud?.estado)} />
        </Bloque>

        {solicitud?.observaciones && (
          <div className="rounded-2xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark mb-2">
              Observaciones
            </div>
            <CopyValue text={solicitud.observaciones} />
          </div>
        )}

        {/* Fotos / docs */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <HiPhotograph className="text-duo-rojo text-lg" />
            <h4 className="text-titulo dark:text-titulo-dark font-black text-[13px] uppercase tracking-wide">
              Evidencia ({imagenes.length})
            </h4>
            {otros.length > 0 && (
              <span className="text-[10px] font-black uppercase tracking-wide text-suave dark:text-suave-dark">
                · {otros.length} docs
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-video rounded-2xl bg-surface dark:bg-surface-dark animate-pulse" />
              ))}
            </div>
          ) : imagenes.length === 0 && otros.length === 0 ? (
            <p className="text-[13px] font-bold text-suave dark:text-suave-dark text-center py-6">
              Sin documentos cargados.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {imagenes.map((d) => (
                  <a
                    key={d.id}
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative block aspect-video rounded-2xl overflow-hidden border-2 border-linea dark:border-linea-dark"
                  >
                    <img src={d.url} alt="" className="w-full h-full object-cover transition group-hover:scale-105" />
                    <div className="absolute top-2 right-2 h-6 w-6 rounded-lg bg-black/50 flex items-center justify-center text-white">
                      <HiExternalLink />
                    </div>
                  </a>
                ))}
              </div>
              {otros.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {otros.map((d) => (
                    <a
                      key={d.id}
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul text-[12px] font-black"
                    >
                      <HiExternalLink /> {d.nombre || d.tipo || "Documento"}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ModalDuo>
  );
}

/* ── sub-componentes ── */
function Bloque({ icon, tono = "azul", titulo, cols = 2, children }) {
  const tonos = {
    azul: "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul",
    verde: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde",
    amarillo: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo",
  };
  return (
    <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-base ${tonos[tono] || tonos.azul}`}>
          {icon}
        </div>
        <h4 className="text-titulo dark:text-titulo-dark font-black text-[13px] uppercase tracking-wide">{titulo}</h4>
      </div>
      <div className={`grid gap-3 ${cols === 2 ? "grid-cols-2" : "grid-cols-1"}`}>{children}</div>
    </div>
  );
}

function Dato({ label, value, linkTo, mono = false }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark ml-1">
        {label}
      </span>
      <div className={`p-2.5 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark ${mono ? "font-mono" : ""}`}>
        <CopyValue text={value} linkTo={linkTo} />
      </div>
    </div>
  );
}

function CopyValue({ text, linkTo }) {
  const [ok, setOk] = useState(false);
  const display = text ?? "—";
  const onCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(String(text));
      setOk(true);
      setTimeout(() => setOk(false), 1200);
      toast.success("Copiado");
    } catch {
      toast.error("Error al copiar");
    }
  };
  return (
    <div className="flex items-center justify-between gap-2 group/copy">
      {linkTo ? (
        <Link
          to={linkTo}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-[13px] font-black text-duo-azul hover:opacity-80"
        >
          {String(display)}
        </Link>
      ) : (
        <span className="truncate text-[13px] font-bold text-titulo dark:text-titulo-dark">{String(display)}</span>
      )}
      <button
        onClick={onCopy}
        title="Copiar"
        className={`shrink-0 h-7 w-7 rounded-lg flex items-center justify-center transition ${
          ok ? "bg-duo-verde text-white" : "bg-card dark:bg-card-dark text-suave dark:text-suave-dark group-hover/copy:text-titulo dark:group-hover/copy:text-titulo-dark"
        }`}
      >
        {ok ? <HiCheck className="text-sm" /> : <HiClipboardCopy className="text-sm" />}
      </button>
    </div>
  );
}