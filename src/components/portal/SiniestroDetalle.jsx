// src/components/portal/SiniestroDetalle.jsx
//
// 🚨 PORTAL DEL ASEGURADO · DETALLE DEL SINIESTRO (Franco 16/10/2026)
//
//   Antes el cliente veía una línea ("Te chocaron · patente · estado") y al tocarla no
//   pasaba nada: parecía que no hacíamos nada. Ahora se abre esta pantalla:
//
//     1. Encabezado: expediente, carátula ("Rimoli c/ Federacion Patronal Seguros"),
//        el vehículo, la fecha del hecho, su aseguradora, el N° de siniestro, el estado
//        (con la fecha de la denuncia, no la del choque) y la barra de 6 pasos:
//          Documentación → Denuncia → Reclamo presentado → Inspección → Oferta / Convenio → Cobrado
//     2. «Gestión de su siniestro»: ✅ lo hecho (con fecha) · ⏳ el próximo paso · las etapas siguientes.
//     3. «Documentación pendiente»: lo que le falta mandar.
//     4. Consultas por WhatsApp a la oficina.
//
//   Todo lo arma el servidor (siniestros/gestion.py) con las notas RECLAMO y lo que cargó
//   el admin. Acá NO llega nada interno: ni montos, ni notas, ni datos del tercero.
//
//   Es una pantalla encima del portal (como el visor de documentos): "atrás" del celu
//   la cierra, porque abrirla entra al historial (ver `navegar` en PortalAseguradoPage).
//   Colores: los del portal (rojo Thames), en claro y en oscuro.

import { useEffect } from "react";
import { IconAtras, IconDoc, IconWhatsapp } from "./Iconos";
import { fmt, waLink } from "./utils";

const FUENTES_ID = "portal-fuente-serif";
const FUENTES =
  "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,600;1,8..60,500&display=swap";
const SERIF = "'Source Serif 4', Georgia, 'Times New Roman', serif";

/** ✅ Círculo verde con tilde. */
function Hecho() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="var(--ok)" />
      <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="var(--card)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** ⏳ Reloj (lo que sigue). */
function Sigue() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="var(--wa-bg)" stroke="var(--wa)" strokeWidth="1.6" />
      <path d="M12 7v5l3.2 2" fill="none" stroke="var(--wa)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Círculo vacío (etapas que vienen después). */
function Despues() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="6" fill="none" stroke="var(--t3)" strokeWidth="2" />
    </svg>
  );
}

function Tarjeta({ children, style }) {
  return (
    <section
      style={{
        background: "var(--card)", borderRadius: 16, padding: "18px 16px",
        boxShadow: "var(--lista-sombra)", border: "var(--lista-borde)",
        display: "flex", flexDirection: "column", gap: 14, ...style,
      }}
    >
      {children}
    </section>
  );
}

function Titulo({ children, extra }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <h2 style={{ margin: 0, fontFamily: SERIF, fontSize: 20, fontWeight: 600, letterSpacing: "-.01em" }}>{children}</h2>
      {extra}
    </div>
  );
}

function Dato({ label, children }) {
  if (!children) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <dt style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--t2)" }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>{children}</dd>
    </div>
  );
}

export default function SiniestroDetalle({ s, nombreCliente = "", onCerrar }) {
  // Fuente serif para los títulos (como un estudio): se carga una sola vez.
  useEffect(() => {
    if (document.getElementById(FUENTES_ID)) return;
    const l = document.createElement("link");
    l.id = FUENTES_ID;
    l.rel = "stylesheet";
    l.href = FUENTES;
    document.head.appendChild(l);
  }, []);

  // Esc cierra y el portal de atrás no scrollea mientras está abierta.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCerrar?.(); };
    window.addEventListener("keydown", onKey);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
  }, [onCerrar]);

  if (!s) return null;

  const pasos = Array.isArray(s.pasos_nombres) && s.pasos_nombres.length ? s.pasos_nombres : [];
  const hecho = Math.max(0, Math.min(Number(s.paso) || 0, pasos.length));
  const terminado = !s.abierto;
  const gestion = Array.isArray(s.gestion) ? s.gestion : [];
  const siguientes = Array.isArray(s.siguientes) ? s.siguientes : [];
  const docs = Array.isArray(s.documentacion) ? s.documentacion : [];
  const vehiculo = [s.vehiculo, s.anio ? `(${s.anio})` : ""].filter(Boolean).join(" ");

  const msg = `Hola, soy ${nombreCliente || ""}. Quería consultar por mi siniestro del ${fmt(s.fecha || s.cargado)}${
    s.patente ? ` (${s.patente})` : ""
  }.`;
  const msgDocs = `Hola, soy ${nombreCliente || ""}. Les mando la documentación de mi siniestro${
    s.patente ? ` (${s.patente})` : ""
  }.`;
  const wa = waLink(s.oficina_whatsapp, msg);
  const waDocs = waLink(s.oficina_whatsapp, msgDocs);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detalle del siniestro"
      className="portal-fadein"
      style={{ position: "fixed", inset: 0, zIndex: 150, background: "var(--shell)", overflowY: "auto", WebkitOverflowScrolling: "touch" }}
    >
      <div style={{ maxWidth: 412, margin: "0 auto", minHeight: "100dvh", background: "var(--bg)", paddingBottom: 36 }}>
        {/* ── Encabezado rojo ── */}
        <header style={{ background: "var(--m-head)", color: "#fff", padding: "calc(8px + env(safe-area-inset-top)) 12px 46px" }}>
          <button
            type="button"
            onClick={onCerrar}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44, padding: "0 10px 0 4px",
              background: "none", border: "none", color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 600, cursor: "pointer",
            }}
          >
            <IconAtras size={20} /> Volver
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 8px 0" }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".16em", color: "rgba(255,255,255,.85)" }}>
              EXPEDIENTE N° {s.id} · ESTUDIO THAMES
            </span>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}>{s.titulo || "Siniestro"}</h1>
            {s.caratula ? (
              <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: 17, color: "rgba(255,255,255,.88)" }}>{s.caratula}</p>
            ) : null}
          </div>
        </header>

        <main style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 15px", marginTop: -28 }}>
          {/* ── 1 · Datos, estado y avance ── */}
          <Tarjeta>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 700,
                  color: terminado ? "var(--ok)" : "var(--m)", background: terminado ? "var(--ok-bg)" : "var(--m-soft)",
                  border: `1px solid ${terminado ? "var(--ok-br)" : "var(--m-line)"}`, borderRadius: 999, padding: "5px 11px",
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: terminado ? "var(--ok)" : "var(--m)" }} />
                {s.estado_cliente}
              </span>
              {s.fecha_estado ? <span style={{ fontSize: 14, color: "var(--t2)" }}>{fmt(s.fecha_estado)}</span> : null}
            </div>

            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px 12px" }}>
              <Dato label="Vehículo">{vehiculo}</Dato>
              <Dato label="Dominio">{s.patente}</Dato>
              <Dato label="Fecha del hecho">{s.fecha ? fmt(s.fecha) : null}</Dato>
              <Dato label="Su aseguradora">{s.aseguradora || s.compania}</Dato>
              <Dato label="N° de siniestro">{s.nro_siniestro}</Dato>
              <Dato label="Qué se reclama">{s.que_reclama}</Dato>
            </dl>

            {pasos.length ? (
              <div style={{ borderTop: "1px solid var(--div)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>Avance de la gestión</span>
                  <span style={{ fontSize: 14, color: "var(--t2)" }}>Paso {hecho} de {pasos.length}</span>
                </div>
                <div
                  style={{ display: "grid", gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))`, gap: 4 }}
                  aria-label={`Paso ${hecho} de ${pasos.length}`}
                >
                  {pasos.map((p, i) => (
                    <span
                      key={p}
                      style={{
                        height: 6, borderRadius: 4,
                        background: i < hecho ? (terminado ? "var(--ok)" : "var(--m)") : i === hecho ? "var(--m-line)" : "var(--div)",
                      }}
                    />
                  ))}
                </div>
                <ol style={{ margin: "4px 0 0", padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px 12px" }}>
                  {pasos.map((p, i) => {
                    const ok = i < hecho;
                    const prox = i === hecho && !terminado;
                    return (
                      <li key={p} style={{ display: "flex", alignItems: "flex-start", gap: 7, minWidth: 0 }}>
                        <span
                          style={{
                            width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 700,
                            background: ok ? "var(--ok)" : prox ? "var(--card)" : "var(--div)",
                            color: ok ? "var(--card)" : prox ? "var(--m)" : "var(--t2)",
                            border: prox ? "2px solid var(--m)" : "none",
                          }}
                        >
                          {ok ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M5 12.5l4.5 4.5L19 7.5" />
                            </svg>
                          ) : (
                            i + 1
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: 13.5, lineHeight: 1.3, paddingTop: 1, minWidth: 0, overflowWrap: "anywhere",
                            color: ok ? "var(--t1)" : prox ? "var(--m)" : "var(--t2)", fontWeight: ok ? 600 : prox ? 700 : 400,
                          }}
                        >
                          {p}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}
          </Tarjeta>

          {/* ── 2 · Gestión de su siniestro ── */}
          <Tarjeta>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Titulo>Gestión de su siniestro</Titulo>
              <p style={{ margin: 0, fontSize: 14, color: "var(--t2)", lineHeight: 1.4 }}>Actuaciones realizadas por el estudio, en orden.</p>
            </div>

            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" }}>
              {gestion.map((g, i) => (
                <li key={`${i}-${g.texto}`} style={{ display: "flex", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
                    <Hecho />
                    <span style={{ flex: 1, width: 2, minHeight: 14, background: "var(--ok-br)", margin: "2px 0" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 16, minWidth: 0 }}>
                    {g.fecha ? (
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ok)", fontVariantNumeric: "tabular-nums" }}>{fmt(g.fecha)}</span>
                    ) : null}
                    <span style={{ fontSize: 15, lineHeight: 1.4 }}>{g.texto}</span>
                  </div>
                </li>
              ))}

              {!gestion.length ? (
                <li style={{ fontSize: 14.5, color: "var(--t2)", lineHeight: 1.5, paddingBottom: 14 }}>
                  Recibimos su siniestro. Acá va a ver cada paso que demos.
                </li>
              ) : null}

              {s.proximo ? (
                <li style={{ display: "flex", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
                    <Sigue />
                    {siguientes.length ? <span style={{ flex: 1, width: 2, minHeight: 14, background: "var(--wa-br)", margin: "2px 0" }} /> : null}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: siguientes.length ? 16 : 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: "var(--wa)" }}>PRÓXIMO PASO</span>
                    <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{s.proximo}</span>
                  </div>
                </li>
              ) : null}

              {siguientes.length ? (
                <li style={{ display: "flex", gap: 12 }}>
                  <div style={{ width: 24, flexShrink: 0 }}>
                    <Despues />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: "var(--t2)" }}>ETAPAS SIGUIENTES</span>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                      {siguientes.map((t) => (
                        <li key={t} style={{ fontSize: 15, color: "var(--t2)" }}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              ) : null}
            </ol>
          </Tarjeta>

          {/* ── 3 · Documentación pendiente ── */}
          {s.abierto ? (
            <Tarjeta style={{ gap: 12 }}>
              <Titulo
                extra={
                  docs.length ? (
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--wa)", background: "var(--wa-bg)", border: "1px solid var(--wa-br)", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>
                      {docs.length} pendiente{docs.length > 1 ? "s" : ""}
                    </span>
                  ) : null
                }
              >
                Documentación pendiente
              </Titulo>
              {docs.length ? (
                <>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--t2)", lineHeight: 1.4 }}>Para avanzar con su siniestro necesitamos que nos envíe:</p>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" }}>
                    {docs.map((d) => (
                      <li key={d} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: "1px solid var(--div)" }}>
                        <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--wa-bg)", color: "var(--wa)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <IconDoc size={18} />
                        </span>
                        <span style={{ fontSize: 15, lineHeight: 1.35 }}>{d}</span>
                      </li>
                    ))}
                  </ul>
                  {waDocs ? (
                    <a
                      href={waDocs}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, borderRadius: 12,
                        background: "var(--m-head)", color: "#fff", textDecoration: "none", fontSize: 16, fontWeight: 700,
                      }}
                    >
                      <IconWhatsapp size={19} /> Enviar documentación por WhatsApp
                    </a>
                  ) : null}
                  <p style={{ margin: 0, fontSize: 13, color: "var(--t2)", textAlign: "center" }}>En foto o PDF. Le confirmamos la recepción.</p>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 14.5, color: "var(--ok)", fontWeight: 600 }}>Documentación completa. No necesitamos nada más por ahora.</p>
              )}
            </Tarjeta>
          ) : null}

          {/* ── 4 · Consultas ── */}
          {wa ? (
            <Tarjeta style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, background: "var(--m-soft)", color: "var(--m)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IconWhatsapp size={20} />
              </span>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>¿Consultas?</span>
                <span style={{ fontSize: 14, color: "var(--t2)" }}>{s.oficina_nombre ? `Oficina ${s.oficina_nombre}` : "Escríbanos por WhatsApp"}</span>
              </div>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 14px", borderRadius: 10,
                  border: "1px solid var(--m-line)", color: "var(--m)", textDecoration: "none", fontSize: 15, fontWeight: 700, flexShrink: 0,
                }}
              >
                Escribir
              </a>
            </Tarjeta>
          ) : null}

          <footer style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "14px 8px 0", textAlign: "center" }}>
            <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, letterSpacing: ".14em", color: "var(--m)" }}>ESTUDIO THAMES</span>
            <span style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.4 }}>Esta información se actualiza a medida que avanza la gestión.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
