// src/components/ui/TablaDuo.jsx
import React from "react";

/**
 * 📋 Tabla base reutilizable de THAMES.
 * Vista TABLA en desktop y CARDS en mobile automáticamente.
 * Vos definís las columnas; ella arma todo.
 *
 * 🆕 Rediseño "profesional": encabezados en texto normal (antes MAYÚSCULA
 * + tracking ancho), bordes de 1px (antes 2px), cards de mobile menos
 * redondeadas y sin el emoji en el estado vacío.
 *
 * Props:
 *   columns: array de columnas. Cada una:
 *     { key, header, render?(fila), align?: "left"|"center"|"right", className? }
 *     - key: identificador único (y campo por defecto si no hay render)
 *     - header: título de la columna
 *     - render(fila): cómo mostrar la celda (opcional; por defecto fila[key])
 *   rows: array de datos (objetos)
 *   rowKey: fn(fila) que devuelve la key única de la fila (default: fila.id)
 *   onRowClick: fn(fila) opcional (hace la fila clickeable)
 *   emptyText: texto cuando no hay filas
 *
 * Ejemplo:
 *   <TablaDuo
 *     columns={[
 *       { key:"nombre", header:"Cliente", render:(c)=>`${c.nombre} ${c.apellido}` },
 *       { key:"dni", header:"DNI" },
 *       { key:"estado", header:"Estado", align:"center", render:(c)=><Badge tono={estadoATono(c.estado)}>{c.estado}</Badge> },
 *     ]}
 *     rows={clientes}
 *     onRowClick={(c)=>navigate(`/clientes/${c.id}`)}
 *   />
 */
const alignCls = (a) => (a === "center" ? "text-center" : a === "right" ? "text-right" : "text-left");

function TablaDuo({ columns = [], rows = [], rowKey, onRowClick, emptyText = "No hay datos para mostrar.", className = "" }) {
  const keyOf = (fila, i) => (rowKey ? rowKey(fila) : fila?.id ?? i);
  const cellValue = (col, fila) => (col.render ? col.render(fila) : fila?.[col.key] ?? "—");

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[14px] font-medium text-suave dark:text-suave-dark">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* ===== DESKTOP: tabla ===== */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`p-3 border-b border-linea dark:border-linea-dark text-[12px] font-medium text-suave dark:text-suave-dark ${alignCls(col.align)}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((fila, i) => (
              <tr
                key={keyOf(fila, i)}
                onClick={onRowClick ? () => onRowClick(fila) : undefined}
                className={`border-b border-linea dark:border-linea-dark transition-colors ${
                  onRowClick ? "cursor-pointer hover:bg-surface dark:hover:bg-surface-dark" : ""
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`p-3 text-sm text-titulo dark:text-titulo-dark ${alignCls(col.align)} ${col.className || ""}`}>
                    {cellValue(col, fila)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== MOBILE: cards ===== */}
      <div className="md:hidden space-y-2.5">
        {rows.map((fila, i) => (
          <div
            key={keyOf(fila, i)}
            onClick={onRowClick ? () => onRowClick(fila) : undefined}
            className={`bg-card dark:bg-card-dark border border-linea dark:border-linea-dark rounded-lg p-3.5 ${
              onRowClick ? "cursor-pointer active:scale-[0.99] transition-transform" : ""
            }`}
          >
            {columns.map((col) => (
              <div key={col.key} className="flex items-center justify-between gap-3 py-1">
                <span className="text-[12px] font-medium text-suave dark:text-suave-dark shrink-0">
                  {col.header}
                </span>
                <span className="text-sm text-titulo dark:text-titulo-dark text-right min-w-0 truncate">
                  {cellValue(col, fila)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(TablaDuo);
