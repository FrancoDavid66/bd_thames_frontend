import { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";

import { createIngreso } from "../../store/slices/ingresosSlice";
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

// Normalizar categorías "largas"
const normalizarCategoria = (raw) => {
  const v = (raw ?? "").toString().trim();
  if (!v) return "";
  const lower = v.toLowerCase();

  if (lower.startsWith("pago de cuota de")) {
    return "Pago de seguro";
  }

  return v;
};

export default function IngresoCreateModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { ingresos, egresos } = useSelector((s) => s.balance || {});

  const [form, setForm] = useState({
    monto: "",
    fecha: dayjs().format("YYYY-MM-DD"),
    forma_pago: "EFECTIVO", // EFECTIVO | TRANSFERENCIA (UI)
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

  // al abrir: reset
  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setSubmitting(false);
    setForm((prev) => ({
      ...prev,
      fecha: dayjs().format("YYYY-MM-DD"),
    }));
    setTimeout(() => montoRef.current?.focus(), 60);
  }, [isOpen]);

  // Sugerencias desde localStorage
  const [localCats, setLocalCats] = useState(() =>
    readLS(STORAGE_CATS, []).map(normalizarCategoria)
  );
  const [localWallets] = useState(() => readLS(STORAGE_WALLETS, []));

  // Historial (normalizado)
  const fromIngresos = useMemo(
    () =>
      uniqClean(
        (ingresos || []).map((i) => normalizarCategoria(i.categoria))
      ),
    [ingresos]
  );
  const fromEgresos = useMemo(
    () =>
      uniqClean(
        (egresos || []).map((e) => normalizarCategoria(e.categoria))
      ),
    [egresos]
  );

  const categoriaOpciones = useMemo(
    () =>
      uniqClean([
        ...fromIngresos,
        ...fromEgresos,
        ...localCats,
        normalizarCategoria(form.categoria),
      ]),
    [fromIngresos, fromEgresos, localCats, form.categoria]
  );

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
      forma_pago: fp, // "EFECTIVO" | "TRANSFERENCIA"
      billetera: fp === "TRANSFERENCIA" ? p.billetera : "",
    }));

  const validate = () => {
    const e = {};
    if (!form.monto || Number(form.monto) <= 0)
      e.monto = "Ingresá un monto válido.";
    if (!form.fecha) e.fecha = "Seleccioná la fecha.";
    if (!form.categoria?.trim()) e.categoria = "Indicá la categoría.";
    if (form.forma_pago === "TRANSFERENCIA" && !form.billetera?.trim())
      e.billetera = "Indicá la cuenta / banco.";

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

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    const montoNum = Number(form.monto || 0);
    if (!montoNum || montoNum <= 0) return;

    const categoriaNormalizada = normalizarCategoria(form.categoria);

    // Mapeamos a los valores que entiende el backend
    // EFECTIVO (UI)      -> "EFECTIVO" (backend)
    // TRANSFERENCIA (UI) -> "TRANSFERENCIA" (backend)
    const formaPagoBackend =
      form.forma_pago === "EFECTIVO" ? "EFECTIVO" : "TRANSFERENCIA";

    const billeteraDetalle =
      form.forma_pago === "TRANSFERENCIA"
        ? form.billetera || "Sin especificar"
        : "";

    let descripcionBase =
      (form.descripcion || "").trim() ||
      `Ingreso ${categoriaNormalizada || ""}`.trim() ||
      "Ingreso";

    if (billeteraDetalle) {
      descripcionBase = `${descripcionBase} [Cuenta: ${billeteraDetalle}]`;
    }

    // Payload
    const payload = {
      monto: montoNum,
      fecha: form.fecha || dayjs().format("YYYY-MM-DD"),
      forma_pago: formaPagoBackend,
      billetera: billeteraDetalle,
      categoria: categoriaNormalizada || "Sin categoría",
      descripcion: descripcionBase,
      pagado_por: (form.pagado_por || "").trim() || "No especificado",
    };

    console.log(
      "[IngresoCreateModal] Enviando ingreso a /ingresos/:",
      payload
    );

    try {
      setSubmitting(true);
      await dispatch(createIngreso(payload));

      // Guardar categoría en LS para sugerencias
      if (categoriaNormalizada) {
        setLocalCats((prev) => {
          const next = uniqClean([...prev, categoriaNormalizada]);
          writeLS(STORAGE_CATS, next);
          return next;
        });
      }

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
      setErrors({});
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
    (form.forma_pago === "TRANSFERENCIA" && !form.billetera);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Nuevo ingreso">
      <form
        onSubmit={handleSubmit}
        className="space-y-5 text-zinc-800 dark:text-white"
      >
        {/* Monto / Fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm"
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
              name="fecha"
              type="date"
              value={form.fecha}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm"
            />
            {errors.fecha && (
              <p className="text-xs text-red-500 mt-1">
                {errors.fecha}
              </p>
            )}
          </div>
        </div>

        {/* Forma de pago */}
        <div className="space-y-2">
          <p className="block text-xs sm:text-sm mb-1">Forma de pago *</p>
          <div className="inline-flex rounded-full bg-zinc-100 dark:bg-zinc-900 p-1">
            <button
              type="button"
              onClick={() => setFormaPago("EFECTIVO")}
              className={`px-3 py-1 text-xs sm:text-sm rounded-full ${
                form.forma_pago === "EFECTIVO"
                  ? "bg-emerald-500 text-white"
                  : "text-zinc-600 dark:text-zinc-300"
              }`}
            >
              Efectivo / Caja
            </button>
            <button
              type="button"
              onClick={() => setFormaPago("TRANSFERENCIA")}
              className={`px-3 py-1 text-xs sm:text-sm rounded-full ${
                form.forma_pago === "TRANSFERENCIA"
                  ? "bg-emerald-500 text-white"
                  : "text-zinc-600 dark:text-zinc-300"
              }`}
            >
              Transferencia
            </button>
          </div>
        </div>

        {/* Cuenta (si es transferencia) */}
        {form.forma_pago === "TRANSFERENCIA" && (
          <div>
            <label className="block text-xs sm:text-sm mb-1">
              Cuenta / Banco *
            </label>
            <input
              ref={billeRef}
              name="billetera"
              list="billetera-opciones"
              value={form.billetera}
              onChange={handleChange}
              placeholder="Ej: Mercado Pago, Banco Nación…"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm"
            />
            <datalist id="billetera-opciones">
              {walletOpciones.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
            {errors.billetera && (
              <p className="text-xs text-red-500 mt-1">
                {errors.billetera}
              </p>
            )}
          </div>
        )}

        {/* Categoría */}
        <div>
          <label className="block text-xs sm:text-sm mb-1">
            Categoría *
          </label>
          <input
            ref={catRef}
            name="categoria"
            list="categoria-opciones"
            value={form.categoria}
            onChange={handleChange}
            placeholder="Ej: Pago de seguro, Servicios, Honorarios…"
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm"
          />
          <datalist id="categoria-opciones">
            {categoriaOpciones.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {errors.categoria && (
            <p className="text-xs text-red-500 mt-1">
              {errors.categoria}
            </p>
          )}
        </div>

        {/* Descripción + Pagado por */}
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
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={disabled}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold text-white ${
              disabled
                ? "bg-green-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {submitting ? "Guardando…" : "Guardar ingreso"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}
