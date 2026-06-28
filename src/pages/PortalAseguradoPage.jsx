// src/pages/PortalAseguradoPage.jsx
//
// Portal del Asegurado (PÚBLICO, sin login). El cliente entra por el link único
// que recibe por WhatsApp: /#/portal/<token>
// Ve sus pólizas vigentes, cuotas, papeles y puede avisar "Ya pagué" en las
// cuponeras de robo. Solo lectura (salvo el aviso de pago).

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { FaCar } from "react-icons/fa";
import FacturaCuota from "../components/pagos/FacturaCuota";
import {
  HiCheckCircle, HiClock, HiShieldCheck, HiDocumentText,
  HiExclamationCircle, HiCash, HiDownload,
} from "react-icons/hi";

// El portal vive FUERA de /api/ → armamos la base del backend sin /api
const API_ORIGIN = String(
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "")
).trim().replace(/\/+$/g, "").replace(/\/api$/i, "");
const PORTAL_BASE = `${API_ORIGIN}/public/portal`;

const CARD = "rounded-2xl border border-white/[0.06] bg-[#121829]";

const ESTADO_POLIZA = {
  activa:  { label: "Activa",  cls: "text-emerald-400 border-emerald-500/25 bg-emerald-500/10", dot: "bg-emerald-400" },
  vencida: { label: "Con pago pendiente", cls: "text-amber-400 border-amber-500/25 bg-amber-500/10", dot: "bg-amber-400" },
};

function fmt(d) {
  return d ? dayjs(d).format("DD/MM/YYYY") : "—";
}

// Formatea pesos argentinos sin decimales: 35000 → "$35.000"
function money(n) {
  const v = Number(n || 0);
  return "$" + v.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

// Nombre legible del documento. Prioriza el TIPO (dato confiable); el nombre del
// archivo se usa solo como respaldo, y ahí Mercosur/cuponera/certificado se chequean
// ANTES que "póliza" (porque muchos archivos llevan "poliza" en el nombre).
function nombreLindoDoc(tipo, nombre) {
  const t = String(tipo || "").toUpperCase().trim();
  const n = String(nombre || "").toLowerCase();

  // 1) Por tipo (lo que confiamos)
  if (t.startsWith("MERCO")) return "Tarjeta Mercosur";
  if (t.startsWith("CUPON")) return "Cuponera de robo";
  if (t.startsWith("CERT")) return "Certificado";
  if (t.startsWith("DNI")) return "DNI";
  if (t.startsWith("POLIZA") || t === "PRP" || t.startsWith("FRENTE") || t.startsWith("PROPUESTA"))
    return "Póliza";

  // 2) Respaldo por nombre de archivo (Mercosur/cuponera/cert ANTES que póliza)
  if (n.includes("merco")) return "Tarjeta Mercosur";
  if (n.includes("cupon")) return "Cuponera de robo";
  if (n.includes("cert")) return "Certificado";
  if (n.includes("poliza") || n.includes("prp") || n.includes("propuesta") || n.includes("frente"))
    return "Póliza";

  // 3) Último recurso
  if (t && t !== "OTRO") return t.charAt(0) + t.slice(1).toLowerCase();
  return "Documento";
}

function Cuota({ c, onRecibo, busy }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 px-3.5 py-2.5 last:border-0">
      <span className="flex items-center gap-2.5">
        {c.pagado ? <HiCheckCircle className="h-4 w-4 text-emerald-400" /> : <HiClock className="h-4 w-4 text-amber-400" />}
        <span className="text-[13px] text-slate-200">Cuota {c.cuota_nro}</span>
      </span>
      <span className="flex items-center gap-2.5">
        <span className={`text-[11px] ${c.pagado ? "text-emerald-400" : "text-amber-400"}`}>
          {c.pagado ? `Pagada · ${fmt(c.fecha_pago)}` : `Vence ${fmt(c.fecha_vencimiento)}`}
        </span>
        {onRecibo ? (
          <button
            onClick={onRecibo}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            <HiDownload className="h-3.5 w-3.5" /> {busy ? "..." : "Recibo"}
          </button>
        ) : null}
      </span>
    </div>
  );
}

export default function PortalAseguradoPage() {
  const { token } = useParams();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [enviando, setEnviando] = useState({});
  const [reciboBusy, setReciboBusy] = useState(null);
  const [recibo, setRecibo] = useState(null);          // { cli, pol, cuota } recibo a previsualizar (HTML)
  const [descargandoRecibo, setDescargandoRecibo] = useState(false);
  const [verDoc, setVerDoc] = useState(null);          // { url, nombre } papel (PDF) a previsualizar

  const cerrarRecibo = () => setRecibo(null);

  // Descarga el recibo como PDF (se genera on-demand con react-pdf)
  const descargarReciboPDF = async () => {
    if (!recibo) return;
    setDescargandoRecibo(true);
    try {
      const [pdfMod, facturaMod] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../components/pagos/FacturaCuotaPDF"),
      ]);
      const { pdf } = pdfMod;
      const FacturaCuotaPDF = facturaMod.default;
      const doc = <FacturaCuotaPDF cliente={recibo.cli} poliza={recibo.pol} cuota={recibo.cuota} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Recibo_cuota_${recibo.cuota.cuota_nro}_${recibo.pol.patente || recibo.pol.id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast.error("No se pudo generar el PDF.");
    } finally {
      setDescargandoRecibo(false);
    }
  };

  // Genera el recibo de una cuota pagada en el navegador del cliente (sin guardar nada).
  const handleRecibo = (cli, pol, cuota) => {
    setRecibo({ cli, pol, cuota });
  };

  useEffect(() => {
    let vivo = true;
    (async () => {
      setCargando(true);
      setError("");
      try {
        const res = await fetch(`${PORTAL_BASE}/${token}/`);
        if (!res.ok) throw new Error(res.status === 404 ? "Este link no es válido o expiró." : "No pudimos cargar tus datos.");
        const json = await res.json();
        if (vivo) setData(json);
      } catch (e) {
        if (vivo) setError(e.message || "Ocurrió un error.");
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, [token]);

  const reportarPago = async (polizaId, cupon) => {
    setEnviando((m) => ({ ...m, [cupon.id]: true }));
    try {
      const res = await fetch(`${PORTAL_BASE}/${token}/cupon/${cupon.id}/reportar-pago/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || "No se pudo registrar el aviso.");
      // Actualizamos el estado local del cupón
      setData((prev) => {
        if (!prev) return prev;
        const polizas = prev.polizas.map((p) => {
          if (p.id !== polizaId) return p;
          return {
            ...p,
            cupones_robo: p.cupones_robo.map((cp) =>
              cp.id === cupon.id ? { ...cp, estado: "REPORTADO", reportado: true } : cp
            ),
          };
        });
        return { ...prev, polizas };
      });
      toast.success("¡Gracias! Recibimos tu aviso. Lo verificamos y te confirmamos.");
    } catch (e) {
      toast.error(e.message || "Error al enviar el aviso.");
    } finally {
      setEnviando((m) => { const c = { ...m }; delete c[cupon.id]; return c; });
    }
  };

  // -------- Loading --------
  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e1a]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  // -------- Error --------
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0a0e1a] px-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-rose-500/10 text-rose-400">
          <HiExclamationCircle className="h-8 w-8" />
        </div>
        <h1 className="text-lg font-semibold text-white">No pudimos abrir tu portal</h1>
        <p className="max-w-xs text-sm text-slate-400">{error}</p>
        <p className="mt-2 text-xs text-slate-500">Si creés que es un error, escribinos por WhatsApp.</p>
      </div>
    );
  }

  const cliente = data?.cliente || {};
  const polizas = data?.polizas || [];

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-100">
      <div className="mx-auto w-full max-w-xl px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Hola, {cliente.nombre || "👋"}</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {polizas.length === 0 ? "No tenés pólizas vigentes en este momento." : "Estos son tus seguros."}
          </p>
        </div>

        {/* Pólizas */}
        {polizas.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-[#121829] px-5 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-[#161d31] text-slate-400">
              <HiDocumentText className="h-6 w-6" />
            </div>
            <p className="text-[15px] font-semibold text-slate-200">No tenés pólizas vigentes</p>
            <p className="mt-1 text-[13px] leading-snug text-slate-400">
              En este momento no hay seguros activos para mostrar. Si creés que es un error, escribinos.
            </p>
          </div>
        ) : null}

        <div className="space-y-5">
          {polizas.map((p) => {
            const est = ESTADO_POLIZA[String(p.estado).toLowerCase()] || ESTADO_POLIZA.activa;
            const cupones = p.cupones_robo || [];
            const docs = p.documentos || [];
            return (
              <div key={p.id} className={`${CARD} overflow-hidden`}>
                {/* Hero de la póliza */}
                <div className="flex items-center gap-3 border-b border-white/5 p-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-[#161d31] text-indigo-400">
                    <FaCar className="text-xl" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">{p.marca} {p.modelo}</span>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${est.cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${est.dot}`} /> {est.label}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-400">
                      {p.patente ? <span className="font-mono uppercase text-slate-300">{p.patente}</span> : null}
                      {p.patente ? " · " : ""}{p.compania} · Cobertura {p.cobertura}
                    </div>
                  </div>
                </div>

                {/* Tu cuota hoy + lo que pagás al renovar (NRE) */}
                {(p.precio_actual > 0 || p.renovacion) ? (
                  <div className="border-b border-white/5 p-4">
                    {p.precio_actual > 0 ? (
                      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0f1422] px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          <HiCash className="h-4 w-4 text-indigo-400" />
                          <span className="text-[13px] text-slate-300">Tu cuota</span>
                        </div>
                        <span className="text-[17px] font-bold text-slate-100">{money(p.precio_actual)}</span>
                      </div>
                    ) : null}

                    {p.renovacion ? (
                      <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3.5">
                        <div className="flex items-center gap-2 text-amber-300">
                          <HiClock className="h-4 w-4" />
                          <span className="text-[12px] font-semibold">
                            Al renovar (desde {fmt(p.renovacion.fecha)})
                          </span>
                        </div>

                        {p.renovacion.con_oferta ? (
                          <div className="mt-2.5 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] text-slate-300">1ra cuota</span>
                              <span className="text-[15px] font-bold text-emerald-400">{money(p.renovacion.primera_cuota)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] text-slate-300">Resto de las cuotas</span>
                              <span className="text-[15px] font-semibold text-slate-100">{money(p.renovacion.resto)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2.5 flex items-center justify-between">
                            <span className="text-[12px] text-slate-300">Todas las cuotas</span>
                            <span className="text-[15px] font-bold text-slate-100">{money(p.renovacion.resto)}</span>
                          </div>
                        )}

                        <p className="mt-2.5 text-[11px] leading-snug text-slate-400">
                          Sabemos que está difícil. Por eso ajustamos el precio de a poco
                          {p.renovacion.con_oferta ? " y la primera cuota te queda más baja" : ""}, para acompañarte y que sigas cubierto.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* Papeles */}
                {docs.length > 0 ? (
                  <div className="border-b border-white/5 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <HiDocumentText className="h-4 w-4 text-indigo-400" />
                      <span className="text-[13px] font-semibold text-slate-200">Papeles</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {docs.map((d, i) => (
                        <button
                          key={i}
                          onClick={() => setVerDoc({ url: d.url, nombre: nombreLindoDoc(d.tipo, d.nombre) })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/5 px-3 py-1.5 text-[12px] text-slate-200 transition hover:bg-white/10"
                        >
                          <HiDocumentText className="h-4 w-4 text-rose-400" /> {nombreLindoDoc(d.tipo, d.nombre)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border-b border-white/5 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <HiDocumentText className="h-4 w-4 text-indigo-400" />
                      <span className="text-[13px] font-semibold text-slate-200">Papeles</span>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-[#0f1422] p-3.5">
                      <div className="flex items-center gap-2 text-amber-300">
                        <HiClock className="h-4 w-4" />
                        <span className="text-[13px] font-semibold">Papeles en proceso de carga</span>
                      </div>
                      <p className="mt-1.5 text-[12px] leading-snug text-slate-400">
                        Estamos cargando los papeles de esta póliza. Si los necesitás ahora, escribinos.
                      </p>
                      {p.oficina_whatsapp ? (
                        <a
                          href={`https://wa.me/${p.oficina_whatsapp}?text=${encodeURIComponent(
                            `Hola, soy ${cliente?.nombre_completo || cliente?.nombre || ""}. Necesito los papeles de mi póliza del auto ${p.patente || ""}. ¿Me los pueden enviar? Gracias.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-[12px] font-bold text-white transition hover:bg-emerald-400"
                        >
                          Pedir mis papeles
                        </a>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Cuponeras de robo (lo importante para cobranza) */}
                {cupones.length > 0 ? (
                  <div className="border-b border-white/5 p-4">
                    <div className="mb-2.5 flex items-center gap-2">
                      <HiShieldCheck className="h-4 w-4 text-indigo-400" />
                      <span className="text-[13px] font-semibold text-slate-200">Cuponeras de robo</span>
                    </div>
                    <div className="space-y-2">
                      {cupones.map((cp) => {
                        const pagada = cp.pagado || cp.estado === "PAGADA";
                        const reportada = cp.reportado || cp.estado === "REPORTADO";
                        return (
                          <div key={cp.id} className="rounded-xl border border-white/[0.06] bg-[#0f1422] p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] text-slate-200">Vence {fmt(cp.fecha_vencimiento)}</span>
                              {pagada ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400"><HiCheckCircle className="h-4 w-4" /> Pagada</span>
                              ) : reportada ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400"><HiClock className="h-4 w-4" /> Aviso recibido</span>
                              ) : (
                                <button
                                  onClick={() => reportarPago(p.id, cp)}
                                  disabled={!!enviando[cp.id]}
                                  className="rounded-lg bg-indigo-500 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-indigo-400 disabled:opacity-50"
                                >
                                  {enviando[cp.id] ? "Enviando..." : "Ya pagué"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[11px] leading-snug text-slate-500">
                      Cuando toques "Ya pagué", lo verificamos y te confirmamos. No hace falta que subas nada.
                    </p>
                    <div className="mt-3 rounded-xl border border-sky-500/20 bg-sky-500/[0.07] p-3">
                      <div className="flex items-center gap-2 text-sky-300">
                        <HiCash className="h-4 w-4" />
                        <span className="text-[12px] font-semibold">Cómo pagar tus cuotas</span>
                      </div>
                      <p className="mt-1 text-[12px] leading-snug text-slate-300">
                        Podés abonar en <span className="font-semibold text-slate-100">Rapipago</span>,{" "}
                        <span className="font-semibold text-slate-100">Pago Fácil</span> o{" "}
                        <span className="font-semibold text-slate-100">Mercado Pago</span> usando los datos de tu cuponera.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Cuotas */}
                {p.cuotas?.length > 0 ? (
                  <div className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <HiCash className="h-4 w-4 text-indigo-400" />
                      <span className="text-[13px] font-semibold text-slate-200">Cuotas</span>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-[#0f1422]">
                      {p.cuotas.map((c) => (
                        <Cuota
                          key={`${p.id}-${c.cuota_nro}`}
                          c={c}
                          busy={reciboBusy === `${p.id}-${c.cuota_nro}`}
                          onRecibo={c.pagado ? () => handleRecibo(cliente, p, c) : null}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[11px] text-slate-600">
          Portal del asegurado
        </p>
      </div>

      <AnimatePresence>
        {recibo && (
          <motion.div
            key="recibo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm"
            style={{ perspective: 1400 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 70, scale: 0.9, rotateX: 14 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: 50, scale: 0.94, rotateX: 8 }}
              transition={{ type: "spring", stiffness: 230, damping: 22, mass: 0.9 }}
              style={{ transformOrigin: "bottom center" }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-[#0a0e1a] px-4 py-3">
                <span className="text-sm font-semibold text-slate-100">Recibo</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={descargarReciboPDF}
                    disabled={descargandoRecibo}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                  >
                    <HiDownload className="h-4 w-4" /> {descargandoRecibo ? "..." : "Descargar"}
                  </button>
                  <button
                    onClick={cerrarRecibo}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-400"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.3 }}
                className="flex-1 overflow-auto bg-slate-200 p-3"
              >
                <FacturaCuota cliente={recibo.cli} poliza={recibo.pol} cuota={recibo.cuota} ocultarNumeroPoliza />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {verDoc && (
          <motion.div
            key="verdoc"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm"
            style={{ perspective: 1400 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 70, scale: 0.9, rotateX: 14 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: 50, scale: 0.94, rotateX: 8 }}
              transition={{ type: "spring", stiffness: 230, damping: 22, mass: 0.9 }}
              style={{ transformOrigin: "bottom center" }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-[#0a0e1a] px-4 py-3">
                <span className="truncate text-sm font-semibold text-slate-100">{verDoc.nombre}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={verDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    <HiDownload className="h-4 w-4" /> Abrir
                  </a>
                  <button
                    onClick={() => setVerDoc(null)}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-400"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(verDoc.url)}&embedded=true`}
                title="Documento"
                className="w-full flex-1 bg-white"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}