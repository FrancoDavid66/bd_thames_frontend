// src/components/gestoria/metricas/graficos.jsx
//
// 📊 Los gráficos de «Métricas» (barras hechas a mano, livianas y en los colores de
// la app, en claro y en oscuro):
//   - MesAMes: cargados y entregados de los últimos 6 meses (tocá o pasá por un mes
//     y te dice los dos números).
//   - TiposLlegan: qué trámites entran (los 5 que más + «Otros»).
//   - Tiempos: cuánto tarda cada parte, por tipo, contra lo esperado.
//   - Oficinas: qué oficina trae más (solo el admin mirando todas).
import { useState } from "react";

import { COLOR } from "./colores";
import { Leyenda, Linea, Muestra, Tarjeta, Vacio } from "./piezasMetricas";
import { ancho, dec, diasTxt, entero, escala, mayuscula, plegarTipos } from "./metricasUtils";

// ─────────────────────────────────────────────────────────────────────────
// Mes a mes
// ─────────────────────────────────────────────────────────────────────────
function Barra({ v, tope, color, etiqueta }) {
  const alto = ancho(v, tope);
  return (
    <span className="relative flex h-full w-[40%] max-w-[22px] items-end" aria-hidden="true">
      <span className={`block w-full rounded-t-[4px] ${color}`} style={{ height: v > 0 ? `max(2px, ${alto})` : 0 }} />
      {etiqueta && v > 0 ? (
        <span
          className="absolute left-1/2 -translate-x-1/2 text-[12px] font-bold tabular-nums text-titulo dark:text-titulo-dark"
          style={{ bottom: `calc(${alto} + 3px)` }}
        >
          {v}
        </span>
      ) : null}
    </span>
  );
}

export function MesAMes({ serie }) {
  const [activo, setActivo] = useState(null); // el mes que muestra el cartelito
  const max = Math.max(0, ...serie.flatMap((x) => [x.cargados, x.entregados]));
  const { tope, marcas } = escala(max, 3);
  const ultimo = serie.length - 1;

  return (
    <Tarjeta
      titulo="Mes a mes"
      sub="Trámites cargados y entregados · últimos 6 meses"
      derecha={
        <Leyenda>
          <Muestra color={COLOR.cargados} label="Cargados" />
          <Muestra color={COLOR.entregados} label="Entregados" />
        </Leyenda>
      }
    >
      <div className="flex flex-col gap-2">
        <div
          className="relative ml-7 mt-5 h-[170px] sm:h-[180px]"
          onPointerLeave={(e) => e.pointerType === "mouse" && setActivo(null)}
        >
          {marcas.map((m) => (
            <div key={m} className="pointer-events-none absolute inset-x-0" style={{ bottom: ancho(m, tope) }} aria-hidden="true">
              <span className={`block h-px ${COLOR.grilla}`} />
              <span className="absolute right-full top-0 mr-2 -translate-y-1/2 text-[11.5px] tabular-nums text-suave dark:text-suave-dark">
                {m}
              </span>
            </div>
          ))}
          <div className="absolute inset-0 grid grid-cols-6 gap-1 sm:gap-2.5">
            {serie.map((x, i) => {
              const nombre = `${mayuscula(x.nombre)} ${x.anio}`;
              const lado = i < 2 ? "left-0" : i > 3 ? "right-0" : "left-1/2 -translate-x-1/2";
              return (
                <button
                  key={`${x.anio}-${x.mes}`}
                  type="button"
                  // Con el mouse: al pasar. Con el dedo: al tocar (el cartelito queda hasta tocar otro).
                  onPointerEnter={(e) => e.pointerType === "mouse" && setActivo(i)}
                  onFocus={() => setActivo(i)}
                  onBlur={() => setActivo(null)}
                  onClick={() => setActivo(i)}
                  aria-label={`${nombre}: ${x.cargados} cargados y ${x.entregados} entregados`}
                  className={`relative flex h-full items-end justify-center gap-0.5 rounded-t-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-duo-violeta ${
                    activo === i
                      ? "bg-slate-100 dark:bg-white/[0.07]"
                      : i === ultimo
                        ? "bg-surface dark:bg-white/[0.035]"
                        : ""
                  }`}
                >
                  <Barra v={x.cargados} tope={tope} color={COLOR.cargados} etiqueta={i === ultimo && activo !== i} />
                  <Barra v={x.entregados} tope={tope} color={COLOR.entregados} etiqueta={i === ultimo && activo !== i} />
                  {activo === i ? (
                    <span
                      className={`pointer-events-none absolute bottom-full z-10 mb-2 flex flex-col gap-0.5 whitespace-nowrap rounded-lg bg-titulo px-2.5 py-1.5 text-left text-[12px] text-white shadow-lg dark:bg-white dark:text-titulo ${lado}`}
                      aria-hidden="true"
                    >
                      <strong>{nombre}</strong>
                      <span>
                        {x.cargados} cargados · {x.entregados} entregados
                      </span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <div className="ml-7 grid grid-cols-6 gap-1 sm:gap-2.5" aria-hidden="true">
          {serie.map((x, i) => (
            <span
              key={`${x.anio}-${x.mes}`}
              className={`text-center text-[12px] ${i === ultimo ? "font-bold text-titulo dark:text-titulo-dark" : "text-suave dark:text-suave-dark"}`}
            >
              {x.corto}
            </span>
          ))}
        </div>
      </div>
    </Tarjeta>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ¿Qué trámites llegan?
// ─────────────────────────────────────────────────────────────────────────
export function TiposLlegan({ tipos, mes }) {
  const { filas, otros } = plegarTipos(tipos);
  const max = Math.max(1, ...filas.map((x) => x.n));
  return (
    <Tarjeta titulo="¿Qué trámites llegan?" sub={`Cargados en ${mes}, por tipo`}>
      {filas.length ? (
        <>
          <ul className="flex flex-col gap-3">
            {filas.map((x) => (
              <li
                key={x.tipo}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5 sm:grid-cols-[150px_minmax(0,1fr)_84px]"
              >
                <span className="truncate text-[13.5px] font-semibold text-titulo dark:text-titulo-dark" title={x.nombre}>
                  {x.corto || x.nombre}
                </span>
                <span className="text-right text-[13.5px] tabular-nums text-titulo dark:text-titulo-dark sm:order-last">
                  <strong>{x.n}</strong>
                  <span className="text-suave dark:text-suave-dark"> · {x.pct}%</span>
                </span>
                <span className="col-span-2 block h-2.5 sm:col-span-1 sm:h-3.5" title={`${x.nombre}: ${x.n} (${x.pct}%)`}>
                  <span className={`block h-full rounded-r-[4px] ${COLOR.barra}`} style={{ width: `max(3px, ${ancho(x.n, max)})` }} />
                </span>
              </li>
            ))}
          </ul>
          {otros ? <p className="text-[12.5px] text-suave dark:text-suave-dark">Otros: {otros}</p> : null}
        </>
      ) : (
        <Vacio>Todavía no se cargó ningún trámite en {mes}.</Vacio>
      )}
    </Tarjeta>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ¿Cuánto tardan?
// ─────────────────────────────────────────────────────────────────────────
const PARTES = [
  { campo: "hasta_presentar", color: COLOR.presentar, txt: COLOR.presentarTxt, nombre: "hasta presentarlo" },
  { campo: "en_registro", color: COLOR.registro, txt: COLOR.registroTxt, nombre: "en el registro" },
  { campo: "retiro", color: COLOR.retiro, txt: COLOR.retiroTxt, nombre: "esperando que lo retiren" },
];

const FILA_TIEMPOS = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 lg:grid-cols-[180px_minmax(0,1fr)_230px] lg:gap-x-5";

function veredictoDe(x) {
  if (x.esperado == null || x.hasta_listo == null) return null;
  const pasado = Number(x.hasta_listo) - Number(x.esperado);
  if (pasado > 0.05) return { tono: "mal", icono: "sube", texto: `${diasTxt(pasado)} más que lo esperado` };
  return { tono: "bien", icono: "ok", texto: `A tiempo (se espera ${diasTxt(x.esperado)})` };
}

export function Tiempos({ tiempos, mes, esOficina = false }) {
  const max = Math.max(
    1,
    ...tiempos.map((x) => Math.max((x.hasta_presentar || 0) + (x.en_registro || 0) + (x.retiro || 0), x.esperado || 0))
  );
  const { tope, marcas } = escala(max, 3);
  const pie = esOficina
    ? "Lo gris es tiempo de ustedes: el trámite ya está LISTO y el cliente todavía no lo retiró."
    : "La rayita es lo que suele tardar cada trámite. Lo gris ya no depende del gestor: el cliente todavía no lo retiró.";

  return (
    <Tarjeta
      titulo="¿Cuánto tardan?"
      sub={`Días promedio de cada parte, en los trámites que quedaron LISTO en ${mes}`}
      derecha={
        <Leyenda>
          <Muestra color={COLOR.presentar} label="Hasta presentarlo (gestor)" />
          <Muestra color={COLOR.registro} label="En el registro" />
          <Muestra color={COLOR.retiro} label="Esperando que lo retiren (oficina)" />
          <Muestra color={COLOR.esperado} label="Lo esperado" raya />
        </Leyenda>
      }
    >
      {tiempos.length ? (
        <>
          <ul className="flex flex-col gap-5 lg:gap-4">
            {tiempos.map((x) => {
              const partes = PARTES.map((p) => ({ ...p, v: x[p.campo] })).filter((p) => p.v != null && p.v > 0);
              const veredicto = veredictoDe(x);
              return (
                <li key={x.tipo} className={FILA_TIEMPOS}>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[14px] font-bold text-titulo dark:text-titulo-dark" title={x.nombre}>
                      {x.corto || x.nombre}
                    </span>
                    <span className="text-[12.5px] text-suave dark:text-suave-dark">
                      {x.n === 1 ? "1 trámite" : `${x.n} trámites`}
                      {x.retirados && x.retirados < x.n ? ` · ${x.retirados} ya retirado${x.retirados === 1 ? "" : "s"}` : ""}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5 lg:order-last lg:items-start">
                    <span className="whitespace-nowrap text-[14px] font-bold tabular-nums text-titulo dark:text-titulo-dark">
                      {diasTxt(x.hasta_listo)} <span className="hidden font-semibold lg:inline">hasta LISTO</span>
                    </span>
                    <span className="hidden lg:block">{veredicto ? <Linea {...veredicto} /> : null}</span>
                  </span>
                  <div className="relative col-span-2 h-6 lg:col-span-1">
                    {marcas.map((m) => (
                      <span
                        key={m}
                        className={`absolute -bottom-1.5 -top-1.5 w-px ${COLOR.grilla}`}
                        style={{ left: ancho(m, tope) }}
                        aria-hidden="true"
                      />
                    ))}
                    <div className="relative flex h-full">
                      {partes.map((p, i) => (
                        <span
                          key={p.campo}
                          title={`${x.nombre}: ${diasTxt(p.v)} ${p.nombre}`}
                          className={`flex h-full shrink-0 items-center justify-center overflow-hidden ${p.color} ${
                            i === partes.length - 1 ? "rounded-r-[4px]" : "border-r-2 border-card dark:border-card-dark"
                          }`}
                          style={{ width: ancho(p.v, tope) }}
                        >
                          {p.v / tope >= 0.14 ? (
                            <span className={`whitespace-nowrap text-[11px] font-bold ${p.txt}`}>{dec(p.v)} d</span>
                          ) : null}
                        </span>
                      ))}
                    </div>
                    {x.esperado != null ? (
                      <span
                        title={`Lo esperado para ${x.nombre}: ${diasTxt(x.esperado)}`}
                        className={`absolute -bottom-1 -top-1 w-0.5 rounded-sm ${COLOR.esperado}`}
                        style={{ left: `calc(${ancho(x.esperado, tope)} - 1px)` }}
                      />
                    ) : null}
                    <span className="sr-only">
                      {`${x.nombre}: ${diasTxt(x.hasta_presentar)} hasta presentarlo, ${diasTxt(x.en_registro)} en el registro`}
                      {x.retiro != null ? `, ${diasTxt(x.retiro)} esperando que lo retiren` : ""}
                      {x.esperado != null ? `. Se espera ${diasTxt(x.esperado)}.` : "."}
                    </span>
                  </div>
                  <span className="col-span-2 lg:hidden">{veredicto ? <Linea {...veredicto} /> : null}</span>
                </li>
              );
            })}
          </ul>
          <div className={FILA_TIEMPOS} aria-hidden="true">
            <span className="hidden lg:block" />
            <div className="relative col-span-2 h-4 lg:col-span-1">
              {marcas.map((m, i) => (
                <span
                  key={m}
                  className={`absolute whitespace-nowrap text-[11.5px] tabular-nums text-suave dark:text-suave-dark ${
                    i === 0 ? "" : i === marcas.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
                  }`}
                  style={{ left: ancho(m, tope) }}
                >
                  {m} d
                </span>
              ))}
            </div>
          </div>
          <p className="text-[12.5px] text-suave dark:text-suave-dark">{pie}</p>
        </>
      ) : (
        <Vacio>Todavía ningún trámite quedó LISTO en {mes}.</Vacio>
      )}
    </Tarjeta>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ¿Qué oficina trae más? (admin, todas las oficinas)
// ─────────────────────────────────────────────────────────────────────────
export function Oficinas({ oficinas, porGestor = 0, cargados = 0, mes, onElegir }) {
  const max = Math.max(1, ...oficinas.map((x) => x.cargados));
  return (
    <Tarjeta titulo="¿Qué oficina trae más?" sub={`Trámites cargados en ${mes}, por oficina`}>
      {oficinas.length ? (
        <ul className="flex flex-col gap-3.5">
          {oficinas.map((x) => {
            const retiro =
              x.retiro_promedio != null ? `los retiran en ${diasTxt(x.retiro_promedio)} (promedio)` : "sin entregas este mes";
            return (
              <li key={x.oficina ?? "sin"} className="flex flex-col gap-1">
                <div className="grid grid-cols-[104px_minmax(0,1fr)_40px] items-center gap-2.5">
                  {x.oficina ? (
                    <button
                      type="button"
                      onClick={() => onElegir?.(x.oficina)}
                      className="truncate rounded text-left text-[14px] font-bold text-titulo underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-duo-violeta dark:text-titulo-dark"
                      title={`Ver solo ${x.nombre}`}
                    >
                      {x.nombre}
                    </button>
                  ) : (
                    <span className="truncate text-[14px] font-bold text-titulo dark:text-titulo-dark">{x.nombre}</span>
                  )}
                  <span className="block h-3.5" title={`${x.nombre}: ${x.cargados} cargados`}>
                    {x.cargados > 0 ? (
                      <span className={`block h-full rounded-r-[4px] ${COLOR.barra}`} style={{ width: `max(3px, ${ancho(x.cargados, max)})` }} />
                    ) : null}
                  </span>
                  <strong className="text-right text-[14px] tabular-nums text-titulo dark:text-titulo-dark">{x.cargados}</strong>
                </div>
                <span className="text-[12.5px] text-suave dark:text-suave-dark sm:pl-[114px]">
                  {x.listos_sin_retirar === 1 ? "1 listo sin retirar" : `${entero(x.listos_sin_retirar)} listos sin retirar`} · {retiro}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <Vacio>No hay oficinas cargadas.</Vacio>
      )}
      {porGestor > 0 ? (
        <p className="text-[12.5px] text-suave dark:text-suave-dark">
          {porGestor === 1 ? "1" : entero(porGestor)} de los {entero(cargados)} lo{porGestor === 1 ? "" : "s"} cargó un gestor desde su
          usuario (cuentan en la oficina donde se retiran).
        </p>
      ) : null}
    </Tarjeta>
  );
}
