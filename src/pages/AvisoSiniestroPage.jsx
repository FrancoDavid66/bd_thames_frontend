// src/pages/AvisoSiniestroPage.jsx
//
// 📲 «TUVE UN SINIESTRO» — página pública, sin login (Franco 23/11/2026).
//    El cliente la abre apenas le pasa algo y en 2 minutos manda lo urgente.
//
//    Links:
//      /#/siniestro              → genérico (web, Instagram, lo que sea)
//      /#/siniestro?of=2         → el que copia cada oficina desde Siniestros (queda a su nombre)
//      /#/siniestro?t=<token>    → desde el Portal del Asegurado ("Hola, Dennis" y sus autos)
//
//    Diseño: el de la web nueva de Estudio Thames (negro, rojo Thames, Anton, la patente
//    Mercosur). UX tipo Typeform / Uber: UNA pregunta por pantalla, botones grandes, el
//    pulgar llega a todo. Malvinas (marca propia) se ve verde y amarillo, sin nada de THAMES.
//
//    Backend: siniestros/public_views.py → POST /public/siniestros/aviso/
//    Las fotos se suben directo a Cloudinary (como el resto de la app); al servidor van las URLs.
//    El borrador queda guardado en el celu: si se cierra la página, sigue donde estaba.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LuArrowLeft,
  LuArrowRight,
  LuBan,
  LuCamera,
  LuCar,
  LuCarFront,
  LuCircleCheck,
  LuClock,
  LuCloudHail,
  LuFlame,
  LuInfo,
  LuLocateFixed,
  LuLock,
  LuMessageCircle,
  LuPlus,
  LuSend,
  LuShieldAlert,
  LuSiren,
  LuTriangleAlert,
  LuX,
} from "react-icons/lu";

import { uploadToCloudinary } from "../utils/cloudinary";
import { comprimirImagen } from "../utils/comprimirImagen";
import logoThames from "../assets/logos/horiz-rojo-blanco-sm.webp";
import logoMalvinas from "../assets/logos/malvinas_balanza_blanca.svg";
import "./avisoSiniestro.css";

const API_ORIGIN = String(
  import.meta.env.VITE_API_BASE ||
    import.meta.env.VITE_API_URL ||
    (typeof window !== "undefined" ? `${window.location.origin}/api/` : "/api/")
).replace(/\/api\/?$/, "");
const URL_AVISO = `${API_ORIGIN.replace(/\/+$/, "")}/public/siniestros/aviso/`;

const BORRADOR = "avs.borrador.v1";
const FUENTES =
  "https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@500;600;700&family=Open+Sans:wght@400;500;600;700;800&display=swap";

const TIPOS = [
  { id: "CHOCARON", titulo: "Me chocaron", texto: "Otro auto me pegó.", Icono: LuCarFront },
  { id: "CHOCO", titulo: "Choqué", texto: "Le pegué a otro auto o a algo.", Icono: LuCar },
  { id: "ROBO", titulo: "Me robaron", texto: "El auto, una rueda, el estéreo…", Icono: LuShieldAlert },
  { id: "INCENDIO", titulo: "Incendio", texto: "Se prendió fuego el auto.", Icono: LuFlame },
  { id: "OTRO", titulo: "Otra cosa", texto: "Granizo, cristales, vandalismo…", Icono: LuCloudHail, ancha: true },
];
const TIPO_TXT = Object.fromEntries(TIPOS.map((t) => [t.id, t.titulo]));
const es_choque = (tipo) => tipo === "CHOCO" || tipo === "CHOCARON";

const LUGARES_FOTOS = {
  choque: [
    { etiqueta: "AUTO_ASEGURADO", titulo: "Tu auto", ayuda: "Los daños, de cerca y de lejos." },
    { etiqueta: "AUTO_TERCERO", titulo: "El otro auto", ayuda: "Que se vea la patente." },
    { etiqueta: "DOC_TERCERO", titulo: "Papeles del otro", ayuda: "Registro, cédula verde y su seguro." },
    { etiqueta: "LUGAR", titulo: "El lugar", ayuda: "La esquina, el semáforo, las marcas." },
    { etiqueta: "OTRO", titulo: "Otras", ayuda: "Lo que quieras sumar." },
  ],
  robo: [
    { etiqueta: "POLICIAL", titulo: "Denuncia policial", ayuda: "Si ya la hiciste." },
    { etiqueta: "LUGAR", titulo: "El lugar", ayuda: "Dónde estaba el auto." },
    { etiqueta: "AUTO_ASEGURADO", titulo: "Tu auto", ayuda: "Si te robaron una parte: los daños." },
    { etiqueta: "OTRO", titulo: "Otras", ayuda: "Lo que quieras sumar." },
  ],
  otro: [
    { etiqueta: "AUTO_ASEGURADO", titulo: "Los daños", ayuda: "De cerca y de lejos." },
    { etiqueta: "LUGAR", titulo: "El lugar", ayuda: "Dónde pasó." },
    { etiqueta: "OTRO", titulo: "Otras", ayuda: "Lo que quieras sumar." },
  ],
};
const lugaresFotos = (tipo) => (es_choque(tipo) ? LUGARES_FOTOS.choque : tipo === "ROBO" ? LUGARES_FOTOS.robo : LUGARES_FOTOS.otro);

const COMPANIAS = [
  "Allianz", "Antártida (AMCA)", "Galicia Seguros", "Federación Patronal", "Integrity", "La Caja", "La Equidad",
  "La Segunda", "Libra", "Mapfre", "Mercantil Andina", "Meridional", "NRE Seguros", "Orbis", "Provincia Seguros",
  "Rivadavia", "Río Uruguay (RUS)", "San Cristóbal", "Sancor", "Triunfo", "Zurich",
];

// Un campo de cada paso → en qué paso mostrar el error que manda el servidor.
const PASO_DEL_CAMPO = { tipo: "tipo", nombre: "datos", telefono: "datos", patente: "datos", dni: "datos", fecha: "cuando", hora: "cuando", fotos: "fotos" };

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const soloDigitos = (s) => String(s || "").replace(/\D/g, "");
const limpiarPatente = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9);
const ddmm = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
const siNoTxt = (v) => (v === true ? "Sí" : v === false ? "No" : "Sin contestar");

const FORM_VACIO = () => ({
  tipo: "",
  nombre: "",
  telefono: "",
  dni: "",
  patente: "",
  fecha: hoyISO(),
  hora: "",
  lugar: "",
  ubicacion: "",
  relato: "",
  heridos: null,
  policia: null,
  tercero: { nombre: "", telefono: "", patente: "", compania: "" },
  fotos: [],
});

function leerBorrador(t) {
  try {
    const crudo = JSON.parse(window.localStorage.getItem(BORRADOR) || "null");
    if (!crudo || crudo.t !== (t || "") || Date.now() - (crudo.guardado || 0) > 2 * 24 * 3600 * 1000) return null;
    return crudo;
  } catch {
    return null;
  }
}
function guardarBorrador(datos) {
  try {
    window.localStorage.setItem(BORRADOR, JSON.stringify({ ...datos, guardado: Date.now() }));
  } catch {
    /* sin lugar o modo privado: no pasa nada */
  }
}
function borrarBorrador() {
  try {
    window.localStorage.removeItem(BORRADOR);
  } catch {
    /* nada */
  }
}

/* ───────────────────────── piezas ───────────────────────── */
function Patente({ id, value, onChange, invalido, autoFocus }) {
  return (
    <div className="avs-plate">
      <div className="avs-plate-band">
        <span>REPÚBLICA ARGENTINA</span>
        <span className="avs-flag" aria-hidden="true">
          <b />
          <b />
          <b />
        </span>
      </div>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(limpiarPatente(e.target.value))}
        placeholder="AB123CD"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={9}
        aria-invalid={invalido || undefined}
        autoFocus={autoFocus}
      />
    </div>
  );
}

function Campo({ id, label, extra, error, children }) {
  return (
    <div className="avs-field">
      <label className="avs-label" htmlFor={id}>
        {label}
        {extra ? <small>{extra}</small> : null}
      </label>
      {children}
      {error ? (
        <p className="avs-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SiNo({ value, onChange, etiqueta }) {
  return (
    <div className="avs-chips" role="group" aria-label={etiqueta}>
      {[
        [true, "Sí"],
        [false, "No"],
      ].map(([v, t]) => (
        <button key={t} type="button" className="avs-chip" aria-pressed={value === v} onClick={() => onChange(value === v ? null : v)}>
          {t}
        </button>
      ))}
    </div>
  );
}

function Titulo({ kicker, antes, rojo, despues = "", lead }) {
  return (
    <header>
      <p className="avs-kicker">{kicker}</p>
      <h1 className="avs-h2">
        {antes} <span className="avs-hl">{rojo}</span>
        {despues}
      </h1>
      {lead ? <p className="avs-lead">{lead}</p> : null}
    </header>
  );
}

/* ───────────────────────── la página ───────────────────────── */
export default function AvisoSiniestroPage() {
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const token = params.get("t") || "";
  const oficina = params.get("of") || "";

  const [config, setConfig] = useState(null); // {marca, whatsapp, cliente, vehiculos}
  const [paso, setPaso] = useState("inicio");
  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [listo, setListo] = useState(null); // respuesta del servidor
  const [gps, setGps] = useState(""); // "", "buscando", "error"
  const [otroAuto, setOtroAuto] = useState(false); // desde el portal: "fue con otro auto"
  const trampa = useRef(null);
  const restaurado = useRef(false);

  const malvinas = config?.marca === "malvinas";
  const cliente = config?.cliente || null;
  const vehiculos = config?.vehiculos || [];

  /* Fuentes de la web, fondo negro y título de la pestaña */
  useEffect(() => {
    if (!document.getElementById("avs-fuentes")) {
      const l = document.createElement("link");
      l.id = "avs-fuentes";
      l.rel = "stylesheet";
      l.href = FUENTES;
      document.head.appendChild(l);
    }
    const antes = document.body.style.background;
    document.body.style.background = "#0B090A";
    return () => {
      document.body.style.background = antes;
    };
  }, []);
  useEffect(() => {
    if (!config) return;
    document.title = `Avisar un siniestro · ${malvinas ? "Malvinas" : "Estudio Thames"}`;
  }, [config, malvinas]);

  /* Configuración (marca, WhatsApp y, con el link del portal, quién es) */
  useEffect(() => {
    let vivo = true;
    const q = new URLSearchParams();
    if (token) q.set("t", token);
    if (oficina) q.set("of", oficina);
    fetch(`${URL_AVISO}?${q.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => {
        if (!vivo) return;
        setConfig(d || { marca: "thames", whatsapp: "5491122824259", cliente: null, vehiculos: [] });
      });
    return () => {
      vivo = false;
    };
  }, [token, oficina]);

  /* Borrador: se recupera una vez (cuando ya sabemos quién es) y se guarda en cada cambio */
  useEffect(() => {
    if (!config || restaurado.current) return;
    restaurado.current = true;
    const b = leerBorrador(token);
    if (b?.form) {
      setForm({ ...FORM_VACIO(), ...b.form, fotos: (b.form.fotos || []).filter((f) => f.estado === "ok") });
      if (b.paso && b.paso !== "inicio") setPaso(b.paso);
      return;
    }
    if (config.cliente) {
      setForm((f) => ({
        ...f,
        nombre: f.nombre || config.cliente.nombre || "",
        telefono: f.telefono || config.cliente.telefono || "",
        patente: f.patente || (config.vehiculos?.length === 1 ? config.vehiculos[0].patente : ""),
      }));
    }
  }, [config, token]);
  useEffect(() => {
    if (!restaurado.current || listo) return;
    const fotos = form.fotos.filter((f) => f.estado === "ok").map((f) => ({ ...f, preview: f.url }));
    guardarBorrador({ t: token, paso, form: { ...form, fotos } });
  }, [form, paso, token, listo]);

  const set = useCallback((campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => (e[campo] ? { ...e, [campo]: "" } : e));
  }, []);
  const setTercero = useCallback((campo, valor) => setForm((f) => ({ ...f, tercero: { ...f.tercero, [campo]: valor } })), []);

  /* Los pasos (el del "otro" solo en choques) */
  const pasos = useMemo(
    () => ["tipo", "datos", "cuando", ...(es_choque(form.tipo) ? ["otro"] : []), "fotos", "relato", "revisar"],
    [form.tipo]
  );
  const indice = pasos.indexOf(paso);
  const progreso = paso === "inicio" ? 0 : listo ? 100 : Math.round(((indice + 1) / pasos.length) * 100);

  const ir = useCallback((p) => {
    setPaso(p);
    setErrorEnvio("");
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  }, []);

  const validar = useCallback(
    (p) => {
      const e = {};
      if (p === "tipo" && !form.tipo) e.tipo = "Elegí qué pasó.";
      if (p === "datos") {
        if (!cliente && form.nombre.trim().length < 3) e.nombre = "Escribí tu nombre y apellido.";
        if (soloDigitos(form.telefono).length < 8) e.telefono = "Poné un WhatsApp donde te podamos escribir.";
        if (!cliente && form.patente.length < 6 && soloDigitos(form.dni).length < 7)
          e.patente = "Poné la patente o tu DNI, así te encontramos.";
      }
      if (p === "cuando") {
        if (!form.fecha) e.fecha = "¿Qué día pasó?";
        else if (form.fecha > hoyISO()) e.fecha = "La fecha no puede ser después de hoy.";
      }
      if (p === "fotos" && form.fotos.some((f) => f.estado === "subiendo")) e.fotos = "Esperá que terminen de subir las fotos.";
      return e;
    },
    [form, cliente]
  );

  const seguir = useCallback(
    (ev) => {
      ev?.preventDefault?.();
      const e = validar(paso);
      if (Object.keys(e).length) {
        setErrores(e);
        return;
      }
      setErrores({});
      if (paso === "inicio") return ir("tipo");
      const sig = pasos[indice + 1];
      if (sig) ir(sig);
    },
    [validar, paso, pasos, indice, ir]
  );
  const atras = useCallback(() => {
    if (paso === "tipo") return ir("inicio");
    const ant = pasos[indice - 1];
    if (ant) ir(ant);
  }, [paso, pasos, indice, ir]);

  const elegirTipo = (id) => {
    set("tipo", id);
    window.setTimeout(() => ir("datos"), 180);
  };

  /* 📍 Ubicación del celu */
  const usarGps = () => {
    if (!navigator.geolocation) {
      setGps("error");
      return;
    }
    setGps("buscando");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("ubicacion", `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`);
        setGps("");
      },
      () => setGps("error"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  /* 📸 Fotos: se suben apenas las elige (achicadas), a Cloudinary */
  const subirFotos = async (files, etiqueta) => {
    const lista = Array.from(files || []).slice(0, 12);
    if (!lista.length) return;
    const nuevas = lista.map((file, i) => ({
      key: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      etiqueta,
      estado: "subiendo",
      nombre: file.name || "foto",
      mime: file.type || "",
      preview: file.type?.startsWith("image/") ? URL.createObjectURL(file) : "",
      url: "",
      public_id: "",
    }));
    setForm((f) => ({ ...f, fotos: [...f.fotos, ...nuevas] }));
    setErrores((e) => ({ ...e, fotos: "" }));

    await Promise.all(
      nuevas.map(async (n, i) => {
        try {
          const file = lista[i];
          const archivo = file.type?.startsWith("image/") ? await comprimirImagen(file) : file;
          const r = await uploadToCloudinary(archivo, "siniestros/avisos");
          setForm((f) => ({
            ...f,
            fotos: f.fotos.map((x) =>
              x.key === n.key ? { ...x, estado: "ok", url: r.secure_url, public_id: r.public_id, mime: r.mime || x.mime } : x
            ),
          }));
        } catch {
          setForm((f) => ({ ...f, fotos: f.fotos.map((x) => (x.key === n.key ? { ...x, estado: "error" } : x)) }));
        }
      })
    );
  };
  const quitarFoto = (key) =>
    setForm((f) => {
      const foto = f.fotos.find((x) => x.key === key);
      if (foto?.preview?.startsWith("blob:")) URL.revokeObjectURL(foto.preview);
      return { ...f, fotos: f.fotos.filter((x) => x.key !== key) };
    });

  /* ✉️ Mandar */
  const enviar = async () => {
    if (enviando) return;
    for (const p of pasos) {
      const e = validar(p);
      if (Object.keys(e).length) {
        setErrores(e);
        ir(p);
        return;
      }
    }
    setEnviando(true);
    setErrorEnvio("");
    const choque = es_choque(form.tipo);
    const cuerpo = {
      t: token || undefined,
      of: oficina || undefined,
      web: trampa.current?.value || "",
      tipo: form.tipo,
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      dni: soloDigitos(form.dni),
      patente: form.patente,
      fecha: form.fecha,
      hora: form.hora,
      lugar: form.lugar.trim(),
      ubicacion: form.ubicacion,
      relato: form.relato.trim(),
      heridos: form.heridos,
      policia: form.policia,
      tercero: choque ? form.tercero : {},
      fotos: form.fotos
        .filter((f) => f.estado === "ok" && f.url)
        .map(({ url, public_id, etiqueta, mime, nombre }) => ({ url, public_id, etiqueta, mime, nombre })),
    };
    try {
      const r = await fetch(URL_AVISO, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 201) {
        borrarBorrador();
        setListo(d);
        window.scrollTo(0, 0);
        return;
      }
      if (r.status === 400 && d?.errores) {
        const errs = {};
        Object.entries(d.errores).forEach(([k, v]) => {
          errs[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrores(errs);
        const primero = Object.keys(errs).map((k) => PASO_DEL_CAMPO[k]).find(Boolean);
        if (primero) ir(primero);
        else setErrorEnvio("Revisá los datos y probá de nuevo.");
        return;
      }
      if (r.status === 429) {
        setErrorEnvio("Mandaste varios avisos seguidos. Escribinos por WhatsApp y lo vemos al toque.");
        return;
      }
      setErrorEnvio("No pudimos mandar el aviso. Probá de nuevo en un ratito o escribinos por WhatsApp.");
    } catch {
      setErrorEnvio("Parece que no hay internet. Tus datos quedan guardados: probá de nuevo cuando tengas señal.");
    } finally {
      setEnviando(false);
    }
  };

  const linkWa = (texto) =>
    `https://wa.me/${(listo?.whatsapp || config?.whatsapp || "5491122824259").replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;

  /* ───────────── pantallas ───────────── */
  if (!config) {
    return (
      <div className="avs" style={{ display: "grid", placeItems: "center" }}>
        <span className="avs-spin" aria-label="Cargando" />
      </div>
    );
  }

  const marcaNombre = malvinas ? "Malvinas" : "Estudio Thames";
  const subiendo = form.fotos.some((f) => f.estado === "subiendo");

  const cabecera = (
    <div className="avs-top">
      <div className="bar">
        <span className="avs-brand">
          {malvinas ? (
            <>
              <img className="malv" src={logoMalvinas} alt="" />
              <b>MALVINAS</b>
            </>
          ) : (
            <img src={logoThames} alt="Estudio Thames" />
          )}
        </span>
        {!listo && paso !== "inicio" ? (
          <span className="avs-paso" aria-live="polite">
            PASO {indice + 1} / {pasos.length}
          </span>
        ) : (
          <span className="avs-paso">SINIESTROS</span>
        )}
      </div>
      <div className="avs-progress" aria-hidden="true">
        <i style={{ width: `${progreso}%` }} />
      </div>
    </div>
  );

  const fondo = (
    <>
      <div className="avs-glow" aria-hidden="true" />
      <div className="avs-ghost" aria-hidden="true">
        {listo ? "LISTO" : "SINIESTRO"}
      </div>
    </>
  );

  /* ✅ LISTO */
  if (listo) {
    const nombre = (listo.nombre_pila || cliente?.nombre_pila || "").toUpperCase();
    return (
      <div className={`avs${malvinas ? " avs--malvinas" : ""}`}>
        {fondo}
        {cabecera}
        <main className="avs-main" style={{ paddingBottom: 48 }}>
          <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="avs-check">
              <LuCircleCheck />
            </div>
            <h1 className="avs-h1">
              LISTO{nombre ? `, ${nombre}` : ""}. <span className="avs-hl">YA LO TENEMOS.</span>
            </h1>
            <p className="avs-lead">Recibimos tu aviso. Te escribimos por WhatsApp lo antes posible para seguir con vos.</p>
            {listo.numero ? <span className="avs-numero">AVISO N° {listo.numero}</span> : null}

            <div className="avs-bloque">
              <a className="avs-btn avs-btn-wa avs-btn-full" href={linkWa(listo.whatsapp_texto || "Hola! Acabo de avisar un siniestro.")} target="_blank" rel="noreferrer">
                <LuMessageCircle /> ¿Es urgente? Escribinos ahora
              </a>
            </div>

            <div className="avs-bloque">
              <p className="avs-kicker" style={{ marginBottom: 0 }}>
                Qué sigue
              </p>
              <ol className="avs-pasos">
                <li>
                  <b>01</b>
                  <h3>Te escribimos</h3>
                  <p>Revisamos lo que mandaste y te pedimos lo que falte.</p>
                </li>
                <li>
                  <b>02</b>
                  <h3>La denuncia</h3>
                  <p>La hacemos con vos ante la compañía, dentro del plazo (son 3 días).</p>
                </li>
                <li>
                  <b>03</b>
                  <h3>El reclamo</h3>
                  <p>Si te chocaron, nuestros abogados le reclaman al seguro del otro.</p>
                </li>
              </ol>
            </div>

            <div className="avs-bloque">
              <div className="avs-card">
                <p className="avs-kicker">Mientras tanto</p>
                <ul className="avs-no">
                  <li>
                    <LuBan /> No firmes nada que te den sin consultarnos.
                  </li>
                  <li>
                    <LuBan /> No digas que la culpa fue tuya, aunque te lo pidan.
                  </li>
                  <li>
                    <LuBan /> No arregles el auto antes de que lo vea la compañía.
                  </li>
                  <li>
                    <LuCircleCheck /> Guardá todo: fotos, papeles y los datos del otro.
                  </li>
                </ul>
              </div>
            </div>
          </motion.section>
        </main>
        <p className="avs-pie">
          {marcaNombre} · {malvinas ? "Seguros · Abogados · Legales 24 hs" : "Seguros · Jurídico · Inmuebles"}
        </p>
      </div>
    );
  }

  const choque = es_choque(form.tipo);
  const fotosOk = form.fotos.filter((f) => f.estado === "ok").length;

  return (
    <div className={`avs${malvinas ? " avs--malvinas" : ""}`}>
      {fondo}
      {cabecera}

      <main className="avs-main">
        {/* 🤖 campo trampa para robots */}
        <div className="avs-trampa" aria-hidden="true">
          <label>
            Tu web
            <input ref={trampa} name="web" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.form
            key={paso}
            onSubmit={seguir}
            noValidate
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {/* ───── INICIO ───── */}
            {paso === "inicio" && (
              <section>
                {cliente?.nombre_pila ? <p className="avs-hola">Hola, {cliente.nombre_pila} 👋</p> : null}
                <p className="avs-kicker">Siniestros · {marcaNombre}</p>
                <h1 className="avs-h1">
                  ¿Tuviste un <span className="avs-hl">siniestro?</span>
                </h1>
                <p className="avs-lead">
                  Avisanos desde acá en 2 minutos. No hace falta que tengas todo: con lo urgente arrancamos y te escribimos por
                  WhatsApp.
                </p>
                <ul className="avs-trust">
                  <li>
                    <LuClock /> 2 minutos
                  </li>
                  <li>
                    <LuLock /> Sin usuario ni contraseña
                  </li>
                  <li>
                    <LuMessageCircle /> Te respondemos por WhatsApp
                  </li>
                </ul>
                <div className="avs-bloque">
                  <div className="avs-alerta" role="note">
                    <LuSiren />
                    <span>
                      <b>¿Hay heridos?</b> Primero llamá al <a href="tel:911">911</a> o a emergencias médicas (
                      <a href="tel:107">107</a>). Después seguí acá.
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* ───── QUÉ PASÓ ───── */}
            {paso === "tipo" && (
              <section>
                <Titulo kicker="Paso 1 · Qué pasó" antes="¿Qué te" rojo="pasó?" />
                <div className="avs-bloque">
                  <div className="avs-opciones" role="group" aria-label="Qué pasó">
                    {TIPOS.map(({ id, titulo, texto, Icono, ancha }) => (
                      <button
                        key={id}
                        type="button"
                        className={`avs-op${ancha ? " ancha" : ""}`}
                        aria-pressed={form.tipo === id}
                        onClick={() => elegirTipo(id)}
                      >
                        <span className="ico">
                          <Icono />
                        </span>
                        <div>
                          <strong>{titulo}</strong>
                          <span>{texto}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {errores.tipo ? <p className="avs-error" role="alert">{errores.tipo}</p> : null}
                  <p className="avs-tip">
                    <LuInfo /> ¿No sabés de quién fue la culpa? Elegí lo que más se parezca: después lo vemos juntos.
                  </p>
                </div>
              </section>
            )}

            {/* ───── TUS DATOS ───── */}
            {paso === "datos" && (
              <section>
                <Titulo
                  kicker="Paso 2 · Tus datos"
                  antes={cliente ? "¿Con qué" : "¿Quién"}
                  rojo={cliente ? "auto fue?" : "sos?"}
                  lead={cliente ? "Tocá tu auto. Si fue con otro, ponelo abajo." : "Con la patente o tu DNI te encontramos en nuestro sistema."}
                />
                <div className="avs-bloque">
                  {cliente && vehiculos.length > 0 && (
                    <div className="avs-chips" role="group" aria-label="Tu auto">
                      {vehiculos.map((v) => (
                        <button
                          key={v.patente}
                          type="button"
                          className="avs-chip"
                          aria-pressed={!otroAuto && form.patente === v.patente}
                          onClick={() => {
                            setOtroAuto(false);
                            set("patente", v.patente);
                          }}
                        >
                          <span className="avs-chip-pat">{v.patente}</span>
                          {v.auto ? <small>{v.auto}</small> : null}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="avs-chip"
                        aria-pressed={otroAuto}
                        onClick={() => {
                          setOtroAuto(true);
                          set("patente", "");
                        }}
                      >
                        Otro auto
                      </button>
                    </div>
                  )}

                  {(!cliente || otroAuto || vehiculos.length === 0) && (
                    <>
                      <Campo id="avs-patente" label="Patente de tu auto" error={errores.patente}>
                        <Patente id="avs-patente" value={form.patente} onChange={(v) => set("patente", v)} invalido={!!errores.patente} />
                      </Campo>
                      {!cliente && (
                        <>
                          <div className="avs-o">O</div>
                          <Campo id="avs-dni" label="Tu DNI" extra="si no te acordás la patente">
                            <input
                              id="avs-dni"
                              className="avs-input"
                              inputMode="numeric"
                              autoComplete="off"
                              placeholder="30123456"
                              value={form.dni}
                              onChange={(e) => {
                                set("dni", soloDigitos(e.target.value).slice(0, 11));
                                setErrores((x) => ({ ...x, patente: "" }));
                              }}
                            />
                          </Campo>
                        </>
                      )}
                    </>
                  )}

                  {!cliente && (
                    <Campo id="avs-nombre" label="Nombre y apellido" error={errores.nombre}>
                      <input
                        id="avs-nombre"
                        className="avs-input"
                        autoComplete="name"
                        placeholder="Juan Pérez"
                        value={form.nombre}
                        onChange={(e) => set("nombre", e.target.value)}
                        aria-invalid={!!errores.nombre || undefined}
                      />
                    </Campo>
                  )}
                  <Campo id="avs-tel" label="Tu WhatsApp" extra="te escribimos acá" error={errores.telefono}>
                    <input
                      id="avs-tel"
                      className="avs-input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="11 2345-6789"
                      value={form.telefono}
                      onChange={(e) => set("telefono", e.target.value)}
                      aria-invalid={!!errores.telefono || undefined}
                    />
                  </Campo>
                </div>
              </section>
            )}

            {/* ───── CUÁNDO Y DÓNDE ───── */}
            {paso === "cuando" && (
              <section>
                <Titulo kicker="Paso 3 · Cuándo y dónde" antes="¿Cuándo y" rojo="dónde?" />
                <div className="avs-bloque">
                  <div className="avs-fila">
                    <Campo id="avs-fecha" label="Día" error={errores.fecha}>
                      <input
                        id="avs-fecha"
                        className="avs-input"
                        type="date"
                        max={hoyISO()}
                        value={form.fecha}
                        onChange={(e) => set("fecha", e.target.value)}
                        aria-invalid={!!errores.fecha || undefined}
                      />
                    </Campo>
                    <Campo id="avs-hora" label="Hora" extra="más o menos" error={errores.hora}>
                      <input id="avs-hora" className="avs-input" type="time" value={form.hora} onChange={(e) => set("hora", e.target.value)} />
                    </Campo>
                  </div>
                  <Campo id="avs-lugar" label="Dónde fue" extra="calle y altura, o esquina">
                    <input
                      id="avs-lugar"
                      className="avs-input"
                      autoComplete="off"
                      placeholder="Av. Crovara y Cristianía, La Tablada"
                      value={form.lugar}
                      onChange={(e) => set("lugar", e.target.value)}
                    />
                  </Campo>
                  <div className="avs-gps">
                    <button type="button" className="avs-btn avs-btn-ghost" onClick={usarGps} disabled={gps === "buscando"}>
                      <LuLocateFixed /> {gps === "buscando" ? "Buscando…" : form.ubicacion ? "Volver a tomar mi ubicación" : "Estoy ahí: usar mi ubicación"}
                    </button>
                    {form.ubicacion ? (
                      <span className="ok">
                        <LuCircleCheck /> Ubicación guardada
                      </span>
                    ) : null}
                  </div>
                  {gps === "error" ? <p className="avs-ayuda">No pudimos tomar tu ubicación. Escribí la dirección y listo.</p> : null}
                </div>
              </section>
            )}

            {/* ───── EL OTRO ───── */}
            {paso === "otro" && (
              <section>
                <Titulo
                  kicker="Paso 4 · El otro vehículo"
                  antes="Los datos"
                  rojo="del otro"
                  lead="Lo que tengas. Si no tenés nada, seguí igual: lo buscamos después."
                />
                <div className="avs-bloque">
                  <p className="avs-tip">
                    <LuCamera /> El truco: sacale foto a su registro, su cédula verde y su seguro. Las subís en el paso que viene.
                  </p>
                  <Campo id="avs-tpat" label="Patente del otro">
                    <Patente id="avs-tpat" value={form.tercero.patente} onChange={(v) => setTercero("patente", v)} />
                  </Campo>
                  <Campo id="avs-tcia" label="Su compañía de seguros">
                    <input
                      id="avs-tcia"
                      className="avs-input"
                      list="avs-companias"
                      autoComplete="off"
                      placeholder="Ej: Rivadavia"
                      value={form.tercero.compania}
                      onChange={(e) => setTercero("compania", e.target.value)}
                    />
                    <datalist id="avs-companias">
                      {COMPANIAS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </Campo>
                  <div className="avs-fila">
                    <Campo id="avs-tnom" label="Nombre">
                      <input
                        id="avs-tnom"
                        className="avs-input"
                        autoComplete="off"
                        placeholder="Carlos Gómez"
                        value={form.tercero.nombre}
                        onChange={(e) => setTercero("nombre", e.target.value)}
                      />
                    </Campo>
                    <Campo id="avs-ttel" label="Teléfono">
                      <input
                        id="avs-ttel"
                        className="avs-input"
                        type="tel"
                        inputMode="tel"
                        autoComplete="off"
                        placeholder="11 4444-0000"
                        value={form.tercero.telefono}
                        onChange={(e) => setTercero("telefono", e.target.value)}
                      />
                    </Campo>
                  </div>
                </div>
              </section>
            )}

            {/* ───── FOTOS ───── */}
            {paso === "fotos" && (
              <section>
                <Titulo
                  kicker={`Paso ${indice + 1} · Fotos`}
                  antes="Mandanos"
                  rojo="fotos"
                  lead="Cuantas más, mejor. Si ahora no podés, seguí: te las pedimos por WhatsApp."
                />
                <div className="avs-bloque">
                  <div className="avs-slots">
                    {lugaresFotos(form.tipo).map((s) => {
                      const suyas = form.fotos.filter((f) => f.etiqueta === s.etiqueta);
                      const inputId = `avs-f-${s.etiqueta}`;
                      return (
                        <div className="avs-slot" key={s.etiqueta}>
                          <div className="avs-slot-head">
                            <div>
                              <strong>{s.titulo}</strong>
                              <span>{s.ayuda}</span>
                            </div>
                            <label className="avs-add" htmlFor={inputId}>
                              <LuPlus /> {suyas.length ? "Más" : "Agregar"}
                            </label>
                            <input
                              id={inputId}
                              type="file"
                              accept="image/*,application/pdf"
                              multiple
                              hidden
                              onChange={(e) => {
                                subirFotos(e.target.files, s.etiqueta);
                                e.target.value = "";
                              }}
                            />
                          </div>
                          <div className="avs-thumbs">
                            {suyas.map((f) => (
                              <div className="avs-thumb" key={f.key}>
                                {f.preview || (f.url && f.mime?.startsWith("image/")) ? (
                                  <img src={f.preview || f.url} alt={s.titulo} />
                                ) : (
                                  <span className="pdf">PDF</span>
                                )}
                                {f.estado === "subiendo" ? (
                                  <span className="cargando">
                                    <span className="avs-spin" />
                                  </span>
                                ) : null}
                                {f.estado === "error" ? <span className="mal">No subió</span> : null}
                                {f.estado !== "subiendo" ? (
                                  <button type="button" className="x" onClick={() => quitarFoto(f.key)} aria-label="Quitar foto">
                                    <LuX />
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {errores.fotos ? <p className="avs-error" role="alert">{errores.fotos}</p> : null}
                </div>
              </section>
            )}

            {/* ───── CONTANOS ───── */}
            {paso === "relato" && (
              <section>
                <Titulo kicker={`Paso ${indice + 1} · Contanos`} antes="¿Cómo" rojo="fue?" lead="Contalo como se lo contarías a un amigo. Dos líneas alcanzan." />
                <div className="avs-bloque">
                  <Campo id="avs-relato" label="Lo que pasó" extra="opcional">
                    <textarea
                      id="avs-relato"
                      className="avs-textarea"
                      maxLength={3000}
                      placeholder={
                        choque
                          ? "Ej: Estaba frenado en el semáforo de Crovara y un Gol blanco me pegó de atrás."
                          : "Ej: Lo dejé estacionado a la noche y a la mañana no estaba."
                      }
                      value={form.relato}
                      onChange={(e) => set("relato", e.target.value)}
                    />
                  </Campo>
                  <Campo id="avs-heridos" label="¿Hubo heridos?">
                    <SiNo etiqueta="¿Hubo heridos?" value={form.heridos} onChange={(v) => set("heridos", v)} />
                  </Campo>
                  {(choque || form.tipo === "ROBO") && (
                    <Campo id="avs-poli" label={form.tipo === "ROBO" ? "¿Ya hiciste la denuncia policial?" : "¿Vino la policía?"}>
                      <SiNo etiqueta="Policía" value={form.policia} onChange={(v) => set("policia", v)} />
                    </Campo>
                  )}
                </div>
              </section>
            )}

            {/* ───── REVISAR ───── */}
            {paso === "revisar" && (
              <section>
                <Titulo kicker={`Paso ${indice + 1} · Revisar`} antes="¿Está" rojo="todo bien?" lead="Mirá que esté bien y mandalo." />
                <div className="avs-bloque">
                  <div className="avs-resumen">
                    <Resumen titulo="Qué pasó" texto={TIPO_TXT[form.tipo]} onCambiar={() => ir("tipo")} />
                    <Resumen
                      titulo={cliente ? "Tu auto" : "Vos"}
                      texto={[
                        !cliente ? form.nombre : "",
                        form.patente ? `Patente ${form.patente}` : form.dni ? `DNI ${form.dni}` : "",
                        `WhatsApp ${form.telefono}`,
                      ]
                        .filter(Boolean)
                        .join("\n")}
                      onCambiar={() => ir("datos")}
                    />
                    <Resumen
                      titulo="Cuándo y dónde"
                      texto={[
                        [ddmm(form.fecha), form.hora ? `${form.hora} hs` : ""].filter(Boolean).join(" · "),
                        form.lugar,
                        form.ubicacion ? "📍 Ubicación del GPS" : "",
                      ]
                        .filter(Boolean)
                        .join("\n")}
                      onCambiar={() => ir("cuando")}
                    />
                    {choque && (
                      <Resumen
                        titulo="El otro"
                        texto={
                          [form.tercero.patente, form.tercero.compania, form.tercero.nombre, form.tercero.telefono].filter(Boolean).join(" · ") ||
                          "Sin datos (los buscamos después)"
                        }
                        onCambiar={() => ir("otro")}
                      />
                    )}
                    <Resumen
                      titulo="Fotos"
                      texto={fotosOk ? `${fotosOk} ${fotosOk === 1 ? "foto" : "fotos"}` : "Sin fotos (te las pedimos por WhatsApp)"}
                      onCambiar={() => ir("fotos")}
                    />
                    <Resumen
                      titulo="Cómo fue"
                      texto={[form.relato || "", `Heridos: ${siNoTxt(form.heridos)}`].filter(Boolean).join("\n")}
                      onCambiar={() => ir("relato")}
                    />
                  </div>
                  {errorEnvio ? (
                    <div className="avs-alerta" role="alert">
                      <LuTriangleAlert />
                      <span>{errorEnvio}</span>
                    </div>
                  ) : null}
                  <p className="avs-legal">
                    Al mandarlo, aceptás que {marcaNombre} use estos datos para gestionar tu siniestro y comunicarse con vos.
                  </p>
                </div>
              </section>
            )}

            {/* Enter en el teclado = Seguir */}
            <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
          </motion.form>
        </AnimatePresence>
      </main>

      {/* ───── Barra de abajo ───── */}
      {paso !== "tipo" && (
        <div className="avs-acciones">
          <div className={`bar${paso === "inicio" ? " solo" : ""}`}>
            {paso !== "inicio" && (
              <button type="button" className="avs-btn avs-btn-ghost" onClick={atras} aria-label="Atrás">
                <LuArrowLeft />
              </button>
            )}
            {paso === "inicio" && (
              <button type="button" className="avs-btn avs-btn-red avs-btn-full" onClick={seguir}>
                Empezar <LuArrowRight />
              </button>
            )}
            {paso !== "inicio" && paso !== "revisar" && (
              <button type="button" className="avs-btn avs-btn-red" onClick={seguir} disabled={paso === "fotos" && subiendo}>
                {paso === "fotos" && subiendo
                  ? "Subiendo fotos…"
                  : paso === "otro" && !Object.values(form.tercero).some(Boolean)
                    ? "No tengo los datos, seguir"
                    : paso === "fotos" && !fotosOk
                      ? "Seguir sin fotos"
                      : "Seguir"}{" "}
                <LuArrowRight />
              </button>
            )}
            {paso === "revisar" && (
              <button type="button" className="avs-btn avs-btn-red" onClick={enviar} disabled={enviando}>
                {enviando ? "Mandando…" : "Mandar aviso"} <LuSend />
              </button>
            )}
          </div>
        </div>
      )}
      {paso === "tipo" && (
        <div className="avs-acciones">
          <div className="bar solo">
            <button type="button" className="avs-btn avs-btn-ghost avs-btn-full" onClick={atras}>
              <LuArrowLeft /> Atrás
            </button>
          </div>
        </div>
      )}
      <p className="avs-pie">
        {marcaNombre} · {malvinas ? "Seguros · Abogados · Legales 24 hs" : "Seguros · Jurídico · Inmuebles"}
      </p>
    </div>
  );
}

function Resumen({ titulo, texto, onCambiar }) {
  return (
    <div className="avs-res">
      <div>
        <b>{titulo}</b>
        <p>{texto || "—"}</p>
      </div>
      <button type="button" className="avs-link" onClick={onCambiar}>
        Cambiar
      </button>
    </div>
  );
}
