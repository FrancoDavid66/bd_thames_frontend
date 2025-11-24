// src/components/balanzes/EgresoCreateModal.jsx
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";

import { createEgreso } from "../../store/slices/egresosSlice";
import ModalWrapper from "../comunes/ModalWrapper";
import CategoriaSelect from "./CategoriaSelect";

const today = () => dayjs().format("YYYY-MM-DD");

const initialForm = {
  descripcion: "",
  monto: "",
  categoria: "",
  fecha: today(),
  forma_pago: "EFECTIVO", // EFECTIVO | VIRTUAL
  billetera: "",
  observaciones: "",
};

const EgresoCreateModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...initialForm,
        fecha: today(),
      });
    }
  }, [isOpen]);

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

    const montoNum = parseFloat(form.monto || "0");
    if (!montoNum || montoNum <= 0) return;

    const payload = {
      descripcion: form.descripcion,
      monto: montoNum,
      categoria: form.categoria,
      fecha: form.fecha || undefined,
      forma_pago: form.forma_pago,
      billetera:
        form.forma_pago === "VIRTUAL" ? form.billetera || null : null,
      observaciones: form.observaciones || "",
    };

    dispatch(createEgreso(payload));
    setForm({
      ...initialForm,
      fecha: today(),
    });
    onClose && onClose();
  };

  const isVirtual = form.forma_pago === "VIRTUAL";

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Nuevo egreso">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 text-zinc-50 text-xs sm:text-sm"
      >
        {/* Descripción */}
        <div>
          <label className="block text-[11px] sm:text-xs mb-1 text-zinc-400">
            Descripción *
          </label>
          <input
            name="descripcion"
            onChange={handleChange}
            value={form.descripcion}
            required
            placeholder="Ej: Alquiler, servicios, honorarios…"
            className="w-full px-3 py-2 rounded-2xl border border-zinc-800 bg-zinc-950 text-xs sm:text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-400"
          />
        </div>

        {/* Monto + Fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] sm:text-xs mb-1 text-zinc-400">
              Monto *
            </label>
            <input
              name="monto"
              type="number"
              step="0.01"
              min="0"
              onChange={handleChange}
              value={form.monto}
              required
              placeholder="0,00"
              className="w-full px-3 py-2 rounded-2xl border border-zinc-800 bg-zinc-950 text-xs sm:text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-400"
            />
          </div>
          <div>
            <label className="block text-[11px] sm:text-xs mb-1 text-zinc-400">
              Fecha del egreso
            </label>
            <input
              name="fecha"
              type="date"
              onChange={handleChange}
              value={form.fecha}
              className="w-full px-3 py-2 rounded-2xl border border-zinc-800 bg-zinc-950 text-xs sm:text-sm text-zinc-50 focus:outline-none focus:ring-1 focus:ring-rose-400"
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
            <label className="block text-[11px] sm:text-xs mb-1 text-zinc-400">
              Forma de pago
            </label>
            <select
              name="forma_pago"
              value={form.forma_pago}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-2xl border border-zinc-800 bg-zinc-950 text-xs sm:text-sm text-zinc-50 focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              <option value="EFECTIVO">Efectivo / Caja</option>
              <option value="VIRTUAL">Virtual (billetera / cuenta)</option>
            </select>
          </div>

          {isVirtual && (
            <div>
              <label className="block text-[11px] sm:text-xs mb-1 text-zinc-400">
                Billetera / Cuenta
              </label>
              <input
                name="billetera"
                onChange={handleChange}
                value={form.billetera}
                placeholder="Ej: Mercado Pago, cuenta banco…"
                className="w-full px-3 py-2 rounded-2xl border border-zinc-800 bg-zinc-950 text-xs sm:text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>
          )}
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-[11px] sm:text-xs mb-1 text-zinc-400">
            Observaciones
          </label>
          <textarea
            name="observaciones"
            onChange={handleChange}
            value={form.observaciones}
            rows={3}
            placeholder="Notas internas, detalle de comprobantes, etc."
            className="w-full px-3 py-2 rounded-2xl border border-zinc-800 bg-zinc-950 text-xs sm:text-sm text-zinc-50 placeholder:text-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-rose-400"
          />
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-2xl text-xs sm:text-sm bg-zinc-900 border border-zinc-800 text-zinc-100 hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold bg-rose-500 text-white hover:bg-rose-600 active:scale-[0.99]"
          >
            Guardar egreso
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

export default EgresoCreateModal;
