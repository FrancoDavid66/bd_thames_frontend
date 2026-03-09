import { FaDownload, FaEye, FaFilter, FaTimes } from "react-icons/fa";

const ORDER_OFI = ["", "1", "2", "3"];

const oficinaLabel = (v) => {
  const s = String(v || "").trim();
  if (s === "1") return "5 esquinas (1)";
  if (s === "2") return "axion (2)";
  if (s === "3") return "kilometro 39 (3)";
  return "Todas";
};

const toOptions = (arr) =>
  Array.isArray(arr)
    ? arr
        .map((v) => String(v ?? "").trim())
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort((a, b) => a.localeCompare(b, "es"))
    : [];

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="rounded-3xl bg-slate-900/65 ring-1 ring-white/10 p-4 md:p-6">
      <div className="flex items-start gap-3 mb-6">
        <div className="h-11 w-11 rounded-2xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center text-slate-100">
          <Icon />
        </div>
        <div>
          <div className="text-base font-black text-white">{title}</div>
          <div className="text-sm text-slate-400">{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col">
      <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

// MultiSelect visualmente mejorado y espaciado
function MultiSelect({ values = [], options = [], onChange, placeholder = "Todos", addLabel = "+ Agregar" }) {
  const currentValues = Array.isArray(values) ? values : (values ? [values] : []);

  const handleSelect = (e) => {
    const val = e.target.value;
    if (!val) {
      onChange([]); 
      return;
    }
    if (!currentValues.includes(val)) {
      onChange([...currentValues, val]);
    }
    e.target.value = "";
  };

  const removeValue = (valToRemove) => {
    onChange(currentValues.filter(v => v !== valToRemove));
  };

  return (
    <div className="space-y-3">
      {/* Etiquetas seleccionadas (ahora con más espacio) */}
      {currentValues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentValues.map(val => (
            <span key={val} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-400/20 text-yellow-400 text-[11px] font-black uppercase rounded-lg border border-yellow-400/30 shadow-sm">
              {val}
              <button onClick={() => removeValue(val)} className="hover:text-white transition-colors ml-1">
                <FaTimes size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Selector para agregar */}
      <select
        onChange={handleSelect}
        value="" 
        className="w-full h-11 rounded-xl bg-white/5 ring-1 ring-white/10 px-3 outline-none focus:ring-2 focus:ring-yellow-400 text-white cursor-pointer text-sm text-ellipsis overflow-hidden whitespace-nowrap hover:bg-white/10 transition-colors"
      >
        <option value="" className="text-black">
          {currentValues.length === 0 ? placeholder : addLabel}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt} disabled={currentValues.includes(opt)} className="text-black">
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function MarketingFilters({
  values,
  onChange,
  onPreview,
  onExport,
  loading = false,
  errorText = "",
  options = {},
}) {
  const marcas = toOptions(options.marcas);
  const anios = toOptions(options.anios);
  const modelos = toOptions(options.modelos);
  const companias = toOptions(options.companias);

  return (
    <div className="space-y-5">
      <Section
        icon={FaFilter}
        title="Filtros de Campaña"
        subtitle="Selecciona múltiples valores por categoría."
      >
        {/* ✅ GRID CORREGIDA: Más espacio entre columnas (gap-6) y mejor adaptación a pantallas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 items-start">
          
          <Field label="Oficina (Emisor)">
            <select
              value={values.oficina}
              onChange={(e) => onChange("oficina", e.target.value)}
              className="w-full h-11 rounded-xl bg-white/5 ring-1 ring-white/10 px-3 outline-none focus:ring-2 focus:ring-yellow-400 text-white text-sm hover:bg-white/10 transition-colors"
            >
              {ORDER_OFI.map((v) => (
                <option key={v || "ALL"} value={v} className="text-black">
                  {oficinaLabel(v)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Marcas">
            <MultiSelect 
              values={values.marca} 
              options={marcas} 
              onChange={(newArr) => onChange("marca", newArr)} 
              placeholder="Todas" 
              addLabel="+ Agregar Marca"
            />
          </Field>

          <Field label="Años">
            <MultiSelect 
              values={values.anio} 
              options={anios} 
              onChange={(newArr) => onChange("anio", newArr)} 
              placeholder="Todos" 
              addLabel="+ Agregar Año"
            />
          </Field>

          <Field label="Modelos">
            <MultiSelect 
              values={values.modelo} 
              options={modelos} 
              onChange={(newArr) => onChange("modelo", newArr)} 
              placeholder="Todos" 
              addLabel="+ Agregar Modelo"
            />
          </Field>

          <Field label="Compañías">
            <MultiSelect 
              values={values.compania} 
              options={companias} 
              onChange={(newArr) => onChange("compania", newArr)} 
              placeholder="Todas" 
              addLabel="+ Agregar Cía"
            />
          </Field>
        </div>

        {(onPreview || onExport) && (
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/5 pt-5">
            {onPreview && (
              <button
                onClick={onPreview}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-yellow-400 text-gray-950 font-black hover:brightness-95 transition-all"
              >
                <FaEye className={loading ? "animate-pulse" : ""} /> Previsualizar
              </button>
            )}

            {onExport && (
              <>
                <button
                  onClick={() => onExport("csv")}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl bg-white/10 hover:bg-white/15 ring-1 ring-white/10 text-sm font-semibold text-white transition-all"
                >
                  <FaDownload /> CSV
                </button>

                <button
                  onClick={() => onExport("xlsx")}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl bg-white/10 hover:bg-white/15 ring-1 ring-white/10 text-sm font-semibold text-white transition-all"
                >
                  <FaDownload /> XLSX
                </button>
              </>
            )}
          </div>
        )}
      </Section>

      {!!errorText && (
        <div className="rounded-2xl bg-rose-500/10 ring-1 ring-rose-400/30 p-4 text-sm text-rose-200">
          {errorText}
        </div>
      )}
    </div>
  );
}