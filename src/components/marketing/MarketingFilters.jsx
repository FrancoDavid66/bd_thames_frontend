import { useState, useEffect } from "react";
import { FaDownload, FaEye, FaFilter, FaTimes, FaCar, FaMapMarkerAlt, FaBullseye } from "react-icons/fa";

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
    <div className="rounded-3xl bg-slate-900/65 ring-1 ring-white/10 p-5 md:p-7">
      <div className="flex items-start gap-4 mb-7">
        <div className="h-11 w-11 rounded-2xl bg-yellow-400/10 ring-1 ring-yellow-400/20 flex items-center justify-center text-yellow-400 text-lg shrink-0">
          <Icon />
        </div>
        <div>
          <div className="text-lg font-black text-white leading-tight">{title}</div>
          <div className="text-sm text-slate-400 mt-1">{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

// Bloque de filtros agrupado, con encabezado propio.
function Group({ icon: Icon, title, hint, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="text-yellow-400/80 text-xs" />}
        <span className="text-[11px] font-black uppercase tracking-widest text-yellow-400/90">{title}</span>
        {hint && <span className="text-[11px] text-slate-500 normal-case font-medium tracking-normal">· {hint}</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">{children}</div>
    </div>
  );
}

function Field({ label, children, full = false }) {
  return (
    <div className={`flex flex-col min-w-0 ${full ? "sm:col-span-2" : ""}`}>
      <label className="block text-[11px] font-black text-slate-400 mb-2.5 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

const selectBase =
  "w-full h-12 rounded-xl bg-slate-950/50 border border-white/10 px-4 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/50 text-white cursor-pointer text-sm transition-all hover:bg-white/5 truncate";

function MultiSelect({ values = [], options = [], onChange, placeholder = "Todos", addLabel = "+ Agregar" }) {
  const currentValues = Array.isArray(values) ? values : values ? [values] : [];

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
    onChange(currentValues.filter((v) => v !== valToRemove));
  };

  return (
    <div className="space-y-3">
      {currentValues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentValues.map((val) => (
            <span
              key={val}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400/10 text-yellow-400 text-xs font-bold uppercase rounded-xl border border-yellow-400/20 shadow-sm transition-all hover:bg-yellow-400/20"
            >
              {val}
              <button
                onClick={() => removeValue(val)}
                className="hover:text-white transition-colors ml-1 p-0.5 rounded-full hover:bg-black/20"
              >
                <FaTimes size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <select onChange={handleSelect} value="" className={selectBase}>
        <option value="" className="text-slate-500">
          {currentValues.length === 0 ? placeholder : addLabel}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt} disabled={currentValues.includes(opt)} className="text-black bg-white">
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
  const tiposVehiculo = toOptions(options.tipos);
  const coberturas = toOptions(options.coberturas);
  const localidades = toOptions(options.localidades);
  const partidos = toOptions(options.partidos);

  const [oficinasReal, setOficinasReal] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("jwt");
    const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

    fetch(`${API_BASE}/usuarios/oficinas/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const arr = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        setOficinasReal(arr.filter((ofi) => ofi.activa === true));
      })
      .catch((err) => console.error("Error cargando oficinas en marketing:", err));
  }, []);

  const esRango = values.dias_condicion === "vencieron_entre";

  return (
    <div className="space-y-6">
      <Section
        icon={FaFilter}
        title="Filtros de campaña"
        subtitle="Elegí a quién le llega el mensaje: estado, vencimiento, vehículo y zona."
      >
        <div className="space-y-8">
          {/* ───────── A QUIÉN LE LLEGA ───────── */}
          <Group icon={FaBullseye} title="A quién le llega" hint="estado y vencimiento">
            <Field label="Estado de póliza">
              <select
                value={values.estado || "activa"}
                onChange={(e) => onChange("estado", e.target.value)}
                className="w-full h-12 rounded-xl bg-yellow-400/5 border border-yellow-400/20 px-4 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/50 text-yellow-400 font-bold cursor-pointer text-sm transition-all hover:bg-yellow-400/10 truncate"
              >
                <option value="activa,vencida,pendiente,nueva,cotizar,renovacion" className="text-black bg-white">🌐 Sin filtro (todas)</option>
                <option value="activa" className="text-black bg-white">✅ Activas (al día)</option>
                <option value="vencida" className="text-black bg-white">⚠️ Vencidas (con deuda)</option>
                <option value="activa,vencida" className="text-black bg-white">Activas y vencidas</option>
              </select>
            </Field>

            <Field label="Filtro por vencimiento">
              <select
                value={values.dias_condicion || ""}
                onChange={(e) => {
                  onChange("dias_condicion", e.target.value);
                  if (!e.target.value) {
                    onChange("dias_cantidad", "");
                    onChange("dias_desde", "");
                    onChange("dias_hasta", "");
                  }
                }}
                className="w-full h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 px-4 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/50 text-sky-400 font-bold cursor-pointer text-sm transition-all hover:bg-sky-500/20 truncate"
              >
                <option value="" className="text-black bg-white">Sin filtro de días</option>
                <option value="vencen_en" className="text-black bg-white">⏳ Vencen en exactamente…</option>
                <option value="vencieron_hace" className="text-black bg-white">⏰ Vencieron hace exactamente…</option>
                <option value="vencieron_hace_mas" className="text-black bg-white">🎯 Vencieron hace … o MÁS (reconquista)</option>
                <option value="vencieron_entre" className="text-black bg-white">📆 Vencieron entre X y Y días (rango)</option>
              </select>
            </Field>

            {esRango ? (
              <Field label="Rango de días vencidos" full>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    placeholder="30"
                    value={values.dias_desde || ""}
                    onChange={(e) => onChange("dias_desde", e.target.value)}
                    className="w-full h-12 rounded-xl bg-slate-950/50 border border-white/10 px-3 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/50 text-white text-sm text-center transition-all"
                  />
                  <span className="text-slate-500 text-xs font-bold shrink-0 uppercase tracking-widest">a</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="40"
                    value={values.dias_hasta || ""}
                    onChange={(e) => onChange("dias_hasta", e.target.value)}
                    className="w-full h-12 rounded-xl bg-slate-950/50 border border-white/10 px-3 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/50 text-white text-sm text-center transition-all"
                  />
                  <span className="text-slate-500 text-xs font-medium shrink-0">días</span>
                </div>
              </Field>
            ) : (
              <Field label={values.dias_condicion === "vencieron_hace_mas" ? "Días o más" : "Cantidad de días"}>
                <input
                  type="number"
                  min="0"
                  placeholder={values.dias_condicion === "vencieron_hace_mas" ? "Ej: 30" : "Ej: 4"}
                  disabled={!values.dias_condicion}
                  value={values.dias_cantidad || ""}
                  onChange={(e) => onChange("dias_cantidad", e.target.value)}
                  className="w-full h-12 rounded-xl bg-slate-950/50 border border-white/10 px-4 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/50 text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                />
              </Field>
            )}
          </Group>

          <div className="border-t border-white/5" />

          {/* ───────── VEHÍCULO ───────── */}
          <Group icon={FaCar} title="Vehículo">
            <Field label="Tipo de vehículo">
              <MultiSelect values={values.tipo} options={tiposVehiculo} onChange={(a) => onChange("tipo", a)} placeholder="Todos los tipos" addLabel="+ Agregar tipo" />
            </Field>
            <Field label="Coberturas">
              <MultiSelect values={values.cobertura} options={coberturas} onChange={(a) => onChange("cobertura", a)} placeholder="Todas las coberturas" addLabel="+ Agregar cobertura" />
            </Field>
            <Field label="Marcas">
              <MultiSelect values={values.marca} options={marcas} onChange={(a) => onChange("marca", a)} placeholder="Todas las marcas" addLabel="+ Agregar marca" />
            </Field>
            <Field label="Modelos">
              <MultiSelect values={values.modelo} options={modelos} onChange={(a) => onChange("modelo", a)} placeholder="Todos los modelos" addLabel="+ Agregar modelo" />
            </Field>
            <Field label="Años">
              <MultiSelect values={values.anio} options={anios} onChange={(a) => onChange("anio", a)} placeholder="Todos los años" addLabel="+ Agregar año" />
            </Field>
            <Field label="Compañías">
              <MultiSelect values={values.compania} options={companias} onChange={(a) => onChange("compania", a)} placeholder="Todas las compañías" addLabel="+ Agregar cía" />
            </Field>
          </Group>

          <div className="border-t border-white/5" />

          {/* ───────── ZONA Y EMISOR ───────── */}
          <Group icon={FaMapMarkerAlt} title="Zona y emisor">
            <Field label="Oficina que envía">
              <select
                value={values.oficina || ""}
                onChange={(e) => onChange("oficina", e.target.value)}
                className={selectBase}
              >
                <option value="" className="text-black bg-white">Todas las oficinas</option>
                {oficinasReal.map((ofi) => (
                  <option key={ofi.id} value={ofi.id} className="text-black bg-white">
                    {ofi.nombre} ({ofi.id})
                  </option>
                ))}
              </select>
            </Field>
            <div className="hidden sm:block" />
            <Field label="Localidad">
              <MultiSelect values={values.localidad} options={localidades} onChange={(a) => onChange("localidad", a)} placeholder="Todas las localidades" addLabel="+ Agregar localidad" />
            </Field>
            <Field label="Partido / Zona">
              <MultiSelect values={values.partido} options={partidos} onChange={(a) => onChange("partido", a)} placeholder="Todos los partidos" addLabel="+ Agregar partido" />
            </Field>
          </Group>
        </div>

        {(onPreview || onExport) && (
          <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-4 border-t border-white/10 pt-6">
            {onPreview && (
              <button
                onClick={onPreview}
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-yellow-400 text-gray-950 font-black hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20"
              >
                <FaEye className={loading ? "animate-pulse" : "text-lg"} /> Previsualizar audiencia
              </button>
            )}

            {onExport && (
              <div className="flex items-center gap-3 sm:ml-auto">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Exportar:</span>
                <button onClick={() => onExport("csv")} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-slate-300 hover:text-white transition-all">
                  <FaDownload /> CSV
                </button>
                <button onClick={() => onExport("xlsx")} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-slate-300 hover:text-white transition-all">
                  <FaDownload /> Excel
                </button>
              </div>
            )}
          </div>
        )}
      </Section>

      {!!errorText && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-5 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <FaTimes />
          </div>
          <p className="text-sm font-medium text-rose-200">{errorText}</p>
        </div>
      )}
    </div>
  );
}