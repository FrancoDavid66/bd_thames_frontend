// src/components/gruas/ProveedorProfile.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  HiArrowLeft,
  HiCheckCircle,
  HiExclamationCircle,
  HiExternalLink,
  HiPencil,
  HiTruck,
} from "react-icons/hi";
import GruasAPI from "../../api/gruas";

// ---------- utils
const todayStr = () => new Date().toISOString().slice(0, 10);
const isVencida = (s) => !!s && String(s) < todayStr();

function computeDocFlags(p) {
  const faltantes = [];
  if (!p?.dni_frente_url) faltantes.push("DNI frente");
  if (!p?.dni_dorso_url) faltantes.push("DNI dorso");
  if (!p?.vtv_url) faltantes.push("VTV archivo");
  if (!p?.vtv_vencimiento) faltantes.push("VTV vencimiento");
  if (!p?.cedula_verde_url) faltantes.push("Cédula verde");
  if (!p?.camion_foto_url) faltantes.push("Foto camión");
  const vtvVenc = isVencida(p?.vtv_vencimiento);
  const completa = faltantes.length === 0 && !vtvVenc;
  return { faltantes, completa, vtvVencida: vtvVenc };
}

const chip = {
  base: "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ring-1",
  ok: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/30",
  warn: "bg-amber-500/10 text-amber-300 ring-amber-400/30",
  gray: "bg-gray-600/20 text-gray-200 ring-gray-500/30",
};

// ---------- main component
export default function ProveedorProfile({
  proveedorId,
  onBack,
  onEdit,
  onVerFlota,
}) {
  const [prov, setProv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toggling, setToggling] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await GruasAPI.getProveedor?.(proveedorId);
      setProv(data || null);
    } catch (e) {
      setErr(e?.message || "No se pudo cargar el proveedor");
      setProv(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (proveedorId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proveedorId]);

  const flags = useMemo(() => computeDocFlags(prov || {}), [prov]);

  async function toggleActivo() {
    if (!prov) return;
    const next = !prov.activo;
    // si se intenta activar, validar documentación
    if (next && !flags.completa) {
      const msj = flags.vtvVencida
        ? "La VTV está vencida."
        : `Faltan: ${flags.faltantes.join(", ")}`;
      alert(`No se puede activar: ${msj}`);
      return;
    }
    try {
      setToggling(true);
      if (GruasAPI.toggleProveedorActivo) {
        await GruasAPI.toggleProveedorActivo(prov.id, next);
      } else if (GruasAPI.updateProveedor) {
        await GruasAPI.updateProveedor(prov.id, { activo: next });
      }
      await load();
    } catch (e) {
      alert(e?.message || "No se pudo cambiar el estado");
    } finally {
      setToggling(false);
    }
  }

  // ---------- render
  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="h-10 w-10 grid place-content-center rounded-xl bg-white/10 hover:bg-white/15"
            title="Volver"
          >
            <HiArrowLeft className="text-white" />
          </button>
          <h2 className="text-white/95 text-lg md:text-xl font-semibold">
            Proveedor:{" "}
            <span className="text-white font-bold">{prov?.nombre || "—"}</span>
          </h2>

          {/* chips estado */}
          {prov && (
            <div className="ml-2 flex items-center gap-2">
              <span
                className={`${chip.base} ${
                  prov.activo ? chip.ok : chip.gray
                }`}
              >
                {prov.activo ? "Activo" : "Inactivo"}
              </span>
              <span
                className={`${chip.base} ${
                  flags.completa ? chip.ok : chip.warn
                }`}
              >
                {flags.completa ? (
                  <>
                    <HiCheckCircle /> Doc OK
                  </>
                ) : (
                  <>
                    <HiExclamationCircle /> Doc incompleta
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        {/* acciones */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => prov && onEdit?.(prov)}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white inline-flex items-center gap-2"
          >
            <HiPencil /> Editar
          </button>
          <button
            onClick={() => prov && onVerFlota?.(prov)}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white inline-flex items-center gap-2"
          >
            <HiTruck /> Ver flota
          </button>
          <button
            onClick={toggleActivo}
            disabled={!prov || toggling}
            className={`px-3 py-2 rounded-xl font-semibold ${
              prov?.activo
                ? "bg-amber-400 text-[#0b0f1e] hover:brightness-105"
                : "bg-emerald-400 text-[#0b0f1e] hover:brightness-105"
            } disabled:opacity-60`}
          >
            {prov?.activo ? "Desactivar" : "Activar"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="mt-4 space-y-6">
        {/* estado carga / error */}
        {loading && (
          <div className="p-6 rounded-2xl border border-white/10 bg-white/5 text-white/80">
            Cargando…
          </div>
        )}
        {err && (
          <div className="p-3 rounded-2xl border border-rose-600/30 bg-rose-500/10 text-rose-200 text-sm">
            {err}
          </div>
        )}

        {/* info básica */}
        {prov && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card>
              <GridInfo
                items={[
                  ["Nombre", prov.nombre],
                  ["Teléfono", prov.telefono ? (
                    <a
                      className="underline decoration-dotted hover:opacity-90"
                      href={`tel:${prov.telefono}`}
                    >
                      {prov.telefono}
                    </a>
                  ) : "—"],
                  ["Zona", prov.zona || "—"],
                  ["Observaciones", prov.observaciones || "—"],
                ]}
              />
            </Card>

            <Card className="lg:col-span-1">
              <div className="text-sm text-white/70">Situación</div>
              <div className="mt-2">
                <span
                  className={`${chip.base} ${
                    prov.activo ? chip.ok : chip.gray
                  }`}
                >
                  {prov.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="mt-4 text-sm text-white/70">Documentación</div>
              <div className="mt-2">
                <span
                  className={`${chip.base} ${
                    flags.completa ? chip.ok : chip.warn
                  }`}
                  title={
                    flags.completa
                      ? "Completa"
                      : `Faltan: ${flags.faltantes.join(", ")}${
                          flags.vtvVencida ? " (VTV vencida)" : ""
                        }`
                  }
                >
                  {flags.completa ? (
                    <>
                      <HiCheckCircle /> Doc OK
                    </>
                  ) : (
                    <>
                      <HiExclamationCircle /> Incompleta
                    </>
                  )}
                </span>
              </div>
            </Card>

            {/* espacio para crecer o KPI futuro */}
            <Card className="lg:col-span-1">
              <div className="text-sm text-white/70">Resumen</div>
              <div className="mt-2 text-white/90 text-sm">
                {flags.vtvVencida ? (
                  <span className="text-amber-300">
                    ⚠︎ VTV vencida ({prov.vtv_vencimiento || "—"})
                  </span>
                ) : (
                  <>
                    VTV vence:{" "}
                    <span className="text-white/80">
                      {prov.vtv_vencimiento || "—"}
                    </span>
                  </>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* documentos — estilo masonry Pinterest */}
        {prov && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium">Documentos</h4>
            </div>

            {/* Masonry via CSS columns */}
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
              {[
                {
                  label: "DNI frente",
                  url: prov.dni_frente_url,
                },
                {
                  label: "DNI dorso",
                  url: prov.dni_dorso_url,
                },
                {
                  label: "VTV (archivo)",
                  url: prov.vtv_url,
                  extra: prov.vtv_vencimiento
                    ? `Vence: ${prov.vtv_vencimiento}`
                    : null,
                },
                {
                  label: "Cédula verde",
                  url: prov.cedula_verde_url,
                },
                {
                  label: "Foto camión",
                  url: prov.camion_foto_url,
                },
              ].map((d) => (
                <DocCard key={d.label} {...d} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ---------- UI bits
function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[.03] p-4 ${className}`}
    >
      {children}
    </div>
  );
}

function GridInfo({ items = [] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map(([k, v]) => (
        <div key={k}>
          <div className="text-xs text-white/60">{k}</div>
          <div className="mt-1 text-white">{v ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}

function DocCard({ label, url, extra = null }) {
  const isPdf = typeof url === "string" && /\.pdf($|\?)/i.test(url || "");
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="break-inside-avoid mb-4"
    >
      <div className="relative rounded-2xl border border-white/10 bg-[#13161c] overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="text-white/80 text-sm">{label}</div>
          {extra && <div className="text-[11px] text-white/50">{extra}</div>}
        </div>

        {/* media / preview */}
        <div className="p-4">
          {url ? (
            <div className="relative group">
              {!isPdf ? (
                <img
                  src={url}
                  alt={label}
                  className="w-full rounded-xl object-cover"
                />
              ) : (
                <div className="w-full h-36 rounded-xl grid place-content-center bg-white/5 text-white/70 text-sm">
                  PDF
                </div>
              )}
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-3 left-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur hover:bg-white/20 text-white ring-1 ring-white/15"
              >
                <HiExternalLink /> Ver
              </a>
            </div>
          ) : (
            <div className="w-full h-36 rounded-xl grid place-content-center bg-white/5 text-white/50 text-sm">
              — Sin archivo —
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
