/* src/pages/JuegoPage.jsx
 *
 * 🎮 MINIJUEGO "SINIESTRO CERO" (se entra desde el menú: Recreo → Minijuego).
 *
 * Un auto que esquiva el tráfico, estilo Road Fighter de la Family.
 * Si chocás es un siniestro; con 3 siniestros "te dan de baja".
 *
 * Pantallas:
 *   1) Portada → eligís quién juega: el RESPONSABLE de la oficina (los mismos
 *      de Configuración → Responsables). El admin primero elige la oficina.
 *      Así el tablero muestra quién jugó y quién tiene más puntos.
 *   2) Jugando → el juego (components/juego/SiniestroCero.jsx).
 *   3) GAME OVER → "Mariano te va a llamar para pedir documentación" (el
 *      chiste de la llamada entrante), tus puntos, si rompiste un récord y
 *      tu puesto de la semana.
 *   Al costado (o abajo en el celu): el TABLERO GLOBAL de jugadores y oficinas.
 *
 * Backend:
 *   GET  ranking/juego/?rango=hoy|semana|siempre&jugador=<id>
 *   POST ranking/juego/partidas/
 *
 * El jugador elegido y el sonido se recuerdan en ese dispositivo.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { motion, useReducedMotion } from "framer-motion";
import {
  HiVolumeUp, HiVolumeOff, HiPlay, HiRefresh, HiUserGroup, HiSparkles, HiPhone, HiOfficeBuilding,
} from "react-icons/hi";
import { FaGamepad, FaCar } from "react-icons/fa";
import api from "../services/api";
import { UI } from "../components/tareas/tareasUI";
import SiniestroCero from "../components/juego/SiniestroCero";
import TableroJuego from "../components/juego/TableroJuego";

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

const REGLAS = [
  ["1 punto por metro", "cuanto más rápido vas, más suma"],
  ["¡CASI! +100", "pasá rozando un auto sin tocarlo (seguidos se multiplican)"],
  ["$ +250", "cada moneda de la ruta"],
  ["Cobertura total", "el escudo celeste: 5 segundos sin siniestros"],
  ["Autos amarillos", "ponen el guiño y se cruzan a tu carril"],
  ["3 siniestros", "te dan de baja: GAME OVER (y te llama Mariano)"],
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
  const [estado, setEstado] = useState("inicio"); // inicio | jugando | fin
  const [rango, setRango] = useState("semana");
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [jugador, setJugador] = useState(() => Number(leer(CLAVE_JUGADOR)) || null);
  const [sonido, setSonido] = useState(() => leer(CLAVE_SONIDO) === "1");
  const [partidaN, setPartidaN] = useState(0);
  const [final, setFinal] = useState(null); // { resultado, guardando, error, respuesta }
  const uidRef = useRef(null);
  const zonaRef = useRef(null);
  const pedidoRef = useRef(0); // para no pisar datos nuevos con una respuesta vieja

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
  // Qué oficina se ve en los chips: la que tocaste, la de quien juega, la tuya o la primera con gente.
  const oficinaVista =
    (grupos.some((g) => g.oficina_id === oficinaElegida) ? oficinaElegida : null) ||
    elegido?.oficina_id ||
    (grupos.some((g) => g.oficina_id === datos?.mi_oficina_id && g.responsables.length) ? datos.mi_oficina_id : null) ||
    grupos.find((g) => g.responsables.length)?.oficina_id ||
    grupos[0]?.oficina_id ||
    null;

  const cargar = useCallback(async (r, quien) => {
    const n = ++pedidoRef.current;
    setCargando(true);
    try {
      const params = { rango: r };
      if (quien) params.jugador = quien;
      const res = await api.get("ranking/juego/", { params });
      if (n === pedidoRef.current) setDatos(res.data);
    } catch {
      if (n === pedidoRef.current) toast.error("No se pudo cargar el tablero");
    } finally {
      if (n === pedidoRef.current) setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(rango, jugador); }, [cargar, rango, jugador]);

  const elegirJugador = (id) => {
    setJugador(id);
    guardar(CLAVE_JUGADOR, String(id));
  };

  // Admin: al cambiar de oficina, si el que estaba elegido es de otra, se des-elige.
  const elegirOficina = (id) => {
    setOficinaElegida(id);
    if (elegido && elegido.oficina_id !== id) {
      setJugador(null);
      guardar(CLAVE_JUGADOR, "");
    }
  };

  const alternarSonido = () => {
    setSonido((s) => {
      guardar(CLAVE_SONIDO, s ? "0" : "1");
      return !s;
    });
  };

  const jugar = () => {
    if (faltaElegir) {
      toast.error("Elegí quién juega");
      return;
    }
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
      if (rango === "semana" && res.data?.tablero) {
        pedidoRef.current += 1; // lo que viene del guardado es lo más nuevo
        setDatos(res.data.tablero);
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

  const yo = datos?.yo;
  // Tu récord (solo si los datos cargados son de quien va a jugar)
  const miRecord = yo && (yo.empleado_id || null) === (jugadorValido || null) ? yo.mejor_historico || 0 : 0;

  return (
    <div className={`${UI.screen} px-4 py-5`}>
      <div className="mx-auto max-w-5xl">
        {/* Encabezado */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className={`flex items-center gap-2 text-xl font-semibold ${UI.txtTitulo}`}>
              <FaGamepad className="text-marca" /> Siniestro Cero
            </h1>
            <p className={`text-[13px] ${UI.txtSuave}`}>Esquivá el tráfico. 3 siniestros y te dan de baja.</p>
          </div>
          <button
            type="button"
            onClick={alternarSonido}
            aria-pressed={sonido}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              sonido
                ? "border-marca bg-marca/10 text-marca"
                : "border-linea bg-card text-suave dark:border-linea-dark dark:bg-card-dark dark:text-suave-dark"
            }`}
          >
            {sonido ? <HiVolumeUp className="text-base" /> : <HiVolumeOff className="text-base" />}
            {sonido ? "Sonido" : "Sin sonido"}
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start">
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
                rango={rango}
                cargando={cargando}
                onJugar={jugar}
              />
            )}
          </section>

          <aside className={estado === "jugando" ? "hidden lg:block" : ""}>
            <TableroJuego datos={datos} rango={rango} onRango={setRango} cargando={cargando} />
            <button
              type="button"
              onClick={() => cargar(rango, jugadorValido)}
              className={`mx-auto mt-2 flex items-center gap-1.5 text-[12px] ${UI.txtSuave} hover:text-titulo dark:hover:text-titulo-dark`}
            >
              <HiRefresh className={cargando ? "animate-spin" : ""} /> Actualizar tablero
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── 1) Portada ──────────────────────────────────────────────────────────
function Portada({ grupos, oficinaVista, onOficina, elegido, jugador, onElegir, faltaElegir, yo, rango, cargando, onJugar }) {
  const variasOficinas = grupos.length > 1;
  const grupo = grupos.find((g) => g.oficina_id === oficinaVista) || null;
  const responsables = grupo?.responsables || [];
  const hayAlguien = grupos.some((g) => g.responsables.length);
  const chip = (activo) =>
    `rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
      activo
        ? "border-marca bg-marca text-white"
        : `border-linea bg-surface dark:border-linea-dark dark:bg-surface-dark ${UI.txtTitulo}`
    }`;

  return (
    <div className={`${UI.card} overflow-hidden`} data-testid="juego-portada">
      {/* Cartel "arcade" */}
      <div className="relative overflow-hidden bg-[#1e2430] px-5 py-6 text-center text-white">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-24 -translate-x-1/2 bg-[#535963]" />
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,#e5e7eb_0_10px,transparent_10px_20px)]" />
        <div className="relative">
          <div className="font-mono text-[26px] font-black leading-none tracking-wider text-[#facc15] drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]">
            SINIESTRO
          </div>
          <div className="font-mono text-[26px] font-black leading-none tracking-wider text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]">
            CERO
          </div>
          <FaCar className="mx-auto mt-3 text-[34px] text-[#dc1f26] drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]" />
          <div className="mt-2 font-mono text-[11px] tracking-widest text-white/80">ESQUIVÁ · SUMÁ · NO CHOQUES</div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* ¿Quién juega? → el responsable, según la oficina */}
        {grupos.length > 0 && (
          <div data-testid="juego-quien">
            <div className={`mb-2 flex items-center gap-1.5 ${UI.label}`}>
              <HiUserGroup /> ¿Quién juega?
            </div>

            {variasOficinas && (
              <>
                <div className={`mb-1.5 text-[11px] font-semibold uppercase tracking-wider ${UI.txtSuave}`}>1. Oficina</div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {grupos.map((g) => (
                    <button
                      key={g.oficina_id}
                      type="button"
                      onClick={() => onOficina(g.oficina_id)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                        oficinaVista === g.oficina_id
                          ? "border-duo-azul bg-duo-azul-soft text-duo-azul dark:bg-[var(--color-duo-azul-soft-dark)]"
                          : `border-linea bg-surface dark:border-linea-dark dark:bg-surface-dark ${UI.txtTitulo}`
                      }`}
                    >
                      <HiOfficeBuilding className="text-[14px]" /> {g.oficina}
                    </button>
                  ))}
                </div>
                <div className={`mb-1.5 text-[11px] font-semibold uppercase tracking-wider ${UI.txtSuave}`}>2. Responsable</div>
              </>
            )}
            {!variasOficinas && grupo && (
              <div className={`mb-1.5 text-[12px] ${UI.txtSuave}`}>Responsables de {grupo.oficina}</div>
            )}

            {responsables.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {responsables.map((r) => (
                  <button key={r.id} type="button" onClick={() => onElegir(r.id)} className={chip(jugador === r.id)}>
                    {r.nombre}
                  </button>
                ))}
              </div>
            ) : (
              <p className={`text-[12px] ${UI.txtSuave}`}>
                {variasOficinas ? "Esta oficina" : "Tu oficina"} no tiene responsables cargados
                {hayAlguien ? "." : " (se cargan en Configuración → Responsables). El puntaje queda a nombre de la cuenta."}
              </p>
            )}

            {elegido ? (
              <p className={`mt-2 text-[12px] ${UI.txtSuave}`} data-testid="juego-elegido">
                Juega <strong className={`font-semibold ${UI.txtTitulo}`}>{elegido.nombre}</strong> · {elegido.oficina}
              </p>
            ) : faltaElegir ? (
              <p className={`mt-2 text-[12px] ${UI.txtSuave}`}>Tocá quién juega: así el puntaje queda a su nombre.</p>
            ) : null}
          </div>
        )}

        {/* Cómo se juega */}
        <ul className="space-y-1.5">
          {REGLAS.map(([t, d]) => (
            <li key={t} className="flex gap-2 text-[13px] leading-snug">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-marca" />
              <span className={UI.txtSuave}>
                <strong className={`font-semibold ${UI.txtTitulo}`}>{t}</strong> — {d}
              </span>
            </li>
          ))}
        </ul>

        {yo && (yo.mejor_historico > 0 || yo.puesto) ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-surface p-2.5 dark:bg-surface-dark">
              <div className={`text-[11px] ${UI.txtSuave}`}>Tu mejor puntaje</div>
              <div className={`font-mono text-[17px] font-semibold ${UI.txtTitulo}`}>{fmt(yo.mejor_historico)}</div>
            </div>
            <div className="rounded-lg bg-surface p-2.5 dark:bg-surface-dark">
              <div className={`text-[11px] ${UI.txtSuave}`}>
                Tu puesto ({rango === "hoy" ? "hoy" : rango === "siempre" ? "siempre" : "semana"})
              </div>
              <div className={`font-mono text-[17px] font-semibold ${UI.txtTitulo}`}>{yo.puesto ? `#${yo.puesto}` : "—"}</div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onJugar}
          disabled={cargando}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg text-[15px] ${UI.btnPrimary}`}
          data-testid="juego-jugar"
        >
          <HiPlay className="text-lg" /> Jugar
        </button>
      </div>
    </div>
  );
}

// ── 3) Resultado ────────────────────────────────────────────────────────
function Resultado({ final, onOtra, onReintentar, onCambiar, hayChips, nombre, ocupado }) {
  const { resultado: r, guardando, error, respuesta } = final;
  const reducir = useReducedMotion();
  const [chiste] = useState(() => CHISTES_MARIANO[Math.floor(Math.random() * CHISTES_MARIANO.length)]);
  const rec = respuesta?.records || {};
  const km = (r.metros / 1000).toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const miRecord = respuesta?.tablero?.yo?.mejor_historico || 0;
  const faltaron = respuesta && !rec.personal && miRecord > r.puntos ? miRecord - r.puntos : 0;
  const festejo = rec.global
    ? "¡Récord de toda la empresa!"
    : rec.oficina
      ? "¡Récord de tu oficina!"
      : rec.personal
        ? "¡Tu mejor puntaje!"
        : "";

  return (
    <div className={`${UI.card} overflow-hidden`} data-testid="juego-resultado">
      <div className="bg-[#111827] px-5 pb-6 pt-5 text-center text-white">
        {/* 🕹️ GAME OVER de fichín */}
        <MotionDiv
          initial={reducir ? false : { scale: 1.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
          className="font-mono text-[38px] font-black leading-none tracking-[0.12em] text-[#ef4444] [text-shadow:3px_3px_0_#facc15]"
          data-testid="juego-game-over"
        >
          GAME OVER
        </MotionDiv>
        <div className="mt-2 text-[12px] text-white/70">
          {r.siniestros || 3} siniestros · te dieron de baja
        </div>

        {/* ☎️ El chiste: te llama Mariano */}
        <MotionDiv
          initial={reducir ? false : { y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          className="mx-auto mt-4 flex max-w-[340px] items-center gap-3 rounded-2xl bg-white/10 p-3 text-left ring-1 ring-white/15"
          data-testid="juego-mariano"
        >
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            {!reducir && <span className="absolute inset-0 animate-ping rounded-full bg-[#22c55e]/40" />}
            <MotionDiv
              animate={reducir ? undefined : { rotate: [0, -18, 18, -18, 18, -10, 10, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 0.7 }}
              className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#16a34a]"
            >
              <HiPhone className="text-[22px] text-white" />
            </MotionDiv>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#86efac]">Llamada entrante · Mariano</div>
            <div className="text-[14px] font-bold leading-snug text-[#facc15]">Mariano te va a llamar para pedir documentación</div>
            <div className="mt-0.5 text-[12px] leading-snug text-white/70">{chiste}</div>
          </div>
        </MotionDiv>

        {nombre && <div className="mt-4 text-[12px] text-white/70">{nombre}</div>}
        <div className="mt-1 font-mono text-[40px] font-black leading-none tabular-nums" data-testid="juego-puntaje-final">
          {fmt(r.puntos)}
        </div>
        <div className="text-[12px] text-white/70">puntos</div>
        {festejo && (
          <div className="mx-auto mt-3 inline-flex items-center gap-1 rounded-full bg-[#facc15] px-3 py-1 text-[12px] font-bold text-[#422006]" data-testid="juego-record">
            <HiSparkles className="text-[14px]" /> {festejo}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 p-4 text-center">
        {[
          [km, "km"],
          [r.esquives, "¡casi!"],
          [r.monedas, "monedas"],
          [tiempo(r.segundos), "tiempo"],
        ].map(([v, lbl]) => (
          <div key={lbl} className="rounded-lg bg-surface py-2 dark:bg-surface-dark">
            <div className={`font-mono text-[15px] font-semibold ${UI.txtTitulo}`}>{v}</div>
            <div className={`text-[11px] ${UI.txtSuave}`}>{lbl}</div>
          </div>
        ))}
      </div>

      <div className="px-4 text-center text-[13px]">
        {guardando ? (
          <span className={UI.txtSuave}>Guardando tu puntaje…</span>
        ) : error ? (
          <span className="text-marca">
            {error}{" "}
            <button type="button" onClick={onReintentar} className="font-semibold underline">
              Reintentar
            </button>
          </span>
        ) : respuesta?.puesto_semana ? (
          <span className={UI.txtSuave} data-testid="juego-puesto">
            Quedaste <strong className={`font-semibold ${UI.txtTitulo}`}>#{respuesta.puesto_semana}</strong> de{" "}
            {respuesta.total_semana} esta semana
            {faltaron > 0 && (
              <span className="block text-[12px]">Te faltaron {fmt(faltaron)} puntos para tu récord ({fmt(miRecord)}).</span>
            )}
          </span>
        ) : null}
      </div>

      <div className="flex gap-2 p-4">
        <button
          type="button"
          onClick={onOtra}
          disabled={ocupado}
          className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-lg text-[15px] ${UI.btnPrimary}`}
          data-testid="juego-otra"
        >
          <HiPlay className="text-lg" /> Jugar de nuevo
        </button>
        <button type="button" onClick={onCambiar} className={`h-12 rounded-lg px-4 text-[13px] ${UI.btnGhost}`}>
          {hayChips ? "Cambiar jugador" : "Volver"}
        </button>
      </div>
    </div>
  );
}
