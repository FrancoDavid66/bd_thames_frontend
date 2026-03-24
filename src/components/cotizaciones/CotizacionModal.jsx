// src/components/cotizaciones/CotizacionModal.jsx
import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { createCotizacion, updateCotizacion } from "../../store/slices/cotizacionesSlice";
import { HiX, HiPlus, HiTrash, HiStar, HiCurrencyDollar } from "react-icons/hi";

const BASE_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// 🚀 BENEFICIOS RÁPIDOS PRECARGADOS
const QUICK_BENEFITS = [
  "Granizo", "Cristales", "Cerraduras", "Grúa 100km", "Grúa Ilimitada", 
  "Robo Neumáticos", "Daños por Inundación", "Reposición 0KM"
];

const CotizacionModal = ({ isOpen, onClose, cotizacionEdit = null }) => {
  const dispatch = useDispatch();
  
  const [objetivoGanancia, setObjetivoGanancia] = useState(30000);
  const [companiasBackend, setCompaniasBackend] = useState([]);
  const [coberturasBackend, setCoberturasBackend] = useState([]);

  const [formData, setFormData] = useState({
    cliente_nombre: "", telefono: "", marca_auto: "", modelo_auto: "",
    anio_auto: new Date().getFullYear(), tiene_gnc: false, estado: "PENDIENTE"
  });

  const [opciones, setOpciones] = useState([]);

  useEffect(() => {
    if (isOpen) {
      axios.get(`${BASE_URL}cotizaciones/companias/`, { headers: getAuthHeaders() })
        .then(res => setCompaniasBackend(res.data.results || res.data))
        .catch(err => console.error("Error companias:", err));

      axios.get(`${BASE_URL}cotizaciones/coberturas/`, { headers: getAuthHeaders() })
        .then(res => setCoberturasBackend(res.data.results || res.data))
        .catch(err => console.error("Error coberturas:", err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (cotizacionEdit) {
      setFormData({
        cliente_nombre: cotizacionEdit.cliente_nombre,
        telefono: cotizacionEdit.telefono || "",
        marca_auto: cotizacionEdit.marca_auto,
        modelo_auto: cotizacionEdit.modelo_auto,
        anio_auto: cotizacionEdit.anio_auto,
        tiene_gnc: cotizacionEdit.tiene_gnc,
        estado: cotizacionEdit.estado,
      });
      
      const opsAcomodadas = (cotizacionEdit.opciones || []).map(op => ({
        ...op,
        compania_id: op.compania, 
        cobertura_id: op.cobertura,
        // 🚀 Aseguramos que los detalles siempre sean un array
        detalles_cobertura: Array.isArray(op.detalles_cobertura) ? op.detalles_cobertura : []
      }));
      setOpciones(opsAcomodadas);
    } else {
      resetForm();
    }
  }, [cotizacionEdit, isOpen]);

  const resetForm = () => {
    setFormData({
      cliente_nombre: "", telefono: "", marca_auto: "", modelo_auto: "", 
      anio_auto: new Date().getFullYear(), tiene_gnc: false, estado: "PENDIENTE"
    });
    // 🚀 detalles_cobertura ahora arranca como un array vacío []
    setOpciones([{ compania_id: "", cobertura_id: "", costo_compania: 0, porcentaje_comision: 0, detalles_cobertura: [], es_recomendada: true }]);
  };

  const handleAddOption = () => {
    setOpciones([...opciones, { compania_id: "", cobertura_id: "", costo_compania: 0, porcentaje_comision: 0, detalles_cobertura: [], es_recomendada: false }]);
  };

  const handleRemoveOption = (index) => {
    setOpciones(opciones.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...opciones];
    newOptions[index][field] = value;
    setOpciones(newOptions);
  };

  const handleCompaniaChange = (index, companiaId) => {
    handleOptionChange(index, "compania_id", companiaId);
    const companiaSeleccionada = companiasBackend.find(c => String(c.id) === String(companiaId));
    if (companiaSeleccionada) {
      handleOptionChange(index, "porcentaje_comision", companiaSeleccionada.comision_default);
    }
  };

  // 🚀 LA FUNCIÓN MÁGICA PARA AUTO-CARGAR LAS BURBUJAS
  const handleCoberturaChange = (index, coberturaId) => {
    handleOptionChange(index, "cobertura_id", coberturaId);
    const coberturaSeleccionada = coberturasBackend.find(c => String(c.id) === String(coberturaId));
    
    // Si la cobertura tiene beneficios guardados en la BD, los inyectamos de una
    if (coberturaSeleccionada && Array.isArray(coberturaSeleccionada.beneficios_default)) {
      handleOptionChange(index, "detalles_cobertura", coberturaSeleccionada.beneficios_default);
    } else {
      handleOptionChange(index, "detalles_cobertura", []);
    }
  };

  // 🚀 MANEJO DE LAS BURBUJAS DE BENEFICIOS (MANUAL Y BOTONES RÁPIDOS)
  const handleAddTag = (index, tag) => {
    const newOptions = [...opciones];
    const currentTags = newOptions[index].detalles_cobertura;
    // Evitamos duplicados
    if (!currentTags.includes(tag)) {
      newOptions[index].detalles_cobertura = [...currentTags, tag];
      setOpciones(newOptions);
    }
  };

  const handleRemoveTag = (index, tagToRemove) => {
    const newOptions = [...opciones];
    newOptions[index].detalles_cobertura = newOptions[index].detalles_cobertura.filter(tag => tag !== tagToRemove);
    setOpciones(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (opciones.some(op => !op.compania_id || !op.cobertura_id)) {
        return alert("Por favor seleccioná Compañía y Cobertura en todas las opciones.");
    }

    const opcionesConPrecio = opciones.map(op => {
      const costo = Number(op.costo_compania) || 0;
      const pct = Number(op.porcentaje_comision) || 0;
      const gananciaBlanca = (costo * pct) / 100;
      const faltanteParaObjetivo = Math.max(0, objetivoGanancia - gananciaBlanca);
      const precioCalculado = costo + faltanteParaObjetivo;

      return {
        ...op,
        compania: op.compania_id,
        cobertura: op.cobertura_id,
        precio_cliente: precioCalculado 
      };
    });

    const dataToSend = { ...formData, opciones: opcionesConPrecio };
    
    if (cotizacionEdit) {
      await dispatch(updateCotizacion({ id: cotizacionEdit.id, ...dataToSend }));
    } else {
      await dispatch(createCotizacion(dataToSend));
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {cotizacionEdit ? "Editar Cotización" : "Nueva Cotización Rápida"}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-rose-600 rounded-full p-1.5 transition">
            <HiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          
          {/* DATOS DEL CLIENTE Y AUTO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-full mb-2 border-b border-zinc-800 pb-2 text-sky-400 font-semibold uppercase text-xs tracking-wider">
              1. Datos del Cliente y Vehículo
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nombre del Cliente</label>
              <input required type="text" value={formData.cliente_nombre} onChange={e => setFormData({...formData, cliente_nombre: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Teléfono</label>
              <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Marca Auto</label>
              <input required type="text" placeholder="Ej: Volkswagen" value={formData.marca_auto} onChange={e => setFormData({...formData, marca_auto: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Modelo Auto</label>
              <input required type="text" placeholder="Ej: Gol Trend" value={formData.modelo_auto} onChange={e => setFormData({...formData, modelo_auto: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Año</label>
              <input required type="number" value={formData.anio_auto} onChange={e => setFormData({...formData, anio_auto: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none" />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="gnc" checked={formData.tiene_gnc} onChange={e => setFormData({...formData, tiene_gnc: e.target.checked})} className="w-4 h-4 bg-zinc-900 border-zinc-700 rounded cursor-pointer" />
              <label htmlFor="gnc" className="text-sm text-zinc-300 cursor-pointer font-semibold">¿Tiene GNC?</label>
            </div>
          </div>

          {/* SETEO DEL OBJETIVO DE GANANCIA */}
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
            <div className="flex flex-col">
              <span className="text-emerald-400 font-black flex items-center gap-1 uppercase tracking-wide text-sm">
                <HiCurrencyDollar size={18} /> Objetivo de Ganancia Mínima
              </span>
              <span className="text-xs text-zinc-400 mt-1">El sistema ajustará el precio al cliente para garantizarte este monto libre por póliza.</span>
            </div>
            <div className="flex items-center bg-zinc-950 border border-emerald-500/50 rounded-lg px-3 py-2 w-full sm:w-48">
              <span className="text-emerald-400 font-bold mr-2">$</span>
              <input 
                type="number" 
                value={objetivoGanancia} 
                onChange={(e) => setObjetivoGanancia(Number(e.target.value))}
                className="w-full bg-transparent text-emerald-400 font-black text-lg focus:outline-none"
              />
            </div>
          </div>

          {/* OPCIONES DE COTIZACIÓN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="text-sky-400 font-semibold uppercase text-xs tracking-wider">
                2. Armado de Opciones
              </div>
              <button type="button" onClick={handleAddOption} className="text-xs bg-sky-600/20 text-sky-400 hover:bg-sky-600 hover:text-white px-3 py-1.5 rounded-lg transition font-bold flex items-center gap-1">
                <HiPlus /> Agregar Cobertura
              </button>
            </div>

            {opciones.map((opcion, index) => {
              
              const costo = Number(opcion.costo_compania) || 0;
              const comisionPct = Number(opcion.porcentaje_comision) || 0;
              const gananciaBlanca = (costo * comisionPct) / 100;
              const faltanteParaObjetivo = Math.max(0, objetivoGanancia - gananciaBlanca);
              const precioClienteCalculado = costo + faltanteParaObjetivo;

              return (
                <div key={index} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl relative shadow-sm">
                  
                  {/* Botones de acción */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button type="button" onClick={() => handleOptionChange(index, "es_recomendada", !opcion.es_recomendada)} className={`p-1.5 rounded-md transition flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${opcion.es_recomendada ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" : "bg-zinc-800 text-zinc-500 hover:text-amber-500"}`} title="Marcar como recomendada">
                      <HiStar size={14} /> {opcion.es_recomendada && "Recomendada"}
                    </button>
                    {opciones.length > 1 && (
                      <button type="button" onClick={() => handleRemoveOption(index)} className="p-1.5 rounded-md bg-zinc-800 text-zinc-500 hover:text-white hover:bg-rose-600 transition" title="Eliminar opción">
                        <HiTrash size={14} />
                      </button>
                    )}
                  </div>
                  
                  <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    Opción {index + 1}
                  </h4>

                  {/* SELECTORES */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1 uppercase tracking-wider font-semibold">Compañía</label>
                      <select 
                        required 
                        value={opcion.compania_id} 
                        onChange={e => handleCompaniaChange(index, e.target.value)} 
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                      >
                        <option value="" disabled>Seleccionar...</option>
                        {companiasBackend.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1 uppercase tracking-wider font-semibold">Cobertura</label>
                      {/* 🚀 ACÁ USAMOS LA FUNCIÓN MÁGICA handleCoberturaChange */}
                      <select 
                        required 
                        value={opcion.cobertura_id} 
                        onChange={e => handleCoberturaChange(index, e.target.value)} 
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                      >
                        <option value="" disabled>Seleccionar...</option>
                        {coberturasBackend.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* CALCULADORA */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-zinc-950 rounded-xl border border-zinc-800/50 mb-3 items-end">
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1 uppercase tracking-wider font-semibold">Costo Cía. ($)</label>
                      <input required type="number" value={opcion.costo_compania} onChange={e => handleOptionChange(index, "costo_compania", e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-rose-300 font-bold focus:outline-none focus:border-rose-500" placeholder="Ej: 20000" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1 uppercase tracking-wider font-semibold">Tu Comis. (%)</label>
                      <input required type="number" value={opcion.porcentaje_comision} onChange={e => handleOptionChange(index, "porcentaje_comision", e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-sky-300 font-bold focus:outline-none focus:border-sky-500" placeholder="Ej: 18" />
                    </div>
                    
                    <div className="bg-emerald-900/20 border border-emerald-500/50 rounded-lg px-3 py-2 flex flex-col justify-center h-full">
                      <span className="text-[10px] text-emerald-400/80 mb-0.5 uppercase tracking-wider font-black">Precio Cliente</span>
                      <span className="text-lg font-black text-emerald-400">${precioClienteCalculado.toLocaleString("es-AR")}</span>
                    </div>
                  </div>

                  {/* 🚀 BURBUJAS DE BENEFICIOS */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/50">
                     <label className="block text-[10px] text-zinc-400 mb-2 uppercase tracking-wider font-semibold">
                       Beneficios incluidos (Aparecerán en el PDF)
                     </label>
                     
                     {/* BUBBLES RENDER */}
                     <div className="flex flex-wrap gap-2 mb-2">
                       {opcion.detalles_cobertura.map(tag => (
                         <span key={tag} className="inline-flex items-center gap-1 bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-1 rounded-lg text-xs font-semibold">
                           {tag}
                           <button type="button" onClick={() => handleRemoveTag(index, tag)} className="hover:text-rose-400 ml-1 transition">
                             <HiX size={12} />
                           </button>
                         </span>
                       ))}
                     </div>

                     {/* INPUT MANUAL CON ENTER */}
                     <input 
                        type="text" 
                        placeholder="Escribí un beneficio y presioná Enter..." 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault(); 
                            if (e.target.value.trim()) {
                              handleAddTag(index, e.target.value.trim());
                              e.target.value = ''; 
                            }
                          }
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-sky-500" 
                     />
                     
                     {/* BOTONES RÁPIDOS */}
                     <div className="flex flex-wrap gap-2 mt-3">
                       {QUICK_BENEFITS.map(b => (
                         <button 
                           key={b} 
                           type="button" 
                           onClick={() => handleAddTag(index, b)} 
                           className="text-[10px] font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2 py-1 rounded-md transition"
                         >
                           + {b}
                         </button>
                       ))}
                     </div>
                  </div>

                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2.5 rounded-xl text-sm font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/20 transition active:scale-95">
              {cotizacionEdit ? "Guardar Cambios" : "Crear Cotización"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CotizacionModal;