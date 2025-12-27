// src/pages/MarketingPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FaBullhorn, FaDownload, FaPaperPlane, FaPlus, FaSyncAlt } from "react-icons/fa";

import { MarketingAPI } from "../api/marketing";

// Si lo tenés (por consistencia visual), lo usamos; si no existe, comentá estas 2 líneas y reemplazá AnimatedCard por <div>.
import AnimatedCard from "../components/estadisticas/AnimatedCard";

const ORDER_OFI = ["", "1", "2", "3"];

const oficinaLabel = (v) => {
  const s = String(v || "").trim();
  if (s === "1") return "5 esquinas (1)";
  if (s === "2") return "axion (2)";
  if (s === "3") return "kilometro 39 (3)";
  return "Todas";
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
};

export default function MarketingPage() {
  const [oficina, setOficina] = useState("1");
  const [anioDesde, setAnioDesde] = useState("");
  const [anioHasta, setAnioHasta] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [soloActivas, setSoloActivas] = useState(true);

  const [loadingAud, setLoadingAud] = useState(false);
  const [audiencia, setAudiencia] = useState(null);
  const [audErr, setAudErr] = useState("");

  const [loadingCamp, setLoadingCamp] = useState(false);
  const [campanas, setCampanas] = useState([]);
  const [campErr, setCampErr] = useState("");

  const [nombre, setNombre] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [limitEnvio, setLimitEnvio] = useState(""); // modo prueba
  const [sending, setSending] = useState(false);
  const [sendInfo, setSendInfo] = useState(null);

  const filtros = useMemo(
    () => ({
      oficina,
      anio_desde: anioDesde,
      anio_hasta: anioHasta,
      marca,
      modelo,
      solo_activas: soloActivas ? "1" : "0",
    }),
    [oficina, anioDesde, anioHasta, marca, modelo, soloActivas]
  );

  const loadAudiencia = useCallback(async () => {
    setAudErr("");
    setSendInfo(null);
    setLoadingAud(true);
    try {
      const data = await MarketingAPI.audienciaResumen(filtros);
      setAudiencia(data);
    } catch (e) {
      setAudiencia(null);
      setAudErr(e?.message || "Error al cargar audiencia");
    } finally {
      setLoadingAud(false);
    }
  }, [filtros]);

  const loadCampanas = useCallback(async () => {
    setCampErr("");
    setLoadingCamp(true);
    try {
      const data = await MarketingAPI.listarCampanas();
      // DRF paginado: { results: [] } o lista directa
      const items = Array.isArray(data) ? data : data?.results || [];
      setCampanas(items);
    } catch (e) {
      setCampanas([]);
      setCampErr(e?.message || "Error al cargar campañas");
    } finally {
      setLoadingCamp(false);
    }
  }, []);

  useEffect(() => {
    loadAudiencia();
    loadCampanas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onExport = async (formato) => {
    try {
      const blob = await MarketingAPI.audienciaExport(filtros, formato);
      const name = `audiencia_${oficinaLabel(oficina).replaceAll(" ", "_")}.${formato}`;
      downloadBlob(blob, name);
    } catch (e) {
      setAudErr(e?.message || "Error al exportar");
    }
  };

  const onCrearCampana = async () => {
    setSendInfo(null);
    setCampErr("");
    const n = String(nombre || "").trim();
    const m = String(mensaje || "").trim();
    if (!n || !m) {
      setCampErr("Completá nombre y mensaje.");
      return;
    }
    try {
      const payload = {
        nombre: n,
        mensaje: m,
        filtros,
        oficina,
      };
      await MarketingAPI.crearCampana(payload);
      setNombre("");
      // el mensaje normalmente lo dejás para re-usar, pero si querés limpiarlo:
      // setMensaje("");
      await loadCampanas();
    } catch (e) {
      setCampErr(e?.message || "No se pudo crear la campaña");
    }
  };

  const onEnviarCampana = async (camp) => {
    if (!camp?.id) return;
    setAudErr("");
    setCampErr("");
    setSendInfo(null);
    setSending(true);
    try {
      const lim = String(limitEnvio || "").trim();
      const payload = {
        oficina,
        filtros,
        ...(lim ? { limit: Number(lim) || 0 } : {}),
      };
      const data = await MarketingAPI.enviarCampana(camp.id, payload);
      setSendInfo(data);
      await loadCampanas();
    } catch (e) {
      setCampErr(e?.message || "No se pudo enviar");
    } finally {
      setSending(false);
    }
  };

  const Card = AnimatedCard || (({ children, className = "" }) => (
    <div className={`rounded-2xl ring-1 ring-white/10 bg-white/5 dark:bg-white/5 p-4 ${className}`}>{children}</div>
  ));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center gap-3"
      >
        <div className="h-10 w-10 rounded-xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center">
          <FaBullhorn />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold tracking-tight">Campañas</h2>
          <p className="text-sm text-slate-300">
            Filtrá asegurados, previsualizá audiencia, exportá y enviá promos por WhatsApp.
          </p>
        </div>

        <button
          onClick={() => {
            loadAudiencia();
            loadCampanas();
          }}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/10 text-sm font-semibold"
          title="Refrescar"
        >
          <FaSyncAlt className={loadingAud || loadingCamp ? "animate-spin" : ""} />
          Refrescar
        </button>
      </motion.div>

      {/* Filtros */}
      <Card index={1} glow="from-emerald-500/40 via-cyan-500/25 to-transparent" interactive={false}>
        <div className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">Oficina</label>
            <select
              value={oficina}
              onChange={(e) => setOficina(e.target.value)}
              className="w-full h-11 rounded-xl bg-white/10 ring-1 ring-white/10 px-3 outline-none focus:ring-2 focus:ring-yellow-400"
            >
              {ORDER_OFI.map((v) => (
                <option key={v || "ALL"} value={v} className="text-black">
                  {oficinaLabel(v)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Año desde</label>
            <input
              value={anioDesde}
              onChange={(e) => setAnioDesde(e.target.value)}
              placeholder="2010"
              className="w-full h-11 rounded-xl bg-white/10 ring-1 ring-white/10 px-3 outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Año hasta</label>
            <input
              value={anioHasta}
              onChange={(e) => setAnioHasta(e.target.value)}
              placeholder="2015"
              className="w-full h-11 rounded-xl bg-white/10 ring-1 ring-white/10 px-3 outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Marca</label>
            <input
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="Renault"
              className="w-full h-11 rounded-xl bg-white/10 ring-1 ring-white/10 px-3 outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Modelo</label>
            <input
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="Kwid / Sandero / ..."
              className="w-full h-11 rounded-xl bg-white/10 ring-1 ring-white/10 px-3 outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div className="md:col-span-6 flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={loadAudiencia}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-yellow-400 text-gray-900 font-extrabold hover:brightness-95"
            >
              <FaSyncAlt className={loadingAud ? "animate-spin" : ""} />
              Previsualizar
            </button>

            <button
              onClick={() => onExport("csv")}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/10 text-sm font-semibold"
            >
              <FaDownload /> CSV
            </button>

            <button
              onClick={() => onExport("xlsx")}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/10 text-sm font-semibold"
            >
              <FaDownload /> XLSX
            </button>

            <label className="ml-auto inline-flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={soloActivas}
                onChange={(e) => setSoloActivas(e.target.checked)}
              />
              Solo activas
            </label>
          </div>

          {(audErr || campErr) && (
            <div className="md:col-span-6 rounded-xl bg-rose-500/10 ring-1 ring-rose-400/30 p-3 text-sm text-rose-200">
              {audErr || campErr}
            </div>
          )}
        </div>
      </Card>

      {/* Resumen audiencia */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card index={2} glow="from-sky-500/50 via-cyan-500/20 to-transparent" interactive={false}>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Pólizas (match)
          </div>
          <div className="mt-2 text-3xl font-extrabold">
            {loadingAud ? "…" : (audiencia?.count_polizas_match ?? 0)}
          </div>
          <div className="mt-1 text-sm text-slate-300">
            Oficina: <span className="font-semibold text-slate-100">{oficinaLabel(oficina)}</span>
          </div>
        </Card>

        <Card index={3} glow="from-emerald-500/50 via-emerald-500/15 to-transparent" interactive={false}>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Teléfonos válidos (dedupe)
          </div>
          <div className="mt-2 text-3xl font-extrabold">
            {loadingAud ? "…" : (audiencia?.telefonos_validos ?? 0)}
          </div>
          <div className="mt-1 text-sm text-slate-300">
            Tip: usá “Límite” para pruebas antes de enviar masivo.
          </div>
        </Card>

        <Card index={4} glow="from-yellow-500/50 via-yellow-500/10 to-transparent" interactive={false}>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Prueba (limit)
          </div>
          <input
            value={limitEnvio}
            onChange={(e) => setLimitEnvio(e.target.value)}
            placeholder="Ej: 5"
            className="mt-2 w-full h-11 rounded-xl bg-white/10 ring-1 ring-white/10 px-3 outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <div className="mt-2 text-xs text-slate-300">
            Si lo dejás vacío, envía a todos los teléfonos dedupe.
          </div>
        </Card>
      </div>

      {/* Sample */}
      <Card index={5} glow="from-slate-500/30 via-slate-500/10 to-transparent" interactive={false}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-extrabold">Muestra (sample)</div>
            <div className="text-xs text-slate-300">Hasta 20 teléfonos dedupe</div>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-300">
              <tr className="border-b border-white/10">
                <th className="py-2 text-left">Cliente</th>
                <th className="py-2 text-left">Número</th>
                <th className="py-2 text-left">Vehículo</th>
              </tr>
            </thead>
            <tbody className="text-slate-100">
              {(audiencia?.sample || []).map((r, idx) => (
                <tr key={`${r.numero}-${idx}`} className="border-b border-white/5">
                  <td className="py-2">{r.cliente_nombre || "-"}</td>
                  <td className="py-2 font-mono text-xs">{r.numero || "-"}</td>
                  <td className="py-2">{r.vehiculo || "-"}</td>
                </tr>
              ))}
              {!loadingAud && (!audiencia?.sample || audiencia.sample.length === 0) && (
                <tr>
                  <td className="py-4 text-slate-400" colSpan={3}>
                    Sin resultados para estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Crear campaña + listado */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card index={6} glow="from-rose-500/40 via-rose-500/15 to-transparent" interactive={false}>
          <div className="text-sm font-extrabold">Crear campaña</div>
          <div className="mt-3 grid gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Promo Enero - Renault 2010-2015"
                className="w-full h-11 rounded-xl bg-white/10 ring-1 ring-white/10 px-3 outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mensaje (WhatsApp)</label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={5}
                placeholder="Hola! Tenemos una promo para tu seguro..."
                className="w-full rounded-xl bg-white/10 ring-1 ring-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <button
              onClick={onCrearCampana}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/10 font-semibold"
            >
              <FaPlus />
              Guardar campaña
            </button>
          </div>
        </Card>

        <Card index={7} glow="from-indigo-500/40 via-indigo-500/15 to-transparent" interactive={false}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-extrabold">Campañas recientes</div>
              <div className="text-xs text-slate-300">Creá y luego enviá con los filtros actuales</div>
            </div>
            <button
              onClick={loadCampanas}
              className="inline-flex items-center gap-2 h-10 px-3 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/10 text-sm font-semibold"
              title="Refrescar campañas"
            >
              <FaSyncAlt className={loadingCamp ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {campanas.map((c) => {
              const enviada = Boolean(c?.enviada_at);
              return (
                <div
                  key={c.id}
                  className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-bold truncate">{c.nombre}</div>
                    <div className="text-xs text-slate-300">
                      {enviada ? `Enviada: ${String(c.enviada_at)}` : "Pendiente de envío"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400 line-clamp-2">
                      {c.mensaje}
                    </div>
                  </div>

                  <button
                    disabled={sending}
                    onClick={() => onEnviarCampana(c)}
                    className={`shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-xl font-extrabold ${
                      sending
                        ? "bg-white/10 ring-1 ring-white/10 text-slate-300 cursor-not-allowed"
                        : "bg-yellow-400 text-gray-900 hover:brightness-95"
                    }`}
                    title="Enviar usando filtros actuales"
                  >
                    <FaPaperPlane />
                    Enviar
                  </button>
                </div>
              );
            })}

            {!loadingCamp && campanas.length === 0 && (
              <div className="text-sm text-slate-400">Todavía no hay campañas.</div>
            )}
          </div>

          {sendInfo && (
            <div className="mt-3 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-400/25 p-3 text-sm text-emerald-100">
              <div className="font-extrabold">Envío OK</div>
              <div className="mt-1 text-xs text-emerald-200">
                Dedupe: {sendInfo?.numeros_dedupe ?? 0} · Enviados: {sendInfo?.enviados ?? 0} · Errores: {sendInfo?.errores ?? 0}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
