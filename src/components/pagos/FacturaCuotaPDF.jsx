// src/components/pagos/FacturaCuotaPDF.jsx
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

/* Tamaño A4 (una sola hoja) en puntos */
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

/* Paleta bordó */
const PRIMARY = "#8B1E3F";       // bordó
const PRIMARY_DARK = "#5E1329";  // bordó oscuro
const BORDER = "#E6C9D2";        // borde suave rosado
const TEXT = "#111827";          // slate-900
const MUTED_BG = "#FBEFF3";      // fondo muy claro con tinte bordó

/* Utils */
const safe = (v, d = "—") =>
  v === null || v === undefined || v === "" ? d : String(v);

/**
 * Formatea fechas SIN romper por timezone.
 * - Si viene "YYYY-MM-DD" → la formatea a "DD/MM/YYYY" manualmente (sin Date).
 * - Si viene Date o algo raro → intenta construir un Date y devolver DD/MM/YYYY.
 */
const fmtDate = (d) => {
  if (!d) return "—";
  try {
    if (typeof d === "string") {
      const dateStr = d.slice(0, 10); // soporta "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm..."
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
    return `AR$ ${num.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  } catch {
    return "AR$ 0,00";
  }
};

/** Normaliza una fecha a número YYYYMMDD para poder comparar fácil */
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

/** Determina si la cuota se pagó después del vencimiento */
const isPagoAtrasado = (cuota) => {
  if (!cuota || !cuota.pagado) return false;
  const v = toYMDNumber(cuota.fecha_vencimiento);
  const p = toYMDNumber(cuota.fecha_pago);
  if (v == null || p == null) return false;
  return p > v;
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

  /* Encabezado */
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

  /* Bloque destacado de Vencimiento */
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
    fontSize: 18,
    color: PRIMARY,
    fontWeight: "bold",
  },

  /* Grid 2 columnas */
  grid2: { flexDirection: "row", gap: 12, marginBottom: 12 },
  col: { flexGrow: 1, flexBasis: 0 },

  /* Secciones */
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

  /* Tabla */
  table: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: BORDER,
    overflow: "hidden",
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

  /* Leyenda por pago atrasado */
  lateNotice: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  lateNoticeText: {
    fontSize: 9,
    color: PRIMARY_DARK,
    textAlign: "center",
  },
});

const FacturaCuotaPDF = ({ cliente, poliza, cuota }) => {
  if (!cliente || !poliza || !cuota) {
    return (
      <Document>
        <Page size={{ width: A4_WIDTH, height: A4_HEIGHT }} style={styles.page}>
          <Text>Faltan datos para generar el comprobante.</Text>
        </Page>
      </Document>
    );
  }

  /* Requisitos: SOLO datos del asegurado (Nombre y DNI/CUIT), del auto, fecha de pago,
     fecha de vencimiento y número de cuota. No se muestra número de póliza ni datos de contacto. */
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

  return (
    <Document>
      <Page size={{ width: A4_WIDTH, height: A4_HEIGHT }} style={styles.page}>
        {/* Encabezado con subtítulo solicitado */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>FACTURA</Text>
          <Text style={styles.headerSubtitle}>
            Factura por servicios jurídicos y seguros
          </Text>
        </View>

        {/* Bloque destacado de vencimiento */}
        <View style={styles.dueBox}>
          <Text style={styles.dueLabel}>Fecha de vencimiento</Text>
          <Text style={styles.dueValue}>{fechaVenc}</Text>
        </View>

        {/* Titular + Auto */}
        <View style={styles.grid2}>
          {/* Titular (SIN dirección ni teléfono) */}
          <View style={[styles.section, styles.col]}>
            <Text style={styles.sectionHead}>Titular</Text>
            <View style={styles.sectionBody}>
              <Text style={styles.label}>Nombre</Text>
              <Text style={styles.value}>
                {safe(cliente.nombre)} {safe(cliente.apellido)}
              </Text>

              <Text style={styles.label}>DNI / CUIT</Text>
              <Text style={styles.value}>{safe(cliente.dni_cuit_cuil)}</Text>
            </View>
          </View>

          {/* Datos del Auto */}
          <View style={[styles.section, styles.col]}>
            <Text style={styles.sectionHead}>Datos del Auto</Text>
            <View style={styles.sectionBody}>
              <Text style={styles.label}>Marca / Modelo</Text>
              <Text style={styles.value}>
                {safe(poliza.marca)} {safe(poliza.modelo)}
              </Text>

              <Text style={styles.label}>Año</Text>
              <Text style={styles.value}>{safe(poliza.anio)}</Text>

              <Text style={styles.label}>Patente</Text>
              <Text style={styles.value}>{safe(poliza.patente)}</Text>

              <Text style={styles.label}>Fecha de pago</Text>
              <Text style={styles.value}>{fechaPago}</Text>
            </View>
          </View>
        </View>

        {/* Concepto / Valor a pagar */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text>Concepto</Text>
            <Text>Valor a Pagar</Text>
          </View>

          <View style={styles.tableRow}>
            <Text>Cuota Nº {cuotaNro}</Text>
            <Text>{fmtMoney(subtotal)}</Text>
          </View>

          {Number(recargo) !== 0 ? (
            <View style={styles.tableRow}>
              <Text>Recargos / Intereses</Text>
              <Text>{fmtMoney(recargo)}</Text>
            </View>
          ) : null}

          {Number(descuento) !== 0 ? (
            <View style={styles.tableRow}>
              <Text>Descuentos</Text>
              <Text>- {fmtMoney(Math.abs(descuento))}</Text>
            </View>
          ) : null}

          <View style={styles.totalRow}>
            <Text>TOTAL</Text>
            <Text>{fmtMoney(total)}</Text>
          </View>
        </View>

        {/* Leyenda por pago atrasado */}
        {pagoAtrasado && (
          <View style={styles.lateNotice}>
            <Text style={styles.lateNoticeText}>
              Por haber abonado el seguro en forma atrasada, la cobertura se
              restablecerá en 2 días hábiles.
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default FacturaCuotaPDF;
