// src/components/admin/AdminCorreosBajas.jsx
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HiMail, HiPlus, HiPencil, HiTrash, HiCheck, HiX, HiRefresh, HiChevronDown } from "react-icons/hi";
import axios from "axios";
import toast from "react-hot-toast";

import { fetchAdminCompanias } from "../../store/slices/adminSlice";

const BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || "/api").replace(/\/+$/, "");

function getToken() {
  return localStorage.getItem("access_token") || localStorage.getItem("token") || "";
}

function headers() {
  return { Authorization: `Bearer ${getToken()}` };
}

const EMPTY = { compania: "", email: "", dias_gracia: 3 };

// ─── Fila de tabla ────────────────────────────────────────────────────────────

function FilaCorreo({ correo, onEdit, onDelete }) {
  return (
    <tr className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group">
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-slate-100">{correo.compania}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <HiMail className="text-slate-500 text-sm shrink-0" />
          <span className="text-sm text-slate-300 font-mono">{correo.email}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          {correo.dias_gracia} {correo.dias_gracia === 1 ? "día" : "días"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(correo)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            title="Editar"
          >
            <HiPencil className="text-sm" />
          </button>
          <button
            onClick={() => onDelete(correo)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Eliminar"
          >
            <HiTrash className="text-sm" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Modal crear / editar ─────────────────────────────────────────────────────

function ModalCorreo({ correo, companiasCatalogo, onClose, onSaved }) {
  const isNew = !correo?.id;
  const [form, setForm] = useState(correo || EMPTY);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.compania.trim())              e.compania    = "Seleccioná una compañía";
    if (!form.email.trim()) {
      e.email = "Requerido";
    } else {
      // Acepta uno o varios emails separados por coma / punto y coma
      const lista = form.email.split(/[,;]+/).map((x) => x.trim()).filter(Boolean);
      const invalido = lista.find((x) => !/\S+@\S+\.\S+/.test(x));
      if (lista.length === 0) e.email = "Requerido";
      else if (invalido) e.email = `Email inválido: ${invalido}`;
    }
    if (!form.dias_gracia || form.dias_gracia < 1) e.dias_gracia = "Mínimo 1 día";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (isNew) {
        await axios.post(`${BASE}/bajas/correos/`, form, { headers: headers() });
        toast.success("Correo creado correctamente");
      } else {
        await axios.put(`${BASE}/bajas/correos/${correo.id}/`, form, { headers: headers() });
        toast.success("Correo actualizado");
      }
      onSaved();
    } catch (err) {
      const data = err.response?.data;
      if (data?.compania) toast.error(`Compañía: ${Array.isArray(data.compania) ? data.compania[0] : data.compania}`);
      else if (data?.email) toast.error(`Email: ${Array.isArray(data.email) ? data.email[0] : data.email}`);
      else toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <HiMail className="text-rose-400 text-base" />
            </div>
            <p className="text-sm font-semibold text-slate-200">
              {isNew ? "Agregar correo de compañía" : `Editar — ${correo.compania}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <HiX />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5 space-y-4">

          {/* Compañía — selector del catálogo */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Compañía
            </label>
            <div className="relative">
              <select
                value={form.compania}
                onChange={(e) => set("compania", e.target.value)}
                disabled={!isNew} // en edición no se puede cambiar la compañía
                className="w-full appearance-none bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-rose-500/50 focus:outline-none transition-colors pr-9 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Seleccioná una compañía...</option>
                {companiasCatalogo.map((c) => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <HiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none" />
            </div>
            {errors.compania && <p className="text-xs text-rose-400 mt-1">{errors.compania}</p>}
            {!isNew && (
              <p className="text-xs text-slate-600 mt-1">La compañía no se puede cambiar una vez creada.</p>
            )}
            {companiasCatalogo.length === 0 && (
              <p className="text-xs text-amber-400 mt-1">
                No hay compañías en el catálogo. Cargalas desde la pestaña "Catálogos".
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Correo(s) de bajas
            </label>
            <input
              type="text"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="bajas@compania.com.ar, mesa@compania.com.ar"
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm placeholder:text-slate-600 focus:border-rose-500/50 focus:outline-none transition-colors font-mono"
            />
            {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email}</p>}
            <p className="text-xs text-slate-600 mt-1">
              A estos correos se mandarán las solicitudes de baja cuando haya mora. Podés poner varios separados por coma.
            </p>
          </div>

          {/* Días de gracia */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Días de mora mínimos
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={90}
                value={form.dias_gracia}
                onChange={(e) => set("dias_gracia", Number(e.target.value))}
                className="w-24 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm text-center focus:border-rose-500/50 focus:outline-none transition-colors"
              />
              <p className="text-xs text-slate-500 flex-1">
                Pólizas con mora menor a este valor no entran al proceso de baja para esta compañía.
              </p>
            </div>
            {errors.dias_gracia && <p className="text-xs text-rose-400 mt-1">{errors.dias_gracia}</p>}
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-[2] py-2.5 rounded-xl text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border border-slate-400 border-t-slate-800 rounded-full animate-spin" />
            ) : (
              <HiCheck className="text-sm" />
            )}
            {isNew ? "Crear correo" : "Guardar cambios"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminCorreosBajas() {
  const dispatch = useDispatch();
  const { companias: companiasCatalogo = [] } = useSelector((state) => state.admin);

  const [correos, setCorreos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Cargamos el catálogo de compañías si no está ya en el store
  useEffect(() => {
    dispatch(fetchAdminCompanias());
  }, [dispatch]);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${BASE}/bajas/correos/`, { headers: headers() });
      setCorreos(Array.isArray(data) ? data : data.results || []);
    } catch {
      toast.error("Error al cargar los correos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleSaved = () => { setModal(null); cargar(); };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await axios.delete(`${BASE}/bajas/correos/${confirmDelete.id}/`, { headers: headers() });
      toast.success("Correo eliminado");
      setConfirmDelete(null);
      cargar();
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  // Compañías del catálogo que todavía no tienen correo configurado
  const companiasSinCorreo = companiasCatalogo.filter(
    (c) => !correos.some((r) => r.compania === c.nombre)
  );

  return (
    <div className="space-y-6">

      {/* Header sección */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <HiMail className="text-rose-400" /> Correos de bajas por compañía
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Configurá a qué email se notifica cada compañía cuando hay pólizas con mora.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargar}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            title="Actualizar"
          >
            <HiRefresh className={`text-base ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setModal({})}
            disabled={companiasSinCorreo.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            title={companiasSinCorreo.length === 0 ? "Todas las compañías ya tienen correo configurado" : ""}
          >
            <HiPlus className="text-base" /> Agregar compañía
          </button>
        </div>
      </div>

      {/* Alerta si quedan compañías sin correo */}
      {companiasCatalogo.length > 0 && companiasSinCorreo.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 flex items-start gap-3">
          <span className="text-amber-400 text-sm shrink-0 mt-0.5">⚠</span>
          <p className="text-xs text-amber-300">
            <span className="font-semibold">{companiasSinCorreo.length} compañía{companiasSinCorreo.length > 1 ? "s" : ""} sin correo configurado:</span>{" "}
            {companiasSinCorreo.map((c) => c.nombre).join(", ")}.
            Sin correo, el sistema no puede notificar la baja a esa compañía.
          </p>
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">

        {/* Cabecera */}
        <div className="grid grid-cols-4 px-4 py-3 bg-slate-900/80 border-b border-slate-800">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Compañía</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Email destino</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 text-center">Días mínimos</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 text-right">Acciones</span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-5 h-5 border border-slate-600 border-t-slate-300 rounded-full animate-spin" />
          </div>
        ) : correos.length === 0 ? (
          <div className="py-12 text-center">
            <HiMail className="text-slate-700 text-3xl mx-auto mb-3" />
            <p className="text-sm text-slate-600">No hay compañías configuradas</p>
            <p className="text-xs text-slate-700 mt-1">
              Agregá una para que el sistema pueda enviar emails de baja.
            </p>
            <button
              onClick={() => setModal({})}
              className="mt-4 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors text-sm font-semibold"
            >
              <HiPlus className="inline mr-1" /> Agregar primera compañía
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <tbody className="divide-y divide-slate-800/50">
              {correos.map((c) => (
                <FilaCorreo
                  key={c.id}
                  correo={c}
                  onEdit={(item) => setModal(item)}
                  onDelete={(item) => setConfirmDelete(item)}
                />
              ))}
            </tbody>
          </table>
        )}

        {correos.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-800/60 bg-slate-900/60">
            <span className="text-xs text-slate-700">
              {correos.length} de {companiasCatalogo.length} compañía{companiasCatalogo.length !== 1 ? "s" : ""} configurada{correos.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {modal !== null && (
        <ModalCorreo
          correo={modal?.id ? modal : null}
          companiasCatalogo={modal?.id ? companiasCatalogo : companiasSinCorreo}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Modal confirmar eliminación */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-6 py-5">
              <p className="text-sm font-semibold text-slate-200 mb-2">¿Eliminar correo?</p>
              <p className="text-sm text-slate-400">
                Vas a eliminar el correo de{" "}
                <span className="text-slate-200 font-semibold">{confirmDelete.compania}</span>.
                El sistema ya no podrá enviar notificaciones de baja a esta compañía.
              </p>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-xs text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-[2] py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <span className="w-4 h-4 border border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <HiTrash className="text-sm" />
                )}
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}