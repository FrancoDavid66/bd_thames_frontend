// src/components/balanzes/BalanceChart.jsx  (responsive)
// ============================================================
// 📈 Gráfico Ingresos vs Egresos (barras) + Neto (línea).
//
// Ya NO suma movimientos en el navegador: recibe los `puntos` que calcula el
// servidor (balance-mensual/serie/), así un mes con miles de movimientos se
// dibuja completo. Lo usan Balances y el Inicio.
//
//   <BalanceChart
//     puntos={serie.puntos}              // [{ periodo: "2026-08", ingresos, egresos, neto }]
//     agrupar="mes"                      // "mes" | "dia"
//     opciones={[{ id: "dias", label: "Día por día" }, { id: "meses", label: "12 meses" }]}
//     valor="meses" onCambiar={setVista}
//     destacado="2026-08"                // columna marcada (el mes que estás viendo)
//     onElegir={(periodo) => ...}        // tocar una columna (ej: ir a ese mes)
//   />
// ============================================================
import { useMemo, useState, useEffect } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { HiOutlinePresentationChartBar } from "react-icons/hi";

/* ========= Helpers ========= */
const toNumber = (v) => {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const mayuscula = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Etiqueta corta del eje: "Ago 26" (mes) o "04/08" (día).
const etiquetaCorta = (periodo, agrupar) => {
  if (!periodo) return "";
  if (agrupar === "mes") return mayuscula(dayjs(`${periodo}-01`).format("MMM YY"));
  return dayjs(periodo).format("DD/MM");
};

// Etiqueta larga del cartelito: "Agosto 2026" (mes) o "Martes 04/08/2026" (día).
const etiquetaLarga = (periodo, agrupar) => {
  if (!periodo) return "";
  if (agrupar === "mes") return mayuscula(dayjs(`${periodo}-01`).format("MMMM YYYY"));
  return mayuscula(dayjs(periodo).format("dddd DD/MM/YYYY"));
};

const currencyAR = (v) =>
  (Number(v) || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

// Formato compacto para el eje Y: 40000 -> "$40k", 1500000 -> "$1,5M".
// Así el eje no se come el gráfico (y "$60.000.000" no queda cortado a la
// izquierda en la vista de 12 meses). El monto exacto está en el cartelito.
const currencyShort = (v) => {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  const signo = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${signo}$${(abs / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  if (abs >= 1_000) return `${signo}$${Math.round(abs / 1_000)}k`;
  return `${signo}$${abs}`;
};

/* 🎨 Hook: detecta si está activo el modo oscuro (mirando la clase 'dark' del
   <html>). Se usa para pasarle a Recharts colores de eje/grid que combinen con
   el tema (Recharts necesita colores concretos, no clases Tailwind). */
function useIsDark() {
  const [dark, setDark] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const obs = new MutationObserver(() =>
      setDark(el.classList.contains("dark"))
    );
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/* 📱 Hook chiquito: ¿el ancho de pantalla es < 640px (mobile)? Lo usamos para
   decidir el ancho/formato del eje Y sin depender de clases Tailwind (Recharts
   pide números concretos). */
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

// Tooltip — se adapta a claro/oscuro con tokens.
const CustomTooltip = ({ active, payload, agrupar, puedeElegir }) => {
  if (!active || !payload?.length) return null;
  const fila = payload[0]?.payload || {};
  if (fila.futuro) {
    return (
      <div className="bg-card dark:bg-card-dark border border-linea dark:border-linea-dark text-suave dark:text-suave-dark rounded-xl shadow-lg px-4 py-3 text-[11px]">
        {etiquetaLarga(fila.periodo, agrupar)} · todavía no llegó
      </div>
    );
  }
  return (
    <div className="bg-card dark:bg-card-dark border border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark rounded-xl shadow-lg px-4 py-3 text-[11px]">
      <div className="font-medium mb-2 text-suave dark:text-suave-dark border-b border-linea dark:border-linea-dark pb-1">
        {etiquetaLarga(fila.periodo, agrupar)}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center gap-4">
          <span className="text-duo-verde font-medium">Ingresos</span>
          <span className="text-duo-verde dark:text-duo-verde font-mono font-semibold">${currencyAR(fila.ingresos)}</span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-duo-rojo font-medium">Egresos</span>
          <span className="text-duo-rojo dark:text-duo-rojo font-mono font-semibold">${currencyAR(fila.egresos)}</span>
        </div>
        <div className="flex justify-between items-center gap-4 pt-1 mt-1 border-t border-linea dark:border-linea-dark">
          <span className="text-duo-azul font-medium">Neto</span>
          <span className="text-duo-azul dark:text-duo-azul font-mono font-semibold">${currencyAR(fila.balance)}</span>
        </div>
      </div>
      {puedeElegir && (
        <div className="mt-2 text-[10px] text-suave dark:text-suave-dark">Tocá para ver este mes</div>
      )}
    </div>
  );
};

/* ========= Componente ========= */
const BalanceChart = ({
  puntos = [],
  agrupar = "mes",
  opciones = [],
  valor,
  onCambiar,
  destacado = null,
  onElegir = null,
  titulo = "Ingresos vs egresos",
  subtitulo = "",
  cargando = false,
  error = null,
  onReintentar,
  desactualizado = false,
  className = "",
}) => {
  const isDark = useIsDark();
  const isMobile = useIsMobile();

  // Colores de eje / grilla según tema (Recharts pide colores concretos).
  const axisColor = isDark ? "#94a3b8" : "#64748b";   // --color-suave(-dark)
  const gridColor = isDark ? "#334155" : "#e2e8f0";   // --color-linea(-dark)

  // Días que todavía no llegaron (ej: del 27 al 30 si hoy es 26) y sin
  // movimientos: van vacíos (sin barra y la línea termina hoy), no en $0.
  const data = useMemo(() => {
    const hoyTxt = dayjs().format("YYYY-MM-DD");
    return (puntos || []).map((p) => {
      const ingresos = toNumber(p.ingresos);
      const egresos = toNumber(p.egresos);
      const futuro = agrupar === "dia" && String(p.periodo) > hoyTxt && ingresos === 0 && egresos === 0;
      return {
        periodo: p.periodo,
        ingresos: futuro ? null : ingresos,
        egresos: futuro ? null : egresos,
        balance: futuro ? null : toNumber(p.neto),
        futuro,
      };
    });
  }, [puntos, agrupar]);

  const hayMovimientos = data.some((d) => (d.ingresos || 0) !== 0 || (d.egresos || 0) !== 0);
  const hayDestacado = !!destacado && data.some((d) => d.periodo === destacado);

  const yMin = useMemo(() => {
    const minVal = Math.min(0, ...data.map((d) => d.balance ?? 0));
    return Math.floor(minVal * 1.2);
  }, [data]);

  const alTocar = (estado) => {
    const periodo = estado?.activePayload?.[0]?.payload?.periodo || estado?.activeLabel;
    if (periodo && onElegir) onElegir(periodo);
  };

  const pillBtn = ({ id, label }) => (
    <button
      key={id}
      type="button"
      onClick={() => onCambiar?.(id)}
      aria-pressed={valor === id}
      // 📱 min-h-[44px] → botón cómodo de tocar en mobile.
      className={`flex-1 min-h-[44px] px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap ${
        valor === id
          ? "bg-duo-azul text-white"
          : "text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"
      }`}
    >
      {label}
    </button>
  );

  const primeraCarga = cargando && !data.length;

  return (
    <div
      className={`bg-card dark:bg-card-dark border border-linea dark:border-linea-dark rounded-xl px-3 py-3 sm:px-5 sm:py-4 mb-6 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-duo-azul via-duo-azul/60 to-duo-verde flex items-center justify-center text-white">
            <HiOutlinePresentationChartBar className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-titulo dark:text-titulo-dark tracking-tight">
              {titulo}
            </h3>
            {subtitulo && (
              <p className="text-[11px] sm:text-xs text-suave dark:text-suave-dark mt-0.5">
                {subtitulo}
              </p>
            )}
          </div>
        </div>

        {/* Selector de vista tipo pill */}
        {opciones.length > 0 && (
          <div className="flex w-full sm:w-auto">
            <div
              role="group"
              aria-label="Vista del gráfico"
              className="flex flex-1 bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark rounded-lg p-1 text-[11px] sm:text-xs"
            >
              {opciones.map(pillBtn)}
            </div>
          </div>
        )}
      </div>

      <div className={`relative h-[220px] sm:h-[300px] w-full mt-2 transition-opacity ${cargando && desactualizado ? "opacity-50" : ""}`}>
        {primeraCarga ? (
          <div className="h-full w-full rounded-lg bg-surface dark:bg-surface-dark animate-pulse flex items-center justify-center text-xs text-suave dark:text-suave-dark">
            Cargando gráfico…
          </div>
        ) : error && !data.length ? (
          <div className="h-full w-full rounded-lg border border-dashed border-linea dark:border-linea-dark flex flex-col items-center justify-center gap-2 text-xs text-suave dark:text-suave-dark">
            {error}
            {onReintentar && (
              <button
                type="button"
                onClick={() => onReintentar()}
                className="min-h-[44px] px-4 rounded-lg border border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark hover:border-duo-azul transition-colors"
              >
                Reintentar
              </button>
            )}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {/* El eje Y usa formato corto ($40k, $1,5M) con poco ancho, así el
                gráfico aprovecha toda la pantalla (sobre todo en el celu). */}
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
              onClick={onElegir ? alTocar : undefined}
              style={onElegir ? { cursor: "pointer" } : undefined}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              {/* Columna marcada: el mes (o día) que estás viendo */}
              {hayDestacado && (
                <ReferenceArea
                  x1={destacado}
                  x2={destacado}
                  fill="#2563eb"
                  fillOpacity={isDark ? 0.18 : 0.1}
                  stroke="#2563eb"
                  strokeOpacity={0.5}
                />
              )}
              <XAxis
                dataKey="periodo"
                tickFormatter={(p) => etiquetaCorta(p, agrupar)}
                stroke={axisColor}
                tick={{ fontSize: 10, fill: axisColor, fontWeight: 500 }}
                tickMargin={10}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
                minTickGap={isMobile ? 16 : 5}
              />
              <YAxis
                tickFormatter={currencyShort}
                domain={[yMin, "auto"]}
                width={isMobile ? 44 : 56}
                tick={{ fontSize: 10, fill: axisColor, fontWeight: 500 }}
                stroke={axisColor}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                // filterNull={false}: así el cartelito también sale en los días que
                // todavía no llegaron ("todavía no llegó"), que vienen vacíos.
                filterNull={false}
                content={<CustomTooltip agrupar={agrupar} puedeElegir={!!onElegir && agrupar === "mes"} />}
                cursor={{ fill: gridColor, opacity: 0.4 }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                wrapperStyle={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: axisColor,
                }}
              />
              {/* Barras con bordes redondeados arriba (paleta actual: duo-verde / duo-rojo) */}
              <Bar dataKey="ingresos" name="Ingresos" fill="#16a34a" radius={[6, 6, 0, 0]} maxBarSize={40} />
              <Bar dataKey="egresos" name="Egresos" fill="#dc2626" radius={[6, 6, 0, 0]} maxBarSize={40} />
              {/* Línea del neto (duo-azul) */}
              <Line
                type="monotone"
                dataKey="balance"
                name="Neto"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
              />
              <ReferenceLine y={0} stroke={axisColor} strokeWidth={1} />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {!primeraCarga && !error && data.length > 0 && !hayMovimientos && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
            <span className="text-xs sm:text-sm text-suave dark:text-suave-dark bg-card/90 dark:bg-card-dark/90 px-3 py-1.5 rounded-lg border border-dashed border-linea dark:border-linea-dark">
              No hubo movimientos en este período.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BalanceChart;
