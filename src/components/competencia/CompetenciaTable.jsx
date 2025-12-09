// src/components/competencia/CompetenciaTable.jsx
import { motion, AnimatePresence } from "framer-motion";
import { HiPencil, HiTrash } from "react-icons/hi";

const formatMoney = (value) => {
  if (value == null || isNaN(Number(value))) return "—";
  return `$${Number(value).toLocaleString("es-AR")}`;
};

const splitRedes = (redesStr) => {
  if (!redesStr) return [];
  return redesStr
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);
};

const CompetenciaTable = ({
  registros = [],
  loading = false,
  onEdit,
  onDelete,
}) => {
  const rows = Array.isArray(registros) ? registros : [];

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl shadow-[0_0_28px_rgba(15,23,42,0.85)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Competencia – Ofertas por competidor
          </h2>
          <p className="text-xs text-slate-400">
            Cada fila es una combinación de compañía, cobertura y precio para un
            competidor, con sus redes y ubicación.
          </p>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="max-h-[520px] overflow-y-auto">
          <table className="min-w-full text-sm text-slate-100">
            <thead className="bg-slate-950/80 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">
                  Nombre
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">
                  Compañía
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">
                  Cobertura
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400">
                  Precio
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">
                  Redes
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">
                  Ubicación
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-xs text-slate-400"
                  >
                    Cargando competencia...
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-xs text-slate-500"
                  >
                    Todavía no cargaste registros de competencia.
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((row) => {
                  const redesParts = splitRedes(row.redes);

                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="border-t border-slate-800 hover:bg-slate-900/70"
                    >
                      {/* Nombre */}
                      <td className="px-3 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => onEdit && onEdit(row)}
                          className="text-primary-300 hover:text-primary-100 underline-offset-2 hover:underline cursor-pointer text-left"
                          title="Editar este competidor"
                        >
                          {row.nombre || "—"}
                        </button>
                      </td>

                      {/* Compañía */}
                      <td className="px-3 py-2 align-top text-slate-200">
                        {row.compania || "—"}
                      </td>

                      {/* Cobertura */}
                      <td className="px-3 py-2 align-top text-slate-200">
                        {row.cobertura || "—"}
                      </td>

                      {/* Precio */}
                      <td className="px-3 py-2 align-top text-right">
                        <span className="tabular-nums text-slate-100">
                          {formatMoney(row.precio)}
                        </span>
                      </td>

                      {/* Redes como chips */}
                      <td className="px-3 py-2 align-top text-xs text-slate-300 max-w-xs">
                        {redesParts.length === 0 ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {redesParts.map((item, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-slate-200 max-w-full truncate"
                                title={item}
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Ubicación */}
                      <td className="px-3 py-2 align-top text-xs text-slate-300 max-w-xs">
                        {row.direccion || row.ciudad || row.url_maps ? (
                          <>
                            <div className="line-clamp-1">
                              {row.direccion || "Sin dirección"}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {row.ciudad}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-500">Sin datos</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-3 py-2 align-top text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit && onEdit(row)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                            title="Editar registro"
                          >
                            <HiPencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete && onDelete(row)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-900/70 hover:bg-red-800 text-red-100 text-xs"
                            title="Eliminar registro"
                          >
                            <HiTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile list */}
      <div className="md:hidden">
        <AnimatePresence initial={false}>
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="px-4 py-6 text-center text-xs text-slate-400"
            >
              Cargando competencia...
            </motion.div>
          )}

          {!loading && rows.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="px-4 py-6 text-center text-xs text-slate-500"
            >
              Todavía no cargaste registros de competencia.
            </motion.div>
          )}

          {!loading &&
            rows.map((row) => {
              const redesParts = splitRedes(row.redes);
              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="border-t border-slate-800 px-4 py-3 flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onEdit && onEdit(row)}
                      className="text-sm font-semibold text-primary-200 truncate text-left underline-offset-2 hover:underline"
                    >
                      {row.nombre || "—"}
                    </button>
                    <div className="mt-0.5 text-xs text-slate-300">
                      {row.compania || "—"} · {row.cobertura || "—"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Precio:{" "}
                      <span className="font-medium text-slate-100">
                        {formatMoney(row.precio)}
                      </span>
                    </div>
                    {row.direccion || row.ciudad ? (
                      <div className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                        {row.direccion}
                        {row.ciudad ? ` · ${row.ciudad}` : ""}
                      </div>
                    ) : null}

                    {redesParts.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {redesParts.map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[10px] text-slate-200 max-w-full truncate"
                            title={item}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit && onEdit(row)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                      title="Editar"
                    >
                      <HiPencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete && onDelete(row)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-red-900/70 hover:bg-red-800 text-red-100 text-xs"
                      title="Eliminar"
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CompetenciaTable;
