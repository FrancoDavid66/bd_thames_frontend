// src/components/balanzes/CategoriaSelect.jsx  (diseño Duo)
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCategorias } from "../../store/slices/balanceSlice";

export default function CategoriaSelect({
  value,
  onChange,
  tipo, // "INGRESO" o "EGRESO"
  error,
  refProp,
  label = "Categoría",
  asteriskColor = "text-duo-rojo",
}) {
  const dispatch = useDispatch();
  const { categorias } = useSelector((s) => s.balance || {});

  // Al montarse, le pide a Django las categorías de este tipo específico
  useEffect(() => {
    dispatch(fetchCategorias(tipo));
  }, [dispatch, tipo]);

  // Filtramos la lista oficial
  const opciones = useMemo(() => {
    if (!categorias) return [];
    return categorias
      .filter((c) => c.tipo === tipo || c.tipo === "AMBOS")
      .map((c) => c.nombre)
      .sort((a, b) => a.localeCompare(b));
  }, [categorias, tipo]);

  return (
    <div>
      <label className="block text-xs font-black mb-1.5 text-suave dark:text-suave-dark">
        {label} <span className={asteriskColor}>*</span>
      </label>
      <input
        ref={refProp}
        name="categoria"
        list={`categoria-opciones-${tipo}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={tipo === "INGRESO" ? "Ej: Cobro de póliza, Honorarios…" : "Ej: Limpieza, Internet, Viáticos…"}
        className="w-full px-3 py-2.5 border-2 rounded-xl bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark text-sm font-bold placeholder:text-suave dark:placeholder:text-suave-dark focus:outline-none focus:border-duo-azul transition-colors"
        autoComplete="off"
      />
      <datalist id={`categoria-opciones-${tipo}`}>
        {opciones.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      {error && <p className="text-[11px] font-bold text-duo-rojo mt-1">{error}</p>}
    </div>
  );
}