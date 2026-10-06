// src/components/gestoria/metricas/secciones.jsx
//
// 🧱 Las otras partes de «Métricas»:
//   - PlataDelMes (🔒 solo el admin): precio de los gestores, lo que ya pagaron los
//     clientes y la comisión de THAMES (cobrada y lo que falta).
//   - Gestores: cómo viene cada uno en el mes (tabla en la compu, tarjetas en el celu).
//   - ListosParaEntregar: los LISTO que el cliente todavía no retiró (oficina).
import { Link } from "react-router-dom";
import { HiArrowRight, HiChevronRight, HiClock } from "react-icons/hi2";

import { Avatar, Candado } from "../Piezas";
import { plata } from "../gestoriaUtils";
import { COLOR } from "./colores";
import { Medidor, Tarjeta, Vacio } from "./piezasMetricas";
import { diasTxt, entero, pctTxt } from "./metricasUtils";

const BOTON_LINK =
  "inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark px-3.5 text-[13.5px] font-bold text-duo-violeta-sombra dark:text-[#a5a0ff] hover:bg-surface dark:hover:bg-surface-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-duo-violeta";

// ─────────────────────────────────────────────────────────────────────────
// 💵 Plata del mes (solo admin)
// ─────────────────────────────────────────────────────────────────────────
function Bloque({ titulo, valor, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-suave dark:text-suave-dark">{titulo}</span>
      <span className="text-[24px] font-bold leading-tight tabular-nums text-titulo dark:text-titulo-dark">{valor}</span>
      {children}
    </div>
  );
}

export function PlataDelMes({ p, mes }) {
  const sub =
    p.sin_precio > 0
      ? `Precio de ${entero(p.con_precio)} de los ${entero(p.tramites)} trámites (${entero(p.sin_precio)} sin precio todavía)`
      : `Precio de los ${entero(p.tramites)} trámites cargados en ${mes}`;
  return (
    <Tarjeta titulo={`Plata de ${mes}`} sub="De los trámites cargados en el mes" derecha={<Candado />}>
      {p.tramites > 0 ? (
        <div className="flex flex-col gap-4">
          <Bloque titulo="Lo que cobran los gestores" valor={plata(p.precio)}>
            <span className="text-[12.5px] text-suave dark:text-suave-dark">{sub}</span>
          </Bloque>
          <hr className="border-linea/70 dark:border-linea-dark/70" />
          <Bloque titulo="Los clientes ya les pagaron" valor={plata(p.cobrado)}>
            {p.cobrado_pct != null ? (
              <Medidor pct={p.cobrado_pct} color={COLOR.cobrado} fondo={COLOR.cobradoFondo} label={`Pagado: ${p.cobrado_pct}%`} />
            ) : null}
            <span className="text-[12.5px] text-suave dark:text-suave-dark">
              {p.cobrado_pct != null ? `${pctTxt(p.cobrado_pct)} · ` : ""}faltan {plata(p.falta_cobrar_clientes)} (con comprobante)
            </span>
          </Bloque>
          <hr className="border-linea/70 dark:border-linea-dark/70" />
          <Bloque titulo="Comisión de THAMES" valor={plata(p.comision)}>
            {p.comision_cobrada_pct != null ? (
              <Medidor
                pct={p.comision_cobrada_pct}
                color={COLOR.comision}
                fondo={COLOR.comisionFondo}
                label={`Comisión cobrada: ${p.comision_cobrada_pct}%`}
              />
            ) : null}
            <span className="text-[12.5px] text-suave dark:text-suave-dark">
              Cobrada {plata(p.comision_cobrada)} · falta cobrar {plata(p.comision_falta)}
            </span>
          </Bloque>
          <Link to="/gestoria/comisiones" className={`${BOTON_LINK} self-start`}>
            Ir a Comisiones <HiArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <Vacio>Todavía no hay trámites cargados en {mes}.</Vacio>
      )}
    </Tarjeta>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 👷 Gestores
// ─────────────────────────────────────────────────────────────────────────
function Demorados({ n }) {
  if (!n) return <span className="text-suave dark:text-suave-dark">0</span>;
  return (
    <span className="inline-flex items-center gap-1 font-bold text-duo-rojo dark:text-red-400">
      <HiClock className="h-3.5 w-3.5" aria-hidden="true" />
      {n}
    </span>
  );
}

/** ¿La fila tiene plata para mostrar? («Sin gestor» casi nunca: ahí va "—"). */
const conPlataEn = (x) =>
  !!x.plata && (!!x.gestor || Number(x.plata.cobrado) > 0 || Number(x.plata.comision) > 0);

function Nombre({ x, onElegir, elegido }) {
  // «Sin gestor»: el "?" gris (no unas iniciales inventadas).
  const avatar = <Avatar id={x.gestor} nombre={x.gestor ? x.nombre : ""} foto={x.foto_url} size={30} />;
  const texto = (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-[14px] font-bold text-titulo dark:text-titulo-dark">{x.nombre}</span>
      {!x.activo ? <span className="text-[11.5px] text-suave dark:text-suave-dark">desactivado</span> : null}
    </span>
  );
  if (!x.gestor || elegido) {
    return (
      <span className="flex min-w-0 items-center gap-2.5">
        {avatar}
        {texto}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onElegir?.(x.gestor)}
      title={`Ver solo ${x.nombre}`}
      className="flex min-w-0 items-center gap-2.5 rounded-lg text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-duo-violeta"
    >
      {avatar}
      {texto}
    </button>
  );
}

const TH = "px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wide text-suave dark:text-suave-dark whitespace-nowrap";
const TD = "px-3 py-3 text-right text-[14px] tabular-nums whitespace-nowrap text-titulo dark:text-titulo-dark";

export function Gestores({ filas, numeros, plataTotal, conPlata, mes, onElegir, elegido }) {
  const sub = `Derivados = trámites cargados en ${mes} de cada gestor. Días hasta LISTO = promedio desde que se cargó hasta que quedó LISTO.`;
  if (!filas.length) {
    return (
      <Tarjeta titulo="Gestores" sub={sub}>
        <Vacio>Sin movimiento de gestores en {mes}.</Vacio>
      </Tarjeta>
    );
  }
  const candado = <Candado texto={false} />;
  return (
    <Tarjeta titulo="Gestores" sub={sub} derecha={conPlata ? <Candado /> : null}>
      {/* 🖥️ Compu: la tabla */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-linea dark:border-linea-dark">
              <th scope="col" className={`${TH} text-left`}>Gestor</th>
              <th scope="col" className={`${TH} text-right`}>Derivados</th>
              <th scope="col" className={`${TH} text-right`}>Abiertos</th>
              <th scope="col" className={`${TH} text-right`}>Entregados</th>
              <th scope="col" className={`${TH} text-right`}>Días hasta LISTO</th>
              <th scope="col" className={`${TH} text-right`}>Observados</th>
              <th scope="col" className={`${TH} text-right`} title="7 días o más sin moverse (hoy)">Demorados</th>
              {conPlata ? (
                <>
                  <th scope="col" className={`${TH} text-right`}>
                    <span className="inline-flex items-center gap-1">Le pagaron {candado}</span>
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    <span className="inline-flex items-center gap-1">Comisión THAMES {candado}</span>
                  </th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {filas.map((x) => (
              <tr key={x.gestor ?? "sin"} className="border-b border-linea/70 dark:border-linea-dark/70">
                <td className="max-w-[240px] px-3 py-2.5">
                  <Nombre x={x} onElegir={onElegir} elegido={elegido} />
                </td>
                <td className={TD}>{x.derivados}</td>
                <td className={TD}>{x.abiertos}</td>
                <td className={`${TD} font-bold`}>{x.entregados}</td>
                <td className={TD}>{diasTxt(x.dias_hasta_listo)}</td>
                <td className={TD}>
                  {x.observados} <span className="text-suave dark:text-suave-dark">· {pctTxt(x.observados_pct)}</span>
                </td>
                <td className={TD}>
                  <Demorados n={x.demorados} />
                </td>
                {conPlata ? (
                  <>
                    <td className={TD}>{conPlataEn(x) ? plata(x.plata.cobrado) : "—"}</td>
                    <td className={TD}>
                      {conPlataEn(x) ? (
                        <>
                          <strong>{plata(x.plata.comision)}</strong>
                          <br />
                          <span className="text-[12px] text-suave dark:text-suave-dark">
                            {Number(x.plata.comision) > 0 && Number(x.plata.comision_falta) === 0
                              ? "cobrada toda"
                              : `cobrada ${plata(x.plata.comision_cobrada)}`}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </>
                ) : null}
              </tr>
            ))}
          </tbody>
          {filas.length > 1 ? (
            <tfoot>
              <tr>
                <th scope="row" className="px-3 py-3 text-left text-[14px] font-extrabold text-titulo dark:text-titulo-dark">Total</th>
                <td className={`${TD} font-bold`}>{numeros.cargados}</td>
                <td className={`${TD} font-bold`}>{numeros.abiertos}</td>
                <td className={`${TD} font-bold`}>{numeros.entregados}</td>
                <td className={`${TD} font-bold`}>{diasTxt(numeros.dias_hasta_listo)}</td>
                <td className={`${TD} font-bold`}>
                  {numeros.observados} <span className="font-normal text-suave dark:text-suave-dark">· {pctTxt(numeros.observados_pct)}</span>
                </td>
                <td className={`${TD} font-bold`}>{numeros.demorados}</td>
                {conPlata ? (
                  <>
                    <td className={`${TD} font-bold`}>{plataTotal ? plata(plataTotal.cobrado) : "—"}</td>
                    <td className={`${TD} font-bold`}>{plataTotal ? plata(plataTotal.comision) : "—"}</td>
                  </>
                ) : null}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {/* 📱 Celu: una tarjeta por gestor */}
      <ul className="flex flex-col md:hidden">
        {filas.map((x) => (
          <li key={x.gestor ?? "sin"} className="flex flex-col gap-3 border-t border-linea/70 py-3.5 first:border-t-0 first:pt-0 dark:border-linea-dark/70">
            <div className="flex items-center justify-between gap-2">
              <Nombre x={x} onElegir={onElegir} elegido={elegido} />
              {x.demorados ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-bold text-duo-rojo dark:text-red-400">
                  <HiClock className="h-3.5 w-3.5" aria-hidden="true" />
                  {x.demorados} demorado{x.demorados === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
            <dl className="grid grid-cols-3 gap-2">
              {[
                [x.entregados, "entregados"],
                [diasTxt(x.dias_hasta_listo), "hasta LISTO"],
                [pctTxt(x.observados_pct), "observados"],
              ].map(([v, l]) => (
                <div key={l} className="flex flex-col">
                  <dt className="order-2 text-[12px] text-suave dark:text-suave-dark">{l}</dt>
                  <dd className="order-1 text-[17px] font-bold tabular-nums text-titulo dark:text-titulo-dark">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[12.5px] text-suave dark:text-suave-dark">
              {x.derivados} derivado{x.derivados === 1 ? "" : "s"} en el mes · {x.abiertos} abierto{x.abiertos === 1 ? "" : "s"} hoy
            </p>
            {conPlata && conPlataEn(x) ? (
              <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px] text-suave dark:text-suave-dark">
                <span>
                  Le pagaron <strong className="text-titulo dark:text-titulo-dark">{plata(x.plata.cobrado)}</strong>
                </span>
                <span>
                  Comisión <strong className="text-titulo dark:text-titulo-dark">{plata(x.plata.comision)}</strong>
                </span>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ✅ Listos para entregar (oficina)
// ─────────────────────────────────────────────────────────────────────────
export function ListosParaEntregar({ datos, oficinaNombre = "", diasDemorado = 7 }) {
  const total = datos?.total || 0;
  const lista = datos?.tramites || [];
  const sub = total
    ? `${total === 1 ? "1 esperando" : `${total} esperando`} que el cliente lo${total === 1 ? "" : "s"} retire${oficinaNombre ? ` en ${oficinaNombre}` : ""}`
    : "Ninguno esperando al cliente";
  return (
    <Tarjeta
      titulo="Listos para entregar"
      sub={sub}
      derecha={
        <Link to="/gestoria" className={BOTON_LINK}>
          Ir al tablero <HiArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      }
    >
      {lista.length ? (
        <>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {lista.map((t) => {
              const quien = t.con_vehiculo && t.patente ? t.patente : "";
              return (
                <li key={t.id}>
                  <Link
                    to={`/gestoria/tramite/${t.id}`}
                    className="flex min-h-[64px] items-center gap-3 rounded-xl border border-linea dark:border-linea-dark px-3.5 py-3 hover:bg-surface dark:hover:bg-surface-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-duo-violeta"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex min-w-0 items-center gap-1.5 text-[14px] text-titulo dark:text-titulo-dark">
                        {quien ? (
                          <>
                            <span className="shrink-0 font-mono font-bold tracking-[0.5px]">{quien}</span>
                            <span className="text-slate-400" aria-hidden="true">·</span>
                          </>
                        ) : null}
                        <strong className="truncate">{`${t.tipo_corto}${t.detalle ? ` ${t.detalle}` : ""}`}</strong>
                      </span>
                      <span className="truncate text-[13px] text-suave dark:text-suave-dark">{t.persona_nombre || t.numero}</span>
                      <span
                        className={`text-[13px] font-bold ${
                          t.dias >= diasDemorado ? "text-duo-rojo dark:text-red-400" : "text-suave dark:text-suave-dark"
                        }`}
                      >
                        {t.dias === 0 ? "listo hoy" : `listo hace ${t.dias} día${t.dias === 1 ? "" : "s"}`}
                      </span>
                    </span>
                    <HiChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
          {total > lista.length ? (
            <p className="text-[12.5px] text-suave dark:text-suave-dark">
              Y {total - lista.length} más en el tablero (los más viejos van primero).
            </p>
          ) : null}
        </>
      ) : (
        <Vacio>No hay trámites esperando que los retiren.</Vacio>
      )}
    </Tarjeta>
  );
}
