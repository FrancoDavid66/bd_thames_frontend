/* src/pages/JuegoPage.jsx
 *
 * 🕹️ THAMES ARCADE — MINIJUEGO "SINIESTRO CERO" (menú: Recreo → Minijuego).
 *
 * A propósito tiene su propio estilo de FICHÍN (neón, letras pixel, pantallas
 * de tubo) y NO el de la app: es el recreo. Los estilos están en
 * components/juego/arcade.css.
 *
 * Un auto que esquiva el tráfico, estilo Road Fighter de la Family.
 * Si chocás es un siniestro; con 3 siniestros "te dan de baja".
 *
 * Pantallas:
 *   1) Portada → la DEMO se juega sola (como los fichines esperando ficha),
 *      ELEGÍ TU JUGADOR: el RESPONSABLE de la oficina (los mismos de
 *      Configuración → Responsables; el admin primero elige la oficina)
 *      y START. En la compu: ENTER = start · ← → cambian de jugador.
 *   2) Jugando → el juego (components/juego/SiniestroCero.jsx).
 *   3) GAME OVER → "Mariano te va a llamar para pedir documentación" (la
 *      llamada entrante), tu puntaje (sube contando), si rompiste un récord y
 *      tu puesto de la semana. ENTER = jugar de nuevo · ESC = cambiar jugador.
 *   Al costado (o abajo en el celu): HIGH SCORES de jugadores y oficinas.
 *
 * Backend:
 *   GET  ranking/juego/?rango=hoy|semana|siempre&jugador=<id>
 *   POST ranking/juego/partidas/
 *
 * El jugador elegido y el sonido se recuerdan en ese dispositivo.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import api from "../services/api";
import SiniestroCero from "../components/juego/SiniestroCero";
import TableroJuego from "../components/juego/TableroJuego";
import DemoArcade from "../components/juego/DemoArcade";
import { AvatarPixel, FondoArcade, Pixel } from "../components/juego/ArcadeUI";
import { puntaje6, useCuentaArriba, useModoArcade } from "../components/juego/arcade";
import { crearSonido } from "../components/juego/sonido";
import "../components/juego/arcade.css";

// (alias en mayúscula para que el linter lo reconozca como componente)
const MotionDiv = motion.div;

const CLAVE_JUGADOR = "thames.juego.jugador";
const CLAVE_SONIDO = "thames.juego.sonido";

const fmt = (n) => Number(n || 0).toLocaleString("es-AR");

// Memoria del dispositivo (si el navegador no deja, la app sigue igual).
const leer = (k) => {
  try { return window.localStorage.getItem(k); } catch { return null; }
};
const guardar = (k, v) => {
  try { window.localStorage.setItem(k, v); } catch { /* sin memoria: no pasa nada */ }
};
const nuevoUid = () => {
  try { return window.crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
};
const tiempo = (s) => {
  const m = Math.floor((s || 0) / 60);
  const r = (s || 0) % 60;
  return m ? `${m}:${String(r).padStart(2, "0")}` : `${r} s`;
};
// Botones, links y campos ya reaccionan solos al ENTER: no hay que duplicarlo.
// (Los títulos en letra de fichín van SIN tilde: esa letra no tiene mayúsculas acentuadas.)
const esControl = (el) =>
  !!el && (/^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(el.tagName || "") || !!el.isContentEditable);
const esCampo = (el) => !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || "") || !!el.isContentEditable);

const REGLAS = [
  { sprite: "autoRojo", titulo: "1 punto x metro", texto: "Cuanto más rápido vas, más suma." },
  { sprite: "rayo", titulo: "¡CASI! +100", texto: "Pasá rozando un auto sin tocarlo. Seguidos se multiplican." },
  { sprite: "moneda", titulo: "Moneda +250", texto: "Cada moneda que agarrás en la ruta." },
  { sprite: "escudo", titulo: "Cobertura total", texto: "El escudo celeste: 5 segundos sin siniestros." },
  { sprite: "autoAmarillo", titulo: "Autos amarillos", texto: "Ponen el guiño y se cruzan a tu carril." },
  { sprite: "explosion", titulo: "3 siniestros", texto: "Te dan de baja: GAME OVER (y te llama Mariano)." },
];

// ☎️ Lo que agrega Mariano cuando llama (sale uno distinto cada partida)
const CHISTES_MARIANO = [
  "Prepará DNI, cédula verde, fotos del auto y la denuncia.",
  "Ya está buscando tu número en la ficha.",
  "Dice que es «una cosita nomás».",
  "Tenés 3 llamadas perdidas y un audio de 4 minutos.",
  "Quiere fotos de los 4 costados… y de la rueda de auxilio.",
  "También pide la denuncia firmada. En original.",
];

export default function JuegoPage() {
  useModoArcade();
  const [estado, setEstado] = useState("inicio"); // inicio | jugando | fin
  const [rango, setRango] = useState("semana");
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [jugador, setJugador] = useState(() => Number(leer(CLAVE_JUGADOR)) || null);
  const [sonido, setSonido] = useState(() => leer(CLAVE_SONIDO) === "1");
  const [partidaN, setPartidaN] = useState(0);
  const [final, setFinal] = useState(null); // { resultado, guardando, error, respuesta }
  const [aviso, setAviso] = useState(0); // sube cada vez que tocan START sin elegir jugador (sacude la lista)
  const uidRef = useRef(null);
  const zonaRef = useRef(null);
  const pedidoRef = useRef(0); // para no pisar datos nuevos con una respuesta vieja
  const sfxRef = useRef(null); // ruiditos del menú

  // Responsables por oficina (usuario de oficina: la suya · admin: todas)
  const grupos = useMemo(() => datos?.responsables || [], [datos]);
  const chips = useMemo(
    () => grupos.flatMap((g) => g.responsables.map((r) => ({ ...r, oficina_id: g.oficina_id, oficina: g.oficina }))),
    [grupos]
  );
  const [oficinaElegida, setOficinaElegida] = useState(null);
  const elegido = chips.find((c) => c.id === jugador) || null;
  const jugadorValido = elegido ? elegido.id : null;
  const nombreJugador = elegido?.nombre || "";
  const faltaElegir = chips.length > 0 && !jugadorValido;
  // Qué oficina se ve en la lista: la que tocaste, la de quien juega, la tuya o la primera con gente.
  const oficinaVista =
    (grupos.some((g) => g.oficina_id === oficinaElegida) ? oficinaElegida : null) ||
    elegido?.oficina_id ||
    (grupos.some((g) => g.oficina_id === datos?.mi_oficina_id && g.responsables.length) ? datos.mi_oficina_id : null) ||
    grupos.find((g) => g.responsables.length)?.oficina_id ||
    grupos[0]?.oficina_id ||
    null;

  // 🔊 Ruiditos del menú (solo si el parlante está prendido)
  const sonar = useCallback(
    (evento, aunqueApagado = false) => {
      if (!sonido && !aunqueApagado) return;
      if (!sfxRef.current) sfxRef.current = crearSonido();
      sfxRef.current.activar(true);
      sfxRef.current.evento(evento);
    },
    [sonido]
  );
  useEffect(() => {
    if (!sonido && sfxRef.current) sfxRef.current.activar(false);
  }, [sonido]);
  useEffect(() => {
    const sfx = sfxRef;
    return () => sfx.current?.cerrar();
  }, []);

  const cargar = useCallback(async (r, quien) => {
    const n = ++pedidoRef.current;
    setCargando(true);
    try {
      const params = { rango: r };
      if (quien) params.jugador = quien;
      const res = await api.get("ranking/juego/", { params });
      if (n === pedidoRef.current) {
        setDatos(res.data);
        setErrorCarga(false);
      }
    } catch {
      if (n === pedidoRef.current) setErrorCarga(true);
    } finally {
      if (n === pedidoRef.current) setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(rango, jugador); }, [cargar, rango, jugador]);

  const elegirJugador = (id) => {
    if (id !== jugador) sonar("menu");
    setJugador(id);
    guardar(CLAVE_JUGADOR, String(id));
  };

  // Admin: al cambiar de oficina, si el que estaba elegido es de otra, se des-elige.
  const elegirOficina = (id) => {
    sonar("menu");
    setOficinaElegida(id);
    if (elegido && elegido.oficina_id !== id) {
      setJugador(null);
      guardar(CLAVE_JUGADOR, "");
    }
  };

  // ← → en la portada: cambia de jugador dentro de la oficina que se ve.
  const moverJugador = (paso) => {
    const lista = grupos.find((g) => g.oficina_id === oficinaVista)?.responsables || [];
    if (!lista.length) return;
    const actual = lista.findIndex((r) => r.id === jugadorValido);
    const siguiente = actual < 0 ? (paso > 0 ? 0 : lista.length - 1) : (actual + paso + lista.length) % lista.length;
    elegirJugador(lista[siguiente].id);
  };

  const cambiarRango = (r) => {
    if (r !== rango) sonar("menu");
    setRango(r);
  };

  const alternarSonido = () => {
    const prender = !sonido;
    setSonido(prender);
    guardar(CLAVE_SONIDO, prender ? "1" : "0");
    if (prender) sonar("menu", true);
  };

  const jugar = () => {
    if (faltaElegir) {
      setAviso((n) => n + 1);
      sonar("error");
      return;
    }
    sonar("start");
    uidRef.current = nuevoUid();
    setFinal(null);
    setPartidaN((n) => n + 1);
    setEstado("jugando");
    requestAnimationFrame(() => zonaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const mandarPartida = async (resultado) => {
    setFinal({ resultado, guardando: true, error: "", respuesta: null });
    try {
      const res = await api.post("ranking/juego/partidas/", {
        ...resultado,
        juego: "siniestro_cero",
        empleado_id: jugadorValido || undefined,
        uid: uidRef.current,
      });
      setFinal({ resultado, guardando: false, error: "", respuesta: res.data });
      const rec = res.data?.records || {};
      if (rec.personal || rec.oficina || rec.global) sonar("record");
      if (rango === "semana" && res.data?.tablero) {
        pedidoRef.current += 1; // lo que viene del guardado es lo más nuevo
        setDatos(res.data.tablero);
        setErrorCarga(false);
        setCargando(false);
      } else {
        cargar(rango, jugadorValido);
      }
    } catch (e) {
      setFinal({
        resultado,
        guardando: false,
        error: e?.response?.data?.detail || "No se pudo guardar el puntaje.",
        respuesta: null,
      });
    }
  };

  const alTerminar = (resultado) => {
    setEstado("fin");
    mandarPartida(resultado);
    // Que el GAME OVER quede arriba de todo en la pantalla (en el celu)
    requestAnimationFrame(() => zonaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  // ⌨️ Portada: ENTER = start · ← → = cambiar de jugador
  const accionesRef = useRef({});
  useEffect(() => {
    accionesRef.current = { jugar, moverJugador, cargando };
  });
  useEffect(() => {
    if (estado !== "inicio") return undefined;
    const alTeclear = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || esCampo(e.target)) return;
      const a = accionesRef.current;
      if (e.key === "Enter") {
        if (e.repeat || esControl(e.target)) return;
        e.preventDefault();
        if (!a.cargando) a.jugar();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        a.moverJugador(e.key === "ArrowRight" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [estado]);

  const yo = datos?.yo;
  // Tu récord (solo si los datos cargados son de quien va a jugar)
  const miRecord = yo && (yo.empleado_id || null) === (jugadorValido || null) ? yo.mejor_historico || 0 : 0;

  return (
    <div className={`arcade min-h-[calc(100dvh-4rem)]${estado === "jugando" ? " arcade--jugando" : ""}`}>
      <FondoArcade />
      <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-4">
        {/* Cartel de neón */}
        <header className="arcade-marquesina">
          <div className="flex min-w-0 items-center gap-3">
            <Pixel sprite="joystick" tam={3} />
            <div className="min-w-0">
              <div className="arcade-neon text-[clamp(17px,5vw,34px)] leading-none">THAMES ARCADE</div>
              <div className="f-pixel t-suave mt-1.5 text-[7px] sm:text-[8px]">RECREO · MINIJUEGOS</div>
            </div>
          </div>
          <button
            type="button"
            onClick={alternarSonido}
            aria-pressed={sonido}
            aria-label={sonido ? "Sonido prendido" : "Sonido apagado"}
            className="arcade-sfx"
          >
            <Pixel sprite={sonido ? "parlante" : "parlanteMudo"} tam={2} />
            SFX
            <span className="arcade-led" />
          </button>
        </header>

        <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start">
          <section ref={zonaRef} className="scroll-mt-20">
            {estado === "jugando" ? (
              <SiniestroCero
                key={partidaN}
                sonido={sonido}
                recordPersonal={miRecord}
                onTerminar={alTerminar}
                onAbandonar={() => setEstado("inicio")}
              />
            ) : estado === "fin" && final ? (
              <Resultado
                final={final}
                onOtra={jugar}
                onReintentar={() => mandarPartida(final.resultado)}
                ocupado={final.guardando || cargando}
                onCambiar={() => setEstado("inicio")}
                hayChips={chips.length > 0}
                nombre={nombreJugador || final.respuesta?.partida?.jugador || ""}
              />
            ) : (
              <Portada
                grupos={grupos}
                oficinaVista={oficinaVista}
                onOficina={elegirOficina}
                elegido={elegido}
                jugador={jugadorValido}
                onElegir={elegirJugador}
                faltaElegir={faltaElegir}
                yo={yo}
                record={datos?.record}
                cargando={cargando}
                onJugar={jugar}
                aviso={aviso}
              />
            )}
          </section>

          <aside className={estado === "jugando" ? "hidden lg:block" : ""}>
            <TableroJuego
              datos={datos}
              rango={rango}
              onRango={cambiarRango}
              cargando={cargando}
              error={errorCarga}
              onReintentar={() => cargar(rango, jugadorValido)}
            />
            <button
              type="button"
              onClick={() => cargar(rango, jugadorValido)}
              className="arcade-link mx-auto mt-4 flex items-center gap-2"
            >
              {cargando ? <span className="arcade-titilar">CARGANDO...</span> : "ACTUALIZAR TABLERO"}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── 1) Portada ──────────────────────────────────────────────────────────
function Portada({ grupos, oficinaVista, onOficina, elegido, jugador, onElegir, faltaElegir, yo, record, cargando, onJugar, aviso }) {
  const variasOficinas = grupos.length > 1;
  const grupo = grupos.find((g) => g.oficina_id === oficinaVista) || null;
  const responsables = grupo?.responsables || [];
  const hayAlguien = grupos.some((g) => g.responsables.length);

  return (
    <div className="arcade-marco p-4" data-testid="juego-portada">
      {/* Marcador de fichín */}
      <div className="arcade-marcador">
        <div>
          <span className="t-rojo arcade-titilar">1UP</span>
          <b>{puntaje6(yo?.mejor_historico)}</b>
        </div>
        <div className="text-center">
          <span className="t-rojo">HI-SCORE</span>
          <b>{puntaje6(record?.puntos)}</b>
        </div>
        <div className="text-right">
          <span className="t-cian">PUESTO</span>
          <b>{yo?.puesto ? `#${yo.puesto}` : "---"}</b>
        </div>
      </div>

      {/* DEMO + título */}
      <div className="mt-4 flex items-center gap-3 sm:gap-4">
        <DemoArcade className="w-[40%] max-w-[168px] shrink-0 self-start" />
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
          <div className="arcade-logo text-[clamp(14px,4.6vw,24px)]">SINIESTRO</div>
          <div className="arcade-logo arcade-logo--cero text-[clamp(28px,9vw,44px)]">CERO</div>
          <div className="f-crt t-suave mt-1 text-[18px]">Esquivá · sumá · no choques</div>
          <div className="f-pixel t-amarillo arcade-titilar mt-2 text-[10px]">PRESS START</div>
          <div className="f-pixel t-tenue text-[7px]">FREE PLAY · 1 JUGADOR</div>
        </div>
      </div>

      {/* ¿Quién juega? → el responsable, según la oficina */}
      {grupos.length > 0 && (
        <div key={aviso} className={`mt-6${aviso ? " arcade-sacudir" : ""}`} data-testid="juego-quien">
          <div className="f-pixel t-cian mb-3 flex items-center gap-2 text-[11px]">
            <Pixel sprite="flechaDer" tam={2} /> ELEGI TU JUGADOR
          </div>

          {variasOficinas && (
            <>
              <div className="f-pixel t-tenue mb-2 text-[8px]">1. OFICINA</div>
              <div className="mb-4 flex flex-wrap gap-2">
                {grupos.map((g) => (
                  <button
                    key={g.oficina_id}
                    type="button"
                    onClick={() => onOficina(g.oficina_id)}
                    aria-pressed={oficinaVista === g.oficina_id}
                    className="arcade-chip"
                  >
                    {g.oficina}
                  </button>
                ))}
              </div>
              <div className="f-pixel t-tenue mb-2 text-[8px]">2. JUGADOR</div>
            </>
          )}
          {!variasOficinas && grupo && (
            <div className="f-crt t-suave mb-2 text-[18px]">Responsables de {grupo.oficina}</div>
          )}

          {responsables.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {responsables.map((r) => {
                const activo = jugador === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onElegir(r.id)}
                    aria-pressed={activo}
                    className="arcade-carta"
                  >
                    {activo && (
                      <span className="arcade-carta__p1" aria-hidden="true">
                        P1
                      </span>
                    )}
                    <span className="arcade-carta__bicho flex">
                      <AvatarPixel semilla={`e${r.id}`} tam={4} />
                    </span>
                    <span className="arcade-carta__nombre">{r.nombre}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="f-crt t-suave text-[18px]">
              {variasOficinas ? "Esta oficina" : "Tu oficina"} no tiene responsables cargados
              {hayAlguien ? "." : " (se cargan en Configuración → Responsables). El puntaje queda a nombre de la cuenta."}
            </p>
          )}

          {elegido ? (
            <p className="f-crt t-suave mt-3 text-[19px]" data-testid="juego-elegido">
              <span className="arcade-tag">P1</span> Juega <strong className="t-cian font-normal">{elegido.nombre}</strong> · {elegido.oficina}
            </p>
          ) : faltaElegir ? (
            <p className={`f-crt mt-3 text-[19px] ${aviso ? "t-rojo" : "t-suave"}`}>
              {aviso ? "¡Elegí tu jugador para arrancar!" : "Tocá quién juega: así el puntaje queda a su nombre."}
            </p>
          ) : null}
        </div>
      )}

      {/* START */}
      <div className="arcade-brillo mt-6">
        <button
          type="button"
          onClick={onJugar}
          disabled={cargando}
          className="arcade-btn h-14 w-full text-[13px]"
          data-testid="juego-jugar"
        >
          <Pixel sprite="play" tam={2} /> Start
        </button>
      </div>
      <div className="f-crt t-tenue mt-2 hidden text-center text-[17px] lg:block">
        o apretá ENTER · ← → cambian de jugador
      </div>

      {/* Cómo se juega */}
      <div className="arcade-separador mt-6 pt-4">
        <div className="f-pixel t-magenta mb-3 text-[9px]">COMO SE JUEGA</div>
        <div className="f-crt t-suave mb-4 hidden flex-wrap items-center gap-2 text-[18px] lg:flex">
          <span className="arcade-tecla"><Pixel sprite="flechaIzq" tam={2} /></span>
          <span className="arcade-tecla"><Pixel sprite="flechaDer" tam={2} /></span>
          <span>mover</span>
          <span className="arcade-tecla ml-3">P</span>
          <span>pausa</span>
        </div>
        <p className="f-crt t-suave mb-4 text-[18px] lg:hidden">
          Mantené apretados los botones redondos de abajo (o tocá los costados de la ruta).
        </p>
        <ul className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          {REGLAS.map((r) => (
            <li key={r.titulo} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex w-[18px] shrink-0 justify-center">
                <Pixel sprite={r.sprite} tam={2} />
              </span>
              <div className="min-w-0">
                <div className="f-pixel t-amarillo text-[8px] uppercase">{r.titulo}</div>
                <div className="f-crt t-suave text-[17px]">{r.texto}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── 3) GAME OVER ───────────────────────────────────────────────────────
function Resultado({ final, onOtra, onReintentar, onCambiar, hayChips, nombre, ocupado }) {
  const { resultado: r, guardando, error, respuesta } = final;
  const reducir = useReducedMotion();
  const [chiste] = useState(() => CHISTES_MARIANO[Math.floor(Math.random() * CHISTES_MARIANO.length)]);
  const cuenta = useCuentaArriba(r.puntos, 1100);
  const rec = respuesta?.records || {};
  const km = (r.metros / 1000).toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const miRecord = respuesta?.tablero?.yo?.mejor_historico || 0;
  const faltaron = respuesta && !rec.personal && miRecord > r.puntos ? miRecord - r.puntos : 0;
  const festejo = rec.global
    ? "¡Record de toda la empresa!"
    : rec.oficina
      ? "¡Record de tu oficina!"
      : rec.personal
        ? "¡Nuevo record personal!"
        : "";

  // ⌨️ ENTER = jugar de nuevo · ESC = cambiar jugador / volver
  const accionesRef = useRef({});
  useEffect(() => {
    accionesRef.current = { onOtra, onCambiar, ocupado };
  });
  useEffect(() => {
    const alTeclear = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.repeat || esCampo(e.target)) return;
      const a = accionesRef.current;
      if (e.key === "Enter") {
        if (esControl(e.target)) return;
        e.preventDefault();
        if (!a.ocupado) a.onOtra();
      } else if (e.key === "Escape") {
        e.preventDefault();
        a.onCambiar();
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  return (
    <div className="arcade-marco arcade-marco--magenta px-4 pb-5 pt-7 text-center" data-testid="juego-resultado">
      {/* 🕹️ GAME OVER de fichín */}
      <MotionDiv
        initial={reducir ? false : { scale: 1.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 14 }}
        className="arcade-gameover text-[clamp(26px,8.4vw,36px)]"
        data-texto="GAME OVER"
        data-testid="juego-game-over"
      >
        GAME OVER
      </MotionDiv>
      <div className="f-pixel t-suave mt-3 text-[9px] uppercase">
        {r.siniestros || 3} siniestros · te dieron de baja
      </div>

      {/* ☎️ El chiste: te llama Mariano (en la pantallita de un celular viejo) */}
      <MotionDiv
        initial={reducir ? false : { y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.35 }}
        className="arcade-lcd-marco mx-auto mt-6 max-w-[360px]"
        data-testid="juego-mariano"
      >
        <div className="arcade-lcd">
          <div className="flex items-center gap-3">
            <span className="arcade-timbre flex shrink-0">
              <Pixel sprite="telefono" tam={3} />
            </span>
            <div className="min-w-0">
              <div className="arcade-lcd__titulo">
                Llamada entrante<span className="arcade-titilar">...</span>
              </div>
              <div className="arcade-lcd__nombre">MARIANO</div>
            </div>
          </div>
          <div className="arcade-lcd__msg mt-2">Mariano te va a llamar para pedir documentación</div>
          <div className="arcade-lcd__chiste mt-1">&gt; {chiste}</div>
        </div>
      </MotionDiv>

      {/* Puntaje */}
      {nombre && <div className="f-crt t-cian mt-6 text-[22px] uppercase">{nombre}</div>}
      <div className="f-pixel t-suave mt-2 text-[8px]">PUNTAJE</div>
      <div
        className="arcade-puntaje mt-1 text-[clamp(26px,8vw,34px)]"
        data-testid="juego-puntaje-final"
        data-listo={cuenta.listo ? "1" : "0"}
      >
        {puntaje6(cuenta.n)}
      </div>
      {festejo && (
        <div className="f-pixel arcade-arcoiris mt-3 flex items-center justify-center gap-2 text-[10px] uppercase" data-testid="juego-record">
          <Pixel sprite="trofeo" tam={2} /> {festejo}
        </div>
      )}

      {/* Resumen, como el "bonus" de fin de nivel */}
      <div className="arcade-tally mx-auto mt-6 max-w-[340px] text-left">
        {[
          ["autoRojo", "Distancia", `${km} km`],
          ["rayo", "¡Casi!", r.esquives],
          ["moneda", "Monedas", r.monedas],
          ["reloj", "Tiempo", tiempo(r.segundos)],
        ].map(([sprite, etiqueta, valor]) => (
          <div key={etiqueta} className="arcade-tally__fila">
            <span className="flex w-[16px] shrink-0 justify-center">
              <Pixel sprite={sprite} tam={2} />
            </span>
            <span>{etiqueta}</span>
            <span className="arcade-tally__puntos" />
            <span className="arcade-tally__valor">{valor}</span>
          </div>
        ))}
      </div>

      {/* Guardado y puesto */}
      <div className="f-crt mt-5 min-h-[24px] text-[20px]">
        {guardando ? (
          <span className="t-suave arcade-titilar">Guardando tu puntaje...</span>
        ) : error ? (
          <span className="t-rojo">
            {error}{" "}
            <button type="button" onClick={onReintentar} className="t-amarillo underline">
              Reintentar
            </button>
          </span>
        ) : respuesta?.puesto_semana ? (
          <span className="t-suave" data-testid="juego-puesto">
            Quedaste <strong className="t-amarillo font-normal">#{respuesta.puesto_semana}</strong> de{" "}
            {respuesta.total_semana} esta semana
            {faltaron > 0 && (
              <span className="block text-[17px]">
                Te faltaron {fmt(faltaron)} puntos para tu récord ({fmt(miRecord)}).
              </span>
            )}
          </span>
        ) : null}
      </div>

      {/* ¿Otra ficha? */}
      <div className="f-pixel t-amarillo arcade-titilar mt-6 text-[10px]">¿OTRA FICHA?</div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <div className="arcade-brillo flex-1">
          <button
            type="button"
            onClick={onOtra}
            disabled={ocupado}
            className="arcade-btn h-12 w-full"
            data-testid="juego-otra"
          >
            <Pixel sprite="play" tam={2} /> Jugar de nuevo
          </button>
        </div>
        <button type="button" onClick={onCambiar} className="arcade-btn arcade-btn--fantasma h-12 px-4 text-[9px]">
          {hayChips ? "Cambiar jugador" : "Volver"}
        </button>
      </div>
      <div className="f-crt t-tenue mt-2 hidden text-[17px] lg:block">
        ENTER = jugar de nuevo · ESC = {hayChips ? "cambiar jugador" : "volver"}
      </div>
    </div>
  );
}
