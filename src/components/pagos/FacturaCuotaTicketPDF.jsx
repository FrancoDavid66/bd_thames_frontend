// src/components/pagos/FacturaCuotaTicketPDF.jsx
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

const mmToPt = (mm) => (mm * 72) / 25.4;

const TICKET_WIDTH = mmToPt(80);
const TICKET_HEIGHT = mmToPt(460);
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

const pad2 = (n) => String(n).padStart(2, "0");

/** Suma meses de forma segura en YYYY-MM-DD (mantiene día si se puede, clamp si no) */
const addMonthsYmd = (ymdStr, deltaMonths) => {
  const s = ymd(ymdStr);
  if (!s || s.length < 10) return "";
  const base = new Date(`${s}T12:00:00`);
  if (Number.isNaN(base.getTime())) return "";

  const target = new Date(base.getTime());
  target.setMonth(target.getMonth() + Number(deltaMonths || 0));

  const intendedMonth = (base.getMonth() + Number(deltaMonths || 0) + 1200) % 12;
  const actualMonth = target.getMonth();
  if (actualMonth !== intendedMonth) {
    const y2 = target.getFullYear();
    const m2 = intendedMonth;
    const lastDay = new Date(y2, m2 + 1, 0, 12, 0, 0);
    target.setFullYear(lastDay.getFullYear());
    target.setMonth(lastDay.getMonth());
    target.setDate(lastDay.getDate());
  }

  const yy = target.getFullYear();
  const mm = pad2(target.getMonth() + 1);
  const dd = pad2(target.getDate());
  return `${yy}-${mm}-${dd}`;
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

  // ✅ más aire
  block: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 6,
  },

  // ✅ líneas con altura y alineación prolija
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  label: { fontSize: 10, fontWeight: "bold", width: "58%" },
  value: { fontSize: 10, width: "42%", textAlign: "right", lineHeight: 1.25 },

  // ✅ texto normal con mejor lineHeight
  text: { fontSize: 10, lineHeight: 1.3 },

  // ✅ tabla con padding mejor y separación
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

  // ✅ aviso con más aire y lectura
  legalAlert: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
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
  legalText: { fontSize: 10, textAlign: "center", lineHeight: 1.35 },
  alertBoldUnderline: { fontWeight: "bold", textDecoration: "underline" },
});

const FacturaCuotaTicketPDF = ({
  cliente = {},
  poliza = {},
  cuota = {},
  pago_hm_full,
  pago_dt_iso,
}) => {
  // === Igual que PDF: fallbacks robustos desde poliza.cliente_* ===
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

  const fechaHoraOperacion =
    (pago_hm_full && String(pago_hm_full).trim()) ||
    (cuota.pago_hm_full && String(cuota.pago_hm_full).trim()) ||
    fmtDateTimeHM(
      pago_dt_iso || cuota.pago_registrado_en || cuota.fecha_pago || new Date()
    );

  // ✅ Vencimiento ACTUAL (no próximo)
  const vencimientoActualTxt = fmtDateOnly(cuota.fecha_vencimiento);

  // ✅ Cobertura (vencimiento - 1 mes) al vencimiento
  const vtoBase = ymd(cuota?.fecha_vencimiento || "");
  const cubreDesde = vtoBase ? fmtDateOnly(addMonthsYmd(vtoBase, -1)) : "—";
  const cubreHasta = vtoBase ? fmtDateOnly(vtoBase) : "—";
  const coberturaTxt = vtoBase ? `${cubreDesde} al ${cubreHasta}` : "—";

  const pagoFueraDeTermino = isPagoAtrasado(cuota);

  return (
    <Document>
      <Page
        size={{ width: TICKET_WIDTH, height: TICKET_HEIGHT }}
        style={styles.page}
      >
        <View style={styles.header}>
          <Text style={styles.title}>COMPROBANTE DE PAGO</Text>
          <Text style={styles.subtitle}>
            Factura por servicios jurídicos y seguros
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
            <Text style={styles.label}>Fecha y Hora de Operación</Text>
            <Text style={styles.value}>{fechaHoraOperacion}</Text>
          </View>

          <View style={styles.line}>
            <Text style={styles.label}>Cobertura</Text>
            <Text style={styles.value}>{coberturaTxt}</Text>
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

        {/* === Igual que PDF: tabla Concepto / Valor a Pagar + TOTAL ABONADO === */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>Concepto</Text>
            <Text style={styles.tableHeaderText}>Valor a Pagar</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableRowText}>Cuota Nº {cuotaNro}</Text>
            <Text style={styles.tableRowText}>{fmtMoney(monto)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL ABONADO</Text>
            <Text style={styles.totalAmount}>{fmtMoney(monto)}</Text>
          </View>
        </View>

        <View style={styles.hr} />

        <View style={styles.block}>
          <View style={styles.line}>
            <Text style={styles.label}>Vencimiento</Text>
            <Text style={styles.value}>{vencimientoActualTxt}</Text>
          </View>

          <View style={styles.line}>
            <Text style={styles.label}>Cuota</Text>
            <Text style={styles.value}>#{safe(cuota.cuota_nro)}</Text>
          </View>
        </View>

        {pagoFueraDeTermino && (
          <View style={styles.legalAlert}>
            <Text style={styles.legalTitle}>PAGO FUERA DE TÉRMINO</Text>
            <Text style={styles.legalText}>
              Por haber abonado el seguro en forma{" "}
              <Text style={styles.alertBoldUnderline}>atrasada</Text>, la cobertura
              se restablecerá dentro de las{" "}
              <Text style={styles.alertBoldUnderline}>48 horas hábiles</Text>. El
              asegurado deja constancia y declara{" "}
              <Text style={styles.alertBoldUnderline}>bajo juramento</Text> que{" "}
              <Text style={styles.alertBoldUnderline}>NO</Text> ha tenido ningún
              tipo de{" "}
              <Text style={styles.alertBoldUnderline}>siniestro ni reclamo</Text>{" "}
              durante el período en el cual la cuota se encontraba{" "}
              <Text style={styles.alertBoldUnderline}>impaga</Text>.
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default FacturaCuotaTicketPDF;