// src/components/cuponeras/CuponerasFiltersBar.jsx
import { HiSearch } from "react-icons/hi";

function normalizeOficinaOption(raw) {
  if (raw == null) return null;

  // string
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    return { value: s, label: s };
  }

  // number
  if (typeof raw === "number") {
    return { value: String(raw), label: `Oficina ${raw}` };
  }

  // object (varios formatos posibles)
  const value =
    raw.value ??
    raw.id ??
    raw.pk ??
    raw.codigo ??
    raw.oficina_id ??
    raw.oficina ??
    "";

  const label =
    raw.label ??
    raw.nombre ??
    raw.name ??
    raw.descripcion ??
    (typeof value === "string" ? value : String(value || ""));

  const v = String(value || "").trim();
  const l = String(label || "").trim();

  if (!v && !l) return null;

  return { value: v || l, label: l || v };
}

export default function CuponerasFiltersBar({
  search,
  setSearch,
  oficina,
  setOficina,
  oficinas = [],
  loading = false,
}) {
  const options = (() => {
    const map = new Map();
    for (const o of oficinas || []) {
      const opt = normalizeOficinaOption(o);
      if (!opt?.value) continue;
      if (!map.has(opt.value)) map.set(opt.value, opt);
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.label || "").localeCompare(b.label || "", "es")
    );
  })();

  const oficinaDisabled = loading || options.length === 0;

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
      {/* Search */}
      <div className="w-full lg:max-w-lg">
        <label className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Buscar
        </label>

        <div className="relative mt-2">
          <HiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            className="w-full rounded-full border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition
                       focus:ring-2 focus:ring-sky-400/60
                       dark:bg-slate-900/80 dark:text-slate-100 dark:border-slate-700/60"
            placeholder="Buscar por póliza, patente, asegurado o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
            aria-label="Buscar cuponeras"
          />
        </div>

        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Podés escribir parte del número de póliza, la patente, el nombre o el
          DNI.
        </p>
      </div>

      {/* Oficina */}
      <div className="w-full lg:w-80">
        <label className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Oficina
        </label>

        <select
          className="mt-2 w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition
                     focus:ring-2 focus:ring-sky-400/60
                     disabled:opacity-60 disabled:cursor-not-allowed
                     dark:bg-slate-900/80 dark:text-slate-100 dark:border-slate-700/60"
          value={oficina}
          onChange={(e) => setOficina(e.target.value)}
          disabled={oficinaDisabled}
          aria-label="Filtrar por oficina"
        >
          <option value="">Todas</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {options.length === 0 && !loading && (
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            No se detectaron oficinas (o el endpoint aún no está).
          </p>
        )}
      </div>
    </div>
  );
}
