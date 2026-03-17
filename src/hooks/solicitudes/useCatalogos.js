// src/hooks/solicitudes/useCatalogos.js
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

// 🔐 Helper para inyectar el token de seguridad
const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("jwt");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/* ===================== cache módulo (no Redux) ===================== */
const CACHE = {
  ts: 0,
  companias: [],  // 🚀 Cero hardcodeo
  coberturas: [], // 🚀 Cero hardcodeo
};
const TTL_MS = 10 * 60 * 1000; // 10 min

function isFresh() {
  return Date.now() - (CACHE.ts || 0) < TTL_MS;
}

function normCompanias(data) {
  const arr = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
  return arr
    .map((x) =>
      typeof x === "string"
        ? { id: x.toUpperCase().replace(/\s+/g, "_"), nombre: x }
        : x
    )
    .filter((x) => x && (x.id || x.nombre))
    .map((x) => ({
      id: String(x.nombre ?? x.id),
      nombre: String(x.nombre ?? x.id),
    }));
}

function normCoberturas(data) {
  const arr = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
  return arr
    .filter((x) => x && (x.id || x.nombre))
    .map((x) =>
      typeof x === "string"
        ? { id: x.toUpperCase().replace(/\s+/g, "_"), nombre: x }
        : {
            id: String(x.nombre ?? x.id),
            nombre: String(x.nombre ?? x.id),
          }
    );
}

async function fetchCatalogos({ signal } = {}) {
  try {
    const [rComp, rCob] = await Promise.all([
      axios.get(`${API_BASE}/companias/`, { headers: getAuthHeaders(), signal }).catch(() => ({ data: [] })),
      axios.get(`${API_BASE}/coberturas/`, { headers: getAuthHeaders(), signal }).catch(() => ({ data: [] })),
    ]);

    const comp = normCompanias(rComp.data);
    const cob = normCoberturas(rCob.data);

    CACHE.ts = Date.now();
    CACHE.companias = comp;
    CACHE.coberturas = cob;

    return { companias: comp, coberturas: cob };
  } catch (error) {
    console.error("Error cargando catálogos:", error);
    return { companias: [], coberturas: [] };
  }
}

export function useCatalogos({ auto = false } = {}) {
  const [companias, setCompanias] = useState(CACHE.companias);
  const [coberturas, setCoberturas] = useState(CACHE.coberturas);
  const [status, setStatus] = useState(isFresh() ? "ready" : "idle"); 

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
      if (e?.name === "AbortError" || e?.name === "CanceledError") return { companias, coberturas };
      setCompanias([]);
      setCoberturas([]);
      setStatus("error");
      return { companias: [], coberturas: [] };
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