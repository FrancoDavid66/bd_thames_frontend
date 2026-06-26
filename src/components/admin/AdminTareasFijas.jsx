// src/components/admin/AdminTareasFijas.jsx
//
// Configuración del Control diario POR OFICINA: elegís una oficina y definís
// sus tareas (horario, días, foto, margen). Cada oficina tiene las suyas.
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiPlus, HiPencil, HiTrash, HiX, HiSave, HiClock, HiCamera, HiOfficeBuilding,
  HiTemplate, HiClipboardCheck,
} from "react-icons/hi";
import toast from "react-hot-toast";
import api from "../../services/api";

const DIAS = [
  ["0", "Lun"], ["1", "Mar"], ["2", "Mié"], ["3", "Jue"],
  ["4", "Vie"], ["5", "Sáb"], ["6", "Dom"],
];

const nombreUsuario = (u) =>
  u?.nombre_completo ||
  [u?.first_name, u?.last_name].filter(Boolean).join(" ") ||
  u?.username || u?.email || `Usuario ${u?.id}`;

// Lista base para cargar de un saque en una oficina nueva
const TAREAS_BASE = [
  { nombre: "Abrir la oficina (cortina)",     hora_esperada: "09:00", requiere_foto: true },
  { nombre: "Sacar los carteles a la vereda", hora_esperada: "09:15", requiere_foto: true },
  { nombre: "Limpiar / ordenar la oficina",   hora_esperada: "09:30", requiere_foto: true },
  { nombre: "Prender luces y carteles",       hora_esperada: "09:00", requiere_foto: false },
  { nombre: "Cierre de caja del día",         hora_esperada: "19:30", requiere_foto: true },
  { nombre: "Guardar los carteles",           hora_esperada: "20:00", requiere_foto: true },
  { nombre: "Cerrar la oficina",              hora_esperada: "20:00", requiere_foto: true },
];

const VACIO = {
  nombre: "", responsable: "", frecuencia: "diaria",
  dias_semana: "", hora_esperada: "", margen_alerta: 15,
  requiere_foto: true, instruccion_foto: "", premia_demora: false, activa: true, orden: 0,
};

export default function AdminTareasFijas() {
  const [items, setItems] = useState([]);
  const [oficinas, setOficinas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [oficinaSel, setOficinaSel] = useState("");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [saving, setSaving] = useState(false);
  const [cargandoBase, setCargandoBase] = useState(false);

  const norm = (r) => (Array.isArray(r.data) ? r.data : r.data?.results || []);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [t, o, u] = await Promise.all([
        api.get("tareas-fijas/"),
        api.get("usuarios/oficinas/").catch(() => ({ data: [] })),
        api.get("usuarios/users/").catch(() => ({ data: [] })),
      ]);
      const ofis = norm(o);
      setItems(norm(t));
      setOficinas(ofis);
      setUsuarios(norm(u));
      setOficinaSel((prev) => prev || (ofis[0]?.id ? String(ofis[0].id) : ""));
    } catch {
      toast.error("No se pudieron cargar las tareas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const tareasOficina = useMemo(
    () => items.filter((i) => String(i.oficina) === String(oficinaSel)),
    [items, oficinaSel]
  );

  const abrir = (it = null) => {
    if (it) {
      setEditingId(it.id);
      setForm({
        nombre: it.nombre || "",
        responsable: it.responsable ?? "",
        frecuencia: it.frecuencia || "diaria",
        dias_semana: it.dias_semana || "",
        hora_esperada: it.hora_esperada ? String(it.hora_esperada).slice(0, 5) : "",
        margen_alerta: it.margen_alerta ?? 15,
        requiere_foto: it.requiere_foto ?? true,
        instruccion_foto: it.instruccion_foto || "",
        premia_demora: it.premia_demora ?? false,
        activa: it.activa ?? true,
        orden: it.orden ?? 0,
      });
    } else {
      setEditingId(null);
      setForm({ ...VACIO, orden: tareasOficina.length });
    }
    setModalOpen(true);
  };

  const toggleDia = (d) => {
    const set = new Set((form.dias_semana || "").split(",").filter(Boolean));
    set.has(d) ? set.delete(d) : set.add(d);
    setForm((f) => ({ ...f, dias_semana: [...set].sort((a, b) => a - b).join(",") }));
  };

  const guardar = async () => {
    if (!oficinaSel) return toast.error("Elegí una oficina");
    if (!form.nombre.trim()) return toast.error("Poné un nombre");
    if (form.frecuencia === "semanal" && !form.dias_semana)
      return toast.error("Elegí al menos un día");
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        oficina: oficinaSel,
        responsable: form.responsable || null,
        frecuencia: form.frecuencia,
        dias_semana: form.frecuencia === "semanal" ? form.dias_semana : "",
        hora_esperada: form.hora_esperada || null,
        margen_alerta: Number(form.margen_alerta) || 15,
        requiere_foto: !!form.requiere_foto,
        instruccion_foto: form.requiere_foto ? (form.instruccion_foto || "").trim() : "",
        premia_demora: !!form.premia_demora,
        activa: !!form.activa,
        orden: Number(form.orden) || 0,
      };
      if (editingId) await api.patch(`tareas-fijas/${editingId}/`, payload);
      else await api.post("tareas-fijas/", payload);
      toast.success(editingId ? "Tarea actualizada" : "Tarea creada");
      setModalOpen(false);
      cargar();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const borrar = async (it) => {
    if (!window.confirm(`¿Borrar "${it.nombre}"?`)) return;
    try {
      await api.delete(`tareas-fijas/${it.id}/`);
      toast.success("Tarea borrada");
      cargar();
    } catch {
      toast.error("No se pudo borrar");
    }
  };

  const cargarBase = async () => {
    if (!oficinaSel) return toast.error("Elegí una oficina");
    const existentes = new Set(tareasOficina.map((t) => t.nombre.toLowerCase()));
    const aCrear = TAREAS_BASE.filter((t) => !existentes.has(t.nombre.toLowerCase()));
    if (aCrear.length === 0) return toast("Ya están todas las base", { icon: "👍" });
    setCargandoBase(true);
    try {
      await Promise.all(
        aCrear.map((t, i) =>
          api.post("tareas-fijas/", {
            nombre: t.nombre, oficina: oficinaSel, responsable: null,
            frecuencia: "diaria", dias_semana: "",
            hora_esperada: t.hora_esperada, margen_alerta: 15,
            requiere_foto: t.requiere_foto, activa: true, orden: tareasOficina.length + i,
          })
        )
      );
      toast.success(`${aCrear.length} tareas cargadas`);
      cargar();
    } catch {
      toast.error("No se pudieron cargar las base");
    } finally {
      setCargandoBase(false);
    }
  };

  const ofiActual = oficinas.find((o) => String(o.id) === String(oficinaSel));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-slate-900/80 to-slate-800/40 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-2xl text-violet-400">
          <HiClipboardCheck />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">Control diario por oficina</h2>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Tareas, horarios y días de cada sucursal</p>
        </div>
      </div>

      {/* Selector de oficina */}
      <div className="flex flex-wrap gap-2">
        {oficinas.map((o) => (
          <button
            key={o.id}
            onClick={() => setOficinaSel(String(o.id))}
            className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold transition ${
              String(oficinaSel) === String(o.id)
                ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                : "border-slate-700/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            <HiOfficeBuilding /> {o.nombre}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-violet-400" />
        </div>
      ) : !oficinaSel ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 text-center text-slate-400">
          No hay oficinas cargadas.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              {tareasOficina.length} tarea{tareasOficina.length === 1 ? "" : "s"} en <strong className="text-slate-200">{ofiActual?.nombre}</strong>
            </span>
            <div className="flex gap-2">
              {tareasOficina.length === 0 && (
                <button
                  onClick={cargarBase} disabled={cargandoBase}
                  className="flex items-center gap-1.5 rounded-xl border border-violet-500/40 px-3 py-2 text-[13px] font-bold text-violet-300 hover:bg-violet-500/10 disabled:opacity-50"
                >
                  {cargandoBase ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-400/40 border-t-violet-400" /> : <HiTemplate />}
                  Cargar lista base
                </button>
              )}
              <button
                onClick={() => abrir()}
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-violet-500"
              >
                <HiPlus /> Nueva
              </button>
            </div>
          </div>

          {tareasOficina.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-8 text-center text-slate-400">
              Esta oficina no tiene tareas. Tocá <strong className="text-violet-300">Cargar lista base</strong> para las 7 típicas, o <strong className="text-violet-300">Nueva</strong> para crear una.
            </div>
          ) : (
            <div className="space-y-2">
              {tareasOficina.map((it) => (
                <div key={it.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/40 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-100">{it.nombre}</span>
                      {!it.activa && <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">inactiva</span>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                      {it.responsable_nombre && <span>{it.responsable_nombre}</span>}
                      <span>{it.frecuencia}</span>
                      {it.hora_esperada && (
                        <span className="flex items-center gap-0.5 text-amber-400">
                          <HiClock /> {String(it.hora_esperada).slice(0, 5)} (+{it.margen_alerta}′)
                        </span>
                      )}
                      {it.requiere_foto && <span className="flex items-center gap-0.5 text-sky-400"><HiCamera /> foto</span>}
                    </div>
                  </div>
                  <button onClick={() => abrir(it)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><HiPencil /></button>
                  <button onClick={() => borrar(it)} className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10"><HiTrash /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={() => setModalOpen(false)}>
            <motion.div
              className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-slate-950 p-5 sm:rounded-2xl"
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">{editingId ? "Editar tarea" : "Nueva tarea"}</h3>
                <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5"><HiX className="text-xl" /></button>
              </div>
              <p className="mb-4 text-[12px] text-violet-300">{ofiActual?.nombre}</p>

              <div className="space-y-3">
                <Campo label="Nombre">
                  <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Abrir la cortina" className="inp" />
                </Campo>

                <Campo label="Responsable">
                  <select value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} className="inp">
                    <option value="">Sin asignar</option>
                    {usuarios.map((u) => <option key={u.id} value={u.id}>{nombreUsuario(u)}</option>)}
                  </select>
                </Campo>

                <Campo label="Frecuencia">
                  <div className="flex gap-2">
                    {[["diaria", "Diaria"], ["semanal", "Semanal"]].map(([k, l]) => (
                      <button key={k} type="button" onClick={() => setForm({ ...form, frecuencia: k })}
                        className={`flex-1 rounded-lg border py-2 text-sm font-semibold ${form.frecuencia === k ? "border-violet-500/50 bg-violet-500/15 text-violet-300" : "border-white/10 text-slate-400"}`}>{l}</button>
                    ))}
                  </div>
                </Campo>

                {form.frecuencia === "semanal" && (
                  <Campo label="Días">
                    <div className="flex flex-wrap gap-1.5">
                      {DIAS.map(([d, l]) => {
                        const on = (form.dias_semana || "").split(",").includes(d);
                        return (
                          <button key={d} type="button" onClick={() => toggleDia(d)}
                            className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold ${on ? "border-violet-500/50 bg-violet-500/15 text-violet-300" : "border-white/10 text-slate-400"}`}>{l}</button>
                        );
                      })}
                    </div>
                  </Campo>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Hora esperada">
                    <input type="time" value={form.hora_esperada} onChange={(e) => setForm({ ...form, hora_esperada: e.target.value })} className="inp" />
                  </Campo>
                  <Campo label="Margen (min)">
                    <input type="number" min="0" value={form.margen_alerta} disabled={!form.hora_esperada}
                      onChange={(e) => setForm({ ...form, margen_alerta: e.target.value })} className="inp disabled:opacity-40" />
                  </Campo>
                </div>
                <p className="-mt-1 text-[11px] text-slate-500">Si dejás la hora vacía, no alerta ni resta puntos por horario.</p>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={form.requiere_foto} onChange={(e) => setForm({ ...form, requiere_foto: e.target.checked })} /> Pide foto
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={form.activa} onChange={(e) => setForm({ ...form, activa: e.target.checked })} /> Activa
                  </label>
                </div>

                {form.hora_esperada && (
                  <label className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-2.5 text-sm text-emerald-200">
                    <input
                      type="checkbox" className="mt-0.5"
                      checked={form.premia_demora}
                      onChange={(e) => setForm({ ...form, premia_demora: e.target.checked })}
                    />
                    <span>
                      Cerrar tarde suma puntos (horas extra)
                      <span className="mt-0.5 block text-[11px] font-normal text-emerald-300/70">
                        Para tareas de cierre: cuanto más tarde, más puntos. No resta.
                      </span>
                    </span>
                  </label>
                )}

                {form.requiere_foto && (
                  <div>
                    <label className="mb-1 block text-[12px] font-semibold text-slate-400">¿Qué hay que fotografiar?</label>
                    <input
                      value={form.instruccion_foto}
                      onChange={(e) => setForm({ ...form, instruccion_foto: e.target.value })}
                      placeholder="Ej: la cortina abierta"
                      className="inp"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">Se le muestra al empleado cuando va a sacar la foto.</p>
                  </div>
                )}
              </div>

              <button onClick={guardar} disabled={saving}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50">
                {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <HiSave />}
                {editingId ? "Guardar cambios" : "Crear tarea"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .inp { width:100%; border-radius:0.6rem; border:1px solid rgba(255,255,255,.1);
          background:#0f172a; padding:0.55rem 0.7rem; font-size:0.85rem; color:#e2e8f0; outline:none; }
        .inp:focus { border-color:rgba(139,92,246,.5); }
      `}</style>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-slate-400">{label}</label>
      {children}
    </div>
  );
}