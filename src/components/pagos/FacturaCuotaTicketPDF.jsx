// src/components/pagos/FacturaCuotaTicketPDF.jsx
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

const mmToPt = (mm) => (mm * 72) / 25.4;

const TICKET_WIDTH = mmToPt(80);
const TICKET_HEIGHT = mmToPt(460);
const PAD_X = mmToPt(5);
const PAD_Y = mmToPt(8);

const safe = (v, d = "—") =>
  v === null || v === undefined || v === "" ? d : String(v);

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
    const dt = new Date(String(d).slice(0, 10) + "T12:00:00");
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
    return num.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch { return "0,00"; }
};

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
    width: TICKET_WIDTH,
    height: TICKET_HEIGHT,
    paddingHorizontal: PAD_X,
    paddingTop: PAD_Y,
    paddingBottom: PAD_Y,
    fontFamily: "Helvetica",
    fontSize: 12,
    color: "#000",
    backgroundColor: "#fff",
  },
  title: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 5 },
  statusPill: {
    alignSelf: "center",
    paddingVertical: 2,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 5,
    marginTop: 5,
  },
  statusText: { fontSize: 14, fontWeight: "bold" },
  hr: { borderBottomWidth: 1, borderBottomColor: "#000", marginVertical: 8, borderStyle: "dashed" },
  block: { marginBottom: 6 },
  line: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  label: { fontSize: 11, fontWeight: "bold" },
  value: { fontSize: 11 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", textTransform: "uppercase", marginBottom: 3 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 2,
    borderTopColor: "#000",
  },
  totalLabel: { fontSize: 16, fontWeight: "bold" },
  totalAmount: { fontSize: 16, fontWeight: "bold" },
  legalAlert: {
    marginTop: 15,
    padding: 8,
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 4,
  },
  legalTitle: { fontSize: 13, fontWeight: "bold", textAlign: "center", textDecoration: "underline", marginBottom: 5 },
  legalText: { fontSize: 11, textAlign: "center", lineHeight: 1.3 },
  alertBoldUnderline: { fontWeight: "bold", textDecoration: "underline" },
});

const FacturaCuotaTicketPDF = ({ cliente, poliza, cuota, pago_hm_full, pago_dt_iso }) => {
  if (!cliente || !poliza || !cuota) return null;

  const total = Number(cuota.total ?? cuota.monto ?? 0);
  const pagoAtrasado = isPagoAtrasado(cuota);

  const operacionTexto =
    (pago_hm_full && String(pago_hm_full).trim()) ||
    (cuota.pago_hm_full && String(cuota.pago_hm_full).trim()) ||
    fmtDateTimeHM(pago_dt_iso || cuota.pago_registrado_en || cuota.fecha_pago || new Date());

  // ✅ FIX: próximo vencimiento real
  const proximoVto = cuota?.proximo_vencimiento || cuota?.proximoVencimiento || null;
  const proximoVtoTxt = fmtDateOnly(proximoVto || cuota.fecha_vencimiento);

  return (
    <Document>
      <Page size={{ width: TICKET_WIDTH, height: TICKET_HEIGHT }} style={styles.page}>
        <Text style={styles.title}>COMPROBANTE</Text>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{cuota?.pagado ? "PAGADO" : "PENDIENTE"}</Text>
        </View>

        <View style={styles.hr} />

        <View style={styles.block}>
          <View style={styles.line}>
            <Text style={styles.label}>Operación:</Text>
            <Text style={styles.value}>{operacionTexto}</Text>
          </View>

          <View style={styles.line}>
            <Text style={styles.label}>Próx. vto:</Text>
            <Text style={styles.value}>{proximoVtoTxt}</Text>
          </View>

          <View style={styles.line}>
            <Text style={styles.label}>Cuota:</Text>
            <Text style={styles.value}>#{safe(cuota.cuota_nro)}</Text>
          </View>
        </View>

        <View style={styles.hr} />

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Asegurado</Text>
          <Text style={styles.value}>{safe(cliente.nombre)} {safe(cliente.apellido)}</Text>
          <Text style={styles.value}>DNI: {safe(cliente.dni_cuit_cuil)}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Vehículo</Text>
          <Text style={styles.value}>{safe(poliza.marca)} {safe(poliza.modelo)}</Text>
          <Text style={styles.value}>Patente: {safe(poliza.patente)}</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>$ {fmtMoney(total)}</Text>
        </View>

        {pagoAtrasado && (
          <View style={styles.legalAlert}>
            <Text style={styles.legalTitle}>PAGO FUERA DE TÉRMINO</Text>
            <Text style={styles.legalText}>
              La cobertura se restablecerá dentro de las <Text style={styles.alertBoldUnderline}>48 hs hábiles</Text>.
              El asegurado declara <Text style={styles.alertBoldUnderline}>bajo juramento</Text> que <Text style={styles.alertBoldUnderline}>NO</Text> ha tenido <Text style={styles.alertBoldUnderline}>siniestros ni reclamos</Text> durante el período de <Text style={styles.alertBoldUnderline}>falta de pago</Text>.
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default FacturaCuotaTicketPDF;