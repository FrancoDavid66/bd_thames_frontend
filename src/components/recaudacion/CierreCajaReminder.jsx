/* src/components/recaudacion/CierreCajaReminder.jsx  (diseño Duo)
 *
 * Pop-up global que avisa a los cajeros cuándo cerrar caja.
 * Aparece "aviso_min" antes (default 30), con cuenta regresiva y sonido tipo caja.
 * Da tolerancia (default 5 min) después de la hora.
 * Se monta una vez (global, dentro del Router). Solo actúa si la oficina del
 * usuario tiene un horario cargado y todavía no cerró hoy.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiCash, HiX, HiClock } from "react-icons/hi";
import api from "../../services/api";

const RUTA_CIERRE = "/recaudacion"; // ajustá si tu ruta de cierre es otra

function playKaching() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [[880, 0], [1320, 0.13]].forEach(([freq, t]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      const start = ctx.currentTime + t;
      g.gain.setValueAtTime(0.001, start);
      g.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
      o.start(start);
      o.stop(start + 0.45);
    });
  } catch { /* el navegador puede bloquear audio sin interacción previa */ }
}

const hhmmToDate = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

export default function CierreCajaReminder() {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState(null);
  const [aviso, setAviso] = useState(null); // {hora:Date, limite:Date}
  const [now, setNow] = useState(Date.now());
  const descartados = useRef(new Set()); // "2026-06-26"
  const sono = useRef(null); // fecha con sonido ya emitido

  // Cargar config de mi oficina (y refrescar cada 2 min para detectar si ya cerró)
  const cargar = async () => {
    try {
      const res = await api.get("recaudacion/mi-horario-cierre/");
      setCfg(res.data?.tiene ? res.data : null);
    } catch {
      setCfg(null);
    }
  };
  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 120000);
    return () => clearInterval(id);
  }, []);

  // Tick ADAPTATIVO: con aviso en pantalla latimos cada 1s (contador suave);
  // sin aviso (95% del tiempo) cada 30s (ahorra batería del celular del cajero).
  useEffect(() => {
    const periodo = aviso ? 1000 : 30000;
    const id = setInterval(() => setNow(Date.now()), periodo);
    return () => clearInterval(id);
  }, [aviso]);

  // Evaluar si hay que mostrar (un solo horario por oficina)
  useEffect(() => {
    if (!cfg) { setAviso(null); return; }
    const hoyKey = new Date().toISOString().slice(0, 10);
    const avisoMin = cfg.aviso_min ?? 30;
    const tolMin = cfg.tolerancia_min ?? 5;
    const ahora = new Date();

    const hora = hhmmToDate(cfg.hora_cierre);
    if (!hora) { setAviso(null); return; }
    if (cfg.cerro_hoy) { setAviso(null); return; }
    if (descartados.current.has(hoyKey)) { setAviso(null); return; }

    const inicio = new Date(hora.getTime() - avisoMin * 60000);
    const limite = new Date(hora.getTime() + tolMin * 60000);
    if (ahora >= inicio && ahora <= limite) {
      if (sono.current !== hoyKey) {
        playKaching();
        sono.current = hoyKey;
      }
      setAviso({ hora, limite });
      return;
    }
    setAviso(null);
  }, [cfg, now]);

  if (!aviso) return null;

  const enTolerancia = now >= aviso.hora.getTime();
  const restante = enTolerancia
    ? aviso.limite.getTime() - now
    : aviso.hora.getTime() - now;

  const descartar = () => {
    const hoyKey = new Date().toISOString().slice(0, 10);
    descartados.current.add(hoyKey);
    setAviso(null);
  };

  // Tokens de estado según urgencia (aviso previo = ámbar / tolerancia = rojo)
  const acento = enTolerancia ? "text-egreso dark:text-egreso-claro" : "text-tarjeta dark:text-tarjeta-claro";
  const borde = enTolerancia ? "border-egreso/50" : "border-tarjeta/50";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-sm rounded-3xl border-2 ${borde} bg-card dark:bg-card-dark p-6 text-center shadow-2xl`}
      >
        {/* Encabezado */}
        <div className="mb-5 flex items-center justify-between">
          <span className={`flex items-center gap-2 text-sm font-black ${acento}`}>
            <HiCash className="text-base" /> Cierre de caja
          </span>
          <button
            onClick={descartar}
            className="rounded-lg p-1.5 bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark transition-colors"
          >
            <HiX className="text-lg" />
          </button>
        </div>

        {/* Contexto */}
        <p className="text-[13px] font-bold text-suave dark:text-suave-dark">
          {enTolerancia
            ? "¡Se cumplió la hora! Cerrá YA (tolerancia):"
            : `Tenés que cerrar la caja a las ${aviso.hora.getHours()}:${String(aviso.hora.getMinutes()).padStart(2, "0")}`}
        </p>

        {/* Protagonista: countdown grande */}
        <div className={`my-4 font-mono text-6xl font-black tabular-nums ${acento}`}>
          {fmt(restante)}
        </div>

        <p className="flex items-center justify-center gap-1 text-[12px] font-bold text-suave dark:text-suave-dark">
          <HiClock /> {enTolerancia ? "Tiempo de tolerancia restante" : "Tiempo hasta el cierre"}
        </p>

        {/* Acciones */}
        <button
          onClick={() => { navigate(RUTA_CIERRE); descartar(); }}
          className="mt-6 w-full rounded-2xl bg-oficina py-3.5 text-sm font-black text-white shadow-[0_5px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 transition-all"
        >
          Ir a cerrar caja
        </button>
        <button
          onClick={descartar}
          className="mt-2 w-full rounded-xl py-2.5 text-[12px] font-bold text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark transition-colors"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
