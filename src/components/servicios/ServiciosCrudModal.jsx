// src/components/servicios/ServiciosCrudModal.jsx  (diseño Duo)
import { useState, useEffect, useMemo, Fragment } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import {
  HiX,
  HiPlus,
  HiPencil,
  HiTrash,
  HiCheck,
  HiArrowLeft,
  HiTag,
  HiCog,
  HiOutlineLightningBolt,
  HiOutlineWifi,
  HiOutlineHome,
  HiOutlinePhone,
  HiOutlineCash,
  HiOutlineFire,
  HiOutlineCloud,
} from "react-icons/hi";
import { toast } from "react-toastify";

import {
  fetchServicios,
  createServicio,
  updateServicio,
  deleteServicio,
  generarPagosMes,
  fetchPagosMes,
  fetchResumenMes,
  fetchCategoriasServicio,
  createCategoriaServicio,
  updateCategoriaServicio,
  deleteCategoriaServicio,
} from "../../store/slices/serviciosSlice";
import { fetchAdminOficinas } from "../../store/slices/adminSlice";

const getIcon = (nombre = "") => {
  const n = nombre.toLowerCase();
  if (n.includes("luz") || n.includes("edenor") || n.includes("edesur")) return HiOutlineLightningBolt;
  if (n.includes("internet") || n.includes("wifi")) return HiOutlineWifi;
  if (n.includes("alquiler")) return HiOutlineHome;
  if (n.includes("telefono") || n.includes("celular")) return HiOutlinePhone;
  if (n.includes("gas")) return HiOutlineFire;
  if (n.includes("agua")) return HiOutlineCloud;
  return HiOutlineCash;
};

const COLORES_CATEGORIA = [
  { value: "sky", label: "Celeste", cls: "bg-sky-500" },
  { value: "emerald", label: "Verde", cls: "bg-emerald-500" },
  { value: "amber", label: "Amarillo", cls: "bg-amber-500" },
  { value: "rose", label: "Rojo", cls: "bg-rose-500" },
  { value: "violet", label: "Violeta", cls: "bg-violet-500" },
  { value: "orange", label: "Naranja", cls: "bg-orange-500" },
  { value: "teal", label: "Turquesa", cls: "bg-teal-500" },
  { value: "slate", label: "Gris", cls: "bg-slate-500" },
];

const COLOR_MAP = {
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  orange: "bg-orange-500",
  teal: "bg-teal-500",
  slate: "bg-slate-500",
};

export default function ServiciosCrudModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { servicios, categorias } = useSelector((s) => s.servicios);
  const oficinas = useSelector((s) => s.admin?.oficinas || []);

  // 'lista' | 'form' | 'categoria-form'
  const [vista, setVista] = useState("lista");
  const [tab, setTab] = useState("servicios"); // 'servicios' | 'categorias'
  const [editando, setEditando] = useState(null);
  const [categoriaEditando, setCategoriaEditando] = useState(null);

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchServicios({}));
      dispatch(fetchAdminOficinas());
      dispatch(fetchCategoriasServicio({}));
    }
  }, [isOpen, dispatch]);

  useEffect(() => {
    if (!isOpen) {
      setVista("lista");
      setTab("servicios");
      setEditando(null);
      setCategoriaEditando(null);
    }
  }, [isOpen]);

  const handleEliminarServicio = async (s) => {
    if (!confirm(`¿Eliminar "${s.nombre}"?\n\nSe borrarán los pagos relacionados.`)) return;
    try {
      await dispatch(deleteServicio(s.id)).unwrap();
      toast.success("Servicio eliminado");
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  const handleEliminarCategoria = async (c) => {
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return;
    try {
      await dispatch(deleteCategoriaServicio(c.id)).unwrap();
      toast.success("Categoría eliminada");
    } catch (err) {
      const msg = err?.error || err?.detail || "No se pudo eliminar";
      toast.error(typeof msg === "string" ? msg : "Error al eliminar");
    }
  };

  if (!isOpen) return null;

  const enForm = vista === "form" || vista === "categoria-form";
  const tituloVista = (() => {
    if (vista === "form") return editando ? "Editar servicio" : "Nuevo servicio";
    if (vista === "categoria-form") return categoriaEditando ? "Editar categoría" : "Nueva categoría";
    return "Gestionar";
  })();
  const subtitulo = (() => {
    if (vista === "form") return editando ? editando.nombre : "Servicio fijo";
    if (vista === "categoria-form") return categoriaEditando ? categoriaEditando.nombre : "Categoría";
    return tab === "servicios" ? "Servicios" : "Categorías";
  })();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-slate-900/80 dark:bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden"
        >
          {/* HEADER */}
          <div className="flex items-center gap-3 px-5 py-4 border-b-2 border-linea dark:border-linea-dark shrink-0">
            {enForm && (
              <button
                onClick={() => setVista("lista")}
                className="w-10 h-10 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark hover:border-oficina flex items-center justify-center text-suave dark:text-suave-dark hover:text-oficina transition-colors shrink-0"
              >
                <HiArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-suave dark:text-suave-dark uppercase tracking-wider mb-0.5 font-black">
                {tituloVista}
              </p>
              <h2 className="text-lg font-black text-titulo dark:text-titulo-dark truncate">
                {subtitulo}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark hover:border-egreso hover:text-egreso flex items-center justify-center text-suave dark:text-suave-dark transition-colors shrink-0"
            >
              <HiX className="w-4 h-4" />
            </button>
          </div>

          {/* TABS (solo en vista lista) */}
          {vista === "lista" && (
            <div className="flex gap-1 px-5 pt-3 border-b-2 border-linea dark:border-linea-dark shrink-0">
              <button
                onClick={() => setTab("servicios")}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-black border-b-[3px] transition ${
                  tab === "servicios"
                    ? "border-oficina text-oficina"
                    : "border-transparent text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"
                }`}
              >
                <HiCog className="w-4 h-4" />
                Servicios
                <span className="text-[10px] bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark rounded-lg px-1.5 py-0.5 font-black">
                  {servicios.length}
                </span>
              </button>
              <button
                onClick={() => setTab("categorias")}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-black border-b-[3px] transition ${
                  tab === "categorias"
                    ? "border-oficina text-oficina"
                    : "border-transparent text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"
                }`}
              >
                <HiTag className="w-4 h-4" />
                Categorías
                <span className="text-[10px] bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark rounded-lg px-1.5 py-0.5 font-black">
                  {categorias.length}
                </span>
              </button>
            </div>
          )}

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto">
            {vista === "lista" && tab === "servicios" && (
              <ListaServicios
                servicios={servicios}
                onNuevo={() => { setEditando(null); setVista("form"); }}
                onEditar={(s) => { setEditando(s); setVista("form"); }}
                onEliminar={handleEliminarServicio}
              />
            )}

            {vista === "lista" && tab === "categorias" && (
              <ListaCategorias
                categorias={categorias}
                onNueva={() => { setCategoriaEditando(null); setVista("categoria-form"); }}
                onEditar={(c) => { setCategoriaEditando(c); setVista("categoria-form"); }}
                onEliminar={handleEliminarCategoria}
              />
            )}

            {vista === "form" && (
              <FormServicio
                servicio={editando}
                oficinas={oficinas}
                categorias={categorias}
                onCancel={() => setVista("lista")}
                onSaved={() => { setVista("lista"); setEditando(null); }}
                onIrACategorias={() => { setTab("categorias"); setVista("lista"); }}
              />
            )}

            {vista === "categoria-form" && (
              <FormCategoria
                categoria={categoriaEditando}
                onCancel={() => setVista("lista")}
                onSaved={() => { setVista("lista"); setCategoriaEditando(null); }}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ════════════════════════════════════════════════════════════
// LISTA SERVICIOS
// ════════════════════════════════════════════════════════════
function ListaServicios({ servicios, onNuevo, onEditar, onEliminar }) {
  if (servicios.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-oficina/10 border-2 border-oficina/30 flex items-center justify-center">
          <HiOutlineCash className="w-7 h-7 text-oficina" />
        </div>
        <p className="text-sm font-bold text-suave dark:text-suave-dark mb-5">Sin servicios cargados</p>
        <button
          onClick={onNuevo}
          className="inline-flex items-center gap-2 px-4 h-11 rounded-2xl text-sm font-black bg-oficina text-white border-2 border-oficina shadow-[0_5px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 transition-all"
        >
          <HiPlus className="w-4 h-4" />
          Agregar primero
        </button>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="space-y-2 mb-3">
        {servicios.map((s) => {
          const Icon = getIcon(s.nombre);
          return (
            <div
              key={s.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-surface dark:bg-surface-dark hover:bg-oficina/5 border-2 border-linea dark:border-linea-dark transition group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 ${
                s.activo
                  ? "bg-oficina/10 text-oficina border-oficina/30"
                  : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark"
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-black truncate text-sm ${
                    s.activo ? "text-titulo dark:text-titulo-dark" : "text-suave dark:text-suave-dark"
                  }`}>
                    {s.nombre}
                  </p>
                  {!s.activo && (
                    <span className="text-[9px] bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark px-1.5 py-0.5 rounded uppercase tracking-wider font-black">
                      Pausado
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-suave dark:text-suave-dark">
                  Día {s.dia_vencimiento} · {s.categoria || "Sin categoría"}
                  {s.monto_estimado > 0 && (
                    <span className="ml-1">· ${Number(s.monto_estimado).toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-0.5 opacity-50 group-hover:opacity-100 transition">
                <button
                  onClick={() => onEditar(s)}
                  className="w-9 h-9 rounded-xl hover:bg-oficina/10 hover:text-oficina flex items-center justify-center text-suave dark:text-suave-dark transition-colors"
                >
                  <HiPencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEliminar(s)}
                  className="w-9 h-9 rounded-xl hover:bg-egreso/10 hover:text-egreso flex items-center justify-center text-suave dark:text-suave-dark transition-colors"
                >
                  <HiTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onNuevo}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-linea dark:border-linea-dark hover:border-oficina hover:bg-oficina/5 text-sm font-black text-suave dark:text-suave-dark hover:text-oficina transition-colors flex items-center justify-center gap-2"
      >
        <HiPlus className="w-4 h-4" />
        Agregar servicio
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// LISTA CATEGORÍAS
// ════════════════════════════════════════════════════════════
function ListaCategorias({ categorias, onNueva, onEditar, onEliminar }) {
  if (categorias.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-oficina/10 border-2 border-oficina/30 flex items-center justify-center">
          <HiTag className="w-7 h-7 text-oficina" />
        </div>
        <p className="text-sm font-black text-titulo dark:text-titulo-dark mb-2">Sin categorías</p>
        <p className="text-xs font-bold text-suave dark:text-suave-dark mb-5 max-w-xs mx-auto">
          Creá categorías para organizar tus servicios (Ej: Servicios Públicos, Alquileres, Internet)
        </p>
        <button
          onClick={onNueva}
          className="inline-flex items-center gap-2 px-4 h-11 rounded-2xl text-sm font-black bg-oficina text-white border-2 border-oficina shadow-[0_5px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 transition-all"
        >
          <HiPlus className="w-4 h-4" />
          Crear primera categoría
        </button>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="space-y-2 mb-3">
        {categorias.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-surface dark:bg-surface-dark hover:bg-oficina/5 border-2 border-linea dark:border-linea-dark transition group"
          >
            <div className={`w-3 h-10 rounded-full shrink-0 ${COLOR_MAP[c.color] || "bg-sky-500"}`} />
            <div className="flex-1 min-w-0">
              <p className={`font-black truncate text-sm ${
                c.activo ? "text-titulo dark:text-titulo-dark" : "text-suave dark:text-suave-dark"
              }`}>
                {c.nombre}
              </p>
              <p className="text-xs font-bold text-suave dark:text-suave-dark">
                {c.cantidad_servicios} servicio{c.cantidad_servicios !== 1 ? "s" : ""} usándola
                {!c.activo && " · pausada"}
              </p>
            </div>
            <div className="flex items-center gap-0.5 opacity-50 group-hover:opacity-100 transition">
              <button
                onClick={() => onEditar(c)}
                className="w-9 h-9 rounded-xl hover:bg-oficina/10 hover:text-oficina flex items-center justify-center text-suave dark:text-suave-dark transition-colors"
              >
                <HiPencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onEliminar(c)}
                className="w-9 h-9 rounded-xl hover:bg-egreso/10 hover:text-egreso flex items-center justify-center text-suave dark:text-suave-dark transition-colors"
              >
                <HiTrash className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNueva}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-linea dark:border-linea-dark hover:border-oficina hover:bg-oficina/5 text-sm font-black text-suave dark:text-suave-dark hover:text-oficina transition-colors flex items-center justify-center gap-2"
      >
        <HiPlus className="w-4 h-4" />
        Agregar categoría
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FORM SERVICIO
// ════════════════════════════════════════════════════════════
// 🚀 Monto con separador de miles (es-AR): 20000 -> "20.000"
const montoToDisplay = (raw) => {
  if (raw === "" || raw == null) return "";
  const [i, d] = String(raw).split(".");
  const f = (i || "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return d != null ? `${f},${d}` : f;
};
const montoFromInput = (t) => {
  const c = String(t).replace(/[^\d,]/g, "");
  const [i, ...r] = c.split(",");
  const d = r.length ? r.join("").slice(0, 2) : null;
  return d != null ? `${i}.${d}` : i;
};

const PASOS_SERVICIO = [
  { n: 1, label: "Servicio" },
  { n: 2, label: "Detalles" },
];

function FormServicio({ servicio, oficinas, categorias, onCancel, onSaved, onIrACategorias }) {
  const dispatch = useDispatch();
  const esEdit = !!servicio;

  const categoriasActivas = useMemo(
    () => categorias.filter((c) => c.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [categorias]
  );

  // Blindaje: las oficinas siempre como array (evita crash si vienen raras)
  const ofiList = Array.isArray(oficinas) ? oficinas : [];

  const [nombre, setNombre] = useState(servicio?.nombre || "");
  const [proveedor, setProveedor] = useState(servicio?.proveedor || "");
  const [categoria, setCategoria] = useState(servicio?.categoria || "");
  const [diaVencimiento, setDiaVencimiento] = useState(servicio?.dia_vencimiento || 10);
  const [oficinaId, setOficinaId] = useState(servicio?.oficina || "");
  const [activo, setActivo] = useState(servicio?.activo ?? true);
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { toast.error("Ingresá un nombre"); return; }
    if (!categoria.trim()) { toast.error("Elegí una categoría"); return; }
    const dia = Number(diaVencimiento);
    if (!dia || dia < 1 || dia > 31) { toast.error("Día de vencimiento inválido (1-31)"); return; }

    const data = {
      nombre: nombre.trim(),
      proveedor: proveedor.trim(),
      categoria: categoria.trim(),
      dia_vencimiento: dia,
      monto_estimado: 0, // el monto real se carga al pagar
      oficina: oficinaId || null,
      activo,
    };

    try {
      setGuardando(true);
      if (esEdit) {
        await dispatch(updateServicio({ id: servicio.id, ...data })).unwrap();
        toast.success("Actualizado");
      } else {
        await dispatch(createServicio(data)).unwrap();
        toast.success("Servicio creado");

        // Generar pago del mes actual automáticamente
        const hoy = dayjs();
        const periodo = hoy.format("YYYY-MM");
        try {
          const res = await dispatch(generarPagosMes({ anio: hoy.year(), mes: hoy.month() + 1 })).unwrap();
          if (res.creados > 0) {
            toast("✨ Pago del mes generado automáticamente");
            dispatch(fetchPagosMes({ periodo }));
            dispatch(fetchResumenMes({ periodo }));
          }
        } catch {}
      }
      onSaved();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const inputCls = "w-full px-3 h-11 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark focus:border-oficina focus:outline-none text-sm font-bold text-titulo dark:text-titulo-dark transition-colors dark:[color-scheme:dark]";

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <Field label="Nombre del servicio" required>
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Luz, Internet, Alquiler" className={inputCls} autoFocus />
      </Field>

      <Field label="Proveedor">
        <input type="text" value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="Ej: Edenor S.A." className={inputCls} />
      </Field>

      <Field label="Categoría" required>
        {categoriasActivas.length > 0 ? (
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="">Seleccionar categoría...</option>
            {categoriasActivas.map((c) => (
              <option key={c.id} value={c.nombre}>{c.nombre}</option>
            ))}
          </select>
        ) : (
          <>
            <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Sin categorías cargadas..." className={inputCls} />
            <button type="button" onClick={onIrACategorias} className="text-[11px] font-black text-oficina hover:underline mt-1 inline-flex items-center gap-1">
              💡 Crear categorías para reutilizar
            </button>
          </>
        )}
      </Field>

      <Field label="Día de vencimiento" required>
        <input type="number" min={1} max={31} value={diaVencimiento} onChange={(e) => setDiaVencimiento(e.target.value)} className={`${inputCls} text-center font-black text-lg`} />
      </Field>
      <p className="text-[11px] font-bold text-suave dark:text-suave-dark italic -mt-2">
        Te avisamos 3 días antes del vencimiento ✨ · El monto lo cargás al pagar (estos gastos suelen variar).
      </p>

      {ofiList.length > 0 && (
        <Field label="Sucursal">
          <select value={oficinaId} onChange={(e) => setOficinaId(e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="">Sin asignar</option>
            {ofiList.map((o) => (
              <option key={o.id} value={o.id}>{o.nombre}</option>
            ))}
          </select>
        </Field>
      )}

      {!oficinaId && (
        <div className="rounded-2xl border-2 border-tarjeta/40 bg-tarjeta/10 px-3 py-2 text-[11px] font-bold text-tarjeta dark:text-tarjeta-claro">
          ⚠️ Sin sucursal, el gasto no va a sumar en la caja de ninguna oficina.
        </div>
      )}

      <label className="flex items-center justify-between p-3 rounded-2xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark cursor-pointer hover:border-oficina transition-colors">
        <div>
          <p className="font-black text-sm text-titulo dark:text-titulo-dark">Servicio activo</p>
          <p className="text-xs font-bold text-suave dark:text-suave-dark mt-0.5">
            {activo ? "Se generan pagos cada mes" : "No se generan pagos"}
          </p>
        </div>
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="w-5 h-5 accent-[var(--color-oficina)]" />
      </label>

      {/* Footer */}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 h-11 rounded-2xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark hover:border-egreso hover:text-egreso text-titulo dark:text-titulo-dark font-black text-sm transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={guardando} className="flex-1 h-11 rounded-2xl bg-oficina text-white border-2 border-oficina font-black text-sm shadow-[0_5px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-2">
          {guardando ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <HiCheck className="w-4 h-4" />
              {esEdit ? "Guardar" : "Crear"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ════════════════════════════════════════════════════════════
// FORM CATEGORÍA
// ════════════════════════════════════════════════════════════
function FormCategoria({ categoria, onCancel, onSaved }) {
  const dispatch = useDispatch();
  const esEdit = !!categoria;

  const [nombre, setNombre] = useState(categoria?.nombre || "");
  const [color, setColor] = useState(categoria?.color || "sky");
  const [activo, setActivo] = useState(categoria?.activo ?? true);
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return toast.error("Ingresá un nombre");

    const data = { nombre: nombre.trim(), color, activo };

    try {
      setGuardando(true);
      if (esEdit) {
        await dispatch(updateCategoriaServicio({ id: categoria.id, ...data })).unwrap();
        toast.success("Categoría actualizada");
      } else {
        await dispatch(createCategoriaServicio(data)).unwrap();
        toast.success("Categoría creada");
      }
      onSaved();
    } catch (err) {
      const msg = err?.nombre?.[0] || err?.detail || "Error al guardar";
      toast.error(typeof msg === "string" ? msg : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const inputCls = "w-full px-3 h-11 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark focus:border-oficina focus:outline-none text-sm font-bold text-titulo dark:text-titulo-dark transition-colors";

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <Field label="Nombre de la categoría" required>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Servicios Públicos"
          className={inputCls}
          autoFocus
        />
      </Field>

      <Field label="Color de identificación">
        <div className="grid grid-cols-4 gap-2">
          {COLORES_CATEGORIA.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={`flex items-center gap-2 px-3 h-11 rounded-xl text-xs font-black transition border-2 ${
                color === c.value
                  ? "bg-surface dark:bg-surface-dark border-oficina text-titulo dark:text-titulo-dark"
                  : "bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-oficina/50"
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${c.cls}`} />
              {c.label}
            </button>
          ))}
        </div>
      </Field>

      <label className="flex items-center justify-between p-3 rounded-2xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark cursor-pointer hover:border-oficina transition-colors">
        <div>
          <p className="font-black text-sm text-titulo dark:text-titulo-dark">Activa</p>
          <p className="text-xs font-bold text-suave dark:text-suave-dark mt-0.5">
            {activo ? "Disponible en el selector" : "No aparece en el selector"}
          </p>
        </div>
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          className="w-5 h-5 accent-[var(--color-oficina)]"
        />
      </label>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-11 rounded-2xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark hover:border-egreso hover:text-egreso text-titulo dark:text-titulo-dark font-black text-sm transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="flex-1 h-11 rounded-2xl bg-oficina text-white border-2 border-oficina font-black text-sm shadow-[0_5px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-2"
        >
          {guardando ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <HiCheck className="w-4 h-4" />
              {esEdit ? "Guardar" : "Crear"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark mb-1.5">
        {label} {required && <span className="text-egreso">*</span>}
      </label>
      {children}
    </div>
  );
}
