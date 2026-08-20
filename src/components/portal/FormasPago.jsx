// src/components/portal/FormasPago.jsx
//
// 💳 EL CORAZÓN DEL PORTAL: cómo paga el cliente.
//
// ── TRES OPCIONES, NO CINCO ────────────────────────────────────────────
//   📱 Mercado Pago            → va derecho a la compañía
//   🏪 Rapipago o Pago Fácil   → va derecho a la compañía
//   🏛 Pagarnos a Thames       → abre un modal con las dos formas nuestras
//
// Se agruparon las dos que son "pagarnos a nosotros" porque son las que
// tienen ajuste de precio, y porque tres opciones se eligen más rápido que
// cinco. El modal muestra los DOS montos calculados: el cliente ve
// $148.000 contra $173.231 y decide en dos segundos, sin sacar cuentas.
//
// (Se sacó "Home banking": casi nadie lo usa para seguros, y el que quiera
//  tiene los mismos datos en Mercado Pago.)
//
// ── EL FLUJO ───────────────────────────────────────────────────────────
//   1. Elige CÓMO va a pagar
//   2. Ve SOLO el dato que necesita para esa forma
//
// Antes se mostraba el código de barras siempre; el que pagaba por Mercado
// Pago veía unas barras y no sabía qué hacer con ellas.

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { uploadToCloudinary } from "../../utils/cloudinary";
import {
  IconCelular, IconLocal, IconEfectivo, IconTransfer,
  IconCodigo, IconChevron, IconAtras, IconFoto, IconChat, IconClip, IconAbajo,
} from "./Iconos";
import {
  money, montoEfectivo, recargoTransferencia,
  DESCUENTO_EFECTIVO, RECARGO_TRANSFERENCIA, waLink, waCita, waFuerte,
} from "./utils";

/* Las tres de la pantalla principal. */
const FORMAS = [
  { k: "mp",     nom: "Mercado Pago",         sub: "Con tu celular",              Icono: IconCelular, tono: "marca", chip: "Gratis", tonoChip: "ok" },
  { k: "rp",     nom: "Rapipago o Pago Fácil", sub: "Con plata en mano",           Icono: IconLocal,   tono: "aviso", chip: "Gratis", tonoChip: "ok" },
  { k: "thames", nom: "Pagarnos a Thames",     sub: "En efectivo o por transferencia", Icono: IconEfectivo, tono: "ok", chip: "Ver",  tonoChip: "marca" },
];

/* 🏪 NO TODAS LAS COMPAÑÍAS SE COBRAN EN RAPIPAGO.
   ────────────────────────────────────────────────
   Lo dice el propio cupón:

     · AMCA      → "Datos Identificatorios para RAPIPAGO y PAGO FACIL",
                   con los dos logos impresos arriba.
     · La Equidad→ NO los menciona en ningún lado. Su cupón dice
                   "RECIBIMOS DE" y "Pago Elec.", y abajo tiene los
                   renglones "Nro. Cheque / Banco / Importe": es un recibo
                   de cobranza, no un cupón de red.

   Ofrecerle Rapipago a un cliente de La Equidad es mandarlo a hacer la cola
   para que le digan que no. Es como darle la boleta de la luz y decirle que
   la pague en la farmacia: la boleta está bien, el lugar no.

   ⚠️ SI ESTO ESTÁ MAL Y LA EQUIDAD SÍ SE COBRA EN RAPIPAGO:
      borrá la línea de "equidad" de acá abajo y vuelve a aparecer. Nada más.

   Las compañías que no figuran en esta tabla muestran las tres formas. */
const FORMAS_POR_COMPANIA = {
  equidad: ["mp", "thames"],   // sin Rapipago: su cupón no es de esa red
};

function _norm(v) {
  return String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/* Qué formas de pago le tocan a esta compañía. */
function formasDe(compania) {
  const c = _norm(compania);
  if (c) {
    for (const [clave, permitidas] of Object.entries(FORMAS_POR_COMPANIA)) {
      if (c.includes(clave)) return FORMAS.filter((f) => permitidas.includes(f.k));
    }
  }
  return FORMAS;
}

const TONOS = {
  marca:  { bg: "var(--m-soft)", fg: "var(--m)" },
  ok:     { bg: "var(--ok-bg)",  fg: "var(--ok)" },
  aviso:  { bg: "var(--wa-bg)",  fg: "var(--wa)" },
  alerta: { bg: "var(--al-bg)",  fg: "var(--al)" },
};

/* ══════════════════ Piezas chicas ══════════════════ */

function Nota({ tono, titulo, texto }) {
  const c = { ok: ["--ok-bg", "--ok", "--ok-br"], aviso: ["--wa-bg", "--wa", "--wa-br"] }[tono]
    || ["--wa-bg", "--wa", "--wa-br"];
  return (
    <div
      style={{
        background: `var(${c[0]})`, color: `var(${c[1]})`, border: `1px solid var(${c[2]})`,
        borderRadius: 12, padding: 14, fontSize: 13.5, lineHeight: 1.55, marginBottom: 14,
      }}
    >
      <b style={{ fontWeight: 700 }}>{titulo}</b>
      {texto ? <> {texto}</> : null}
    </div>
  );
}

/** Dato copiable: clave de pago, DNI, patente, CBU… */
function Dato({ label, valor, destacado = false }) {
  const largo = String(valor || "").length > 22;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(String(valor));
      toast.success(`${label} copiado`);
    } catch {
      toast.error("No se pudo copiar. Anotalo a mano.");
    }
  };
  return (
    <div
      style={{
        background: "var(--card)",
        // El dato principal va con borde de marca: es lo que el cliente vino
        // a buscar y tiene que saltar sobre el resto.
        border: destacado ? "1px solid var(--m)" : "1px solid var(--div)",
        borderRadius: 12, padding: "12px 13px", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 10, marginTop: 8,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11.5, color: "var(--t3)" }}>{label}</div>
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: largo ? 11.5 : 15, fontWeight: 500, marginTop: 3,
            lineHeight: largo ? 1.5 : 1.2, wordBreak: largo ? "break-all" : "normal",
          }}
        >
          {valor}
        </div>
      </div>
      <button
        onClick={copiar}
        style={{
          background: "none", border: "none", color: "var(--m)", fontSize: 13,
          fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          flexShrink: 0, padding: "6px 2px",
        }}
      >
        Copiar
      </button>
    </div>
  );
}

/* 📂 Datos que casi nunca hacen falta, plegados.
   Mercado Pago pide un dato u otro según la compañía, así que hay que
   tenerlos todos — pero mostrarlos los cuatro juntos hace que el cliente
   tenga que leer para encontrar el que le sirve. Acá quedan a un toque. */
function MasDatos({ datos, titulo = "¿Te pide otro dato?" }) {
  const [abierto, setAbierto] = useState(false);
  if (!datos?.length) return null;
  return (
    <div style={{ marginTop: 9 }}>
      <button
        onClick={() => setAbierto((v) => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          width: "100%", background: "none", border: "none", color: "var(--t2)",
          fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", padding: 6,
        }}
      >
        {titulo}{" "}
        <b style={{ color: "var(--m)", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
          {abierto ? "Ocultar" : "Ver más"}
          <span
            className={`portal-flecha${abierto ? " abierta" : ""}`}
            style={{ display: "flex" }}
          >
            <IconAbajo size={11} />
          </span>
        </b>
      </button>
      <div className={`portal-panel${abierto ? " abierto" : ""}`}>
        <div>
          {datos.map((d, i) => <Dato key={i} label={d.label} valor={d.valor} />)}
        </div>
      </div>
    </div>
  );
}

/** Tabla de totales: cuota, ajuste y total. La última fila va en rojo. */
function Totales({ filas }) {
  return (
    <div
      style={{
        borderRadius: 12, overflow: "hidden", marginTop: 12,
        border: "1px solid var(--div)", background: "var(--card)",
      }}
    >
      {filas.map((f, i) => (
        <div
          key={i}
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            gap: 12, padding: "13px 15px", fontSize: f.fin ? 14 : 13.5,
            background: f.fin ? "var(--m)" : "transparent",
            color: f.fin ? "#fff" : "var(--t2)",
            fontWeight: f.fin ? 600 : 400,
            borderTop: i > 0 && !f.fin ? "1px solid var(--div)" : "none",
          }}
        >
          <span>{f.label}</span>
          <span
            style={{
              fontWeight: f.fin ? 700 : 500, fontSize: f.fin ? 18 : 14,
              letterSpacing: f.fin ? "-.02em" : "normal",
              color: f.fin ? "#fff" : "var(--t1)",
            }}
          >
            {f.valor}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Código de barras dibujado. Fondo BLANCO fijo: sobre negro no se escanea. */
function CodigoBarras({ codigo, vence }) {
  const barras = [];
  for (let i = 0; i < codigo.length; i++) {
    const d = parseInt(codigo[i], 10);
    barras.push({ w: 1 + (d % 3), c: "#111" });
    barras.push({ w: 1 + ((d + 1) % 2), c: "transparent" });
  }
  return (
    <div
      style={{
        background: "#FFFFFF", border: "1px solid rgba(0,0,0,.1)", borderRadius: 13,
        padding: "18px 16px 16px", marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em",
          textTransform: "uppercase", color: "#6B7280", textAlign: "center",
        }}
      >
        Vence {vence}
      </div>
      <div
        style={{
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          height: 62, gap: 1, margin: "14px 0 12px", overflow: "hidden",
        }}
      >
        {barras.map((b, i) => (
          <i key={i} style={{ display: "block", height: "100%", width: b.w, background: b.c }} />
        ))}
      </div>
      <div
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 10.5,
          textAlign: "center", wordBreak: "break-all", color: "#111",
          lineHeight: 1.7, letterSpacing: ".02em",
        }}
      >
        {codigo}
      </div>
    </div>
  );
}

/* ══════════════════ Modal "Pagarnos a Thames" ══════════════════ */

function ModalThames({ monto, onElegir, onCerrar }) {
  const ef = montoEfectivo(monto);
  const ahorro = monto - ef;
  const rec = recargoTransferencia(monto);

  return (
    <div
      className="portal-fadein"
      onClick={onCerrar}
      style={{
        position: "fixed", inset: 0, zIndex: 210,
        background: "rgba(0,0,0,.72)",
        backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        className="portal-hoja"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)", borderRadius: 22, width: "100%", maxWidth: 380,
          maxHeight: "88vh", overflow: "auto",
          boxShadow: "0 24px 60px rgba(0,0,0,.5)",
        }}
      >
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12, padding: "18px 20px 14px", borderBottom: "1px solid var(--div)",
          }}
        >
          <b style={{ fontSize: 16, fontWeight: 650, letterSpacing: "-.015em" }}>
            ¿Cómo nos pagás?
          </b>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            style={{
              height: 30, width: 30, border: "none", borderRadius: "50%",
              background: "var(--bg)", color: "var(--t2)", fontSize: 17, lineHeight: 1,
              cursor: "pointer", flexShrink: 0, fontFamily: "inherit",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "16px 20px 22px" }}>
          {/* 💵 EFECTIVO — destacado. Es el que conviene a los dos: el cliente
              paga menos y a la oficina no le cuesta comisión bancaria. */}
          <button
            onClick={() => onElegir("ef")}
            className="portal-tap-card"
            style={{
              width: "100%", background: "var(--ok-bg)", border: "1px solid var(--ok)",
              borderRadius: 16, padding: 15, marginBottom: 11, cursor: "pointer",
              fontFamily: "inherit", color: "var(--t1)", textAlign: "left", display: "block",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 11 }}>
              <span
                style={{
                  height: 38, width: 38, borderRadius: 11, flexShrink: 0,
                  background: "rgba(63,208,138,.18)", color: "var(--ok)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <IconEfectivo />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: "block", fontSize: 15, fontWeight: 650, letterSpacing: "-.015em" }}>
                  En efectivo, en la oficina
                </b>
                <span style={{ display: "block", fontSize: 12.5, color: "var(--ok)", marginTop: 2 }}>
                  Te hacemos {Math.round(DESCUENTO_EFECTIVO * 100)}% de descuento
                </span>
              </span>
            </span>
            <span
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "baseline",
                paddingTop: 11, borderTop: "1px solid rgba(63,208,138,.25)",
              }}
            >
              <small style={{ fontSize: 12, color: "var(--t2)" }}>Pagás</small>
              <b style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.025em", color: "var(--ok)" }}>
                {money(ef)}
              </b>
            </span>
            <span style={{ display: "block", fontSize: 12, color: "var(--ok)", marginTop: 7, fontWeight: 600 }}>
              Ahorrás {money(ahorro)}
            </span>
          </button>

          {/* 💸 TRANSFERENCIA */}
          <button
            onClick={() => onElegir("tr")}
            className="portal-tap-card"
            style={{
              width: "100%", background: "var(--bg)", border: "1px solid var(--div)",
              borderRadius: 16, padding: 15, cursor: "pointer",
              fontFamily: "inherit", color: "var(--t1)", textAlign: "left", display: "block",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 11 }}>
              <span
                style={{
                  height: 38, width: 38, borderRadius: 11, flexShrink: 0,
                  background: "var(--wa-bg)", color: "var(--wa)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <IconTransfer />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: "block", fontSize: 15, fontWeight: 650, letterSpacing: "-.015em" }}>
                  Por transferencia
                </b>
                <span style={{ display: "block", fontSize: 12.5, color: "var(--t2)", marginTop: 2 }}>
                  Se suma {Math.round(RECARGO_TRANSFERENCIA * 100)}% de gastos bancarios
                </span>
              </span>
            </span>
            <span
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "baseline",
                paddingTop: 11, borderTop: "1px solid var(--div)",
              }}
            >
              <small style={{ fontSize: 12, color: "var(--t2)" }}>Pagás</small>
              <b style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.025em" }}>
                {money(monto + rec)}
              </b>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ Botones para mandar el comprobante ══════════════════

   Tres caminos, y cada uno resuelve un caso real:

   💬 WhatsApp     → el que ya tiene la foto en la galería, o prefiere hablar
   📷 Sacar foto   → tiene el ticket en la mano, recién salió de la caja
   📎 Elegir       → el PDF de la transferencia, que ya está descargado

   La cámara va con `capture="environment"`: abre la de ATRÁS, que es la que
   sirve para fotografiar un papel. Sin eso, en algunos celulares abre la
   frontal y el cliente se ve la cara.                                     */
function BotonesComprobante({ waUrl, onArchivo, subiendo, refCamara, refArchivo }) {
  return (
    <>
      {/* Los dos input van escondidos: los disparan los botones. */}
      <input
        ref={refCamara}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onArchivo}
        style={{ display: "none" }}
      />
      <input
        ref={refArchivo}
        type="file"
        accept="image/*,application/pdf"
        onChange={onArchivo}
        style={{ display: "none" }}
      />

      <a
        href={waUrl || "#"}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          background: "var(--m)", color: "#fff", borderRadius: 11, padding: 14,
          fontSize: 14.5, fontWeight: 600, textAlign: "center", fontFamily: "inherit",
        }}
      >
        <IconChat size={17} /> Enviar por WhatsApp
      </a>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <button
          onClick={() => refCamara.current?.click()}
          disabled={subiendo}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            background: "var(--card)", color: "var(--t1)", border: "1px solid var(--div)",
            borderRadius: 11, padding: 13, fontSize: 13.5, fontWeight: 600,
            cursor: subiendo ? "default" : "pointer", fontFamily: "inherit",
            opacity: subiendo ? 0.6 : 1,
          }}
        >
          <IconFoto size={17} /> Sacar foto
        </button>

        <button
          onClick={() => refArchivo.current?.click()}
          disabled={subiendo}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            background: "var(--card)", color: "var(--t1)", border: "1px solid var(--div)",
            borderRadius: 11, padding: 13, fontSize: 13.5, fontWeight: 600,
            cursor: subiendo ? "default" : "pointer", fontFamily: "inherit",
            opacity: subiendo ? 0.6 : 1,
          }}
        >
          {subiendo ? "Subiendo…" : <><IconClip size={16} /> Elegir archivo</>}
        </button>
      </div>
    </>
  );
}

/* ══════════════════ El componente ══════════════════ */

export default function FormasPago({ poliza, cupon, onVerCuponera, onComprobanteSubido }) {
  const [forma, setForma] = useState(null);
  const [modal, setModal] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  // 📷 Dos inputs distintos: uno abre la CÁMARA (`capture="environment"`) y el
  //    otro el selector de archivos. No alcanza con uno: si tiene `capture`,
  //    el celular abre la cámara directo y no deja elegir de la galería ni
  //    mandar un PDF; sin `capture`, nunca abre la cámara.
  const inputCamara = useRef(null);
  const inputArchivo = useRef(null);

  const monto = Number(cupon?.monto || poliza?.precio_actual || 0);
  const cod = (cupon?.codigo_barras || "").trim();
  // 🖼️ La imagen de ESTE cupón, recortada de la hoja. Si está, se muestra
  //    esa: un solo código, sin que el cajero tenga que elegir entre tres.
  const imgCupon = (cupon?.imagen_url || "").trim();
  const cuponeraUrl = imgCupon || (poliza?.cuponera_url || "").trim();
  const wa = poliza?.oficina_whatsapp;
  const nombre = poliza?.__cliente_nombre || "";

  /* 📎 SUBIR EL COMPROBANTE
     El archivo va DIRECTO a Cloudinary y al backend solo le llega la URL.
     El cupón queda REPORTADO, no pagado: eso lo confirma la oficina. */
  const subirComprobante = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";                 // permite reintentar con el mismo archivo
    if (!file) return;

    // 8 MB: una foto de celular pesa 2-4 MB. Más que eso suele ser un video
    // mandado por error.
    if (file.size > 8 * 1024 * 1024) {
      toast.error("El archivo es muy pesado. Probá con una foto.");
      return;
    }

    setSubiendo(true);
    try {
      const up = await uploadToCloudinary(file, "portal/comprobantes");
      const base = String(
        import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || window.location.origin
      ).trim().replace(/\/+$/g, "").replace(/\/api$/i, "");

      const res = await fetch(
        `${base}/public/portal/${poliza.__token}/cupon/${cupon.id}/comprobante/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: up.secure_url, public_id: up.public_id, mime: up.mime }),
        }
      );
      if (!res.ok) throw new Error("No se pudo registrar");
      const data = await res.json();

      toast.success(data.mensaje || "¡Recibimos tu comprobante!", { duration: 4000 });
      onComprobanteSubido?.();
    } catch (err) {
      console.error("[portal] comprobante:", err);
      toast.error("No se pudo subir. Probá de nuevo o mandanoslo por WhatsApp.");
    } finally {
      setSubiendo(false);
    }
  };

  /* ── Paso 1: elegir cómo ── */
  if (!forma) {
    return (
      <>
        <div style={{ padding: "18px 20px 20px" }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--t2)", marginBottom: 12 }}>
            Elegí cómo querés pagar
          </div>
          <div style={{ display: "grid", gap: 9 }}>
            {/* 🏪 Solo las formas que ESTA compañía acepta de verdad.
                   Ver FORMAS_POR_COMPANIA arriba. */}
            {formasDe(poliza?.compania).map(({ k, nom, sub, Icono, tono, chip, tonoChip }) => {
              const t = TONOS[tono];
              const tc = TONOS[tonoChip];
              return (
                <button
                  key={k}
                  onClick={() => (k === "thames" ? setModal(true) : setForma(k))}
                  className="portal-tap portal-stagger"
                  style={{
                    display: "flex", alignItems: "center", gap: 13, width: "100%",
                    background: "var(--card)", border: "1px solid var(--div)",
                    borderRadius: 13, padding: 13, cursor: "pointer",
                    fontFamily: "inherit", color: "var(--t1)", textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      height: 38, width: 38, borderRadius: 11, flexShrink: 0,
                      background: t.bg, color: t.fg, display: "flex",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Icono />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, letterSpacing: "-.01em" }}>
                      {nom}
                    </span>
                    <span style={{ display: "block", fontSize: 12.5, color: "var(--t2)", marginTop: 2 }}>
                      {sub}
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: 11.5, fontWeight: 600, padding: "4px 9px", borderRadius: 6,
                      flexShrink: 0, background: tc.bg, color: tc.fg,
                    }}
                  >
                    {chip}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {modal ? (
          <ModalThames
            monto={monto}
            onElegir={(k) => { setForma(k); setModal(false); }}
            onCerrar={() => setModal(false)}
          />
        ) : null}
      </>
    );
  }

  /* ── Paso 2: el detalle de la forma elegida ── */
  const DEFS = {
    mp: { nom: "Mercado Pago",              Icono: IconCelular,  tono: "marca" },
    rp: { nom: "Rapipago o Pago Fácil",     Icono: IconLocal,    tono: "aviso" },
    ef: { nom: "En efectivo, en la oficina", Icono: IconEfectivo, tono: "ok" },
    tr: { nom: "Por transferencia",          Icono: IconTransfer, tono: "aviso" },
  };
  const def = DEFS[forma];
  const t = TONOS[def.tono];
  const cuerpo = [];

  if (forma === "mp") {
    /* Una línea en vez de tres pasos numerados.
       El que usa Mercado Pago sabe entrar a "Pagar servicios" — lo que no
       sabe es QUÉ NÚMERO poner. Ese es el dato que tiene que saltar.

       Y se muestra UNO solo, el principal. Los otros tres quedan detrás de
       "¿Te pide otro dato?": están si hacen falta, pero no compiten. */
    const principal = poliza?.clave_pago
      ? { label: "Clave de pago", valor: poliza.clave_pago }
      : poliza?.__cliente_dni
      ? { label: "DNI", valor: poliza.__cliente_dni }
      : null;

    const otros = [
      poliza?.clave_pago && poliza?.__cliente_dni ? { label: "DNI", valor: poliza.__cliente_dni } : null,
      poliza?.patente ? { label: "Patente", valor: poliza.patente } : null,
      cod ? { label: "Código de barras", valor: cod } : null,
    ].filter(Boolean);

    cuerpo.push(
      <div key="ins" style={{ fontSize: 14, color: "var(--t2)", marginBottom: 12, lineHeight: 1.55 }}>
        <b style={{ color: "var(--t1)", fontWeight: 700 }}>
          Pagar servicios → {poliza?.compania || "tu compañía"}
        </b>
        <br />y pegá este número:
      </div>,
    );
    /* 💡 En las compañías que no van por Rapipago, esta pantalla es EL camino
          de pago. Vale aclarar que el mismo número sirve en el home banking:
          el que no usa Mercado Pago igual puede pagar y no queda a pie. */
    if (!formasDe(poliza?.compania).some((f) => f.k === "rp")) {
      cuerpo.push(
        <div key="hb" style={{ fontSize: 12.5, color: "var(--t3)", marginBottom: 10, lineHeight: 1.5 }}>
          El mismo número sirve en tu home banking, en “Pagos” → “Link / Banelco”.
        </div>,
      );
    }
    if (principal) cuerpo.push(<Dato key="pr" label={principal.label} valor={principal.valor} destacado />);
    if (otros.length) cuerpo.push(<MasDatos key="mas" datos={otros} />);
  }

  else if (forma === "rp") {
    if (cuponeraUrl || cod) {
      /* 🎯 El código se ve DIRECTO, sin botón intermedio.
         Antes había 3 pasos escritos + un botón "Abrir mi cupón" + el código
         repetido abajo. El cliente está parado en la caja: necesita el
         código a la vista, no instrucciones. */
      if (imgCupon) {
        cuerpo.push(
          <button
            key="img"
            onClick={() => onVerCuponera(cuponeraUrl, `Cupón del ${cupon?.vence_texto || ""}`)}
            style={{
              display: "block", width: "100%", padding: 0, border: "none",
              background: "#fff", borderRadius: 13, overflow: "hidden",
              cursor: "pointer", marginBottom: 10,
            }}
          >
            <img
              src={imgCupon}
              alt="Tu cupón"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </button>,
          <div key="ver" style={{ fontSize: 13, color: "var(--t2)", textAlign: "center", marginBottom: 4 }}>
            Mostralo en la caja ·{" "}
            <b
              onClick={() => onVerCuponera(cuponeraUrl, `Cupón del ${cupon?.vence_texto || ""}`)}
              style={{ color: "var(--m)", fontWeight: 700, cursor: "pointer" }}
            >
              Ver grande
            </b>
          </div>,
        );
      } else if (cuponeraUrl) {
        // Sin recorte: queda el botón a la cuponera entera.
        cuerpo.push(
          <button
            key="cup"
            onClick={() => onVerCuponera(cuponeraUrl, "Tu cuponera")}
            className="portal-tap"
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              background: "var(--m-soft)", border: "1px solid var(--m-line)",
              borderRadius: 13, padding: 14, marginBottom: 10, cursor: "pointer",
              fontFamily: "inherit", textAlign: "left",
            }}
          >
            <span
              style={{
                height: 40, width: 40, borderRadius: 12, background: "#fff",
                color: "var(--m)", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0,
              }}
            >
              <IconCodigo />
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700 }}>
              Abrir mi cuponera
            </span>
            <span style={{ color: "var(--m)", flexShrink: 0 }}><IconChevron /></span>
          </button>
        );
      }
      // Sin imagen, el código dibujado. Con imagen, el número queda detrás
      // de "¿No lo pueden escanear?" — solo aparece si hace falta.
      if (cod && !imgCupon) {
        cuerpo.push(<CodigoBarras key="cb" codigo={cod} vence={cupon?.vence_texto || ""} />);
      }
      if (cod) {
        cuerpo.push(
          <MasDatos key="mas" datos={[{ label: "Código de barras", valor: cod }]}
            titulo="¿No lo pueden escanear?" />
        );
      }
    } else {
      cuerpo.push(
        <Nota key="n" tono="aviso"
          titulo="Todavía no tenemos tu papel de pago."
          texto="Escribinos y te lo mandamos por WhatsApp." />
      );
    }
  }

  else if (forma === "ef") {
    // 💵 Descuento por pagar en efectivo, redondeado a $1.000 para abajo:
    //    nadie tiene $484 en cambio.
    /* Lo único que necesita saber es CUÁNTO LLEVAR.
       Antes había una tabla de tres filas con el desglose del descuento; el
       cliente ya vio ese desglose en el modal donde eligió. Acá va el número
       solo, grande. */
    const ef = montoEfectivo(monto);
    const ahorro = monto - ef;
    cuerpo.push(
      <div key="monto" style={{ textAlign: "center", padding: "16px 0 12px" }}>
        <div style={{ fontSize: 12.5, color: "var(--t3)" }}>Llevá</div>
        <div
          style={{
            fontSize: 38, fontWeight: 700, letterSpacing: "-.03em",
            color: "var(--ok)", margin: "4px 0 3px", lineHeight: 1,
          }}
        >
          {money(ef)}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ok)" }}>
          Ahorrás {money(ahorro)}
        </div>
      </div>,
      <div key="dir" style={{ fontSize: 13, color: "var(--t2)", textAlign: "center", lineHeight: 1.5 }}>
        {poliza?.oficina_nombre || "Nuestra oficina"} · L a V de 9 a 18
      </div>,
    );
  }

  else if (forma === "tr") {
    const r = recargoTransferencia(monto);
    const pct = Math.round(RECARGO_TRANSFERENCIA * 100);
    cuerpo.push(
      <Nota key="n" tono="aviso"
        titulo={`Si transferís, se suma un ${pct}%.`}
        texto={`La plata pasa primero por nuestra cuenta y eso tiene un costo. Si venís a la oficina con efectivo, te hacemos ${Math.round(DESCUENTO_EFECTIVO * 100)}% de descuento.`} />,
      <Totales key="t" filas={[
        { label: "Cuota", valor: money(monto) },
        { label: `Lo que se suma (${pct}%)`, valor: money(r) },
        { label: "Total a transferir", valor: money(monto + r), fin: true },
      ]} />,
    );
    // 🚫 No se muestran alias ni CBU en el portal. El cliente los pide por
    //    WhatsApp y la oficina se los pasa: así controla a qué cuenta cobra
    //    y confirma el monto en el momento. El desglose SÍ queda, para que
    //    sepa cuánto va a transferir antes de escribir.
  }

  /* 💬 Los mensajes de WhatsApp.
     Van con formato: *negrita* para lo importante y `>` para meter los
     números en un bloque de cita, que se lee de un vistazo. Así el que
     atiende en la oficina no tiene que buscar el dato entre el texto. */
  const bien = `${poliza?.marca || ""} ${poliza?.modelo || ""}`.trim();
  const pat = poliza?.patente ? ` (${poliza.patente})` : "";
  const vto = cupon?.vence_texto || "";

  const msgComprobante = [
    `Hola, soy ${waFuerte(nombre)}`,
    `Te paso el comprobante de pago:`,
    ``,
    waCita([
      `${waFuerte(bien)}${pat}`,
      `Cupón que vence el ${waFuerte(vto)}`,
      `Importe: ${waFuerte(money(monto))}`,
    ].join("\n")),
  ].join("\n");

  const msgVoy = [
    `Hola, soy ${waFuerte(nombre)}`,
    `Voy a pasar por la oficina a pagar en efectivo:`,
    ``,
    waCita([
      `${waFuerte(bien)}${pat}`,
      `Cupón que vence el ${waFuerte(vto)}`,
      `Pago: ${waFuerte(money(montoEfectivo(monto)))}`,
      `(ya con el ${Math.round(DESCUENTO_EFECTIVO * 100)}% de descuento)`,
    ].join("\n")),
  ].join("\n");

  const msgTransferencia = [
    `Hola, soy ${waFuerte(nombre)}`,
    `Quiero pagar por transferencia:`,
    ``,
    waCita([
      `${waFuerte(bien)}${pat}`,
      `Cupón que vence el ${waFuerte(vto)}`,
      `Cuota: ${money(monto)}`,
      `Gastos (${Math.round(RECARGO_TRANSFERENCIA * 100)}%): ${money(recargoTransferencia(monto))}`,
      `Total: ${waFuerte(money(monto + recargoTransferencia(monto)))}`,
    ].join("\n")),
    ``,
    `¿Me pasás los datos para transferir?`,
  ].join("\n");

  return (
    <div style={{ padding: "18px 20px 20px" }}>
      {/* La forma elegida queda marcada arriba, con su ícono y su color. */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
        <span
          style={{
            height: 34, width: 34, borderRadius: 10, flexShrink: 0,
            background: t.bg, color: t.fg, display: "flex",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <def.Icono />
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>
          {def.nom}
        </span>
      </div>

      {cuerpo}

      {/* 💵 EFECTIVO: avisa que va, y también manda comprobante cuando paga.
             Avisar antes sirve para que la oficina lo espere con el recibo
             hecho y no lo haga esperar en el mostrador. */}
      {/* 💸 TRANSFERENCIA: los datos se piden por WhatsApp, no se muestran
             acá. Así la oficina controla a qué cuenta cobra y confirma el
             monto en el momento. */}
      {forma === "tr" ? (
        <>
          <a
            href={waLink(wa, msgTransferencia) || "#"}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block", marginTop: 14, background: "var(--m)", color: "#fff",
              borderRadius: 11, padding: 14, fontSize: 14.5, fontWeight: 600,
              textAlign: "center", fontFamily: "inherit",
            }}
          >
            Pedir los datos por WhatsApp
          </a>
          <div
            style={{
              fontSize: 13, color: "var(--t2)", textAlign: "center",
              margin: "14px 0 0", lineHeight: 1.5,
            }}
          >
            Cuando transfieras, mandanos el comprobante por el mismo chat
          </div>
        </>
      ) : forma === "ef" ? (
        <>
          <a
            href={waLink(wa, msgVoy) || "#"}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block", marginTop: 14, background: "var(--m)", color: "#fff",
              borderRadius: 11, padding: 14, fontSize: 14.5, fontWeight: 600,
              textAlign: "center", fontFamily: "inherit",
            }}
          >
            Avisar que voy a pasar
          </a>
        </>
      ) : (
        <>
          <div
            style={{
              fontSize: 13, color: "var(--t2)", textAlign: "center",
              margin: "16px 0 10px", lineHeight: 1.5,
            }}
          >
            Cuando pagues, mandanos el comprobante
          </div>
          <BotonesComprobante
            waUrl={waLink(wa, msgComprobante)}
            onArchivo={subirComprobante}
            subiendo={subiendo}
            refCamara={inputCamara}
            refArchivo={inputArchivo}
          />
        </>
      )}

      <button
        onClick={() => setForma(null)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          width: "100%", marginTop: 12, background: "none", border: "none",
          color: "var(--m)", fontSize: 14, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit", padding: 8,
        }}
      >
        <IconAtras size={15} /> Cambiar forma de pago
      </button>
    </div>
  );
}