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
  money, fmt, fmtLargo, situacionPago, contarVencidos, deudaTotal, hayDeudaSinPrecio,
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

  // 🙈 ¿Quedó algo por pagar cuyo importe no se puede mostrar?
  //    Sin esto, un cliente de NRE con RC y una cuota vencida veía "No tenés
  //    pagos pendientes": el total daba 0 porque esa póliza no suma.
  //    Callar el monto es una cosa; callar la deuda sería otra.
  //
  // 🐛 EL BUG QUE ARREGLA — "Rendered more hooks than during the previous render"
  //
  //    Este `useMemo` estaba MÁS ABAJO, después de los dos `return` de
  //    "cargando" y "error". Se usa recién en `resumen`, así que ahí parecía
  //    su lugar natural. Pero los hooks no se pueden mover de lugar.
  //
  //      1er render → cargando = true  → sale por el return → 11 hooks
  //      2do render → llegó la data    → sigue de largo     → 12 hooks 💥
  //
  //    React lleva la cuenta de los hooks como una lista del súper numerada:
  //    siempre el mismo orden y la misma cantidad. Si en el segundo render
  //    aparece un ítem 12 que antes no estaba, se pierde y corta.
  //
  //    Por eso el portal reventaba JUSTO cuando los datos cargaban bien:
  //    mientras estaba cargando o daba error, nunca llegaba hasta acá.
  //
  //    🔒 REGLA: TODO hook (useState / useEffect / useMemo / useCallback) va
  //       ARRIBA DE TODO, antes del primer `return`. Sin excepciones.
  const deudaOculta = useMemo(() => hayDeudaSinPrecio(polizas), [polizas]);

  /* 🚨 Los autos que TIENEN a quién llamar.
     El backend manda `asistencia: null` cuando esa compañía no tiene grúa
     cargada (NRE). Si la lista queda vacía, la pestaña no se muestra: un
     botón que no llama a ningún lado es peor que no tenerlo.

     ⚠️ VA ACÁ ARRIBA, con los otros `useMemo`, NO más abajo. Todos los hooks
        tienen que correr siempre, antes del primer `return`. */
  const conGrua = useMemo(() => polizas.filter((p) => p?.asistencia), [polizas]);

  // La póliza que se está mirando (o la única, si hay una sola).
  const detalle = useMemo(() => {
    if (polizaAbierta) return polizas.find((p) => p.id === polizaAbierta) || null;
    return null;
  }, [polizaAbierta, polizas]);

  /* ══════════════ 🧭 NAVEGACIÓN ══════════════
   *
   * 🐛 LO QUE ESTABA MAL
   *
   *    El portal simulaba la navegación con variables y aparte le mentía al
   *    navegador con `pushState` vacíos. Dos historiales que no se hablaban:
   *    el que el cliente ve y el que el navegador guarda. Como poner marcas
   *    en un mapa y caminar por otro.
   *
   *    Consecuencias reales:
   *      · El visor de documentos NO se cerraba con "atrás": el PDF quedaba
   *        arriba mientras la pantalla de abajo se movía sola.
   *      · No se podía SALIR nunca. Cada "atrás" consumía una entrada y
   *        reponía otra: saldo cero, para siempre. El cliente entraba desde
   *        WhatsApp y tenía que cerrar la pestaña para volver.
   *      · "Atrás" siempre tiraba a la lista de seguros, aunque vinieras de
   *        otro lado.
   *      · No existía "adelante": la URL nunca cambiaba.
   *
   * ✅ CÓMO FUNCIONA AHORA
   *
   *    Cada pantalla se guarda ADENTRO del historial del navegador
   *    (`history.state.portalVista`). Una entrada por pantalla, ni una de
   *    más. El navegador ya sabe apilar y desapilar: no hay que enseñarle.
   *
   *    Con eso salen gratis las tres cosas:
   *      · atrás     → el navegador devuelve la vista anterior
   *      · adelante  → devuelve la siguiente (antes no existía)
   *      · salir     → cuando se acaban las nuestras, se va del portal
   *
   *    Es dejar que el navegador lleve la libreta en vez de llevar una
   *    propia a escondidas.
   */

  /* ⬆️ Al cambiar de pantalla, arriba de todo.
     Se prueban los TRES contenedores porque el scroll puede vivir en la
     ventana o en `.portal-frame` según el tema y el navegador. Antes solo se
     hacía `window.scrollTo(0,0)`: si el que scrollea es el frame, esa línea
     no hacía nada y cada pantalla abría a media altura. */
  const irArriba = () => {
    try { window.scrollTo(0, 0); } catch { /* nada */ }
    try { document.querySelector(".portal-frame")?.scrollTo?.(0, 0); } catch { /* nada */ }
    try { if (document.scrollingElement) document.scrollingElement.scrollTop = 0; } catch { /* nada */ }
  };

  const VISTA_RAIZ = { tab: "seguros", poliza: null, filtro: null, doc: null };

  const aplicarVista = (v) => {
    const x = v || VISTA_RAIZ;
    setTab(x.tab || "seguros");
    setPolizaAbierta(x.poliza ?? null);
    setFiltroPagos(x.filtro ?? null);
    setVerDoc(x.doc ?? null);
  };

  /* Ir a una pantalla nueva. Lo que no se pasa se hereda de la actual. */
  const navegar = (cambios) => {
    const v = {
      tab, poliza: polizaAbierta, filtro: filtroPagos, doc: verDoc,
      ...cambios,
    };
    try {
      // Se CONSERVA lo que ya había en `history.state` (React Router guarda
      // lo suyo ahí). Pisarlo le rompería su propio historial.
      window.history.pushState(
        { ...(window.history.state || {}), portalVista: v },
        "",
        window.location.href
      );
    } catch { /* file:// lo bloquea */ }
    aplicarVista(v);
    irArriba();
  };

  /* Atrás = el atrás DE VERDAD. El flechita del header y el botón del
     teléfono hacen exactamente lo mismo, así no hay dos comportamientos
     distintos para la misma intención. */
  const atras = () => {
    try { window.history.back(); } catch { aplicarVista(VISTA_RAIZ); }
  };

  const irA = (t) => navegar({ tab: t, poliza: null, filtro: null, doc: null });

  const abrirPoliza = (p) => {
    setVerCobertura(false);
    navegar({ tab: "seguros", poliza: p.id, filtro: null, doc: null });
  };

  const verPagosDe = (id) => navegar({ tab: "pagos", poliza: null, filtro: id, doc: null });

  /* 📄 Abrir un documento TAMBIÉN es navegar. Por eso entra al historial:
     es lo que hace que "atrás" lo cierre en vez de dejarlo colgado arriba. */
  const abrirDoc = (d) => navegar({ doc: d });

  useEffect(() => {
    // La entrada actual pasa a ser la raíz del portal. Es `replaceState`, no
    // `pushState`: marcar dónde estamos parados no debe agregar un paso.
    try {
      window.history.replaceState(
        { ...(window.history.state || {}), portalVista: VISTA_RAIZ },
        "",
        window.location.href
      );
    } catch { /* nada */ }

    const onPop = (e) => {
      aplicarVista(e?.state?.portalVista);
      irArriba();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    : tab === "grua" ? "Grúa"
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
    : deudaOculta
      ? { tipo: "deuda", label: "Tenés un pago pendiente", monto: 0,
          textoGrande: "Consultanos",
          sub: "Escribinos y te pasamos el importe" }
    : prox
      ? { tipo: "proximo", label: "Próximo pago",
          monto: prox.sit.monto,
          textoGrande: prox.sit.sinPrecio ? "Consultanos" : null,
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
          mostrarAtras={!!polizaAbierta || filtroPagos !== null}
          onAtras={atras}
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
                  onClick={() => navegar({ filtro: null })}
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
                    onVerCuponera={(url, nombre) => abrirDoc({ url, nombre: nombre || "Tu cuponera" })}
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
              onVerPagos={() => verPagosDe(detalle.id)}
              onVerDoc={abrirDoc}
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

        {/* ══════════ 🚨 GRÚA ══════════ */}
        {tab === "grua" ? (
          <div className="portal-pant">
            <PantallaGrua polizas={conGrua} />
          </div>
        ) : null}

        {/* ══════════ 📄 PAPELES ══════════ */}
        {tab === "papeles" ? (
          <div className="portal-pant">
            <Papeles polizas={polizas} onVerDoc={abrirDoc} nombreCliente={nombreCliente} />
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
        mostrarGrua={conGrua.length > 0}
      />

      {verDoc ? <VisorDocumento doc={verDoc} onCerrar={atras} /> : null}

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
      {/* 🙈 Las coberturas sin precio publicado (NRE con RC) muestran una
             invitación en vez del número: el importe lo pone la oficina y
             se mueve. Un precio viejo en pantalla termina en discusión. */}
      <span
        style={{
          display: "block",
          fontSize: s.sinPrecio ? 13.5 : 16,
          fontWeight: s.sinPrecio ? 600 : 700,
          color: s.sinPrecio ? "var(--m)" : undefined,
          letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums",
        }}
      >
        {s.sinPrecio ? "Consultanos" : money(montoFinal)}
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

/* ══════════════════ 🚨 Grúa (pestaña propia) ══════════════════ */

/* Antes esto vivía adentro de la ficha de cada auto. Para llegar había que
   entrar al portal, elegir el auto y bajar hasta el bloque: tres pasos parado
   en la banquina, con el auto cruzado.

   Ahora tiene pestaña propia: un toque desde donde esté.

   Con UN auto (el caso normal) va el botón grande y listo. Con varios, una
   fila por auto: la grúa es POR PÓLIZA — cada compañía tiene su 0800 y su
   carencia, así que un botón único no sabría a quién llamar. */
function PantallaGrua({ polizas = [] }) {
  const tel = (t) => `tel:${String(t || "").replace(/[^0-9+]/g, "")}`;

  if (polizas.length === 1) {
    const p = polizas[0];
    const g = p.asistencia;

    return (
      <>
        <Seccion>Si te quedaste en la calle</Seccion>

        {g.disponible ? (
          <a
            href={tel(g.telefono)}
            className="portal-tap"
            style={{
              display: "block", margin: "0 15px", padding: "24px 20px",
              borderRadius: 16, background: "var(--al-bg)", color: "var(--al)",
              textAlign: "center", textDecoration: "none",
            }}
          >
            <span style={{ display: "block", fontSize: 19, fontWeight: 700, letterSpacing: "-.02em" }}>
              Llamar a la grúa
            </span>
            <span style={{ display: "block", fontSize: 15, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
              {g.telefono}
            </span>
          </a>
        ) : (
          /* En carencia: no se deja tocar y se dice desde cuándo. Mejor eso a
             que llame y le digan que no. */
          <div
            style={{
              margin: "0 15px", padding: "22px 20px", borderRadius: 16,
              background: "var(--wa-bg)", color: "var(--wa)", textAlign: "center",
            }}
          >
            <span style={{ display: "block", fontSize: 17, fontWeight: 700, letterSpacing: "-.02em" }}>
              Todavía no tenés grúa
            </span>
            <span style={{ display: "block", fontSize: 14, marginTop: 4 }}>
              Disponible a partir del {fmtLargo(g.disponible_desde)}
            </span>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 13, color: "var(--t2)", marginTop: 12 }}>
          {nombreBien(p)} · {p.compania}
        </div>
      </>
    );
  }

  return (
    <>
      <Seccion>Si te quedaste en la calle</Seccion>
      <Lista>
        {polizas.map((p, i) => {
          const g = p.asistencia;
          const fila = (
            <Fila
              primera={i === 0}
              i={i}
              icono={g.disponible ? <IconAlerta /> : <IconReloj />}
              tono={g.disponible ? "alerta" : "aviso"}
              resaltado
              titulo={nombreBien(p)}
              sub={
                g.disponible
                  ? `${p.compania} · ${g.telefono}`
                  : `Disponible a partir del ${fmtLargo(g.disponible_desde)}`
              }
              derecha={
                g.disponible ? (
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--al)", flexShrink: 0 }}>
                    Llamar
                  </span>
                ) : null
              }
            />
          );
          // El `<a>` va por fuera (y no con la prop `href` de Fila) porque
          // esa prop abre en pestaña nueva, y un `tel:` tiene que dispararle
          // el marcador al teléfono, no abrir nada.
          return g.disponible ? (
            <a key={p.id} href={tel(g.telefono)} style={{ display: "block", textDecoration: "none" }}>
              {fila}
            </a>
          ) : (
            <div key={p.id}>{fila}</div>
          );
        })}
      </Lista>
    </>
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

  return (
    <>
      {/* 🚨 LA GRÚA YA NO VIVE ACÁ.
          Se mudó a su propia pestaña del menú de abajo (ver PantallaGrua).
          Adentro de la ficha del auto quedaba a tres pasos: entrar, elegir el
          auto y bajar. Parado en la banquina eso es una eternidad.

          Y sacarla de acá deja el ESTADO DE PAGO arriba de todo, que es lo
          que tiene que pesar cuando el cliente entra tranquilo. */}

      {/* 💳 ESTADO DE PAGO — PRIMERO DE TODO.
          Es lo único de esta pantalla que tiene fecha límite. Antes venía
          después de la grúa y de cuatro filas de cobertura: el cliente
          scrolleaba media pantalla de dato fijo para llegar a lo urgente.

          El título va en rojo (tono="alerta") y el ícono también
          (`resaltado`). Es la ÚNICA fila del portal que se pinta así: si
          todas gritaran, ninguna se escucharía.

          Lleva directo a los cupones de esta póliza. */}
      {s.estado !== "al_dia" && (p.cupones_robo || []).length ? (
        <>
          <Seccion tono={s.estado === "vencido" ? "alerta" : undefined}>Estado de pago</Seccion>
          <Lista>
            <Fila
              primera
              icono={<IconAlerta />}
              tono={s.estado === "vencido" ? "alerta" : "aviso"}
              resaltado={s.estado === "vencido"}
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

      <Seccion>Tu cobertura</Seccion>
      <Lista>
        <FilaDato
          primera
          label="Cobertura"
          valor={p.cobertura || "—"}
          mas={verCobertura ? "Ocultar" : "Ver detalle"}
          onClick={onToggleCobertura}
        />

        <div className={`portal-panel${verCobertura ? " abierto" : ""}`}>
          <div>
            {(cubre.length || ojo.length) ? (
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
          </div>
        </div>
      </Lista>

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