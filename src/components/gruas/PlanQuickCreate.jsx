// src/components/gruas/PlanQuickCreate.jsx
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import GruasAPI from "../../api/gruas";

export default function PlanQuickCreate() {
  const [form, setForm] = useState({
    nombre: "",
    km_incluidos: 100,
    costo_km_adicional: 0,
    descripcion: "",           // ✅ nuevo
    activo: true,
  });
  const [saving, setSaving] = useState(false);
  const nombreRef = useRef(null);

  const canCreate =
    String(form.nombre || "").trim().length >= 3 &&
    Number.isFinite(Number(form.km_incluidos)) &&
    Number(form.km_incluidos) >= 0 &&
    Number.isFinite(Number(form.costo_km_adicional)) &&
    Number(form.costo_km_adicional) >= 0 &&
    !saving;

  async function crear() {
    if (!canCreate) return;
    setSaving(true);
    try {
      const payload = {
        nombre: String(form.nombre).trim(),
        km_incluidos: Number(form.km_incluidos),
        costo_km_adicional: Number(form.costo_km_adicional),
        activo: !!form.activo,
        ...(String(form.descripcion || "").trim()
          ? { descripcion: String(form.descripcion).trim() } // ✅ solo si hay valor
          : {}),
      };
      await GruasAPI.createPlan?.(payload);
      // reset
      setForm({ nombre: "", km_incluidos: 100, costo_km_adicional: 0, descripcion: "", activo: true });
      // enfoque para seguir cargando
      setTimeout(() => nombreRef.current?.focus(), 0);
      alert("Plan creado");
      if (typeof document !== "undefined") {
        document.dispatchEvent(new CustomEvent("gruas:plan:created"));
      }
    } catch (e) {
      alert(e?.message || "Error al crear plan");
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e) {
    if (e.target?.tagName === "TEXTAREA") return; // ✅ no crear con Enter dentro de descripción
    if (e.key === "Enter" && canCreate) {
      e.preventDefault();
      crear();
    }
  }

  // Evitar valores negativos en inputs numéricos
  useEffect(() => {
    if (Number(form.km_incluidos) < 0) setForm((s) => ({ ...s, km_incluidos: 0 }));
    if (Number(form.costo_km_adicional) < 0) setForm((s) => ({ ...s, costo_km_adicional: 0 }));
  }, [form.km_incluidos, form.costo_km_adicional]);

  const Preset = ({ onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
    >
      {children}
    </button>
  );

  const MAX_DESC = 500;

  return (
    <motion.div
      className="bg-gray-800 rounded-lg p-4 shadow"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onKeyDown={onKeyDown}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-sm">
          Nombre
          <input
            ref={nombreRef}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 mt-1"
            value={form.nombre}
            onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
            placeholder="Ej. Remolque Básico"
            disabled={saving}
          />
          <div className="text-xs text-gray-400 mt-1">Mínimo 3 caracteres.</div>
        </label>

        <label className="text-sm">
          KM incluidos (ida+vuelta)
          <input
            type="number"
            min={0}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 mt-1"
            value={form.km_incluidos}
            onChange={(e) => setForm((s) => ({ ...s, km_incluidos: Number(e.target.value) }))}
            disabled={saving}
          />
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-gray-400">Presets:</span>
            <Preset onClick={() => setForm((s) => ({ ...s, km_incluidos: 50 }))}>50</Preset>
            <Preset onClick={() => setForm((s) => ({ ...s, km_incluidos: 100 }))}>100</Preset>
            <Preset onClick={() => setForm((s) => ({ ...s, km_incluidos: 150 }))}>150</Preset>
          </div>
        </label>

        <label className="text-sm">
          Costo / km adicional
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 mt-1"
            value={form.costo_km_adicional}
            onChange={(e) => setForm((s) => ({ ...s, costo_km_adicional: Number(e.target.value) }))}
            disabled={saving}
          />
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-gray-400">Presets:</span>
            <Preset onClick={() => setForm((s) => ({ ...s, costo_km_adicional: 0 }))}>0</Preset>
            <Preset onClick={() => setForm((s) => ({ ...s, costo_km_adicional: 500 }))}>500</Preset>
            <Preset onClick={() => setForm((s) => ({ ...s, costo_km_adicional: 800 }))}>800</Preset>
            <Preset onClick={() => setForm((s) => ({ ...s, costo_km_adicional: 1000 }))}>1000</Preset>
          </div>
        </label>

        <label className="flex items-center gap-2 text-sm md:mt-6">
          <input
            type="checkbox"
            checked={!!form.activo}
            onChange={(e) => setForm((s) => ({ ...s, activo: e.target.checked }))}
            disabled={saving}
          />
          Activo
        </label>

        {/* ✅ Descripción opcional, minimal */}
        <label className="text-sm md:col-span-4">
          Descripción (opcional)
          <textarea
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 mt-1"
            placeholder="Notas del plan: alcance, horarios, límites, etc."
            value={form.descripcion}
            onChange={(e) =>
              setForm((s) => ({ ...s, descripcion: e.target.value.slice(0, MAX_DESC) }))
            }
            disabled={saving}
          />
          <div className="text-[11px] text-gray-400 mt-1">
            {form.descripcion.length}/{MAX_DESC}
          </div>
        </label>
      </div>

      <div className="mt-2 text-xs text-gray-400">
        Los km incluidos son <strong>totales (ida + vuelta)</strong>. El excedente se cobra con la tarifa por km adicional.
      </div>

      <div className="mt-3 flex justify-end">
        <button
          disabled={!canCreate}
          onClick={crear}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Crear"}
        </button>
      </div>
    </motion.div>
  );
}
