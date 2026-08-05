// src/components/admin/AdminTareasFijas.jsx
//
// Configuración del Control diario POR OFICINA: elegís una oficina y definís
// sus tareas (horario, días, foto, margen). Cada oficina tiene las suyas.
//
// 📱 RESPONSIVE (esta pasada):
//   - Chips de oficina: scroll horizontal cómodo en mobile (no se amontonan).
//   - Fila de tarea: nombre + info arriba y botones Editar/Borrar abajo a lo
//     ancho (antes eran íconos de 36px, difíciles de tocar). En sm+ vuelven a
//     ser íconos a la derecha como antes.
//   - Modal: inputs a 48px (.inp con más padding) para buen tap target y sin
//     zoom de iOS (font 16px). Botón guardar full-width.
import { useEffect, useMemo, useState, useCallback } from "react";
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
      <div className="flex items-center gap-4 rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-transferencia)] text-2xl text-white shadow-[0_4px_0_var(--color-transferencia-fuerte)]">
          <HiClipboardCheck />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-[var(--color-titulo)]">Control diario por oficina</h2>
          <p className="mt-0.5 text-[11px] font-bold text-[var(--color-suave)]">Tareas, horarios y días de cada sucursal</p>
        </div>
      </div>

      {/* Selector de oficina — scroll horizontal cómodo en mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {oficinas.map((o) => (
          <button
            key={o.id}
            onClick={() => setOficinaSel(String(o.id))}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl border-2 px-4 min-h-[44px] text-sm font-black transition ${
              String(oficinaSel) === String(o.id)
                ? "border-[var(--color-transferencia-fuerte)] bg-[var(--color-transferencia)] text-white shadow-[0_3px_0_var(--color-transferencia-fuerte)]"
                : "border-[var(--color-linea)] bg-[var(--color-card)] text-[var(--color-suave)] hover:text-[var(--color-titulo)]"
            }`}
          >
            <HiOfficeBuilding /> {o.nombre}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-linea)] border-t-[var(--color-transferencia)]" />
        </div>
      ) : !oficinaSel ? (
        <div className="rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-6 text-center font-semibold text-[var(--color-suave)]">
          No hay oficinas cargadas.
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-sm font-semibold text-[var(--color-suave)]">
              {tareasOficina.length} tarea{tareasOficina.length === 1 ? "" : "s"} en <strong className="text-[var(--color-titulo)]">{ofiActual?.nombre}</strong>
            </span>
            <div className="flex gap-2">
              {tareasOficina.length === 0 && (
                <button
                  onClick={cargarBase} disabled={cargandoBase}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-[var(--color-transferencia)] px-3 min-h-[44px] text-[13px] font-black text-[var(--color-transferencia)] transition hover:bg-[var(--color-transferencia)]/10 disabled:opacity-50"
                >
                  {cargandoBase ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-transferencia)]/40 border-t-[var(--color-transferencia)]" /> : <HiTemplate />}
                  Cargar lista base
                </button>
              )}
              <button
                onClick={() => abrir()}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-transferencia)] px-4 min-h-[44px] text-[13px] font-black text-white shadow-[0_4px_0_var(--color-transferencia-fuerte)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-transferencia-fuerte)]"
              >
                <HiPlus /> Nueva
              </button>
            </div>
          </div>

          {tareasOficina.length === 0 ? (
            <div className="rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-8 text-center font-semibold text-[var(--color-suave)]">
              Esta oficina no tiene tareas. Tocá <strong className="text-[var(--color-transferencia)]">Cargar lista base</strong> para las 7 típicas, o <strong className="text-[var(--color-transferencia)]">Nueva</strong> para crear una.
            </div>
          ) : (
            <div className="space-y-2">
              {tareasOficina.map((it) => (
                <div key={it.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-black text-[var(--color-titulo)]">{it.nombre}</span>
                      {!it.activa && <span className="rounded bg-[var(--color-linea)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-suave)]">inactiva</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[var(--color-suave)]">
                      {it.responsable_nombre && <span>{it.responsable_nombre}</span>}
                      <span>{it.frecuencia}</span>
                      {it.hora_esperada && (
                        <span className="flex items-center gap-0.5 text-[#d97706]">
                          <HiClock /> {String(it.hora_esperada).slice(0, 5)} (+{it.margen_alerta}′)
                        </span>
                      )}
                      {it.requiere_foto && <span className="flex items-center gap-0.5 text-[var(--color-oficina)]"><HiCamera /> foto</span>}
                    </div>
                  </div>
                  {/* 📱 En mobile: botones a lo ancho con texto. En sm+: íconos a la derecha. */}
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => abrir(it)} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:h-10 sm:w-10 px-3 sm:px-0 rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] text-[var(--color-suave)] font-black text-[13px] transition hover:border-[var(--color-oficina)] hover:text-[var(--color-oficina)]">
                      <HiPencil /> <span className="sm:hidden">Editar</span>
                    </button>
                    <button onClick={() => borrar(it)} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:h-10 sm:w-10 px-3 sm:px-0 rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] text-[var(--color-suave)] font-black text-[13px] transition hover:border-[var(--color-egreso)] hover:text-[var(--color-egreso)]">
                      <HiTrash /> <span className="sm:hidden">Borrar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setModalOpen(false)}>
          <div
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-black text-[var(--color-titulo)]">{editingId ? "Editar tarea" : "Nueva tarea"}</h3>
              <button onClick={() => setModalOpen(false)} aria-label="Cerrar" className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-[var(--color-suave)] hover:text-[var(--color-titulo)]"><HiX className="text-xl" /></button>
            </div>
            <p className="mb-4 text-[12px] font-black text-[var(--color-transferencia)]">{ofiActual?.nombre}</p>

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
                      className={`flex-1 rounded-xl border-2 py-2 text-sm font-black ${form.frecuencia === k ? "border-[var(--color-transferencia-fuerte)] bg-[var(--color-transferencia)] text-white" : "border-[var(--color-linea)] text-[var(--color-suave)]"}`}>{l}</button>
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
                          className={`rounded-xl border-2 px-2.5 py-1.5 text-[12px] font-black ${on ? "border-[var(--color-transferencia-fuerte)] bg-[var(--color-transferencia)] text-white" : "border-[var(--color-linea)] text-[var(--color-suave)]"}`}>{l}</button>
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
              <p className="-mt-1 text-[11px] font-medium text-[var(--color-suave)]">Si dejás la hora vacía, no alerta ni resta puntos por horario.</p>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-titulo)]">
                  <input type="checkbox" checked={form.requiere_foto} onChange={(e) => setForm({ ...form, requiere_foto: e.target.checked })} className="h-4 w-4 accent-[var(--color-transferencia)]" /> Pide foto
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-titulo)]">
                  <input type="checkbox" checked={form.activa} onChange={(e) => setForm({ ...form, activa: e.target.checked })} className="h-4 w-4 accent-[var(--color-transferencia)]" /> Activa
                </label>
              </div>

              {form.hora_esperada && (
                <label className="flex items-start gap-2 rounded-xl border-2 border-[var(--color-ingreso)]/30 bg-[var(--color-ingreso)]/10 p-2.5 text-sm font-semibold text-[var(--color-ingreso-fuerte)]">
                  <input
                    type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-ingreso)]"
                    checked={form.premia_demora}
                    onChange={(e) => setForm({ ...form, premia_demora: e.target.checked })}
                  />
                  <span>
                    Cerrar tarde suma puntos (horas extra)
                    <span className="mt-0.5 block text-[11px] font-normal opacity-80">
                      Para tareas de cierre: cuanto más tarde, más puntos. No resta.
                    </span>
                  </span>
                </label>
              )}

              {form.requiere_foto && (
                <div>
                  <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-[var(--color-suave)]">¿Qué hay que fotografiar?</label>
                  <input
                    value={form.instruccion_foto}
                    onChange={(e) => setForm({ ...form, instruccion_foto: e.target.value })}
                    placeholder="Ej: la cortina abierta"
                    className="inp"
                  />
                  <p className="mt-1 text-[11px] font-medium text-[var(--color-suave)]">Se le muestra al empleado cuando va a sacar la foto.</p>
                </div>
              )}
            </div>

            <button onClick={guardar} disabled={saving}
              className="mt-5 flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[var(--color-transferencia)] py-3 text-sm font-black text-white shadow-[0_4px_0_var(--color-transferencia-fuerte)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-transferencia-fuerte)] disabled:opacity-50">
              {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <HiSave />}
              {editingId ? "Guardar cambios" : "Crear tarea"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        /* 📱 h-12 (48px) + font 16px → tap target cómodo y sin zoom de iOS al enfocar.
           En sm+ el texto baja a 0.85rem para mantener el look compacto de escritorio. */
        .inp { width:100%; height:3rem; border-radius:0.75rem; border:2px solid var(--color-linea);
          background:var(--color-surface); padding:0 0.9rem; font-size:1rem;
          font-weight:600; color:var(--color-titulo); outline:none; }
        .inp:focus { border-color:var(--color-transferencia); }
        .dark .inp { color-scheme: dark; }
        @media (min-width: 640px) { .inp { font-size:0.85rem; } }
      `}</style>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-[var(--color-suave)]">{label}</label>
      {children}
    </div>
  );
}
