import { useState, useEffect } from "react";
import { FaDownload, FaEye, FaFilter, FaTimes } from "react-icons/fa";

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
    <div className="rounded-3xl bg-slate-900/65 ring-1 ring-white/10 p-5 md:p-8">
      <div className="flex items-start gap-4 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center text-slate-100 text-lg shadow-lg">
          <Icon />
        </div>
        <div>
          <div className="text-lg font-black text-white">{title}</div>
          <div className="text-sm text-slate-400 mt-1">{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col">
      <label className="block text-[11px] font-black text-slate-400 mb-2.5 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

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
      {currentValues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentValues.map(val => (
            <span key={val} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400/10 text-yellow-400 text-xs font-bold uppercase rounded-xl border border-yellow-400/20 shadow-sm transition-all hover:bg-yellow-400/20">
              {val}
              <button onClick={() => removeValue(val)} className="hover:text-white transition-colors ml-1 p-0.5 rounded-full hover:bg-black/20">
                <FaTimes size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <select
        onChange={handleSelect}
        value="" 
        className="w-full h-12 rounded-xl bg-slate-950/50 border border-white/10 px-4 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/50 text-white cursor-pointer text-sm transition-all hover:bg-white/5"
      >
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
  
  // 🚀 NUEVOS FILTROS DINÁMICOS
  const tiposVehiculo = toOptions(options.tipos);
  const coberturas = toOptions(options.coberturas);
  
  const [oficinasReal, setOficinasReal] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('jwt');
    const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
    
    fetch(`${API_BASE}/usuarios/oficinas/`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    })
    .then(res => res.ok ? res.json() : [])
    .then(data => {
      const arr = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setOficinasReal(arr.filter(ofi => ofi.activa === true));
    })
    .catch(err => console.error("Error cargando oficinas en marketing:", err));
  }, []);

  return (
    <div className="space-y-6">
      <Section
        icon={FaFilter}
        title="Filtros de Campaña"
        subtitle="Segmentá tu audiencia por tipo de vehículo, cobertura, vencimiento y más."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8 items-start">
          
          <Field label="Oficina (Emisor)">
            <select
              value={values.oficina || ""}
              onChange={(e) => onChange("oficina", e.target.value)}
              className="w-full h-12 rounded-xl bg-slate-950/50 border border-white/10 px-4 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/50 text-white cursor-pointer text-sm transition-all hover:bg-white/5"
            >
              <option value="" className="text-black bg-white">Todas las oficinas</option>
              {oficinasReal.map((ofi) => (
                <option key={ofi.id} value={ofi.id} className="text-black bg-white">
                  {ofi.nombre} ({ofi.id})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Estado de Póliza">
            <select
              value={values.estado || "activa"}
              onChange={(e) => onChange("estado", e.target.value)}
              className="w-full h-12 rounded-xl bg-yellow-400/5 border border-yellow-400/20 px-4 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/50 text-yellow-400 font-bold cursor-pointer text-sm transition-all hover:bg-yellow-400/10"
            >
              <option value="activa,vencida,pendiente,nueva,cotizar,renovacion" className="text-black bg-white">🌐 Sin filtro (Absolutamente todas)</option>
              <option value="activa" className="text-black bg-white">✅ Activas (Al día)</option>
              <option value="vencida" className="text-black bg-white">⚠️ Vencidas (Con deuda)</option>
              <option value="activa,vencida" className="text-black bg-white">Todas (Act. y Venc.)</option>
            </select>
          </Field>

          <Field label="Filtro de Días (Cuota)">
            <select
              value={values.dias_condicion || ""}
              onChange={(e) => {
                onChange("dias_condicion", e.target.value);
                if (!e.target.value) onChange("dias_cantidad", ""); 
              }}
              className="w-full h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 px-4 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/50 text-sky-400 font-bold cursor-pointer text-sm transition-all hover:bg-sky-500/20"
            >
              <option value="" className="text-black bg-white">Sin filtro de días</option>
              <option value="vencen_en" className="text-black bg-white">⏳ A Vencer en exactamente...</option>
              <option value="vencieron_hace" className="text-black bg-white">⏰ Vencieron hace exactamente...</option>
            </select>
          </Field>

          <Field label="Cant. Días exactos">
            <input
              type="number"
              min="0"
              placeholder="Ej: 4"
              disabled={!values.dias_condicion}
              value={values.dias_cantidad || ""}
              onChange={(e) => onChange("dias_cantidad", e.target.value)}
              className="w-full h-12 rounded-xl bg-slate-950/50 border border-white/10 px-4 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/50 text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            />
          </Field>

          {/* 🆕 FILTRO DE TIPO DE VEHÍCULO */}
          <Field label="Tipo de Vehículo">
            <MultiSelect 
              values={values.tipo} 
              options={tiposVehiculo} 
              onChange={(newArr) => onChange("tipo", newArr)} 
              placeholder="Todos los tipos" 
              addLabel="+ Agregar Tipo" 
            />
          </Field>

          {/* 🆕 FILTRO DE COBERTURAS */}
          <Field label="Coberturas">
            <MultiSelect 
              values={values.cobertura} 
              options={coberturas} 
              onChange={(newArr) => onChange("cobertura", newArr)} 
              placeholder="Todas las coberturas" 
              addLabel="+ Agregar Cobertura" 
            />
          </Field>

          <Field label="Marcas">
            <MultiSelect values={values.marca} options={marcas} onChange={(newArr) => onChange("marca", newArr)} placeholder="Todas las marcas" addLabel="+ Agregar Marca" />
          </Field>

          <Field label="Años">
            <MultiSelect values={values.anio} options={anios} onChange={(newArr) => onChange("anio", newArr)} placeholder="Todos los años" addLabel="+ Agregar Año" />
          </Field>

          <Field label="Modelos">
            <MultiSelect values={values.modelo} options={modelos} onChange={(newArr) => onChange("modelo", newArr)} placeholder="Todos los modelos" addLabel="+ Agregar Modelo" />
          </Field>

          <Field label="Compañías">
            <MultiSelect values={values.compania} options={companias} onChange={(newArr) => onChange("compania", newArr)} placeholder="Todas las compañías" addLabel="+ Agregar Cía" />
          </Field>
        </div>

        {(onPreview || onExport) && (
          <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-white/10 pt-6">
            {onPreview && (
              <button
                onClick={onPreview}
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-yellow-400 text-gray-950 font-black hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20"
              >
                <FaEye className={loading ? "animate-pulse" : "text-lg"} /> Previsualizar Audiencia
              </button>
            )}

            {onExport && (
              <div className="flex items-center gap-3 ml-auto">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Exportar:</span>
                <button onClick={() => onExport("csv")} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-slate-300 hover:text-white transition-all"><FaDownload /> CSV</button>
                <button onClick={() => onExport("xlsx")} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-slate-300 hover:text-white transition-all"><FaDownload /> EXCEL</button>
              </div>
            )}
          </div>
        )}
      </Section>

      {!!errorText && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-5 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0"><FaTimes /></div>
          <p className="text-sm font-medium text-rose-200">{errorText}</p>
        </div>
      )}
    </div>
  );
}