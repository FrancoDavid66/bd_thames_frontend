import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

/**
 * Selector de Categoría con opción de crear nuevas.
 * - Toma sugerencias de Redux (ingresos/egresos) + localStorage.
 * - Permite agregar una categoría nueva desde el UI.
 */
const STORAGE_KEY = "balanzes_categorias";

function uniqClean(arr = []) {
  return Array.from(
    new Set(
      arr
        .map((x) => (x ?? "").toString().trim())
        .filter((x) => x.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));
}

export default function CategoriaSelect({
  label = "Categoría",
  value = "",
  onChange,
  required = false,
  className = "",
}) {
  // Sugerencias desde Redux
  const ingresos = useSelector((s) => s.ingresos?.list || []);
  const egresos = useSelector((s) => s.egresos?.list || []);

  // Sugerencias desde localStorage
  const [localCats, setLocalCats] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Merge y limpieza
  const opciones = useMemo(() => {
    const fromIngresos = (ingresos || []).map((i) => i?.categoria);
    const fromEgresos = (egresos || []).map((e) => e?.categoria);
    const merged = uniqClean([
      ...fromIngresos,
      ...fromEgresos,
      ...localCats,
      value,
    ]);
    return merged;
  }, [ingresos, egresos, localCats, value]);

  // Crear nueva categoría (UI)
  const [creando, setCreando] = useState(false);
  const [nueva, setNueva] = useState("");

  useEffect(() => {
    // Guarda cambios en localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localCats));
    } catch {}
  }, [localCats]);

  const handleSelect = (e) => {
    const v = e.target.value;
    if (v === "__new__") {
      setCreando(true);
      setNueva("");
      return;
    }
    onChange && onChange(v);
  };

  const handleCrear = () => {
    const v = (nueva || "").trim();
    if (!v) return;
    const next = uniqClean([...(localCats || []), v]);
    setLocalCats(next);
    onChange && onChange(v);
    setCreando(false);
    setNueva("");
  };

  const handleCancel = () => {
    setCreando(false);
    setNueva("");
  };

  return (
    <div className={className}>
      <label className="block text-[11px] sm:text-xs mb-1 text-zinc-400">
        {label}
        {required ? " *" : ""}
      </label>

      {!creando ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={value || ""}
            onChange={handleSelect}
            required={required}
            className="w-full px-3 py-2 rounded-2xl border border-zinc-800 bg-zinc-950 text-xs sm:text-sm text-zinc-50 focus:outline-none focus:ring-1 focus:ring-sky-400"
          >
            <option value="" disabled>
              {opciones.length ? "Seleccionar…" : "Sin opciones"}
            </option>
            {opciones.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
            <option value="__new__">➕ Nueva categoría…</option>
          </select>
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="px-3 py-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-[11px] sm:text-xs text-zinc-100 hover:bg-zinc-800 whitespace-nowrap"
            title="Crear nueva categoría"
          >
            Agregar
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            autoFocus
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCrear()}
            placeholder="Nombre de la nueva categoría"
            className="w-full px-3 py-2 rounded-2xl border border-zinc-800 bg-zinc-950 text-xs sm:text-sm text-zinc-50 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          <button
            type="button"
            onClick={handleCrear}
            className="px-3 py-2 rounded-2xl bg-emerald-500 text-[11px] sm:text-xs text-white hover:bg-emerald-600 whitespace-nowrap"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-[11px] sm:text-xs text-zinc-100 hover:bg-zinc-800 whitespace-nowrap"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
