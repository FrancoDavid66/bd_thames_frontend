// src/components/gruas/AdhesionCreateModal.jsx
import { useEffect, useMemo, useState } from "react";
import { HiSearch, HiCheckCircle, HiXCircle } from "react-icons/hi";
import Modal from "./modal/Modal";
import GruasAPI from "../../api/gruas";

const CARENCIA_DIAS = 15;

// Utils de fecha (nativas)
function toYMD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function parseYMD(s) {
  // s = "YYYY-MM-DD"
  const [y, m, d] = (s || "").split("-").map(Number);
  const dt = new Date(y || 0, (m || 1) - 1, d || 1);
  return isNaN(dt.getTime()) ? new Date() : dt;
}
function addDays(date, n) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + n);
  return d;
}
function diffDays(a, b) {
  // a - b en días (suponiendo YYYY-MM-DD sin horas)
  const ms = a.setHours(0, 0, 0, 0) - b.setHours(0, 0, 0, 0);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default function AdhesionCreateModal({ onClose }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [planes, setPlanes] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [poliza, setPoliza] = useState(null);
  const [planId, setPlanId] = useState("");
  const HOY = toYMD(new Date());
  const [fechaActivacion, setFechaActivacion] = useState(HOY);
  const [resumen, setResumen] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // carga planes
  useEffect(() => {
    let mounted = true;
    GruasAPI.getPlanes()
      .then(d => mounted && setPlanes(Array.isArray(d) ? d : []))
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  async function buscar() {
    if (!q?.trim()) { setResultados([]); setError(""); return; }
    setLoading(true); setError("");
    try {
      const data = await GruasAPI.searchPolizasElegibles(q || "", false);
      setResultados(Array.isArray(data) ? data : []);
    } catch (e) {
      setResultados([]); setError(e?.message || "Error en la búsqueda");
    } finally {
      setLoading(false);
    }
  }

  // al escoger póliza, cargar resumen
  useEffect(() => {
    if (!poliza) { setResumen(null); return; }
    let mounted = true;
    GruasAPI.getPolizaResumen(poliza.id)
      .then(d => { if (mounted) setResumen(d); })
      .catch(() => { if (mounted) setResumen(null); });
    return () => { mounted = false; };
  }, [poliza]);

  const fechaServicioActiva = useMemo(() => {
    const base = parseYMD(fechaActivacion);
    return toYMD(addDays(base, CARENCIA_DIAS));
  }, [fechaActivacion]);

  const diasRestantes = useMemo(() => {
    const hoy = new Date();
    const activa = parseYMD(fechaServicioActiva);
    const diff = diffDays(activa, hoy);
    return diff > 0 ? diff : 0;
  }, [fechaServicioActiva]);

  const fechaInvalida = useMemo(() => {
    const dSel = parseYMD(fechaActivacion);
    const dHoy = parseYMD(HOY);
    return dSel.setHours(0,0,0,0) < dHoy.setHours(0,0,0,0);
  }, [fechaActivacion, HOY]);

  const planSel = useMemo(
    () => planes.find(p => String(p.id) === String(planId)),
    [planId, planes]
  );

  async function confirmar() {
    if (!poliza || !planId || fechaInvalida) return;
    setSaving(true); setError("");
    try {
      await GruasAPI.activarAdhesion({
        poliza_id: poliza.id,
        plan_id: planId,
        fecha_activacion: fechaActivacion,
      });
      onClose?.();
    } catch (e) {
      setError(e?.message || "No se pudo activar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Activar adhesión de grúa"
      onClose={onClose}
      footer={
        <>
          <button
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold disabled:opacity-50"
            disabled={!poliza || !planId || saving || fechaInvalida}
            onClick={confirmar}
          >
            {saving ? "Guardando..." : "Activar"}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Buscador de pólizas */}
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Buscar póliza (n°/patente/cliente)</label>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              onKeyDown={(e)=>e.key==="Enter" && buscar()}
              placeholder="Ej: ABC123 o Pérez"
              className="flex-1 px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
              disabled={saving}
            />
            <button
              onClick={buscar}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 disabled:opacity-50"
              disabled={saving || loading}
            >
              <HiSearch className="inline -mt-0.5" /> {loading ? "Buscando…" : "Buscar"}
            </button>
          </div>
          {error && <div className="text-red-300 text-sm">{error}</div>}

          {!loading && q && resultados.length === 0 && !error && (
            <div className="text-gray-400 text-sm">Sin resultados para “{q}”.</div>
          )}

          {!!resultados.length && (
            <div className="max-h-40 overflow-auto border border-gray-700 rounded">
              {resultados.map(r => (
                <button
                  key={r.id}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-800 ${poliza?.id===r.id ? "bg-gray-800" : ""}`}
                  onClick={()=>setPoliza(r)}
                  disabled={saving}
                >
                  <div className="text-gray-100 font-medium">
                    #{r.id} — {r.numero || r.numero_poliza || "-"} — {r.patente || "-"}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {r.cliente || "-"}
                  </div>
                </button>
              ))}
            </div>
          )}

          {poliza && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Seleccionada: #{poliza.id}</span>
              <button
                className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
                onClick={()=>{ setPoliza(null); setResumen(null); }}
                disabled={saving}
              >
                Quitar selección
              </button>
            </div>
          )}
        </div>

        {/* Plan + fechas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-sm text-gray-300">Plan</label>
            <select
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
              value={planId}
              onChange={(e)=>setPlanId(e.target.value)}
              disabled={saving}
            >
              <option value="">Seleccionar plan…</option>
              {planes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} · {p.km_incluidos} km
                </option>
              ))}
            </select>
            {planSel && (
              <div className="text-xs text-gray-400 mt-1">
                Plan seleccionado: {planSel.nombre} — Incluye {planSel.km_incluidos} km (ida+vuelta).
              </div>
            )}
          </div>
          <div>
            <label className="text-sm text-gray-300">Fecha de activación (alta)</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
              value={fechaActivacion}
              onChange={(e)=>setFechaActivacion(e.target.value)}
              min={HOY}
              disabled={saving}
            />
            {fechaInvalida && (
              <div className="text-xs text-rose-300 mt-1">La fecha no puede ser anterior a hoy.</div>
            )}
          </div>
        </div>

        {/* Carencia y aviso */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded border border-gray-700 bg-gray-900">
            <div className="text-xs text-gray-400">Carencia</div>
            <div className="text-lg font-semibold">{CARENCIA_DIAS}</div>
          </div>
          <div className="p-3 rounded border border-gray-700 bg-gray-900">
            <div className="text-xs text-gray-400">Servicio activo desde</div>
            <div className="text-lg font-semibold">{fechaServicioActiva}</div>
          </div>
          <div className="p-3 rounded border border-gray-700 bg-gray-900">
            <div className="text-xs text-gray-400">Faltan</div>
            <div className="text-lg font-semibold">{diasRestantes} días</div>
          </div>
        </div>

        {/* Resumen de póliza seleccionada */}
        {poliza && (
          <div className="p-3 rounded border border-gray-700 bg-gray-900">
            <div className="flex flex-wrap gap-4 items-center">
              <BadgeOk label="Fotos requeridas" ok={!!resumen?.poliza_tiene_fotos_requeridas} />
              <BadgeOk label="¿Ya usó grúa?" ok={!!resumen?.ya_uso} />
              {typeof resumen?.stats?.total_solicitudes === "number" && (
                <span className="text-sm text-gray-300">Total usos: {resumen.stats.total_solicitudes}</span>
              )}
              {resumen?.adhesion?.fecha_carencia_fin && (
                <span className="text-sm text-gray-300">
                  Adhesión activa: {resumen.adhesion.estado} — activa desde {resumen.adhesion.fecha_servicio_activa_desde}
                </span>
              )}
            </div>
            {!resumen && <div className="text-sm text-gray-400 mt-2">Cargando resumen…</div>}
          </div>
        )}
      </div>
    </Modal>
  );
}

function BadgeOk({ ok, label }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-green-300">
      <HiCheckCircle /> {label}: Sí
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-red-300">
      <HiXCircle /> {label}: No
    </span>
  );
}
