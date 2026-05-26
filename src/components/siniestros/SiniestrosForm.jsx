// src/components/siniestros/SiniestrosForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

// ──────────────────────────────────────────────────────────────────
// 🔎 Autocomplete genérico con debounce
// ──────────────────────────────────────────────────────────────────
function AutocompleteSearch({
  label,
  placeholder,
  endpoint,
  selectedId,
  selectedLabel,
  onSelect,
  disabled = false,
  renderItem,
  buildLabel,
  searchKey = 'search',
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = { [searchKey]: q, page_size: 10 };
        const { data } = await api.get(endpoint, { params });
        const list = Array.isArray(data) ? data : data?.results || [];
        setResults(list);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [q, endpoint, searchKey]);

  const display = selectedId
    ? (selectedLabel || `#${selectedId}`)
    : q;

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={display}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            if (selectedId) {
              // Si ya había uno seleccionado, escribir lo limpia
              onSelect(null, '');
            }
            setQ(e.target.value);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="flex-1 p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {selectedId && !disabled && (
          <button
            type="button"
            onClick={() => { onSelect(null, ''); setQ(''); }}
            className="px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            title="Limpiar selección"
          >
            ✕
          </button>
        )}
      </div>
      {open && !disabled && (loading || results.length > 0) && (
        <div className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl custom-scrollbar">
          {loading && (
            <div className="p-3 text-xs text-slate-500 text-center">Buscando…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="p-3 text-xs text-slate-500 text-center">Sin resultados</div>
          )}
          {!loading && results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id, buildLabel ? buildLabel(item) : `#${item.id}`);
                setQ('');
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-800 border-b border-slate-800/50 last:border-b-0 transition-colors"
            >
              {renderItem ? renderItem(item) : <span className="text-sm text-slate-300">#{item.id}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// 📝 FORM PRINCIPAL
// ──────────────────────────────────────────────────────────────────
const initialForm = {
  cliente: '',
  poliza: '',
  estado: 'PENDIENTE',
  fecha_siniestro: '',
  nro_reclamo_cia: '',
  responsabilidad: 'CHOCO',
  marca_auto: '',
  modelo_auto: '',
  ano_auto: '',
  patente: '',
  descripcion: '',
  tercero_nombre: '',
  tercero_telefono: '',
  tercero_patente: '',
  tercero_compania: '',
  tercero_poliza: '',
};

const SiniestrosForm = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState(initialForm);
  const [clienteLabel, setClienteLabel] = useState('');
  const [polizaLabel, setPolizaLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(initialData?.id);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData({
        ...initialForm,
        ...initialData,
        fecha_siniestro: initialData.fecha_siniestro
          ? String(initialData.fecha_siniestro).substring(0, 10)
          : '',
      });
      setClienteLabel(initialData.cliente_label || '');
      setPolizaLabel(initialData.poliza_label || '');
    } else {
      setFormData(initialForm);
      setClienteLabel('');
      setPolizaLabel('');
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'patente' || name === 'tercero_patente') {
      v = v.toUpperCase().replace(/\s+/g, '');
    }
    setFormData((prev) => ({ ...prev, [name]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // 🐛 FIX: validaciones explícitas antes de enviar
    if (!formData.cliente) {
      alert('Seleccioná un cliente.');
      return;
    }
    if (!formData.poliza) {
      alert('Seleccioná una póliza.');
      return;
    }

    // 🐛 FIX: casteo correcto de tipos numéricos para el backend
    const payload = {
      ...formData,
      cliente: Number(formData.cliente),
      poliza: Number(formData.poliza),
      ano_auto: formData.ano_auto ? Number(formData.ano_auto) : null,
      fecha_siniestro: formData.fecha_siniestro || null,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
        >
          <h2 className="text-2xl font-black text-white mb-6 border-b border-slate-800 pb-4">
            {isEditing ? '✏️ Editar Siniestro' : '🚨 Nuevo Siniestro'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SECCIÓN 1: Datos Principales */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4">1. Datos del Trámite</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* 🐛 FIX: autocomplete real, no input numérico de ID. ReadOnly al editar. */}
                <AutocompleteSearch
                  label="Cliente"
                  placeholder="Buscar por nombre, apellido o DNI…"
                  endpoint="clientes/"
                  selectedId={formData.cliente}
                  selectedLabel={clienteLabel}
                  disabled={isEditing}
                  onSelect={(id, label) => {
                    setFormData((prev) => ({ ...prev, cliente: id || '' }));
                    setClienteLabel(label);
                  }}
                  renderItem={(c) => (
                    <div className="text-sm text-slate-300">
                      <span className="font-semibold text-white">{c.nombre} {c.apellido}</span>
                      {c.dni_cuit_cuil && <span className="text-xs text-slate-500 ml-2">DNI {c.dni_cuit_cuil}</span>}
                    </div>
                  )}
                  buildLabel={(c) => `${c.nombre || ''} ${c.apellido || ''}`.trim() || `#${c.id}`}
                />

                <AutocompleteSearch
                  label="Póliza"
                  placeholder="Buscar por número o patente…"
                  endpoint="polizas/"
                  selectedId={formData.poliza}
                  selectedLabel={polizaLabel}
                  disabled={isEditing}
                  onSelect={(id, label) => {
                    setFormData((prev) => ({ ...prev, poliza: id || '' }));
                    setPolizaLabel(label);
                  }}
                  renderItem={(p) => (
                    <div className="text-sm text-slate-300">
                      <span className="font-semibold text-white">
                        {p.numero_poliza || `Sin Nº (#${p.id})`}
                      </span>
                      {p.patente && (
                        <span className="text-xs text-slate-500 ml-2 font-mono uppercase">{p.patente}</span>
                      )}
                      {p.compania && (
                        <span className="text-xs text-indigo-400 ml-2">{p.compania}</span>
                      )}
                    </div>
                  )}
                  buildLabel={(p) => `${p.numero_poliza || `Póliza #${p.id}`}${p.patente ? ` · ${p.patente}` : ''}`}
                />
              </div>

              {isEditing && (
                <p className="text-[10px] text-amber-400/80 mb-3">
                  ⚠️ Cliente y Póliza no se pueden cambiar al editar un siniestro.
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha del Accidente</label>
                  <input type="date" name="fecha_siniestro" value={formData.fecha_siniestro} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Estado del Trámite</label>
                  <select name="estado" value={formData.estado} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none">
                    <option value="PENDIENTE">Falta Documentación</option>
                    <option value="DENUNCIADO">Denunciado en Cía</option>
                    <option value="INSPECCION">Inspección Pendiente</option>
                    <option value="LIQUIDACION">En Liquidación</option>
                    <option value="CERRADO">Cerrado / Finalizado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Responsabilidad</label>
                  <select name="responsabilidad" value={formData.responsabilidad} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none">
                    <option value="CHOCO">Nuestro asegurado chocó</option>
                    <option value="CHOCARON">Nuestro asegurado fue chocado</option>
                    <option value="ROBO">Robo / Hurto</option>
                    <option value="INCENDIO">Incendio</option>
                    <option value="OTRO">Otro / Varios</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">N° Reclamo Compañía (opcional)</label>
                  <input type="text" name="nro_reclamo_cia" value={formData.nro_reclamo_cia} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none" />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: Vehículo */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4">2. Datos del Vehículo</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Marca *</label>
                  <input type="text" name="marca_auto" value={formData.marca_auto} onChange={handleChange} required className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Modelo *</label>
                  <input type="text" name="modelo_auto" value={formData.modelo_auto} onChange={handleChange} required className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Año *</label>
                  <input type="number" name="ano_auto" value={formData.ano_auto} onChange={handleChange} required min="1950" max="2100" className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Patente</label>
                  <input type="text" name="patente" value={formData.patente} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none uppercase font-mono" />
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: Descripción */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4">3. Descripción de los Hechos</h3>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                required
                rows="4"
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none resize-none"
              />
            </div>

            {/* SECCIÓN 4: Tercero */}
            <div className="bg-rose-900/10 p-4 rounded-xl border border-rose-500/20">
              <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-4">4. Datos del Tercero (Opcional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre Completo</label>
                  <input type="text" name="tercero_nombre" value={formData.tercero_nombre} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-rose-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Teléfono</label>
                  <input type="text" name="tercero_telefono" value={formData.tercero_telefono} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-rose-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Patente Tercero</label>
                  <input type="text" name="tercero_patente" value={formData.tercero_patente} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-rose-500 outline-none uppercase font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Compañía Seguro</label>
                  <input type="text" name="tercero_compania" value={formData.tercero_compania} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-rose-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Póliza del Tercero</label>
                  <input type="text" name="tercero_poliza" value={formData.tercero_poliza} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-rose-500 outline-none" />
                </div>
              </div>
            </div>

            {/* BOTONES */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
              >
                {submitting ? 'Guardando…' : 'Guardar Siniestro'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SiniestrosForm;