// src/components/pagos/FacturaCuotaPDF.jsx
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

/* Tamaño A4 (una sola hoja) en puntos */
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

/* Paleta bordó y alertas */
const PRIMARY = "#8B1E3F";
const PRIMARY_DARK = "#5E1329";
const BORDER = "#E6C9D2";
const TEXT = "#111827";
const MUTED_BG = "#FBEFF3";
const ALERT_BG = "#FEF2F2";
const ALERT_TEXT = "#991B1B";

/* Utils */
const safe = (v, d = "—") =>
  v === null || v === undefined || v === "" ? d : String(v);

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

    const tieneHoraReal = dateObj.getHours() !== 12 || dateObj.getMinutes() !== 0;
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
  const v = new Date(String(cuota.fecha_vencimiento).slice(0, 10) + "T00:00:00");
  const ref = cuota.pago_registrado_en || cuota.fecha_pago || new Date();
  const pStr =
    typeof ref === "string"
      ? ref.slice(0, 10)
      : new Date(ref).toISOString().slice(0, 10);
  const p = new Date(pStr + "T00:00:00");
  return p.getTime() > v.getTime();
};

// 🚀 NUEVA FUNCIÓN: Suma 48hs hábiles (salta fines de semana)
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
    width: A4_WIDTH,
    height: A4_HEIGHT,
    fontFamily: "Helvetica",
    color: TEXT,
    paddingTop: 28,
    paddingHorizontal: 28,
    paddingBottom: 22,
    fontSize: 11,
  },
  header: {
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: BORDER,
    backgroundColor: MUTED_BG,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    color: PRIMARY,
    textAlign: "center",
    letterSpacing: 0.5,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 10,
    color: PRIMARY_DARK,
    textAlign: "center",
    marginTop: 4,
  },
  dueBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    backgroundColor: "#FFF6F8",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  dueLabel: {
    fontSize: 12,
    color: PRIMARY_DARK,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  dueValue: {
    fontSize: 16,
    color: PRIMARY,
    fontWeight: "bold",
  },
  grid2: { flexDirection: "row", gap: 12, marginBottom: 12 },
  col: { flexGrow: 1, flexBasis: 0 },
  section: {
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: BORDER,
    overflow: "hidden",
  },
  sectionHead: {
    backgroundColor: PRIMARY,
    color: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  sectionBody: { padding: 10, backgroundColor: "#FFFFFF" },
  label: { fontSize: 10, color: PRIMARY_DARK, fontWeight: "bold", marginTop: 6 },
  value: { fontSize: 11, marginTop: 2 },
  table: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: BORDER,
    overflow: "hidden",
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: PRIMARY,
    color: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    fontSize: 11,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: "bold",
    backgroundColor: "#FCF7F9",
  },
  alertBox: {
    marginTop: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: ALERT_TEXT,
    backgroundColor: ALERT_BG,
    padding: 14,
  },
  alertTitle: {
    fontSize: 13,
    color: ALERT_TEXT,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  alertText: {
    fontSize: 11,
    color: ALERT_TEXT,
    textAlign: "justify",
    lineHeight: 1.4,
  },
  alertBold: {
    fontWeight: "bold",
  },
});

const FacturaCuotaPDF = ({
  cliente = {},
  poliza = {},
  cuota = {},
  pago_hm,
  pago_hm_full,
  pago_dt_iso,
}) => {
  const titularFinal =
    `${safe(cliente.nombre || poliza.cliente_nombre, "")} ${safe(
      cliente.apellido || poliza.cliente_apellido,
      ""
    )}`.trim() || "—";
  const dniFinal = safe(cliente.dni_cuit_cuil || poliza.cliente_dni || cliente.dni);
  const marca = safe(poliza.marca || poliza.poliza__marca);
  const modelo = safe(poliza.modelo || poliza.poliza__modelo);
  const patente = safe(poliza.patente || poliza.poliza__patente);

  const cuotaNro = safe(cuota.cuota_nro);
  const monto = cuota.monto || 0;

  const fechaReferenciaPago = pago_dt_iso || cuota.pago_registrado_en || cuota.fecha_pago || new Date();

  const fechaHoraOperacion =
    (pago_hm_full && String(pago_hm_full).trim()) ||
    (cuota.pago_hm_full && String(cuota.pago_hm_full).trim()) ||
    fmtDateTimeHM(fechaReferenciaPago);

  const vencimientoActualTxt = fmtDateOnly(cuota.fecha_vencimiento);

  const pagoFueraDeTermino = isPagoAtrasado(cuota);
  const fechaRehabilitacion = calcularRehabilitacion(fechaReferenciaPago);

  return (
    <Document>
      <Page size={{ width: A4_WIDTH, height: A4_HEIGHT }} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>COMPROBANTE DE PAGO</Text>
          <Text style={styles.headerSubtitle}>
            Servicios Jurídicos y Seguros
          </Text>
        </View>

        <View style={styles.grid2}>
            <View style={[styles.dueBox, styles.col, { marginBottom: 0 }]}>
                <Text style={styles.dueLabel}>Fecha de Pago</Text>
                <Text style={styles.dueValue}>{fechaHoraOperacion}</Text>
            </View>
            <View style={[styles.dueBox, styles.col, { marginBottom: 0 }]}>
                <Text style={styles.dueLabel}>Vencimiento</Text>
                <Text style={styles.dueValue}>{vencimientoActualTxt}</Text>
            </View>
        </View>

        <View style={styles.grid2}>
          <View style={[styles.section, styles.col]}>
            <Text style={styles.sectionHead}>Titular</Text>
            <View style={styles.sectionBody}>
              <Text style={styles.label}>Nombre</Text>
              <Text style={styles.value}>{titularFinal}</Text>
              <Text style={styles.label}>DNI / CUIT</Text>
              <Text style={styles.value}>{dniFinal}</Text>
            </View>
          </View>

          <View style={[styles.section, styles.col]}>
            <Text style={styles.sectionHead}>Datos del Auto</Text>
            <View style={styles.sectionBody}>
              <Text style={styles.label}>Marca / Modelo</Text>
              <Text style={styles.value}>
                {marca} {modelo}
              </Text>
              <Text style={styles.label}>Patente</Text>
              <Text style={styles.value}>{patente}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text>Concepto</Text>
            <Text>Valor a Pagar</Text>
          </View>
          <View style={styles.tableRow}>
            <Text>Cuota Nº {cuotaNro}</Text>
            <Text>{fmtMoney(monto)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>TOTAL ABONADO</Text>
            <Text>{fmtMoney(monto)}</Text>
          </View>
        </View>

        {pagoFueraDeTermino && (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>AVISO LEGAL: PAGO FUERA DE TÉRMINO</Text>
            <Text style={styles.alertText}>
               El cliente acepta y confirma bajo juramento que <Text style={styles.alertBold}>NO ha tenido ningún siniestro ni reclamo</Text> en los días previos a este pago, durante los cuales la póliza se encontraba vencida.{"\n\n"}
               Asimismo, toma conocimiento de que la cobertura retomará su vigencia recién a las <Text style={styles.alertBold}>48 horas hábiles</Text> de este pago (Fecha estimada: <Text style={styles.alertBold}>{fechaRehabilitacion}</Text>), período en el cual <Text style={styles.alertBold}>TAMPOCO TENDRÁ COBERTURA</Text>.
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default FacturaCuotaPDF;