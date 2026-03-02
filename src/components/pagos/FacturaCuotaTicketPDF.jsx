// src/components/pagos/FacturaCuotaTicketPDF.jsx
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

/**
 * Ticket térmico optimizado:
 * - ✅ Ahora muestra HORA Y MINUTOS del pago (y segundos si querés).
 * - ✅ Prioriza el timestamp real del backend (pago_registrado_en / pago_hm_full).
 * - Fix para desfase de zona horaria (21:00 hs).
 * - Aviso legal para pagos atrasados.
 * - Sin número de póliza en el cuerpo.
 * - Sin textos de marca al pie.
 */
const mmToPt = (mm) => (mm * 72) / 25.4;

const TICKET_WIDTH = mmToPt(80);
const TICKET_HEIGHT = mmToPt(460);
const PAD_X = mmToPt(5);
const PAD_Y = mmToPt(8);

const safe = (v, d = "—") =>
  v === null || v === undefined || v === "" ? d : String(v);

/**
 * ✅ Preferimos lo que manda backend:
 *  - props.pago_hm_full (DD/MM/YYYY HH:MM) si viene
 *  - cuota.pago_hm_full si viene
 *  - cuota.pago_registrado_en (ISO) con HH:MM
 *  - cuota.fecha_pago (solo fecha) fallback
 *
 * NOTA: El usuario pidió hora y minutos. Acá mostramos HH:MM.
 */
const fmtDateTimeHM = (d) => {
  if (!d) return "—";
  try {
    let dateObj;

    // Si es un string YYYY-MM-DD sin hora, forzamos mediodía para evitar que la zona horaria reste horas
    if (typeof d === "string" && d.length === 10) {
      dateObj = new Date(d + "T12:00:00");
    } else {
      dateObj = new Date(d);
    }

    if (Number.isNaN(dateObj.getTime())) return "—";

    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();

    // ✅ hora/minuto (sin segundos)
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const mins = String(dateObj.getMinutes()).padStart(2, "0");

    // mostramos siempre HH:MM
    return `${day}/${month}/${year} ${hours}:${mins} hs`;
  } catch {
    return "—";
  }
};

/** (Opcional) si querés mantener segundos, dejé esta función lista */
const fmtDateTimeHMS = (d) => {
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
    const secs = String(dateObj.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${mins}:${secs} hs`;
  } catch {
    return "—";
  }
};

/** Formatea solo fecha (DD/MM/YYYY) para vencimientos */
const fmtDateOnly = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d + "T12:00:00");
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
    return num.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return "0,00";
  }
};

/** Detecta si el pago es atrasado comparando solo los días al inicio del día */
const isPagoAtrasado = (cuota) => {
  if (!cuota || !cuota.pagado) return false;
  const v = new Date(cuota.fecha_vencimiento + "T00:00:00");
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
    fontSize: 12,
    color: "#000",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
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
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginVertical: 8,
    borderStyle: "dashed",
  },
  block: { marginBottom: 6 },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  label: { fontSize: 11, fontWeight: "bold" },
  value: { fontSize: 11 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 3,
  },
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
  legalTitle: {
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
    textDecoration: "underline",
    marginBottom: 5,
  },
  legalText: { fontSize: 11, textAlign: "center", lineHeight: 1.3 },
  alertBoldUnderline: {
    fontWeight: "bold",
    textDecoration: "underline",
  },
});

const FacturaCuotaTicketPDF = ({
  cliente,
  poliza,
  cuota,
  // ✅ nuevos props opcionales (desde ImprimirFacturaTicket.jsx)
  pago_hm,
  pago_hm_full,
  pago_dt_iso,
}) => {
  if (!cliente || !poliza || !cuota) return null;

  const total = Number(cuota.total ?? cuota.monto ?? 0);
  const pagoAtrasado = isPagoAtrasado(cuota);

  // ✅ Fuente única para “Operación”
  // Preferimos string ya formateado de backend/props (DD/MM/YYYY HH:MM)
  const operacionTexto =
    (pago_hm_full && String(pago_hm_full).trim()) ||
    (cuota.pago_hm_full && String(cuota.pago_hm_full).trim()) ||
    (() => {
      // Si no tenemos full, armamos desde timestamp o fecha
      const dt =
        pago_dt_iso ||
        cuota.pago_registrado_en ||
        cuota.fecha_pago ||
        new Date();
      return fmtDateTimeHM(dt);
    })();

  return (
    <Document>
      <Page
        size={{ width: TICKET_WIDTH, height: TICKET_HEIGHT }}
        style={styles.page}
      >
        <Text style={styles.title}>COMPROBANTE</Text>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>
            {cuota?.pagado ? "PAGADO" : "PENDIENTE"}
          </Text>
        </View>

        <View style={styles.hr} />

        <View style={styles.block}>
          {/* ✅ HORA Y MINUTOS del pago */}
          <View style={styles.line}>
            <Text style={styles.label}>Operación:</Text>
            <Text style={styles.value}>{operacionTexto}</Text>
          </View>

          <View style={styles.line}>
            <Text style={styles.label}>Vencimiento:</Text>
            <Text style={styles.value}>{fmtDateOnly(cuota.fecha_vencimiento)}</Text>
          </View>

          <View style={styles.line}>
            <Text style={styles.label}>Cuota:</Text>
            <Text style={styles.value}>#{safe(cuota.cuota_nro)}</Text>
          </View>
        </View>

        <View style={styles.hr} />

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Asegurado</Text>
          <Text style={styles.value}>
            {safe(cliente.nombre)} {safe(cliente.apellido)}
          </Text>
          <Text style={styles.value}>DNI: {safe(cliente.dni_cuit_cuil)}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Vehículo</Text>
          <Text style={styles.value}>
            {safe(poliza.marca)} {safe(poliza.modelo)}
          </Text>
          <Text style={styles.value}>Patente: {safe(poliza.patente)}</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>$ {fmtMoney(total)}</Text>
        </View>

        {/* ✅ Aviso legal */}
        {pagoAtrasado && (
          <View style={styles.legalAlert}>
            <Text style={styles.legalTitle}>PAGO FUERA DE TÉRMINO</Text>
            <Text style={styles.legalText}>
              La cobertura se restablecerá dentro de las{" "}
              <Text style={styles.alertBoldUnderline}>48 hs hábiles</Text>. El
              asegurado declara{" "}
              <Text style={styles.alertBoldUnderline}>bajo juramento</Text> que{" "}
              <Text style={styles.alertBoldUnderline}>NO</Text> ha tenido{" "}
              <Text style={styles.alertBoldUnderline}>
                siniestros ni reclamos
              </Text>{" "}
              durante el período de{" "}
              <Text style={styles.alertBoldUnderline}>falta de pago</Text>.
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default FacturaCuotaTicketPDF;