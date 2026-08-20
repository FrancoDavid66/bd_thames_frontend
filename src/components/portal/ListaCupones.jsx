// src/components/portal/ListaCupones.jsx
//
// 🎟️ La cuponera: cada pago con su fecha, importe y estado.
//
// Al tocar un cupón se despliega adentro el flujo de pago (FormasPago).
// Se abre uno solo a la vez: si el cliente ve tres códigos juntos no sabe
// cuál mostrarle al cajero.

import { useState } from "react";
import { IconAbajo, IconTick } from "./Iconos";
import { Chip } from "./Lista";
import FormasPago from "./FormasPago";
import { money, fmtLargo, estadoCupon } from "./utils";

const ESTADOS = {
  pagado:    { chip: "ok",     texto: "Pagado",           punto: "var(--ok)" },
  revisando: { chip: "marca",  texto: "Estamos revisando", punto: "var(--m)" },
  vencido:   { chip: "alerta", texto: "Vencido",          punto: "var(--al)" },
  a_pagar:   { chip: "aviso",  texto: "A pagar",          punto: "var(--wa)" },
};

export default function ListaCupones({ poliza, cupones = [], onVerCuponera, onComprobanteSubido }) {
  /* 🎯 El cupón más urgente arranca ABIERTO.
     Antes había que tocarlo para elegir la forma de pago, y con tres cupones
     idénticos el cliente dudaba cuál era el suyo. Ahora el primero impago
     —que es el más viejo, el que hay que pagar primero— ya está desplegado.
     Un toque menos y cero duda. */
  const primerImpago = cupones.find((c) => estadoCupon(c) !== "pagado");
  const [abierto, setAbierto] = useState(primerImpago?.id ?? null);

  /* 🧠 Qué cupones montar.
     El contenido tiene que quedar MONTADO aunque el cupón esté cerrado: si se
     desmontara, al cerrar desaparecería de golpe en vez de plegarse suave.

     Pero montarlos TODOS desde el arranque crearía un FormasPago por cupón,
     cada uno con su estado y sus refs. Con este set solo se montan los que el
     cliente abrió alguna vez — al principio, uno solo. */
  const [tocados, setTocados] = useState(
    () => new Set(primerImpago?.id != null ? [primerImpago.id] : [])
  );

  const alternar = (id) => {
    setTocados((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    setAbierto((prev) => (prev === id ? null : id));
  };

  /* 📂 Los pagos hechos van PLEGADOS al final.
     Antes quedaban en la lista, grises y sin poder tocarse — el cliente veía
     tres filas muertas y, peor, no podía ver el comprobante que él mismo
     había mandado.
     Ahora: arriba lo que hay que pagar, abajo un bloque "✓ N pagos hechos"
     que se abre y muestra cada uno con su comprobante. */
  const [verPagados, setVerPagados] = useState(false);

  /* 🧾 Qué pago está mostrando su constancia.
     Antes, un pago hecho era una fila gris con un link. Ahora se toca y se
     abre el comprobante: tilde verde, el monto grande y los datos. Es lo que
     hace que el cliente sienta que pagó, y no que "desapareció de la lista". */
  const [constancia, setConstancia] = useState(null);

  if (!cupones.length) return null;

  const pendientes = cupones.filter((c) => estadoCupon(c) !== "pagado");
  const pagados = cupones.filter((c) => estadoCupon(c) === "pagado");

  return (
    <div
      className="portal-fadein"
      style={{
        // Mismo bloque flotante que la lista de seguros: redondeado, con
        // sombra y margen lateral. Así todo el portal habla el mismo idioma.
        background: "var(--card)",
        borderRadius: 16,
        margin: "0 15px",
        overflow: "hidden",
        boxShadow: "var(--lista-sombra)",
        border: "var(--lista-borde)",
      }}
    >
      {pendientes.map((c, i) => {
        const est = estadoCupon(c);
        const E = ESTADOS[est];
        // "Revisando" se cierra: el cliente ya hizo lo suyo, no tiene sentido
        // que vuelva a elegir forma de pago.
        const pagado = est === "revisando";
        const abierta = abierto === c.id;
        const monto = c.monto || poliza?.precio_actual || 0;

        return (
          <div key={c.id ?? i}>
            <button
              onClick={() => (pagado ? null : alternar(c.id))}
              disabled={pagado}
              className={pagado ? undefined : "portal-tap"}
              style={{
                display: "flex", alignItems: "center", gap: 14, width: "100%",
                padding: "15px 16px", background: "none", border: "none",
                fontFamily: "inherit", color: "var(--t1)", textAlign: "left",
                cursor: pagado ? "default" : "pointer", position: "relative",
              }}
            >
              {i > 0 ? (
                <span
                  style={{
                    position: "absolute", top: 0, left: 16, right: 0,
                    height: 1, background: "var(--div)",
                  }}
                />
              ) : null}

              {/* El punto de "vencido" respira. Los otros quedan quietos:
                  si todos se movieran, ninguno llamaría la atención. */}
              <span
                className={est === "vencido" ? "portal-respira" : undefined}
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: E.punto, flexShrink: 0,
                }}
              />

              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 15, fontWeight: 500, letterSpacing: "-.01em" }}>
                  {c.vence_texto || fmtLargo(c.fecha_vencimiento)}
                </span>
                <span style={{ display: "block", marginTop: 5 }}>
                  <Chip tono={E.chip}>{E.texto}</Chip>
                </span>
              </span>

              <span style={{ fontSize: 15.5, fontWeight: 600, flexShrink: 0, letterSpacing: "-.01em" }}>
                {money(monto)}
              </span>

              {!pagado ? (
                <span
                  className={`portal-flecha${abierta ? " abierta" : ""}`}
                  style={{ color: "var(--t3)", flexShrink: 0 }}
                >
                  <IconAbajo />
                </span>
              ) : null}
            </button>

            {/* El flujo de pago, adentro del cupón.
                🔑 Necesita DOS divs: el de afuera hace la animación de altura
                (grid 0fr→1fr) y el de adentro lleva el overflow. Con uno solo
                el contenido se desborda mientras se despliega.

                Y el contenido queda MONTADO aunque esté cerrado: si se
                desmontara, al cerrar desaparecería de golpe en vez de
                plegarse. */}
            <div className={`portal-panel${abierta ? " abierto" : ""}`}>
              <div style={{ background: "var(--bg)" }}>
                {tocados.has(c.id) ? (
                <FormasPago
                  poliza={poliza}
                  cupon={{ ...c, monto, vence_texto: c.vence_texto || fmtLargo(c.fecha_vencimiento) }}
                  onVerCuponera={onVerCuponera}
                  onComprobanteSubido={() => { setAbierto(null); onComprobanteSubido?.(); }}
                />
                ) : null}
              </div>
            </div>
          </div>
        );
      })}

      {/* ✓ Los pagos hechos, plegados. Adentro, cada uno con su comprobante:
             el cliente lo mandó, tiene derecho a poder verlo después. */}
      {pagados.length ? (
        <>
          <button
            onClick={() => setVerPagados((v) => !v)}
            className="portal-tap"
            style={{
              display: "flex", alignItems: "center", gap: 11, width: "100%",
              padding: "13px 16px", background: "var(--card)", border: "none",
              borderTop: pendientes.length ? "1px solid var(--div)" : "none",
              fontFamily: "inherit", color: "var(--t1)", textAlign: "left",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                height: 26, width: 26, borderRadius: 8, flexShrink: 0,
                background: "var(--ok-bg)", color: "var(--ok)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <IconTick size={14} />
            </span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>
              {pagados.length === 1 ? "1 pago hecho" : `${pagados.length} pagos hechos`}
            </span>
            <span
              className={`portal-flecha${verPagados ? " abierta" : ""}`}
              style={{ color: "var(--t3)", flexShrink: 0 }}
            >
              <IconAbajo />
            </span>
          </button>

          <div className={`portal-panel${verPagados ? " abierto" : ""}`}>
            <div>
              {pagados.map((c, i) => {
                const monto = c.monto || poliza?.precio_actual || 0;
                const abierta = constancia === c.id;
                return (
                  <div key={c.id ?? `p${i}`}>
                    <button
                      onClick={() => setConstancia((v) => (v === c.id ? null : c.id))}
                      className="portal-tap"
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        padding: "11px 16px 11px 47px", background: "var(--card)",
                        borderTop: "1px solid var(--div)", fontSize: 13,
                        border: "none", borderTopWidth: 1, borderTopStyle: "solid",
                        borderTopColor: "var(--div)", fontFamily: "inherit",
                        color: "var(--t1)", textAlign: "left", cursor: "pointer",
                      }}
                    >
                      <span style={{ flex: 1, color: "var(--t2)", minWidth: 0 }}>
                        {c.vence_texto || fmtLargo(c.fecha_vencimiento)}
                      </span>
                      <span style={{ fontWeight: 600, flexShrink: 0 }}>
                        {money(monto)}
                      </span>
                      <span
                        className={`portal-flecha${abierta ? " abierta" : ""}`}
                        style={{ color: "var(--t3)", flexShrink: 0 }}
                      >
                        <IconAbajo />
                      </span>
                    </button>

                    <div className={`portal-panel${abierta ? " abierto" : ""}`}>
                      <Constancia
                        cupon={c}
                        monto={monto}
                        poliza={poliza}
                        onVerCuponera={onVerCuponera}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ═══════════════════ 🧾 Constancia de pago ═══════════════════
   Lo que ve el cliente cuando toca un pago hecho.

   ── POR QUÉ EXISTE ──────────────────────────────────────────────────
   Antes, pagar era ver desaparecer una fila de la lista. Nada más. El
   cliente pagaba $89.000 y el portal no le devolvía nada que se sintiera
   como un comprobante.

   ── LO QUE NO TIENE, A PROPÓSITO ────────────────────────────────────
   No dice hasta cuándo está cubierto. Ese dato no lo sabemos con certeza:
   cada compañía lo calcula distinto y ninguna nos lo manda. Si el portal
   dijera "cubierto hasta el 8/10" y la compañía dijera otra cosa, el
   cliente reclamaría con NUESTRA pantalla en la mano.

   El período exacto está impreso en el cupón, con la firma de la
   compañía. Ahí sí es palabra de ellos.

   ── COMPARTIR ───────────────────────────────────────────────────────
   Usa el menú nativo del celular (navigator.share): el cliente se lo manda
   a la mujer, al contador, o lo guarda. Si el navegador no lo soporta
   (escritorio viejo), copia el texto al portapapeles y avisa.
*/
function Constancia({ cupon, monto, poliza, onVerCuponera }) {
  const comp = (cupon.comprobante_url || "").trim();
  const cuando = cupon.fecha_pago ? fmtLargo(cupon.fecha_pago) : null;
  const vehiculo = [poliza?.marca, poliza?.modelo].filter(Boolean).join(" ");

  const compartir = async () => {
    const texto =
      `Pagué ${money(monto)} del seguro` +
      (vehiculo ? ` de mi ${vehiculo}` : "") +
      (poliza?.patente ? ` (${poliza.patente})` : "") +
      (cuando ? ` el ${cuando}` : "") +
      ".";
    try {
      if (navigator.share) {
        await navigator.share({ text: texto });
        return;
      }
      await navigator.clipboard?.writeText(texto);
    } catch {
      /* El cliente canceló el menú de compartir. No es un error. */
    }
  };

  const Fila = ({ label, valor }) =>
    valor ? (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0" }}>
        <span style={{ fontSize: 13.5, color: "var(--t2)", flexShrink: 0 }}>{label}</span>
        <span style={{ fontSize: 13.5, textAlign: "right", minWidth: 0 }}>{valor}</span>
      </div>
    ) : null;

  return (
    <div style={{ background: "var(--bg)", padding: "18px 16px 16px" }}>
      {/* Tilde grande + monto. Es lo primero que busca el ojo. */}
      <div style={{ textAlign: "center", paddingBottom: 14 }}>
        <span
          style={{
            width: 46, height: 46, borderRadius: "50%", background: "var(--ok-bg)",
            color: "var(--ok)", display: "inline-flex", alignItems: "center",
            justifyContent: "center", marginBottom: 10,
          }}
        >
          <IconTick size={24} />
        </span>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--t1)" }}>Pago registrado</div>
        <div style={{ fontSize: 25, fontWeight: 600, color: "var(--t1)", marginTop: 5, letterSpacing: "-.02em" }}>
          {money(monto)}
        </div>
        {cuando ? (
          <div style={{ fontSize: 13, color: "var(--t2)", marginTop: 3 }}>{cuando}</div>
        ) : null}
      </div>

      <div style={{ borderTop: "1px dashed var(--div)", paddingTop: 12 }}>
        <Fila label="Vehículo" valor={[vehiculo, poliza?.patente].filter(Boolean).join(" · ")} />
        <Fila label="Compañía" valor={poliza?.compania} />
        <Fila label="Vencía" valor={cupon.vence_texto || fmtLargo(cupon.fecha_vencimiento)} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button
          onClick={compartir}
          className="portal-tap"
          style={{
            flex: 1, height: 42, borderRadius: 11, border: "1px solid var(--div)",
            background: "var(--card)", color: "var(--t1)", fontSize: 13.5,
            fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
          }}
        >
          Compartir
        </button>
        {comp ? (
          <button
            onClick={() => onVerCuponera(comp, "Tu comprobante")}
            className="portal-tap"
            style={{
              flex: 1, height: 42, borderRadius: 11, border: "none",
              background: "var(--m)", color: "#fff", fontSize: 13.5,
              fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
            }}
          >
            Ver recibo
          </button>
        ) : null}
      </div>

      {/* ⚖️ Thames es correduría: el recibo con validez legal lo emite la
             compañía. Sin esta línea, esto puede parecer el oficial. */}
      <p style={{ fontSize: 11, color: "var(--t3)", margin: "12px 0 0", lineHeight: 1.5, textAlign: "center" }}>
        Constancia interna de Estudio Thames. El recibo oficial lo emite la compañía.
      </p>
    </div>
  );
}