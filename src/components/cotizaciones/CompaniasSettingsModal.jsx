// src/components/cotizaciones/CompaniasSettingsModal.jsx  (diseño Duo)
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

  const [ciaForm, setCiaForm] = useState({ nombre: "", comision_default: "", antiguedad_maxima: 25 });
  const [cobForm, setCobForm] = useState({ nombre: "", beneficios_default: [] });
  const [tagInput, setTagInput] = useState("");

  const currentYear = new Date().getFullYear();

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
        nombre: ciaForm.nombre, comision_default: 0, antiguedad_maxima: 25
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
      setSelectedCia({ ...selectedCia, ...ciaForm });
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
    setCiaForm({ nombre: cia.nombre, comision_default: cia.comision_default, antiguedad_maxima: cia.antiguedad_maxima });
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
    setCobForm({ ...cobForm, beneficios_default: cobForm.beneficios_default.filter(t => t !== tagToRemove) });
  };

  const handleCreateCob = async (e) => {
    e.preventDefault();
    if (!cobForm.nombre) return toast.error("El nombre de la cobertura es obligatorio");
    try {
      await axios.post(`${BASE_URL}cotizaciones/coberturas/`, {
        ...cobForm, compania: selectedCia.id
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

  const inputCls = "w-full bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark rounded-xl px-4 py-2.5 text-sm text-titulo dark:text-titulo-dark font-bold focus:border-oficina outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* HEADER */}
        <div className="flex justify-between items-center p-5 border-b-2 border-linea dark:border-linea-dark shrink-0">
          <div className="flex items-center gap-3">
            {selectedCia && (
              <button onClick={closeCiaSettings} className="w-10 h-10 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark hover:border-oficina text-suave dark:text-suave-dark hover:text-oficina flex items-center justify-center transition-colors">
                <HiArrowLeft size={20} />
              </button>
            )}
            <div>
              <h2 className="text-xl font-black text-titulo dark:text-titulo-dark tracking-tight">
                {selectedCia ? `⚙️ ${selectedCia.nombre}` : "⚙️ Configurar Aseguradoras"}
              </h2>
              <p className="text-suave dark:text-suave-dark text-xs font-bold mt-1">
                {selectedCia ? "Ajustá límites y coberturas de esta aseguradora." : "Administrá tus aseguradoras y sus coberturas."}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark hover:border-egreso hover:text-egreso text-suave dark:text-suave-dark flex items-center justify-center transition-colors">
            <HiX size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10 text-suave dark:text-suave-dark font-bold">Cargando datos...</div>
          ) : !selectedCia ? (
            /* ===== VISTA 1: LISTADO ===== */
            <div className="space-y-8">
              <div className="bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark rounded-2xl p-5">
                <h3 className="text-sm font-black text-oficina mb-4 uppercase tracking-widest">Crear Nueva Compañía</h3>
                <form onSubmit={handleCreateCia} className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] text-suave dark:text-suave-dark mb-1 uppercase font-black tracking-widest">Nombre de la Aseguradora *</label>
                    <input type="text" required value={ciaForm.nombre} onChange={e => setCiaForm({ ...ciaForm, nombre: e.target.value })} className={inputCls} placeholder="Ej: Equidad Seguros" />
                  </div>
                  <button type="submit" className="w-full sm:w-auto bg-oficina text-white border-2 border-oficina text-xs font-black uppercase tracking-widest px-8 py-3 rounded-xl transition-all shadow-[0_4px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 cursor-pointer">Guardar</button>
                </form>
              </div>

              <div>
                <h3 className="text-xs font-black text-suave dark:text-suave-dark mb-3 uppercase tracking-widest">Compañías Cargadas ({companias.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {companias.map(cia => {
                    const limiteAnio = currentYear - (cia.antiguedad_maxima || 25);
                    return (
                      <div key={cia.id} className="bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark p-4 rounded-2xl flex flex-col relative group hover:border-oficina transition-colors">
                        <div className="absolute top-3 right-3 flex gap-2">
                          <button onClick={() => openCiaSettings(cia)} className="text-suave dark:text-suave-dark hover:text-oficina bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark hover:border-oficina p-1.5 rounded-lg transition-colors" title="Configurar coberturas">
                            <HiCog size={18} />
                          </button>
                          <button onClick={() => handleDeleteCia(cia.id)} className="text-suave dark:text-suave-dark hover:text-egreso bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark hover:border-egreso p-1.5 rounded-lg transition-colors" title="Eliminar">
                            <HiTrash size={18} />
                          </button>
                        </div>
                        <FaBuilding className="text-oficina text-2xl mb-2" />
                        <h4 className="text-titulo dark:text-titulo-dark font-black text-lg leading-tight pr-16">{cia.nombre}</h4>
                        <div className="mt-4 pt-3 border-t-2 border-linea dark:border-linea-dark flex flex-wrap gap-2 text-xs">
                          <span className="bg-[#d97706]/10 text-[#d97706] dark:text-tarjeta-claro border-2 border-tarjeta/30 px-2 py-1 rounded-lg font-black">Desde el {limiteAnio}</span>
                          <span className="bg-card dark:bg-card-dark text-suave dark:text-suave-dark border-2 border-linea dark:border-linea-dark px-2 py-1 rounded-lg font-black w-full text-center cursor-pointer hover:border-oficina hover:text-oficina transition-colors" onClick={() => openCiaSettings(cia)}>
                            ⚙️ Configurar coberturas ➔
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ===== VISTA 2: CONFIG DE UNA COMPAÑÍA ===== */
            <div className="space-y-6">
              <div className="bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark rounded-2xl p-5">
                <h3 className="text-sm font-black text-oficina mb-4 uppercase tracking-widest flex items-center gap-2"><FaBuilding /> Ajustes Generales</h3>
                <form onSubmit={handleUpdateCia} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-suave dark:text-suave-dark mb-1 uppercase font-black tracking-widest">Nombre</label>
                    <input type="text" required value={ciaForm.nombre} onChange={e => setCiaForm({ ...ciaForm, nombre: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-suave dark:text-suave-dark mb-1 uppercase font-black tracking-widest">Antigüedad Máx.</label>
                    <input type="number" value={ciaForm.antiguedad_maxima} onChange={e => setCiaForm({ ...ciaForm, antiguedad_maxima: e.target.value })} className={inputCls} />
                    {ciaForm.antiguedad_maxima && (
                      <p className="text-[10px] text-[#d97706] dark:text-tarjeta-claro font-black mt-1.5">↳ Cubre desde el año {currentYear - Number(ciaForm.antiguedad_maxima)}</p>
                    )}
                  </div>
                  <div className="sm:col-span-3 flex justify-end mt-1 border-t-2 border-linea dark:border-linea-dark pt-3">
                    <button type="submit" className="bg-oficina text-white border-2 border-oficina text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all shadow-[0_4px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 cursor-pointer">Actualizar Datos</button>
                  </div>
                </form>
              </div>

              {/* CREAR COBERTURA */}
              <div className="bg-ingreso/[0.06] border-2 border-ingreso/25 rounded-2xl p-5">
                <h3 className="text-sm font-black text-ingreso mb-4 uppercase tracking-widest flex items-center gap-2"><FaShieldAlt /> Agregar Cobertura</h3>
                <form onSubmit={handleCreateCob} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-suave dark:text-suave-dark mb-1 uppercase font-black tracking-widest">Nombre de Cobertura *</label>
                    <input type="text" required value={cobForm.nombre} onChange={e => setCobForm({ ...cobForm, nombre: e.target.value })} className="w-full bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-xl px-3 py-2.5 text-sm text-titulo dark:text-titulo-dark font-bold focus:border-ingreso outline-none transition-colors" placeholder="Ej: Terceros Completo Premium" />
                  </div>
                  <div className="pt-2">
                    <label className="block text-[10px] text-suave dark:text-suave-dark mb-2 uppercase font-black tracking-widest">Beneficios / Cosas que cubre</label>
                    <div className="flex flex-col sm:flex-row gap-3 mb-3">
                      <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Tipeá un beneficio y presioná Enter..." onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(tagInput); } }} className="flex-1 bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-xl px-3 py-2.5 text-sm text-titulo dark:text-titulo-dark font-bold outline-none focus:border-ingreso transition-colors" />
                      <button type="button" onClick={() => handleAddTag(tagInput)} className="bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark border-2 border-linea dark:border-linea-dark hover:border-ingreso px-4 py-2 rounded-xl text-xs font-black uppercase transition-colors">Agregar</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="text-[10px] text-suave dark:text-suave-dark font-black mr-2 mt-1">Sugerencias:</span>
                      {QUICK_BENEFITS.map(b => (
                        <button key={b} type="button" onClick={() => handleAddTag(b)} className="text-[9px] font-black uppercase tracking-wider bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark hover:border-ingreso text-suave dark:text-suave-dark px-2.5 py-1 rounded-lg transition-colors">+ {b}</button>
                      ))}
                    </div>
                    <div className="bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-xl p-3 min-h-[60px] flex flex-wrap gap-2 items-start">
                      {cobForm.beneficios_default.length === 0 && <span className="text-xs text-suave dark:text-suave-dark italic mt-1 font-bold">Aún no hay beneficios agregados...</span>}
                      {cobForm.beneficios_default.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 bg-ingreso/10 text-ingreso border-2 border-ingreso/30 px-2.5 py-1.5 rounded-lg text-xs font-black">
                          {tag}
                          <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-egreso rounded-full p-0.5 transition-colors"><HiX size={14} /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" className="bg-ingreso text-white border-2 border-ingreso text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all shadow-[0_4px_0_var(--color-ingreso-fuerte)] active:shadow-[0_0_0_var(--color-ingreso-fuerte)] active:translate-y-0.5 cursor-pointer">Guardar Cobertura</button>
                  </div>
                </form>
              </div>

              {/* LISTA COBERTURAS */}
              <div>
                <h3 className="text-xs font-black text-suave dark:text-suave-dark mb-3 uppercase tracking-widest border-b-2 border-linea dark:border-linea-dark pb-2">Coberturas de {selectedCia.nombre} ({coberturasDeCia.length})</h3>
                {coberturasDeCia.length === 0 ? (
                  <p className="text-suave dark:text-suave-dark text-sm italic font-bold">Esta compañía aún no tiene coberturas configuradas.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {coberturasDeCia.map(cob => (
                      <div key={cob.id} className="bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark p-4 rounded-2xl flex flex-col relative">
                        <button onClick={() => handleDeleteCob(cob.id)} className="absolute top-3 right-3 text-suave dark:text-suave-dark hover:text-egreso bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark hover:border-egreso p-1.5 rounded-lg transition-colors"><HiTrash size={16} /></button>
                        <h4 className="text-ingreso font-black text-lg pr-8 mb-3">{cob.nombre}</h4>
                        <div className="flex flex-wrap gap-1.5 mt-auto pt-2 border-t-2 border-linea dark:border-linea-dark">
                          {cob.beneficios_default.length > 0 ? (
                            cob.beneficios_default.map((b, i) => (
                              <span key={i} className="text-[9px] font-black bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark px-2 py-0.5 rounded uppercase tracking-wider">{b}</span>
                            ))
                          ) : (
                            <span className="text-[10px] text-suave dark:text-suave-dark italic font-bold">Sin beneficios cargados.</span>
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
