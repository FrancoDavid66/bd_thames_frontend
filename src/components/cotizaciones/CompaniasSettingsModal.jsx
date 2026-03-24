// src/components/cotizaciones/CompaniasSettingsModal.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { HiX, HiPlus, HiTrash, HiPencil, HiCheck } from "react-icons/hi";
import { toast } from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// 🚀 LISTA DE BOTONES RÁPIDOS PARA AGREGAR BENEFICIOS
const QUICK_BENEFITS = [
  "Granizo", "Cristales", "Cerraduras", "Grúa 100km", "Grúa Ilimitada", 
  "Robo Neumáticos", "Inundación", "Reposición 0KM"
];

const CompaniasSettingsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("companias"); 
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  // 🚀 AÑADIMOS beneficios_default AL ESTADO INICIAL
  const [formData, setFormData] = useState({ nombre: "", comision_default: "", beneficios_default: [] });

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === "companias" ? "companias" : "coberturas";
      const res = await axios.get(`${BASE_URL}cotizaciones/${endpoint}/`, { headers: getAuthHeaders() });
      setData(res.data.results || res.data);
    } catch (error) {
      toast.error("Error al cargar datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setEditingId(null);
      setFormData({ nombre: "", comision_default: "", beneficios_default: [] });
    }
  }, [isOpen, activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre) return toast.error("El nombre es obligatorio");

    const endpoint = activeTab === "companias" ? "companias" : "coberturas";
    
    // 🚀 SI ES COBERTURA, MANDAMOS LA LISTA DE BURBUJAS AL BACKEND
    const payload = activeTab === "companias" 
        ? { nombre: formData.nombre, comision_default: formData.comision_default || 0 } 
        : { nombre: formData.nombre, beneficios_default: formData.beneficios_default };

    try {
      if (editingId) {
        await axios.put(`${BASE_URL}cotizaciones/${endpoint}/${editingId}/`, payload, { headers: getAuthHeaders() });
        toast.success("Registro actualizado.");
      } else {
        await axios.post(`${BASE_URL}cotizaciones/${endpoint}/`, payload, { headers: getAuthHeaders() });
        toast.success("Registro agregado.");
      }
      setFormData({ nombre: "", comision_default: "", beneficios_default: [] });
      setEditingId(null);
      fetchData();
    } catch (error) {
      toast.error("Hubo un error al guardar.");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ 
      nombre: item.nombre, 
      comision_default: item.comision_default || "",
      beneficios_default: item.beneficios_default || [] // 🚀 AL EDITAR, CARGAMOS LAS BURBUJAS EXISTENTES
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que querés borrar este registro?")) return;
    const endpoint = activeTab === "companias" ? "companias" : "coberturas";
    try {
      await axios.delete(`${BASE_URL}cotizaciones/${endpoint}/${id}/`, { headers: getAuthHeaders() });
      toast.success("Eliminado correctamente.");
      fetchData();
    } catch (error) {
      toast.error("No se puede borrar porque ya está en uso en alguna cotización.");
    }
  };

  // 🚀 MANEJO DE BURBUJAS PARA EL FORMULARIO DE COBERTURAS
  const handleAddTag = (tag) => {
    if (!formData.beneficios_default.includes(tag)) {
      setFormData({ ...formData, beneficios_default: [...formData.beneficios_default, tag] });
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({ ...formData, beneficios_default: formData.beneficios_default.filter(t => t !== tagToRemove) });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">⚙️ Configuración Global</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white bg-zinc-800 rounded-full p-1.5 transition"><HiX size={20} /></button>
        </div>

        <div className="flex border-b border-zinc-800">
          <button onClick={() => setActiveTab("companias")} className={`flex-1 py-3 text-sm font-bold transition ${activeTab === "companias" ? "text-sky-400 border-b-2 border-sky-400 bg-zinc-900/50" : "text-zinc-500 hover:text-zinc-300"}`}>🏢 Compañías</button>
          <button onClick={() => setActiveTab("coberturas")} className={`flex-1 py-3 text-sm font-bold transition ${activeTab === "coberturas" ? "text-sky-400 border-b-2 border-sky-400 bg-zinc-900/50" : "text-zinc-500 hover:text-zinc-300"}`}>🛡️ Coberturas</button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl mb-6">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-3">{editingId ? "Editar Registro" : "Agregar Nuevo"}</h3>
            <div className="flex flex-col sm:flex-row gap-3 items-end mb-3">
              <div className="flex-1 w-full">
                <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-semibold">Nombre</label>
                <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none" />
              </div>
              {activeTab === "companias" && (
                <div className="w-full sm:w-24">
                  <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-semibold">Comisión (%)</label>
                  <input required type="number" step="0.01" value={formData.comision_default} onChange={e => setFormData({...formData, comision_default: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none" />
                </div>
              )}
              <button type="submit" className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-bold bg-sky-600 hover:bg-sky-500 text-white transition flex items-center justify-center gap-1">
                {editingId ? <HiCheck size={16} /> : <HiPlus size={16} />} {editingId ? "Guardar" : "Agregar"}
              </button>
            </div>

            {/* 🚀 ESTA ES LA SECCIÓN NUEVA: BURBUJAS SOLO PARA COBERTURAS */}
            {activeTab === "coberturas" && (
              <div className="pt-3 border-t border-zinc-800">
                <label className="block text-[10px] text-zinc-400 mb-2 uppercase font-semibold">Beneficios por defecto (Se auto-completarán en la cotización)</label>
                
                {/* DIBUJAMOS LAS BURBUJAS YA CARGADAS */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.beneficios_default.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-1 rounded-lg text-xs font-semibold">
                      {tag} <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-rose-400 ml-1 transition"><HiX size={12} /></button>
                    </span>
                  ))}
                </div>

                {/* INPUT PARA AGREGAR BURBUJAS A MANO CON ENTER */}
                <input 
                  type="text" 
                  placeholder="Escribí un beneficio y presioná Enter..." 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (e.target.value.trim()) { handleAddTag(e.target.value.trim()); e.target.value = ''; }
                    }
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-sky-500" 
                />

                {/* BOTONCITOS RÁPIDOS */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {QUICK_BENEFITS.map(b => (
                    <button key={b} type="button" onClick={() => handleAddTag(b)} className="text-[10px] font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2 py-1 rounded-md transition">
                      + {b}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData({nombre: "", comision_default: "", beneficios_default: []}); }} className="mt-3 text-xs text-zinc-500 underline">
                Cancelar edición
              </button>
            )}
          </form>

          {loading ? ( <p className="text-center py-4 text-zinc-500 animate-pulse">Cargando...</p> ) : (
            <ul className="space-y-2">
              {data.map(item => (
                <li key={item.id} className="flex flex-col bg-zinc-950 border border-zinc-800/80 p-3 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200">{item.nombre}</span>
                    <div className="flex items-center gap-3">
                      {activeTab === "companias" && <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-black text-xs">{item.comision_default}%</span>}
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(item)} className="p-1.5 text-zinc-500 hover:text-sky-400 bg-zinc-900 rounded-md transition"><HiPencil size={14}/></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-zinc-500 hover:text-rose-400 bg-zinc-900 rounded-md transition"><HiTrash size={14}/></button>
                      </div>
                    </div>
                  </div>
                  {/* 🚀 MUESTRA UN RESUMEN DE LOS TAGS EN LA LISTA DE ABAJO */}
                  {activeTab === "coberturas" && item.beneficios_default?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.beneficios_default.map(b => <span key={b} className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{b}</span>)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompaniasSettingsModal;