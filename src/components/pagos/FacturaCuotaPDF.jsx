// src/components/pagos/FacturaCuotaPDF.jsx
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

const PRIMARY = "#8B1E3F";
const PRIMARY_DARK = "#5E1329";
const BORDER = "#E6C9D2";
const TEXT = "#111827";
const MUTED_BG = "#FBEFF3";
const ALERT_BG = "#FEF2F2";
const ALERT_TEXT = "#991B1B";

const safe = (v, d = "—") =>
  v === null || v === undefined || v === "" ? d : String(v);

// 🚀 FUNCIÓN A PRUEBA DE FALLOS PARA HORA Y FECHA
const fmtDateTimeHM = (d) => {
  if (!d) return "—";
  try {
    let dateObj;
    // Comprobamos si ya es un objeto Date real
    if (Object.prototype.toString.call(d) === '[object Date]') {
      dateObj = d;
    } else {
      const s = String(d).trim();
      dateObj = new Date(s.length === 10 ? s + "T12:00:00" : s);
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

// 🚀 FUNCIÓN A PRUEBA DE FALLOS SOLO PARA FECHA (Corrige la rayita)
const fmtDateOnly = (d) => {
  if (!d) return "—";
  try {
    let dt;
    // Comprobamos si ya es un objeto Date real
    if (Object.prototype.toString.call(d) === '[object Date]') {
      dt = d;
    } else {
      const s = String(d).trim();
      dt = new Date(s.length === 10 ? s + "T12:00:00" : s);
    }

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

// Determina si se está pagando fuera de término
const isPagoAtrasado = (cuota) => {
  if (!cuota || !cuota.pagado) return false;
  const v = new Date(String(cuota.fecha_vencimiento).slice(0, 10) + "T00:00:00");
  const ref = cuota.pago_registrado_en || cuota.fecha_pago || new Date();
  const pStr = typeof ref === "string" ? ref.slice(0, 10) : new Date(ref).toISOString().slice(0, 10);
  const p = new Date(pStr + "T00:00:00");
  return p.getTime() > v.getTime();
};

const styles = StyleSheet.create({
  page: { 
    width: A4_WIDTH, 
    height: A4_HEIGHT, 
    fontFamily: "Helvetica", 
    color: TEXT, 
    paddingTop: 35, 
    paddingHorizontal: 35, 
    paddingBottom: 35, 
    fontSize: 11 
  },
  header: { 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: BORDER, 
    backgroundColor: MUTED_BG, 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    marginBottom: 16 
  },
  headerTitle: { 
    fontSize: 22, 
    color: PRIMARY, 
    textAlign: "center", 
    letterSpacing: 0.5, 
    fontWeight: "bold" 
  },
  headerSubtitle: { 
    fontSize: 11, 
    color: PRIMARY_DARK, 
    textAlign: "center", 
    marginTop: 6 
  },
  dueBox: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: PRIMARY, 
    backgroundColor: "#FFF6F8", 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    marginBottom: 16 
  },
  dueLabel: { 
    fontSize: 12, 
    color: PRIMARY_DARK, 
    fontWeight: "bold", 
    textTransform: "uppercase" 
  },
  dueValue: { 
    fontSize: 16, 
    color: PRIMARY, 
    fontWeight: "bold" 
  },
  grid2: { 
    flexDirection: "row", 
    gap: 16, 
    marginBottom: 16 
  },
  col: { 
    flex: 1, 
    display: "flex", 
    flexDirection: "column" 
  },
  section: { 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: BORDER, 
    overflow: "hidden", 
    flex: 1 
  },
  sectionHead: { 
    backgroundColor: PRIMARY, 
    color: "#fff", 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    fontSize: 12, 
    fontWeight: "bold", 
    textTransform: "uppercase" 
  },
  sectionBody: { 
    padding: 12, 
    backgroundColor: "#FFFFFF", 
    flexGrow: 1 
  },
  label: { 
    fontSize: 10, 
    color: PRIMARY_DARK, 
    fontWeight: "bold", 
    marginTop: 8 
  },
  value: { 
    fontSize: 11, 
    marginTop: 3, 
    lineHeight: 1.3 
  },
  table: { 
    marginTop: 8, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: BORDER, 
    overflow: "hidden", 
    marginBottom: 16 
  },
  tableHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    backgroundColor: PRIMARY, 
    color: "#fff", 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    fontSize: 11, 
    fontWeight: "bold" 
  },
  tableRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: "#E5E7EB", 
    fontSize: 11 
  },
  totalRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    paddingVertical: 12, 
    paddingHorizontal: 12, 
    fontSize: 13, 
    fontWeight: "bold", 
    backgroundColor: "#FCF7F9" 
  },
  alertBox: { 
    marginTop: 16, 
    borderRadius: 8, 
    borderWidth: 1.5, 
    borderColor: ALERT_TEXT, 
    backgroundColor: ALERT_BG, 
    padding: 16 
  },
  alertTitle: { 
    fontSize: 13, 
    color: ALERT_TEXT, 
    fontWeight: "bold", 
    textAlign: "center", 
    marginBottom: 10 
  },
  alertText: { 
    fontSize: 11, 
    color: ALERT_TEXT, 
    textAlign: "justify", 
    lineHeight: 1.5 
  },
  alertBold: { 
    fontWeight: "bold" 
  },
});

const FacturaCuotaPDF = ({
  cliente = {},
  poliza = {},
  cuota = {},
  pago_dt_iso,
}) => {
  const titularFinal = `${safe(cliente.nombre || poliza.cliente_nombre, "")} ${safe(cliente.apellido || poliza.cliente_apellido, "")}`.trim() || "—";
  const dniFinal = safe(cliente.dni_cuit_cuil || poliza.cliente_dni || cliente.dni);
  const marca = safe(poliza.marca || poliza.poliza__marca);
  const modelo = safe(poliza.modelo || poliza.poliza__modelo);
  const patente = safe(poliza.patente || poliza.poliza__patente);

  const cuotaNro = safe(cuota.cuota_nro);
  const monto = cuota.monto || 0;

  const fechaReferenciaPagoOriginal = pago_dt_iso || cuota.pago_registrado_en || cuota.fecha_pago || new Date();
  const baseDate = new Date(fechaReferenciaPagoOriginal);

  const esPrimeraCuota = String(cuotaNro) === "1";
  const pagoFueraDeTermino = !esPrimeraCuota && isPagoAtrasado(cuota);

  // 📅 Fecha de cobertura = día siguiente al pago (solo aplica a 1ª cuota o pago atrasado)
  const fechaCobertura = new Date(baseDate.getTime());
  if (esPrimeraCuota || pagoFueraDeTermino) {
    fechaCobertura.setDate(fechaCobertura.getDate() + 1);
  }

  // 🚀 FIX: la "Fecha de Pago" de arriba muestra la fecha REAL del pago (baseDate, sin +1).
  // El +1 queda SOLO para la fecha de cobertura del aviso legal (fechaCobertura).
  const fechaHoraOperacion = fmtDateTimeHM(baseDate);
  const fechaSoloDiaTxt = fmtDateOnly(fechaCobertura);
  const vencimientoActualTxt = fmtDateOnly(cuota.fecha_vencimiento);

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

        {esPrimeraCuota && (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>AVISO LEGAL: INICIO DE COBERTURA</Text>
            <Text style={styles.alertText}>
              El cliente toma conocimiento de que su vehículo comenzará a tener cobertura a partir del <Text style={styles.alertBold}>día siguiente</Text> a la realización de este pago (Fecha de cobertura: <Text style={styles.alertBold}>{fechaSoloDiaTxt}</Text>).
            </Text>
          </View>
        )}

        {pagoFueraDeTermino && (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>AVISO LEGAL: PAGO FUERA DE TÉRMINO</Text>
            <Text style={styles.alertText}>
               El cliente acepta y confirma bajo juramento que <Text style={styles.alertBold}>NO ha tenido ningún siniestro ni reclamo</Text> en los días previos a este pago, durante los cuales la póliza se encontraba vencida.{"\n\n"}
               Asimismo, toma conocimiento de que la cobertura retomará su vigencia a partir del <Text style={styles.alertBold}>día siguiente</Text> a este pago (Fecha de cobertura: <Text style={styles.alertBold}>{fechaSoloDiaTxt}</Text>), período en el cual <Text style={styles.alertBold}>TAMPOCO TENDRÁ COBERTURA</Text>.
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default FacturaCuotaPDF;