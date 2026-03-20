import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { createCotizacion, updateCotizacion } from "../../store/slices/cotizacionesSlice";
import { HiX, HiPlus, HiTrash, HiStar } from "react-icons/hi";

const CotizacionModal = ({ isOpen, onClose, cotizacionEdit = null }) => {
  const dispatch = useDispatch();
  
  const [formData, setFormData] = useState({
    cliente_nombre: "",
    telefono: "",
    marca_auto: "",
    modelo_auto: "",
    anio_auto: new Date().getFullYear(),
    tiene_gnc: false,
    estado: "PENDIENTE"
  });

  const [opciones, setOpciones] = useState([]);

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
      setOpciones(cotizacionEdit.opciones || []);
    } else {
      resetForm();
    }
  }, [cotizacionEdit, isOpen]);

  const resetForm = () => {
    setFormData({
      cliente_nombre: "", telefono: "", marca_auto: "", modelo_auto: "", anio_auto: new Date().getFullYear(), tiene_gnc: false, estado: "PENDIENTE"
    });
    setOpciones([{ compania: "", tipo_cobertura: "", costo_compania: 0, porcentaje_comision: 0, precio_cliente: 0, detalles_cobertura: "", es_recomendada: true }]);
  };

  const handleAddOption = () => {
    setOpciones([...opciones, { compania: "", tipo_cobertura: "", costo_compania: 0, porcentaje_comision: 0, precio_cliente: 0, detalles_cobertura: "", es_recomendada: false }]);
  };

  const handleRemoveOption = (index) => {
    setOpciones(opciones.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...opciones];
    newOptions[index][field] = value;
    setOpciones(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSend = { ...formData, opciones };
    
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
          <h2 className="text-xl font-bold text-white">
            {cotizacionEdit ? "Editar Cotización" : "Nueva Cotización"}
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
              <input required type="text" value={formData.marca_auto} onChange={e => setFormData({...formData, marca_auto: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Modelo Auto</label>
              <input required type="text" value={formData.modelo_auto} onChange={e => setFormData({...formData, modelo_auto: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Año</label>
              <input required type="number" value={formData.anio_auto} onChange={e => setFormData({...formData, anio_auto: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none" />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="gnc" checked={formData.tiene_gnc} onChange={e => setFormData({...formData, tiene_gnc: e.target.checked})} className="w-4 h-4 bg-zinc-900 border-zinc-700 rounded" />
              <label htmlFor="gnc" className="text-sm text-zinc-300 cursor-pointer">¿Tiene Equipo GNC?</label>
            </div>
          </div>

          {/* OPCIONES DE COTIZACIÓN Y CALCULADORA */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="text-emerald-400 font-semibold uppercase text-xs tracking-wider">
                2. Opciones y Rentabilidad
              </div>
              <button type="button" onClick={handleAddOption} className="text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white px-3 py-1 rounded-lg transition font-bold flex items-center gap-1">
                <HiPlus /> Agregar Opción
              </button>
            </div>

            {opciones.map((opcion, index) => {
              // 🚀 LA MAGIA DE LA CALCULADORA EN TIEMPO REAL
              const costo = Number(opcion.costo_compania) || 0;
              const comisionPct = Number(opcion.porcentaje_comision) || 0;
              const precio = Number(opcion.precio_cliente) || 0;
              
              const gananciaBlanca = (costo * comisionPct) / 100;
              const gananciaNegra = precio - costo;
              const gananciaTotal = gananciaBlanca + gananciaNegra;

              return (
                <div key={index} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl relative">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button type="button" onClick={() => handleOptionChange(index, "es_recomendada", !opcion.es_recomendada)} className={`p-1.5 rounded-md transition ${opcion.es_recomendada ? "bg-amber-500 text-white" : "bg-zinc-800 text-zinc-500 hover:text-amber-500"}`} title="Recomendar esta opción al cliente">
                      <HiStar size={16} />
                    </button>
                    {opciones.length > 1 && (
                      <button type="button" onClick={() => handleRemoveOption(index)} className="p-1.5 rounded-md bg-zinc-800 text-zinc-500 hover:text-white hover:bg-rose-600 transition" title="Eliminar opción">
                        <HiTrash size={16} />
                      </button>
                    )}
                  </div>
                  
                  <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    Opción {index + 1} {opcion.es_recomendada && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md">⭐ Recomendada</span>}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] text-zinc-400 mb-1 uppercase">Compañía</label>
                      <input required type="text" placeholder="Ej: La Equidad" value={opcion.compania} onChange={e => handleOptionChange(index, "compania", e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-sky-500 focus:outline-none" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[10px] text-zinc-400 mb-1 uppercase">Tipo de Cobertura</label>
                      <input required type="text" placeholder="Ej: Terceros Completo con Granizo" value={opcion.tipo_cobertura} onChange={e => handleOptionChange(index, "tipo_cobertura", e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-sky-500 focus:outline-none" />
                    </div>
                  </div>

                  {/* ZONA DE CALCULADORA */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-zinc-950 rounded-lg border border-zinc-800/50 mb-3">
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1 uppercase">Costo Compañía ($)</label>
                      <input required type="number" value={opcion.costo_compania} onChange={e => handleOptionChange(index, "costo_compania", e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-rose-300 font-bold focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1 uppercase">Tu Comisión (%)</label>
                      <input required type="number" value={opcion.porcentaje_comision} onChange={e => handleOptionChange(index, "porcentaje_comision", e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-sky-300 font-bold focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-emerald-400 font-bold mb-1 uppercase">Precio al Cliente ($)</label>
                      <input required type="number" value={opcion.precio_cliente} onChange={e => handleOptionChange(index, "precio_cliente", e.target.value)} className="w-full bg-emerald-900/20 border border-emerald-500/50 rounded-lg px-3 py-1.5 text-sm text-emerald-400 font-black focus:outline-none" />
                    </div>
                  </div>

                  {/* RESULTADO DE LA CALCULADORA */}
                  <div className="flex items-center justify-between bg-sky-900/20 border border-sky-500/30 p-2.5 rounded-lg">
                    <span className="text-xs text-sky-200 font-medium">Ganancia Neta Calculada (Comisión + Recargo):</span>
                    <span className="text-lg font-black text-sky-400">${gananciaTotal.toLocaleString("es-AR")}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition">
              Cancelar
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl text-sm font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/20 transition">
              {cotizacionEdit ? "Guardar Cambios" : "Crear Cotización"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CotizacionModal;