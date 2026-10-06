// src/components/legales/abogado/CasosAbogado.jsx
//
// 📁 «Casos» de la app del abogado (05/10): todos sus casos abiertos.
//   - Buscar por carátula, cliente, DNI, juzgado o n° de expediente.
//   - Ver: Todos · Con fecha · Quietos (30 días sin novedades y sin nada agendado).
//   - Filtrar por SUS estados, instancias y etiquetas.
//   - Cada caso: carátula, estado e instancia, lo próximo que vence y sus etiquetas.
// Arriba van los que vencen antes. Lo que escribís y filtrás queda al volver de un caso.
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { HiOutlineArchiveBox, HiOutlineChevronRight, HiOutlineFolderOpen, HiOutlineMagnifyingGlass, HiOutlineXMark } from "react-icons/hi2";

import { Cargando } from "../../gestoria/Piezas";
import { diasSinNovedad, esDemorado, textoDias } from "../legalesUtils";
import { useAbogado } from "./abogadoContext";
import { TONO_TEXTO, caratulaCorta, coincideCaso, colorDe, esQuieto, estadoDe, foco, inputCls, porLoQueViene, suave, tonoDeFecha, venceTxt } from "./abogadoUtils";
import { BarraTitulo, Etiqueta, Tarjeta, Vacio } from "./piezasAbogado";

const VER = [
  ["todos", "Todos"],
  ["fecha", "Con fecha"],
  ["quietos", "Quietos"],
];
const selectCls =
  "min-h-[42px] max-w-full rounded-full border-[1.5px] border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark pl-3 pr-8 text-[14px] font-semibold text-titulo dark:text-titulo-dark outline-none focus:border-duo-violeta";

/** Un caso en la lista (se toca y abre el caso). */
export function FilaCaso({ e }) {
  const o = estadoDe(e);
  const f = e.proxima_fecha;
  const tono = f ? tonoDeFecha(f) : "";
  const dem = esDemorado(e);
  return (
    <Link
      to={`/legales/${e.id}`}
      className={`flex min-h-[76px] items-center gap-3 px-3.5 py-3 text-titulo dark:text-titulo-dark transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-white/[0.03] dark:active:bg-white/[0.06] ${foco} focus-visible:ring-inset focus-visible:ring-offset-0`}
    >
      <span className={`h-10 w-1.5 shrink-0 rounded-full ${colorDe(o.color).punto}`} aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="line-clamp-2 break-words text-[15.5px] font-bold leading-snug">{caratulaCorta(e)}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <Etiqueta o={o} chica />
          {e.instancia ? <span className={`text-[12.5px] font-semibold ${suave}`}>{e.instancia.nombre}</span> : null}
          {(e.etiquetas || []).map((q) => (
            <Etiqueta key={q.id} o={q} chica />
          ))}
          {e.propio ? <span className={`text-[12.5px] ${suave}`}>· caso propio</span> : null}
        </span>
        {f ? (
          <span className={`truncate text-[13px] font-bold ${tono === "rojo" || tono === "ambar" ? TONO_TEXTO[tono] : suave}`}>
            {venceTxt(f)} · {f.titulo}
          </span>
        ) : dem ? (
          <span className="truncate text-[13px] font-bold text-duo-rojo dark:text-red-400">Quieto: sin novedades {textoDias(diasSinNovedad(e))}</span>
        ) : e.proximo_turno ? (
          <span className={`truncate text-[13px] ${suave}`}>Turno con el cliente agendado</span>
        ) : null}
      </span>
      <HiOutlineChevronRight className="h-[18px] w-[18px] shrink-0 text-slate-400" aria-hidden="true" />
    </Link>
  );
}

export default function CasosAbogado() {
  const { casos, listas, error, busqueda, setBusqueda, filtro, setFiltro, abrirCasoNuevo } = useAbogado();
  const todos = useMemo(() => casos || [], [casos]);
  const set = (k, v) => setFiltro((f) => ({ ...f, [k]: v }));

  const visibles = useMemo(() => {
    let l = todos.filter((e) => coincideCaso(e, busqueda));
    if (filtro.ver === "fecha") l = l.filter((e) => e.proxima_fecha);
    if (filtro.ver === "quietos") l = l.filter(esQuieto);
    if (filtro.estado) l = l.filter((e) => String(e.estado_propio?.id || "") === String(filtro.estado));
    if (filtro.instancia) l = l.filter((e) => String(e.instancia?.id || "") === String(filtro.instancia));
    if (filtro.etiqueta) l = l.filter((e) => (e.etiquetas || []).some((q) => String(q.id) === String(filtro.etiqueta)));
    return [...l].sort(porLoQueViene);
  }, [todos, busqueda, filtro]);

  const filtrando = !!(busqueda || filtro.estado || filtro.instancia || filtro.etiqueta || filtro.ver !== "todos");
  const limpiar = () => {
    setBusqueda("");
    setFiltro({ estado: "", instancia: "", etiqueta: "", ver: "todos" });
  };
  const cuenta = { todos: todos.length, fecha: todos.filter((e) => e.proxima_fecha).length, quietos: todos.filter(esQuieto).length };

  return (
    <>
      <BarraTitulo titulo="Casos" derecha={casos ? <span className={`text-[14px] font-bold tabular-nums ${suave}`}>{todos.length} abiertos</span> : null} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pb-4 pt-3.5">
        <div className="relative">
          <HiOutlineMagnifyingGlass className={`pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 ${suave}`} aria-hidden="true" />
          <label htmlFor="casos-q" className="sr-only">
            Buscar un caso
          </label>
          <input id="casos-q" type="search" value={busqueda} onChange={(ev) => setBusqueda(ev.target.value)} placeholder="Carátula, cliente, DNI o expediente" className={`${inputCls} !pl-11`} />
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-1" role="tablist" aria-label="Qué casos ver">
          {VER.map(([id, txt]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filtro.ver === id}
              onClick={() => set("ver", id)}
              className={`min-h-[40px] rounded-lg text-[13.5px] font-extrabold ${
                filtro.ver === id ? "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark shadow-sm" : id === "quietos" && cuenta.quietos ? "text-duo-rojo dark:text-red-400" : suave
              } ${foco}`}
            >
              {txt} · {cuenta[id]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            ["estado", "Estado", "todos", (listas?.ESTADO || []).filter((o) => !o.terminado)],
            ["instancia", "Instancia", "todas", listas?.INSTANCIA || []],
            ["etiqueta", "Etiqueta", "todas", listas?.ETIQUETA || []],
          ].map(([k, nombre, todos, ops]) =>
            ops.length ? (
              <span key={k}>
                <label htmlFor={`fil-${k}`} className="sr-only">
                  {nombre}
                </label>
                <select id={`fil-${k}`} value={filtro[k]} onChange={(ev) => set(k, ev.target.value)} className={`${selectCls} ${filtro[k] ? "!border-duo-violeta !text-duo-violeta-sombra dark:!text-[#a5a0ff]" : ""}`}>
                  <option value="">
                    {nombre}: {todos}
                  </option>
                  {ops.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nombre}
                    </option>
                  ))}
                </select>
              </span>
            ) : null
          )}
          {filtrando ? (
            <button type="button" onClick={limpiar} className={`inline-flex min-h-[42px] items-center gap-1 rounded-full px-2.5 text-[13.5px] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff] ${foco}`}>
              <HiOutlineXMark className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" /> Limpiar
            </button>
          ) : null}
        </div>

        {error && !casos ? <p className="rounded-xl bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2 text-[14px] font-semibold text-duo-rojo dark:text-red-300">{error}</p> : null}

        {!casos ? (
          <Cargando alto="h-72" />
        ) : visibles.length ? (
          <Tarjeta lista>
            {visibles.map((e) => (
              <FilaCaso key={e.id} e={e} />
            ))}
          </Tarjeta>
        ) : filtrando ? (
          <Vacio icono={HiOutlineMagnifyingGlass} tono="neutro" titulo="No hay casos con eso" texto="Probá con otra palabra o sacá los filtros.">
            <button type="button" onClick={limpiar} className={`min-h-[44px] rounded-xl border-[1.5px] border-slate-300 dark:border-slate-600 px-4 text-[15px] font-extrabold text-titulo dark:text-titulo-dark ${foco}`}>
              Ver todos
            </button>
          </Vacio>
        ) : (
          <Vacio icono={HiOutlineFolderOpen} tono="violeta" titulo="Todavía no tenés casos" texto="Cuando una oficina te derive uno, aparece acá. También podés cargar los tuyos.">
            <button type="button" onClick={abrirCasoNuevo} className={`min-h-[44px] rounded-xl bg-duo-violeta px-4 text-[15px] font-extrabold text-white ${foco}`}>
              Cargar un caso
            </button>
          </Vacio>
        )}

        <Link to="/legales/cerrados" className={`inline-flex min-h-[44px] items-center justify-center gap-2 self-center rounded-xl px-3 text-[14.5px] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff] ${foco}`}>
          <HiOutlineArchiveBox className="h-5 w-5" aria-hidden="true" /> Ver los casos cerrados
        </Link>
      </main>
    </>
  );
}
