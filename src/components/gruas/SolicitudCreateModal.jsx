// src/components/gruas/SolicitudCreateModal.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import GruasAPI from "../../api/gruas";
import Modal from "./modal/Modal";

export default function SolicitudCreateModal({ onClose }) {
  const [q, setQ] = useState("");
  const [polizas, setPolizas] = useState([]);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState({ motivo: "", direccion: "", referencia: "" });
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);

  // aviso fuera de horario (L–S 08–20)
  const fueraHorario = useMemo(() => {
    const now = new Date();
    const dow = now.getDay();      // 0 dom, 6 sáb
    const h = now.getHours();
    const dentro = dow >= 1 && dow <= 6 && h >= 8 && h < 20; // L(1) a S(6), 08–19:59
    return !dentro;
  }, []);

  useEffect(() => {
    const id = setTimeout(async () => {
      if (!q) { setPolizas([]); setSel(null); return; }
      setBuscando(true);
      try {
        // 1) Solo operables (para poder crear solicitud)
        let r = await GruasAPI.searchPolizasElegibles?.(q, true);
        // 2) Fallback: todas las coincidencias
        if (!Array.isArray(r) || r.length === 0) {
          r = await GruasAPI.searchPolizasElegibles?.(q, false);
        }
        setPolizas(Array.isArray(r) ? r : []);
      } catch {
        setPolizas([]);
      } finally {
        setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  const canCreate = !!(sel?.operable && form.motivo && form.direccion && !loading);

  async function crear() {
    if (!sel?.id) { alert("Seleccioná una póliza"); return; }
    if (!sel?.operable) { alert("La póliza seleccionada no está operable para solicitar grúa."); return; }
    if (!form.motivo || !form.direccion) { alert("Completá motivo y dirección"); return; }
    setLoading(true);
    try {
      await GruasAPI.crearSolicitud?.({
        adhesion: Number(sel.adhesion_id), // NECESARIO
        poliza: Number(sel.id),
        motivo: form.motivo,
        origen: form.direccion,            // el backend espera "origen"
        destino: "",                       // opcional
        km_estimados: 0,                   // opcional
        notas: form.referencia,            // guardamos referencia en notas
      });
      onClose?.();
    } catch (e) {
      alert(e?.message || "Error al crear solicitud");
    } finally { setLoading(false); }
  }

  function handleEnter(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.target.name === "buscar") {
        setQ((v) => v); // fuerza el debounce
      } else if (canCreate) {
        crear();
      }
    }
  }

  const motivoInoperable =
    sel?.motivo_inoperable ||
    (sel?.carencia_activa && sel?.adhesion_carencia_fin ? `Carencia hasta ${sel.adhesion_carencia_fin}` : "") ||
    (Array.isArray(sel?.bloqueos) ? sel.bloqueos.join(", ") : "");

  return (
    <Modal
      title="Nueva solicitud de grúa"
      onClose={onClose}
      footer={
        <>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={onClose}>
            Cancelar
          </button>
          <button
            disabled={!canCreate}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold disabled:opacity-50"
            onClick={crear}
          >
            Crear solicitud
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Aviso horario */}
        {fueraHorario && (
          <div className="p-3 rounded bg-yellow-900/20 border border-yellow-700 text-yellow-200 text-sm">
            Estás fuera del horario de prestación (L–S 08:00–20:00). Puede tener costo adicional y no está garantizado.
          </div>
        )}

        {/* Buscar póliza */}
        <label className="text-sm w-full">
          Buscar póliza (patente, número o cliente)
          <input
            name="buscar"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            onKeyDown={handleEnter} // Enter: fuerza búsqueda
            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 mt-1"
            placeholder="Ej. ABC123 • 12-345678 • Juan Pérez"
          />
        </label>

        <div className="max-h-48 overflow-auto border border-gray-700 rounded">
          {buscando && (
            <div className="px-3 py-2 text-sm text-gray-400">Buscando…</div>
          )}
          {!buscando && polizas.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
          )}
          {polizas.map(p => (
            <motion.div
              key={p.id}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-700/80 ${sel?.id===p.id?'bg-gray-700/70':''}`}
              onClick={()=>setSel(p)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <div className="font-medium">
                {p.numero || p.numero_poliza || "-"} — {p.patente || "sin patente"}
              </div>
              <div className="text-xs text-gray-300 flex items-center gap-2">
                <span>{p.cliente || "-"}</span>
                <span className={`px-2 py-0.5 rounded border text-[10px] ${p.operable ? 'bg-green-900/30 border-green-700 text-green-300' : 'bg-red-900/30 border-red-700 text-red-300'}`}>
                  {p.operable ? 'OPERABLE' : 'NO OPERABLE'}
                </span>
                {p.adhesion_carencia_fin && (
                  <span className="text-[10px] text-gray-400">
                    carencia hasta {p.adhesion_carencia_fin}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Resumen selección */}
        {sel && (
          <motion.div
            className="bg-gray-800 rounded-lg p-3 border border-gray-700"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                <div className="font-semibold">
                  {sel?.cliente || "Cliente"} — Póliza {sel?.numero || sel?.numero_poliza || sel?.id}
                </div>
                <div className="text-gray-300">
                  Patente: {sel?.patente || "—"}
                  {sel?.adhesion_carencia_fin && (
                    <span className="ml-2 text-gray-400">| Carencia hasta {sel.adhesion_carencia_fin}</span>
                  )}
                </div>
              </div>
              <div>
                <span className={`px-2 py-1 text-xs rounded ${
                  sel?.operable ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/30"
                                 : "bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/30"
                }`}>
                  {sel?.operable ? "Operable" : "No operable"}
                </span>
              </div>
            </div>
            {!sel?.operable && motivoInoperable && (
              <div className="mt-2 text-xs text-rose-300">
                Motivo: {motivoInoperable}
              </div>
            )}
          </motion.div>
        )}

        {/* Formulario */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3" onKeyDown={handleEnter}>
          <label className="text-sm md:col-span-3">Motivo
            <input
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 mt-1"
              value={form.motivo}
              onChange={(e)=>setForm(s=>({ ...s, motivo:e.target.value }))}
              placeholder="Ej. no arranca / pinchadura / accidente"
            />
          </label>
          <label className="text-sm md:col-span-2">Dirección / punto de auxilio
            <input
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 mt-1"
              value={form.direccion}
              onChange={(e)=>setForm(s=>({ ...s, direccion:e.target.value }))}
              placeholder="Calle, altura, localidad"
            />
          </label>
          <label className="text-sm">Referencia (opcional)
            <input
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 mt-1"
              value={form.referencia}
              onChange={(e)=>setForm(s=>({ ...s, referencia:e.target.value }))}
              placeholder="Punto de referencia, color del auto, etc."
            />
          </label>
        </div>
      </div>
    </Modal>
  );
}
