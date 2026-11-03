// src/components/pagos/ReciboMalvinas.jsx
//
// 🟢 RECIBO DE PAGO DE MALVINAS — diseño PROPIO (03/11/2026)
// ──────────────────────────────────────────────────────────
// No es el recibo de THAMES pintado de verde: es otro papel.
// Idea copiada del comprobante de Mercado Pago (el que todo el mundo conoce:
// tilde, "Pago recibido" y el monto GRANDE arriba de todo) con la identidad del
// cartel de Malvinas: franja verde a rayas, letras amarillas y la balanza.
//
//   ┌──────────────────────────────────────────────┐
//   │ ⚖ MALVINAS                  RECIBO DE PAGO   │  ← verde a rayas
//   │   SEGUROS · ABOGADOS · ...   N° 001234        │
//   ├══════════════════════════════════════════════┤  ← línea amarilla
//   │                   ✔                          │
//   │              Pago recibido                   │
//   │             AR$ 41.000,00                    │  ← lo primero que se lee
//   │        Cuota N° 1 · 03/11/2026 14:35 hs      │
//   │                                              │
//   │   [ARGENTINA│AE 123 FG]   VW Gol Trend · NRE │  ← patente tipo Mercosur
//   │                                              │
//   │  ASEGURADO          │  LA CUOTA              │
//   │  DETALLE DEL COBRO (si hay)                  │
//   │  ███ TOTAL ABONADO ............ AR$ 41.000 ██│
//   │  ⚠ Inicio de cobertura (1ª cuota / atrasada) │
//   ├══════════════════════════════════════════════┤
//   │ WhatsApp 11-6032-2844   LEGALES 24 HS  ¡Gracias!│ ← pie verde
//   └──────────────────────────────────────────────┘
//
// Lo usa Comprobante.jsx cuando la marca de la póliza tiene
// `recibo.diseno === "malvinas"` (ver src/marca/marcas.js). Los DATOS los arma
// Comprobante.jsx (los mismos de siempre); acá solo se dibujan.
//
// Recibe `r` con todo ya listo para mostrar:
//   { numero, emitido, montoTxt, pagado, cuotaNro, fechaHoraPago, vencimiento,
//     fechaCobertura, aviso, titular, dni, vehiculo, patente, compania,
//     cobertura, detalle: [[label, valor], ...] }

import { Page, Text, View, Document, StyleSheet, Image, Svg, Rect, Polygon, Circle, Path } from "@react-pdf/renderer";

/* ─── Medidas ─── */
const A4_W = 595.28;
const A4_H = 841.89;
const CAB_ALTO = 104;      // alto de la franja verde de arriba
const PIE_ALTO = 40;       // alto de la franja verde de abajo
const MARGEN = 36;

const mmToPt = (mm) => (mm * 72) / 25.4;
const TK_W = mmToPt(80);
const TK_H = mmToPt(480);

/* 🚗 La patente con espacios, como en la chapa.
     "AE123FG" → "AE 123 FG"  ·  "ABC123" → "ABC 123"  ·  otra cosa → tal cual */
export function patenteChapa(p) {
  const s = String(p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  let m = s.match(/^([A-Z]{2})(\d{3})([A-Z]{2})$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]}`;
  m = s.match(/^([A-Z]{3})(\d{3})$/);
  if (m) return `${m[1]} ${m[2]}`;
  m = s.match(/^([A-Z]\d{3})([A-Z]{3})$/); // motos nuevas: A123BCD
  if (m) return `${m[1]} ${m[2]}`;
  return String(p || "—").toUpperCase();
}

/* 🎨 Colores: salen de la marca (por si mañana cambian, se cambia en marcas.js). */
const paleta = (marca) => ({
  verde: marca?.recibo?.primario || "#1E6B2E",
  verdeOscuro: marca?.recibo?.oscuro || "#134A1F",
  amarillo: marca?.amarillo || "#F2D91B",
  suave: marca?.recibo?.fondo || "#EEF7EF",
  borde: marca?.recibo?.borde || "#C9E2CC",
  tinta: "#111827",
  gris: "#6B7280",
  azulChapa: "#1D4E9E",
});

/* Las rayas diagonales del cartel, dibujadas (no es una foto: pesa nada). */
function Rayas({ ancho, alto, color }) {
  const paso = 26;
  const grosor = 11;
  const rayas = [];
  for (let x = -alto; x < ancho + alto; x += paso) {
    rayas.push(
      <Polygon
        key={x}
        points={`${x},${alto} ${x + grosor},${alto} ${x + grosor + alto},0 ${x + alto},0`}
        fill={color}
        fillOpacity={0.09}
      />
    );
  }
  return (
    <Svg width={ancho} height={alto} style={{ position: "absolute", top: 0, left: 0 }}>
      {rayas}
    </Svg>
  );
}

/* ✔ Tilde en un círculo (o un reloj si todavía no se pagó). */
function Tilde({ pagado, verde, amarillo }) {
  return (
    <Svg width={46} height={46} viewBox="0 0 46 46">
      <Circle cx="23" cy="23" r="22" fill={pagado ? verde : amarillo} />
      {pagado ? (
        <Path d="M13 23.5 L20 30.5 L33.5 16.5" stroke="#FFFFFF" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <Path d="M23 12 L23 24 L30 28" stroke="#111827" strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </Svg>
  );
}

/* =========================================================================
   📄 A4
   ========================================================================= */

function estilosA4(c) {
  return StyleSheet.create({
    page: { width: A4_W, height: A4_H, fontFamily: "Helvetica", fontSize: 10.5, color: c.tinta, paddingBottom: PIE_ALTO + 30 },

    // Cabecera
    cab: { height: CAB_ALTO, backgroundColor: c.verde, flexDirection: "row", alignItems: "center", paddingHorizontal: MARGEN, position: "relative" },
    logo: { width: 60, height: 60 },
    marcaCaja: { marginLeft: 14, flex: 1 },
    marcaNombre: { fontSize: 30, fontFamily: "Helvetica-Bold", color: c.amarillo, letterSpacing: 3 },
    marcaLema: { fontSize: 8.5, color: "#FFFFFF", letterSpacing: 1.2, marginTop: 3 },
    nroCaja: { alignItems: "flex-end" },
    nroEtiqueta: { fontSize: 8.5, color: c.amarillo, letterSpacing: 1.5, fontFamily: "Helvetica-Bold" },
    nroValor: { fontSize: 19, color: "#FFFFFF", fontFamily: "Helvetica-Bold", marginTop: 2 },
    nroFecha: { fontSize: 8, color: "#D7EBD9", marginTop: 3 },
    lineaAmarilla: { height: 5, backgroundColor: c.amarillo },

    // El monto, arriba de todo
    hero: { alignItems: "center", paddingTop: 22, paddingBottom: 16 },
    heroEstado: { fontSize: 12.5, fontFamily: "Helvetica-Bold", marginTop: 8 },
    heroMonto: { fontSize: 36, fontFamily: "Helvetica-Bold", color: c.tinta, marginTop: 4 },
    heroSub: { fontSize: 9.5, color: c.gris, marginTop: 4 },

    // Patente tipo Mercosur + vehículo
    autoFila: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 18 },
    chapa: { width: 150, borderWidth: 2, borderColor: c.tinta, borderRadius: 6, overflow: "hidden", backgroundColor: "#FFFFFF" },
    chapaBanda: { backgroundColor: c.azulChapa, paddingVertical: 2.5, alignItems: "center" },
    chapaBandaTxt: { fontSize: 6.5, color: "#FFFFFF", letterSpacing: 1.5, fontFamily: "Helvetica-Bold" },
    chapaNro: { fontSize: 21, fontFamily: "Helvetica-Bold", textAlign: "center", letterSpacing: 1.5, paddingVertical: 5 },
    autoDatos: { marginLeft: 16, maxWidth: 230 },
    autoEtq: { fontSize: 7.5, color: c.gris, letterSpacing: 1, fontFamily: "Helvetica-Bold" },
    autoVal: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 1, marginBottom: 5 },
    autoValChico: { fontSize: 10, marginTop: 1 },

    // Bloques de datos
    fila2: { flexDirection: "row", marginHorizontal: MARGEN, marginBottom: 12 },
    bloque: { flex: 1, backgroundColor: c.suave, borderTopWidth: 3, borderTopColor: c.verde, borderRadius: 4, paddingVertical: 9, paddingHorizontal: 12 },
    bloqueSep: { width: 12 },
    bloqueTitulo: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    cuadradito: { width: 6, height: 6, backgroundColor: c.amarillo, marginRight: 6 },
    bloqueTituloTxt: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: c.verdeOscuro, letterSpacing: 1.2 },
    renglon: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3.5, borderBottomWidth: 0.6, borderBottomColor: c.borde, borderBottomStyle: "dashed" },
    renglonUltimo: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3.5 },
    etq: { fontSize: 9.5, color: c.gris },
    val: { fontSize: 9.5, fontFamily: "Helvetica-Bold", textAlign: "right", maxWidth: "62%" },

    detalle: { marginHorizontal: MARGEN, marginBottom: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: c.borde, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 12 },

    // Total
    total: { marginHorizontal: MARGEN, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: c.verde, borderRadius: 6, paddingVertical: 11, paddingHorizontal: 16 },
    totalEtq: { fontSize: 11.5, color: "#FFFFFF", fontFamily: "Helvetica-Bold", letterSpacing: 1 },
    totalVal: { fontSize: 17, color: c.amarillo, fontFamily: "Helvetica-Bold" },

    // Aviso de cobertura
    aviso: { marginHorizontal: MARGEN, marginTop: 12, flexDirection: "row", backgroundColor: "#FFFBE6", borderLeftWidth: 5, borderLeftColor: c.amarillo, borderRadius: 4, paddingVertical: 9, paddingHorizontal: 12 },
    avisoSigno: { width: 18, height: 18, borderRadius: 9, backgroundColor: c.amarillo, alignItems: "center", justifyContent: "center", marginRight: 10, marginTop: 1 },
    avisoSignoTxt: { fontSize: 11, fontFamily: "Helvetica-Bold", color: c.tinta },
    avisoTitulo: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginBottom: 2 },
    avisoTxt: { fontSize: 9.5, lineHeight: 1.4 },
    negrita: { fontFamily: "Helvetica-Bold" },

    // Pie
    leyenda: { position: "absolute", left: MARGEN, right: MARGEN, bottom: PIE_ALTO + 12, fontSize: 7.5, color: c.gris, textAlign: "center" },
    pie: { position: "absolute", left: 0, right: 0, bottom: 0 },
    pieLinea: { height: 4, backgroundColor: c.amarillo },
    pieBanda: { height: PIE_ALTO - 4, backgroundColor: c.verde, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: MARGEN },
    pieTxt: { fontSize: 9, color: "#FFFFFF" },
    pieFuerte: { fontSize: 10, color: c.amarillo, fontFamily: "Helvetica-Bold", letterSpacing: 1.5 },
  });
}

const _cacheA4 = {};
const stylesA4 = (marca) => {
  const k = marca?.id || "malvinas";
  if (!_cacheA4[k]) _cacheA4[k] = estilosA4(paleta(marca));
  return _cacheA4[k];
};

function Renglones({ s, filas }) {
  const visibles = filas.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "");
  return visibles.map(([etq, val], i) => (
    <View key={etq} style={i === visibles.length - 1 ? s.renglonUltimo : s.renglon}>
      <Text style={s.etq}>{etq}</Text>
      <Text style={s.val}>{val}</Text>
    </View>
  ));
}

function TituloBloque({ s, children }) {
  return (
    <View style={s.bloqueTitulo}>
      <View style={s.cuadradito} />
      <Text style={s.bloqueTituloTxt}>{children}</Text>
    </View>
  );
}

export function ReciboMalvinasA4({ marca, r }) {
  const c = paleta(marca);
  const s = stylesA4(marca);
  const telefono = marca?.telefono || "";
  const autoSub = [r.compania, r.cobertura ? `Cobertura ${r.cobertura}` : ""].filter(Boolean).join(" · ");

  return (
    <Document>
      <Page size={{ width: A4_W, height: A4_H }} style={s.page}>
        {/* ── Cabecera verde a rayas ── */}
        <View style={s.cab}>
          <Rayas ancho={A4_W} alto={CAB_ALTO} color="#FFFFFF" />
          {marca?.logoPng ? <Image src={marca.logoPng} style={s.logo} /> : null}
          <View style={s.marcaCaja}>
            <Text style={s.marcaNombre}>{marca?.nombreCorto || "MALVINAS"}</Text>
            <Text style={s.marcaLema}>{String(marca?.recibo?.subtitulo || "").toUpperCase()}</Text>
          </View>
          <View style={s.nroCaja}>
            <Text style={s.nroEtiqueta}>RECIBO DE PAGO</Text>
            <Text style={s.nroValor}>N° {r.numero}</Text>
            <Text style={s.nroFecha}>Emitido el {r.emitido}</Text>
          </View>
        </View>
        <View style={s.lineaAmarilla} />

        {/* ── El monto: lo primero que se lee ── */}
        <View style={s.hero}>
          <Tilde pagado={r.pagado} verde={c.verde} amarillo={c.amarillo} />
          <Text style={[s.heroEstado, { color: r.pagado ? c.verde : c.tinta }]}>
            {r.pagado ? "Pago recibido" : "Pago pendiente"}
          </Text>
          <Text style={s.heroMonto}>{r.montoTxt}</Text>
          <Text style={s.heroSub}>
            Cuota N° {r.cuotaNro}
            {r.pagado ? ` · ${r.fechaHoraPago}` : ` · vence el ${r.vencimiento}`}
          </Text>
        </View>

        {/* ── La patente (como la chapa) y el auto ── */}
        <View style={s.autoFila}>
          <View style={s.chapa}>
            <View style={s.chapaBanda}>
              <Text style={s.chapaBandaTxt}>REPÚBLICA ARGENTINA</Text>
            </View>
            <Text style={s.chapaNro}>{patenteChapa(r.patente)}</Text>
          </View>
          <View style={s.autoDatos}>
            <Text style={s.autoEtq}>VEHÍCULO</Text>
            <Text style={s.autoVal}>{r.vehiculo}</Text>
            {autoSub ? (
              <>
                <Text style={s.autoEtq}>COMPAÑÍA</Text>
                <Text style={s.autoValChico}>{autoSub}</Text>
              </>
            ) : null}
          </View>
        </View>

        {/* ── Asegurado | La cuota ── */}
        <View style={s.fila2}>
          <View style={s.bloque}>
            <TituloBloque s={s}>ASEGURADO</TituloBloque>
            <Renglones s={s} filas={[["Nombre", r.titular], ["DNI / CUIT", r.dni]]} />
          </View>
          <View style={s.bloqueSep} />
          <View style={s.bloque}>
            <TituloBloque s={s}>LA CUOTA</TituloBloque>
            <Renglones
              s={s}
              filas={[
                ["Cuota N°", r.cuotaNro],
                ["Vencimiento", r.vencimiento],
                ["Fecha de pago", r.pagado ? r.fechaHoraPago : "—"],
              ]}
            />
          </View>
        </View>

        {/* ── Cómo entró la plata (solo si hay algo que contar) ── */}
        {r.detalle.length > 0 ? (
          <View style={s.detalle}>
            <TituloBloque s={s}>DETALLE DEL COBRO</TituloBloque>
            <Renglones s={s} filas={r.detalle} />
          </View>
        ) : null}

        {/* ── Total ── */}
        <View style={s.total}>
          <Text style={s.totalEtq}>{r.pagado ? "TOTAL ABONADO" : "TOTAL A PAGAR"}</Text>
          <Text style={s.totalVal}>{r.montoTxt}</Text>
        </View>

        {/* ── Inicio de cobertura (1ª cuota o pago fuera de término) ── */}
        {r.aviso ? (
          <View style={s.aviso} wrap={false}>
            <View style={s.avisoSigno}>
              <Text style={s.avisoSignoTxt}>!</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.avisoTitulo}>Inicio de cobertura</Text>
              <Text style={s.avisoTxt}>
                La cobertura comienza a partir del <Text style={s.negrita}>día siguiente</Text> a este pago (fecha de cobertura:{" "}
                <Text style={s.negrita}>{r.fechaCobertura}</Text>).
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── Pie ── */}
        <Text style={s.leyenda} fixed>
          Constancia de pago emitida por {marca?.nombre || "Malvinas"}. La póliza y el recibo oficial los emite la compañía aseguradora.
        </Text>
        <View style={s.pie} fixed>
          <View style={s.pieLinea} />
          <View style={s.pieBanda}>
            <Text style={s.pieTxt}>{telefono ? `WhatsApp ${telefono}` : ""}</Text>
            <Text style={s.pieFuerte}>LEGALES 24 HS</Text>
            <Text style={s.pieTxt}>¡Gracias por confiar en {marca?.nombre || "Malvinas"}!</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* =========================================================================
   🧾 TICKET TÉRMICO (80 mm) — la térmica imprime SOLO negro:
      la franja de la marca va en negro con letras blancas.
   ========================================================================= */

const tk = StyleSheet.create({
  page: { width: TK_W, height: TK_H, paddingHorizontal: mmToPt(4), paddingVertical: mmToPt(6), fontFamily: "Helvetica", fontSize: 9.5, color: "#000", backgroundColor: "#fff" },
  banda: { backgroundColor: "#000", borderRadius: 5, paddingVertical: 8, alignItems: "center" },
  bandaNombre: { fontSize: 21, fontFamily: "Helvetica-Bold", color: "#fff", letterSpacing: 3 },
  bandaLema: { fontSize: 6.8, color: "#fff", letterSpacing: 0.8, marginTop: 2 },
  titulo: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 9, letterSpacing: 1 },
  sub: { fontSize: 8.5, textAlign: "center", marginTop: 2 },
  hr: { borderBottomWidth: 1, borderBottomColor: "#000", borderBottomStyle: "dashed", marginVertical: 8 },
  estado: { fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "center", letterSpacing: 1.5 },
  monto: { fontSize: 22, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 3 },
  montoSub: { fontSize: 8.5, textAlign: "center", marginTop: 2 },
  chapa: { alignSelf: "center", width: 140, borderWidth: 2, borderColor: "#000", borderRadius: 5, overflow: "hidden" },
  chapaBanda: { backgroundColor: "#000", paddingVertical: 2, alignItems: "center" },
  chapaBandaTxt: { fontSize: 6, color: "#fff", letterSpacing: 1.3, fontFamily: "Helvetica-Bold" },
  chapaNro: { fontSize: 18, fontFamily: "Helvetica-Bold", textAlign: "center", letterSpacing: 1.2, paddingVertical: 4 },
  vehiculo: { fontSize: 9, textAlign: "center", marginTop: 4 },
  seccion: { fontSize: 8.5, fontFamily: "Helvetica-Bold", letterSpacing: 1.2, marginBottom: 4 },
  nombre: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  linea: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  etq: { fontSize: 9, width: "48%" },
  val: { fontSize: 9, fontFamily: "Helvetica-Bold", width: "52%", textAlign: "right" },
  total: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 2, borderBottomWidth: 2, borderColor: "#000", paddingVertical: 6, marginTop: 4 },
  totalTxt: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  aviso: { marginTop: 10, borderWidth: 2, borderColor: "#000", borderRadius: 5, paddingVertical: 7, paddingHorizontal: 7 },
  avisoTitulo: { fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 4, letterSpacing: 1 },
  avisoTxt: { fontSize: 8.5, textAlign: "center", lineHeight: 1.35 },
  negrita: { fontFamily: "Helvetica-Bold" },
  pieFuerte: { fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "center" },
  pieTxt: { fontSize: 8.5, textAlign: "center", marginTop: 3 },
  leyenda: { fontSize: 7, textAlign: "center", marginTop: 6, lineHeight: 1.3 },
});

function LineasTicket({ filas }) {
  return filas
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([etq, val]) => (
      <View key={etq} style={tk.linea}>
        <Text style={tk.etq}>{etq}</Text>
        <Text style={tk.val}>{val}</Text>
      </View>
    ));
}

export function ReciboMalvinasTicket({ marca, r }) {
  const nombre = marca?.nombre || "Malvinas";
  return (
    <Document>
      <Page size={{ width: TK_W, height: TK_H }} style={tk.page}>
        <View style={tk.banda}>
          <Text style={tk.bandaNombre}>{marca?.nombreCorto || "MALVINAS"}</Text>
          <Text style={tk.bandaLema}>{String(marca?.recibo?.subtitulo || "").toUpperCase()}</Text>
        </View>

        <Text style={tk.titulo}>RECIBO DE PAGO</Text>
        <Text style={tk.sub}>N° {r.numero} · Emitido el {r.emitido}</Text>

        <View style={tk.hr} />

        <Text style={tk.estado}>{r.pagado ? "PAGO RECIBIDO" : "PAGO PENDIENTE"}</Text>
        <Text style={tk.monto}>{r.montoTxt}</Text>
        <Text style={tk.montoSub}>
          Cuota N° {r.cuotaNro}
          {r.pagado ? ` · ${r.fechaHoraPago}` : ` · vence el ${r.vencimiento}`}
        </Text>

        <View style={tk.hr} />

        <View style={tk.chapa}>
          <View style={tk.chapaBanda}>
            <Text style={tk.chapaBandaTxt}>REPÚBLICA ARGENTINA</Text>
          </View>
          <Text style={tk.chapaNro}>{patenteChapa(r.patente)}</Text>
        </View>
        <Text style={tk.vehiculo}>{[r.vehiculo, r.compania].filter(Boolean).join(" · ")}</Text>

        <View style={tk.hr} />

        <Text style={tk.seccion}>ASEGURADO</Text>
        {/* El nombre en su propio renglón: en 80 mm, al lado de "Nombre" se
            cortaba en dos (ej. "Gon-zalez"). */}
        <Text style={tk.nombre}>{r.titular}</Text>
        <LineasTicket filas={[["DNI / CUIT", r.dni]]} />

        <Text style={[tk.seccion, { marginTop: 4 }]}>LA CUOTA</Text>
        <LineasTicket
          filas={[
            ["Vencimiento", r.vencimiento],
            ["Fecha de pago", r.pagado ? r.fechaHoraPago : "—"],
            ...r.detalle,
          ]}
        />

        <View style={tk.total}>
          <Text style={tk.totalTxt}>{r.pagado ? "TOTAL ABONADO" : "TOTAL A PAGAR"}</Text>
          <Text style={tk.totalTxt}>{r.montoTxt}</Text>
        </View>

        {r.aviso ? (
          <View style={tk.aviso} wrap={false}>
            <Text style={tk.avisoTitulo}>INICIO DE COBERTURA</Text>
            <Text style={tk.avisoTxt}>
              La cobertura comienza a partir del <Text style={tk.negrita}>día siguiente</Text> a este pago (fecha estimada:{" "}
              <Text style={tk.negrita}>{r.fechaCobertura}</Text>).
            </Text>
          </View>
        ) : null}

        <View style={tk.hr} />

        {marca?.telefono ? <Text style={tk.pieFuerte}>WhatsApp {marca.telefono}</Text> : null}
        <Text style={tk.pieTxt}>¡Gracias por confiar en {nombre}!</Text>
        <Text style={tk.leyenda}>
          Constancia de pago emitida por {nombre}. La póliza y el recibo oficial los emite la compañía aseguradora.
        </Text>
      </Page>
    </Document>
  );
}
