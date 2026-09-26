// src/components/balanzes/ResumenBalance.jsx  (responsive)
// ============================================================
// 📊 Pestaña "Resumen" de Balances.
//
// Muestra lo que calcula el SERVIDOR (siempre completo, sin el tope de 500):
//   · Ingresos / Egresos / Neto, y si hay con qué comparar, cuánto subió o
//     bajó contra el mes anterior. Ej: Ingresos $ 52.310.400  ▲ 9,3%  (julio: $ 47.845.900)
//   · Cantidades y formas de pago.
//   · Tabla por sucursal (admin mirando "Todas").
//   · "¿En qué se gastó?": egresos por categoría.
//
// Es un componente de SOLO dibujo: los datos los pide BalanzesPage.
//   actual   → respuesta de balance-diario (un día) o balance-mensual (rango/mes)
//   anterior → lo mismo del período con el que se compara (o null)
// ============================================================
import { FaFileExcel } from "react-icons/fa";
import { HiOfficeBuilding, HiRefresh } from "react-icons/hi";

/* -------------------- Helpers -------------------- */
const toNumber = (v) => {
  if (v == null) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtEntero = (n) => (Number(n) || 0).toLocaleString("es-AR");
const fmtPct = (x) =>
  x.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";

// Formato corto para el celular: 16420300 → "$ 16,4M"; 950000 → "$ 950k".
const fmtCorto = (n) => {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  if (a >= 1_000_000) return `$ ${(v / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  if (a >= 1_000) return `$ ${Math.round(v / 1_000).toLocaleString("es-AR")}k`;
  return `$ ${fmtMoney(v)}`;
};

const FORMAS = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
  MERCADOPAGO: "Mercado Pago",
  OTRO: "Otro",
  "SIN FORMA": "Sin forma de pago",
};

/**
 * ¿Cuánto cambió? Devuelve { texto, tono } o null si no hay con qué comparar.
 *   subeBien = true  → que suba es bueno (ingresos, neto)
 *   subeBien = false → que suba es malo (egresos)
 * Ej: variacion(110, 100, true) → { texto: "▲ 10,0%", tono: "bien" }
 */
function variacion(actual, anterior, subeBien = true) {
  if (anterior === null || anterior === undefined) return null;
  const a = toNumber(actual);
  const b = toNumber(anterior);
  if (b === 0) {
    if (a === 0) return { texto: "= igual", tono: "neutro" };
    const bueno = subeBien ? a > 0 : a < 0;
    return { texto: a > 0 ? "▲ nuevo" : "▼ nuevo", tono: bueno ? "bien" : "mal" };
  }
  const pct = ((a - b) / Math.abs(b)) * 100;
  if (Math.abs(pct) < 0.05) return { texto: "= 0,0%", tono: "neutro" };
  const bueno = subeBien ? pct > 0 : pct < 0;
  return { texto: `${pct > 0 ? "▲" : "▼"} ${fmtPct(Math.abs(pct))}`, tono: bueno ? "bien" : "mal" };
}

const TONO_CHIP = {
  bien: "bg-duo-verde/10 text-duo-verde-sombra dark:text-[#4ade80]",
  mal: "bg-duo-rojo/10 text-duo-rojo-sombra dark:text-[#f87171]",
  neutro: "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark",
};
const TONO_TEXTO = {
  bien: "text-duo-verde-sombra dark:text-[#4ade80]",
  mal: "text-duo-rojo-sombra dark:text-[#f87171]",
  neutro: "text-suave dark:text-suave-dark",
};

const Chip = ({ v }) =>
  v ? (
    <span className={`inline-flex items-center h-6 px-2 rounded-md text-[12px] font-semibold whitespace-nowrap ${TONO_CHIP[v.tono]}`}>
      {v.texto}
    </span>
  ) : null;

/* -------------------- KPI con comparación -------------------- */
const KPI_VARIANTS = {
  green: "border-duo-verde/25 bg-duo-verde/[0.05]",
  red: "border-duo-rojo/25 bg-duo-rojo/[0.05]",
  blue: "border-duo-azul/25 bg-duo-azul/[0.05]",
};

const KpiComparado = ({ titulo, valor, anterior, etiquetaAnterior, subeBien = true, variant = "blue" }) => {
  const v = variacion(valor, anterior, subeBien);
  return (
    // 📱 En el celu: nombre y monto a la izquierda, comparación a la derecha.
    //    En la compu: todo apilado (como las tarjetas de siempre).
    <div
      className={`border ${KPI_VARIANTS[variant]} rounded-lg px-4 py-3.5 min-w-0 flex items-center justify-between gap-3 sm:flex-col sm:items-stretch sm:justify-start sm:gap-2`}
    >
      <div className="min-w-0 flex flex-col gap-1.5">
        <h3 className="text-[12px] font-medium text-suave dark:text-suave-dark truncate" title={titulo}>
          {titulo}
        </h3>
        <p className="text-xl sm:text-2xl font-semibold leading-none text-titulo dark:text-titulo-dark whitespace-nowrap">
          <span className="text-[15px] opacity-60 mr-0.5">$</span>
          {fmtMoney(valor)}
        </p>
      </div>
      {v && (
        <div className="shrink-0 flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
          <Chip v={v} />
          <span className="text-[11px] sm:text-[12px] text-suave dark:text-suave-dark whitespace-nowrap">
            {etiquetaAnterior}: $ {fmtMoney(anterior)}
          </span>
        </div>
      )}
    </div>
  );
};

/* -------------------- Componente -------------------- */
export default function ResumenBalance({
  actual = null,
  anterior = null,
  comparacion = null,       // { etiqueta: "julio", texto: "Comparado con julio 2026 (mes completo)" }
  titulo = "",
  subtitulo = "",
  mostrarSucursales = false, // admin mirando "Todas las sucursales"
  cargando = false,
  desactualizado = false,    // lo que se ve es del filtro anterior (mientras carga el nuevo)
  error = null,
  onReintentar,
  mostrarReporte = false,
  onReporte,
  descargandoReporte = false,
}) {
  const hayComparacion = !!(comparacion && anterior);
  const tot = actual?.totales || {};
  const totAnt = hayComparacion ? anterior?.totales || {} : null;
  const etiquetaAnt = comparacion?.etiqueta || "antes";

  // ── Formas de pago de los ingresos (de mayor a menor, sin las que dan 0) ──
  const formas = (actual?.ingresos?.por_forma_pago || [])
    .map((f) => ({ clave: f.forma_pago, label: FORMAS[f.forma_pago] || f.forma_pago, total: toNumber(f.total) }))
    .filter((f) => f.total !== 0)
    .sort((a, b) => b.total - a.total);

  // ── Por sucursal ──
  let filasSucursal = [];
  if (mostrarSucursales && Array.isArray(actual?.por_oficina)) {
    const antMap = new Map((anterior?.por_oficina || []).map((b) => [String(b?.scope?.oficina), b]));
    filasSucursal = actual.por_oficina
      .map((b) => {
        const ant = antMap.get(String(b?.scope?.oficina));
        return {
          id: String(b?.scope?.oficina),
          nombre: b?.scope?.oficina_nombre || "Sucursal",
          ing: toNumber(b?.totales?.ingresos),
          egr: toNumber(b?.totales?.egresos),
          neto: toNumber(b?.totales?.balance),
          netoAnt: hayComparacion ? toNumber(ant?.totales?.balance) : null,
          activa: b?.scope?.activa !== false,
        };
      })
      // Oficinas dadas de baja: solo si tuvieron movimientos.
      .filter((f) => f.activa || f.ing || f.egr || f.netoAnt);
    if (actual?.sin_oficina || (hayComparacion && anterior?.sin_oficina)) {
      filasSucursal.push({
        id: "sin",
        nombre: "Sin sucursal",
        ing: toNumber(actual?.sin_oficina?.totales?.ingresos),
        egr: toNumber(actual?.sin_oficina?.totales?.egresos),
        neto: toNumber(actual?.sin_oficina?.totales?.balance),
        netoAnt: hayComparacion ? toNumber(anterior?.sin_oficina?.totales?.balance) : null,
        activa: true,
      });
    }
  }

  // ── ¿En qué se gastó? (las 5 más grandes + "Otras") ──
  const totalEgresos = toNumber(tot.egresos);
  const cats = (actual?.egresos?.por_categoria || []).map((c) => ({ ...c, total: toNumber(c.total) }));
  const topCats = cats.slice(0, 5);
  const resto = cats.slice(5);
  if (resto.length) {
    topCats.push({
      categoria: `Otras (${resto.length})`,
      total: resto.reduce((acc, c) => acc + c.total, 0),
      cantidad: resto.reduce((acc, c) => acc + (c.cantidad || 0), 0),
    });
  }

  // ── Estados de carga / error ──
  if (!actual) {
    if (error) {
      return (
        <div className="rounded-xl border border-dashed border-linea dark:border-linea-dark p-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-suave dark:text-suave-dark">{error}</p>
          {onReintentar && (
            <button
              type="button"
              onClick={() => onReintentar()}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg border border-linea dark:border-linea-dark text-sm text-titulo dark:text-titulo-dark hover:border-duo-azul transition-colors"
            >
              <HiRefresh /> Reintentar
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-7 w-48 rounded-md bg-card dark:bg-card-dark animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[92px] rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const netoTotalVar = hayComparacion ? variacion(tot.balance, totAnt?.balance, true) : null;

  return (
    <div className={`space-y-4 transition-opacity ${cargando && desactualizado ? "opacity-60" : ""}`} aria-busy={cargando ? "true" : "false"}>
      {/* ── Título del período + Reporte del mes ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 text-lg sm:text-xl font-semibold text-titulo dark:text-titulo-dark truncate">
            {titulo}
          </h2>
          {mostrarReporte && (
            <button
              type="button"
              onClick={onReporte}
              disabled={descargandoReporte}
              className="shrink-0 inline-flex items-center gap-2 min-h-[44px] px-3 sm:px-4 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-[13px] font-semibold text-titulo dark:text-titulo-dark hover:border-duo-verde transition-colors disabled:opacity-50"
            >
              <FaFileExcel className="text-duo-verde" />
              {descargandoReporte ? (
                "Generando…"
              ) : (
                <>
                  <span className="sm:hidden">Reporte (Excel)</span>
                  <span className="hidden sm:inline">Reporte del mes (Excel)</span>
                </>
              )}
            </button>
          )}
        </div>
        {subtitulo && <p className="text-[13px] text-suave dark:text-suave-dark">{subtitulo}</p>}
      </div>

      {/* ── Ingresos / Egresos / Neto ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <KpiComparado
          titulo="Ingresos"
          valor={toNumber(tot.ingresos)}
          anterior={totAnt ? toNumber(totAnt.ingresos) : null}
          etiquetaAnterior={etiquetaAnt}
          variant="green"
        />
        <KpiComparado
          titulo="Egresos"
          valor={toNumber(tot.egresos)}
          anterior={totAnt ? toNumber(totAnt.egresos) : null}
          etiquetaAnterior={etiquetaAnt}
          subeBien={false}
          variant="red"
        />
        <KpiComparado
          titulo="Neto (lo que quedó)"
          valor={toNumber(tot.balance)}
          anterior={totAnt ? toNumber(totAnt.balance) : null}
          etiquetaAnterior={etiquetaAnt}
          variant="blue"
        />
      </div>

      {/* ── Cantidades y formas de pago ── */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-7 gap-y-2.5 px-4 py-3 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-[13px] text-suave dark:text-suave-dark">
        <span>
          <strong className="text-titulo dark:text-titulo-dark">{fmtEntero(tot.ingresos_cantidad)}</strong> ingresos ·{" "}
          <strong className="text-titulo dark:text-titulo-dark">{fmtEntero(tot.egresos_cantidad)}</strong> egresos
        </span>
        {formas.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:gap-x-7">
            {formas.map((f) => (
              <span key={f.clave} className="min-w-0">
                <span className="block sm:inline text-[12px] sm:text-[13px] sm:mr-1">{f.label}</span>
                <strong className="text-[15px] sm:text-[13px] font-semibold text-titulo dark:text-titulo-dark whitespace-nowrap">
                  $ {fmtMoney(f.total)}
                </strong>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Por sucursal + ¿En qué se gastó? ── */}
      <div className={`grid gap-3 ${filasSucursal.length ? "lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]" : "lg:grid-cols-2"}`}>
        {filasSucursal.length > 0 && (
          <section className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 pt-4 pb-2 sm:pb-3 min-w-0">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <h3 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark flex items-center gap-2">
                <HiOfficeBuilding className="text-suave dark:text-suave-dark" /> Por sucursal
              </h3>
              <span className="sm:hidden text-[12px] text-suave dark:text-suave-dark">
                neto{hayComparacion ? ` · vs ${etiquetaAnt}` : ""}
              </span>
            </div>

            {/* 📱 Celu: lista */}
            <ul className="sm:hidden">
              {filasSucursal.map((f) => {
                const v = variacion(f.neto, f.netoAnt, true);
                return (
                  <li key={f.id} className="flex items-center justify-between gap-3 min-h-[54px] border-t border-linea dark:border-linea-dark">
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <span className="text-[14px] font-medium text-titulo dark:text-titulo-dark truncate">{f.nombre}</span>
                      <span className="text-[11px] text-suave dark:text-suave-dark whitespace-nowrap">
                        ing. {fmtCorto(f.ing)} · egr. {fmtCorto(f.egr)}
                      </span>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-0.5">
                      <span className="text-[14px] font-semibold text-titulo dark:text-titulo-dark whitespace-nowrap">$ {fmtMoney(f.neto)}</span>
                      {v && <span className={`text-[12px] font-semibold whitespace-nowrap ${TONO_TEXTO[v.tono]}`}>{v.texto}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* 🖥️ Compu: tabla */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-suave dark:text-suave-dark text-right">
                    <th scope="col" className="text-left font-medium py-2 border-b border-linea dark:border-linea-dark">Sucursal</th>
                    <th scope="col" className="font-medium py-2 border-b border-linea dark:border-linea-dark">Ingresos</th>
                    <th scope="col" className="font-medium py-2 border-b border-linea dark:border-linea-dark">Egresos</th>
                    <th scope="col" className="font-medium py-2 border-b border-linea dark:border-linea-dark">Neto</th>
                    {hayComparacion && (
                      <th scope="col" className="font-medium py-2 pl-3 border-b border-linea dark:border-linea-dark whitespace-nowrap">
                        Neto vs {etiquetaAnt}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="text-right text-titulo dark:text-titulo-dark">
                  {filasSucursal.map((f) => {
                    const v = variacion(f.neto, f.netoAnt, true);
                    return (
                      <tr key={f.id} className="border-b border-linea/70 dark:border-linea-dark/70">
                        <th scope="row" className="text-left font-medium py-2.5 pr-3">{f.nombre}</th>
                        <td className="py-2.5 pl-3 whitespace-nowrap text-duo-verde-sombra dark:text-[#86efac]">$ {fmtMoney(f.ing)}</td>
                        <td className="py-2.5 pl-3 whitespace-nowrap text-duo-rojo-sombra dark:text-[#fca5a5]">$ {fmtMoney(f.egr)}</td>
                        <td className="py-2.5 pl-3 whitespace-nowrap font-semibold">$ {fmtMoney(f.neto)}</td>
                        {hayComparacion && (
                          <td className={`py-2.5 pl-3 whitespace-nowrap font-semibold ${v ? TONO_TEXTO[v.tono] : ""}`}>{v?.texto || "—"}</td>
                        )}
                      </tr>
                    );
                  })}
                  <tr className="font-semibold">
                    <th scope="row" className="text-left py-2.5 pr-3">Todas</th>
                    <td className="py-2.5 pl-3 whitespace-nowrap">$ {fmtMoney(tot.ingresos)}</td>
                    <td className="py-2.5 pl-3 whitespace-nowrap">$ {fmtMoney(tot.egresos)}</td>
                    <td className="py-2.5 pl-3 whitespace-nowrap">$ {fmtMoney(tot.balance)}</td>
                    {hayComparacion && (
                      <td className={`py-2.5 pl-3 whitespace-nowrap ${netoTotalVar ? TONO_TEXTO[netoTotalVar.tono] : ""}`}>
                        {netoTotalVar?.texto || "—"}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 flex flex-col gap-3 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">¿En qué se gastó?</h3>
            <span className="text-[12px] text-suave dark:text-suave-dark">egresos por categoría</span>
          </div>
          {topCats.length === 0 || totalEgresos === 0 ? (
            <p className="text-[13px] text-suave dark:text-suave-dark">No hubo egresos en este período.</p>
          ) : (
            topCats.map((c) => {
              const pct = totalEgresos > 0 ? (c.total / totalEgresos) * 100 : 0;
              const pctTxt = pct > 0 && pct < 1 ? "<1%" : `${Math.round(pct)}%`;
              return (
                <div key={c.categoria} className="flex flex-col gap-1.5">
                  <div className="flex justify-between gap-3 text-[13px]">
                    <span className="min-w-0 truncate text-titulo dark:text-titulo-dark" title={c.categoria}>{c.categoria}</span>
                    <span className="shrink-0 whitespace-nowrap text-suave dark:text-suave-dark">
                      $ {fmtMoney(c.total)} · {pctTxt}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface dark:bg-surface-dark overflow-hidden" aria-hidden="true">
                    <div className="h-2 rounded-full bg-duo-rojo/70" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
