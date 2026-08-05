// src/components/cotizaciones/CotizacionPDFTemplate.jsx  (diseño Duo limpio · rojo THAMES)
// Documento A4 para imprimir: fondo claro siempre (no usa tema oscuro).
import React from "react";
import { FaCar, FaPhoneAlt, FaShieldAlt } from "react-icons/fa";
import { HiCheckCircle, HiClock } from "react-icons/hi";

const parseToNumber = (val) => {
  if (val === "" || val === null || val === undefined) return 0;
  return Number(String(val).replace(/\./g, "").replace(",", "."));
};

// Colores fijos del documento (no tokens: es imprimible).
const ROJO = "#e11d48";
const ROJO_FUERTE = "#be123c";
const TINTA = "#0f172a";
const GRIS = "#64748b";
const LINEA = "#e2e8f0";
const CREMA = "#f8fafc";
const AMBAR = "#d97706";
const OK = "#059669";

const CotizacionPDFTemplate = ({ formData, opciones, companiasBackend, coberturasBackend }) => {
  // Precio EXACTO (sin redondeo). El "monto" ya es el precio al cliente.
  const opcionesCalculadas = [...opciones].map(op => {
    const precio = op.precio_cliente != null ? Number(op.precio_cliente) : parseToNumber(op.monto);
    const suma = op.suma_asegurada != null && op.suma_asegurada !== "" ? parseToNumber(op.suma_asegurada) : 0;
    return { ...op, precioCalculado: precio, sumaCalculada: suma };
  }).sort((a, b) => {
    // La recomendada primero; luego por precio ascendente.
    if (a.es_recomendada && !b.es_recomendada) return -1;
    if (!a.es_recomendada && b.es_recomendada) return 1;
    return a.precioCalculado - b.precioCalculado;
  });

  const nombreCia = (op) => companiasBackend.find(c => String(c.id) === String(op.compania_id))?.nombre || "Compañía";
  const nombreCob = (op) => coberturasBackend.find(c => String(c.id) === String(op.cobertura_id))?.nombre || "Cobertura";

  return (
    <div
      id="pdf-quote-content"
      className="bg-white w-[794px] min-h-[1123px] mx-auto flex flex-col font-sans overflow-hidden relative"
      style={{ color: TINTA }}
    >
      {/* barra roja superior */}
      <div style={{ height: 8, background: ROJO }} />

      {/* ===== HEADER limpio ===== */}
      <div className="px-10 pt-8 pb-6" style={{ borderBottom: `3px solid ${LINEA}` }}>
        <div className="flex justify-between items-center">
          <div className="text-3xl font-black tracking-tight" style={{ color: TINTA }}>
            THAMES <span style={{ color: ROJO }}>Seguros</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: GRIS }}>Fecha de propuesta</p>
            <p className="text-lg font-black" style={{ color: TINTA }}>{new Date().toLocaleDateString("es-AR")}</p>
          </div>
        </div>
        <p className="text-[11px] font-black uppercase tracking-widest mt-6" style={{ color: ROJO }}>Propuesta preparada para</p>
        <h2 className="text-[40px] font-black leading-none mt-1" style={{ color: TINTA }}>{formData.cliente_nombre || "Cliente"}</h2>
      </div>

      {/* ===== DATOS cliente + vehículo ===== */}
      <div className="flex gap-3 px-10 pt-6">
        <div className="flex-1 rounded-2xl p-4" style={{ border: `2px solid ${LINEA}`, background: CREMA }}>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: GRIS }}>Contacto</p>
          <p className="text-xl font-black mt-1" style={{ color: TINTA }}>{formData.cliente_nombre}</p>
          <p className="text-sm font-bold mt-1.5 flex items-center gap-2" style={{ color: GRIS }}>
            <FaPhoneAlt size={11} style={{ color: ROJO }} /> {formData.telefono || "Sin teléfono registrado"}
          </p>
        </div>
        <div className="flex-1 rounded-2xl p-4" style={{ border: `2px solid ${LINEA}`, background: CREMA }}>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: GRIS }}>Vehículo</p>
          <p className="text-xl font-black mt-1 flex items-center gap-2" style={{ color: TINTA }}>
            <FaCar style={{ color: ROJO }} /> {formData.marca_auto} {formData.modelo_auto}
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg" style={{ border: `2px solid ${LINEA}`, background: "#fff", color: GRIS }}>Año {formData.anio_auto}</span>
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg" style={{ border: `2px solid ${formData.tiene_gnc ? "#fecdd3" : LINEA}`, background: formData.tiene_gnc ? "#fff1f2" : "#fff", color: formData.tiene_gnc ? ROJO : GRIS }}>
              {formData.tiene_gnc ? "✓ GNC" : "Particular"}
            </span>
          </div>
        </div>
      </div>

      {/* ===== OPCIONES ===== */}
      <div className="px-10 pt-6 flex-1">
        <p className="text-[11px] font-black uppercase tracking-widest mb-4 flex items-center gap-3" style={{ color: GRIS }}>
          Opciones de cobertura
          <span className="flex-1 h-0.5" style={{ background: LINEA }} />
        </p>

        <div className="space-y-4">
          {opcionesCalculadas.map((op, idx) => {
            const rec = op.es_recomendada;
            const beneficios = (op.detalles_cobertura || []);
            return (
              <div key={idx} className="rounded-2xl overflow-hidden" style={{ border: `${rec ? 3 : 2}px solid ${rec ? AMBAR : LINEA}`, background: "#fff" }}>
                {/* barra superior de la opción */}
                <div className="flex justify-between items-center px-4 py-2.5" style={{ background: rec ? "#fffbeb" : CREMA, borderBottom: `2px solid ${rec ? "#fde68a" : LINEA}` }}>
                  <span className="text-[17px] font-black" style={{ color: TINTA }}>{nombreCia(op).toUpperCase()}</span>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white" style={{ background: rec ? AMBAR : ROJO }}>
                    {rec ? "★ Nuestra Recomendación" : "Opción"}
                  </span>
                </div>
                {/* cuerpo */}
                <div className="flex justify-between items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-black" style={{ color: TINTA }}>{nombreCob(op)}</p>
                    {beneficios.length > 0 && (
                      <p className="text-[11px] font-semibold mt-1 leading-snug" style={{ color: GRIS }}>{beneficios.join(" • ")}</p>
                    )}
                    {/* Suma asegurada inteligente */}
                    {op.sumaCalculada > 0 ? (
                      <span className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-black px-2.5 py-1 rounded-lg" style={{ color: OK, border: `2px solid #a7f3d0`, background: "#ecfdf5" }}>
                        <FaShieldAlt size={9} /> Suma asegurada: ${op.sumaCalculada.toLocaleString("es-AR")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-black px-2.5 py-1 rounded-lg" style={{ color: GRIS, border: `2px solid ${LINEA}`, background: CREMA }}>
                        ℹ️ Por ser R.C. no lleva suma asegurada
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: GRIS }}>Precio</p>
                    <p className="text-[30px] font-black leading-none" style={{ color: rec ? AMBAR : TINTA, fontFamily: "ui-monospace, monospace" }}>
                      ${op.precioCalculado.toLocaleString("es-AR")}
                    </p>
                    <p className="text-[10px] font-bold" style={{ color: GRIS }}>por mes</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== AVISO 24 HS ===== */}
      <div className="mx-10 mt-6 rounded-2xl px-5 py-4 flex items-center gap-4" style={{ background: ROJO, boxShadow: `0 6px 0 ${ROJO_FUERTE}` }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.2)" }}>
          <HiClock size={26} className="text-white" />
        </div>
        <div>
          <p className="text-[14px] font-black text-white uppercase tracking-wide">Esta propuesta vale por 24 horas</p>
          <p className="text-[11px] font-bold text-white mt-0.5 leading-snug" style={{ opacity: 0.9 }}>
            Los precios de las aseguradoras se actualizan seguido. Pasado ese plazo pueden cambiar — reconfirmá con tu asesor.
          </p>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <div className="px-10 py-5 mt-6 flex justify-between items-end" style={{ borderTop: `3px solid ${LINEA}`, background: CREMA }}>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ color: GRIS }}>Tu Productor Asesor</p>
          <p className="text-[13px] font-black flex items-center gap-2" style={{ color: TINTA }}>
            <FaPhoneAlt style={{ color: ROJO }} /> +54 9 11 2424-8190
          </p>
        </div>
        <p className="text-[10px] font-bold text-right max-w-[220px]" style={{ color: GRIS }}>
          La cotización está sujeta a inspección previa del vehículo.
        </p>
      </div>
    </div>
  );
};

export default CotizacionPDFTemplate;
