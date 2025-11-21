// src/components/gruas/CalculadoraKm.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import GruasAPI from "../../api/gruas";

// --- Utilidades Haversine (distancia en metros) ---
const R = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;
function haversineM(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Parseo "lat,lon" -> {lat, lon} o null
function parseLatLon(str) {
  if (!str || typeof str !== "string") return null;
  const parts = str.split(",");
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0].trim());
  const lon = parseFloat(parts[1].trim());
  if (!isFinite(lat) || !isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

// Extrae coords de textos/URLs típicas de Google Maps
function extractCoordsFromText(str) {
  if (!str) return null;

  // 1) Si ya es "lat,lon"
  const direct = parseLatLon(str);
  if (direct) return direct;

  // 2) Intentar como URL (maps.google.com, maps.app.goo.gl, etc.)
  try {
    const u = new URL(str.startsWith("http") ? str : `https://${str}`);
    const qp =
      u.searchParams.get("q") ||
      u.searchParams.get("query") ||
      u.searchParams.get("ll");
    if (qp) {
      const m = qp.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
      if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
    }
  } catch {
    // seguir
  }

  // 3) Patrón @lat,lon
  let m = str.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:[,/]|$)/);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };

  // 4) Patrones !3dLAT!4dLON y !2dLON!3dLAT
  m = str.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
  m = str.match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/);
  if (m) return { lat: parseFloat(m[2]), lon: parseFloat(m[1]) };

  return null;
}

export default function CalculadoraKm({ compact = false }) {
  // Origen/Destino aceptan dirección, "lat,lon" o URL
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");

  // Campos numéricos como string para permitir vacío/placeholder
  const [kmBase, setKmBase] = useState("");          // ahora escribe el autodetectado
  const [kmBaseEdited, setKmBaseEdited] = useState(false); // no pisar si el usuario edita
  const [kmIncluidos, setKmIncluidos] = useState("");
  const [costoExtra, setCostoExtra] = useState("");

  const [res, setRes] = useState(null);
  const [hintO, setHintO] = useState("");
  const [hintD, setHintD] = useState("");
  const [gpsBusy, setGpsBusy] = useState(false);

  // detectar coords válidas para cálculo local
  const coords = useMemo(() => {
    const o = parseLatLon(origen);
    const d = parseLatLon(destino);
    return { o, d };
  }, [origen, destino]);

  // cálculo por Haversine si hay coords: B↔C ida y vuelta
  const localKm = useMemo(() => {
    const { o, d } = coords;
    if (!o || !d) return null;
    const dBC = haversineM(o.lat, o.lon, d.lat, d.lon);
    return Math.round((dBC * 2) / 1000);
  }, [coords]);

  // 👉 Si hay autodetección y el usuario NO editó, escribir el valor en el input
  useEffect(() => {
    if (localKm !== null && !kmBaseEdited) {
      setKmBase(String(localKm));
    }
  }, [localKm, kmBaseEdited]);

  useEffect(() => {
    setRes(null);
  }, [origen, destino, kmBase, kmIncluidos, costoExtra]);

  // Handlers con parseo inteligente de URL
  function handleOrigenChange(val) {
    const found = extractCoordsFromText(val);
    if (found) {
      const formatted = `${found.lat.toFixed(6)},${found.lon.toFixed(6)}`;
      setOrigen(formatted);
      setHintO("Detecté coordenadas desde la URL");
      return;
    }
    setOrigen(val);
    setHintO("");
  }

  function handleDestinoChange(val) {
    const found = extractCoordsFromText(val);
    if (found) {
      const formatted = `${found.lat.toFixed(6)},${found.lon.toFixed(6)}`;
      setDestino(formatted);
      setHintD("Detecté coordenadas desde la URL");
      return;
    }
    setDestino(val);
    setHintD("");
  }

  async function usarMiUbicacion() {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lon = pos.coords.longitude.toFixed(6);
        setOrigen(`${lat},${lon}`);
        setGpsBusy(false);
      },
      () => {
        alert("No se pudo obtener tu ubicación.");
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function calcular() {
    // Convertir strings -> números (vacío => 0)
    const kmBaseNum = Number(kmBase) || 0;
    const kmIncluidosNum = Number(kmIncluidos) || 0;
    const costoExtraNum = Number(costoExtra) || 0;

    // preferimos: backend → haversine → manual
    const kmPropuesto = (localKm ?? kmBaseNum);

    try {
      const r = await GruasAPI.calcularKm?.({
        origen,
        destino,
        km_base: kmPropuesto,
        km_incluidos: kmIncluidosNum,
        costo_km_adicional: costoExtraNum,
      });

      if (r && r.km_ida_vuelta !== undefined) {
        setRes({
          km_ida_vuelta: Number(r.km_ida_vuelta) || 0,
          km_extra: Math.max(0, Number(r.km_extra) || 0),
          costo_extra: Math.max(0, Number(r.costo_extra) || 0),
        });
        return;
      }
    } catch {
      // sigue fallback
    }

    const km = kmPropuesto;
    const km_extra = Math.max(0, km - kmIncluidosNum);
    const costo_extra = km_extra * costoExtraNum;
    setRes({ km_ida_vuelta: km, km_extra, costo_extra });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`grid grid-cols-1 ${compact ? "md:grid-cols-3" : "md:grid-cols-5"} gap-3`}
    >
      {/* Origen */}
      <label className="text-sm">
        Origen
        <div className="mt-1 flex gap-2">
          <input
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
            placeholder='Dirección, "lat,lon" o URL de Google Maps'
            value={origen}
            onChange={(e) => handleOrigenChange(e.target.value)}
          />
          <button
            type="button"
            onClick={usarMiUbicacion}
            className="px-3 py-2 bg-primary-400 hover:bg-primary-300 text-slate-900 rounded font-semibold disabled:opacity-60"
            disabled={gpsBusy}
            title="Usar mi ubicación"
          >
            {gpsBusy ? "…" : "GPS"}
          </button>
        </div>
        {hintO && <div className="text-[11px] text-emerald-300 mt-1">{hintO}</div>}
      </label>

      {/* Destino */}
      <label className="text-sm">
        Destino
        <input
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 mt-1"
          placeholder='Dirección, "lat,lon" o URL de Google Maps'
          value={destino}
          onChange={(e) => handleDestinoChange(e.target.value)}
        />
        {hintD && <div className="text-[11px] text-emerald-300 mt-1">{hintD}</div>}
      </label>

      {/* KM ida+vuelta (si hay autodetección, el valor aparece en el input) */}
      <label className="text-sm">
        KM ida+vuelta (estimado)
        <input
          type="number"
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 mt-1"
          value={kmBase}
          placeholder="Ej: 120"
          onChange={(e) => { setKmBase(e.target.value); setKmBaseEdited(true); }}
        />
      </label>

      {/* Plan (placeholders, sin valores por defecto) */}
      {!compact && (
        <>
          <label className="text-sm">
            KM incluidos según plan
            <input
              type="number"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 mt-1"
              value={kmIncluidos}
              placeholder="Ej: 100"
              onChange={(e) => setKmIncluidos(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Costo por km extra
            <input
              type="number"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 mt-1"
              value={costoExtra}
              placeholder="Ej: 800"
              onChange={(e) => setCostoExtra(e.target.value)}
            />
          </label>
        </>
      )}

      {/* Botón Calcular */}
      <div className={`${compact ? "md:col-span-3" : "md:col-span-5"} flex items-end justify-end`}>
        <button
          onClick={calcular}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold"
        >
          Calcular
        </button>
      </div>

      {/* Resultado */}
      {res && (
        <div className={`${compact ? "md:col-span-3" : "md:col-span-5"} grid grid-cols-1 md:grid-cols-3 gap-3`}>
          <div className="bg-gray-800 rounded p-3 shadow">
            <div className="text-gray-300 text-xs">KM ida+vuelta</div>
            <div className="text-2xl font-bold">{res.km_ida_vuelta}</div>
          </div>
          <div className="bg-gray-800 rounded p-3 shadow">
            <div className="text-gray-300 text-xs">KM extra</div>
            <div className="text-2xl font-bold">{res.km_extra}</div>
          </div>
          <div className="bg-gray-800 rounded p-3 shadow">
            <div className="text-gray-300 text-xs">Costo extra</div>
            <div className="text-2xl font-bold">$ {Number(res.costo_extra || 0).toFixed(2)}</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
