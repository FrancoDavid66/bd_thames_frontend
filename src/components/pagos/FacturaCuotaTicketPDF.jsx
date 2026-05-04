// src/components/pagos/FacturaCuotaTicketPDF.jsx
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

const mmToPt = (mm) => (mm * 72) / 25.4;

const TICKET_WIDTH = mmToPt(80);
const TICKET_HEIGHT = mmToPt(480); 
const PAD_X = mmToPt(5);
const PAD_Y = mmToPt(8);

const safe = (v, d = "—") =>
  v === null || v === undefined || v === "" ? d : String(v);

/* ===== helpers fechas ===== */

const ymd = (d) => {
  if (!d) return "";
  const s = String(d).trim();
  if (!s) return "";
  return s.length >= 10 ? s.slice(0, 10) : s;
};

const fmtDateTimeHM = (d) => {
  if (!d) return "—";
  try {
    let dateObj;
    if (typeof d === "string" && d.length === 10) {
      dateObj = new Date(d + "T12:00:00");
    } else {
      dateObj = new Date(d);
    }
    if (Number.isNaN(dateObj.getTime())) return "—";

    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const mins = String(dateObj.getMinutes()).padStart(2, "0");

    const tieneHoraReal =
      dateObj.getHours() !== 12 || dateObj.getMinutes() !== 0;
    const horaTxt = tieneHoraReal ? ` ${hours}:${mins} hs` : "";

    return `${day}/${month}/${year}${horaTxt}`;
  } catch {
    return "—";
  }
};

const fmtDateOnly = (d) => {
  if (!d) return "—";
  try {
    const s = ymd(d);
    if (!s) return "—";
    const dt = new Date(s + "T12:00:00");
    if (Number.isNaN(dt.getTime())) return "—";
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "—";
  }
};

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

const isPagoAtrasado = (cuota) => {
  if (!cuota || !cuota.pagado) return false;
  const v = new Date(
    String(cuota.fecha_vencimiento).slice(0, 10) + "T00:00:00"
  );
  const ref = cuota.pago_registrado_en || cuota.fecha_pago || new Date();
  const pStr =
    typeof ref === "string"
      ? ref.slice(0, 10)
      : new Date(ref).toISOString().slice(0, 10);
  const p = new Date(pStr + "T00:00:00");
  return p.getTime() > v.getTime();
};

// 🚀 NUEVA FUNCIÓN: Suma 1 día (24hs)
const calcularDiaSiguiente = (refDate) => {
  const d = refDate ? new Date(refDate) : new Date();
  if (Number.isNaN(d.getTime())) return "—";
  d.setDate(d.getDate() + 1);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// Suma 48hs hábiles (salta fines de semana)
const calcularRehabilitacion = (refDate) => {
  const d = refDate ? new Date(refDate) : new Date();
  if (Number.isNaN(d.getTime())) return "—";
  let added = 0;
  while (added < 2) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++; 
  }
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const styles = StyleSheet.create({
  page: {
    width: TICKET_WIDTH,
    height: TICKET_HEIGHT,
    paddingHorizontal: PAD_X,
    paddingTop: PAD_Y,
    paddingBottom: PAD_Y,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#000",
    backgroundColor: "#fff",
  },
  header: { marginBottom: 10 },
  title: { fontSize: 16, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 9, textAlign: "center", marginTop: 3 },
  statusPill: {
    alignSelf: "center",
    paddingVertical: 3,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 6,
    marginTop: 8,
  },
  statusText: { fontSize: 12, fontWeight: "bold" },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginVertical: 10,
    borderStyle: "dashed",
  },
  block: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  label: { fontSize: 10, fontWeight: "bold", width: "58%" },
  value: { fontSize: 10, width: "42%", textAlign: "right", lineHeight: 1.25 },
  text: { fontSize: 10, lineHeight: 1.3 },
  table: { marginTop: 6, borderWidth: 1, borderColor: "#000" },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
  },
  tableHeaderText: { fontSize: 10, fontWeight: "bold" },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#000",
  },
  tableRowText: { fontSize: 10, lineHeight: 1.2 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 2,
    borderTopColor: "#000",
  },
  totalLabel: { fontSize: 12, fontWeight: "bold" },
  totalAmount: { fontSize: 12, fontWeight: "bold" },
  legalAlert: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 6,
  },
  legalTitle: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
    textDecoration: "underline",
    marginBottom: 8,
  },
  legalText: { fontSize: 9, textAlign: "justify", lineHeight: 1.35 },
  alertBold: { fontWeight: "bold" },
});

const FacturaCuotaTicketPDF = ({
  cliente = {},
  poliza = {},
  cuota = {},
  pago_hm_full,
  pago_dt_iso,
}) => {
  const titularFinal =
    `${safe(cliente.nombre || poliza.cliente_nombre, "")} ${safe(
      cliente.apellido || poliza.cliente_apellido,
      ""
    )}`.trim() || "—";

  const dniFinal = safe(
    cliente.dni_cuit_cuil || poliza.cliente_dni || cliente.dni
  );

  const marca = safe(poliza.marca || poliza.poliza__marca);
  const modelo = safe(poliza.modelo || poliza.poliza__modelo);
  const patente = safe(poliza.patente || poliza.poliza__patente);

  const cuotaNro = safe(cuota.cuota_nro);
  const monto = cuota.monto ?? cuota.total ?? 0;

  const fechaReferenciaPago = pago_dt_iso || cuota.pago_registrado_en || cuota.fecha_pago || new Date();
  
  const fechaHoraOperacion =
    (pago_hm_full && String(pago_hm_full).trim()) ||
    (cuota.pago_hm_full && String(cuota.pago_hm_full).trim()) ||
    fmtDateTimeHM(fechaReferenciaPago);

  const vencimientoActualTxt = fmtDateOnly(cuota.fecha_vencimiento);

  // 🚀 LÓGICA DE ALERTAS (Primera cuota vs Atrasado)
  const esPrimeraCuota = String(cuotaNro) === "1";
  const pagoFueraDeTermino = !esPrimeraCuota && isPagoAtrasado(cuota);
  
  const fechaDiaSiguiente = calcularDiaSiguiente(fechaReferenciaPago);
  const fechaRehabilitacion = calcularRehabilitacion(fechaReferenciaPago);

  return (
    <Document>
      <Page
        size={{ width: TICKET_WIDTH, height: TICKET_HEIGHT }}
        style={styles.page}
      >
        <View style={styles.header}>
          <Text style={styles.title}>COMPROBANTE DE PAGO</Text>
          <Text style={styles.subtitle}>
            Servicios Jurídicos y Seguros
          </Text>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>
            {cuota?.pagado ? "PAGADO" : "PENDIENTE"}
          </Text>
        </View>

        <View style={styles.hr} />

        <View style={styles.block}>
          <View style={styles.line}>
            <Text style={styles.label}>Fecha y Hora de Pago</Text>
            <Text style={styles.value}>{fechaHoraOperacion}</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.label}>Vencimiento Cuota</Text>
            <Text style={styles.value}>{vencimientoActualTxt}</Text>
          </View>
        </View>

        <View style={styles.hr} />

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Titular</Text>
          <Text style={styles.text}>{titularFinal}</Text>
          <Text style={[styles.text, { marginTop: 4 }]}>
            DNI / CUIT: {dniFinal}
          </Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Datos del Auto</Text>
          <Text style={styles.text}>
            {marca} {modelo}
          </Text>
          <Text style={[styles.text, { marginTop: 4 }]}>Patente: {patente}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>Concepto</Text>
            <Text style={styles.tableHeaderText}>Monto</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableRowText}>Cuota Nº {cuotaNro}</Text>
            <Text style={styles.tableRowText}>{fmtMoney(monto)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalAmount}>{fmtMoney(monto)}</Text>
          </View>
        </View>

        {/* 🚀 ALERTA PRIMERA CUOTA */}
        {esPrimeraCuota && (
          <View style={styles.legalAlert}>
            <Text style={styles.legalTitle}>INICIO DE COBERTURA</Text>
            <Text style={styles.legalText}>
              El cliente toma conocimiento de que su vehículo comenzará a tener cobertura a partir del <Text style={styles.alertBold}>día siguiente</Text> a la realización de este pago (Fecha estimada: <Text style={styles.alertBold}>{fechaDiaSiguiente}</Text>).
            </Text>
          </View>
        )}

        {/* 🚀 ALERTA PAGO ATRASADO (Cuota 2+) */}
        {pagoFueraDeTermino && (
          <View style={styles.legalAlert}>
            <Text style={styles.legalTitle}>PAGO FUERA DE TÉRMINO</Text>
            <Text style={styles.legalText}>
              El cliente acepta y confirma bajo juramento que <Text style={styles.alertBold}>NO ha tenido ningún siniestro ni reclamo</Text> en los días previos a este pago, durante los cuales la póliza se encontraba vencida.{"\n\n"}
              Asimismo, toma conocimiento de que la cobertura retomará su vigencia a partir del <Text style={styles.alertBold}>día siguiente o a las 48 horas hábiles</Text> de este pago (Fecha máxima estimada: <Text style={styles.alertBold}>{fechaRehabilitacion}</Text>), período en el cual <Text style={styles.alertBold}>TAMPOCO TENDRÁ COBERTURA</Text>.
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default FacturaCuotaTicketPDF;