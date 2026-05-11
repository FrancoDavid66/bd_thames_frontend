/* src/components/pagos/DescargarFactura.jsx — Botón pill con ring/borde + generación PDF en front */
import { useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { HiDownload } from "react-icons/hi";
import FacturaCuotaPDF from "./FacturaCuotaPDF";

/* Utilidad para nombres de archivo limpios */
function slug(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

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
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
}

function fmtFull(dt) {
  const d = safeDateFromAny(dt);
  if (!d) return "";
  try {
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

function pickPagoInfo(cuota) {
  if (!cuota) return { pago_hm: "", pago_hm_full: "", pago_dt_iso: null };

  // Backend nuevo
  const pago_hm = (cuota.pago_hm || "").toString();
  const pago_hm_full = (cuota.pago_hm_full || "").toString();

  const dtIso = cuota.pago_registrado_en || null;
  const d = safeDateFromAny(dtIso);

  const hm = pago_hm || (d ? fmtHM(d) : "");
  const full = pago_hm_full || (d ? fmtFull(d) : "");

  return { pago_hm: hm, pago_hm_full: full, pago_dt_iso: dtIso };
}

/**
 * Props:
 * - cliente, poliza, cuota: objetos necesarios para construir el PDF
 * - className: estilos extra (se suman)
 * - label: texto del botón (default: "Recibo")
 * - tone: "neutral" | "primary" (default: "neutral")
 */
export default function DescargarFactura({
  cliente,
  poliza,
  cuota,
  className = "",
  label = "Descargar Factura",
  tone = "neutral",
}) {
  const [downloading, setDownloading] = useState(false);

  const pagoInfo = useMemo(() => pickPagoInfo(cuota), [cuota]);

  const handleDownload = async () => {
    if (!cliente || !poliza || !cuota) return;
    try {
      setDownloading(true);

      // 1) Construir el documento PDF en el FRONT
      // ✅ Le pasamos pago_hm/pago_hm_full para que el recibo muestre hora:minuto sin recalcular
      const doc = (
        <FacturaCuotaPDF
          cliente={cliente}
          poliza={poliza}
          cuota={cuota}
          pago_hm={pagoInfo.pago_hm}
          pago_hm_full={pagoInfo.pago_hm_full}
          pago_dt_iso={pagoInfo.pago_dt_iso}
        />
      );

      // 2) Render a Blob y descargar
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      // ✅ Nombre incluye hora/minuto del pago si existe (sino usa hora local actual)
      const hmForName =
        (pagoInfo.pago_hm || "").replace(":", "") ||
        (() => {
          const now = new Date();
          const hh = String(now.getHours()).padStart(2, "0");
          const mm = String(now.getMinutes()).padStart(2, "0");
          return `${hh}${mm}`;
        })();

      const nombre = `Factura_Cuota_${slug(cuota?.cuota_nro)}_${slug(
        poliza?.patente
      )}_${new Date().toISOString().slice(0, 10)}_${hmForName}.pdf`;

      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generando factura:", err);
      alert("No se pudo generar la factura. Intenta de nuevo.");
    } finally {
      setDownloading(false);
    }
  };

  // Estilos por tono (coherentes con tu tema minimal dark)
  const toneClasses =
    tone === "primary"
      ? "bg-primary-500 hover:bg-primary-400 text-white ring-1 ring-primary-400/40"
      : "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200";

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      aria-busy={downloading ? "true" : "false"}
      className={[
        "h-9 px-3 rounded-lg inline-flex items-center gap-2 transition-colors outline-none text-sm",
        "focus-visible:ring-2 focus-visible:ring-primary-400/60",
        toneClasses,
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
      title="Descargar factura (generada en tu dispositivo)"
    >
      <HiDownload className={downloading ? "animate-pulse" : ""} size={18} />
      {downloading ? "Generando…" : label}
    </button>
  );
}