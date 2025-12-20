// src/components/pagos/FacturaCuotaTicketPDF.jsx
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

/**
 * Ticket térmico:
 * - 80mm de ancho (común en térmicas).
 * - Alto fijo “seguro” para que no corte contenido.
 */
const mmToPt = (mm) => (mm * 72) / 25.4;

const TICKET_WIDTH = mmToPt(80);
const TICKET_HEIGHT = mmToPt(320); // ⬅️ MÁS alto para tipografías grandes
const PAD_X = mmToPt(5);
const PAD_Y = mmToPt(8);

const safe = (v, d = "—") =>
  v === null || v === undefined || v === "" ? d : String(v);

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    if (typeof d === "string") {
      const dateStr = d.slice(0, 10);
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const [yyyy, mm, dd] = parts;
        if (yyyy && mm && dd) {
          return `${dd.padStart(2, "0")}/${mm.padStart(2, "0")}/${yyyy}`;
        }
      }
    }
    const dt = d instanceof Date ? d : new Date(d);
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

const toYMDNumber = (d) => {
  if (!d) return null;
  try {
    if (typeof d === "string") {
      const dateStr = d.slice(0, 10);
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const [yyyy, mm, dd] = parts;
        const y = Number(yyyy);
        const m = Number(mm);
        const day = Number(dd);
        if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(day)) {
          return y * 10000 + m * 100 + day;
        }
      }
    }
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    const day = dt.getDate();
    return y * 10000 + m * 100 + day;
  } catch {
    return null;
  }
};

const isPagoAtrasado = (cuota) => {
  if (!cuota || !cuota.pagado) return false;
  const v = toYMDNumber(cuota.fecha_vencimiento);
  const p = toYMDNumber(cuota.fecha_pago);
  if (v == null || p == null) return false;
  return p > v;
};

const styles = StyleSheet.create({
  page: {
    width: TICKET_WIDTH,
    height: TICKET_HEIGHT,
    paddingHorizontal: PAD_X,
    paddingTop: PAD_Y,
    paddingBottom: PAD_Y,
    fontFamily: "Helvetica",
    fontSize: 14, // ⬅️ BASE MUCHO MÁS GRANDE
    color: "#111",
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 20, // ⬅️ MÁS grande
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13, // ⬅️ MÁS grande
    textAlign: "center",
    marginTop: 4,
    color: "#333",
  },

  // ✅ Nuevo: estado PAGADO
  statusWrap: {
    marginTop: 6,
    alignItems: "center",
  },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.6,
    textAlign: "center",
  },

  hr: { marginTop: 10, marginBottom: 10 },
  hrText: { fontSize: 12, color: "#222", textAlign: "center" },

  block: { marginTop: 2 },

  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 5,
  },

  label: { fontSize: 12, color: "#333" }, // ⬅️ MÁS grande
  value: { fontSize: 13, color: "#111" }, // ⬅️ MÁS grande

  sectionTitle: {
    fontSize: 15, // ⬅️ MÁS grande
    fontWeight: "bold",
    marginBottom: 3,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
  },
  rowLabel: { flexGrow: 1, flexBasis: 0, fontSize: 13 }, // ⬅️ MÁS grande
  rowAmount: {
    width: mmToPt(36), // ⬅️ un poco más ancho para montos
    textAlign: "right",
    fontSize: 13, // ⬅️ MÁS grande
  },

  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#000",
  },
  totalLabel: { fontSize: 17, fontWeight: "bold" }, // ⬅️ MÁS grande
  totalAmount: { fontSize: 17, fontWeight: "bold", textAlign: "right" }, // ⬅️ MÁS grande

  note: {
    marginTop: 10,
    fontSize: 12, // ⬅️ MÁS grande
    textAlign: "center",
    color: "#222",
  },

  foot: {
    marginTop: 12,
    fontSize: 13, // ⬅️ MÁS grande
    textAlign: "center",
    color: "#111",
  },
});

function HR() {
  return (
    <View style={styles.hr}>
      <Text style={styles.hrText}>------------------------------------------</Text>
    </View>
  );
}

const FacturaCuotaTicketPDF = ({ cliente, poliza, cuota }) => {
  if (!cliente || !poliza || !cuota) {
    return (
      <Document>
        <Page
          size={{ width: TICKET_WIDTH, height: TICKET_HEIGHT }}
          style={styles.page}
        >
          <Text>Faltan datos para generar el comprobante.</Text>
        </Page>
      </Document>
    );
  }

  const cuotaNro = safe(cuota.cuota_nro);
  const fechaVenc = fmtDate(cuota.fecha_vencimiento);
  const fechaPago = fmtDate(cuota.fecha_pago);

  const subtotal = Number(
    cuota.subtotal !== undefined && cuota.subtotal !== null
      ? cuota.subtotal
      : cuota.monto || 0
  );
  const recargo = Number(cuota.recargo || 0);
  const descuento = Number(cuota.descuento || 0);
  const total =
    cuota.total !== undefined && cuota.total !== null
      ? Number(cuota.total)
      : subtotal + recargo - descuento;

  const pagoAtrasado = isPagoAtrasado(cuota);

  const nombre =
    `${safe(cliente.nombre, "")} ${safe(cliente.apellido, "")}`.trim() || "—";
  const dni = safe(cliente.dni_cuit_cuil);

  const vehiculo = [poliza.marca, poliza.modelo].filter(Boolean).join(" ");
  const anio = safe(poliza.anio);
  const patente = safe(poliza.patente);

  const statusText = cuota?.pagado ? "PAGADO" : "PENDIENTE";

  return (
    <Document>
      <Page
        size={{ width: TICKET_WIDTH, height: TICKET_HEIGHT }}
        style={styles.page}
      >
        <Text style={styles.title}>COMPROBANTE</Text>
        <Text style={styles.subtitle}>Servicios jurídicos y seguros</Text>

        {/* ✅ Estado */}
        <View style={styles.statusWrap}>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        <HR />

        {/* Datos clave */}
        <View style={styles.block}>
          <View style={styles.line}>
            <Text style={styles.label}>Fecha de pago</Text>
            <Text style={styles.value}>{fechaPago}</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.label}>Vencimiento</Text>
            <Text style={styles.value}>{fechaVenc}</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.label}>Cuota</Text>
            <Text style={styles.value}>#{cuotaNro}</Text>
          </View>
        </View>

        <HR />

        {/* Titular */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Titular</Text>
          <View style={styles.line}>
            <Text style={styles.label}>Nombre</Text>
            <Text style={styles.value}>{nombre}</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.label}>DNI/CUIT</Text>
            <Text style={styles.value}>{dni}</Text>
          </View>
        </View>

        <HR />

        {/* Vehículo */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Vehículo</Text>
          <View style={styles.line}>
            <Text style={styles.label}>Marca/Modelo</Text>
            <Text style={styles.value}>{safe(vehiculo)}</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.label}>Año</Text>
            <Text style={styles.value}>{anio}</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.label}>Patente</Text>
            <Text style={styles.value}>{patente}</Text>
          </View>
        </View>

        <HR />

        {/* Detalle */}
        <Text style={styles.sectionTitle}>Detalle</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Cuota</Text>
          <Text style={styles.rowAmount}>$ {fmtMoney(subtotal)}</Text>
        </View>

        {recargo !== 0 ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Recargos / intereses</Text>
            <Text style={styles.rowAmount}>$ {fmtMoney(recargo)}</Text>
          </View>
        ) : null}

        {descuento !== 0 ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Descuentos</Text>
            <Text style={styles.rowAmount}>
              - $ {fmtMoney(Math.abs(descuento))}
            </Text>
          </View>
        ) : null}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>$ {fmtMoney(total)}</Text>
        </View>

        {pagoAtrasado && (
          <Text style={styles.note}>
            Pago atrasado: la cobertura se restablecerá en 2 días hábiles.
          </Text>
        )}

        <HR />

        <Text style={styles.foot}>Conservá este comprobante.</Text>
        <Text style={styles.foot}>¡Gracias!</Text>
      </Page>
    </Document>
  );
};

export default FacturaCuotaTicketPDF;
