// src/components/balanzes/IngresoEditModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

// 🚀 IMPORTAMOS CONTEXTO PARA SEGURIDAD
import { useAuth } from "../../context/AuthContext";

import { updateIngreso } from "../../store/slices/ingresosSlice";
import { fetchMediosCobro } from "../../store/slices/pagosSlice";
import ModalWrapper from "../comunes/ModalWrapper";

/* Sugerencias locales */
const STORAGE_CATS = "balanzes_categorias";
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

export default function IngresoEditModal({ isOpen, onClose, ingreso }) {
  const dispatch = useDispatch();

  // 🚀 ESCUDO DE SUCURSAL
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const ingresos = useSelector((s) => s.ingresos?.list || []);
  const egresos = useSelector((s) => s.egresos?.list || []);
  
  // 🚀 AHORA TRAEMOS LAS OFICINAS DESDE EL ESTADO GLOBAL
  const { oficinas } = useSelector((s) => s.balance || {});
  const mediosCobro = useSelector((s) => (s.pagos?.mediosCobro || []).filter(m => m.activo !== false));
  useEffect(() => { dispatch(fetchMediosCobro({ activo: true })); }, [dispatch]);

  const [form, setForm] = useState({
    monto: "",
    fecha: dayjs().format("YYYY-MM-DD"),
    forma_pago: "EFECTIVO", // EFECTIVO | TRANSFERENCIA | MERCADOPAGO
    billetera: "",
    categoria: "",
    descripcion: "",
    pagado_por: "",
    oficina: "", // 🚀 Para el Admin
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const montoRef = useRef(null);
  const fechaRef = useRef(null);
  const catRef = useRef(null);
  const billeRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !ingreso) return;
    setErrors({});
    setSubmitting(false);
    
    // Adaptamos el viejo "VIRTUAL" a "TRANSFERENCIA" por compatibilidad
    let fp = ingreso.forma_pago || "EFECTIVO";
    if (fp === "VIRTUAL") fp = "TRANSFERENCIA";

    setForm({
      monto: typeof ingreso.monto === "number" ? ingreso.monto.toString() : ingreso.monto ?? "",
      fecha: (ingreso.fecha || dayjs().format("YYYY-MM-DD")).slice(0, 10),
      forma_pago: fp,
      billetera: ingreso.billetera || "",
      categoria: ingreso.categoria || "",
      descripcion: ingreso.descripcion || "",
      pagado_por: ingreso.pagado_por || "",
      oficina: ingreso.oficina || "", // Cargamos la sucursal original
    });
    setTimeout(() => montoRef.current?.focus(), 60);
  }, [isOpen, ingreso]);

  /* Sugerencias (sólo lectura) */
  const [localCats, setLocalCats] = useState([]);
  const [localWallets, setLocalWallets] = useState([]);
  
  useEffect(() => {
    if (!isOpen) return;
    setLocalCats(readLS(STORAGE_CATS, []));
    setLocalWallets(readLS(STORAGE_WALLETS, []));
  }, [isOpen]);

  const catOpciones = useMemo(() => {
    const fromIngresos = ingresos.map((i) => i?.categoria);
    const fromEgresos = egresos.map((e) => e?.categoria);
    return uniqClean([
      ...fromIngresos,
      ...fromEgresos,
      ...localCats,
      form.categoria,
    ]);
  }, [ingresos, egresos, localCats, form.categoria]);

  const walletOpciones = useMemo(
    () => uniqClean([...localWallets, form.billetera]),
    [localWallets, form.billetera]
  );

  const handleChange = (e) =>
    setForm((p) => ({
      ...p,
      [e.target.name]: e.target.value,
    }));

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
    if (form.forma_pago !== "EFECTIVO" && !form.billetera?.trim()) e.billetera = "Indicá la billetera/cuenta.";
    if (isWebAdmin && !form.oficina) e.oficina = "Seleccioná la sucursal de este ingreso.";
    
    setErrors(e);

    const first = Object.keys(e)[0];
    if (first) {
      const map = {
        monto: montoRef,
        fecha: fechaRef,
        categoria: catRef,
        billetera: billeRef,
      };
      setTimeout(() => map[first]?.current?.focus(), 0);
    }
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || !ingreso) return;
    
    const montoNum = Number(form.monto || 0);
    const billeteraDetalle = form.forma_pago !== "EFECTIVO" ? (form.billetera || "Sin especificar") : "";

    const payload = {
      id: ingreso.id,
      monto: montoNum,
      fecha: form.fecha,
      forma_pago: form.forma_pago,
      billetera: billeteraDetalle,
      categoria: form.categoria || "Sin categoría",
      descripcion: form.descripcion,
      pagado_por: form.pagado_por,
      ...(isWebAdmin && form.oficina ? { oficina: form.oficina } : {}), // 🚀 Permitir al admin reasignar la sucursal
    };

    try {
      setSubmitting(true);
      await dispatch(updateIngreso(payload)).unwrap();
      
      // Guardar billetera en LS para sugerencias futuras
      if (billeteraDetalle) {
        const nextW = uniqClean([...localWallets, billeteraDetalle]);
        writeLS(STORAGE_WALLETS, nextW);
      }

      onClose?.();
    } catch (err) {
      console.error("Error al actualizar ingreso:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const isVirtual = form.forma_pago !== "EFECTIVO";
  const disabled =
    submitting ||
    !form.monto ||
    Number(form.monto) <= 0 ||
    !form.fecha ||
    !form.categoria ||
    (isVirtual && !form.billetera) ||
    (isWebAdmin && !form.oficina);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Editar ingreso">
      <form
        onSubmit={handleSubmit}
        className="space-y-5 text-zinc-50"
      >
        {/* Monto / Fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">
              Monto <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">
                $
              </span>
              <input
                ref={montoRef}
                name="monto"
                type="number"
                step="0.01"
                min="0"
                value={form.monto}
                onChange={handleChange}
                className="w-full pl-7 pr-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                placeholder="0.00"
              />
            </div>
            {errors.monto && (
              <p className="text-[11px] text-rose-400 mt-1">{errors.monto}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">
              Fecha <span className="text-emerald-400">*</span>
            </label>
            <input
              ref={fechaRef}
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
            {errors.fecha && (
              <p className="text-[11px] text-rose-400 mt-1">{errors.fecha}</p>
            )}
          </div>
        </div>

        {/* 🚀 SUCURSAL (SOLO ADMIN) */}
        {isWebAdmin && (
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">
              Sucursal <span className="text-emerald-400">*</span>
            </label>
            <select
              name="oficina"
              value={form.oficina}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            >
              <option value="">Seleccione una sucursal...</option>
              {/* 🚀 MAPEO DINÁMICO DE SUCURSALES DESDE REDUX */}
              {oficinas && oficinas.map(ofi => (
                <option key={ofi.id} value={ofi.id}>{ofi.nombre}</option>
              ))}
            </select>
            {errors.oficina && <p className="text-[11px] text-rose-400 mt-1">{errors.oficina}</p>}
          </div>
        )}

        {/* Forma de pago */}
        <div>
          <label className="block text-xs font-medium mb-2 text-zinc-400">
            Forma de pago <span className="text-emerald-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFormaPago("EFECTIVO")}
              className={`px-4 py-2 text-xs sm:text-sm rounded-xl font-medium transition-colors border ${
                form.forma_pago === "EFECTIVO"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
              }`}
            >
              Efectivo / Caja
            </button>
            <button
              type="button"
              onClick={() => setFormaPago("TRANSFERENCIA")}
              className={`px-4 py-2 text-xs sm:text-sm rounded-xl font-medium transition-colors border ${
                form.forma_pago === "TRANSFERENCIA"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
              }`}
            >
              Transferencia
            </button>
            <button
              type="button"
              onClick={() => setFormaPago("MERCADOPAGO")}
              className={`px-4 py-2 text-xs sm:text-sm rounded-xl font-medium transition-colors border ${
                form.forma_pago === "MERCADOPAGO"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
              }`}
            >
              Mercado Pago
            </button>
          </div>
        </div>

        {/* Billetera (si es virtual) */}
        {isVirtual && (
          <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">
                Cuenta destino (del estudio) <span className="text-emerald-400">*</span>
              </label>
              {mediosCobro.length > 0 ? (
                <select name="billetera" value={form.billetera} onChange={handleChange}
                  className="w-full px-3 py-2.5 border rounded-lg bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500 transition-colors">
                  <option value="">Seleccionar cuenta…</option>
                  {mediosCobro.map((m) => (
                    <option key={m.id} value={m.valor}>
                      {m.etiqueta || m.titular_nombre} — {m.valor} ({m.proveedor?.replace("_", " ")})
                    </option>
                  ))}
                </select>
              ) : (
                <input ref={billeRef} name="billetera" value={form.billetera} onChange={handleChange}
                  placeholder="Ej: MP de Manu, Banco Nación…"
                  className="w-full px-3 py-2.5 border rounded-lg bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
              )}
              {errors.billetera && <p className="text-[11px] text-rose-400 mt-1">{errors.billetera}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Enviado por (cliente / remitente)</label>
              <input name="pagado_por" value={form.pagado_por} onChange={handleChange}
                placeholder="Ej: Juan Pérez, nombre del banco…"
                className="w-full px-3 py-2.5 border rounded-lg bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
          </div>
        )}

        {/* Categoría */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-zinc-400">
            Categoría <span className="text-emerald-400">*</span>
          </label>
          <input
            ref={catRef}
            name="categoria"
            value={form.categoria}
            onChange={handleChange}
            list="cat-suggestions-edit-ingreso"
            placeholder="Escribí o elegí una categoría"
            className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
          <datalist id="cat-suggestions-edit-ingreso">
            {catOpciones.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
          {errors.categoria && (
            <p className="text-[11px] text-rose-400 mt-1">
              {errors.categoria}
            </p>
          )}
        </div>

        {/* Descripción + Pagado por (opcionales) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">
              Descripción <span className="text-zinc-500 font-normal">(Opcional)</span>
            </label>
            <input
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Ej: Cobro servicio X"
              className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-zinc-400">
              Pagado por <span className="text-zinc-500 font-normal">(Opcional)</span>
            </label>
            <input
              name="pagado_por"
              value={form.pagado_por}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez"
              className="w-full px-3 py-2.5 border rounded-xl bg-zinc-900 border-zinc-800 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={disabled}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-900 transition-all ${
              disabled
                ? "bg-emerald-500/20 text-emerald-500/50 cursor-not-allowed border border-emerald-500/10"
                : "bg-emerald-400 hover:bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-500/20"
            }`}
          >
            {submitting ? "Guardando…" : "Actualizar ingreso"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}