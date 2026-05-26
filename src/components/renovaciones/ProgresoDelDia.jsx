// src/components/renovaciones/ProgresoDelDia.jsx
//
// Barra de progreso del día con animación.
// Cuando llegás al 100% (gestionaste todas las pendientes) → mensaje + glow épico.

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiFire, HiSparkles, HiBadgeCheck, HiClock } from "react-icons/hi";

export default function ProgresoDelDia({
  hechasHoy = 0,
  pendientesTotales = 0,
  renovadasHoy = 0,
  verificadasHoy = 0,
  descartadasHoy = 0,
}) {
  // Meta del día = pendientes actuales + las que ya hiciste hoy.
  // Cuanto más hagas, no se sube la meta — se llena la barra.
  const meta = Math.max(1, pendientesTotales + hechasHoy);
  const pct = Math.min(100, Math.round((hechasHoy / meta) * 100));
  const completado = pendientesTotales === 0 && hechasHoy > 0;

  // 🎉 Trigger interno para animaciones especiales al alcanzar el 100%
  const yaCelebradoRef = useRef(false);
  const [celebracionFlash, setCelebracionFlash] = useState(false);
  useEffect(() => {
    if (completado && !yaCelebradoRef.current) {
      yaCelebradoRef.current = true;
      setCelebracionFlash(true);
      setTimeout(() => setCelebracionFlash(false), 1500);
    }
    if (!completado) yaCelebradoRef.current = false;
  }, [completado]);

  const mensaje = useMemo(() => {
    if (completado) return { text: "¡Día completo! 🏆", color: "text-amber-300" };
    if (hechasHoy === 0) return { text: "Empezá el día", color: "text-white/40" };
    if (pct >= 75) return { text: "¡Casi!", color: "text-emerald-300" };
    if (pct >= 50) return { text: "Vas muy bien", color: "text-sky-300" };
    if (pct >= 25) return { text: "Buen ritmo", color: "text-sky-300" };
    return { text: "En marcha", color: "text-white/60" };
  }, [completado, hechasHoy, pct]);

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900/40 px-4 py-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={completado ? "trophy" : "fire"}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {completado ? (
                <HiBadgeCheck className="text-2xl text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              ) : hechasHoy > 0 ? (
                <HiFire className="text-2xl text-orange-400" />
              ) : (
                <HiClock className="text-2xl text-white/40" />
              )}
            </motion.div>
          </AnimatePresence>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
              Progreso del día
            </div>
            <div className="flex items-baseline gap-1.5">
              <motion.span
                key={hechasHoy}
                initial={{ scale: 1.5, color: "#FBBF24" }}
                animate={{ scale: 1, color: "#ffffff" }}
                transition={{ duration: 0.4 }}
                className="text-xl font-extrabold tabular-nums"
              >
                {hechasHoy}
              </motion.span>
              <span className="text-sm text-white/40 tabular-nums">
                / {meta} gestionadas
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Breakdown chiquito */}
          {hechasHoy > 0 && !completado && (
            <div className="hidden sm:flex items-center gap-2 text-[10px]">
              {renovadasHoy > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-300">
                  <span className="font-bold tabular-nums">{renovadasHoy}</span>
                  <span className="text-white/40">renov</span>
                </span>
              )}
              {verificadasHoy > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <span className="font-bold tabular-nums">{verificadasHoy}</span>
                  <span className="text-white/40">seguim.</span>
                </span>
              )}
              {descartadasHoy > 0 && (
                <span className="inline-flex items-center gap-1 text-rose-300">
                  <span className="font-bold tabular-nums">{descartadasHoy}</span>
                  <span className="text-white/40">desc</span>
                </span>
              )}
            </div>
          )}

          <motion.div
            key={mensaje.text}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-xs font-bold ${mensaje.color} inline-flex items-center gap-1`}
          >
            {completado && <HiSparkles className="text-base animate-pulse" />}
            {mensaje.text}
          </motion.div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`absolute inset-y-0 left-0 rounded-full ${
            completado
              ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400"
              : pct >= 75
              ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
              : pct >= 50
              ? "bg-gradient-to-r from-sky-400 to-emerald-400"
              : "bg-gradient-to-r from-sky-500 to-sky-400"
          }`}
          style={{
            boxShadow: completado
              ? "0 0 16px rgba(251,191,36,0.6)"
              : pct > 0
              ? "0 0 8px rgba(56,189,248,0.4)"
              : "none",
          }}
        />

        {/* Animación shimmer cuando está completado */}
        {completado && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          />
        )}
      </div>

      {/* Detalle de pendientes restantes */}
      {!completado && pendientesTotales > 0 && (
        <div className="mt-1.5 text-[10px] text-white/40 text-right">
          Te quedan <span className="font-bold text-white/70">{pendientesTotales}</span>{" "}
          pendientes
        </div>
      )}
    </div>
  );
}