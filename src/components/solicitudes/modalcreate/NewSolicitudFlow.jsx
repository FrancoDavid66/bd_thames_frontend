// src/components/solicitudes/modalcreate/NewSolicitudFlow.jsx
import { useEffect, useState, useCallback } from "react";
import ResponsableManagerModal from "./ResponsableManagerModal";
import VerificadorDNIModal     from "./VerificadorDNIModal";
import CreateSolicitudModal    from "./CreateSolicitudModal";
import PagarCuotaModal         from "./PagarCuotaModal";
import EnviarReciboModal       from "./EnviarReciboModal";

/**
 * Flujo completo:
 *  1. ResponsableManagerModal  — elegir responsable
 *  2. VerificadorDNIModal      — verificar DNI del cliente ← NUEVO
 *  3. CreateSolicitudModal     — 4 pasos (cliente, póliza, fotos, solicitud)
 *  4. PagarCuotaModal          — pago de primera cuota
 *  5. EnviarReciboModal        — enviar comprobante por WhatsApp
 */
export default function NewSolicitudFlow({ open, onClose, companias = [], coberturas = [] }) {

  // ── Paso 1: responsable ──
  const [gateOpen,      setGateOpen]      = useState(false);
  const [responsableId, setResponsableId] = useState("");
  const [tipoSeguro,    setTipoSeguro]    = useState("ROBO");

  // ── Paso 2: verificador DNI ──
  const [verificadorOpen, setVerificadorOpen] = useState(false);

  // ── Paso 3: crear solicitud ──
  const [createOpen, setCreateOpen] = useState(false);

  // ── Pasos 4-5: post-creación ──
  const [pagarOpen,        setPagarOpen]        = useState(false);
  const [enviarOpen,       setEnviarOpen]        = useState(false);
  const [cuotaId,          setCuotaId]           = useState(null);
  const [montoSugerido,    setMontoSugerido]     = useState("");
  const [telefonoCliente,  setTelefonoCliente]   = useState("");
  const [facturaUrl,       setFacturaUrl]        = useState("");

  // ── Reset al abrir/cerrar ──
  useEffect(() => {
    if (open) {
      setGateOpen(true);
      setVerificadorOpen(false);
      setCreateOpen(false);
      setResponsableId("");
      setTipoSeguro("ROBO");
      setPagarOpen(false);
      setEnviarOpen(false);
      setCuotaId(null);
      setMontoSugerido("");
      setTelefonoCliente("");
      setFacturaUrl("");
    } else {
      setGateOpen(false);
      setVerificadorOpen(false);
      setCreateOpen(false);
      setPagarOpen(false);
      setEnviarOpen(false);
      setCuotaId(null);
    }
  }, [open]);

  // ── Cierre total ──
  const handleCloseAll = useCallback(() => {
    setGateOpen(false);
    setVerificadorOpen(false);
    setCreateOpen(false);
    setPagarOpen(false);
    setEnviarOpen(false);
    setCuotaId(null);
    onClose?.();
  }, [onClose]);

  // ── PASO 1 completado: responsable elegido → abrir verificador ──
  const handleGateSelected = useCallback(({ responsableId: rid, tipoSeguro: tseg }) => {
    setResponsableId(String(rid || ""));
    setTipoSeguro(tseg || "ROBO");
    setGateOpen(false);
    setVerificadorOpen(true);   // ← NUEVO: va al verificador, no al create
  }, []);

  // ── PASO 2 completado: verificación OK → abrir solicitud ──
  const handleVerificadorOk = useCallback(({ dni, clienteId, esAutoNuevo }) => {
    setVerificadorOpen(false);
    setCreateOpen(true);
    // dni y clienteId disponibles si los necesitamos pre-cargar en CreateSolicitudModal
  }, []);

  // ── PASO 2 cancelado ──
  const handleVerificadorCancel = useCallback(() => {
    setVerificadorOpen(false);
    handleCloseAll();
  }, [handleCloseAll]);

  // ── PASO 3 cerrado ──
  const handleCloseCreateOnly = useCallback(() => {
    setCreateOpen(false);
  }, []);

  // ── Helpers post-creación ──
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
    return `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(message || "")}`;
  };

  const pickMontoFromRaw = (raw) => {
    if (!raw) return "";
    if (raw.precio_cuota != null) return String(raw.precio_cuota);
    if (raw.poliza?.precio_cuota != null) return String(raw.poliza.precio_cuota);
    const c0 = raw.cuotas?.[0] || raw.poliza?.cuotas?.[0] || raw.poliza_cuotas?.[0] || null;
    if (c0?.monto != null) return String(c0.monto);
    return "";
  };

  // ── PASO 3 completado: solicitud creada ──
  const handleCreated = useCallback(
    ({ raw, primera_cuota_id, telefono }) => {
      setCuotaId(primera_cuota_id || null);
      setTelefonoCliente(telefono || "");
      setMontoSugerido(pickMontoFromRaw(raw));
      setCreateOpen(false);
      if (primera_cuota_id) setPagarOpen(true);
      else handleCloseAll();
    },
    [handleCloseAll]
  );

  // ── PASO 4: pagar cuota ──
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

  // ── PASO 5: enviar recibo ──
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
      {/* 1. Gate de Responsable */}
      {gateOpen && (
        <ResponsableManagerModal
          open={gateOpen}
          onCancel={handleCloseAll}
          onSelected={handleGateSelected}
        />
      )}

      {/* 2. Verificador de DNI ← NUEVO */}
      {verificadorOpen && (
        <VerificadorDNIModal
          open={verificadorOpen}
          onCancel={handleVerificadorCancel}
          onContinuar={handleVerificadorOk}
        />
      )}

      {/* 3. Crear solicitud */}
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

      {/* 4. Pagar primera cuota */}
      <PagarCuotaModal
        open={pagarOpen}
        onClose={() => { setPagarOpen(false); handleCloseAll(); }}
        onConfirm={onConfirmPagar}
        defaultMonto={montoSugerido}
        defaultFecha={new Date()}
      />

      {/* 5. Enviar comprobante */}
      <EnviarReciboModal
        open={enviarOpen}
        onClose={() => { setEnviarOpen(false); handleCloseAll(); }}
        onConfirm={onEnviarRecibo}
        telefono={telefonoCliente}
        previewUrl={facturaUrl}
      />
    </>
  );
}