// src/components/solicitudes/modalcreate/NewSolicitudFlow.jsx
import { useEffect, useState, useCallback } from "react";
import ResponsableManagerModal from "./ResponsableManagerModal";
import CreateSolicitudModal from "./CreateSolicitudModal";
import PagarCuotaModal from "./PagarCuotaModal";
import EnviarReciboModal from "./EnviarReciboModal";
// 🚀 NUEVO: Gate de verificación previa
import VerificarClienteGate from "./VerificarClienteGate";

/**
 * Flujo: Verificar Cliente → Responsable → CreateSolicitudModal → (post) Pagar 1ª cuota → (post) Enviar comprobante
 *
 * Props:
 * - open: boolean (mostrar/ocultar flujo completo)
 * - onClose: fn() (se llama cuando termina todo el flujo)
 * - onAsociarPolizaExistente: fn({ cliente_id, match }) → callback opcional para cuando
 *   el usuario decide asociar una nueva póliza a un cliente existente.
 * - companias, coberturas: listas a pasar al CreateSolicitudModal
 */
export default function NewSolicitudFlow({
  open,
  onClose,
  onAsociarPolizaExistente, // 🚀 NUEVO callback opcional
  companias = [],
  coberturas = [],
}) {
  // === 🚀 NUEVO: Gate de verificación ===
  const [verifyOpen, setVerifyOpen] = useState(false);

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
      // 🚀 Arranca en el gate de VERIFICACIÓN (no en el de responsable)
      setVerifyOpen(true);
      setGateOpen(false);
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
      setVerifyOpen(false);
      setGateOpen(false);
      setCreateOpen(false);
      setPagarOpen(false);
      setEnviarOpen(false);
      setCuotaId(null);
    }
  }, [open]);

  // 🚀 NUEVO: El usuario confirmó que es cliente nuevo → pasa al gate de responsable
  const handleVerifyConfirmedNuevo = useCallback(() => {
    setVerifyOpen(false);
    setGateOpen(true);
  }, []);

  // 🚀 NUEVO: El usuario decide asociar póliza a cliente existente → cierra todo y avisa al padre
  const handleAsociarPoliza = useCallback(
    ({ cliente_id, match }) => {
      setVerifyOpen(false);
      if (typeof onAsociarPolizaExistente === "function") {
        onAsociarPolizaExistente({ cliente_id, match });
      }
      onClose?.();
    },
    [onAsociarPolizaExistente, onClose]
  );

  // Selección de Responsable (segundo modal ahora)
  const handleGateSelected = useCallback(({ responsableId: rid, tipoSeguro: tseg }) => {
    setResponsableId(String(rid || ""));
    setTipoSeguro(tseg || "ROBO");
    setGateOpen(false);
    setCreateOpen(true);
  }, []);

  // Cerrar solo el modal de creación (sin cerrar el flujo global)
  const handleCloseCreateOnly = useCallback(() => {
    setCreateOpen(false);
  }, []);

  // Cierre total del flujo
  const handleCloseAll = useCallback(() => {
    setVerifyOpen(false);
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
    if (raw.precio_cuota != null) return String(raw.precio_cuota);
    if (raw.poliza?.precio_cuota != null) return String(raw.poliza.precio_cuota);
    const c0 =
      raw.cuotas?.[0] ||
      raw.poliza?.cuotas?.[0] ||
      raw.poliza_cuotas?.[0] ||
      null;
    if (c0?.monto != null) return String(c0.monto);
    return "";
  };

  // Hook que llega desde CreateSolicitudModal
  const handleCreated = useCallback(
    (payload) => {
      // 🚀 Si el modal nos avisa de "asociar a cliente existente", lo derivamos al padre
      if (payload?.__asociarPolizaExistente) {
        handleAsociarPoliza({
          cliente_id: payload.cliente_id,
          match: payload.match || null,
        });
        return;
      }

      const { raw, primera_cuota_id, telefono } = payload || {};
      setCuotaId(primera_cuota_id || null);
      setTelefonoCliente(telefono || "");
      setMontoSugerido(pickMontoFromRaw(raw));

      setCreateOpen(false);

      if (primera_cuota_id) {
        setPagarOpen(true);
      } else {
        handleCloseAll();
      }
    },
    [handleCloseAll, handleAsociarPoliza]
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

  const onEnviarRecibo = useCallback(
    ({ telefono }) => {
      const tel = telefono || telefonoCliente;
      const msg = `¡Hola! Te comparto el comprobante de pago de tu póliza:\n${facturaUrl}`;
      const url = buildWhatsAppUrl(tel, msg);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      setEnviarOpen(false);
      handleCloseAll();
    },
    [telefonoCliente, facturaUrl, handleCloseAll]
  );

  if (!open) return null;

  return (
    <>
      {/* 🚀 0) Gate de Verificación (NUEVO - primer paso) */}
      <VerificarClienteGate
        open={verifyOpen}
        onConfirmNuevo={handleVerifyConfirmedNuevo}
        onAsociarPoliza={handleAsociarPoliza}
        onCancel={handleCloseAll}
      />

      {/* 1) Gate de Responsable (sin cambios, ahora es el segundo paso) */}
      {gateOpen && (
        <ResponsableManagerModal
          open={gateOpen}
          onCancel={handleCloseAll}
          onSelected={handleGateSelected}
        />
      )}

      {/* 2) Modal de creación (recibe onCreated para post-flujo) */}
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