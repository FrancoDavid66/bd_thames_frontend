// src/components/balanzes/EgresoEditModal.jsx
import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

// 🚀 IMPORTAMOS CONTEXTO PARA SEGURIDAD
import { useAuth } from "../../context/AuthContext";

import { updateEgreso } from "../../store/slices/egresosSlice";
import { fetchMediosCobro } from "../../store/slices/pagosSlice";
import ModalWrapper from "../comunes/ModalWrapper";
import CategoriaSelect from "./CategoriaSelect";

/* Sugerencias locales para billeteras */
const STORAGE_WALLETS = "balanzes_billeteras";

const uniqClean = (arr = []) =>
  Array.from(
    new Set(
      arr
        .map((x) => (x ?? "").toString().trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

const readLS = (k, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
};

const writeLS = (k, arr) => {
  try {
    localStorage.setItem(k, JSON.stringify(uniqClean(arr)));
  } catch {
    // ignore
  }
};

const toDateInput = (value) => {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
};

const EgresoEditModal = ({ isOpen, onClose, egreso }) => {
  const dispatch = useDispatch();

  // 🚀 ESCUDO DE SUCURSAL
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  // 🚀 TRAEMOS LAS OFICINAS DEL STORE
  const { oficinas } = useSelector((s) => s.balance || {});
  const mediosCobro = useSelector((s) => (s.pagos?.mediosCobro || []).filter(m => m.activo !== false));
  useEffect(() => { dispatch(fetchMediosCobro({ activo: true })); }, [dispatch]);

  const [form, setForm] = useState({
    descripcion: "",
    monto: "",
    categoria: "",
    fecha: "",
    forma_pago: "EFECTIVO", 
    billetera: "",
    observaciones: "",
    oficina: "", 
  });
  
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [localWallets] = useState(() => readLS(STORAGE_WALLETS, []));
  const walletOpciones = useMemo(
    () => uniqClean([...localWallets, form.billetera]),
    [localWallets, form.billetera]
  );

  useEffect(() => {
    if (egreso && isOpen) {
      setForm({
        descripcion: egreso.descripcion || "",
        monto: typeof egreso.monto === "number" ? egreso.monto.toString() : egreso.monto || "",
        categoria: egreso.categoria || "",
        fecha: toDateInput(egreso.fecha) || "",
        forma_pago: egreso.forma_pago || "EFECTIVO",
        billetera: egreso.billetera || "",
        observaciones: egreso.observaciones || "",
        oficina: egreso.oficina || "", 
      });
      setErrors({});
      setSubmitting(false);
    }
  }, [egreso, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCategoriaChange = (categoria) => {
    setForm((prev) => ({
      ...prev,
      categoria,
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.monto || Number(form.monto) <= 0) e.monto = "Ingresá un monto válido.";
    if (!form.descripcion?.trim()) e.descripcion = "La descripción es obligatoria.";
    if (!form.categoria?.trim()) e.categoria = "Indicá la categoría.";
    if (form.forma_pago !== "EFECTIVO" && !form.billetera?.trim()) e.billetera = "Indicá la cuenta / banco.";
    if (isWebAdmin && !form.oficina) e.oficina = "Seleccioná la sucursal de este egreso.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!egreso) return;
    if (!validate()) return;

    const montoNum = parseFloat(form.monto || "0");
    if (!montoNum || montoNum <= 0) return;

    const billeteraDetalle = form.forma_pago !== "EFECTIVO" ? (form.billetera || "Sin especificar") : "";

    const payload = {
      id: egreso.id,
      descripcion: form.descripcion,
      monto: montoNum,
      categoria: form.categoria,
      forma_pago: form.forma_pago,
      billetera: billeteraDetalle,
      observaciones: form.observaciones || "",
      ...(form.fecha ? { fecha: form.fecha } : {}),
      ...(isWebAdmin && form.oficina ? { oficina: form.oficina } : {}), 
    };

    try {
      setSubmitting(true);
      await dispatch(updateEgreso(payload)).unwrap();

      if (billeteraDetalle) {
        const nextW = uniqClean([...localWallets, billeteraDetalle]);
        writeLS(STORAGE_WALLETS, nextW);
      }

      onClose && onClose();
    } catch (err) {
      console.error("Error al actualizar egreso:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const isVirtual = form.forma_pago !== "EFECTIVO";
  const disabled = submitting || !form.monto || !form.descripcion || !form.categoria || (isVirtual && !form.billetera) || (isWebAdmin && !form.oficina);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Editar egreso">
      <form onSubmit={handleSubmit} className="space-y-5 text-zinc-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">
              Monto <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">$</span>
              <input
                name="monto"
                type="number"
                step="0.01"
                min="0"
                value={form.monto}
                onChange={handleChange}
                className="w-full pl-7 pr-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                placeholder="0.00"
              />
            </div>
            {errors.monto && <p className="text-[11px] text-rose-400 mt-1">{errors.monto}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Fecha del egreso</label>
            <input
              name="fecha"
              type="date"
              value={form.fecha}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
            />
          </div>
        </div>

        {isWebAdmin && (
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">
              Sucursal <span className="text-rose-400">*</span>
            </label>
            <select
              name="oficina"
              value={form.oficina}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
            >
              <option value="">Seleccione una sucursal...</option>
              {/* 🚀 MAPEO DINÁMICO DE SUCURSALES */}
              {oficinas?.map(ofi => (
                <option key={ofi.id} value={ofi.id}>{ofi.nombre}</option>
              ))}
            </select>
            {errors.oficina && <p className="text-[11px] text-rose-400 mt-1">{errors.oficina}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">
              Descripción / Motivo <span className="text-rose-400">*</span>
            </label>
            <input
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Ej: Artículos de limpieza, Luz…"
              className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
            />
            {errors.descripcion && <p className="text-[11px] text-rose-400 mt-1">{errors.descripcion}</p>}
          </div>
          <div>
            <CategoriaSelect
              label="Categoría"
              required
              value={form.categoria}
              onChange={handleCategoriaChange}
              className="mb-0" 
            />
            {errors.categoria && <p className="text-[11px] text-rose-400 mt-1">{errors.categoria}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-2 text-zinc-400">
            Forma de pago <span className="text-rose-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setForm({ ...form, forma_pago: "EFECTIVO", billetera: "" })} className={`px-4 py-2 text-xs sm:text-sm rounded-xl font-medium transition-colors border ${form.forma_pago === "EFECTIVO" ? "bg-rose-500/20 text-rose-300 border-rose-500/50" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"}`}>Efectivo / Caja Chica</button>
            <button type="button" onClick={() => setForm({ ...form, forma_pago: "TRANSFERENCIA" })} className={`px-4 py-2 text-xs sm:text-sm rounded-xl font-medium transition-colors border ${form.forma_pago === "TRANSFERENCIA" ? "bg-rose-500/20 text-rose-300 border-rose-500/50" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"}`}>Transferencia Bancaria</button>
            <button type="button" onClick={() => setForm({ ...form, forma_pago: "MERCADOPAGO" })} className={`px-4 py-2 text-xs sm:text-sm rounded-xl font-medium transition-colors border ${form.forma_pago === "MERCADOPAGO" ? "bg-rose-500/20 text-rose-300 border-rose-500/50" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"}`}>Mercado Pago</button>
          </div>
        </div>

        {isVirtual && (
          <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">
                Cuenta origen (del estudio) <span className="text-rose-400">*</span>
              </label>
              {mediosCobro.length > 0 ? (
                <select name="billetera" value={form.billetera} onChange={handleChange}
                  className="w-full px-3 py-2.5 border rounded-lg bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-rose-500 transition-colors">
                  <option value="">Seleccionar cuenta…</option>
                  {mediosCobro.map((m) => (
                    <option key={m.id} value={m.valor}>
                      {m.etiqueta || m.titular_nombre} — {m.valor} ({m.proveedor?.replace("_", " ")})
                    </option>
                  ))}
                </select>
              ) : (
                <input name="billetera" value={form.billetera} onChange={handleChange}
                  placeholder="Ej: Banco Provincia, Ualá…"
                  className="w-full px-3 py-2.5 border rounded-lg bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-rose-500 transition-colors" />
              )}
              {errors.billetera && <p className="text-[11px] text-rose-400 mt-1">{errors.billetera}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Destinatario / A quién se pagó</label>
              <input name="destinatario" value={form.destinatario || ""} onChange={handleChange}
                placeholder="Ej: Proveedor X, nombre del titular…"
                className="w-full px-3 py-2.5 border rounded-lg bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-rose-500 transition-colors" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium mb-1.5 text-zinc-400">
            Observaciones <span className="text-zinc-500 font-normal">(Opcional)</span>
          </label>
          <textarea name="observaciones" onChange={handleChange} value={form.observaciones} rows={2} placeholder="Nº de comprobante, detalles de la factura..." className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors resize-none" />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors">Cancelar</button>
          <button type="submit" disabled={disabled} className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${disabled ? "bg-rose-500/30 text-rose-100/50 cursor-not-allowed border border-rose-500/10" : "bg-rose-500 hover:bg-rose-600 active:scale-95 shadow-lg shadow-rose-500/20"}`}>{submitting ? "Guardando…" : "Actualizar egreso"}</button>
        </div>
      </form>
    </ModalWrapper>
  );
};

export default EgresoEditModal;