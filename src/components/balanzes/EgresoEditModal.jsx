// src/components/balanzes/EgresoEditModal.jsx
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";

import { updateEgreso } from "../../store/slices/egresosSlice";
import ModalWrapper from "../comunes/ModalWrapper";
import CategoriaSelect from "./CategoriaSelect";

const toDateInput = (value) => {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
};

const EgresoEditModal = ({ isOpen, onClose, egreso }) => {
  const dispatch = useDispatch();

  const [form, setForm] = useState({
    descripcion: "",
    monto: "",
    categoria: "",
    fecha: "",
    forma_pago: "EFECTIVO",
    billetera: "",
    observaciones: "",
  });

  useEffect(() => {
    if (egreso && isOpen) {
      setForm({
        descripcion: egreso.descripcion || "",
        monto:
          typeof egreso.monto === "number"
            ? egreso.monto.toString()
            : egreso.monto || "",
        categoria: egreso.categoria || "",
        fecha: toDateInput(egreso.fecha) || "",
        forma_pago: egreso.forma_pago || "EFECTIVO",
        billetera: egreso.billetera || "",
        observaciones: egreso.observaciones || "",
      });
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!egreso) return;

    const montoNum = parseFloat(form.monto || "0");
    if (!montoNum || montoNum <= 0) return;

    const payload = {
      descripcion: form.descripcion,
      monto: montoNum,
      categoria: form.categoria,
      fecha: form.fecha || null,
      forma_pago: form.forma_pago,
      billetera:
        form.forma_pago === "VIRTUAL" ? form.billetera || null : null,
      observaciones: form.observaciones || "",
    };

    dispatch(updateEgreso({ id: egreso.id, ...payload }));
    onClose && onClose();
  };

  const isVirtual = form.forma_pago === "VIRTUAL";

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Editar egreso">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 text-zinc-800 dark:text-white"
      >
        {/* Descripción */}
        <div>
          <label className="block text-xs sm:text-sm mb-1">
            Descripción *
          </label>
          <input
            name="descripcion"
            onChange={handleChange}
            value={form.descripcion}
            required
            placeholder="Ej: Pago de alquiler, Luz, Honorarios…"
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm"
          />
        </div>

        {/* Monto + Fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs sm:text-sm mb-1">Monto *</label>
            <input
              name="monto"
              type="number"
              step="0.01"
              min="0"
              onChange={handleChange}
              value={form.monto}
              required
              placeholder="0,00"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm mb-1">
              Fecha del egreso
            </label>
            <input
              name="fecha"
              type="date"
              onChange={handleChange}
              value={form.fecha}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm"
            />
          </div>
        </div>

        {/* Categoría */}
        <CategoriaSelect
          label="Categoría"
          required
          value={form.categoria}
          onChange={handleCategoriaChange}
          className="mt-1"
        />

        {/* Forma de pago + billetera */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs sm:text-sm mb-1">
              Forma de pago
            </label>
            <select
              name="forma_pago"
              value={form.forma_pago}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm"
            >
              <option value="EFECTIVO">Efectivo / Caja</option>
              <option value="VIRTUAL">Virtual (billetera / cuenta)</option>
            </select>
          </div>

          {isVirtual && (
            <div>
              <label className="block text-xs sm:text-sm mb-1">
                Billetera / Cuenta
              </label>
              <input
                name="billetera"
                onChange={handleChange}
                value={form.billetera}
                placeholder="Ej: Mercado Pago, Cuenta banco…"
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm"
              />
            </div>
          )}
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-xs sm:text-sm mb-1">
            Observaciones
          </label>
          <textarea
            name="observaciones"
            onChange={handleChange}
            value={form.observaciones}
            rows={3}
            placeholder="Notas internas, detalle de comprobantes, etc."
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm resize-none"
          />
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
          >
            Guardar cambios
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

export default EgresoEditModal;
