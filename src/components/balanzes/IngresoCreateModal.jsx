// src/components/balanzes/IngresoCreateModal.jsx
import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";

import { useAuth } from "../../context/AuthContext";
import { createIngreso } from "../../store/slices/ingresosSlice";
import { fetchBalanceDiario, createCategoria } from "../../store/slices/balanceSlice";
import ModalWrapper from "../comunes/ModalWrapper";
import CategoriaSelect from "./CategoriaSelect"; // 🚀 IMPORTAMOS NUESTRO SELECTOR

const normalizarStr = (raw) => (raw ?? "").toString().trim();

export default function IngresoCreateModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const userOficina = user?.perfil?.oficina?.id || user?.perfil?.oficina?.codigo || user?.perfil?.oficina || "";

  // 🚀 AHORA TRAEMOS LAS OFICINAS DESDE EL ESTADO GLOBAL
  const { categorias, oficinas } = useSelector((s) => s.balance || {});

  const [form, setForm] = useState({
    monto: "",
    fecha: dayjs().format("YYYY-MM-DD"),
    forma_pago: "EFECTIVO", 
    billetera: "",
    categoria: "",
    descripcion: "",
    pagado_por: "",
    oficina: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const montoRef = useRef(null);
  const fechaRef = useRef(null);
  const catRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setSubmitting(false);
    setForm((prev) => ({
      ...prev,
      fecha: dayjs().format("YYYY-MM-DD"),
      monto: "",
      forma_pago: "EFECTIVO",
      billetera: "",
      categoria: "",
      descripcion: "",
      pagado_por: "",
      oficina: "",
    }));
    setTimeout(() => montoRef.current?.focus(), 60);
  }, [isOpen]);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleCategoriaChange = (val) =>
    setForm((p) => ({ ...p, categoria: val }));

  const setFormaPago = (fp) =>
    setForm((p) => ({
      ...p,
      forma_pago: fp,
      billetera: fp === "EFECTIVO" ? "" : p.billetera,
    }));

  const validate = () => {
    const e = {};
    if (!form.monto || Number(form.monto) <= 0) e.monto = "Ingresá un monto válido.";
    if (!form.fecha) e.fecha = "Seleccioná la fecha.";
    if (!form.categoria?.trim()) e.categoria = "Indicá la categoría.";
    if (form.forma_pago !== "EFECTIVO" && !form.billetera?.trim()) e.billetera = "Indicá la cuenta / banco.";
    if (isWebAdmin && !form.oficina) e.oficina = "Seleccioná la sucursal de este ingreso.";

    setErrors(e);

    if (Object.keys(e).length > 0) {
      if (e.monto) montoRef.current?.focus();
      else if (e.fecha) fechaRef.current?.focus();
      else if (e.categoria) catRef.current?.focus();
    }
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    const montoNum = Number(form.monto || 0);
    const catNorm = normalizarStr(form.categoria);
    const billeteraDetalle = form.forma_pago !== "EFECTIVO" ? form.billetera || "Sin especificar" : "";

    let descripcionBase = normalizarStr(form.descripcion) || `Ingreso ${catNorm}`.trim();
    if (billeteraDetalle) descripcionBase = `${descripcionBase} [Cuenta: ${billeteraDetalle}]`;

    const payload = {
      monto: montoNum,
      fecha: form.fecha,
      forma_pago: form.forma_pago,
      billetera: billeteraDetalle, 
      categoria: catNorm || "Sin categoría",
      descripcion: descripcionBase,
      pagado_por: normalizarStr(form.pagado_por) || "No especificado",
      oficina: isWebAdmin ? form.oficina : undefined,
    };

    try {
      setSubmitting(true);
      
      // 1. Guardar ingreso
      await dispatch(createIngreso(payload)).unwrap();

      // 2. Refrescar tablero de KPI
      const ofiParaBalance = isWebAdmin ? form.oficina : userOficina;
      dispatch(fetchBalanceDiario({ fecha: payload.fecha, oficina: ofiParaBalance }));

      // 3. Registrar categoría nueva en la Base de Datos si no existe
      const existeCat = (categorias || []).some(c => c.nombre.toLowerCase() === catNorm.toLowerCase());
      if (catNorm && !existeCat) {
        dispatch(createCategoria({ nombre: catNorm, tipo: "INGRESO" }));
      }

      onClose?.();
    } catch (err) {
      console.error(err);
      alert("Error al guardar el ingreso. Revisá la consola.");
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || !form.monto || !form.fecha || !form.categoria || (isWebAdmin && !form.oficina) || (form.forma_pago !== "EFECTIVO" && !form.billetera);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Cargar nuevo ingreso">
      <form onSubmit={handleSubmit} className="space-y-5 text-zinc-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Monto <span className="text-emerald-400">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">$</span>
              <input ref={montoRef} name="monto" type="number" step="0.01" min="0" value={form.monto} onChange={handleChange} className="w-full pl-7 pr-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="0.00" />
            </div>
            {errors.monto && <p className="text-[11px] text-rose-400 mt-1">{errors.monto}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Fecha <span className="text-emerald-400">*</span></label>
            <input ref={fechaRef} name="fecha" type="date" value={form.fecha} onChange={handleChange} className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            {errors.fecha && <p className="text-[11px] text-rose-400 mt-1">{errors.fecha}</p>}
          </div>
        </div>

        {isWebAdmin && (
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Sucursal <span className="text-emerald-400">*</span></label>
            <select name="oficina" value={form.oficina} onChange={handleChange} className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
              <option value="">Seleccione una sucursal...</option>
              {/* 🚀 MAPEO DINÁMICO DE SUCURSALES DESDE REDUX */}
              {oficinas && oficinas.map(ofi => (
                <option key={ofi.id} value={ofi.id}>{ofi.nombre}</option>
              ))}
            </select>
            {errors.oficina && <p className="text-[11px] text-rose-400 mt-1">{errors.oficina}</p>}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium mb-2 text-zinc-400">Forma de pago <span className="text-emerald-400">*</span></label>
          <div className="flex flex-wrap gap-2">
            {["EFECTIVO", "TRANSFERENCIA", "MERCADOPAGO"].map((fp) => (
              <button key={fp} type="button" onClick={() => setFormaPago(fp)} className={`px-4 py-2 text-xs sm:text-sm rounded-xl font-medium transition-colors border ${form.forma_pago === fp ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"}`}>
                {fp === "EFECTIVO" ? "Efectivo / Caja" : fp === "TRANSFERENCIA" ? "Transferencia" : "Mercado Pago"}
              </button>
            ))}
          </div>
        </div>

        {form.forma_pago !== "EFECTIVO" && (
          <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Billetera / Banco <span className="text-emerald-400">*</span></label>
            <input name="billetera" value={form.billetera} onChange={handleChange} placeholder="Ej: Banco Nación, Ualá…" className="w-full px-3 py-2.5 border rounded-lg bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500" />
            {errors.billetera && <p className="text-[11px] text-rose-400 mt-1">{errors.billetera}</p>}
          </div>
        )}

        {/* 🚀 USAMOS EL SELECTOR INTELIGENTE */}
        <CategoriaSelect 
          tipo="INGRESO" 
          value={form.categoria} 
          onChange={handleCategoriaChange} 
          error={errors.categoria} 
          refProp={catRef} 
          asteriskColor="text-emerald-400"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Descripción <span className="text-zinc-500 font-normal">(Opcional)</span></label>
            <input name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Detalle del ingreso…" className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Pagado por <span className="text-zinc-500 font-normal">(Opcional)</span></label>
            <input name="pagado_por" value={form.pagado_por} onChange={handleChange} placeholder="Ej: Juan Pérez" className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors">Cancelar</button>
          <button type="submit" disabled={disabled} className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-900 transition-all ${disabled ? "bg-emerald-500/20 text-emerald-500/50 cursor-not-allowed border border-emerald-500/10" : "bg-emerald-400 hover:bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-500/20"}`}>{submitting ? "Guardando…" : "Confirmar ingreso"}</button>
        </div>
      </form>
    </ModalWrapper>
  );
}