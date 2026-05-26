// src/hooks/useRenovacionesProgreso.js
//
// Tracking del progreso del día (gamificación).
// - Guarda en localStorage cuántas acciones se hicieron HOY
// - Se resetea automáticamente al cambiar el día
// - Cualquier acción cuenta: renovar / verificar / no renueva
//
// Uso:
//   const { hechasHoy, registrar, reset } = useRenovacionesProgreso();
//   <button onClick={() => registrar("renovar")}>Renovar</button>

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "renovaciones_progreso_dia";

function getTodayKey() {
  // YYYY-MM-DD en hora local
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.fecha !== getTodayKey()) {
      // Día distinto → arrancamos de cero
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage lleno o no disponible, lo ignoramos
  }
}

const INITIAL = {
  fecha: getTodayKey(),
  total: 0,
  renovadas: 0,
  verificadas: 0,
  descartadas: 0,
};

export function useRenovacionesProgreso() {
  const [state, setState] = useState(() => loadState() || INITIAL);

  // Si cambia el día mientras la pestaña está abierta → resetear
  useEffect(() => {
    const checkDay = () => {
      const today = getTodayKey();
      setState((s) => (s.fecha === today ? s : { ...INITIAL, fecha: today }));
    };
    // Chequea cada minuto si cambió el día (medianoche)
    const id = setInterval(checkDay, 60_000);
    return () => clearInterval(id);
  }, []);

  // Persistir en localStorage cada cambio
  useEffect(() => {
    saveState(state);
  }, [state]);

  /**
   * Registra una acción del día.
   * accion: "renovar" | "verificar" | "descartar"
   */
  const registrar = useCallback((accion) => {
    setState((s) => {
      const next = { ...s, fecha: getTodayKey(), total: s.total + 1 };
      if (accion === "renovar") next.renovadas = s.renovadas + 1;
      else if (accion === "verificar") next.verificadas = s.verificadas + 1;
      else if (accion === "descartar") next.descartadas = s.descartadas + 1;
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState({ ...INITIAL, fecha: getTodayKey() });
  }, []);

  return {
    fecha: state.fecha,
    hechasHoy: state.total,
    renovadasHoy: state.renovadas,
    verificadasHoy: state.verificadas,
    descartadasHoy: state.descartadas,
    registrar,
    reset,
  };
}