// src/pages/OpinarPage.jsx
//
// ⭐ «¿CÓMO LO ATENDIMOS?» — página pública, sin login (Franco 25/11/2026).
//    El cliente puntúa la atención (1 a 5 estrellas) y, si quiere, deja una queja (la ve solo el admin).
//
//    Links:
//      /#/opinar?t=<token>  → link personal (la oficina lo manda por WhatsApp después de cobrar):
//                             «¿Cómo lo atendió Sofía?». Sirve una sola vez y vence a los 14 días.
//      /#/opinar?of=<id>    → QR pegado en la oficina: el cliente toca la foto de quien lo atendió
//                             y deja su WhatsApp (uno por día por oficina).
//
//    Diseño: el mismo de «Tuve un siniestro» (avisoSiniestro.css). Malvinas se ve verde y amarillo.
//    Trato: de usted.
//    Backend: opiniones/public_views.py → /public/opiniones/ y /public/opiniones/queja/
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LuCircleCheck,
  LuMessageSquareWarning,
  LuSend,
  LuStar,
  LuTriangleAlert,
} from "react-icons/lu";

import logoThames from "../assets/logos/horiz-rojo-blanco-sm.webp";
import logoMalvinas from "../assets/logos/malvinas_balanza_blanca.svg";
import "./avisoSiniestro.css";
import "./opinar.css";

const API_ORIGIN = String(
  import.meta.env.VITE_API_BASE ||
    import.meta.env.VITE_API_URL ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/api/`
      : "/api/"),
).replace(/\/api\/?$/, "");
const URL_BASE = `${API_ORIGIN.replace(/\/+$/, "")}/public/opiniones/`;
const FUENTES =
  "https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@500;600;700&family=Open+Sans:wght@400;500;600;700;800&display=swap";

const NOTAS = ["", "Muy mala", "Mala", "Regular", "Buena", "¡Excelente!"];

const iniciales = (nombre) =>
  String(nombre || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

function Foto({ persona, grande = false }) {
  return (
    <span className={`opn-foto${grande ? " grande" : ""}`} aria-hidden="true">
      {persona?.foto ? (
        <img src={persona.foto} alt="" loading="lazy" />
      ) : (
        iniciales(persona?.nombre)
      )}
    </span>
  );
}

async function enviar(url, cuerpo) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  let d = {};
  try {
    d = await r.json();
  } catch {
    /* sin cuerpo */
  }
  if (r.status === 429)
    throw Object.assign(
      new Error("Demasiados intentos. Pruebe de nuevo en un rato."),
      { codigo: "tope" },
    );
  if (!r.ok)
    throw Object.assign(
      new Error(d.error || "No se pudo enviar. Pruebe de nuevo."),
      { codigo: d.codigo || "" },
    );
  return d;
}

export default function OpinarPage() {
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const token = params.get("t") || "";
  const oficinaId = params.get("of") || "";

  const [config, setConfig] = useState(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [empleado, setEmpleado] = useState(null);
  const [estrellas, setEstrellas] = useState(0);
  const [gusto, setGusto] = useState([]);
  const [mejorar, setMejorar] = useState([]);
  const [comentario, setComentario] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nombre, setNombre] = useState("");
  const [conQueja, setConQueja] = useState(false);
  const [queja, setQueja] = useState("");
  const [soloQueja, setSoloQueja] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState({ texto: "", codigo: "" });
  const [listo, setListo] = useState(null); // "opinion" | "queja"
  const trampa = useRef(null);

  const malvinas = config?.marca === "malvinas";
  const esQr = config?.modo === "qr";
  const equipo = config?.empleados || [];
  const fijo = config?.empleado || null; // el link ya dice quién lo atendió
  const persona = fijo || empleado;

  /* Fuentes y fondo negro, como la web */
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
    let vivo = true;
    const q = new URLSearchParams();
    if (token) q.set("t", token);
    else if (oficinaId) q.set("of", oficinaId);
    fetch(`${URL_BASE}?${q.toString()}`)
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .catch(() => ({ ok: false, d: {} }))
      .then(({ ok, d }) => {
        if (!vivo) return;
        if (ok) setConfig(d);
        else {
          setErrorCarga(
            d.error ||
              "No pudimos abrir la página. Revise su conexión e intente de nuevo.",
          );
          setConfig({ marca: "thames", modo: "error" });
        }
      });
    return () => {
      vivo = false;
    };
  }, [token, oficinaId]);

  useEffect(() => {
    if (!config) return;
    document.title = `¿Cómo lo atendimos? · ${malvinas ? "Malvinas" : "Estudio Thames"}`;
  }, [config, malvinas]);

  const alternar = (lista, setLista, id) =>
    setLista((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const elegirEstrellas = (n) => {
    setEstrellas(n);
    setError({ texto: "", codigo: "" });
    if (n <= 2) setConQueja(true);
  };

  const faltaTel = esQr && telefono.replace(/\D/g, "").length < 8;

  // 🛠️ 27/11/2026 («se traba»): antes el botón quedaba apagado sin decir por qué y las estrellas no
  // respondían hasta tocar la foto. Ahora todo responde siempre y, al tocar «Enviar», se avisa QUÉ falta
  // y se lleva al cliente hasta ese lugar. Ej: sin WhatsApp → «Escriba su WhatsApp…» y lo enfoca.
  const faltante = () => {
    if (soloQueja) {
      if (queja.trim().length < 5) return { codigo: "queja", texto: "Cuéntenos qué pasó (aunque sea en una línea).", id: "opn-queja" };
      if (faltaTel) return { codigo: "telefono", texto: "Escriba su WhatsApp para poder responderle (ej: 11 5555-0000).", id: "opn-tel" };
      return null;
    }
    if (equipo.length && !persona) return { codigo: "empleado", texto: "Primero toque la foto de quien lo atendió.", id: "opn-equipo" };
    if (!estrellas) return { codigo: "estrellas", texto: "Toque las estrellas para puntuar la atención.", id: "opn-estrellas" };
    if (faltaTel) return { codigo: "telefono", texto: "Escriba su WhatsApp (ej: 11 5555-0000). Es solo para que no se repita la opinión.", id: "opn-tel" };
    if (conQueja && queja.trim().length < 5) return { codigo: "queja", texto: "Cuéntenos qué pasó en el reclamo (o toque «No quiero hacer un reclamo»).", id: "opn-queja" };
    return null;
  };

  const llevarA = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (/^(INPUT|TEXTAREA)$/.test(el.tagName)) setTimeout(() => el.focus({ preventScroll: true }), 350);
  };

  const limpiarError = (codigo) => setError((e) => (e.codigo === codigo ? { texto: "", codigo: "" } : e));

  const mandar = async () => {
    if (enviando) return;
    const falta = faltante();
    if (falta) {
      setError({ texto: falta.texto, codigo: falta.codigo });
      llevarA(falta.id);
      return;
    }
    setEnviando(true);
    setError({ texto: "", codigo: "" });
    const base = {
      ...(token ? { t: token } : { of: oficinaId }),
      empleado: persona?.id || "",
      telefono,
      nombre,
      web: trampa.current?.value || "",
    };
    try {
      if (soloQueja) {
        await enviar(`${URL_BASE}queja/`, { ...base, texto: queja });
        setListo("queja");
      } else {
        await enviar(URL_BASE, {
          ...base,
          estrellas,
          gusto: estrellas >= 4 ? gusto : [],
          mejorar: estrellas <= 3 ? mejorar : [],
          comentario,
          queja: conQueja ? queja : "",
        });
        setListo(conQueja && queja.trim() ? "queja" : "opinion");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError({ texto: e.message, codigo: e.codigo || "" });
      const ids = { empleado: "opn-equipo", estrellas: "opn-estrellas", telefono: "opn-tel" };
      if (ids[e.codigo]) llevarA(ids[e.codigo]);
    } finally {
      setEnviando(false);
    }
  };

  if (!config) {
    return (
      <div className="avs" style={{ display: "grid", placeItems: "center" }}>
        <span className="avs-spin" aria-label="Cargando" />
      </div>
    );
  }

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
        <span className="avs-paso">
          {config.oficina?.nombre
            ? config.oficina.nombre.toUpperCase()
            : "ATENCIÓN"}
        </span>
      </div>
    </div>
  );
  const fondo = (
    <>
      <div className="avs-glow" aria-hidden="true" />
      <div className="avs-ghost" aria-hidden="true">
        {listo ? "GRACIAS" : "OPINIÓN"}
      </div>
    </>
  );
  const envoltorio = (contenido, barraAbajo = null) => (
    <div className={`avs${malvinas ? " avs--malvinas" : ""}`}>
      {fondo}
      {cabecera}
      <main
        className="avs-main"
        style={barraAbajo ? undefined : { paddingBottom: 48 }}
      >
        {contenido}
      </main>
      {barraAbajo}
    </div>
  );

  /* ❌ Link roto */
  if (config.modo === "error") {
    return envoltorio(
      <section>
        <p className="avs-kicker">Opinión</p>
        <h1 className="avs-h2">
          No encontramos <span className="avs-hl">este link</span>
        </h1>
        <p className="avs-lead">{errorCarga}</p>
      </section>,
    );
  }

  /* ✅ Gracias */
  if (listo) {
    const pila = (
      config.nombre_pila ||
      nombre.split(" ")[0] ||
      ""
    ).toUpperCase();
    return envoltorio(
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="avs-check">
          <LuCircleCheck />
        </div>
        <h1 className="avs-h1">
          ¡MUCHAS GRACIAS{pila ? `, ${pila}` : ""}!{" "}
          <span className="avs-hl">LO TENEMOS.</span>
        </h1>
        <p className="avs-lead">
          {listo === "queja"
            ? "Recibimos su reclamo. El responsable de la oficina lo va a leer personalmente y se va a comunicar con usted por WhatsApp."
            : "Su opinión nos ayuda a atenderlo cada vez mejor."}
        </p>
      </motion.section>,
    );
  }

  /* 🔁 Ya opinó con este link, o venció: igual puede dejar un reclamo */
  const linkCerrado =
    !esQr && (config.ya_opino || config.vencido) && !soloQueja;
  if (linkCerrado) {
    return envoltorio(
      <section>
        <p className="avs-kicker">Opinión</p>
        <h1 className="avs-h2">
          {config.ya_opino ? (
            <>
              Ya nos dejó <span className="avs-hl">su opinión</span>
            </>
          ) : (
            <>
              Este link <span className="avs-hl">venció</span>
            </>
          )}
        </h1>
        <p className="avs-lead">
          {config.ya_opino
            ? "¡Muchas gracias por tomarse el tiempo!"
            : "Los links para opinar duran 14 días."}
        </p>
        <div className="avs-bloque">
          <button
            type="button"
            className="avs-btn avs-btn-ghost avs-btn-full"
            onClick={() => setSoloQueja(true)}
          >
            <LuMessageSquareWarning /> Quiero hacer un reclamo
          </button>
        </div>
      </section>,
    );
  }

  const campoTelefono = esQr ? (
    <div className="avs-fila">
      <div className="avs-field">
        <label className="avs-label" htmlFor="opn-tel">
          Su WhatsApp
        </label>
        <input
          id="opn-tel"
          className="avs-input"
          inputMode="tel"
          autoComplete="tel"
          placeholder="11 5555-0000"
          value={telefono}
          onChange={(e) => {
            setTelefono(e.target.value);
            limpiarError("telefono");
          }}
          aria-invalid={error.codigo === "telefono"}
        />
        {error.codigo === "telefono" ? <p className="avs-error">{error.texto}</p> : null}
      </div>
      <div className="avs-field">
        <label className="avs-label" htmlFor="opn-nom">
          Nombre <small>(opcional)</small>
        </label>
        <input
          id="opn-nom"
          className="avs-input"
          autoComplete="given-name"
          placeholder="Su nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>
    </div>
  ) : null;

  const elegirPersona = equipo.length ? (
    <div className="avs-bloque" id="opn-equipo">
      <p className="avs-label">
        {soloQueja
          ? "¿Quién lo atendió? (opcional)"
          : "Toque la foto de quien lo atendió"}
      </p>
      <div className="opn-equipo" role="group" aria-label="Quién lo atendió">
        {equipo.map((p) => (
          <button
            key={p.id}
            type="button"
            className="opn-persona"
            aria-pressed={empleado?.id === p.id}
            onClick={() => {
              setEmpleado(empleado?.id === p.id ? null : p);
              limpiarError("empleado");
            }}
          >
            <Foto persona={p} />
            <span>{p.nombre.split(" ")[0]}</span>
          </button>
        ))}
      </div>
      {error.codigo === "empleado" ? (
        <p className="avs-error">{error.texto}</p>
      ) : null}
    </div>
  ) : null;

  const barra = (
    <div className="avs-acciones">
      <div className="bar solo">
        <button
          type="button"
          className="avs-btn avs-btn-red avs-btn-full"
          disabled={enviando}
          onClick={mandar}
        >
          {enviando ? (
            <span className="avs-spin" aria-label="Enviando" />
          ) : (
            <LuSend />
          )}
          {soloQueja ? "Enviar reclamo" : "Enviar opinión"}
        </button>
      </div>
    </div>
  );

  const trampaInput = (
    <input
      ref={trampa}
      className="avs-trampa"
      tabIndex={-1}
      autoComplete="off"
      name="web"
      aria-hidden="true"
      defaultValue=""
    />
  );

  /* 📣 Solo un reclamo */
  if (soloQueja) {
    return envoltorio(
      <section>
        <p className="avs-kicker">Reclamo</p>
        <h1 className="avs-h2">
          Cuéntenos <span className="avs-hl">qué pasó</span>
        </h1>
        <p className="avs-lead">
          Lo lee personalmente el responsable de la oficina. No lo ve el resto
          del equipo.
        </p>
        {elegirPersona}
        <div className="avs-bloque">
          <div className="avs-field">
            <label className="avs-label" htmlFor="opn-queja">
              Su reclamo
            </label>
            <textarea
              id="opn-queja"
              className="avs-textarea"
              maxLength={2000}
              placeholder="Ej: Esperé más de una hora y no me dieron una respuesta."
              value={queja}
              onChange={(e) => {
                setQueja(e.target.value);
                limpiarError("queja");
              }}
            />
            {error.codigo === "queja" ? <p className="avs-error">{error.texto}</p> : null}
          </div>
          {campoTelefono}
          {error.texto && !["empleado", "estrellas", "telefono", "queja"].includes(error.codigo) ? (
            <div className="avs-alerta" role="alert">
              <LuTriangleAlert /> <span>{error.texto}</span>
            </div>
          ) : null}
          <button
            type="button"
            className="avs-link"
            style={{ alignSelf: "flex-start" }}
            onClick={() => setSoloQueja(false)}
          >
            Volver a puntuar la atención
          </button>
        </div>
        {trampaInput}
      </section>,
      barra,
    );
  }

  /* ⭐ Opinión */
  const chips = estrellas >= 4 ? config.gusto || [] : config.mejorar || [];
  const elegidos = estrellas >= 4 ? gusto : mejorar;
  const setElegidos = estrellas >= 4 ? setGusto : setMejorar;

  return envoltorio(
    <section>
      {config.nombre_pila ? (
        <p className="avs-hola">¡Hola, {config.nombre_pila}!</p>
      ) : null}
      <p className="avs-kicker">Su opinión</p>
      {fijo ? (
        <div className="opn-quien">
          <Foto persona={fijo} grande />
          <div>
            <p>¿Cómo lo atendió</p>
            <strong>
              <span className="avs-hl">{fijo.nombre.split(" ")[0]}</span>?
            </strong>
          </div>
        </div>
      ) : (
        <h1 className="avs-h2">
          ¿Cómo lo <span className="avs-hl">atendimos?</span>
        </h1>
      )}
      <p className="avs-lead">
        Le lleva menos de un minuto. Nos ayuda a atenderlo cada vez mejor.
      </p>

      {elegirPersona}

      <div className="avs-bloque">
        <p className="avs-label">Puntúe la atención</p>
        <div className="opn-estrellas" role="radiogroup" aria-label="Estrellas" id="opn-estrellas">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={estrellas === n}
              aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}: ${NOTAS[n]}`}
              className={`opn-estrella${n <= estrellas ? " on" : ""}`}
              onClick={() => elegirEstrellas(n)}
            >
              <LuStar fill={n <= estrellas ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
        <p className="opn-nota" aria-live="polite">
          {NOTAS[estrellas]}
        </p>
        {error.codigo === "estrellas" ? <p className="avs-error">{error.texto}</p> : null}
      </div>

      {estrellas > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="avs-bloque"
        >
          <p className="avs-label">
            {estrellas >= 4 ? "¿Qué fue lo mejor?" : "¿Qué podemos mejorar?"}
          </p>
          <div className="avs-chips">
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                className="avs-chip"
                aria-pressed={elegidos.includes(c.id)}
                onClick={() => alternar(elegidos, setElegidos, c.id)}
              >
                {c.txt}
              </button>
            ))}
          </div>
          {campoTelefono}
          <div className="avs-field">
            <label className="avs-label" htmlFor="opn-com">
              Comentario <small>(opcional)</small>
            </label>
            <textarea
              id="opn-com"
              className="avs-textarea"
              style={{ minHeight: 96 }}
              maxLength={1000}
              placeholder={
                estrellas >= 4
                  ? "Ej: Me explicaron todo muy claro."
                  : "Ej: Tardaron en responderme."
              }
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </div>

          {conQueja ? (
            <div className="avs-card opn-queja">
              <div className="avs-field">
                <label className="avs-label" htmlFor="opn-queja">
                  Su reclamo
                </label>
                <textarea
                  id="opn-queja"
                  className="avs-textarea"
                  maxLength={2000}
                  placeholder="Cuéntenos qué pasó. Lo lee personalmente el responsable de la oficina."
                  value={queja}
                  onChange={(e) => {
                    setQueja(e.target.value);
                    limpiarError("queja");
                  }}
                />
                {error.codigo === "queja" ? <p className="avs-error">{error.texto}</p> : null}
              </div>
              <button
                type="button"
                className="avs-link"
                style={{ marginTop: 10 }}
                onClick={() => setConQueja(false)}
              >
                No quiero hacer un reclamo
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="avs-link"
              style={{ alignSelf: "flex-start" }}
              onClick={() => setConQueja(true)}
            >
              Quiero hacer un reclamo
            </button>
          )}
        </motion.div>
      ) : (
        <div className="avs-bloque">
          <button
            type="button"
            className="avs-link"
            style={{ alignSelf: "flex-start" }}
            onClick={() => setSoloQueja(true)}
          >
            Solo quiero hacer un reclamo
          </button>
        </div>
      )}

      {error.texto && !["empleado", "estrellas", "telefono", "queja"].includes(error.codigo) ? (
        <div className="avs-bloque">
          <div className="avs-alerta" role="alert">
            <LuTriangleAlert /> <span>{error.texto}</span>
          </div>
        </div>
      ) : null}
      {trampaInput}
    </section>,
    barra,
  );
}
