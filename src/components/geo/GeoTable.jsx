// src/components/geo/GeoTable.jsx
import { FaEdit, FaTrash } from "react-icons/fa";

const GeoTable = ({ geoItems, onEdit, onDelete }) => {
  // ✅ Normalizar siempre a array y filtrar elementos inválidos
  const itemsList = (
    Array.isArray(geoItems)
      ? geoItems
      : geoItems
      ? Object.values(geoItems)
      : []
  ).filter((item) => item && item.id != null);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
        <table className="min-w-full text-sm text-left text-gray-200">
          <thead className="bg-slate-900/80 text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Dirección / Nota</th>
              <th className="px-4 py-2">Coordenadas</th>
              <th className="px-4 py-2">Activa</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {itemsList.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-4 text-center text-xs text-gray-400"
                >
                  No hay ubicaciones cargadas todavía.
                </td>
              </tr>
            )}

            {itemsList.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-slate-900/70 transition-colors"
              >
                <td className="px-4 py-2 capitalize">{item.tipo}</td>
                <td className="px-4 py-2 font-medium">{item.nombre}</td>
                <td className="px-4 py-2 text-xs text-gray-300">
                  {item.direccion || item.nota || "-"}
                </td>
                <td className="px-4 py-2 text-xs text-gray-400">
                  {item.latitud}, {item.longitud}
                </td>
                <td className="px-4 py-2">
                  {item.activa ? (
                    <span className="text-emerald-400 font-medium">Sí</span>
                  ) : (
                    <span className="text-rose-400 font-medium">No</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => onEdit && onEdit(item)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-200 transition-colors text-xs"
                      title="Editar"
                    >
                      <FaEdit />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete && onDelete(item)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-200 transition-colors text-xs"
                      title="Eliminar"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GeoTable;
