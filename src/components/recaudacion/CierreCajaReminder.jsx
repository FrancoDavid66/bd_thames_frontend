/* src/components/recaudacion/CierreCajaReminder.jsx
 *
 * Pop-up global que avisa a los cajeros cuándo cerrar caja.
 * Aparece "aviso_min" antes (default 30), con cuenta regresiva y sonido tipo caja.
 * Da tolerancia (default 5 min) después de la hora.
 * Se monta una vez (global, dentro del Router). Solo actúa si la oficina del
 * usuario tiene horarios cargados y todavía no cerró ese turno.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HiCash, HiX, HiClock } from "react-icons/hi";
import api from "../../services/api";

const RUTA_CIERRE = "/recaudacion"; // ajustá si tu ruta de cierre es otra
const NOMBRE_TURNO = { mediodia: "mediodía", noche: "noche" };

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
  const [aviso, setAviso] = useState(null); // {turno, hora:Date, limite:Date}
  const [now, setNow] = useState(Date.now());
  const descartados = useRef(new Set()); // "mediodia-2026-06-26"
  const sono = useRef(null); // turno con sonido ya emitido

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

  // Tick cada segundo
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Evaluar si hay que mostrar
  useEffect(() => {
    if (!cfg) { setAviso(null); return; }
    const hoyKey = new Date().toISOString().slice(0, 10);
    const cerrados = cfg.cerrados_hoy || [];
    const avisoMin = cfg.aviso_min ?? 30;
    const tolMin = cfg.tolerancia_min ?? 5;
    const ahora = new Date();

    for (const turno of ["mediodia", "noche"]) {
      const hora = hhmmToDate(cfg[turno]);
      if (!hora) continue;
      if (cerrados.includes(turno)) continue;
      if (descartados.current.has(`${turno}-${hoyKey}`)) continue;

      const inicio = new Date(hora.getTime() - avisoMin * 60000);
      const limite = new Date(hora.getTime() + tolMin * 60000);
      if (ahora >= inicio && ahora <= limite) {
        if (sono.current !== `${turno}-${hoyKey}`) {
          playKaching();
          sono.current = `${turno}-${hoyKey}`;
        }
        setAviso({ turno, hora, limite });
        return;
      }
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
    descartados.current.add(`${aviso.turno}-${hoyKey}`);
    setAviso(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`w-full max-w-sm overflow-hidden rounded-2xl border ${
            enTolerancia ? "border-rose-500/40" : "border-amber-500/40"
          } bg-slate-950`}
        >
          <div className={`flex items-center justify-between px-5 py-3 ${
            enTolerancia ? "bg-rose-500/15" : "bg-amber-500/15"
          }`}>
            <span className={`flex items-center gap-2 text-sm font-bold ${
              enTolerancia ? "text-rose-300" : "text-amber-300"
            }`}>
              <HiCash className="text-lg" /> Cierre de caja ({NOMBRE_TURNO[aviso.turno]})
            </span>
            <button onClick={descartar} className="rounded-lg p-1 text-slate-400 hover:bg-white/5">
              <HiX className="text-lg" />
            </button>
          </div>

          <div className="px-5 py-5 text-center">
            <p className="text-[13px] text-slate-400">
              {enTolerancia
                ? "¡Se cumplió la hora! Cerrá YA (tolerancia):"
                : `Tenés que cerrar la caja a las ${aviso.hora.getHours()}:${String(aviso.hora.getMinutes()).padStart(2, "0")}`}
            </p>

            <div className={`my-3 font-mono text-5xl font-black tabular-nums ${
              enTolerancia ? "text-rose-400" : "text-amber-400"
            }`}>
              {fmt(restante)}
            </div>

            <p className="flex items-center justify-center gap-1 text-[12px] text-slate-500">
              <HiClock /> {enTolerancia ? "Tiempo de tolerancia restante" : "Tiempo hasta el cierre"}
            </p>

            <button
              onClick={() => { navigate(RUTA_CIERRE); descartar(); }}
              className="mt-5 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500"
            >
              Ir a cerrar caja
            </button>
            <button
              onClick={descartar}
              className="mt-2 w-full rounded-xl py-2 text-[12px] text-slate-500 hover:text-slate-300"
            >
              Ahora no
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}