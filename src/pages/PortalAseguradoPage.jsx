// src/pages/PortalAseguradoPage.jsx
//
// 📱 PORTAL DEL ASEGURADO — público, sin login.
//    El cliente entra por el link único que recibe por WhatsApp:
//    /#/portal/<token>
//
// ── CÓMO ESTÁ ARMADO ────────────────────────────────────────────────────
// 4 pestañas, como una app de banco:
//   🏠 Inicio   → el total a pagar arriba y la lista de seguros
//   💳 Pagos    → los cupones; al tocar uno se elige la forma de pago
//   🛡️ Seguros  → detalle de cada póliza: qué cubre, suma asegurada, papeles
//   📄 Papeles  → documentos y contacto
//
// 👁️ ES SOLO LECTURA. El cliente no marca nada como pagado: paga afuera y
//    manda el comprobante por WhatsApp. La oficina lo sube.

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import "../styles/portal.css";

// 🅣 Logo del pie: el vertical, a 64px. Uno por tema — sobre fondo claro va
//    el rojo con texto negro, sobre oscuro el rojo con texto blanco. Con uno
//    solo, en alguno de los dos temas el texto desaparece.
import logoPieClaro from "../assets/logos/vert-rojo-negro-sm.webp";
import logoPieOscuro from "../assets/logos/vert-rojo-blanco-sm.webp";

import PortalHeader from "../components/portal/PortalHeader";
import TabsPortal from "../components/portal/TabsPortal";
import ListaCupones from "../components/portal/ListaCupones";
import Papeles, { nombreLindoDoc } from "../components/portal/Papeles";
import VisorDocumento from "../components/portal/VisorDocumento";
import { Seccion, Lista, Fila, Chip, Vacio } from "../components/portal/Lista";
import { IconoTipo, IconDoc, IconAlerta, IconTick, IconAbajo, IconReloj } from "../components/portal/Iconos";
import {
  money, fmt, fmtLargo, situacionPago, contarVencidos, deudaTotal,
  proximoPago, tituloSeguros, nombreBien, tipoIcono, waLink, capitalizar,
} from "../components/portal/utils";

// El portal vive FUERA de /api/ → se arma la base sin ese sufijo.
const API_ORIGIN = String(
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "")
).trim().replace(/\/+$/g, "").replace(/\/api$/i, "");
const PORTAL_BASE = `${API_ORIGIN}/public/portal`;

export default function PortalAseguradoPage() {
  const { token } = useParams();

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const [tab, setTab] = useState("seguros");   // "seguros" es ahora la principal
  const [polizaAbierta, setPolizaAbierta] = useState(null);
  const [filtroPagos, setFiltroPagos] = useState(null);
  const [verDoc, setVerDoc] = useState(null);
  const [importesVisibles, setImportesVisibles] = useState(true);
  const [verCobertura, setVerCobertura] = useState(false);
  const [tema, setTema] = useState(null); // null = oscuro (el de arranque)

  /* ── Cargar los datos ──
     `recargar` sube al subir un comprobante: así el cupón pasa a "Reportado"
     y el cliente lo ve enseguida, sin refrescar la página. */
  const [recargar, setRecargar] = useState(0);

  useEffect(() => {
    let vivo = true;
    (async () => {
      setCargando(true);
      setError("");
      try {
        const res = await fetch(`${PORTAL_BASE}/${token}/`);
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "Este link no es válido o ya venció."
              : "No pudimos cargar tus datos."
          );
        }
        const json = await res.json();
        if (vivo) setData(json);
      } catch (e) {
        if (vivo) setError(e.message || "Ocurrió un error.");
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, [token, recargar]);

  /* ── Modo oscuro: sigue al sistema salvo que el cliente lo cambie ── */
  /* ☀️ Arranca en CLARO.
     El momento crítico del portal es cuando el cliente está PARADO EN LA CAJA
     de Rapipago mostrándole el cupón al cajero: puede haber sol, luz de
     local, reflejos. En oscuro esa pantalla se ve peor, y es justo cuando más
     importa.
     El resto del tiempo lo abre desde casa, donde da igual. El que prefiere
     oscuro lo cambia desde el pie. */
  const temaActivo = tema === "oscuro" ? "oscuro" : "claro";

  /* 🌓 El cambio de tema, con transición.
     Los colores viven en variables CSS y las variables NO transicionan solas
     en cascada. La solución: poner una clase JUSTO durante el cambio y
     sacarla a los 340ms.

     ¿Por qué no dejarla siempre? Porque `transition` en todos los elementos
     obliga al navegador a vigilar cada uno en cada cuadro. Durante 340ms no
     se nota; permanente, sí — sobre todo al scrollear. */
  const cambiarTema = () => {
    const nuevo = temaActivo === "oscuro" ? "claro" : "oscuro";
    const raiz = document.querySelector(".portal");
    if (raiz) {
      raiz.classList.add("portal-cambiando");
      setTimeout(() => raiz.classList.remove("portal-cambiando"), 340);
    }
    setTema(nuevo);
  };

  const cliente = data?.cliente || {};
  // El token viaja adentro de cada póliza: FormasPago lo necesita para armar
  // la URL del endpoint del comprobante.
  const polizas = useMemo(
    () => (data?.polizas || []).map((p) => ({ ...p, __token: token })),
    [data, token]
  );
  // En la base los nombres van en MAYÚSCULAS. En pantalla gritan, así que se
  // normalizan solo para mostrar.
  const nombreCliente = capitalizar(cliente.nombre_completo || cliente.nombre || "");

  const vencidos = useMemo(() => contarVencidos(polizas), [polizas]);
  const deuda = useMemo(() => deudaTotal(polizas), [polizas]);
  const prox = useMemo(() => proximoPago(polizas), [polizas]);

  // La póliza que se está mirando (o la única, si hay una sola).
  const detalle = useMemo(() => {
    if (polizaAbierta) return polizas.find((p) => p.id === polizaAbierta) || null;
    return null;
  }, [polizaAbierta, polizas]);

  /* ── Navegación ── */
  const irA = (t) => {
    setTab(t);
    if (t !== "seguros") setPolizaAbierta(null);
    if (t !== "pagos") setFiltroPagos(null);
    window.scrollTo(0, 0);
  };

  const abrirPoliza = (p) => {
    setPolizaAbierta(p.id);
    setVerCobertura(false);
    setTab("seguros");
    window.scrollTo(0, 0);
  };

  const volver = () => {
    if (polizaAbierta) { setPolizaAbierta(null); irA("seguros"); }
    else irA("seguros");
  };

  // El botón "atrás" del celular vuelve a la lista en vez de salir del portal.
  useEffect(() => {
    const onPop = () => {
      volver();
      try { window.history.pushState(null, "", window.location.href); } catch { /* file:// lo bloquea */ }
    };
    try {
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", onPop);
    } catch { /* nada */ }
    return () => window.removeEventListener("popstate", onPop);
  }, [polizaAbierta, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Estados de carga y error ── */
  /* ⏳ CARGANDO: el esqueleto de la pantalla, no una ruedita.
     Se siente más rápido porque muestra la FORMA de lo que viene: el cliente
     ya sabe dónde va a estar el total y dónde la lista. Una ruedita solo dice
     "esperá" sin decir qué. */
  if (cargando) {
    return (
      <div className="portal" data-tema={temaActivo}>
        <div className="portal-frame">
          <div style={{ padding: "calc(14px + env(safe-area-inset-top)) 18px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
              <div className="portal-skeleton" style={{ height: 20, width: 130 }} />
              <div className="portal-skeleton" style={{ height: 32, width: 72, borderRadius: 10 }} />
            </div>
            <div className="portal-skeleton" style={{ height: 152, borderRadius: 20 }} />
          </div>
          <div style={{ padding: "26px 20px 12px" }}>
            <div className="portal-skeleton" style={{ height: 11, width: 90 }} />
          </div>
          <div style={{ margin: "0 15px", borderRadius: 16, overflow: "hidden" }}>
            {[0, 1, 2].map((n) => (
              <div
                key={n}
                className="portal-skeleton"
                style={{ height: 70, borderRadius: 0, marginBottom: n < 2 ? 1 : 0 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !polizas.length) {
    return (
      <div className="portal" data-tema={temaActivo}>
        <div
          className="portal-frame"
          style={{ display: "grid", placeItems: "center", minHeight: "100dvh", padding: 28, textAlign: "center" }}
        >
          <div>
            <img
              src={logoPieClaro}
              alt="Estudio Thames"
              style={{ height: 60, width: "auto", opacity: 0.7, margin: "0 auto 24px", display: "block" }}
            />
            <div
              style={{
                height: 56, width: 56, borderRadius: "50%", background: "var(--al-bg)",
                color: "var(--al)", display: "grid", placeItems: "center", margin: "0 auto 14px",
              }}
            >
              <IconAlerta size={26} />
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
              {error ? "No pudimos abrir tu portal" : "No tenés seguros activos"}
            </h1>
            <p style={{ fontSize: 14, color: "var(--t2)", lineHeight: 1.6, margin: 0, maxWidth: 300 }}>
              {error || "En este momento no hay nada para mostrar."}
              <br />Si creés que es un error, escribinos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Título del header según dónde esté ── */
  // El título cambia al navegar. La clase `portal-titulo` le hace un fade
  // corto para que no salte de golpe (ver portal.css).
  // En la pestaña principal ("seguros" sin póliza abierta) va el nombre del
  // cliente con el saludo, como antes hacía Inicio.
  const esPrincipal = tab === "seguros" && !polizaAbierta;

  const titulo =
    esPrincipal ? nombreCliente
    : tab === "pagos" ? "Tus pagos"
    : tab === "papeles" ? "Tus papeles"
    : detalle ? nombreBien(detalle)
    : tituloSeguros(polizas.length);

  const subtitulo = detalle
    ? [detalle.patente, detalle.anio].filter(Boolean).join(" · ")
    : null;

  const resumen =
    !esPrincipal ? null
    : deuda > 0
      ? { tipo: "deuda", label: "Total a pagar", monto: deuda,
          sub: `${vencidos} pago${vencidos > 1 ? "s" : ""} vencido${vencidos > 1 ? "s" : ""}` }
    : prox
      ? { tipo: "proximo", label: "Próximo pago", monto: prox.sit.monto,
          sub: `${nombreBien(prox.poliza)} · ${fmtLargo(prox.sit.fecha)}` }
      : { tipo: "al_dia", label: "Tu situación", monto: 0, sub: "No tenés pagos pendientes" };

  return (
    <div className="portal" data-tema={temaActivo}>
      <div className="portal-frame">
        <PortalHeader
          cliente={cliente}
          titulo={titulo}
          subtitulo={subtitulo}
          mostrarSaludo={esPrincipal}
          mostrarAtras={!!polizaAbierta}
          onAtras={volver}
          resumen={resumen}
          importesVisibles={importesVisibles}
          onToggleImportes={() => setImportesVisibles((v) => !v)}
          onIrPagos={() => irA("pagos")}
          waAyuda={waLink(polizas[0]?.oficina_whatsapp, `Hola, soy ${nombreCliente}.`)}
          tema={temaActivo}
          onCambiarTema={cambiarTema}
        />

        {/* ══════════ 💳 PAGOS ══════════ */}
        {tab === "pagos" ? (
          <div className="portal-pant">
            {filtroPagos !== null ? (
              <div
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 12, background: "var(--m-soft)", padding: "13px 20px",
                  fontSize: 13.5, fontWeight: 600, color: "var(--m)",
                }}
              >
                <span>{nombreBien(polizas.find((p) => p.id === filtroPagos) || {})}</span>
                <button
                  onClick={() => setFiltroPagos(null)}
                  style={{
                    background: "none", border: "none", fontSize: 13.5, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit", color: "var(--m)", flexShrink: 0,
                  }}
                >
                  Ver todos
                </button>
              </div>
            ) : null}

            {polizas
              .filter((p) => (p.cupones_robo || []).length)
              .filter((p) => filtroPagos === null || p.id === filtroPagos)
              .map((p) => (
                <div key={p.id}>
                  <Seccion>{nombreBien(p)}</Seccion>
                  <ListaCupones
                    poliza={p}
                    cupones={p.cupones_robo}
                    onVerCuponera={(url, nombre) => setVerDoc({ url, nombre: nombre || "Tu cuponera" })}
                    onComprobanteSubido={() => setRecargar((n) => n + 1)}
                  />
                </div>
              ))}

            <p style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6, textAlign: "center", padding: "22px 28px 0" }}>
              Después de pagar, envianos el comprobante para que lo registremos en tu cuenta.
            </p>
          </div>
        ) : null}

        {/* ══════════ 🛡️ SEGUROS ══════════ */}
        {tab === "seguros" ? (
          <div className="portal-pant">
          {detalle ? (
            <DetallePoliza
              p={detalle}
              verCobertura={verCobertura}
              onToggleCobertura={() => setVerCobertura((v) => !v)}
              onVerPagos={() => { setFiltroPagos(detalle.id); irA("pagos"); }}
              onVerDoc={setVerDoc}
              nombreCliente={nombreCliente}
            />
          ) : (
            <>
              {/* Sin título de sección: el header ya dice "Hola Jorge" y
                  abajo hay una lista de seguros. Nadie se pregunta qué es.
                  Eran 37px de alto para no decir nada. */}
              <div style={{ height: 14 }} />
              <Lista>
                {polizas.map((p, i) => (
                  <FilaSeguro key={p.id} poliza={p} onClick={() => abrirPoliza(p)} />
                ))}
              </Lista>
            </>
          )}
          </div>
        ) : null}

        {/* ══════════ 📄 PAPELES ══════════ */}
        {tab === "papeles" ? (
          <div className="portal-pant">
            <Papeles polizas={polizas} onVerDoc={setVerDoc} nombreCliente={nombreCliente} />
          </div>
        ) : null}

        <div
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 12, padding: "34px 20px 16px",
          }}
        >
          <img
            src={temaActivo === "oscuro" ? logoPieOscuro : logoPieClaro}
            alt="Estudio Thames"
            style={{ height: 64, width: "auto", display: "block", opacity: 0.9 }}
          />
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--t3)", margin: 0, letterSpacing: ".02em" }}>
            Estamos para ayudarte
          </p>
        </div>
      </div>

      <TabsPortal
        activa={tab}
        onChange={irA}
        vencidos={vencidos}
        totalSeguros={polizas.length}
      />

      {verDoc ? <VisorDocumento doc={verDoc} onCerrar={() => setVerDoc(null)} /> : null}

      <Toaster position="bottom-center" toastOptions={{ style: { marginBottom: 80 } }} />
    </div>
  );
}

/* ══════════════════ Fila de un seguro ══════════════════ */

function FilaSeguro({ poliza, onClick, primera, i = 0 }) {
  const s = situacionPago(poliza);
  const montoFinal = s.estado === "vencido" && s.vencidos > 1 ? s.total : s.monto;
  const sub = [poliza.patente, poliza.compania].filter(Boolean).join(" · ");
  const debe = s.estado !== "al_dia";

  // El color y el ícono del estado. En el mockup el estado va DEBAJO del
  // monto con su ícono al lado, no como un chip suelto.
  const tono =
    s.estado === "vencido" ? "var(--al)"
    : s.estado === "proximo" ? "var(--wa)"
    : "var(--ok)";

  const texto =
    s.estado === "vencido"
      ? (s.vencidos > 1 ? `${s.vencidos} vencidos` : "Vencido")
      : s.estado === "proximo"
      ? fmtLargo(s.fecha)
      : "Al día";

  /* 🤫 Si está al día, no muestra NADA a la derecha.
     El chip "✓ Al día" ocupaba lugar y no decía nada nuevo: si no hay monto,
     ya se entiende. Y sin él, los que sí deben saltan solos — que es a
     dónde queremos que vaya el ojo. */
  const derecha = !debe ? null : (
    <span style={{ textAlign: "right", flexShrink: 0 }}>
      <span
        style={{
          display: "block", fontSize: 16, fontWeight: 700,
          letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums",
        }}
      >
        {money(montoFinal)}
      </span>
      <span
        style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          gap: 4, marginTop: 3, fontSize: 12, fontWeight: 600, color: tono,
        }}
      >
        {s.estado === "vencido" ? <IconAlerta size={13} w={2} /> : <IconReloj size={13} />}
        <span>{texto}</span>
      </span>
    </span>
  );

  return (
    <Fila
      primera={primera}
      i={i}
      icono={<IconoTipo tipo={tipoIcono(poliza)} size={23} w={1.9} />}
      tono="marca"
      titulo={nombreBien(poliza)}
      sub={sub}
      derecha={derecha}
      onClick={onClick}
    />
  );
}

/* ══════════════════ Detalle de una póliza ══════════════════ */

function DetallePoliza({
  p, verCobertura, onToggleCobertura,
  onVerPagos, onVerDoc, nombreCliente,
}) {
  const s = situacionPago(p);
  const docs = p.documentos || [];
  const cubre = p.que_cubre || [];
  const ojo = p.ojo_con || [];
  const grua = p.asistencia || null;

  return (
    <>
      {/* 🚨 LA GRÚA VA PRIMERO, ANTES QUE TODO.
          Cuando el cliente abre el portal para llamar a la grúa está parado
          en la banquina. No puede andar buscando el número entre las cuotas:
          es lo primero que ve, y un toque llama.

          Si todavía está en carencia (los primeros 15/16 días de una póliza
          NUEVA — al renovar no corre), no se deja tocar y se le dice desde
          cuándo. Mejor eso a que llame y le digan que no. */}
      {grua ? (
        <>
          <Seccion>Si te quedaste en la calle</Seccion>
          <Lista>
            {grua.disponible ? (
              <a href={`tel:${String(grua.telefono).replace(/[^0-9+]/g, "")}`} style={{ display: "block" }}>
                <Fila
                  primera
                  icono={<IconAlerta />}
                  tono="alerta"
                  titulo="Llamar a la grúa"
                  sub={grua.telefono}
                  derecha={
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--m)", flexShrink: 0 }}>
                      Llamar
                    </span>
                  }
                />
              </a>
            ) : (
              <Fila
                primera
                icono={<IconReloj />}
                tono="aviso"
                titulo="Grúa"
                sub={`Disponible a partir del ${fmtLargo(grua.disponible_desde)}`}
              />
            )}
          </Lista>
        </>
      ) : null}

      <Seccion>Tu cobertura</Seccion>
      <Lista>
        <FilaDato
          primera
          label="Cobertura"
          valor={p.cobertura || "—"}
          mas={(cubre.length || ojo.length) ? (verCobertura ? "Ocultar" : "Ver qué cubre") : null}
          onClick={(cubre.length || ojo.length) ? onToggleCobertura : null}
        />

        {/* 🔑 El desplegable va ADENTRO del bloque, no debajo.
            Antes quedaba suelto a todo el ancho, sin el fondo ni las esquinas
            redondeadas — se veía como si se hubiera escapado de la tarjeta.

            Usa el mismo acordeón que los cupones: se pliega a la altura real
            del contenido, no contra un techo fijo. */}
        {(cubre.length || ojo.length) ? (
          <div className={`portal-panel${verCobertura ? " abierto" : ""}`}>
            <div style={{ borderTop: "1px solid var(--div)", padding: "12px 16px 14px" }}>
              {cubre.map((x, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", gap: 11, alignItems: "flex-start",
                    fontSize: 14, color: "var(--t2)", padding: "7px 0",
                  }}
                >
                  <span style={{ color: "var(--ok)", marginTop: 1, flexShrink: 0 }}>
                    <IconTick size={15} />
                  </span>
                  <span>{x}</span>
                </div>
              ))}

              {/* ⚠️ LA LETRA CHICA, EN CRIOLLO.
                  Todo esto está en la póliza, pero en las hojas de cláusulas
                  que nadie lee. Sacarlo a la superficie evita la discusión en
                  el mostrador: el cliente se entera ANTES, no cuando reclama.

                  Sale del PDF (ver polizas/views/lector_pdf.py). Si el papel
                  no lo dice, la línea no aparece: no se le advierte de más. */}
              {ojo.length ? (
                <div style={{ marginTop: 10, paddingTop: 12, borderTop: "1px solid var(--div)" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--t3)", marginBottom: 6 }}>
                    Tené en cuenta
                  </div>
                  {ojo.map((x, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex", gap: 11, alignItems: "flex-start",
                        fontSize: 13.5, color: "var(--t3)", padding: "5px 0", lineHeight: 1.45,
                      }}
                    >
                      <span style={{ flexShrink: 0, marginTop: 1 }}>·</span>
                      <span>{x}</span>
                    </div>
                  ))}

                  {/* El robo por partes no lista las piezas en NINGÚN lado de
                      la póliza. Que pregunten: es más honesto que inventar. */}
                  {p.oficina_whatsapp ? (
                    <a
                      href={waLink(
                        p.oficina_whatsapp,
                        `Hola, soy ${nombreCliente}. Quería saber qué partes me cubre el seguro de mi ${nombreBien(p)}.`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-block", marginTop: 10, fontSize: 13.5,
                        fontWeight: 600, color: "var(--m)",
                      }}
                    >
                      Consultanos por WhatsApp
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <FilaDato label="Aseguradora" valor={p.compania || "—"} />
        {/* 💰 El número COMPLETO, sin tener que tocar.
            Antes mostraba "$21,5 millones" y había que tocar dos veces para
            ver el número real. Entra perfecto en la fila.
            Y la etiqueta dice QUÉ SIGNIFICA: "suma asegurada" es jerga. */}
        {p.suma_asegurada ? (
          <FilaDato label="Si te lo roban, cobrás" valor={money(p.suma_asegurada)} />
        ) : null}
        {p.fecha_emision ? <FilaDato label="Desde" valor={fmt(p.fecha_emision)} /> : null}
      </Lista>

      {/* Situación de pago: lleva directo a los cupones de esta póliza. */}
      {s.estado !== "al_dia" && (p.cupones_robo || []).length ? (
        <>
          <Seccion>Estado de pago</Seccion>
          <Lista>
            <Fila
              primera
              icono={<IconAlerta />}
              tono={s.estado === "vencido" ? "alerta" : "aviso"}
              titulo={
                s.estado === "vencido"
                  ? (s.vencidos > 1 ? `${s.vencidos} pagos vencidos` : "Pago vencido")
                  : "Próximo pago"
              }
              sub={fmtLargo(s.fecha)}
              derecha={
                <span style={{ fontSize: 15.5, fontWeight: 600, flexShrink: 0 }}>
                  {money(s.estado === "vencido" && s.vencidos > 1 ? s.total : s.monto)}
                </span>
              }
              onClick={onVerPagos}
            />
          </Lista>
        </>
      ) : null}

      <Seccion>Documentos</Seccion>
      {docs.length ? (
        <Lista>
          {docs.map((d, i) => (
            <Fila
              key={`${d.url}-${i}`}
              primera={i === 0}
              icono={<IconDoc />}
              titulo={nombreLindoDoc(d.tipo, d.nombre)}
              sub="Ver documento"
              onClick={() => onVerDoc({ url: d.url, nombre: nombreLindoDoc(d.tipo, d.nombre) })}
            />
          ))}
        </Lista>
      ) : (
        <Vacio
          titulo="Todavía no están disponibles"
          sub="Los estamos cargando."
          boton={
            p.oficina_whatsapp ? (
              <a
                href={waLink(p.oficina_whatsapp, `Hola, soy ${nombreCliente}. Necesito los papeles de mi ${nombreBien(p)}.`)}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "block", marginTop: 12, background: "var(--m)", color: "#fff",
                  borderRadius: 11, padding: 12, fontSize: 14, fontWeight: 600, textAlign: "center",
                }}
              >
                Solicitarlos
              </a>
            ) : null
          }
        />
      )}
    </>
  );
}

/** Fila de dato: etiqueta a la izquierda, valor a la derecha. */
function FilaDato({ label, valor, mas, onClick, primera }) {
  const contenido = (
    <>
      {!primera ? (
        <span style={{ position: "absolute", top: 0, left: 20, right: 0, height: 1, background: "var(--div)" }} />
      ) : null}
      <span style={{ fontSize: 14, color: "var(--t2)" }}>{label}</span>
      <span style={{ textAlign: "right" }}>
        <span style={{ display: "block", fontSize: 14.5, fontWeight: 500 }}>{valor}</span>
        {mas ? (
          <span
            style={{
              display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4,
              fontSize: 12, fontWeight: 600, color: "var(--m)", marginTop: 2,
            }}
          >
            {mas} <IconAbajo size={11} />
          </span>
        ) : null}
      </span>
    </>
  );

  const estilo = {
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14,
    padding: "14px 20px", position: "relative", background: "none", border: "none",
    width: "100%", fontFamily: "inherit", color: "var(--t1)", textAlign: "left",
    cursor: onClick ? "pointer" : "default",
  };

  if (onClick) return <button onClick={onClick} style={estilo}>{contenido}</button>;
  return <div style={estilo}>{contenido}</div>;
}