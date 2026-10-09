// src/components/ui/TablaDuo.jsx
//
// 📋 Tabla de THAMES — estilo Linear / Stripe con nuestra identidad.
//
// 🆕 09/10: rediseño completo (antes no la usaba nadie). Hoy la usan
//    Gestoría (Tablero y Entregados), Legales (Tablero y Cerrados) y Siniestros.
//
//   - COMPU: tabla limpia. Toda la fila se puede tocar y entrás al trámite /
//     caso / siniestro. Con Ctrl o la rueda del mouse se abre en otra pestaña.
//     Los títulos de las columnas que tienen `sortValue` ordenan la tabla
//     (1er toque ▲, 2do ▼, 3ro vuelve al orden de siempre).
//   - CELU: la misma lista en renglones compactos (NO tarjetas), uno abajo del otro.
//   - Raya de color a la izquierda de la fila (rowTone): ej. roja = demorado.
//
// Ejemplo fácil:
//   <TablaDuo
//     columns={[
//       { key: "cliente", header: "Cliente", sortValue: (t) => t.nombre, render: (t) => t.nombre },
//       { key: "oficina", header: "Oficina", desde: "xl" },          // se esconde en pantallas chicas
//       { key: "dias", header: "Hace", align: "right", primeroDesc: true, sortValue: (t) => t.dias },
//     ]}
//     rows={lista}
//     rowHref={(t) => `/gestoria/tramite/${t.id}`}     // o onRowClick={(t) => abrirModal(t)}
//     rowTone={(t) => (t.dias >= 7 ? "rojo" : null)}
//     mobileRow={(t) => <span>{t.nombre}</span>}       // cómo se ve el renglón en el celu
//   />
//
// Props:
//   columns      [{ key, header, render?(fila), align?: "left"|"center"|"right",
//                   className?, desde?: "lg"|"xl"|"2xl", sortValue?(fila), primeroDesc? }]
//                (se pueden pasar `false` / `null` en el array: se ignoran)
//   rows         array de datos
//   rowKey       fn(fila) → key única (default fila.id)
//   rowHref      fn(fila) → ruta ("/legales/12"). Hace la fila un link de verdad.
//   onRowClick   fn(fila) → si no hay ruta (ej: abrir un modal).
//   rowTone      fn(fila) → "rojo" | "ambar" | "verde" | "azul" | null (raya izquierda)
//   rowLabel     fn(fila) → texto para lectores de pantalla ("Abrir G-0142")
//   mobileRow    fn(fila) → contenido del renglón en el celu
//   acciones     fn(fila, { enCelu }) → botones al final de la fila (ej: editar/borrar)
//   vacio        nodo a mostrar si no hay filas (o emptyText)
//   desde        "md" | "lg" → desde qué ancho se ve la TABLA (default "md")
//   bare         true = sin el marco (cuando ya va adentro de una tarjeta con filtros)
import { memo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HiChevronDown, HiChevronRight, HiChevronUp, HiSearch, HiSelector } from "react-icons/hi";

// ── Clases fijas (escritas enteras para que Tailwind las encuentre) ──────────
const ALIGN = { left: "text-left", center: "text-center", right: "text-right" };
const DESDE = { lg: "hidden lg:table-cell", xl: "hidden xl:table-cell", "2xl": "hidden 2xl:table-cell" };
const VISTA = {
  md: { tabla: "hidden md:block", lista: "md:hidden" },
  lg: { tabla: "hidden lg:block", lista: "lg:hidden" },
};
const RAYA = {
  rojo: "shadow-[inset_3px_0_0_var(--color-duo-rojo)]",
  ambar: "shadow-[inset_3px_0_0_var(--color-duo-amarillo)]",
  verde: "shadow-[inset_3px_0_0_var(--color-duo-verde)]",
  azul: "shadow-[inset_3px_0_0_var(--color-duo-azul)]",
};
const SIN_SCROLLBAR = "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
// Si el click fue en algo que ya hace su propia cosa, la fila no se abre.
const INTERACTIVO = "a,button,input,select,textarea,label,[data-no-fila]";

const vacioValor = (v) => v === null || v === undefined || v === "";

function comparar(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });
}

function TablaDuo({
  columns = [],
  rows = [],
  rowKey,
  rowHref,
  onRowClick,
  rowTone,
  rowLabel,
  mobileRow,
  acciones,
  vacio = null,
  emptyText = "No hay datos para mostrar.",
  desde = "md",
  bare = false,
  className = "",
}) {
  const navigate = useNavigate();
  const [orden, setOrden] = useState(null); // { key, dir: "asc" | "desc" }
  const cols = columns.filter(Boolean);
  const vista = VISTA[desde] || VISTA.md;
  const clickeable = !!(rowHref || onRowClick);

  const keyOf = (f, i) => (rowKey ? rowKey(f) : f?.id ?? i);
  const valor = (col, f) => (col.render ? col.render(f) : f?.[col.key] ?? "—");

  // ── Orden (los vacíos siempre al final) ──
  let filas = rows;
  const colOrden = orden ? cols.find((c) => c.key === orden.key && c.sortValue) : null;
  if (colOrden) {
    const m = orden.dir === "desc" ? -1 : 1;
    filas = [...rows].sort((a, b) => {
      const x = colOrden.sortValue(a);
      const y = colOrden.sortValue(b);
      if (vacioValor(x) && vacioValor(y)) return 0;
      if (vacioValor(x)) return 1;
      if (vacioValor(y)) return -1;
      return m * comparar(x, y);
    });
  }

  const ordenar = (col) => {
    const primero = col.primeroDesc ? "desc" : "asc";
    setOrden((o) => {
      if (!o || o.key !== col.key) return { key: col.key, dir: primero };
      if (o.dir === primero) return { key: col.key, dir: primero === "asc" ? "desc" : "asc" };
      return null; // 3er toque: vuelve al orden de siempre
    });
  };

  const abrir = (f) => {
    if (onRowClick) onRowClick(f);
    else if (rowHref) navigate(rowHref(f));
  };

  // Ctrl/⌘ + click o rueda del mouse → en otra pestaña (usa el link de la fila).
  const abrirAparte = (el) => {
    const a = el.querySelector("a[data-fila]");
    if (a) window.open(a.href, "_blank", "noopener");
  };

  const clickFila = (e, f) => {
    if (e.target.closest(INTERACTIVO)) return;
    if (rowHref && (e.metaKey || e.ctrlKey)) return abrirAparte(e.currentTarget);
    abrir(f);
  };

  const ruedaFila = (e) => {
    if (e.button !== 1 || !rowHref || e.target.closest(INTERACTIVO)) return;
    e.preventDefault();
    abrirAparte(e.currentTarget);
  };

  // La 1ra celda es el "botón de verdad" de la fila (teclado, lector de pantalla, Ctrl+click).
  const principal = (f, contenido) => {
    const foco = "block min-w-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-duo-violeta/60";
    if (rowHref) {
      return (
        <Link to={rowHref(f)} data-fila="" aria-label={rowLabel?.(f)} className={foco}>
          {contenido}
        </Link>
      );
    }
    if (onRowClick) {
      return (
        <button type="button" onClick={() => onRowClick(f)} aria-label={rowLabel?.(f)} className={`${foco} w-full text-left`}>
          {contenido}
        </button>
      );
    }
    return contenido;
  };

  const marco = bare
    ? className
    : `rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-sm overflow-hidden ${className}`;

  if (!rows.length) {
    return (
      <div className={marco}>
        <div className="px-4 py-14 text-center">
          {vacio || <p className="text-[14px] font-medium text-suave dark:text-suave-dark">{emptyText}</p>}
        </div>
      </div>
    );
  }

  const conFinal = clickeable || !!acciones;

  return (
    <div className={marco}>
      {/* ===== COMPU: tabla ===== */}
      <div className={`${vista.tabla} overflow-x-auto`}>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-surface/70 dark:bg-surface-dark/40">
              {cols.map((col) => {
                const on = orden?.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={on ? (orden.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={`px-3 py-2.5 first:pl-4 border-b border-linea dark:border-linea-dark text-[12px] font-medium whitespace-nowrap ${
                      on ? "text-titulo dark:text-titulo-dark" : "text-suave dark:text-suave-dark"
                    } ${ALIGN[col.align] || ALIGN.left} ${col.desde ? DESDE[col.desde] || "" : ""}`}
                  >
                    {col.sortValue ? (
                      <button
                        type="button"
                        onClick={() => ordenar(col)}
                        className="inline-flex items-center gap-1 rounded hover:text-titulo dark:hover:text-titulo-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-duo-violeta/60"
                        title="Ordenar"
                      >
                        {col.header}
                        {on ? (
                          orden.dir === "asc" ? <HiChevronUp className="w-3.5 h-3.5" /> : <HiChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <HiSelector className="w-3.5 h-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
              {conFinal && <th scope="col" className="w-px border-b border-linea dark:border-linea-dark" aria-label="Abrir" />}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => {
              const tono = rowTone?.(f);
              return (
                <tr
                  key={keyOf(f, i)}
                  onClick={clickeable ? (e) => clickFila(e, f) : undefined}
                  onAuxClick={rowHref ? ruedaFila : undefined}
                  className={`group border-b border-linea/70 dark:border-linea-dark/70 last:border-b-0 transition-colors ${
                    clickeable ? "cursor-pointer hover:bg-surface dark:hover:bg-surface-dark/60" : ""
                  }`}
                >
                  {cols.map((col, ci) => (
                    <td
                      key={col.key}
                      className={`px-3 py-3 first:pl-4 align-middle text-titulo dark:text-titulo-dark ${ALIGN[col.align] || ALIGN.left} ${
                        col.desde ? DESDE[col.desde] || "" : ""
                      } ${ci === 0 && tono ? RAYA[tono] || "" : ""} ${col.className || ""}`}
                    >
                      {ci === 0 ? principal(f, valor(col, f)) : valor(col, f)}
                    </td>
                  ))}
                  {conFinal && (
                    <td className="w-px whitespace-nowrap py-3 pl-1 pr-3 text-right align-middle">
                      <span className="inline-flex items-center justify-end gap-1">
                        {acciones?.(f, { enCelu: false })}
                        {clickeable && (
                          <HiChevronRight
                            className="w-4 h-4 text-suave/60 dark:text-suave-dark/60 transition-transform group-hover:translate-x-0.5 group-hover:text-titulo dark:group-hover:text-titulo-dark"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ===== CELU: renglones compactos ===== */}
      <ul className={`${vista.lista} divide-y divide-linea dark:divide-linea-dark`}>
        {filas.map((f, i) => {
          const tono = rowTone?.(f);
          const contenido = mobileRow ? (
            mobileRow(f)
          ) : (
            <span className="flex-1 min-w-0 flex flex-col gap-1">
              {cols.map((col, ci) =>
                ci === 0 ? (
                  <span key={col.key} className="text-[14px] font-semibold text-titulo dark:text-titulo-dark truncate">
                    {valor(col, f)}
                  </span>
                ) : (
                  <span key={col.key} className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="shrink-0 text-suave dark:text-suave-dark">{col.header}</span>
                    <span className="min-w-0 truncate text-right text-titulo dark:text-titulo-dark">{valor(col, f)}</span>
                  </span>
                )
              )}
            </span>
          );
          const cls =
            "flex flex-1 min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface dark:active:bg-surface-dark focus:outline-none focus-visible:bg-surface dark:focus-visible:bg-surface-dark";
          const flecha = clickeable ? <HiChevronRight className="w-5 h-5 shrink-0 text-suave dark:text-suave-dark" aria-hidden="true" /> : null;
          let main;
          if (rowHref) {
            main = (
              <Link to={rowHref(f)} aria-label={rowLabel?.(f)} className={cls}>
                {contenido}
                {flecha}
              </Link>
            );
          } else if (onRowClick) {
            main = (
              <button type="button" onClick={() => onRowClick(f)} aria-label={rowLabel?.(f)} className={cls}>
                {contenido}
                {flecha}
              </button>
            );
          } else {
            main = <div className={cls}>{contenido}</div>;
          }
          return (
            <li key={keyOf(f, i)} className={`group flex items-stretch ${tono ? RAYA[tono] || "" : ""}`}>
              {main}
              {acciones && <span className="flex shrink-0 items-center gap-1 pr-2">{acciones(f, { enCelu: true })}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default memo(TablaDuo);

// ════════════════════════════════════════════════════════════════════════
// 🧩 Piezas para la barra de arriba de la tabla (las comparten los módulos)
// ════════════════════════════════════════════════════════════════════════

/**
 * Pestañas por estado con su número: [Todos 23] [● Recibido 4] [● Listo 6]…
 * items = [{ id, label, n, color?, title? }]
 */
export function PestanasTabla({ items = [], valor, onCambiar, ariaLabel = "Filtrar por estado", className = "" }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={`flex gap-1 overflow-x-auto ${SIN_SCROLLBAR} ${className}`}>
      {items.map((it) => {
        const on = it.id === valor;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={on}
            title={it.title}
            onClick={() => onCambiar(it.id)}
            className={`shrink-0 inline-flex items-center gap-2 h-9 rounded-lg px-3 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-duo-violeta/60 ${
              on
                ? "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark shadow-sm ring-1 ring-linea dark:ring-linea-dark"
                : "text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark hover:bg-card/60 dark:hover:bg-card-dark/50"
            }`}
          >
            {it.color && <i className="inline-block w-2 h-2 shrink-0 rounded-full" style={{ background: it.color }} aria-hidden="true" />}
            {it.label}
            <span
              className={`min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-bold tabular-nums ${
                on
                  ? "bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark"
                  : "bg-linea/60 dark:bg-linea-dark/60 text-suave dark:text-suave-dark"
              }`}
            >
              {it.n}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** La franja de las pestañas (arriba de todo, adentro de la tarjeta). */
export function FranjaPestanas({ children }) {
  return (
    <div className="border-b border-linea dark:border-linea-dark bg-surface/70 dark:bg-surface-dark/40 px-2 py-2">
      {children}
    </div>
  );
}

/** La barra de filtros: buscador a la izquierda y el resto a la derecha (en el celu, abajo). */
export function BarraTabla({ buscador, children }) {
  return (
    <div className="flex flex-col gap-2 border-b border-linea dark:border-linea-dark p-3 lg:flex-row lg:items-center">
      {buscador}
      {children && <div className={`flex items-center gap-2 overflow-x-auto ${SIN_SCROLLBAR} lg:ml-auto`}>{children}</div>}
    </div>
  );
}

export function BuscadorTabla({ value, onChange, placeholder = "Buscar", ancho = "lg:w-80", className = "", onSubmit }) {
  const input = (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-9 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark pl-9 pr-3 text-[13px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none transition-shadow focus:border-duo-violeta focus:ring-2 focus:ring-duo-violeta/15"
    />
  );
  const lupa = <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-suave dark:text-suave-dark pointer-events-none" />;
  if (onSubmit) {
    // Búsqueda que va al servidor (ej: Cerrados): se busca al apretar Enter.
    return (
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className={`relative w-full ${ancho} ${className}`}
      >
        {lupa}
        {input}
      </form>
    );
  }
  return (
    <label className={`relative block w-full ${ancho} ${className}`}>
      {lupa}
      <span className="sr-only">{placeholder}</span>
      {input}
    </label>
  );
}

/** Desplegable compacto: "Gestor  Todos (23) ▾". */
export function SelectTabla({ etiqueta, value, onChange, children }) {
  return (
    <label className="inline-flex shrink-0 items-center gap-1.5 h-9 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark pl-3 pr-1 text-[13px] text-suave dark:text-suave-dark transition-colors focus-within:border-duo-violeta">
      <span className="whitespace-nowrap">{etiqueta}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full max-w-[190px] cursor-pointer bg-transparent pr-1 text-[13px] font-semibold text-titulo dark:text-titulo-dark outline-none"
      >
        {children}
      </select>
    </label>
  );
}

/** Botón que se prende / apaga (ej: "Solo demorados"). */
export function ToggleTabla({ activo, onChange, children }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={() => onChange(!activo)}
      className={`inline-flex shrink-0 items-center gap-1.5 h-9 rounded-lg border px-3 text-[13px] font-semibold transition-colors ${
        activo
          ? "border-duo-rojo/50 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo"
          : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
      }`}
    >
      {children}
    </button>
  );
}

/** "Limpiar" (aparece solo si hay algún filtro puesto). */
export function LimpiarTabla({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 h-9 rounded-lg px-2.5 text-[13px] font-semibold text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
    >
      Limpiar
    </button>
  );
}

// ── Piezas chiquitas para adentro de las celdas ──────────────────────────
const TONOS_MARCA = {
  violeta: "text-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] dark:text-[#a5a0ff]",
  ambar: "text-duo-amarillo-sombra dark:text-duo-amarillo bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)]",
  verde: "text-duo-verde-sombra dark:text-duo-verde bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]",
  azul: "text-duo-azul dark:text-blue-300 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)]",
  rojo: "text-duo-rojo bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)]",
  neutro: "text-titulo dark:text-titulo-dark bg-surface dark:bg-surface-dark ring-1 ring-linea dark:ring-linea-dark",
};

/** Etiquetita de aviso: "Sin precio", "Avisar al cliente", "Turno hoy 17:30"… */
export function MarcaTabla({ tono = "neutro", icono: Icono = null, children, title }) {
  return (
    <span
      title={title}
      className={`inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-px text-[11px] font-semibold whitespace-nowrap ${TONOS_MARCA[tono] || TONOS_MARCA.neutro}`}
    >
      {Icono && <Icono className="w-3 h-3 shrink-0" aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Pastilla de estado con su color (ej: ● En el registro). */
export function PildoraTabla({ color = "#94a3b8", children }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap"
      style={{ borderColor: `${color}40`, color, background: `${color}12` }}
    >
      <i className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      {children}
    </span>
  );
}
