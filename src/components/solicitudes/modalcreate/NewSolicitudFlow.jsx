// src/components/solicitudes/modalcreate/NewSolicitudFlow.jsx
import { useEffect, useState, useCallback } from "react";
import ResponsableManagerModal from "./ResponsableManagerModal";
import CreateSolicitudModal from "./CreateSolicitudModal";
import PagarCuotaModal from "./PagarCuotaModal";
import EnviarReciboModal from "./EnviarReciboModal";

/**
 * Flujo: Responsable → CreateSolicitudModal → (post) Pagar 1ª cuota → (post) Enviar comprobante
 *
 * Props:
 * - open: boolean (mostrar/ocultar flujo completo)
 * - onClose: fn() (se llama cuando termina todo el flujo)
 * - companias, coberturas: listas a pasar al CreateSolicitudModal
 */
export default function NewSolicitudFlow({ open, onClose, companias = [], coberturas = [] }) {
  // === Modales de creación (UX original) ===
  const [gateOpen, setGateOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [responsableId, setResponsableId] = useState("");
  const [tipoSeguro, setTipoSeguro] = useState("ROBO");

  // === Modales post-creación (pago + enviar) ===
  const [pagarOpen, setPagarOpen] = useState(false);
  const [enviarOpen, setEnviarOpen] = useState(false);
  const [cuotaId, setCuotaId] = useState(null);
  const [montoSugerido, setMontoSugerido] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [facturaUrl, setFacturaUrl] = useState("");

  // Al abrir/cerrar el flujo global
  useEffect(() => {
    if (open) {
      // arranca en el gate de Responsable
      setGateOpen(true);
      setCreateOpen(false);
      setResponsableId("");
      setTipoSeguro("ROBO");

      // asegurar que los post-modals estén cerrados
      setPagarOpen(false);
      setEnviarOpen(false);
      setCuotaId(null);
      setMontoSugerido("");
      setTelefonoCliente("");
      setFacturaUrl("");
    } else {
      setGateOpen(false);
      setCreateOpen(false);
      setPagarOpen(false);
      setEnviarOpen(false);
      setCuotaId(null);
    }
  }, [open]);

  // Selección de Responsable (primer modal)
  const handleGateSelected = useCallback(({ responsableId: rid, tipoSeguro: tseg }) => {
    setResponsableId(String(rid || ""));
    setTipoSeguro(tseg || "ROBO");
    setGateOpen(false);
    setCreateOpen(true);
  }, []);

  // Cerrar solo el modal de creación (sin cerrar el flujo global)
  const handleCloseCreateOnly = useCallback(() => {
    setCreateOpen(false);
    // Si no hay post-flujo, dejamos al usuario acá; si hay, se abrirán los otros modales.
  }, []);

  // Cierre total del flujo
  const handleCloseAll = useCallback(() => {
    setGateOpen(false);
    setCreateOpen(false);
    setPagarOpen(false);
    setEnviarOpen(false);
    setCuotaId(null);
    onClose?.();
  }, [onClose]);

  // ====== Utils post-creación ======
  const getFacturaUrl = (id) => (id ? `/api/cuotas/${id}/factura` : "");

  const toWhatsE164 = (raw) => {
    let d = String(raw || "").replace(/[^\d+]/g, "");
    if (!d) return "";
    if (!d.startsWith("+")) {
      if (d.startsWith("0")) d = d.slice(1);
      if (!d.startsWith("54")) d = `54${d}`;
      d = `+${d}`;
    }
    return d;
  };

  const buildWhatsAppUrl = (rawPhone, message) => {
    const phone = toWhatsE164(rawPhone);
    if (!phone) return null;
    const text = encodeURIComponent(message || "");
    return `https://wa.me/${encodeURIComponent(phone)}?text=${text}`;
  };

  // Robust pickers desde la respuesta cruda (raw) del backend
  const pickMontoFromRaw = (raw) => {
    if (!raw) return "";
    // Preferir precio_cuota directo si viene
    if (raw.precio_cuota != null) return String(raw.precio_cuota);
    if (raw.poliza?.precio_cuota != null) return String(raw.poliza.precio_cuota);
    // Si la primera cuota trae monto, usarlo
    const c0 =
      raw.cuotas?.[0] ||
      raw.poliza?.cuotas?.[0] ||
      raw.poliza_cuotas?.[0] ||
      null;
    if (c0?.monto != null) return String(c0.monto);
    return "";
  };

  // Hook que llega desde CreateSolicitudModal (nuevo onCreated soportado)
  const handleCreated = useCallback(
    ({ raw, primera_cuota_id, telefono }) => {
      // guardar datos para post-flujo
      setCuotaId(primera_cuota_id || null);
      setTelefonoCliente(telefono || "");
      setMontoSugerido(pickMontoFromRaw(raw));

      // cerrar SOLO el modal de creación
      setCreateOpen(false);

      // si hay cuota, abrir pagar; si no, cerrar todo
      if (primera_cuota_id) {
        setPagarOpen(true);
      } else {
        handleCloseAll();
      }
    },
    [handleCloseAll]
  );

  // PATCH pagar cuota
  async function pagarCuota(id, body) {
    const res = await fetch(`/api/cuotas/${id}/pagar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `Error ${res.status}`);
    }
    return res.json().catch(() => ({}));
  }

  // Confirmar PAGO → abrir “Enviar comprobante”
  const onConfirmPagar = useCallback(
    async ({ monto, forma_pago, fecha_pago }) => {
      if (!cuotaId) return;
      await pagarCuota(cuotaId, { monto, forma_pago, fecha_pago });
      setFacturaUrl(getFacturaUrl(cuotaId));
      setPagarOpen(false);
      setEnviarOpen(true);
    },
    [cuotaId]
  );

  // Confirmar ENVIAR → abrir WhatsApp y cerrar todo
  const onEnviarRecibo = useCallback(
    ({ telefono }) => {
      const tel = telefono || telefonoCliente;
      const msg = `¡Hola! Te comparto el comprobante de pago de tu póliza:\n${facturaUrl}`;
      const url = buildWhatsAppUrl(tel, msg);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      // cerrar flujo completo
      setEnviarOpen(false);
      handleCloseAll();
    },
    [telefonoCliente, facturaUrl, handleCloseAll]
  );

  if (!open) return null;

  return (
    <>
      {/* 1) Gate de Responsable (sin cambios) */}
      {gateOpen && (
        <ResponsableManagerModal
          open={gateOpen}
          onCancel={handleCloseAll}
          onSelected={handleGateSelected}
        />
      )}

      {/* 2) Modal de creación (sin unificar; recibe onCreated para post-flujo) */}
      {createOpen && (
        <CreateSolicitudModal
          onClose={handleCloseCreateOnly}
          onCreated={handleCreated}
          companias={companias}
          coberturas={coberturas}
          initialResponsableId={responsableId}
          initialTipoSeguro={tipoSeguro}
          skipResponsableGate
        />
      )}

      {/* 3) Post-creación: Pagar 1ª cuota */}
      <PagarCuotaModal
        open={pagarOpen}
        onClose={() => {
          // si cancela aquí, cierro todo el flujo
          setPagarOpen(false);
          handleCloseAll();
        }}
        onConfirm={onConfirmPagar}
        defaultMonto={montoSugerido}
        defaultFecha={new Date()}
      />

      {/* 4) Post-creación: Enviar comprobante por WhatsApp */}
      <EnviarReciboModal
        open={enviarOpen}
        onClose={() => {
          // si cancela aquí, cierro todo igual
          setEnviarOpen(false);
          handleCloseAll();
        }}
        onConfirm={onEnviarRecibo}
        telefono={telefonoCliente}
        previewUrl={facturaUrl}
      />
    </>
  );
}
