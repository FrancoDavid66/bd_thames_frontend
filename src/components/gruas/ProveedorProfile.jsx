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

// ✅ usamos el modal nuevo (el que ya tenés en ./modal/FlotaModal)
import FlotaModal from "./modal/FlotaModal";

// ---------- utils
const todayStr = () => new Date().toISOString().slice(0, 10);
const isVencida = (s) => !!s && String(s) < todayStr();

// ✅ Formato DD/MM/YYYY
function fmtDateAR(iso) {
  const s = String(iso || "").trim();
  if (!s) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// Date helpers (YYYY-MM-DD -> Date at local midnight)
function parseIsoDateToLocalMidnight(iso) {
  const s = String(iso || "").trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function localMidnightToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Signed days difference: target - today
function daysUntilIso(iso) {
  const target = parseIsoDateToLocalMidnight(iso);
  if (!target) return null;
  const today = localMidnightToday();
  const ms = target.getTime() - today.getTime();
  return Math.floor(ms / 86400000);
}

// ✅ status VTV con escalas 7 / 15 / 30
function computeVtvStatus(vtvIso) {
  const days = daysUntilIso(vtvIso);

  if (days === null) {
    return { kind: "missing", days: null, label: "Sin fecha", tone: "gray", detail: "" };
  }

  if (days < 0) {
    return {
      kind: "expired",
      days,
      label: "Vencida",
      tone: "danger",
      detail: `Vencida hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`,
    };
  }

  if (days === 0) {
    return { kind: "today", days, label: "Vence hoy", tone: "danger", detail: "Vence hoy" };
  }

  if (days <= 7) {
    return {
      kind: "soon7",
      days,
      label: "Por vencer",
      tone: "danger",
      detail: `Vence en ${days} día${days === 1 ? "" : "s"}`,
    };
  }

  // ✅ 8–15 naranja
  if (days <= 15) {
    return { kind: "soon15", days, label: "Por vencer", tone: "orange", detail: `Vence en ${days} días` };
  }

  if (days <= 30) {
    return { kind: "soon30", days, label: "Por vencer", tone: "warn", detail: `Vence en ${days} días` };
  }

  return { kind: "ok", days, label: "OK", tone: "ok", detail: `Vence en ${days} días` };
}

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
  base: "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ring-1 whitespace-nowrap",
  ok: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/30",
  warn: "bg-amber-500/10 text-amber-300 ring-amber-400/30",
  orange: "bg-orange-500/10 text-orange-200 ring-orange-400/30",
  gray: "bg-gray-600/20 text-gray-200 ring-gray-500/30",
  danger: "bg-rose-500/10 text-rose-200 ring-rose-400/30",
};

function vtvChipText(vtv) {
  if (!vtv || vtv.days === null) return "VTV —";
  if (vtv.days < 0) return `VTV -${Math.abs(vtv.days)}d`;
  if (vtv.days === 0) return "VTV hoy";
  return `VTV ${vtv.days}d`;
}

function vtvToneChipClass(vtv) {
  if (!vtv) return chip.gray;
  if (vtv.tone === "danger") return chip.danger;
  if (vtv.tone === "orange") return chip.orange;
  if (vtv.tone === "warn") return chip.warn;
  if (vtv.tone === "ok") return chip.ok;
  return chip.gray;
}

function vtvBannerCls(vtv) {
  if (!vtv) return "border-white/10 bg-white/5 text-white/80";
  if (vtv.tone === "danger") return "border-rose-400/35 bg-rose-500/12 text-rose-200";
  if (vtv.tone === "orange") return "border-orange-400/35 bg-orange-500/12 text-orange-200";
  if (vtv.tone === "warn") return "border-amber-400/35 bg-amber-500/12 text-amber-200";
  if (vtv.tone === "ok") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  return "border-white/10 bg-white/5 text-white/80";
}

// WhatsApp helpers
function digitsOnly(v) {
  return String(v || "").replace(/\D+/g, "");
}
function normalizeArPhone(raw) {
  let d = digitsOnly(raw);
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.startsWith("54")) return d;
  if (d.length === 10 || d.length === 11) return `54${d}`;
  return d;
}
function buildWaUrl(phoneRaw, text) {
  const p = normalizeArPhone(phoneRaw);
  if (!p) return "";
  const t = String(text || "").trim();
  const qs = t ? `?text=${encodeURIComponent(t)}` : "";
  return `https://wa.me/${p}${qs}`;
}

function ymNow() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// ---------- main component
export default function ProveedorProfile({ proveedorId, onBack, onEdit, onVerFlota }) {
  const [prov, setProv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toggling, setToggling] = useState(false);

  // Modal WhatsApp
  const [waOpen, setWaOpen] = useState(false);
  const [waMsg, setWaMsg] = useState("");

  // ✅ Flota modal (fallback si no viene onVerFlota)
  const [flotaOpen, setFlotaOpen] = useState(false);
  const [flotaMes] = useState(ymNow()); // solo initial

  async function load() {
    setLoading(true);
    setErr("");
    try {
      // ✅ FIX: esto era lo que te rompía el build (Missing initializer...)
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
  const vtv = useMemo(() => computeVtvStatus(prov?.vtv_vencimiento), [prov?.vtv_vencimiento]);

  async function toggleActivo() {
    if (!prov) return;
    const next = !prov.activo;

    if (next && !flags.completa) {
      const msj = flags.vtvVencida ? "La VTV está vencida." : `Faltan: ${flags.faltantes.join(", ")}`;
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

  function openWhatsAppModal() {
    if (!prov?.telefono) return;
    const nombre = prov?.nombre ? String(prov.nombre).trim() : "";
    setWaMsg(nombre ? `Hola ${nombre}, te escribo por el servicio de grúas.` : "");
    setWaOpen(true);
  }

  function sendWhatsApp() {
    const url = buildWaUrl(prov?.telefono, waMsg);
    if (!url) {
      alert("No hay un teléfono válido para WhatsApp.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    setWaOpen(false);
  }

  function openFlota() {
    if (!prov) return;
    if (onVerFlota) return onVerFlota(prov); // ✅ delega al padre (ProveedoresPanel)
    setFlotaOpen(true); // ✅ fallback si se usa standalone
  }

  // ---------- render
  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <button
            onClick={onBack}
            className="h-10 w-10 grid place-content-center rounded-xl bg-white/10 hover:bg-white/15 shrink-0"
            title="Volver"
          >
            <HiArrowLeft className="text-white" />
          </button>

          <div className="min-w-0">
            <h2 className="text-white/95 text-lg md:text-xl font-semibold truncate">
              Proveedor: <span className="text-white font-bold">{prov?.nombre || "—"}</span>
            </h2>

            {prov && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`${chip.base} ${prov.activo ? chip.ok : chip.gray}`}>
                  {prov.activo ? "Activo" : "Inactivo"}
                </span>

                <span
                  className={`${chip.base} ${flags.completa ? chip.ok : chip.warn}`}
                  title={
                    flags.completa
                      ? "Documentación completa"
                      : `Faltan: ${flags.faltantes.join(", ")}${flags.vtvVencida ? " (VTV vencida)" : ""}`
                  }
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
        </div>

        {/* acciones */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => prov && onEdit?.(prov)}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white inline-flex items-center gap-2"
          >
            <HiPencil /> Editar
          </button>

          <button
            onClick={openFlota}
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
        {loading && (
          <div className="p-6 rounded-2xl border border-white/10 bg-white/5 text-white/80">Cargando…</div>
        )}

        {err && (
          <div className="p-3 rounded-2xl border border-rose-600/30 bg-rose-500/10 text-rose-200 text-sm">
            {err}
          </div>
        )}

        {prov && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card>
              <GridInfo
                items={[
                  ["Nombre", prov.nombre],
                  [
                    "Teléfono",
                    prov.telefono ? (
                      <button
                        type="button"
                        onClick={openWhatsAppModal}
                        className="underline cursor-pointer text-blue-500 decoration-dotted hover:opacity-90 text-left"
                        title="Enviar WhatsApp"
                      >
                        {prov.telefono}
                      </button>
                    ) : (
                      "—"
                    ),
                  ],
                  ["Zona", prov.zona || "—"],
                  ["Observaciones", prov.observaciones || "—"],
                ]}
              />
            </Card>

            <Card className="lg:col-span-1">
              <div className="text-sm text-white/70">Documentación</div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`${chip.base} ${flags.completa ? chip.ok : chip.warn}`}
                  title={
                    flags.completa
                      ? "Completa"
                      : `Faltan: ${flags.faltantes.join(", ")}${flags.vtvVencida ? " (VTV vencida)" : ""}`
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

                {prov.vtv_vencimiento && vtv.kind !== "ok" && (
                  <span
                    className={`${chip.base} ${vtvToneChipClass(vtv)}`}
                    title={`VTV: ${vtv.detail} (${fmtDateAR(prov.vtv_vencimiento)})`}
                  >
                    {vtvChipText(vtv)}
                  </span>
                )}
              </div>

              {vtv.kind === "missing" && (
                <div className="mt-2 text-xs text-amber-200">⚠︎ Falta cargar vencimiento de VTV</div>
              )}
            </Card>

            <Card className="lg:col-span-1">
              <div className="text-sm text-white/70">Resumen</div>

              <div className="mt-2 text-white/90 text-sm">
                VTV vence: <span className="text-white/80">{fmtDateAR(prov.vtv_vencimiento)}</span>
              </div>

              {prov.vtv_vencimiento && (
                <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${vtvBannerCls(vtv)}`}>
                  {vtv.kind === "ok" ? `✅ ${vtv.detail}` : `⚠︎ ${vtv.detail} — revisar/renovar VTV`}
                </div>
              )}
            </Card>
          </div>
        )}

        {prov && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium">Documentos</h4>
            </div>

            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
              {[
                { label: "DNI frente", url: prov.dni_frente_url },
                { label: "DNI dorso", url: prov.dni_dorso_url },
                {
                  label: "VTV (archivo)",
                  url: prov.vtv_url,
                  extra: prov.vtv_vencimiento
                    ? `Vence: ${fmtDateAR(prov.vtv_vencimiento)}${
                        vtv.days !== null && vtv.kind !== "ok"
                          ? vtv.days < 0
                            ? ` (vencida ${Math.abs(vtv.days)}d)`
                            : vtv.days === 0
                            ? " (hoy)"
                            : ` (${vtv.days}d)`
                          : ""
                      }`
                    : null,
                },
                { label: "Cédula verde", url: prov.cedula_verde_url },
                { label: "Foto camión", url: prov.camion_foto_url },
              ].map((d) => (
                <DocCard key={d.label} {...d} />
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Modal WhatsApp */}
      {waOpen && prov?.telefono && (
        <WhatsAppConfirmModal
          nombre={prov?.nombre}
          telefono={prov?.telefono}
          mensaje={waMsg}
          onChangeMensaje={setWaMsg}
          onClose={() => setWaOpen(false)}
          onConfirm={sendWhatsApp}
        />
      )}

      {/* ✅ Modal Flota (fallback standalone) */}
      {flotaOpen && prov?.id && (
        <FlotaModal
          proveedor={prov}
          onClose={() => setFlotaOpen(false)}
          api={GruasAPI}
          initialMes={flotaMes}
        />
      )}
    </div>
  );
}

// ---------- UI bits
function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[.03] p-4 ${className}`}>
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
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="break-inside-avoid mb-4">
      <div className="relative rounded-2xl border border-white/10 bg-[#13161c] overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="text-white/80 text-sm">{label}</div>
          {extra && <div className="text-[11px] text-white/50">{extra}</div>}
        </div>

        <div className="p-4">
          {url ? (
            <div className="relative group">
              {!isPdf ? (
                <img src={url} alt={label} className="w-full rounded-xl object-cover" />
              ) : (
                <div className="w-full h-36 rounded-xl grid place-content-center bg-white/5 text-white/70 text-sm">PDF</div>
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
            <div className="w-full h-36 rounded-xl grid place-content-center bg-white/5 text-white/50 text-sm">— Sin archivo —</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function WhatsAppConfirmModal({ nombre, telefono, mensaje, onChangeMensaje, onClose, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80]">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Cerrar" />
      <div className="absolute left-1/2 top-1/2 w-[min(560px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0b0f1e] shadow-2xl p-4">
        <div className="text-white text-base font-semibold">Enviar mensaje por WhatsApp</div>

        <div className="mt-1 text-white/70 text-sm">
          {nombre ? (
            <>
              ¿Querés enviar un mensaje a <span className="text-white/90 font-medium">{nombre}</span>?
            </>
          ) : (
            "¿Querés enviar un mensaje?"
          )}
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-xs text-white/60">Teléfono</div>
          <div className="text-white/90 font-medium">{telefono}</div>

          <div className="pt-2 text-xs text-white/60">Mensaje (opcional)</div>
          <textarea
            value={mensaje}
            onChange={(e) => onChangeMensaje?.(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-white/5 border border-white/10 text-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
            placeholder="Escribí tu mensaje…"
          />
          <div className="text-[11px] text-white/45">Tip: se abre WhatsApp en otra pestaña.</div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <a className="text-xs text-white/60 hover:text-white underline decoration-dotted" href={`tel:${telefono}`}>
            Llamar
          </a>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white">
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="px-3 py-2 rounded-xl bg-emerald-400 text-[#0b0f1e] font-semibold hover:brightness-105"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
