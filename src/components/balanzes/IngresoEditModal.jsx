import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";

import { updateIngreso } from "../../store/slices/ingresosSlice";
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

export default function IngresoEditModal({ isOpen, onClose, ingreso }) {
  const dispatch = useDispatch();
  const ingresos = useSelector((s) => s.ingresos?.list || []);
  const egresos = useSelector((s) => s.egresos?.list || []);

  const [form, setForm] = useState({
    monto: "",
    fecha: dayjs().format("YYYY-MM-DD"),
    forma_pago: "EFECTIVO",
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

  useEffect(() => {
    if (!isOpen || !ingreso) return;
    setErrors({});
    setSubmitting(false);
    setForm({
      monto:
        typeof ingreso.monto === "number"
          ? ingreso.monto.toString()
          : ingreso.monto ?? "",
      fecha: (ingreso.fecha || dayjs().format("YYYY-MM-DD")).slice(0, 10),
      forma_pago: ingreso.forma_pago || "EFECTIVO",
      billetera: ingreso.billetera || "",
      categoria: ingreso.categoria || "",
      descripcion: ingreso.descripcion || "",
      pagado_por: ingreso.pagado_por || "",
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
      billetera: fp === "VIRTUAL" ? p.billetera : "",
    }));

  const validate = () => {
    const e = {};
    if (!form.monto || Number(form.monto) <= 0)
      e.monto = "Ingresá un monto válido.";
    if (!form.fecha) e.fecha = "Seleccioná la fecha.";
    if (!form.categoria?.trim()) e.categoria = "Indicá la categoría.";
    if (form.forma_pago === "VIRTUAL" && !form.billetera?.trim())
      e.billetera = "Indicá la billetera/cuenta.";
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
    try {
      setSubmitting(true);
      await dispatch(updateIngreso({ id: ingreso.id, ...form }));
      onClose?.();
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
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Editar ingreso">
      <form
        onSubmit={handleSubmit}
        className="space-y-5 text-zinc-800 dark:text-white"
      >
        {/* Monto / Fecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs sm:text-sm mb-1">
              Monto *
            </label>
            <input
              ref={montoRef}
              name="monto"
              type="number"
              step="0.01"
              min="0"
              value={form.monto}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm ${
                errors.monto ? "border-red-500" : ""
              }`}
              placeholder="0,00"
            />
            {errors.monto && (
              <p className="text-xs text-red-500 mt-1">{errors.monto}</p>
            )}
          </div>
          <div>
            <label className="block text-xs sm:text-sm mb-1">
              Fecha *
            </label>
            <input
              ref={fechaRef}
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm ${
                errors.fecha ? "border-red-500" : ""
              }`}
            />
            {errors.fecha && (
              <p className="text-xs text-red-500 mt-1">{errors.fecha}</p>
            )}
          </div>
        </div>

        {/* Forma de pago + Billetera si aplica */}
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-2">
            Forma de pago
          </label>
          <div className="inline-flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setFormaPago("EFECTIVO")}
              className={`px-3 py-1.5 text-xs sm:text-sm ${
                form.forma_pago === "EFECTIVO"
                  ? "bg-green-600 text-white"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
              }`}
            >
              Efectivo
            </button>
            <button
              type="button"
              onClick={() => setFormaPago("VIRTUAL")}
              className={`px-3 py-1.5 text-xs sm:text-sm ${
                form.forma_pago === "VIRTUAL"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
              }`}
            >
              Virtual
            </button>
          </div>

          {form.forma_pago === "VIRTUAL" && (
            <div className="mt-3">
              <label className="block text-xs sm:text-sm mb-1">
                Billetera / Cuenta destino *
              </label>
              <input
                ref={billeRef}
                name="billetera"
                value={form.billetera}
                onChange={handleChange}
                list="wallet-suggestions-edit"
                placeholder="Ej: MP de Manu / Brubank de Candela"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm ${
                  errors.billetera ? "border-red-500" : ""
                }`}
              />
              <datalist id="wallet-suggestions-edit">
                {walletOpciones.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
              {errors.billetera && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.billetera}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-xs sm:text-sm mb-1">
            Categoría *
          </label>
          <input
            ref={catRef}
            name="categoria"
            value={form.categoria}
            onChange={handleChange}
            list="cat-suggestions-edit"
            placeholder="Escribí o elegí una categoría"
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm ${
              errors.categoria ? "border-red-500" : ""
            }`}
          />
          <datalist id="cat-suggestions-edit">
            {catOpciones.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
          {errors.categoria && (
            <p className="text-xs text-red-500 mt-1">
              {errors.categoria}
            </p>
          )}
        </div>

        {/* Descripción + Pagado por (opcionales) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs sm:text-sm mb-1">
              Descripción (opcional)
            </label>
            <input
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Ej: Cobro servicio X"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm mb-1">
              Pagado por (opcional)
            </label>
            <input
              name="pagado_por"
              value={form.pagado_por}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700"
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            id="ingreso-edit-guardar-btn"
            type="submit"
            disabled={disabled}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold text-white ${
              disabled
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {submitting ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}
