// src/components/balanzes/BalancesFilters.jsx  (diseño Duo · responsive)
//
// 🚀 Toolbar ÚNICO de filtros de Balances. Lo comparten la vista Resumen y la
//    vista Movimientos, así hay UN SOLO box de filtros (no dos).
//
// Es un componente "controlado": NO tiene estado propio. La página
// (BalanzesPage) es la dueña de todos los filtros y se los pasa por props junto
// con sus setters. Acá solo se dibujan los controles y se llaman los setters.
//
// 📱 RESPONSIVE:
//    - En MOBILE los grupos se APILAN (uno debajo del otro) y los botones se
//      estiran a lo ancho: atajos de período en grilla 2×2, Tipo en 3 columnas,
//      Forma de pago / Buscar / Descargar cada uno en su fila full-width.
//    - En DESKTOP se muestran en línea como antes.
//    - Tap targets ≥ 44px. Inputs con text-base (evita el zoom de iOS al enfocar).
//
// Filtros que maneja:
//   - Atajos de período: Hoy (default) · Ayer · Esta semana · Este mes
//   - Rango personalizado colapsable: un día puntual / desde-hasta
//   - Oficina (solo admin)
//   - Tipo: Ambos · Ingresos · Egresos
//   - Forma de pago
//   - Buscar
//   - Descargar (Excel / PDF)
//
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  HiCalendar, HiOfficeBuilding, HiChevronDown, HiSearch, HiX, HiDownload,
} from "react-icons/hi";
dayjs.locale("es");

/* Botón de atajo (segmented). En mobile ocupa toda su celda del grid. */
const AtajoBtn = ({ id, label, activo, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(id)}
    className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-xl text-sm font-black whitespace-nowrap transition-all ${
      activo
        ? "bg-duo-azul text-white shadow-[0_3px_0_var(--color-duo-azul-sombra)]"
        : "text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"
    }`}
  >
    {label}
  </button>
);

/* Botón de tipo (Ambos / Ingresos / Egresos). En mobile ocupa su celda del grid. */
const TipoBtn = ({ id, label, activo, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(id)}
    className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-black transition-all border-2 ${
      activo
        ? "bg-duo-azul text-white border-duo-azul shadow-[0_3px_0_var(--color-duo-azul-sombra)] active:shadow-[0_0_0_var(--color-duo-azul-sombra)] active:translate-y-0.5"
        : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark hover:text-titulo dark:hover:text-titulo-dark"
    }`}
  >
    {label}
  </button>
);

// 📱 Campos con h-11 (44px) y text-base en mobile (evita zoom de iOS).
const fieldCls =
  "h-11 bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-base sm:text-xs font-bold rounded-xl px-3 sm:px-2.5 text-titulo dark:text-titulo-dark focus:outline-none focus:border-duo-azul transition-colors cursor-pointer dark:[color-scheme:dark]";
const labelCls =
  "text-[11px] font-black uppercase tracking-wide text-suave dark:text-suave-dark";

export default function BalancesFilters({
  // Rol / oficinas
  isWebAdmin = false,
  oficinasAdmin = [],
  // Período (atajo + rango)
  atajo, setAtajo,
  advOpen, setAdvOpen,
  customDia, setCustomDia,
  customDesde, setCustomDesde,
  customHasta, setCustomHasta,
  onAplicarDia,
  onAplicarRango,
  // Oficina
  oficinaSeleccionada, setOficinaSeleccionada,
  // Filtros de la tabla
  tipo, setTipo,
  formaPago, setFormaPago,
  qInput, setQInput,
  onBuscar,
  onLimpiarBusqueda,
  // Descarga
  exportFormat, setExportFormat,
  onExport,
  exporting = false,
  // Info para el chip "Mostrando"
  etiquetaAtajo = "Hoy",
  periodoTexto = "",
  nombreOficinaSel = "Todas",
  cargando = false,
  // Mostrar u ocultar los filtros propios de la tabla (tipo/forma/buscar/descargar).
  // En Resumen los ocultamos porque no aplican al gráfico/KPIs.
  mostrarFiltrosTabla = true,
}) {
  return (
    <div className="bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-2xl p-3 sm:p-4 mb-5">
      {/* ── Fila 1: atajos de período + oficina ── */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <span className={`${labelCls} flex items-center gap-1.5`}>
            <HiCalendar className="text-duo-azul" /> Período
          </span>
          {/* 📱 Grid 2×2 en mobile → 4 en fila desde sm. */}
          <div className="grid grid-cols-2 sm:inline-flex sm:flex-wrap bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark rounded-xl p-1 gap-1">
            <AtajoBtn id="hoy" label="Hoy" activo={atajo === "hoy"} onClick={setAtajo} />
            <AtajoBtn id="ayer" label="Ayer" activo={atajo === "ayer"} onClick={setAtajo} />
            <AtajoBtn id="semana" label="Esta semana" activo={atajo === "semana"} onClick={setAtajo} />
            <AtajoBtn id="mes" label="Este mes" activo={atajo === "mes"} onClick={setAtajo} />
          </div>
        </div>

        {isWebAdmin && (
          <div className="flex flex-col gap-1.5 shrink-0">
            <span className={`${labelCls} flex items-center gap-1.5`}>
              <HiOfficeBuilding className="text-duo-azul" /> Oficina
            </span>
            {/* 📱 Full-width en mobile; ancho fijo desde sm. */}
            <div className="flex items-center gap-2 bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark rounded-xl px-3 h-11 w-full sm:min-w-[180px] focus-within:border-duo-azul transition-colors">
              <select
                value={oficinaSeleccionada}
                onChange={(e) => setOficinaSeleccionada(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm font-bold text-titulo dark:text-titulo-dark border-none focus:ring-0 p-0 cursor-pointer outline-none truncate dark:[color-scheme:dark]"
              >
                <option value="ALL">Todas las sucursales</option>
                {oficinasAdmin.map((ofi) => (
                  <option key={ofi.id} value={ofi.id}>{ofi.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Fila 2: filtros propios de la tabla (tipo / forma / buscar / descargar) ── */}
      {mostrarFiltrosTabla && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 mt-3 pt-3 border-t-2 border-linea dark:border-linea-dark">
          {/* Tipo */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Tipo</label>
            {/* 📱 3 columnas a lo ancho en mobile; auto desde sm. */}
            <div className="grid grid-cols-3 sm:flex gap-1.5">
              <TipoBtn id="ambos" label="Ambos" activo={tipo === "ambos"} onClick={setTipo} />
              <TipoBtn id="ingresos" label="Ingresos" activo={tipo === "ingresos"} onClick={setTipo} />
              <TipoBtn id="egresos" label="Egresos" activo={tipo === "egresos"} onClick={setTipo} />
            </div>
          </div>

          {/* Forma de pago */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Forma de pago</label>
            <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className={`${fieldCls} w-full sm:w-auto`}>
              <option value="TODAS">Todas las formas</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="MERCADOPAGO">Mercado Pago</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          {/* Búsqueda */}
          <div className="flex flex-col gap-1 sm:flex-1 sm:min-w-[160px]">
            <label className={labelCls}>Buscar</label>
            <form onSubmit={onBuscar} className="flex items-center gap-1.5">
              <input
                type="text"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Buscar…"
                className="flex-1 min-w-0 h-11 bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-base sm:text-xs font-bold rounded-xl px-3 sm:px-2.5 text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark focus:outline-none focus:border-duo-azul transition-colors sm:w-32 sm:flex-none"
              />
              {qInput && (
                <button
                  type="button"
                  onClick={onLimpiarBusqueda}
                  className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-xl border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-duo-rojo hover:text-duo-rojo transition-colors"
                  title="Limpiar búsqueda"
                  aria-label="Limpiar búsqueda"
                >
                  <HiX className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-xl border-2 border-linea dark:border-linea-dark hover:bg-duo-azul/10 hover:border-duo-azul text-suave dark:text-suave-dark hover:text-duo-azul transition-colors"
                title="Buscar"
                aria-label="Buscar"
              >
                <HiSearch className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Descarga */}
          <div className="flex items-center gap-1.5 sm:ml-auto sm:self-end">
            <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className={fieldCls}>
              <option value="xlsx">Excel</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              type="button"
              onClick={onExport}
              disabled={exporting}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-11 px-3.5 rounded-xl bg-duo-azul text-white text-xs font-black transition-all border-2 border-duo-azul shadow-[0_4px_0_var(--color-duo-azul-sombra)] active:shadow-[0_0_0_var(--color-duo-azul-sombra)] active:translate-y-0.5 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0"
            >
              <HiDownload className="w-4 h-4" />
              Descargar
            </button>
          </div>
        </div>
      )}

      {/* ── Toggle rango personalizado ── */}
      <button
        type="button"
        onClick={() => setAdvOpen(!advOpen)}
        className="mt-3 min-h-[44px] inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-duo-azul dark:text-duo-azul hover:opacity-80 transition"
      >
        <HiChevronDown className={`transition-transform ${advOpen ? "rotate-180" : ""}`} />
        {advOpen ? "Ocultar día / rango" : "Elegir día o rango específico"}
      </button>

      {advOpen && (
        <div className="mt-3 pt-3 border-t-2 border-dashed border-linea dark:border-linea-dark flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
          {/* Un día */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Un día</label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customDia}
                onChange={(e) => setCustomDia(e.target.value)}
                className={`${fieldCls} flex-1 sm:flex-none`}
              />
              <button
                type="button"
                onClick={onAplicarDia}
                className="shrink-0 min-h-[44px] px-4 py-2 rounded-xl text-xs font-black text-white bg-duo-azul border-2 border-duo-azul shadow-[0_3px_0_var(--color-duo-azul-sombra)] active:translate-y-0.5 active:shadow-none transition-all"
              >
                Ver
              </button>
            </div>
          </div>

          {/* Desde / Hasta */}
          <div className="flex flex-col gap-1 flex-1 sm:flex-none">
            <label className={labelCls}>Desde</label>
            <input
              type="date"
              value={customDesde}
              onChange={(e) => setCustomDesde(e.target.value)}
              className={`${fieldCls} w-full sm:w-auto`}
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 sm:flex-none">
            <label className={labelCls}>Hasta</label>
            <input
              type="date"
              value={customHasta}
              onChange={(e) => setCustomHasta(e.target.value)}
              className={`${fieldCls} w-full sm:w-auto`}
            />
          </div>
          <button
            type="button"
            onClick={onAplicarRango}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-black text-white bg-duo-verde border-2 border-duo-verde shadow-[0_4px_0_var(--color-duo-verde-sombra)] active:translate-y-0.5 active:shadow-none transition-all"
          >
            Aplicar rango
          </button>
        </div>
      )}

      {/* ── Chip "Mostrando" ── */}
      <div className="mt-3 pt-3 border-t-2 border-linea dark:border-linea-dark flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 bg-duo-azul/10 text-duo-azul dark:text-duo-azul border-2 border-duo-azul/30 px-3 py-1 rounded-full text-[11px] font-black">
          <HiCalendar /> {etiquetaAtajo}
        </span>
        <span className="text-xs font-bold text-suave dark:text-suave-dark">
          Mostrando <strong className="text-titulo dark:text-titulo-dark font-black">{periodoTexto}</strong>
          {isWebAdmin && <> · Oficina: <strong className="text-titulo dark:text-titulo-dark font-black">{nombreOficinaSel}</strong></>}
        </span>
        {cargando && (
          <span className="text-[11px] text-duo-azul dark:text-duo-azul font-black animate-pulse ml-1">
            Actualizando…
          </span>
        )}
      </div>
    </div>
  );
}
