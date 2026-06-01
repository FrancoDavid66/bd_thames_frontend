// src/components/balanzes/IngresoCreateModal.jsx
import { useState, useEffect, useRef, Fragment } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import dayjs from "dayjs";

import { useAuth } from "../../context/AuthContext";
import { createIngreso } from "../../store/slices/ingresosSlice";
import { fetchBalanceDiario, createCategoria } from "../../store/slices/balanceSlice";
import { fetchMediosCobro } from "../../store/slices/pagosSlice";
import ModalWrapper from "../comunes/ModalWrapper";
import CategoriaSelect from "./CategoriaSelect";

const normalizarStr = (raw) => (raw ?? "").toString().trim();

// 🚀 Ruta correcta de sucursales (la misma que usa el resto de la app)
const API_BASE = (import.meta.env.VITE_API_URL || "/api/").toString();
const OFICINAS_URL = (API_BASE.endsWith("/") ? API_BASE : API_BASE + "/") + "usuarios/oficinas/";

const STEPS = [
  { n: 1, label: "Monto" },
  { n: 2, label: "Detalle" },
  { n: 3, label: "Confirmar" },
];

const fmtMoney = (n) =>
  "$ " + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const labelFormaPago = (fp) =>
  fp === "EFECTIVO" ? "Efectivo / Caja" : fp === "TRANSFERENCIA" ? "Transferencia" : "Mercado Pago";

// 🚀 Muestra el monto con separador de miles (es-AR): 20000 -> "20.000"
const montoToDisplay = (raw) => {
  if (raw === "" || raw == null) return "";
  const [intPart, decPart] = String(raw).split(".");
  const intFmt = (intPart || "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart != null ? `${intFmt},${decPart}` : intFmt;
};
// 🚀 Convierte lo tipeado (es-AR) al número crudo para guardar: "20.000,50" -> "20000.50"
const montoFromInput = (text) => {
  const cleaned = String(text).replace(/[^\d,]/g, "");
  const [intPart, ...rest] = cleaned.split(",");
  const dec = rest.length ? rest.join("").slice(0, 2) : null;
  return dec != null ? `${intPart}.${dec}` : intPart;
};

export default function IngresoCreateModal({ isOpen, onClose }) {
  const dispatch = useDispatch();

  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const userOficina = user?.perfil?.oficina?.id || user?.perfil?.oficina?.codigo || user?.perfil?.oficina || "";

  const { categorias, oficinas: oficinasStore } = useSelector((s) => s.balance || {});
  const mediosCobro = useSelector((s) => (s.pagos?.mediosCobro || []).filter(m => m.activo !== false));

  // 🚀 Sucursales: usamos las del estado global si están, si no las pedimos acá
  const [oficinasLocal, setOficinasLocal] = useState([]);
  const oficinas = (oficinasStore && oficinasStore.length) ? oficinasStore : oficinasLocal;

  useEffect(() => { dispatch(fetchMediosCobro({ activo: true })); }, [dispatch]);

  // 🚀 Cargamos las sucursales directo de la ruta correcta (solo admin)
  useEffect(() => {
    if (!isOpen || !isWebAdmin) return;
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    axios
      .get(OFICINAS_URL, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => {
        const d = r.data;
        setOficinasLocal(Array.isArray(d) ? d : d?.results || []);
      })
      .catch(() => {});
  }, [isOpen, isWebAdmin]);

  const [step, setStep] = useState(1);
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
  const catRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setSubmitting(false);
    setStep(1);
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
    setForm((p) => ({ ...p, forma_pago: fp, billetera: fp === "EFECTIVO" ? "" : p.billetera }));

  const isVirtual = form.forma_pago !== "EFECTIVO";

  // ── Validación por paso ───────────────────────────────────────
  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.monto || Number(form.monto) <= 0) e.monto = "Ingresá un monto válido.";
      if (isVirtual && !form.billetera?.trim()) e.billetera = "Indicá la cuenta / banco.";
    }
    if (s === 2) {
      if (!form.categoria?.trim()) e.categoria = "Indicá la categoría.";
    }
    if (s === 3) {
      if (!form.fecha) e.fecha = "Seleccioná la fecha.";
      if (isWebAdmin && !form.oficina) e.oficina = "Seleccioná la sucursal de este ingreso.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep((s) => Math.min(3, s + 1));
  };
  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  const validateAll = () => validateStep(1) && validateStep(2) && validateStep(3);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (step < 3) { handleNext(); return; }
    if (!validateAll()) return;

    const montoNum = Number(form.monto || 0);
    const catNorm = normalizarStr(form.categoria);
    const billeteraDetalle = isVirtual ? form.billetera || "Sin especificar" : "";

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
      await dispatch(createIngreso(payload)).unwrap();

      const ofiParaBalance = isWebAdmin ? form.oficina : userOficina;
      dispatch(fetchBalanceDiario({ fecha: payload.fecha, oficina: ofiParaBalance }));

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

  const finalDisabled =
    submitting || !form.monto || !form.fecha || !form.categoria ||
    (isWebAdmin && !form.oficina) || (isVirtual && !form.billetera);

  const inputBase =
    "w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Cargar nuevo ingreso">
      <form onSubmit={handleSubmit} className="space-y-5 text-zinc-50">
        {/* Stepper */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <Fragment key={s.n}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s.n ? "bg-emerald-500 text-zinc-900" : "bg-zinc-800 text-zinc-500"}`}>
                  {s.n}
                </div>
                <span className={`text-xs font-medium hidden sm:inline ${step >= s.n ? "text-zinc-100" : "text-zinc-500"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 rounded ${step > s.n ? "bg-emerald-500" : "bg-zinc-800"}`} />
              )}
            </Fragment>
          ))}
        </div>

        {/* ── PASO 1: Monto y forma de pago ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Monto <span className="text-emerald-400">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">$</span>
                <input ref={montoRef} name="monto" type="text" inputMode="decimal" value={montoToDisplay(form.monto)} onChange={(e) => setForm((p) => ({ ...p, monto: montoFromInput(e.target.value) }))} className={`pl-7 ${inputBase}`} placeholder="0" />
              </div>
              {errors.monto && <p className="text-[11px] text-rose-400 mt-1">{errors.monto}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium mb-2 text-zinc-400">Forma de pago <span className="text-emerald-400">*</span></label>
              <div className="flex flex-wrap gap-2">
                {["EFECTIVO", "TRANSFERENCIA", "MERCADOPAGO"].map((fp) => (
                  <button key={fp} type="button" onClick={() => setFormaPago(fp)} className={`px-4 py-2 text-xs sm:text-sm rounded-xl font-medium transition-colors border ${form.forma_pago === fp ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"}`}>
                    {labelFormaPago(fp)}
                  </button>
                ))}
              </div>
            </div>

            {isVirtual && (
              <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-zinc-400">Cuenta destino (del estudio) <span className="text-emerald-400">*</span></label>
                  {mediosCobro.length > 0 ? (
                    <select name="billetera" value={form.billetera} onChange={handleChange} className="w-full px-3 py-2.5 border rounded-lg bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500 transition-colors">
                      <option value="">Seleccionar cuenta…</option>
                      {mediosCobro.map((m) => (
                        <option key={m.id} value={m.valor}>
                          {m.etiqueta || m.titular_nombre} — {m.valor} ({m.proveedor?.replace("_", " ")})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input name="billetera" value={form.billetera} onChange={handleChange} placeholder="Ej: Banco Nación, alias.mp…" className="w-full px-3 py-2.5 border rounded-lg bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500" />
                  )}
                  {errors.billetera && <p className="text-[11px] text-rose-400 mt-1">{errors.billetera}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-zinc-400">Enviado por (cliente / remitente)</label>
                  <input name="pagado_por" value={form.pagado_por} onChange={handleChange} placeholder="Ej: Juan Pérez, nombre del banco…" className="w-full px-3 py-2.5 border rounded-lg bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PASO 2: Detalle ── */}
        {step === 2 && (
          <div className="space-y-4">
            <CategoriaSelect
              tipo="INGRESO"
              value={form.categoria}
              onChange={handleCategoriaChange}
              error={errors.categoria}
              refProp={catRef}
              asteriskColor="text-emerald-400"
            />
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Descripción <span className="text-zinc-500 font-normal">(Opcional)</span></label>
              <input name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Detalle del ingreso…" className={inputBase} />
            </div>
            {!isVirtual && (
              <div>
                <label className="block text-xs font-medium mb-1.5 text-zinc-400">Pagado por <span className="text-zinc-500 font-normal">(Opcional)</span></label>
                <input name="pagado_por" value={form.pagado_por} onChange={handleChange} placeholder="Ej: Juan Pérez" className={inputBase} />
              </div>
            )}
          </div>
        )}

        {/* ── PASO 3: Confirmar ── */}
        {step === 3 && (
          <div className="space-y-4">
            {isWebAdmin && (
              <div>
                <label className="block text-xs font-medium mb-1.5 text-zinc-400">Sucursal <span className="text-emerald-400">*</span></label>
                <select name="oficina" value={form.oficina} onChange={handleChange} className={inputBase}>
                  <option value="">Seleccione una sucursal...</option>
                  {oficinas && oficinas.map(ofi => (
                    <option key={ofi.id} value={ofi.id}>{ofi.nombre}</option>
                  ))}
                </select>
                {errors.oficina && <p className="text-[11px] text-rose-400 mt-1">{errors.oficina}</p>}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Fecha <span className="text-emerald-400">*</span></label>
              <input name="fecha" type="date" value={form.fecha} onChange={handleChange} className={inputBase} />
              {errors.fecha && <p className="text-[11px] text-rose-400 mt-1">{errors.fecha}</p>}
            </div>

            {/* Resumen */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm space-y-1.5">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">Resumen</p>
              <div className="flex justify-between"><span className="text-zinc-400">Monto</span><span className="font-bold text-emerald-300">{fmtMoney(form.monto)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Forma de pago</span><span className="text-zinc-200">{labelFormaPago(form.forma_pago)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Categoría</span><span className="text-zinc-200">{form.categoria || "—"}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Descripción</span><span className="text-zinc-200 truncate ml-3 text-right">{form.descripcion || "—"}</span></div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-800">
          {step === 1 ? (
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors">Cancelar</button>
          ) : (
            <button type="button" onClick={handleBack} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors">← Atrás</button>
          )}

          {step < 3 ? (
            <button type="button" onClick={handleNext} className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-900 bg-emerald-400 hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-500/20">Siguiente →</button>
          ) : (
            <button type="submit" disabled={finalDisabled} className={`px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-900 transition-all ${finalDisabled ? "bg-emerald-500/20 text-emerald-500/50 cursor-not-allowed border border-emerald-500/10" : "bg-emerald-400 hover:bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-500/20"}`}>{submitting ? "Guardando…" : "Confirmar ingreso"}</button>
          )}
        </div>
      </form>
    </ModalWrapper>
  );
}