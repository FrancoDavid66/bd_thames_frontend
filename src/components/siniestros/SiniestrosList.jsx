// src/components/siniestros/SiniestrosList.jsx
import React from 'react';
import { FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import dayjs from 'dayjs';

const SiniestrosList = ({ siniestros, isWebAdmin, onView, onEdit, onDelete }) => {

  // Función para darle color a los estados del siniestro
  const getEstadoBadge = (estado, label) => {
    const colors = {
      PENDIENTE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      DENUNCIADO: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      INSPECCION: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      LIQUIDACION: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      CERRADO: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
    const style = colors[estado] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    return (
      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${style}`}>
        {label || estado}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto rounded-2xl shadow-xl border border-slate-700 bg-slate-900">
      <table className="w-full text-left border-collapse text-sm text-slate-300">
        <thead className="bg-slate-800 text-slate-200 text-xs uppercase tracking-wider">
          <tr>
            <th className="p-4 border-b border-slate-700 font-bold">Estado / Fecha</th>
            <th className="p-4 border-b border-slate-700 font-bold">Asegurado</th>
            <th className="p-4 border-b border-slate-700 font-bold">Vehículo</th>
            <th className="p-4 border-b border-slate-700 font-bold">Responsabilidad</th>
            <th className="p-4 border-b border-slate-700 font-bold text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {siniestros.length === 0 ? (
            <tr>
              <td colSpan="5" className="p-8 text-center text-slate-500 font-medium">
                No hay siniestros registrados. ¡Todo en orden! 🚀
              </td>
            </tr>
          ) : (
            siniestros.map((siniestro) => (
              <tr key={siniestro.id} className="hover:bg-slate-800/50 transition-colors">
                
                {/* ESTADO Y FECHA */}
                <td className="p-4">
                  <div className="flex flex-col items-start gap-1.5">
                    {getEstadoBadge(siniestro.estado, siniestro.estado_label)}
                    <span className="text-xs text-slate-500">
                      {siniestro.fecha_siniestro ? dayjs(siniestro.fecha_siniestro).format('DD/MM/YYYY') : 'Sin fecha'}
                    </span>
                  </div>
                </td>

                {/* CLIENTE */}
                <td className="p-4">
                  <div className="font-bold text-white mb-0.5">{siniestro.cliente_label || 'Sin Cliente'}</div>
                  {siniestro.nro_reclamo_cia ? (
                    <div className="text-xs text-indigo-400 font-medium">Reclamo: #{siniestro.nro_reclamo_cia}</div>
                  ) : (
                    <div className="text-xs text-rose-400 font-medium opacity-80">Sin Nro Cía</div>
                  )}
                </td>

                {/* VEHÍCULO */}
                <td className="p-4">
                  <div className="font-semibold">{siniestro.marca_auto} {siniestro.modelo_auto}</div>
                  {siniestro.patente && (
                    <div className="inline-block mt-1 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-slate-300">
                      {siniestro.patente}
                    </div>
                  )}
                </td>

                {/* RESPONSABILIDAD */}
                <td className="p-4">
                  <span className="text-slate-300 font-medium">{siniestro.responsabilidad_label || siniestro.responsabilidad}</span>
                </td>

                {/* ACCIONES */}
                <td className="p-4 text-center align-middle">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => onView(siniestro)} 
                      className="p-2 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors"
                      title="Ver Detalles Completos"
                    >
                      <FaEye />
                    </button>
                    <button 
                      onClick={() => onEdit(siniestro)} 
                      className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                      title="Editar Siniestro"
                    >
                      <FaEdit />
                    </button>
                    {/* Solo el Admin puede borrar siniestros (por seguridad) */}
                    {isWebAdmin && (
                      <button 
                        onClick={() => onDelete(siniestro)} 
                        className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                        title="Eliminar Registro"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </td>

              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SiniestrosList;