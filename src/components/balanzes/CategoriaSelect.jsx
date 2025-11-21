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
      return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Merge y limpieza
  const opciones = useMemo(() => {
    const fromIngresos = (ingresos || []).map((i) => i?.categoria);
    const fromEgresos = (egresos || []).map((e) => e?.categoria);
    const merged = uniqClean([...fromIngresos, ...fromEgresos, ...localCats, value]);
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
      <label className="block text-sm mb-1">{label}{required ? " *" : ""}</label>

      {!creando ? (
        <div className="flex gap-2">
          <select
            value={value || ""}
            onChange={handleSelect}
            required={required}
            className="w-full p-2 border rounded bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white"
          >
            <option value="" disabled>{opciones.length ? "Seleccionar…" : "Sin opciones"}</option>
            {opciones.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
            <option value="__new__">➕ Nueva categoría…</option>
          </select>
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="px-3 py-2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600"
            title="Crear nueva categoría"
          >
            Agregar
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            autoFocus
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            placeholder="Nombre de la nueva categoría"
            className="w-full p-2 border rounded bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white"
          />
          <button
            type="button"
            onClick={handleCrear}
            className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
