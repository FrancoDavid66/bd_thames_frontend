// src/components/cotizaciones/CompaniasSettingsModal.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { HiX, HiTrash, HiCog, HiArrowLeft } from "react-icons/hi";
import { FaBuilding, FaShieldAlt } from "react-icons/fa";
import { toast } from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_API_URL;
const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const QUICK_BENEFITS = [
  "Granizo", "Cristales", "Cerraduras", "Grúa 100km", "Grúa Ilimitada", 
  "Robo Neumáticos", "Daños por Inundación", "Reposición 0KM", "Destrucción Total"
];

const CompaniasSettingsModal = ({ isOpen, onClose }) => {
  const [companias, setCompanias] = useState([]);
  const [coberturas, setCoberturas] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedCia, setSelectedCia] = useState(null);

  // Estados de los Formularios
  const [ciaForm, setCiaForm] = useState({ nombre: "", comision_default: "", antiguedad_maxima: 25 });
  const [cobForm, setCobForm] = useState({ nombre: "", beneficios_default: [] });
  const [tagInput, setTagInput] = useState("");

  const currentYear = new Date().getFullYear(); // 🚀 Obtenemos el año actual para la calculadora

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setSelectedCia(null);
      setCiaForm({ nombre: "", comision_default: "", antiguedad_maxima: 25 });
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCia, resCob] = await Promise.all([
        axios.get(`${BASE_URL}cotizaciones/companias/`, { headers: getAuthHeaders() }),
        axios.get(`${BASE_URL}cotizaciones/coberturas/`, { headers: getAuthHeaders() })
      ]);
      setCompanias(resCia.data.results || resCia.data);
      setCoberturas(resCob.data.results || resCob.data);
    } catch (error) {
      toast.error("Error al cargar configuraciones");
    } finally {
      setLoading(false);
    }
  };

  // --- CRUD COMPAÑÍAS ---
  const handleCreateCia = async (e) => {
    e.preventDefault();
    if (!ciaForm.nombre) return toast.error("El nombre es obligatorio");
    try {
      await axios.post(`${BASE_URL}cotizaciones/companias/`, {
        nombre: ciaForm.nombre,
        comision_default: 0,
        antiguedad_maxima: 25 
      }, { headers: getAuthHeaders() });
      toast.success("Compañía creada");
      setCiaForm({ nombre: "", comision_default: "", antiguedad_maxima: 25 });
      fetchData();
    } catch (error) {
      toast.error("Error al crear compañía");
    }
  };

  const handleUpdateCia = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${BASE_URL}cotizaciones/companias/${selectedCia.id}/`, {
        ...ciaForm,
        comision_default: Number(ciaForm.comision_default) || 0,
        antiguedad_maxima: Number(ciaForm.antiguedad_maxima) || 25
      }, { headers: getAuthHeaders() });
      toast.success("Datos actualizados");
      
      const updatedCia = { ...selectedCia, ...ciaForm };
      setSelectedCia(updatedCia);
      
      fetchData();
    } catch (error) {
      toast.error("Error al actualizar compañía");
    }
  };

  const handleDeleteCia = async (id) => {
    if (!window.confirm("¿Seguro que querés eliminar/desactivar esta compañía?")) return;
    try {
      await axios.delete(`${BASE_URL}cotizaciones/companias/${id}/`, { headers: getAuthHeaders() });
      toast.success("Compañía eliminada");
      if (selectedCia?.id === id) setSelectedCia(null);
      fetchData();
    } catch (error) {
      toast.error("Error al eliminar. Probablemente tenga cotizaciones asociadas.");
    }
  };

  // --- NAVEGACIÓN ---
  const openCiaSettings = (cia) => {
    setSelectedCia(cia);
    setCiaForm({ 
      nombre: cia.nombre, 
      comision_default: cia.comision_default, 
      antiguedad_maxima: cia.antiguedad_maxima 
    });
    setCobForm({ nombre: "", beneficios_default: [] });
  };

  const closeCiaSettings = () => {
    setSelectedCia(null);
    setCiaForm({ nombre: "", comision_default: "", antiguedad_maxima: 25 });
  };

  // --- CRUD COBERTURAS ---
  const handleAddTag = (tag) => {
    const t = tag.trim();
    if (t && !cobForm.beneficios_default.includes(t)) {
      setCobForm({ ...cobForm, beneficios_default: [...cobForm.beneficios_default, t] });
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove) => {
    setCobForm({
      ...cobForm,
      beneficios_default: cobForm.beneficios_default.filter(t => t !== tagToRemove)
    });
  };

  const handleCreateCob = async (e) => {
    e.preventDefault();
    if (!cobForm.nombre) return toast.error("El nombre de la cobertura es obligatorio");
    try {
      await axios.post(`${BASE_URL}cotizaciones/coberturas/`, {
        ...cobForm,
        compania: selectedCia.id
      }, { headers: getAuthHeaders() });
      toast.success("Cobertura creada");
      setCobForm({ nombre: "", beneficios_default: [] });
      fetchData();
    } catch (error) {
      toast.error("Error al crear cobertura");
    }
  };

  const handleDeleteCob = async (id) => {
    if (!window.confirm("¿Seguro que querés eliminar esta cobertura?")) return;
    try {
      await axios.delete(`${BASE_URL}cotizaciones/coberturas/${id}/`, { headers: getAuthHeaders() });
      toast.success("Cobertura eliminada");
      fetchData();
    } catch (error) {
      toast.error("Error al eliminar. Probablemente tenga cotizaciones asociadas.");
    }
  };

  if (!isOpen) return null;

  const coberturasDeCia = selectedCia 
    ? coberturas.filter(c => String(c.compania) === String(selectedCia.id)) 
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        
        {/* HEADER DINÁMICO */}
        <div className="flex justify-between items-center p-5 border-b border-zinc-800 bg-zinc-900/40 rounded-t-3xl">
          <div className="flex items-center gap-3">
            {selectedCia && (
              <button onClick={closeCiaSettings} className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 p-2 rounded-xl transition-colors">
                <HiArrowLeft size={20} />
              </button>
            )}
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                {selectedCia ? `⚙️ Configurando: ${selectedCia.nombre}` : "⚙️ Configurador de Seguros"}
              </h2>
              <p className="text-zinc-500 text-xs mt-1">
                {selectedCia ? "Ajustá comisiones, límites y coberturas de esta aseguradora." : "Administrá tus aseguradoras y reglas de negocio."}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white bg-zinc-900 hover:bg-rose-600 rounded-full p-2 transition-colors">
            <HiX size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-10 text-zinc-500">Cargando datos...</div>
          ) : !selectedCia ? (
            /* =========================================
               VISTA 1: LISTADO DE COMPAÑÍAS
               ========================================= */
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
              
              {/* FORMULARIO SIMPLIFICADO */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5">
                <h3 className="text-sm font-black text-sky-400 mb-4 uppercase tracking-widest">Crear Nueva Compañía</h3>
                <form onSubmit={handleCreateCia} className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-bold tracking-widest">Nombre de la Aseguradora *</label>
                    <input type="text" required value={ciaForm.nombre} onChange={e => setCiaForm({...ciaForm, nombre: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:border-sky-500 outline-none transition-colors" placeholder="Ej: Equidad Seguros" />
                  </div>
                  <div className="shrink-0 w-full sm:w-auto">
                    <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-black uppercase tracking-widest px-8 py-3 rounded-xl transition-all shadow-lg shadow-sky-600/20">Guardar Compañía</button>
                  </div>
                </form>
              </div>

              <div>
                <h3 className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-widest">Compañías Cargadas ({companias.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {companias.map(cia => {
                    const limiteAnio = currentYear - (cia.antiguedad_maxima || 25);
                    return (
                      <div key={cia.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-col relative group hover:border-zinc-700 transition-colors">
                        <div className="absolute top-3 right-3 flex gap-2">
                          <button onClick={() => openCiaSettings(cia)} className="text-zinc-500 hover:text-sky-400 bg-zinc-950 hover:bg-sky-500/10 p-1.5 rounded-lg transition" title="Configurar coberturas y límites">
                            <HiCog size={18}/>
                          </button>
                          <button onClick={() => handleDeleteCia(cia.id)} className="text-zinc-500 hover:text-rose-500 bg-zinc-950 hover:bg-rose-500/10 p-1.5 rounded-lg transition" title="Eliminar">
                            <HiTrash size={18}/>
                          </button>
                        </div>
                        
                        <FaBuilding className="text-sky-500 text-2xl mb-2" />
                        <h4 className="text-white font-black text-lg leading-tight pr-16">{cia.nombre}</h4>
                        
                        <div className="mt-4 pt-3 border-t border-zinc-800 flex flex-wrap gap-2 text-xs">
                          <span className="bg-sky-500/10 text-sky-400 px-2 py-1 rounded-md font-bold">Comis: {cia.comision_default}%</span>
                          {/* 🚀 ACÁ LE AGREGUÉ EL CÁLCULO A LA TARJETA */}
                          <span className="bg-amber-500/10 text-amber-500 px-2 py-1 rounded-md font-bold">Desde el {limiteAnio}</span>
                          <span className="bg-zinc-950 text-zinc-400 border border-zinc-800 px-2 py-1 rounded-md font-bold w-full mt-1 text-center cursor-pointer hover:bg-sky-500/10 hover:text-sky-400 transition" onClick={() => openCiaSettings(cia)}>
                            ⚙️ Configurar ➔
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          ) : (
            /* =========================================
               VISTA 2: CONFIGURACIÓN DE UNA COMPAÑÍA
               ========================================= */
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              
              {/* EDITAR DATOS DE LA COMPAÑÍA */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5">
                <h3 className="text-sm font-black text-sky-400 mb-4 uppercase tracking-widest flex items-center gap-2"><FaBuilding/> Ajustes Generales</h3>
                <form onSubmit={handleUpdateCia} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-start">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-bold tracking-widest">Nombre</label>
                    <input type="text" required value={ciaForm.nombre} onChange={e => setCiaForm({...ciaForm, nombre: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-bold tracking-widest">Comis. Blanca (%)</label>
                    <input type="number" value={ciaForm.comision_default} onChange={e => setCiaForm({...ciaForm, comision_default: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-bold tracking-widest">Antigüedad Max.</label>
                    <input type="number" value={ciaForm.antiguedad_maxima} onChange={e => setCiaForm({...ciaForm, antiguedad_maxima: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500 outline-none" />
                    {/* 🚀 ACÁ ESTÁ LA CALCULADORA EN EL MODO EDICIÓN */}
                    {ciaForm.antiguedad_maxima && (
                      <p className="text-[10px] text-amber-500 font-bold mt-1.5 flex items-center gap-1">
                        ↳ Cubre desde el año {currentYear - Number(ciaForm.antiguedad_maxima)}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-4 flex justify-end mt-2 border-t border-zinc-800 pt-3">
                    <button type="submit" className="bg-zinc-800 hover:bg-sky-600 text-white text-xs font-black uppercase tracking-widest px-6 py-2 rounded-xl transition-all">Actualizar Datos</button>
                  </div>
                </form>
              </div>

              {/* CREAR NUEVA COBERTURA PARA ESTA COMPAÑÍA */}
              <div className="bg-emerald-900/10 border border-emerald-900/30 rounded-2xl p-5">
                <h3 className="text-sm font-black text-emerald-400 mb-4 uppercase tracking-widest flex items-center gap-2"><FaShieldAlt/> Agregar Cobertura</h3>
                <form onSubmit={handleCreateCob} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-bold tracking-widest">Nombre de Cobertura *</label>
                    <input type="text" required value={cobForm.nombre} onChange={e => setCobForm({...cobForm, nombre: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-emerald-500 outline-none" placeholder="Ej: Terceros Completo Premium" />
                  </div>

                  {/* BURBUJAS DE BENEFICIOS */}
                  <div className="pt-2">
                     <label className="block text-[10px] text-zinc-400 mb-2 uppercase font-bold tracking-widest">Beneficios / Cosas que cubre</label>
                     
                     <div className="flex flex-col sm:flex-row gap-3 mb-3">
                        <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Tipeá un beneficio y presioná Enter..." onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(tagInput); }}} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
                        <button type="button" onClick={() => handleAddTag(tagInput)} className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 px-4 py-2 rounded-xl text-xs font-bold uppercase transition">Agregar</button>
                     </div>

                     <div className="flex flex-wrap gap-1.5 mb-4">
                       <span className="text-[10px] text-zinc-500 font-semibold mr-2 mt-1">Sugerencias:</span>
                       {QUICK_BENEFITS.map(b => (
                         <button key={b} type="button" onClick={() => handleAddTag(b)} className="text-[9px] font-black uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2.5 py-1 rounded-md transition">+ {b}</button>
                       ))}
                     </div>

                     <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 min-h-[60px] flex flex-wrap gap-2 items-start">
                       {cobForm.beneficios_default.length === 0 && <span className="text-xs text-zinc-600 italic mt-1">Aún no hay beneficios agregados...</span>}
                       {cobForm.beneficios_default.map(tag => (
                         <span key={tag} className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold">
                           {tag}
                           <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-rose-400 hover:bg-rose-500/20 rounded-full p-0.5 transition"><HiX size={14} /></button>
                         </span>
                       ))}
                     </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20">Guardar Cobertura</button>
                  </div>
                </form>
              </div>

              {/* LISTA DE COBERTURAS DE ESTA COMPAÑÍA */}
              <div>
                <h3 className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-widest border-b border-zinc-800 pb-2">Coberturas de {selectedCia.nombre} ({coberturasDeCia.length})</h3>
                {coberturasDeCia.length === 0 ? (
                  <p className="text-zinc-500 text-sm italic">Esta compañía aún no tiene coberturas configuradas.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {coberturasDeCia.map(cob => (
                      <div key={cob.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-col relative">
                        <button onClick={() => handleDeleteCob(cob.id)} className="absolute top-3 right-3 text-zinc-500 hover:text-rose-500 bg-zinc-950 hover:bg-rose-500/10 p-1.5 rounded-lg transition"><HiTrash size={16}/></button>
                        <h4 className="text-emerald-400 font-black text-lg pr-8 mb-3">{cob.nombre}</h4>
                        
                        <div className="flex flex-wrap gap-1.5 mt-auto pt-2 border-t border-zinc-800">
                          {cob.beneficios_default.length > 0 ? (
                            cob.beneficios_default.map((b, i) => (
                              <span key={i} className="text-[9px] font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase tracking-wider">{b}</span>
                            ))
                          ) : (
                            <span className="text-[10px] text-zinc-600 italic">Sin beneficios cargados.</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompaniasSettingsModal;