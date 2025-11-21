// src/components/gruas/PlanManager.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiTrash, HiCheck, HiPencil, HiRefresh, HiSearch, HiPlus, HiX,
} from "react-icons/hi";
import GruasAPI from "../../api/gruas";

const normalize = (res) => {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object") {
    for (const k of ["results", "items", "data", "rows"]) if (Array.isArray(res[k])) return res[k];
  }
  return [];
};

// 🎨 Botones: base + variantes con fondo sólido (alta legibilidad)
const BTN = {
  base: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:opacity-60 disabled:cursor-not-allowed",
  neutral: "bg-[#151A22] hover:bg-[#1A2030] border border-white/10 text-white",
  primary: "bg-primary-500 hover:bg-primary-400 text-white ring-1 ring-primary-300/70",
  info: "bg-blue-600 hover:bg-blue-500 text-white ring-1 ring-blue-300/60",
  success: "bg-emerald-600 hover:bg-emerald-500 text-white ring-1 ring-emerald-300/60",
  warning: "bg-amber-600 hover:bg-amber-500 text-white ring-1 ring-amber-300/60",
  danger: "bg-rose-600 hover:bg-rose-500 text-white ring-1 ring-rose-300/60",
};

export default function PlanManager() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filtros / orden
  const [qLocal, setQLocal] = useState("");
  const [filtros, setFiltros] = useState({ q: "", estado: "" }); // "" | "activos" | "inactivos"
  const [orden, setOrden] = useState({ key: "nombre", dir: "asc" }); // key: nombre | km | costo

  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(normalize(await GruasAPI.getPlanes?.()));
    } catch (e) {
      setError(e?.message || "Error al cargar");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // refrescar cuando se crea un plan desde el modal
  useEffect(() => {
    const onCreated = () => load();
    if (typeof document !== "undefined") {
      document.addEventListener("gruas:plan:created", onCreated);
      return () => document.removeEventListener("gruas:plan:created", onCreated);
    }
  }, []);

  // debounce para búsqueda
  useEffect(() => {
    const t = setTimeout(() => setFiltros((s) => ({ ...s, q: qLocal })), 350);
    return () => clearTimeout(t);
  }, [qLocal]);

  const lista = useMemo(() => {
    let arr = Array.isArray(items) ? items.slice() : [];

    // filtrar por estado
    if (filtros.estado === "activos") arr = arr.filter((p) => !!p.activo);
    if (filtros.estado === "inactivos") arr = arr.filter((p) => !p.activo);

    // filtrar por texto
    if (filtros.q) {
      const q = filtros.q.toLowerCase();
      arr = arr.filter((p) => {
        const s = [
          p?.nombre,
          p?.descripcion,
          p?.km_incluidos,
          p?.costo_km_adicional,
          p?.activo ? "activo" : "inactivo",
        ]
          .map((x) => String(x ?? ""))
          .join(" ")
          .toLowerCase();
        return s.includes(q);
      });
    }

    // ordenar
    const { key, dir } = orden;
    arr.sort((a, b) => {
      const mul = dir === "asc" ? 1 : -1;
      if (key === "nombre") return mul * String(a.nombre || "").localeCompare(String(b.nombre || ""));
      if (key === "km") return mul * (Number(a.km_incluidos || 0) - Number(b.km_incluidos || 0));
      if (key === "costo") return mul * (Number(a.costo_km_adicional || 0) - Number(b.costo_km_adicional || 0));
      return 0;
    });

    return arr;
  }, [items, filtros, orden]);

  async function guardar() {
    const p = editing;
    if (!p?.nombre) { alert("Nombre requerido"); return; }
    try {
      if (p.id) await GruasAPI.updatePlan?.(p.id, p);
      else await GruasAPI.createPlan?.(p);
      setEditing(null);
      await load();
    } catch (e) {
      alert(e?.message || "Error al guardar");
    }
  }

  async function toggleActivo(item) {
    try {
      if (GruasAPI.togglePlanActivo) await GruasAPI.togglePlanActivo(item.id, !item.activo);
      else await GruasAPI.updatePlan?.(item.id, { activo: !item.activo });
      await load();
    } catch (e) { alert(e?.message || "Error"); }
  }

  async function eliminar(id) {
    if (!window.confirm("¿Eliminar plan?")) return;
    try { await GruasAPI.deletePlan?.(id); await load(); }
    catch (e) { alert(e?.message || "Error"); }
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* -------- Tarjeta de FILTROS (separada y estática) -------- */}
      <div className="rounded-2xl bg-[#0E1116] border border-white/10 shadow-sm">
        <div className="p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-full max-w-md">
              <HiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-8 pr-3 py-2 bg-[#151A22] text-white rounded-lg border border-white/10 focus:ring-2 focus:ring-primary-400/60"
                placeholder="Buscar planes…"
                value={qLocal}
                onChange={(e) => setQLocal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") setFiltros((s) => ({ ...s, q: qLocal })); }}
                aria-label="Buscar planes"
              />
            </div>

            <select
              className="px-3 py-2 bg-[#151A22] text-white rounded-lg border border-white/10 focus:ring-2 focus:ring-primary-400/60 cursor-pointer"
              value={filtros.estado}
              onChange={(e) => setFiltros((s) => ({ ...s, estado: e.target.value }))}
              aria-label="Filtrar por estado"
              title="Filtrar por estado"
            >
              <option value="">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>

            <select
              className="px-3 py-2 bg-[#151A22] text-white rounded-lg border border-white/10 focus:ring-2 focus:ring-primary-400/60 cursor-pointer"
              value={`${orden.key}:${orden.dir}`}
              onChange={(e) => {
                const [key, dir] = e.target.value.split(":");
                setOrden({ key, dir });
              }}
              aria-label="Ordenar"
              title="Ordenar"
            >
              <option value="nombre:asc">Nombre (A→Z)</option>
              <option value="nombre:desc">Nombre (Z→A)</option>
              <option value="km:asc">KM incluidos (↑)</option>
              <option value="km:desc">KM incluidos (↓)</option>
              <option value="costo:asc">Costo/km (↑)</option>
              <option value="costo:desc">Costo/km (↓)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              className={`${BTN.base} ${BTN.neutral}`}
              onClick={load}
              aria-busy={loading}
              title="Refrescar"
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <HiRefresh className={`inline -mt-0.5 ${loading ? "animate-spin" : ""}`} />
              Refrescar
            </motion.button>

            <motion.button
              onClick={() => setShowCreate(true)}
              className={`${BTN.base} ${BTN.primary} font-semibold shadow`}
              title="Crear nuevo plan"
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <HiPlus className="inline -mt-0.5" /> Nuevo plan
            </motion.button>
          </div>
        </div>
      </div>

      {/* Separación visual clara */}
      <div className="h-1" />

      {/* -------- Tarjeta de TABLA (separada) -------- */}
      <div className="rounded-2xl bg-[#0E1116] border border-white/10 overflow-hidden shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-[#0B1018]">
            <tr className="text-left text-slate-300 uppercase text-xs">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2">KM incluidos</th>
              <th className="px-3 py-2">Costo/km adicional</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(lista) ? lista : []).map((p) => (
              <tr key={p.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-3 py-2">{p.id}</td>
                <td className="px-3 py-2">{p.nombre}</td>
                <td className="px-3 py-2 max-w-[420px]">
                  <span className="text-white/90 line-clamp-2">{p.descripcion || "—"}</span>
                </td>
                <td className="px-3 py-2">{p.km_incluidos}</td>
                <td className="px-3 py-2">{p.costo_km_adicional}</td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ring-1 ${
                      p.activo
                        ? "bg-emerald-400/15 text-emerald-300 ring-emerald-300/30"
                        : "bg-slate-500/10 text-slate-300 ring-slate-400/30"
                    }`}
                  >
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <motion.button
                      className={`${BTN.base} ${BTN.info}`}
                      onClick={() => setEditing(p)}
                      title="Editar plan"
                      whileTap={{ scale: 0.98 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      <HiPencil className="inline -mt-0.5" /> Editar
                    </motion.button>

                    <motion.button
                      className={`${BTN.base} ${p.activo ? BTN.warning : BTN.success}`}
                      onClick={() => toggleActivo(p)}
                      title={p.activo ? "Desactivar plan" : "Activar plan"}
                      aria-pressed={p.activo}
                      whileTap={{ scale: 0.98 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      <HiCheck className="inline -mt-0.5" /> {p.activo ? "Desactivar" : "Activar"}
                    </motion.button>

                    <motion.button
                      className={`${BTN.base} ${BTN.danger}`}
                      onClick={() => eliminar(p.id)}
                      title="Eliminar plan"
                      whileTap={{ scale: 0.98 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      <HiTrash className="inline -mt-0.5" /> Eliminar
                    </motion.button>
                  </div>
                </td>
              </tr>
            ))}
            {!lista?.length && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  {loading ? "Cargando..." : error || "Sin planes"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Editor inline */}
        {editing && (
          <div className="p-4 border-t border-white/10 bg-[#0B1018]">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <label className="text-sm">Nombre
                <input
                  className="w-full px-3 py-2 bg-[#151A22] text-white rounded border border-white/10 mt-1 focus:ring-2 focus:ring-primary-400/60"
                  value={editing.nombre || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, nombre: e.target.value }))}
                />
              </label>
              <label className="text-sm">KM incluidos
                <input
                  type="number" min={0}
                  className="w-full px-3 py-2 bg-[#151A22] text-white rounded border border-white/10 mt-1 focus:ring-2 focus:ring-primary-400/60"
                  value={editing.km_incluidos || 0}
                  onChange={(e) => setEditing((s) => ({ ...s, km_incluidos: Number(e.target.value) }))}
                />
              </label>
              <label className="text-sm">Costo/km adicional
                <input
                  type="number" min={0} step="0.01"
                  className="w-full px-3 py-2 bg-[#151A22] text-white rounded border border-white/10 mt-1 focus:ring-2 focus:ring-primary-400/60"
                  value={editing.costo_km_adicional || 0}
                  onChange={(e) => setEditing((s) => ({ ...s, costo_km_adicional: Number(e.target.value) }))}
                />
              </label>
              <label className="text-sm md:col-span-2">Descripción
                <textarea
                  rows={2} maxLength={500}
                  className="w-full px-3 py-2 bg-[#151A22] text-white rounded border border-white/10 mt-1 focus:ring-2 focus:ring-primary-400/60"
                  value={editing.descripcion || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, descripcion: e.target.value }))}
                  placeholder="Alcance, límites, horarios, observaciones…"
                />
              </label>
              <label className="flex items-center gap-2 text-sm md:col-span-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!editing.activo}
                  onChange={(e) => setEditing((s) => ({ ...s, activo: e.target.checked }))}
                />
                Activo
              </label>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <motion.button
                className={`${BTN.base} ${BTN.neutral}`}
                onClick={() => setEditing(null)}
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                Cancelar
              </motion.button>
              <motion.button
                className={`${BTN.base} ${BTN.primary} font-semibold shadow`}
                onClick={guardar}
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                Guardar
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Crear */}
      <AnimatePresence>
        {showCreate && <NuevoPlanModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}

/* ================== Modal: Nuevo Plan ================== */
function NuevoPlanModal({ onClose }) {
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    km_incluidos: 100,
    costo_km_adicional: 0,
    activo: true,
  });
  const [saving, setSaving] = useState(false);

  const canSave =
    String(form.nombre || "").trim().length >= 3 &&
    Number(form.km_incluidos) >= 0 &&
    Number(form.costo_km_adicional) >= 0 &&
    !saving;

  async function crear() {
    if (!canSave) return;
    setSaving(true);
    try {
      await GruasAPI.createPlan?.({
        nombre: String(form.nombre).trim(),
        descripcion: String(form.descripcion || "").trim(),
        km_incluidos: Number(form.km_incluidos),
        costo_km_adicional: Number(form.costo_km_adicional),
        activo: !!form.activo,
      });
      if (typeof document !== "undefined") {
        document.dispatchEvent(new CustomEvent("gruas:plan:created"));
      }
      onClose?.();
    } catch (e) {
      alert(e?.message || "Error al crear plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/60 cursor-pointer" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        role="dialog" aria-modal="true" aria-label="Nuevo plan"
        className="relative w-full h-[100dvh] md:h-auto md:max-w-2xl md:mx-auto md:my-8 md:rounded-2xl bg-[#0E1116] border border-white/10 shadow-xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0B1018]">
          <h3 className="text-white font-semibold text-base flex items-center gap-2">
            <HiPlus /> Nuevo plan
          </h3>
          <button onClick={onClose} className="h-9 w-9 grid place-content-center rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer" title="Cerrar">
            <HiX className="text-white" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">Nombre
              <input
                className="w-full px-3 py-2 bg-[#151A22] text-white rounded border border-white/10 mt-1 focus:ring-2 focus:ring-primary-400/60"
                placeholder="Ej. Remolque Básico"
                value={form.nombre}
                onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
                disabled={saving}
              />
              <div className="text-xs text-white/70 mt-1">Mínimo 3 caracteres.</div>
            </label>

            <label className="text-sm">KM incluidos (ida+vuelta)
              <input
                type="number" min={0}
                className="w-full px-3 py-2 bg-[#151A22] text-white rounded border border-white/10 mt-1 focus:ring-2 focus:ring-primary-400/60"
                value={form.km_incluidos}
                onChange={(e) => setForm((s) => ({ ...s, km_incluidos: Number(e.target.value) }))}
                disabled={saving}
              />
              <div className="flex items-center gap-2 mt-1 text-[11px] text-white/80">
                Presets:
                {[50, 100, 150].map((v) => (
                  <button key={v} type="button"
                    onClick={() => setForm((s) => ({ ...s, km_incluidos: v }))}
                    className={`${BTN.base} ${BTN.neutral} h-7 px-2 py-1`}
                    disabled={saving}>
                    {v}
                  </button>
                ))}
              </div>
            </label>

            <label className="text-sm">Costo / km adicional
              <input
                type="number" min={0} step="0.01"
                className="w-full px-3 py-2 bg-[#151A22] text-white rounded border border-white/10 mt-1 focus:ring-2 focus:ring-primary-400/60"
                value={form.costo_km_adicional}
                onChange={(e) => setForm((s) => ({ ...s, costo_km_adicional: Number(e.target.value) }))}
                disabled={saving}
              />
              <div className="flex items-center gap-2 mt-1 text-[11px] text-white/80">
                Presets:
                {[0, 500, 800, 1000].map((v) => (
                  <button key={v} type="button"
                    onClick={() => setForm((s) => ({ ...s, costo_km_adicional: v }))}
                    className={`${BTN.base} ${BTN.neutral} h-7 px-2 py-1`}
                    disabled={saving}>
                    {v}
                  </button>
                ))}
              </div>
            </label>

            <label className="flex items-center gap-2 text-sm md:mt-6 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.activo}
                onChange={(e) => setForm((s) => ({ ...s, activo: e.target.checked }))}
                disabled={saving}
              />
              Activo
            </label>
          </div>

          <label className="text-sm">Descripción (opcional)
            <textarea
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 bg-[#151A22] text-white rounded border border-white/10 mt-1 focus:ring-2 focus:ring-primary-400/60"
              placeholder="Notas del plan: alcance, horarios, límites, etc."
              value={form.descripcion}
              onChange={(e) => setForm((s) => ({ ...s, descripcion: e.target.value }))}
              disabled={saving}
            />
            <div className="text-xs text-white/70 mt-1">
              Los km incluidos son <strong>totales (ida + vuelta)</strong>. El excedente se cobra con la tarifa por km adicional.
            </div>
          </label>
        </div>

        <div className="px-4 py-3 border-t border-white/10 flex justify-end gap-2 bg-[#0B1018]">
          <motion.button
            onClick={onClose}
            className={`${BTN.base} ${BTN.neutral}`}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            Cancelar
          </motion.button>
          <motion.button
            disabled={!canSave}
            onClick={crear}
            className={`${BTN.base} ${BTN.primary} font-semibold shadow disabled:opacity-50`}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            {saving ? "Guardando…" : "Crear"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
