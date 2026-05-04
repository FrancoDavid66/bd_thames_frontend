// src/components/balanzes/EgresoCreateModal.jsx
import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

import { useAuth } from "../../context/AuthContext";
import { createEgreso } from "../../store/slices/egresosSlice";
import { fetchBalanceDiario, createCategoria } from "../../store/slices/balanceSlice";
import ModalWrapper from "../comunes/ModalWrapper";
import CategoriaSelect from "./CategoriaSelect";

const normalizarStr = (raw) => (raw ?? "").toString().trim();
const today = () => dayjs().format("YYYY-MM-DD");

export default function EgresoCreateModal({ isOpen, onClose }) {
  const dispatch = useDispatch();

  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const userOficina = user?.perfil?.oficina?.id || user?.perfil?.oficina?.codigo || user?.perfil?.oficina || "";

  // 🚀 AHORA TRAEMOS LAS OFICINAS DESDE EL ESTADO GLOBAL
  const { categorias, oficinas } = useSelector((s) => s.balance || {});

  const [form, setForm] = useState({
    descripcion: "",
    monto: "",
    categoria: "",
    fecha: today(),
    forma_pago: "EFECTIVO", 
    billetera: "",
    observaciones: "",
    oficina: "", 
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  const montoRef = useRef(null);
  const catRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setForm({
        descripcion: "",
        monto: "",
        categoria: "",
        fecha: today(),
        forma_pago: "EFECTIVO",
        billetera: "",
        observaciones: "",
        oficina: "",
      });
      setErrors({});
      setSubmitting(false);
      setTimeout(() => montoRef.current?.focus(), 60);
    }
  }, [isOpen]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCategoriaChange = (val) =>
    setForm((prev) => ({ ...prev, categoria: val }));

  const validate = () => {
    const e = {};
    if (!form.monto || Number(form.monto) <= 0) e.monto = "Ingresá un monto válido.";
    if (!form.descripcion?.trim()) e.descripcion = "La descripción es obligatoria.";
    if (!form.categoria?.trim()) e.categoria = "Indicá la categoría.";
    if (form.forma_pago !== "EFECTIVO" && !form.billetera?.trim()) e.billetera = "Indicá la cuenta / banco.";
    if (isWebAdmin && !form.oficina) e.oficina = "Seleccioná la sucursal de este egreso.";

    setErrors(e);
    
    if (Object.keys(e).length > 0) {
      if (e.monto) montoRef.current?.focus();
      else if (e.categoria) catRef.current?.focus();
    }
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const montoNum = parseFloat(form.monto || "0");
    const catNorm = normalizarStr(form.categoria);
    const billeteraDetalle = form.forma_pago !== "EFECTIVO" ? (form.billetera || "Sin especificar") : "";

    let descripcionBase = normalizarStr(form.descripcion);
    if (billeteraDetalle) descripcionBase = `${descripcionBase} [Cuenta: ${billeteraDetalle}]`;

    const payload = {
      descripcion: descripcionBase,
      monto: montoNum,
      categoria: catNorm,
      fecha: form.fecha,
      forma_pago: form.forma_pago,
      billetera: billeteraDetalle, 
      observaciones: form.observaciones || "",
      oficina: isWebAdmin ? form.oficina : undefined, 
    };

    try {
      setSubmitting(true);
      
      await dispatch(createEgreso(payload)).unwrap();

      const ofiParaBalance = isWebAdmin ? form.oficina : userOficina;
      dispatch(fetchBalanceDiario({ fecha: payload.fecha, oficina: ofiParaBalance }));

      const existeCat = (categorias || []).some(c => c.nombre.toLowerCase() === catNorm.toLowerCase());
      if (catNorm && !existeCat) {
        dispatch(createCategoria({ nombre: catNorm, tipo: "EGRESO" }));
      }

      onClose && onClose();
    } catch (err) {
      console.error("Error al crear egreso:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const isVirtual = form.forma_pago !== "EFECTIVO";
  const disabled = submitting || !form.monto || !form.descripcion || !form.categoria || (isVirtual && !form.billetera) || (isWebAdmin && !form.oficina);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Cargar nuevo egreso">
      <form onSubmit={handleSubmit} className="space-y-5 text-zinc-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Monto <span className="text-rose-400">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">$</span>
              <input ref={montoRef} name="monto" type="number" step="0.01" min="0" value={form.monto} onChange={handleChange} className="w-full pl-7 pr-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500" placeholder="0.00" />
            </div>
            {errors.monto && <p className="text-[11px] text-rose-400 mt-1">{errors.monto}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Fecha del egreso <span className="text-rose-400">*</span></label>
            <input name="fecha" type="date" value={form.fecha} onChange={handleChange} className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500" />
          </div>
        </div>

        {isWebAdmin && (
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Sucursal <span className="text-rose-400">*</span></label>
            <select name="oficina" value={form.oficina} onChange={handleChange} className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500">
              <option value="">Seleccione una sucursal...</option>
              {/* 🚀 MAPEO DINÁMICO DE SUCURSALES DESDE REDUX */}
              {oficinas?.map(ofi => (
                <option key={ofi.id} value={ofi.id}>{ofi.nombre}</option>
              ))}
            </select>
            {errors.oficina && <p className="text-[11px] text-rose-400 mt-1">{errors.oficina}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Descripción / Motivo <span className="text-rose-400">*</span></label>
            <input name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Ej: Artículos de limpieza, Luz…" className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500" />
            {errors.descripcion && <p className="text-[11px] text-rose-400 mt-1">{errors.descripcion}</p>}
          </div>
          <div>
            <CategoriaSelect 
              tipo="EGRESO" 
              value={form.categoria} 
              onChange={handleCategoriaChange} 
              error={errors.categoria} 
              refProp={catRef} 
              asteriskColor="text-rose-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-2 text-zinc-400">Forma de pago <span className="text-rose-400">*</span></label>
          <div className="flex flex-wrap gap-2">
            {["EFECTIVO", "TRANSFERENCIA", "MERCADOPAGO"].map((fp) => (
              <button key={fp} type="button" onClick={() => setForm({ ...form, forma_pago: fp, billetera: fp === "EFECTIVO" ? "" : form.billetera })} className={`px-4 py-2 text-xs sm:text-sm rounded-xl font-medium transition-colors border ${form.forma_pago === fp ? "bg-rose-500/20 text-rose-300 border-rose-500/50" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"}`}>
                {fp === "EFECTIVO" ? "Efectivo / Caja Chica" : fp === "TRANSFERENCIA" ? "Transferencia Bancaria" : "Mercado Pago"}
              </button>
            ))}
          </div>
        </div>

        {isVirtual && (
          <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">Cuenta / Billetera de origen <span className="text-rose-400">*</span></label>
            <input name="billetera" onChange={handleChange} value={form.billetera} placeholder="Ej: Banco Provincia, Ualá…" className="w-full px-3 py-2.5 border rounded-lg bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-rose-500" />
            {errors.billetera && <p className="text-[11px] text-rose-400 mt-1">{errors.billetera}</p>}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium mb-1.5 text-zinc-400">Observaciones <span className="text-zinc-500 font-normal">(Opcional)</span></label>
          <textarea name="observaciones" onChange={handleChange} value={form.observaciones} rows={2} placeholder="Nº de comprobante, detalles de la factura..." className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none" />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors">Cancelar</button>
          <button type="submit" disabled={disabled} className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${disabled ? "bg-rose-500/30 text-rose-100/50 cursor-not-allowed border border-rose-500/10" : "bg-rose-500 hover:bg-rose-600 active:scale-95 shadow-lg shadow-rose-500/20"}`}>{submitting ? "Guardando…" : "Confirmar egreso"}</button>
        </div>
      </form>
    </ModalWrapper>
  );
}