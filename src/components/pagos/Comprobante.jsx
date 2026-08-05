// src/components/pagos/Comprobante.jsx
//
// 🧾 COMPROBANTE UNIFICADO (reemplaza a los 5 archivos viejos):
//   - FacturaCuota.jsx
//   - FacturaCuotaPDF.jsx
//   - FacturaCuotaTicketPDF.jsx
//   - DescargarFactura.jsx
//   - ImprimirFacturaTicket.jsx
//
// Este único archivo exporta TODO lo necesario para el comprobante de una cuota:
//
//   • <ComprobanteVista />        → vista en pantalla del recibo (para previsualizar,
//                                    la usa el portal del cliente).
//   • ComprobantePDF_A4           → documento PDF tamaño A4 (@react-pdf/renderer).
//   • ComprobantePDF_Ticket       → documento PDF tipo ticket térmico (80mm).
//   • <BotonDescargarPDF />       → botón que descarga el PDF A4.
//   • <BotonImprimirTicket />     → botón que manda el ticket a la impresora térmica.
//
// Todos reciben las mismas props: { cliente, poliza, cuota }.
//
// ⚠️ NOTA DE DISEÑO: los PDF (A4 + ticket) usan su propio StyleSheet de
//    @react-pdf con los colores de marca del recibo impreso. Eso NO se toca
//    (es el papel que se imprime, no la app). Solo los BOTONES y la vista en
//    pantalla usan el diseño Duo (claro/oscuro).

import { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { pdf, Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import {
  HiReceiptTax, HiUser, HiOfficeBuilding, HiCash, HiCalendar,
  HiDownload, HiPrinter,
} from "react-icons/hi";

/* =========================================================================
   Helpers compartidos
   ========================================================================= */

const safe = (v, d = "—") => (v === null || v === undefined || v === "" ? d : v);

const fmtMoney = (n) => {
  try {
    const num = Number(n || 0);
    return `AR$ ${num.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  } catch {
    return "AR$ 0,00";
  }
};

// DD/MM/YYYY (a prueba de fallos, sin depender de dayjs)
const fmtDateOnly = (d) => {
  if (!d) return "—";
  try {
    let dt;
    if (Object.prototype.toString.call(d) === "[object Date]") {
      dt = d;
    } else {
      const s = String(d).trim();
      dt = new Date(s.length === 10 ? s + "T12:00:00" : s);
    }
    if (Number.isNaN(dt.getTime())) return "—";
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${dt.getFullYear()}`;
  } catch {
    return "—";
  }
};

// DD/MM/YYYY HH:MM (muestra la hora solo si es real, no el 12:00 de relleno)
const fmtDateTimeHM = (d) => {
  if (!d) return "—";
  try {
    let dt;
    if (Object.prototype.toString.call(d) === "[object Date]") {
      dt = d;
    } else {
      const s = String(d).trim();
      dt = new Date(s.length === 10 ? s + "T12:00:00" : s);
    }
    if (Number.isNaN(dt.getTime())) return "—";
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    const hours = String(dt.getHours()).padStart(2, "0");
    const mins = String(dt.getMinutes()).padStart(2, "0");
    const tieneHoraReal = dt.getHours() !== 12 || dt.getMinutes() !== 0;
    const horaTxt = tieneHoraReal ? ` ${hours}:${mins} hs` : "";
    return `${day}/${month}/${year}${horaTxt}`;
  } catch {
    return "—";
  }
};

// ¿Se está pagando fuera de término? (para el aviso legal)
const isPagoAtrasado = (cuota) => {
  if (!cuota || !cuota.pagado) return false;
  try {
    const v = new Date(String(cuota.fecha_vencimiento).slice(0, 10) + "T00:00:00");
    const ref = cuota.pago_registrado_en || cuota.fecha_pago || new Date();
    const pStr = typeof ref === "string" ? ref.slice(0, 10) : new Date(ref).toISOString().slice(0, 10);
    const p = new Date(pStr + "T00:00:00");
    return p.getTime() > v.getTime();
  } catch {
    return false;
  }
};

// Día siguiente al pago (fecha de inicio de cobertura)
const diaSiguiente = (refDate) => {
  const d = refDate ? new Date(refDate) : new Date();
  if (Number.isNaN(d.getTime())) return "—";
  d.setDate(d.getDate() + 1);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const slug = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();

// Normaliza los datos que necesita cualquier formato, desde cliente/poliza/cuota.
function useDatosComprobante(cliente = {}, poliza = {}, cuota = {}) {
  return useMemo(() => {
    const titular =
      `${safe(cliente.nombre || poliza.cliente_nombre, "")} ${safe(cliente.apellido || poliza.cliente_apellido, "")}`.trim() || "—";
    const dni = safe(cliente.dni_cuit_cuil || poliza.cliente_dni || cliente.dni);
    const marca = safe(poliza.marca || poliza.poliza__marca);
    const modelo = safe(poliza.modelo || poliza.poliza__modelo);
    const patente = safe(poliza.patente || poliza.poliza__patente);
    const cuotaNro = safe(cuota.cuota_nro);
    const monto = cuota.monto ?? cuota.total ?? 0;
    const fechaPagoRef = cuota.pago_registrado_en || cuota.fecha_pago || new Date();
    const esPrimeraCuota = String(cuotaNro) === "1";
    const pagoFueraDeTermino = !esPrimeraCuota && isPagoAtrasado(cuota);

    return {
      titular, dni, marca, modelo, patente, cuotaNro, monto,
      fechaHoraPago: fmtDateTimeHM(fechaPagoRef),
      vencimiento: fmtDateOnly(cuota.fecha_vencimiento),
      fechaCobertura: diaSiguiente(fechaPagoRef),
      pagado: !!cuota.pagado,
      esPrimeraCuota,
      pagoFueraDeTermino,
    };
  }, [cliente, poliza, cuota]);
}

/* =========================================================================
   1) VISTA EN PANTALLA (HTML) — diseño Duo (claro/oscuro)
      La usa el portal del cliente para previsualizar el recibo.
   ========================================================================= */

export function ComprobanteVista({ cliente, poliza, cuota, ocultarNumeroPoliza = false }) {
  if (!cliente || !poliza || !cuota) return null;
  const d = useDatosComprobante(cliente, poliza, cuota);

  const Item = ({ label, value }) => (
    <li className="flex justify-between gap-2">
      <span className="text-suave dark:text-suave-dark">{label}:</span>
      <span className="font-black text-titulo dark:text-titulo-dark text-right">{value}</span>
    </li>
  );

  return (
    <div className="max-w-3xl mx-auto rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark overflow-hidden">
      {/* Header */}
      <div className="bg-duo-azul text-white px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/15">
            <HiReceiptTax className="w-6 h-6" />
          </span>
          <div className="leading-tight">
            <h1 className="text-base font-black">Comprobante de Pago de Cuota</h1>
            <p className="text-xs text-white/70 font-bold">Emitido el {fmtDateOnly(new Date())}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/70 font-bold">N°</p>
          <p className="text-base font-black font-mono">{String(cuota.id ?? "").padStart(6, "0")}</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-4">
            <div className="flex items-center gap-2 mb-2">
              <HiUser className="w-5 h-5 text-duo-azul" />
              <h2 className="font-black text-titulo dark:text-titulo-dark">Datos del Cliente</h2>
            </div>
            <ul className="text-sm space-y-1 font-bold">
              <Item label="Nombre" value={d.titular} />
              <Item label="DNI / CUIT" value={d.dni} />
              <Item label="Teléfono" value={safe(cliente.telefono)} />
            </ul>
          </section>

          <section className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-4">
            <div className="flex items-center gap-2 mb-2">
              <HiOfficeBuilding className="w-5 h-5 text-duo-azul" />
              <h2 className="font-black text-titulo dark:text-titulo-dark">Datos del Auto</h2>
            </div>
            <ul className="text-sm space-y-1 font-bold">
              {!ocultarNumeroPoliza && <Item label="Póliza N°" value={safe(poliza.numero_poliza)} />}
              <Item label="Compañía" value={safe(poliza.compania)} />
              <Item label="Cobertura" value={safe(poliza.cobertura)} />
              <Item label="Vehículo" value={`${d.marca} ${d.modelo}`} />
              <Item label="Patente" value={d.patente} />
            </ul>
          </section>
        </div>

        <section className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-4">
          <div className="flex items-center gap-2 mb-2">
            <HiCash className="w-5 h-5 text-duo-verde" />
            <h2 className="font-black text-titulo dark:text-titulo-dark">Detalle del Pago</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3">
              <p className="text-suave dark:text-suave-dark font-bold text-xs uppercase">Cuota</p>
              <p className="text-lg font-black">#{d.cuotaNro}</p>
            </div>
            <div className="rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3">
              <p className="text-suave dark:text-suave-dark font-bold text-xs uppercase">Monto</p>
              <p className="text-lg font-black text-duo-verde">{fmtMoney(d.monto)}</p>
            </div>
            <div className="rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3">
              <p className="text-suave dark:text-suave-dark font-bold text-xs uppercase">Estado</p>
              <p className="text-lg font-black">{d.pagado ? "Pagada" : "Pendiente"}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3">
              <p className="flex items-center gap-1 text-suave dark:text-suave-dark font-bold text-xs uppercase"><HiCalendar className="w-4 h-4" /> Vencimiento</p>
              <p className="font-black">{d.vencimiento}</p>
            </div>
            <div className="rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3">
              <p className="flex items-center gap-1 text-suave dark:text-suave-dark font-bold text-xs uppercase"><HiCalendar className="w-4 h-4" /> Fecha de pago</p>
              <p className="font-black">{d.pagado ? d.fechaHoraPago : "—"}</p>
            </div>
          </div>
        </section>

        {(d.esPrimeraCuota || d.pagoFueraDeTermino) && (
          <div className="rounded-2xl border-2 border-duo-azul/40 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-titulo dark:text-titulo-dark text-sm px-4 py-3">
            <p className="font-black uppercase text-xs tracking-wide mb-2 text-center text-duo-azul">
              Aviso Legal: Inicio de Cobertura
            </p>
            <p className="font-bold text-center">
              La cobertura comienza a partir del <strong>día siguiente</strong> a este pago
              (fecha estimada: <strong>{d.fechaCobertura}</strong>).
            </p>
          </div>
        )}

        <div className="text-center text-xs text-suave dark:text-suave-dark font-bold">Gracias por confiar en nosotros.</div>
      </div>
    </div>
  );
}

/* =========================================================================
   2) PDF A4 — documento @react-pdf  (StyleSheet de marca — NO se toca)
   ========================================================================= */

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PRIMARY = "#8B1E3F";
const PRIMARY_DARK = "#5E1329";
const BORDER = "#E6C9D2";
const MUTED_BG = "#FBEFF3";

const a4 = StyleSheet.create({
  page: { width: A4_WIDTH, height: A4_HEIGHT, fontFamily: "Helvetica", color: "#111827", padding: 35, fontSize: 11 },
  header: { borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: MUTED_BG, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 16 },
  headerTitle: { fontSize: 22, color: PRIMARY, textAlign: "center", fontWeight: "bold" },
  headerSubtitle: { fontSize: 11, color: PRIMARY_DARK, textAlign: "center", marginTop: 6 },
  grid2: { flexDirection: "row", gap: 16, marginBottom: 16 },
  col: { flex: 1 },
  box: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: PRIMARY, backgroundColor: "#FFF6F8", paddingVertical: 12, paddingHorizontal: 16 },
  boxLabel: { fontSize: 12, color: PRIMARY_DARK, fontWeight: "bold", textTransform: "uppercase" },
  boxValue: { fontSize: 16, color: PRIMARY, fontWeight: "bold" },
  section: { borderRadius: 8, borderWidth: 1, borderColor: BORDER, overflow: "hidden", flex: 1 },
  sectionHead: { backgroundColor: PRIMARY, color: "#fff", paddingVertical: 8, paddingHorizontal: 12, fontSize: 12, fontWeight: "bold", textTransform: "uppercase" },
  sectionBody: { padding: 12, backgroundColor: "#FFFFFF", flexGrow: 1 },
  label: { fontSize: 10, color: PRIMARY_DARK, fontWeight: "bold", marginTop: 8 },
  value: { fontSize: 11, marginTop: 3 },
  table: { marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: BORDER, overflow: "hidden", marginBottom: 16 },
  tableHeader: { flexDirection: "row", justifyContent: "space-between", backgroundColor: PRIMARY, color: "#fff", paddingVertical: 8, paddingHorizontal: 12, fontSize: 11, fontWeight: "bold" },
  tableRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", fontSize: 11 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 12, fontSize: 13, fontWeight: "bold", backgroundColor: "#FCF7F9" },
  alertBox: { marginTop: 16, borderRadius: 8, borderWidth: 1.5, borderColor: "#991B1B", backgroundColor: "#FEF2F2", padding: 16 },
  alertTitle: { fontSize: 13, color: "#991B1B", fontWeight: "bold", textAlign: "center", marginBottom: 10 },
  alertText: { fontSize: 11, color: "#991B1B", textAlign: "justify", lineHeight: 1.5 },
  alertBold: { fontWeight: "bold" },
});

export function ComprobantePDF_A4({ cliente = {}, poliza = {}, cuota = {} }) {
  const d = useDatosComprobante(cliente, poliza, cuota);
  return (
    <Document>
      <Page size={{ width: A4_WIDTH, height: A4_HEIGHT }} style={a4.page}>
        <View style={a4.header}>
          <Text style={a4.headerTitle}>COMPROBANTE DE PAGO</Text>
          <Text style={a4.headerSubtitle}>Servicios Jurídicos y Seguros</Text>
        </View>

        <View style={a4.grid2}>
          <View style={[a4.box, a4.col]}>
            <Text style={a4.boxLabel}>Fecha de Pago</Text>
            <Text style={a4.boxValue}>{d.fechaHoraPago}</Text>
          </View>
          <View style={[a4.box, a4.col]}>
            <Text style={a4.boxLabel}>Vencimiento</Text>
            <Text style={a4.boxValue}>{d.vencimiento}</Text>
          </View>
        </View>

        <View style={a4.grid2}>
          <View style={[a4.section, a4.col]}>
            <Text style={a4.sectionHead}>Titular</Text>
            <View style={a4.sectionBody}>
              <Text style={a4.label}>Nombre</Text>
              <Text style={a4.value}>{d.titular}</Text>
              <Text style={a4.label}>DNI / CUIT</Text>
              <Text style={a4.value}>{d.dni}</Text>
            </View>
          </View>
          <View style={[a4.section, a4.col]}>
            <Text style={a4.sectionHead}>Datos del Auto</Text>
            <View style={a4.sectionBody}>
              <Text style={a4.label}>Marca / Modelo</Text>
              <Text style={a4.value}>{d.marca} {d.modelo}</Text>
              <Text style={a4.label}>Patente</Text>
              <Text style={a4.value}>{d.patente}</Text>
            </View>
          </View>
        </View>

        <View style={a4.table}>
          <View style={a4.tableHeader}>
            <Text>Concepto</Text>
            <Text>Valor a Pagar</Text>
          </View>
          <View style={a4.tableRow}>
            <Text>Cuota N° {d.cuotaNro}</Text>
            <Text>{fmtMoney(d.monto)}</Text>
          </View>
          <View style={a4.totalRow}>
            <Text>TOTAL ABONADO</Text>
            <Text>{fmtMoney(d.monto)}</Text>
          </View>
        </View>

        {(d.esPrimeraCuota || d.pagoFueraDeTermino) && (
          <View style={a4.alertBox}>
            <Text style={a4.alertTitle}>AVISO LEGAL: INICIO DE COBERTURA</Text>
            <Text style={a4.alertText}>
              La cobertura comienza a partir del <Text style={a4.alertBold}>día siguiente</Text> a este pago
              (fecha de cobertura: <Text style={a4.alertBold}>{d.fechaCobertura}</Text>).
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

/* =========================================================================
   3) PDF TICKET TÉRMICO (80mm)  (StyleSheet de marca — NO se toca)
   ========================================================================= */

const mmToPt = (mm) => (mm * 72) / 25.4;
const TICKET_WIDTH = mmToPt(80);
const TICKET_HEIGHT = mmToPt(480);

const tk = StyleSheet.create({
  page: { width: TICKET_WIDTH, height: TICKET_HEIGHT, paddingHorizontal: mmToPt(5), paddingVertical: mmToPt(8), fontFamily: "Helvetica", fontSize: 11, color: "#000", backgroundColor: "#fff" },
  title: { fontSize: 16, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 9, textAlign: "center", marginTop: 3 },
  pill: { alignSelf: "center", paddingVertical: 3, paddingHorizontal: 14, borderWidth: 2, borderColor: "#000", borderRadius: 6, marginTop: 8 },
  pillText: { fontSize: 12, fontWeight: "bold" },
  hr: { borderBottomWidth: 1, borderBottomColor: "#000", marginVertical: 10, borderStyle: "dashed" },
  block: { marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", textTransform: "uppercase", marginBottom: 6 },
  line: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { fontSize: 10, fontWeight: "bold", width: "58%" },
  value: { fontSize: 10, width: "42%", textAlign: "right" },
  text: { fontSize: 10, lineHeight: 1.3 },
  table: { marginTop: 6, borderWidth: 1, borderColor: "#000" },
  tableHeader: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 8 },
  th: { fontSize: 10, fontWeight: "bold" },
  tableRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: "#000" },
  td: { fontSize: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 8, borderTopWidth: 2, borderTopColor: "#000" },
  totalLabel: { fontSize: 12, fontWeight: "bold" },
  legal: { marginTop: 14, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 2, borderColor: "#000", borderRadius: 6 },
  legalTitle: { fontSize: 11, fontWeight: "bold", textAlign: "center", textDecoration: "underline", marginBottom: 8 },
  legalText: { fontSize: 9, textAlign: "justify", lineHeight: 1.35 },
  bold: { fontWeight: "bold" },
});

export function ComprobantePDF_Ticket({ cliente = {}, poliza = {}, cuota = {} }) {
  const d = useDatosComprobante(cliente, poliza, cuota);
  return (
    <Document>
      <Page size={{ width: TICKET_WIDTH, height: TICKET_HEIGHT }} style={tk.page}>
        <View style={tk.block}>
          <Text style={tk.title}>COMPROBANTE DE PAGO</Text>
          <Text style={tk.subtitle}>Servicios Jurídicos y Seguros</Text>
        </View>

        <View style={tk.pill}>
          <Text style={tk.pillText}>{d.pagado ? "PAGADO" : "PENDIENTE"}</Text>
        </View>

        <View style={tk.hr} />

        <View style={tk.block}>
          <View style={tk.line}>
            <Text style={tk.label}>Fecha y Hora de Pago</Text>
            <Text style={tk.value}>{d.fechaHoraPago}</Text>
          </View>
          <View style={tk.line}>
            <Text style={tk.label}>Vencimiento Cuota</Text>
            <Text style={tk.value}>{d.vencimiento}</Text>
          </View>
        </View>

        <View style={tk.hr} />

        <View style={tk.block}>
          <Text style={tk.sectionTitle}>Titular</Text>
          <Text style={tk.text}>{d.titular}</Text>
          <Text style={[tk.text, { marginTop: 4 }]}>DNI / CUIT: {d.dni}</Text>
        </View>

        <View style={tk.block}>
          <Text style={tk.sectionTitle}>Datos del Auto</Text>
          <Text style={tk.text}>{d.marca} {d.modelo}</Text>
          <Text style={[tk.text, { marginTop: 4 }]}>Patente: {d.patente}</Text>
        </View>

        <View style={tk.table}>
          <View style={tk.tableHeader}>
            <Text style={tk.th}>Concepto</Text>
            <Text style={tk.th}>Monto</Text>
          </View>
          <View style={tk.tableRow}>
            <Text style={tk.td}>Cuota N° {d.cuotaNro}</Text>
            <Text style={tk.td}>{fmtMoney(d.monto)}</Text>
          </View>
          <View style={tk.totalRow}>
            <Text style={tk.totalLabel}>TOTAL</Text>
            <Text style={tk.totalLabel}>{fmtMoney(d.monto)}</Text>
          </View>
        </View>

        {(d.esPrimeraCuota || d.pagoFueraDeTermino) && (
          <View style={tk.legal}>
            <Text style={tk.legalTitle}>INICIO DE COBERTURA</Text>
            <Text style={tk.legalText}>
              La cobertura comienza a partir del <Text style={tk.bold}>día siguiente</Text> a este pago
              (fecha estimada: <Text style={tk.bold}>{d.fechaCobertura}</Text>).
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

/* =========================================================================
   4) BOTÓN: DESCARGAR PDF A4 — diseño Duo
   ========================================================================= */

export function BotonDescargarPDF({ cliente, poliza, cuota, label = "Descargar PDF", className = "" }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!cliente || !poliza || !cuota) return;
    try {
      setDownloading(true);
      const doc = <ComprobantePDF_A4 cliente={cliente} poliza={poliza} cuota={cuota} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const nombre = `Comprobante_Cuota_${slug(cuota?.cuota_nro)}_${slug(poliza?.patente)}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("Error generando comprobante PDF:", err);
      toast.error("No se pudo generar el comprobante.");
    } finally {
      setDownloading(false);
    }
  }, [cliente, poliza, cuota]);

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className={[
        "h-10 px-3 rounded-xl inline-flex items-center justify-center gap-2 text-sm font-black transition-colors",
        "bg-surface dark:bg-surface-dark hover:brightness-95 border-2 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
      title="Descargar comprobante en PDF"
    >
      <HiDownload className={downloading ? "animate-pulse" : ""} size={18} />
      {downloading ? "Generando…" : label}
    </button>
  );
}

/* =========================================================================
   5) BOTÓN: IMPRIMIR TICKET (impresora térmica de calor) — diseño Duo
   ========================================================================= */

export function BotonImprimirTicket({ cliente, poliza, cuota, label = "Imprimir ticket", className = "" }) {
  const [printing, setPrinting] = useState(false);
  const iframeRef = useRef(null);
  const urlRef = useRef(null);
  const timerRef = useRef(null);

  const cleanup = useCallback(() => {
    try {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (iframeRef.current) { iframeRef.current.onload = null; try { iframeRef.current.remove(); } catch {} iframeRef.current = null; }
      if (urlRef.current) { try { URL.revokeObjectURL(urlRef.current); } catch {} urlRef.current = null; }
    } finally {
      setPrinting(false);
    }
  }, []);

  const handlePrint = useCallback(async (e) => {
    e?.preventDefault?.();
    if (printing) return;
    const cli = cliente || poliza?.cliente || cuota?.poliza?.cliente;
    const pol = poliza || cuota?.poliza;
    if (!cli || !pol || !cuota) {
      toast.error("Faltan datos para imprimir el ticket.");
      return;
    }
    try {
      cleanup();
      setPrinting(true);
      const doc = <ComprobantePDF_Ticket cliente={cli} poliza={pol} cuota={cuota} />;
      const blob = await pdf(doc).toBlob();
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

      iframe.onload = () => {
        try {
          const w = iframe.contentWindow;
          if (!w) { toast.error("No se pudo abrir el documento para imprimir."); cleanup(); return; }
          w.focus();
          w.onafterprint = () => cleanup();
          w.print();
          timerRef.current = setTimeout(() => cleanup(), 60000);
        } catch (err) {
          console.error("[Comprobante] Error al imprimir:", err);
          toast.error("Error al imprimir el ticket.");
          cleanup();
        }
      };
    } catch (err) {
      console.error("[Comprobante] Error generando ticket:", err);
      toast.error("No se pudo generar el ticket.");
      cleanup();
    }
  }, [cliente, poliza, cuota, printing, cleanup]);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={handlePrint}
      disabled={printing}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2 text-xs font-black",
        "bg-surface dark:bg-surface-dark hover:brightness-95 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark",
        printing ? "opacity-70 cursor-not-allowed" : "cursor-pointer",
        className,
      ].join(" ")}
      title="Imprimir comprobante en impresora térmica (ticket)"
    >
      <HiPrinter className="w-4 h-4" />
      {printing ? "Imprimiendo…" : label}
    </motion.button>
  );
}

// Export por defecto: la vista (para imports simples tipo `import Comprobante from ...`)
export default ComprobanteVista;
