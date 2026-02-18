// src/hooks/solicitudes/useCatalogos.js
import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/+$/, "");

// ← TU LISTA + NRE
const FALLBACK_COMPANIAS = [
  { id: "AGROSALTA", nombre: "Agrosalta" },
  { id: "ATM", nombre: "ATM" },
  { id: "DIGNA", nombre: "Digna" },
  { id: "EQUIDAD", nombre: "Equidad" },
  { id: "FEDERACION_PATRONAL", nombre: "Federacion Patronal" },
  { id: "PROVIDENCIA", nombre: "Providencia" },
  { id: "NRE", nombre: "NRE" },
];

const FALLBACK_COBERTURAS = [
  { id: "TERCEROS", nombre: "Responsabilidad Civil" },
  { id: "TERCEROS_COMPLETO", nombre: "Terceros completo" },
  { id: "TODO_RIESGO_FRANQ", nombre: "Todo riesgo con franquicia" },
  { id: "TODO_RIESGO_FULL", nombre: "Todo riesgo (full)" },
];

/* ===================== cache módulo (no Redux) ===================== */
const CACHE = {
  ts: 0,
  companias: FALLBACK_COMPANIAS,
  coberturas: FALLBACK_COBERTURAS,
};
const TTL_MS = 10 * 60 * 1000; // 10 min

function isFresh() {
  return Date.now() - (CACHE.ts || 0) < TTL_MS;
}

function normCompanias(data) {
  if (!Array.isArray(data)) return FALLBACK_COMPANIAS;
  return data
    .map((x) =>
      typeof x === "string"
        ? { id: x.toUpperCase().replace(/\s+/g, "_"), nombre: x }
        : x
    )
    .filter((x) => x && (x.id || x.nombre))
    .map((x) => ({
      id: String(x.id ?? x.nombre).toUpperCase().replace(/\s+/g, "_"),
      nombre: String(x.nombre ?? x.id),
    }));
}

function normCoberturas(data) {
  if (!Array.isArray(data)) return FALLBACK_COBERTURAS;
  return data
    .filter((x) => x && (x.id || x.nombre))
    .map((x) =>
      typeof x === "string"
        ? { id: x.toUpperCase().replace(/\s+/g, "_"), nombre: x }
        : {
            id: String(x.id ?? x.nombre).toUpperCase().replace(/\s+/g, "_"),
            nombre: String(x.nombre ?? x.id),
          }
    );
}

async function fetchCatalogos({ signal } = {}) {
  // 2 requests en paralelo
  const [rComp, rCob] = await Promise.all([
    fetch(`${API_BASE}/polizas/companias/`, { signal }),
    fetch(`${API_BASE}/polizas/coberturas/`, { signal }),
  ]);

  const comp = rComp.ok ? normCompanias(await rComp.json()) : FALLBACK_COMPANIAS;
  const cob = rCob.ok ? normCoberturas(await rCob.json()) : FALLBACK_COBERTURAS;

  CACHE.ts = Date.now();
  CACHE.companias = comp;
  CACHE.coberturas = cob;

  return { companias: comp, coberturas: cob };
}

/**
 * Uso:
 * const { companias, coberturas, ensureLoaded, status } = useCatalogos({ auto:false });
 * // cuando abrís el modal:
 * await ensureLoaded();
 */
export function useCatalogos({ auto = false } = {}) {
  const [companias, setCompanias] = useState(CACHE.companias);
  const [coberturas, setCoberturas] = useState(CACHE.coberturas);
  const [status, setStatus] = useState(isFresh() ? "ready" : "idle"); // idle|loading|ready|error

  const abortRef = useRef(null);
  const inFlightRef = useRef(false);

  const ensureLoaded = useCallback(async ({ force = false } = {}) => {
    if (!force && isFresh()) {
      setCompanias(CACHE.companias);
      setCoberturas(CACHE.coberturas);
      setStatus("ready");
      return { companias: CACHE.companias, coberturas: CACHE.coberturas };
    }
    if (inFlightRef.current) return { companias, coberturas };

    // abort request anterior si existiera
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    inFlightRef.current = true;
    setStatus("loading");

    try {
      const data = await fetchCatalogos({ signal: ac.signal });
      setCompanias(data.companias);
      setCoberturas(data.coberturas);
      setStatus("ready");
      return data;
    } catch (e) {
      // AbortError => silencio
      if (e?.name === "AbortError") return { companias, coberturas };
      setCompanias(FALLBACK_COMPANIAS);
      setCoberturas(FALLBACK_COBERTURAS);
      setStatus("error");
      return { companias: FALLBACK_COMPANIAS, coberturas: FALLBACK_COBERTURAS };
    } finally {
      inFlightRef.current = false;
    }
  }, [companias, coberturas]);

  useEffect(() => {
    if (!auto) return;
    ensureLoaded();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [auto, ensureLoaded]);

  return { companias, coberturas, status, ensureLoaded };
}
