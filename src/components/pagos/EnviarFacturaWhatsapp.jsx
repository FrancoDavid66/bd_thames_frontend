// src/components/pagos/EnviarFacturaWhatsapp.jsx
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
   - Si ya viene con 549... lo deja igual.
   - Si no puede, devuelve null y usamos fallback genérico. */
function toWhatsappPhoneAR(raw) {
  const digits = String(raw || "").replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `549${digits}`;
  if (digits.startsWith("54") && !digits.startsWith("549")) {
    return `549${digits.slice(2)}`;
  }
  if (digits.startsWith("549")) return digits;
  return null;
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(
    navigator.userAgent || ""
  );
}

export default function EnviarFacturaWhatsapp({
  cuota,
  cliente: clienteProp,
  poliza: polizaProp,
  className = "",
  mensajePersonalizado, // opcional
}) {
  const [sending, setSending] = useState(false);

  // Intentamos resolver cliente y póliza desde la cuota para mantener compatibilidad
  const poliza = polizaProp || cuota?.poliza;
  const cliente =
    clienteProp ||
    cuota?.cliente ||
    poliza?.cliente ||
    cuota?.titular ||
    cuota?.asegurado;

  const handleShare = async () => {
    if (!cuota || !poliza || !cliente) {
      alert("Faltan datos de cliente/póliza/cuota para generar la factura.");
      return;
    }

    try {
      setSending(true);

      // 1) Generar el PDF en memoria
      const doc = (
        <FacturaCuotaPDF cliente={cliente} poliza={poliza} cuota={cuota} />
      );
      const blob = await pdf(doc).toBlob();

      const nombre = `Factura_Cuota_${slug(cuota?.cuota_nro)}_${slug(
        poliza?.patente || poliza?.dominio || ""
      )}_${new Date().toISOString().slice(0, 10)}.pdf`;

      const file = new File([blob], nombre, { type: "application/pdf" });

      // Datos para el mensaje
      const nombreCliente =
        cliente?.nombre ||
        cliente?.nombre_apellido ||
        cliente?.razon_social ||
        cliente?.apellido_nombre;

      const saludo = nombreCliente ? `Hola ${nombreCliente}, ` : "Hola, ";

      const baseMsg =
        mensajePersonalizado ||
        `te envío el recibo de la cuota ${cuota?.cuota_nro} de la póliza de ${
          poliza?.patente || poliza?.dominio
        }.`;

      const mensajeCompleto = `${saludo}${baseMsg}`;

      // Teléfono del cliente
      const telefonoCliente =
        cliente?.telefono ||
        cliente?.celular ||
        poliza?.cliente?.telefono ||
        poliza?.cliente?.celular ||
        cuota?.telefono;

      const waPhone = toWhatsappPhoneAR(telefonoCliente);

      // 🔁 COPIAR SIEMPRE EL NÚMERO AL PORTAPAPELES (PC y CELU)
      if (waPhone && navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(waPhone);
          console.log("Número copiado al portapapeles:", waPhone);
        } catch (e) {
          console.warn("No se pudo copiar al portapapeles:", e);
        }
      }

      const mobile = isMobileDevice();

      // 2) En CELULAR: usar Web Share con el PDF adjunto
      if (
        mobile &&
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: nombre,
          text: mensajeCompleto,
        });
        setSending(false);
        return;
      }

      // 3) Fallback (PC o navegadores sin Web Share):
      //    - Descargamos el PDF
      //    - Abrimos WhatsApp con el mensaje de texto (número ya está en clipboard)
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      if (waPhone) {
        const waText = encodeURIComponent(mensajeCompleto);
        const waUrl = `https://api.whatsapp.com/send?phone=${waPhone}&text=${waText}`;
        window.open(waUrl, "_blank", "noopener,noreferrer");
      } else {
        alert(
          "No se encontró un teléfono válido del cliente. El PDF igual se descargó; podés adjuntarlo manualmente."
        );
      }
    } catch (err) {
      console.error("Error al preparar la factura para WhatsApp:", err);
      alert("No se pudo preparar la factura. Intentá de nuevo.");
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
