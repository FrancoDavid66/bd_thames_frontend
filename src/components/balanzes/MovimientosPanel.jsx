// src/components/balanzes/MovimientosPanel.jsx  (diseño Duo)
//
// 🚀 SOLO LA TABLA de movimientos (Ingresos + Egresos en una sola vista).
//    Los FILTROS ya NO viven acá: los maneja el toolbar único (BalancesFilters)
//    en la página, y esta tabla recibe los datos ya cargados por props.
//    Así Resumen y Movimientos comparten el mismo box de filtros.
//
// Props:
//   items     → array de movimientos ya cargados (los trae la página)
//   count     → total de resultados (para el contador y la paginación)
//   loading   → bool
//   error     → string | null
//   page, totalPages, onPage(p) → paginación controlada desde la página
//   onReintentar() → reintenta la carga
//
import dayjs from "dayjs";
import "dayjs/locale/es";
import { HiChevronLeft, HiChevronRight, HiArrowUp, HiArrowDown } from "react-icons/hi";
dayjs.locale("es");

// 🚀 Sin decimales: $ 40.000 en vez de $ 40.000,00
const fmtMoney = (n) =>
  "$ " +
  Number(n || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const fmtFecha = (f) => (f ? dayjs(f).format("DD/MM/YYYY") : "—");

// Hora local (HH:mm) del momento en que se registró el movimiento (created_at).
const fmtHora = (item) => {
  const ts = item?.created_at;
  if (!ts) return "";
  const d = dayjs(ts);
  return d.isValid() ? d.format("HH:mm") : "";
};

// Abrevia "Pago cuota" → "PC" (solo visual).
const abreviarPagoCuota = (txt) => (txt || "").replace(/^\s*pago\s+cuota\b/i, "PC");

// Si el movimiento tiene PATENTE, reemplaza "Póliza XXXX" por la patente.
const descripcionConPatente = (item) => {
  const desc = item?.descripcion || "—";
  const patente = (item?.patente || "").toString().trim();
  if (!patente) return abreviarPagoCuota(desc);
  const sinPoliza = desc.replace(/P[oó]liza\s+\S+/i, patente);
  const conPatente = sinPoliza === desc ? `${desc} · ${patente}` : sinPoliza;
  return abreviarPagoCuota(conPatente);
};

// Chip de color para la FORMA de pago.
const FormaBadge = ({ forma }) => {
  const f = String(forma || "").toUpperCase();
  if (!f) return <span className="text-suave dark:text-suave-dark">—</span>;
  const estilos = {
    EFECTIVO: "bg-duo-verde/10 text-duo-verde dark:text-duo-verde border-duo-verde/30",
    TRANSFERENCIA: "bg-duo-violeta/10 text-duo-violeta dark:text-duo-violeta border-duo-violeta/30",
    TARJETA: "bg-duo-amarillo/10 text-duo-amarillo dark:text-duo-amarillo border-duo-amarillo/30",
    MERCADOPAGO: "bg-duo-azul/10 text-duo-azul dark:text-duo-azul border-duo-azul/30",
    OTRO: "bg-suave/10 text-suave dark:text-suave-dark border-linea dark:border-linea-dark",
  };
  const label = {
    EFECTIVO: "Efectivo",
    TRANSFERENCIA: "Transferencia",
    TARJETA: "Tarjeta",
    MERCADOPAGO: "Mercado Pago",
    OTRO: "Otro",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black whitespace-nowrap border-2 ${
        estilos[f] || "bg-suave/10 text-suave dark:text-suave-dark border-linea dark:border-linea-dark"
      }`}
    >
      {label[f] || f}
    </span>
  );
};

const esIngreso = (item) => String(item?._tipo || "").toUpperCase() === "INGRESO";

const TipoBadge = ({ item }) => {
  const ing = esIngreso(item);
  return (
    <span
      title={ing ? "Ingreso" : "Egreso"}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 ${
        ing
          ? "bg-duo-verde/10 text-duo-verde dark:text-duo-verde border-duo-verde/30"
          : "bg-duo-rojo/10 text-duo-rojo dark:text-duo-rojo border-duo-rojo/30"
      }`}
    >
      {ing ? <HiArrowUp className="w-4 h-4" strokeWidth={2} /> : <HiArrowDown className="w-4 h-4" strokeWidth={2} />}
    </span>
  );
};

export default function MovimientosPanel({
  items = [],
  count = 0,
  loading = false,
  error = null,
  page = 1,
  totalPages = 1,
  onPage = () => {},
  onReintentar = () => {},
}) {
  return (
    <div className="space-y-4">
      {/* Contador de resultados — SIEMPRE visible */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-suave dark:text-suave-dark">
          {loading ? "Cargando…" : `${count} ${count === 1 ? "movimiento" : "movimientos"}`}
        </span>
      </div>

      {/* Tabla */}
      <div className="bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-suave dark:text-suave-dark border-b-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark">
                <th className="text-center px-2 py-2.5 font-black uppercase tracking-wide w-10">Tipo</th>
                <th className="text-left px-3 py-2.5 font-black uppercase tracking-wide">Fecha</th>
                <th className="text-left px-3 py-2.5 font-black uppercase tracking-wide">Descripción</th>
                <th className="text-left px-3 py-2.5 font-black uppercase tracking-wide">Categoría</th>
                <th className="text-center px-3 py-2.5 font-black uppercase tracking-wide text-titulo dark:text-titulo-dark">Forma</th>
                <th className="text-center px-3 py-2.5 font-black uppercase tracking-wide text-titulo dark:text-titulo-dark">Oficina</th>
                <th className="text-right px-3 py-2.5 font-black uppercase tracking-wide">Monto</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 font-bold text-suave dark:text-suave-dark">
                    Cargando…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-duo-rojo font-bold">{error}</span>
                      <button
                        type="button"
                        onClick={onReintentar}
                        className="border-2 border-linea dark:border-linea-dark hover:bg-duo-azul/10 hover:border-duo-azul text-suave dark:text-suave-dark hover:text-duo-azul rounded-xl px-3 py-1.5 font-black transition-colors"
                      >
                        Reintentar
                      </button>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 font-bold text-suave dark:text-suave-dark">
                    No hay movimientos con estos filtros.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const ing = esIngreso(item);
                  const hora = fmtHora(item);
                  return (
                    <tr
                      key={`${item._tipo}-${item.id}`}
                      className="border-b-2 border-linea/50 dark:border-linea-dark/50 hover:bg-duo-azul/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-2 py-2 text-center">
                        <TipoBadge item={item} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="font-bold text-suave dark:text-suave-dark leading-tight">
                          {fmtFecha(item.fecha)}
                        </div>
                        {hora && (
                          <div className="text-[10px] font-black text-suave/70 dark:text-suave-dark/70 tabular-nums leading-tight">
                            {hora} hs
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-bold text-titulo dark:text-titulo-dark">{descripcionConPatente(item)}</td>
                      <td className="px-3 py-2 font-bold text-suave dark:text-suave-dark">{item.categoria || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <FormaBadge forma={item.forma_pago} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        {item.oficina_nombre ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg border-2 border-duo-azul/30 bg-duo-azul/10 text-duo-azul dark:text-duo-azul text-[11px] font-black whitespace-nowrap">
                            {item.oficina_nombre}
                          </span>
                        ) : (
                          <span className="text-suave dark:text-suave-dark">—</span>
                        )}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono font-black whitespace-nowrap text-base sm:text-lg tracking-tight ${
                          ing ? "text-duo-verde dark:text-duo-verde" : "text-duo-rojo dark:text-duo-rojo"
                        }`}
                      >
                        {ing ? "+" : "−"} {fmtMoney(item.monto)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-surface dark:bg-surface-dark border-t-2 border-linea dark:border-linea-dark">
            <span className="text-xs font-bold text-suave dark:text-suave-dark">
              Página {page} de {totalPages} · {count} resultados
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => onPage(page - 1)}
                className="p-1.5 rounded-xl border-2 border-linea dark:border-linea-dark hover:bg-duo-azul/10 hover:border-duo-azul disabled:opacity-30 text-suave dark:text-suave-dark transition-colors"
              >
                <HiChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-black text-titulo dark:text-titulo-dark min-w-[60px] text-center">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => onPage(page + 1)}
                className="p-1.5 rounded-xl border-2 border-linea dark:border-linea-dark hover:bg-duo-azul/10 hover:border-duo-azul disabled:opacity-30 text-suave dark:text-suave-dark transition-colors"
              >
                <HiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}