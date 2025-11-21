import { useEffect, useState } from "react";
import { HiPlus, HiTrash, HiPencil, HiCheck, HiX, HiRefresh } from "react-icons/hi";
import toast from "react-hot-toast";
import { companiasApi } from "../services/companias";

function Input({ label, value, onChange, placeholder, type = "text", className = "" }) {
  return (
    <label className={`text-sm ${className}`}>
      <span className="block text-white/80 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 outline-none focus:ring-2 ring-emerald-400/30 text-white placeholder:text-white/40"
      />
    </label>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-12 h-7 rounded-full px-1 flex items-center transition ${
        checked ? "bg-emerald-500/80" : "bg-white/15"
      }`}
      title={checked ? "Desactivar" : "Activar"}
    >
      <span
        className={`w-5 h-5 rounded-full bg-white transition ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

function PlanRow({ plan, onSave, onDelete }) {
  const isNew = !plan?.id;
  const [edit, setEdit] = useState(isNew);
  const [cuotas, setCuotas] = useState(plan?.cuotas ?? 12);
  const [diaVto, setDiaVto] = useState(plan?.dia_vto ?? 1);
  const [tol, setTol] = useState(plan?.tolerancia_dias ?? 0);
  const [nombre, setNombre] = useState(plan?.nombre ?? "");

  const doSave = async () => {
    const c = Number(cuotas), d = Number(diaVto), t = Number(tol);
    if (!Number.isFinite(c) || c <= 0) return toast.error("Cuotas inválidas");
    if (!Number.isFinite(d) || d < 1 || d > 28) return toast.error("Día vto debe ser 1–28");
    await onSave({
      id: plan?.id,
      cuotas: c,
      dia_vto: d,
      tolerancia_dias: Number.isFinite(t) ? t : 0,
      nombre: nombre?.trim() || null,
    });
    setEdit(false);
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2">
      <div className="col-span-3">
        {edit ? <Input label="Cuotas" type="number" value={cuotas} onChange={setCuotas} />
              : <Field label="Cuotas" value={plan?.cuotas} />}
      </div>
      <div className="col-span-3">
        {edit ? <Input label="Día vto (1–28)" type="number" value={diaVto} onChange={setDiaVto} />
              : <Field label="Día vto" value={plan?.dia_vto} />}
      </div>
      <div className="col-span-3">
        {edit ? <Input label="Tolerancia (días)" type="number" value={tol} onChange={setTol} />
              : <Field label="Tolerancia" value={plan?.tolerancia_dias ?? 0} />}
      </div>
      <div className="col-span-3">
        {edit ? <Input label="Nombre (opcional)" value={nombre} onChange={setNombre} />
              : <Field label="Nombre" value={plan?.nombre || "—"} />}
      </div>

      <div className="col-span-12 flex items-center gap-2">
        {edit ? (
          <>
            <button onClick={doSave} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 text-white border border-white/10 hover:brightness-110">
              <HiCheck /> Guardar
            </button>
            {!isNew && (
              <button onClick={() => setEdit(false)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/20">
                <HiX /> Cancelar
              </button>
            )}
          </>
        ) : (
          <>
            <button onClick={() => setEdit(true)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/20">
              <HiPencil /> Editar
            </button>
            <button onClick={onDelete} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/20 text-red-50 border border-red-500/30 hover:bg-red-500/30">
              <HiTrash /> Eliminar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="text-white/90">
      <div className="text-xs text-white/60">{label}</div>
      {value}
    </div>
  );
}

function EditableTitle({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value || "");
  useEffect(() => setV(value || ""), [value]);

  return editing ? (
    <div className="flex items-center gap-2">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white outline-none"
      />
      <button
        onClick={async () => { await onSave(v); setEditing(false); }}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white border border-white/10 hover:brightness-110"
      >
        <HiCheck /> Guardar
      </button>
      <button
        onClick={() => { setV(value || ""); setEditing(false); }}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/20"
      >
        <HiX /> Cancelar
      </button>
    </div>
  ) : (
    <button
      onClick={() => setEditing(true)}
      className="text-white font-semibold text-base sm:text-lg hover:underline text-left"
      title="Editar nombre"
    >
      <span className="align-middle">{value || "—"}</span>{" "}
      <HiPencil className="inline-block opacity-70 ml-1 align-middle" />
    </button>
  );
}

export default function AjustesCompaniasPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [nombre, setNombre] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [activa, setActiva] = useState(true);
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const list = await companiasApi.listar();
      setItems(Array.isArray(list) ? list : (list?.results || list?.data || []));
    } catch (e) {
      toast.error(e?.message || "No se pudieron cargar las compañías");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const crear = async () => {
    const n = (nombre || "").trim();
    if (!n) return toast.error("Ingresá un nombre");
    setSaving(true);
    try {
      await companiasApi.crear({ nombre: n, logo_url: logoUrl || null, activa: !!activa });
      setNombre("");
      setLogoUrl("");
      setActiva(true);
      toast.success("Compañía creada");
      await cargar();
    } catch (e) {
      toast.error(e?.message || "No se pudo crear");
    } finally {
      setSaving(false);
    }
  };

  const toggleActiva = async (c, val) => {
    try {
      await companiasApi.actualizar(c.id, { activa: !!val });
      await cargar();
    } catch (e) {
      toast.error(e?.message || "No se pudo actualizar");
    }
  };

  const renombrar = async (c, nuevo) => {
    const n = (nuevo || "").trim();
    if (!n) return;
    try {
      await companiasApi.actualizar(c.id, { nombre: n });
      await cargar();
    } catch (e) {
      toast.error(e?.message || "No se pudo renombrar");
    }
  };

  const borrar = async (c) => {
    if (!confirm(`¿Eliminar compañía "${c.nombre}"?`)) return;
    try {
      await companiasApi.eliminar(c.id);
      await cargar();
    } catch (e) {
      toast.error(e?.message || "No se pudo eliminar");
    }
  };

  const guardarPlan = async (companiaId, plan) => {
    if (plan?.id) await companiasApi.actualizarPlan(companiaId, plan.id, plan);
    else await companiasApi.crearPlan(companiaId, plan);
    await cargar();
  };

  const eliminarPlan = async (companiaId, planId) => {
    if (!confirm("¿Eliminar plan de cuotas?")) return;
    await companiasApi.eliminarPlan(companiaId, planId);
    await cargar();
  };

  return (
    <section className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-white/70 text-xs">Ajustes</div>
          <h1 className="text-white text-lg sm:text-xl font-semibold">Compañías &amp; Renovaciones</h1>
        </div>
        <button
          onClick={cargar}
          className="h-10 px-3 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/20 inline-flex items-center gap-2"
          title="Actualizar"
        >
          <HiRefresh /> Actualizar
        </button>
      </div>

      {/* Crear compañía */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 mb-6">
        <h3 className="text-white/90 font-medium mb-3">Nueva compañía</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input label="Nombre" value={nombre} onChange={setNombre} placeholder="Ej: Federación Patronal" />
          <Input label="Logo URL (opcional)" value={logoUrl} onChange={setLogoUrl} placeholder="https://…" />
          <div className="flex flex-col justify-end">
            <div className="text-sm text-white/70 mb-1">Activa</div>
            <Switch checked={activa} onChange={setActiva} />
          </div>
          <div className="flex items-end">
            <button
              onClick={crear}
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white border border-white/10 hover:brightness-110 disabled:opacity-60"
            >
              <HiPlus /> Agregar
            </button>
          </div>
        </div>
      </div>

      {/* Lista compañías */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl h-28 bg-white/5 border border-white/10 animate-pulse" />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-white/70">
            No hay compañías cargadas.
          </div>
        ) : (
          items.map((c) => (
            <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-center gap-3">
                {/* Logo */}
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 border border-white/10 grid place-items-center">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.nombre} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-white/50 text-xs">Logo</span>
                  )}
                </div>

                {/* Nombre editable inline */}
                <EditableTitle value={c.nombre} onSave={(v) => renombrar(c, v)} />

                {/* Activa */}
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-white/60">Activa</span>
                  <Switch checked={!!c.activa} onChange={(val) => toggleActiva(c, val)} />
                  <button
                    onClick={() => borrar(c)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/20 text-red-50 border border-red-500/30 hover:bg-red-500/30"
                  >
                    <HiTrash /> Eliminar
                  </button>
                </div>
              </div>

              {/* Planes */}
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="text-white/80 font-medium mb-2">Planes de cuotas / Renovación</div>

                {(c.planes && c.planes.length > 0) ? (
                  <div className="divide-y divide-white/10">
                    {c.planes.map((p) => (
                      <PlanRow
                        key={p.id || `${c.id}-plan-${p.cuotas}-${p.dia_vto}`}
                        plan={p}
                        onSave={(pl) => guardarPlan(c.id, pl)}
                        onDelete={() => eliminarPlan(c.id, p.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-white/60 text-sm mb-2">No hay planes aún.</div>
                )}

                {/* Nuevo plan */}
                <div className="mt-3 rounded-xl border border-dashed border-white/15 p-3">
                  <div className="text-xs text-white/60 mb-2">Agregar plan</div>
                  <PlanRow
                    plan={{}}
                    onSave={(pl) => guardarPlan(c.id, pl)}
                    onDelete={() => {}}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
