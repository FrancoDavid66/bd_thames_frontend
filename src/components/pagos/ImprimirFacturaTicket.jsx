// src/components/pagos/ImprimirFacturaTicket.jsx
import { useCallback, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { HiPrinter } from "react-icons/hi";
import toast from "react-hot-toast";
import { pdf } from "@react-pdf/renderer";

import FacturaCuotaTicketPDF from "./FacturaCuotaTicketPDF";

/* ===================== helpers hora/minuto ===================== */

function safeDateFromAny(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "string") {
    const d = new Date(v); // ISO esperado (backend manda isoformat)
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function fmtHM(dt) {
  const d = safeDateFromAny(dt);
  if (!d) return "";
  try {
    // HH:MM (local)
    return new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    // fallback
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
}

function fmtFull(dt) {
  const d = safeDateFromAny(dt);
  if (!d) return "";
  try {
    // DD/MM/YYYY HH:MM (local)
    const fecha = new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);

    const hm = fmtHM(d);
    return hm ? `${fecha} ${hm}` : fecha;
  } catch {
    const dd = String(d.getDate()).padStart(2, "0");
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear());
    const hm = fmtHM(d);
    return hm ? `${dd}/${mo}/${yy} ${hm}` : `${dd}/${mo}/${yy}`;
  }
}

function pickPagoDateTime(cuota) {
  // Priorizamos lo que ya manda el backend (nuevo)
  // - cuota.pago_hm / pago_hm_full si existen
  // - cuota.pago_registrado_en (ISO)
  // - fallback fecha_pago (sin hora)
  if (!cuota) return { pago_hm: "", pago_hm_full: "", pago_dt_iso: null };

  // Si ya viene formateado del backend, lo usamos
  const pago_hm = (cuota.pago_hm || "").toString();
  const pago_hm_full = (cuota.pago_hm_full || "").toString();

  // Si vienen vacíos, intentamos desde timestamp
  const dtIso = cuota.pago_registrado_en || null;
  const d = safeDateFromAny(dtIso);

  const hm = pago_hm || (d ? fmtHM(d) : "");
  const full = pago_hm_full || (d ? fmtFull(d) : "");

  return { pago_hm: hm, pago_hm_full: full, pago_dt_iso: dtIso };
}

/* ===================== componente ===================== */

export default function ImprimirFacturaTicket({
  cliente,
  poliza,
  cuota,
  label = "Imprimir factura",
  className = "",
}) {
  const [printing, setPrinting] = useState(false);

  const printingRef = useRef(false);
  const iframeRef = useRef(null);
  const urlRef = useRef(null);
  const cleanupTimerRef = useRef(null);

  const pagoInfo = useMemo(() => pickPagoDateTime(cuota), [cuota]);

  const cleanup = useCallback(() => {
    try {
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }
      if (iframeRef.current) {
        iframeRef.current.onload = null;
        try {
          // algunos browsers tiran error si ya no existe
          iframeRef.current.remove();
        } catch {}
        iframeRef.current = null;
      }
      if (urlRef.current) {
        try {
          URL.revokeObjectURL(urlRef.current);
        } catch {}
        urlRef.current = null;
      }
    } finally {
      printingRef.current = false;
      setPrinting(false);
    }
  }, []);

  const handlePrint = useCallback(
    async (e) => {
      // clave: que no se dispare "cerrar modal" por click bubbling
      e?.preventDefault?.();
      e?.stopPropagation?.();

      if (printingRef.current) return;

      const cli = cliente || poliza?.cliente || cuota?.poliza?.cliente;
      const pol = poliza || cuota?.poliza;
      const c = cuota;

      if (!cli || !pol || !c) {
        toast.error("Faltan datos para imprimir el ticket.");
        return;
      }

      try {
        printingRef.current = true;
        setPrinting(true);

        // Limpiar cualquier intento previo (por seguridad)
        cleanup();

        // 1) Construir PDF (ticket) en memoria
        // ✅ Le pasamos pago_hm/pago_hm_full para que el recibo lo muestre sin recalcular
        const doc = (
          <FacturaCuotaTicketPDF
            cliente={cli}
            poliza={pol}
            cuota={c}
            pago_hm={pagoInfo.pago_hm}
            pago_hm_full={pagoInfo.pago_hm_full}
            pago_dt_iso={pagoInfo.pago_dt_iso}
          />
        );
        const blob = await pdf(doc).toBlob();

        // 2) Crear URL y cargarla en un iframe oculto
        const url = URL.createObjectURL(blob);
        urlRef.current = url;

        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.style.opacity = "0";
        iframe.setAttribute("aria-hidden", "true");
        iframe.src = url;
        iframeRef.current = iframe;

        document.body.appendChild(iframe);

        // 3) Esperar a que cargue y mandar a imprimir.
        //    IMPORTANTE: NO remover iframe/url hasta AFTERPRINT (si existe) o timeout.
        iframe.onload = () => {
          try {
            const w = iframe.contentWindow;
            if (!w) {
              toast.error("No se pudo abrir el documento para imprimir.");
              cleanup();
              return;
            }

            // algunos navegadores necesitan foco antes de print
            w.focus();

            // cleanup post impresión (cuando el browser lo soporte)
            // onafterprint a veces no dispara en iframes -> dejamos fallback timeout.
            w.onafterprint = () => {
              cleanup();
            };

            // Disparar impresión
            w.print();

            // Fallback: si onafterprint no ocurre, limpiamos después de 60s
            cleanupTimerRef.current = setTimeout(() => {
              cleanup();
            }, 60000);
          } catch (err) {
            console.error("[ImprimirFacturaTicket] Error al imprimir:", err);
            toast.error("Error al imprimir el ticket.");
            cleanup();
          }
        };
      } catch (err) {
        console.error("[ImprimirFacturaTicket] Error generando ticket:", err);
        toast.error("No se pudo generar el ticket para imprimir.");
        cleanup();
      }
    },
    [cliente, poliza, cuota, cleanup, pagoInfo]
  );

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={handlePrint}
      disabled={printing}
      className={[
        "inline-flex items-center justify-center gap-2",
        "rounded-2xl border px-4 py-2 text-sm font-extrabold",
        "bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800",
        printing ? "opacity-70 cursor-not-allowed" : "cursor-pointer",
        className,
      ].join(" ")}
      title="Imprimir factura en ticket térmico"
      aria-busy={printing ? "true" : "false"}
    >
      <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-white/70 ring-1 ring-black/10">
        <HiPrinter className="w-4 h-4" />
      </span>
      {printing ? "Imprimiendo…" : label}
    </motion.button>
  );
}