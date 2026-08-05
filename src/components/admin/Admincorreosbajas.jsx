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
    <tr className="group border-b-2 border-[var(--color-linea)] last:border-b-0 hover:bg-[var(--color-surface)]">
      <td className="px-4 py-3">
        <p className="text-sm font-black text-[var(--color-titulo)]">{correo.compania}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <HiMail className="shrink-0 text-sm text-[var(--color-suave)]" />
          <span className="font-mono text-sm text-[var(--color-titulo)]">{correo.email}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center rounded-full border-2 border-[var(--color-tarjeta)]/30 bg-[var(--color-tarjeta)]/15 px-2.5 py-0.5 text-xs font-black text-[#d97706]">
          {correo.dias_gracia} {correo.dias_gracia === 1 ? "día" : "días"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onEdit(correo)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] text-[var(--color-suave)] transition hover:border-[var(--color-oficina)] hover:text-[var(--color-oficina)]"
            title="Editar"
          >
            <HiPencil className="text-sm" />
          </button>
          <button
            onClick={() => onDelete(correo)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] text-[var(--color-suave)] transition hover:border-[var(--color-egreso)] hover:text-[var(--color-egreso)]"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] shadow-2xl">

        {/* Header modal */}
        <div className="flex items-center justify-between border-b-2 border-[var(--color-linea)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-egreso)] text-white shadow-[0_3px_0_var(--color-egreso-fuerte)]">
              <HiMail className="text-base" />
            </div>
            <p className="text-sm font-black text-[var(--color-titulo)]">
              {isNew ? "Agregar correo de compañía" : `Editar — ${correo.compania}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-suave)] transition-colors hover:text-[var(--color-titulo)]"
          >
            <HiX />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="space-y-4 px-6 py-5">

          {/* Compañía — selector del catálogo */}
          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-[var(--color-suave)]">
              Compañía
            </label>
            <div className="relative">
              <select
                value={form.compania}
                onChange={(e) => set("compania", e.target.value)}
                disabled={!isNew} // en edición no se puede cambiar la compañía
                className="w-full appearance-none rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 pr-9 text-sm font-semibold text-[var(--color-titulo)] outline-none transition-colors focus:border-[var(--color-egreso)] disabled:cursor-not-allowed disabled:opacity-50 dark:[color-scheme:dark]"
              >
                <option value="">Seleccioná una compañía...</option>
                {companiasCatalogo.map((c) => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <HiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-suave)]" />
            </div>
            {errors.compania && <p className="mt-1 text-xs font-bold text-[var(--color-egreso)]">{errors.compania}</p>}
            {!isNew && (
              <p className="mt-1 text-xs text-[var(--color-suave)]">La compañía no se puede cambiar una vez creada.</p>
            )}
            {companiasCatalogo.length === 0 && (
              <p className="mt-1 text-xs font-bold text-[#d97706]">
                No hay compañías en el catálogo. Cargalas desde la pestaña "Aseguradoras".
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-[var(--color-suave)]">
              Correo(s) de bajas
            </label>
            <input
              type="text"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="bajas@compania.com.ar, mesa@compania.com.ar"
              className="w-full rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 font-mono text-sm text-[var(--color-titulo)] outline-none transition-colors placeholder:text-[var(--color-suave)] focus:border-[var(--color-egreso)]"
            />
            {errors.email && <p className="mt-1 text-xs font-bold text-[var(--color-egreso)]">{errors.email}</p>}
            <p className="mt-1 text-xs text-[var(--color-suave)]">
              A estos correos se mandarán las solicitudes de baja cuando haya mora. Podés poner varios separados por coma.
            </p>
          </div>

          {/* Días de gracia */}
          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-[var(--color-suave)]">
              Días de mora mínimos
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={90}
                value={form.dias_gracia}
                onChange={(e) => set("dias_gracia", Number(e.target.value))}
                className="w-24 rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-center text-sm font-bold text-[var(--color-titulo)] outline-none transition-colors focus:border-[var(--color-egreso)]"
              />
              <p className="flex-1 text-xs text-[var(--color-suave)]">
                Pólizas con mora menor a este valor no entran al proceso de baja para esta compañía.
              </p>
            </div>
            {errors.dias_gracia && <p className="mt-1 text-xs font-bold text-[var(--color-egreso)]">{errors.dias_gracia}</p>}
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t-2 border-[var(--color-linea)] px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-[var(--color-linea)] py-2.5 text-xs font-black text-[var(--color-suave)] transition-colors hover:text-[var(--color-titulo)]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-[var(--color-egreso)] py-2.5 text-xs font-black text-white shadow-[0_4px_0_var(--color-egreso-fuerte)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-egreso-fuerte)] disabled:opacity-40"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
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
    <div className="space-y-5">

      {/* Header sección */}
      <div className="flex items-center justify-between rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-[var(--color-titulo)]">
            <HiMail className="text-[var(--color-egreso)]" /> Correos de bajas por compañía
          </h2>
          <p className="mt-1 text-sm font-semibold text-[var(--color-suave)]">
            Configurá a qué email se notifica cada compañía cuando hay pólizas con mora.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargar}
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] text-[var(--color-suave)] transition hover:text-[var(--color-titulo)]"
            title="Actualizar"
          >
            <HiRefresh className={`text-base ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setModal({})}
            disabled={companiasSinCorreo.length === 0}
            className="flex items-center gap-2 rounded-xl bg-[var(--color-egreso)] px-4 py-2.5 text-sm font-black text-white shadow-[0_4px_0_var(--color-egreso-fuerte)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-egreso-fuerte)] disabled:cursor-not-allowed disabled:opacity-40"
            title={companiasSinCorreo.length === 0 ? "Todas las compañías ya tienen correo configurado" : ""}
          >
            <HiPlus className="text-base" /> Agregar compañía
          </button>
        </div>
      </div>

      {/* Alerta si quedan compañías sin correo */}
      {companiasCatalogo.length > 0 && companiasSinCorreo.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-[var(--color-tarjeta)]/30 bg-[var(--color-tarjeta)]/10 p-3">
          <span className="mt-0.5 shrink-0 text-sm text-[#d97706]">⚠</span>
          <p className="text-xs font-semibold text-[#d97706]">
            <span className="font-black">{companiasSinCorreo.length} compañía{companiasSinCorreo.length > 1 ? "s" : ""} sin correo configurado:</span>{" "}
            {companiasSinCorreo.map((c) => c.nombre).join(", ")}.
            Sin correo, el sistema no puede notificar la baja a esa compañía.
          </p>
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)]">

        {/* Cabecera */}
        <div className="grid grid-cols-4 border-b-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-4 py-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-suave)]">Compañía</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-suave)]">Email destino</span>
          <span className="text-center text-[10px] font-black uppercase tracking-widest text-[var(--color-suave)]">Días mínimos</span>
          <span className="text-right text-[10px] font-black uppercase tracking-widest text-[var(--color-suave)]">Acciones</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-linea)] border-t-[var(--color-egreso)]" />
          </div>
        ) : correos.length === 0 ? (
          <div className="py-12 text-center">
            <HiMail className="mx-auto mb-3 text-3xl text-[var(--color-suave)]" />
            <p className="text-sm font-bold text-[var(--color-suave)]">No hay compañías configuradas</p>
            <p className="mt-1 text-xs text-[var(--color-suave)]">
              Agregá una para que el sistema pueda enviar emails de baja.
            </p>
            <button
              onClick={() => setModal({})}
              className="mt-4 inline-flex items-center gap-1 rounded-xl bg-[var(--color-egreso)] px-4 py-2.5 text-sm font-black text-white shadow-[0_4px_0_var(--color-egreso-fuerte)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-egreso-fuerte)]"
            >
              <HiPlus /> Agregar primera compañía
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
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
          <div className="border-t-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-4 py-3">
            <span className="text-xs font-semibold text-[var(--color-suave)]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] shadow-2xl">
            <div className="px-6 py-5">
              <p className="mb-2 text-sm font-black text-[var(--color-titulo)]">¿Eliminar correo?</p>
              <p className="text-sm text-[var(--color-suave)]">
                Vas a eliminar el correo de{" "}
                <span className="font-black text-[var(--color-titulo)]">{confirmDelete.compania}</span>.
                El sistema ya no podrá enviar notificaciones de baja a esta compañía.
              </p>
            </div>
            <div className="flex gap-3 border-t-2 border-[var(--color-linea)] px-6 py-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border-2 border-[var(--color-linea)] py-2.5 text-xs font-black text-[var(--color-suave)] transition-colors hover:text-[var(--color-titulo)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-[var(--color-egreso)] py-2.5 text-xs font-black text-white shadow-[0_4px_0_var(--color-egreso-fuerte)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-egreso-fuerte)] disabled:opacity-40"
              >
                {deleting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
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
