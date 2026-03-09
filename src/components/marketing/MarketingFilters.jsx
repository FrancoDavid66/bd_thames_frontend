import { FaDownload, FaEye, FaFilter } from "react-icons/fa";

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
    <div className="rounded-3xl bg-slate-900/65 ring-1 ring-white/10 p-4 md:p-5">
      <div className="flex items-start gap-3 mb-4">
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
    <div>
      <label className="block text-xs font-semibold text-slate-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Select({ children, className = "", ...props }) {
  return (
    <select
      {...props}
      className={`w-full h-11 rounded-xl bg-white/10 ring-1 ring-white/10 px-3 outline-none focus:ring-2 focus:ring-yellow-400 text-white ${className}`}
    >
      {children}
    </select>
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
  // Ahora incluimos marcas
  const marcas = toOptions(options.marcas);
  const anios = toOptions(options.anios);
  const modelos = toOptions(options.modelos);
  const companias = toOptions(options.companias);

  return (
    <div className="space-y-5">
      <Section
        icon={FaFilter}
        title="Filtros de Campaña"
        subtitle="Segmentación por vehículo y oficina."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Oficina">
            <Select
              value={values.oficina}
              onChange={(e) => onChange("oficina", e.target.value)}
            >
              {ORDER_OFI.map((v) => (
                <option key={v || "ALL"} value={v} className="text-black">
                  {oficinaLabel(v)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Marca">
            <Select
              value={values.marca}
              onChange={(e) => onChange("marca", e.target.value)}
            >
              <option value="" className="text-black">Todas</option>
              {marcas.map((v) => (
                <option key={v} value={v} className="text-black">
                  {v}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Año">
            <Select
              value={values.anio}
              onChange={(e) => onChange("anio", e.target.value)}
            >
              <option value="" className="text-black">Todos</option>
              {anios.map((v) => (
                <option key={v} value={v} className="text-black">
                  {v}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Modelo">
            <Select
              value={values.modelo}
              onChange={(e) => onChange("modelo", e.target.value)}
            >
              <option value="" className="text-black">Todos</option>
              {modelos.map((v) => (
                <option key={v} value={v} className="text-black">
                  {v}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Compañía">
            <Select
              value={values.compania}
              onChange={(e) => onChange("compania", e.target.value)}
            >
              <option value="" className="text-black">Todas</option>
              {companias.map((v) => (
                <option key={v} value={v} className="text-black">
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={onPreview}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-yellow-400 text-gray-950 font-black hover:brightness-95"
          >
            <FaEye className={loading ? "animate-pulse" : ""} />
            Previsualizar
          </button>

          <button
            onClick={() => onExport("csv")}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl bg-white/10 hover:bg-white/15 ring-1 ring-white/10 text-sm font-semibold text-white"
          >
            <FaDownload />
            CSV
          </button>

          <button
            onClick={() => onExport("xlsx")}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl bg-white/10 hover:bg-white/15 ring-1 ring-white/10 text-sm font-semibold text-white"
          >
            <FaDownload />
            XLSX
          </button>
        </div>
      </Section>

      {!!errorText && (
        <div className="rounded-2xl bg-rose-500/10 ring-1 ring-rose-400/30 p-3 text-sm text-rose-200">
          {errorText}
        </div>
      )}
    </div>
  );
}