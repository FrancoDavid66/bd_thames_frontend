// src/hooks/useSiniestrosCliente.js
import { useState, useEffect, useRef } from "react";
import api from "../services/api";

/**
 * Cache simple en memoria para no pedir 50 veces los mismos siniestros
 * mientras el usuario navega. Se invalida con `bust` o cuando refresca la página.
 */
const cache = new Map();

/**
 * Hook que devuelve los siniestros de un cliente.
 *
 * @param {number|string|null} clienteId  ID del cliente
 * @param {object} options
 * @param {number} options.bust   Cambialo (Date.now()) para forzar refetch
 *
 * @returns {{ siniestros, abiertos, total, loading, error, refetch }}
 *   - siniestros: array completo
 *   - abiertos:   array de siniestros con estado != 'CERRADO'
 *   - total:      siniestros.length
 *   - loading:    true mientras carga
 *   - error:      string|null
 *   - refetch:    función para volver a pedir
 */
export default function useSiniestrosCliente(clienteId, { bust } = {}) {
  const [siniestros, setSiniestros] = useState([]);
  // 🐛 FIX CRÍTICO: si hay clienteId, ARRANCAMOS en loading=true.
  // Si arrancáramos en false, el modal podría auto-confirmarse durante el
  // primer render antes de que el useEffect dispare el fetch.
  const [loading, setLoading] = useState(!!clienteId);
  const [error, setError] = useState(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const fetchData = async () => {
    if (!clienteId) {
      setSiniestros([]);
      setLoading(false);
      return;
    }

    const key = String(clienteId);

    // Cache hit (si no es bust)
    if (!bust && cache.has(key)) {
      setSiniestros(cache.get(key));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`clientes/${clienteId}/siniestros/`);
      const lista = Array.isArray(data) ? data : (data?.results || []);
      cache.set(key, lista);
      if (aliveRef.current) {
        setSiniestros(lista);
      }
    } catch (err) {
      if (aliveRef.current) {
        setError(err?.response?.data?.detail || err?.message || "Error al cargar siniestros");
        setSiniestros([]);
      }
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    // 🐛 FIX: al cambiar de cliente, reseteamos el state local
    // para no mostrar siniestros del cliente anterior brevemente.
    if (clienteId) {
      setLoading(true);
    } else {
      setSiniestros([]);
      setLoading(false);
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId, bust]);

  const abiertos = siniestros.filter((s) => s.estado !== "CERRADO");

  return {
    siniestros,
    abiertos,
    total: siniestros.length,
    loading,
    error,
    refetch: fetchData,
  };
}

/** Limpia el cache (útil al crear/borrar un siniestro). */
export function invalidarCacheSiniestrosCliente(clienteId) {
  if (clienteId) cache.delete(String(clienteId));
  else cache.clear();
}