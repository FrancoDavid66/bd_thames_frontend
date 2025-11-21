/* src/components/pagos/DescargarFactura.jsx — Botón pill con ring/borde + generación PDF en front */
import { useState } from "react";
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

  const handleDownload = async () => {
    if (!cliente || !poliza || !cuota) return;
    try {
      setDownloading(true);

      // 1) Construir el documento PDF en el FRONT
      const doc = <FacturaCuotaPDF cliente={cliente} poliza={poliza} cuota={cuota} />;

      // 2) Render a Blob y descargar
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      const nombre = `Factura_Cuota_${slug(cuota?.cuota_nro)}_${slug(
        poliza?.patente
      )}_${new Date().toISOString().slice(0, 10)}.pdf`;

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
      : "bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white";

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      aria-busy={downloading ? "true" : "false"}
      className={[
        "h-11 px-4 rounded-2xl inline-flex items-center gap-2 transition outline-none",
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
