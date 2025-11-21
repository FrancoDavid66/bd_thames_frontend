import { useEffect, useState } from 'react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

// ← TU LISTA + NRE
const FALLBACK_COMPANIAS = [
  { id: 'AGROSALTA',            nombre: 'Agrosalta' },
  { id: 'ATM',                  nombre: 'ATM' },
  { id: 'DIGNA',                nombre: 'Digna' },
  { id: 'EQUIDAD',              nombre: 'Equidad' },
  { id: 'FEDERACION_PATRONAL',  nombre: 'Federacion Patronal' },
  { id: 'PROVIDENCIA',          nombre: 'Providencia' },
  { id: 'NRE',                  nombre: 'NRE' },           // ← NUEVO
];

const FALLBACK_COBERTURAS = [
  { id: 'TERCEROS',            nombre: 'Responsabilidad Civil' },
  { id: 'TERCEROS_COMPLETO',   nombre: 'Terceros completo' },
  { id: 'TODO_RIESGO_FRANQ',   nombre: 'Todo riesgo con franquicia' },
  { id: 'TODO_RIESGO_FULL',    nombre: 'Todo riesgo (full)' },
];

export function useCatalogos() {
  const [companias, setCompanias] = useState(FALLBACK_COMPANIAS);
  const [coberturas, setCoberturas] = useState(FALLBACK_COBERTURAS);

  useEffect(() => {
    (async () => {
      // Compañías
      try {
        const r = await fetch(`${API_BASE}/polizas/companias/`);
        if (r.ok) {
          const data = await r.json();
          // Normalizamos si el backend devuelve solo strings
          const norm = Array.isArray(data)
            ? data.map((x) =>
                typeof x === 'string' ? { id: x.toUpperCase().replace(/\s+/g, '_'), nombre: x } : x
              )
            : FALLBACK_COMPANIAS;
          setCompanias(norm);
        } else {
          setCompanias(FALLBACK_COMPANIAS);
        }
      } catch {
        setCompanias(FALLBACK_COMPANIAS);
      }

      // Coberturas
      try {
        const r = await fetch(`${API_BASE}/polizas/coberturas/`);
        setCoberturas(r.ok ? await r.json() : FALLBACK_COBERTURAS);
      } catch {
        setCoberturas(FALLBACK_COBERTURAS);
      }
    })();
  }, []);

  return { companias, coberturas };
}
