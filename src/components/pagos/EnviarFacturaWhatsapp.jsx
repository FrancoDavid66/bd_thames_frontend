/* src/components/pagos/EnviarFacturaWhatsapp.jsx — Agrega este archivo completo */
import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { HiShare } from "react-icons/hi";
import FacturaCuotaPDF from "./FacturaCuotaPDF";

/* Helpers */
function slug(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

/* Formatea teléfonos AR a algo razonable para whatsapp://send?phone=
   - Si viene 10 dígitos (ej: 11xxxxxxxx), antepone 549 (AR móvil).
   - Si ya viene con 54..., intenta dejar 549...
   - Si no puede, devuelve null y usaremos fallback genérico. */
function toWhatsappPhoneAR(raw) {
  const digits = String(raw || "").replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `549${digits}`;
  if (digits.startsWith("54") && !digits.startsWith("549")) return `549${digits.slice(2)}`;
  if (digits.startsWith("549")) return digits;
  return null;
}

export default function EnviarFacturaWhatsapp({
  cliente,
  poliza,
  cuota,
  className = "",
  mensajePersonalizado, // opcional
}) {
  const [sending, setSending] = useState(false);

  const handleShare = async () => {
    if (!cliente || !poliza || !cuota) return;

    try {
      setSending(true);

      // 1) Generar el PDF en memoria
      const doc = <FacturaCuotaPDF cliente={cliente} poliza={poliza} cuota={cuota} />;
      const blob = await pdf(doc).toBlob();

      const nombre = `Factura_Cuota_${slug(cuota?.cuota_nro)}_${slug(poliza?.patente)}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;

      const file = new File([blob], nombre, { type: "application/pdf" });

      // Mensaje sugerido
      const baseMsg =
        mensajePersonalizado ||
        `Factura por servicios jurídicos y seguros – Cuota ${cuota?.cuota_nro} (${poliza?.patente}).`;

      // 2) Si el navegador soporta compartir archivos (móviles)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: nombre,
          text: baseMsg,
        });
        return;
      }

      // 3) Fallback (desktop): descargar y abrir WhatsApp con mensaje prellenado
      //    *Advertencia*: WhatsApp Web NO permite adjuntar archivo por link; el usuario tendrá que adjuntarlo manualmente.
      //    Descargamos el PDF para que lo tenga a mano:
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Intento de abrir WhatsApp con el contacto del cliente, si hay teléfono usable:
      const waPhone = toWhatsappPhoneAR(cliente?.telefono);
      const waText = encodeURIComponent(baseMsg + " Te adjunto el PDF que acabo de descargar.");
      const waUrl = waPhone
        ? `https://api.whatsapp.com/send?phone=${waPhone}&text=${waText}`
        : `https://api.whatsapp.com/send?text=${waText}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Error al compartir por WhatsApp:", err);
      alert("No se pudo compartir por WhatsApp. Intentá de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={sending}
      className={
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold " +
        "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 " +
        className
      }
      title="Enviar por WhatsApp"
    >
      <HiShare size={18} />
      {sending ? "Preparando…" : "Enviar por WhatsApp"}
    </button>
  );
}
