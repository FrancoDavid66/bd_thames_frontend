import { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";

import { createIngreso } from "../../store/slices/ingresosSlice";
import ModalWrapper from "../comunes/ModalWrapper";

/* Sugerencias locales */
const STORAGE_CATS = "balanzes_categorias";
const STORAGE_WALLETS = "balanzes_billeteras";

const uniqClean = (arr = []) =>
  Array.from(new Set(arr.map((x) => (x ?? "").toString().trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
const readLS = (k, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
};

export default function IngresoCreateModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const ingresos = useSelector((s) => s.ingresos?.list || []);
  const egresos = useSelector((s) => s.egresos?.list || []);

  const [form, setForm] = useState({
    monto: "",
    fecha: dayjs().format("YYYY-MM-DD"),
    forma_pago: "EFECTIVO", // EFECTIVO | VIRTUAL
    billetera: "",
    categoria: "",
    descripcion: "",
    pagado_por: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const montoRef = useRef(null);
  const fechaRef = useRef(null);
  const catRef = useRef(null);
  const billeRef = useRef(null);

  /* abrir = reset y foco */
  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setSubmitting(false);
    setTimeout(() => montoRef.current?.focus(), 60);
  }, [isOpen]);

  /* Sugerencias (lectura local, no se editan aquí) */
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
    return uniqClean([...fromIngresos, ...fromEgresos, ...localCats, form.categoria]);
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
    setForm((p) => ({ ...p, forma_pago: fp, billetera: fp === "VIRTUAL" ? p.billetera : "" }));

  const validate = () => {
    const e = {};
    if (!form.monto || Number(form.monto) <= 0) e.monto = "Ingresá un monto válido.";
    if (!form.fecha) e.fecha = "Seleccioná la fecha.";
    if (!form.categoria?.trim()) e.categoria = "Indicá la categoría.";
    if (form.forma_pago === "VIRTUAL" && !form.billetera?.trim())
      e.billetera = "Indicá la billetera/cuenta.";
    setErrors(e);

    const first = Object.keys(e)[0];
    if (first) {
      const map = { monto: montoRef, fecha: fechaRef, categoria: catRef, billetera: billeRef };
      setTimeout(() => map[first]?.current?.focus(), 0);
    }
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      await dispatch(createIngreso(form));
      onClose?.();
      setForm({
        monto: "",
        fecha: dayjs().format("YYYY-MM-DD"),
        forma_pago: "EFECTIVO",
        billetera: "",
        categoria: "",
        descripcion: "",
        pagado_por: "",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const disabled =
    submitting ||
    !form.monto ||
    Number(form.monto) <= 0 ||
    !form.fecha ||
    !form.categoria ||
    (form.forma_pago === "VIRTUAL" && !form.billetera);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Nuevo Ingreso">
      <form onSubmit={handleSubmit} className="space-y-5 text-zinc-800 dark:text-white">
        {/* Monto / Fecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Monto *</label>
            <input
              ref={montoRef}
              name="monto"
              type="number"
              step="0.01"
              min="0"
              value={form.monto}
              onChange={handleChange}
              className={`w-full p-2 border rounded bg-white dark:bg-zinc-800 ${
                errors.monto ? "border-red-500" : ""
              }`}
              placeholder="0,00"
            />
            {errors.monto && <p className="text-xs text-red-500 mt-1">{errors.monto}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1">Fecha *</label>
            <input
              ref={fechaRef}
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={handleChange}
              className={`w-full p-2 border rounded bg-white dark:bg-zinc-800 ${
                errors.fecha ? "border-red-500" : ""
              }`}
            />
            {errors.fecha && <p className="text-xs text-red-500 mt-1">{errors.fecha}</p>}
          </div>
        </div>

        {/* Forma de pago + Billetera si aplica */}
        <div>
          <label className="block text-sm font-medium mb-2">Forma de pago</label>
          <div className="flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 w-fit">
            <button
              type="button"
              onClick={() => setFormaPago("EFECTIVO")}
              className={`px-3 py-1 text-sm ${
                form.forma_pago === "EFECTIVO"
                  ? "bg-green-600 text-white"
                  : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            >
              Efectivo
            </button>
            <button
              type="button"
              onClick={() => setFormaPago("VIRTUAL")}
              className={`px-3 py-1 text-sm ${
                form.forma_pago === "VIRTUAL"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            >
              Virtual
            </button>
          </div>

          {form.forma_pago === "VIRTUAL" && (
            <div className="mt-3">
              <label className="block text-sm mb-1">Billetera / Cuenta destino *</label>
              <input
                ref={billeRef}
                name="billetera"
                value={form.billetera}
                onChange={handleChange}
                list="wallet-suggestions"
                placeholder="Ej: MP de Manu / Brubank de Candela"
                className={`w-full p-2 border rounded bg-white dark:bg-zinc-800 ${
                  errors.billetera ? "border-red-500" : ""
                }`}
              />
              <datalist id="wallet-suggestions">
                {walletOpciones.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
              {errors.billetera && (
                <p className="text-xs text-red-500 mt-1">{errors.billetera}</p>
              )}
            </div>
          )}
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm mb-1">Categoría *</label>
          <input
            ref={catRef}
            name="categoria"
            value={form.categoria}
            onChange={handleChange}
            list="cat-suggestions"
            placeholder="Escribí o elegí una categoría"
            className={`w-full p-2 border rounded bg-white dark:bg-zinc-800 ${
              errors.categoria ? "border-red-500" : ""
            }`}
          />
          <datalist id="cat-suggestions">
            {catOpciones.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
          {errors.categoria && <p className="text-xs text-red-500 mt-1">{errors.categoria}</p>}
        </div>

        {/* Descripción + Pagado por (opcionales) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Descripción (opcional)</label>
            <input
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Ej: Cobro servicio X"
              className="w-full p-2 border rounded bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Pagado por (opcional)</label>
            <input
              name="pagado_por"
              value={form.pagado_por}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez"
              className="w-full p-2 border rounded bg-white dark:bg-zinc-800"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600"
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={disabled}
            className={`px-4 py-2 rounded text-white ${
              disabled ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {submitting ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}
