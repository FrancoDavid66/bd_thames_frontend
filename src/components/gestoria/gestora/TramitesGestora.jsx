// src/components/gestoria/gestora/TramitesGestora.jsx
//
// 📋 «Trámites» de la app de la gestora (30/09): TODOS sus trámites abiertos.
//   - 🔍 Buscar por patente, nombre, DNI o número (busca en todos, sin filtro);
//   - 3 filtros: Para hacer (primero los observados) · En registro · Listos;
//   - cada trámite, una fila corta: se toca y abre la ficha.
// El filtro y lo buscado quedan al volver de un trámite.
import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { HiOutlineMagnifyingGlass, HiOutlineXMark } from "react-icons/hi2";

import { useGestoria } from "../gestoriaContext";
import { Cargando } from "../Piezas";
import { useGestora } from "./gestoraContext";
import { BarraTitulo, FilaTramite, Tarjeta, Vacio } from "./piezas";
import { FILTROS, TONO_TEXTO, coincide, foco, porAntiguedad, suave } from "./gestoraUtils";

const ORDEN = ["OBSERVADO", "ASIGNADO", "EN_REGISTRO", "LISTO"];

/** Subtítulo de un grupo: "OBSERVADOS · 2". */
function Grupo({ titulo, n = null, tono, children }) {
  return (
    <section className="flex flex-col gap-2" aria-label={n != null ? `${titulo}: ${n}` : titulo}>
      <span className={`px-0.5 text-[12.5px] font-extrabold uppercase tracking-[0.6px] ${TONO_TEXTO[tono] || suave}`} aria-hidden="true">
        {titulo}
        {n != null ? ` · ${n}` : ""}
      </span>
      {children}
    </section>
  );
}

export default function TramitesGestora() {
  const location = useLocation();
  const tipoNav = useNavigationType();
  const { tabGestor, setTabGestor } = useGestoria();
  const { lista, error, cargar, busqueda = "", setBusqueda } = useGestora();
  const campo = useRef(null);
  const filtro = FILTROS.find((f) => f.id === tabGestor) || FILTROS[0];
  const q = busqueda.trim();

  // Desde la 🔍 del Inicio: el cursor ya en el buscador. Solo al llegar (PUSH): al
  // volver de un trámite (POP) no, así no salta el teclado ni se pierde dónde estaba.
  useEffect(() => {
    if (location.state?.buscar && tipoNav === "PUSH") campo.current?.focus({ preventScroll: true });
  }, [location.key, location.state, tipoNav]);

  const cuenta = useMemo(() => {
    const out = {};
    FILTROS.forEach((f) => {
      out[f.id] = (lista || []).filter((t) => f.estados.includes(t.estado)).length;
    });
    return out;
  }, [lista]);

  const encontrados = useMemo(() => {
    if (!q) return null;
    return (lista || [])
      .filter((t) => ORDEN.includes(t.estado) && coincide(t, q))
      .sort((a, b) => ORDEN.indexOf(a.estado) - ORDEN.indexOf(b.estado) || porAntiguedad(a, b));
  }, [lista, q]);

  const de = (estado) => (lista || []).filter((t) => t.estado === estado).sort(porAntiguedad);

  let cuerpo;
  if (!lista) {
    cuerpo = error ? (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-duo-rojo/40 bg-card dark:bg-card-dark p-4">
        <p className="text-[15px] text-duo-rojo dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={cargar}
          className={`min-h-[44px] rounded-xl bg-duo-violeta px-4 text-[15px] font-extrabold text-white hover:bg-duo-violeta-sombra ${foco}`}
        >
          Probar de nuevo
        </button>
      </div>
    ) : (
      <>
        <Cargando alto="h-40" />
        <Cargando alto="h-40" />
      </>
    );
  } else if (encontrados) {
    cuerpo = encontrados.length ? (
      <Grupo titulo={encontrados.length === 1 ? "1 resultado" : `${encontrados.length} resultados`} tono="suave">
        <Tarjeta lista>
          {encontrados.map((t) => (
            <FilaTramite key={t.id} t={t} desde="tramites" />
          ))}
        </Tarjeta>
      </Grupo>
    ) : (
      <Vacio
        tono="neutro"
        icono={HiOutlineMagnifyingGlass}
        titulo="No encontré nada"
        texto={`Ningún trámite abierto coincide con «${q}». Probá con la patente, el nombre o el DNI.`}
      />
    );
  } else if (filtro.id === "hacer") {
    const obs = de("OBSERVADO");
    const pre = de("ASIGNADO");
    cuerpo =
      obs.length || pre.length ? (
        <>
          {obs.length > 0 && (
            <Grupo titulo="Observados" n={obs.length} tono="ambar">
              <Tarjeta lista>
                {obs.map((t) => (
                  <FilaTramite key={t.id} t={t} desde="tramites" />
                ))}
              </Tarjeta>
            </Grupo>
          )}
          {pre.length > 0 && (
            <Grupo titulo="Para presentar" n={pre.length} tono="azul">
              <Tarjeta lista>
                {pre.map((t) => (
                  <FilaTramite key={t.id} t={t} desde="tramites" />
                ))}
              </Tarjeta>
            </Grupo>
          )}
        </>
      ) : (
        <Vacio titulo="Nada para hacer" texto="No tenés trámites para presentar ni observados." />
      );
  } else {
    const estado = filtro.id === "registro" ? "EN_REGISTRO" : "LISTO";
    const ts = de(estado);
    cuerpo = ts.length ? (
      <Tarjeta lista>
        {ts.map((t) => (
          <FilaTramite key={t.id} t={t} desde="tramites" />
        ))}
      </Tarjeta>
    ) : (
      <Vacio
        tono="neutro"
        titulo={estado === "LISTO" ? "No hay listos esperando" : "Nada en el registro"}
        texto={
          estado === "LISTO"
            ? "Cuando pases uno a LISTO, queda acá hasta que el cliente lo retire en la oficina."
            : "Cuando presentes un trámite, queda acá hasta que esté listo."
        }
      />
    );
  }

  return (
    <>
      <BarraTitulo titulo="Trámites" />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-3.5 px-4 pb-4 pt-3">
        {/* 🔍 Buscar */}
        <label
          className={`flex min-h-[48px] items-center gap-2.5 rounded-[14px] border-[1.5px] border-linea dark:border-linea-dark bg-card dark:bg-card-dark pl-3.5 pr-1.5 focus-within:border-duo-violeta ${suave}`}
        >
          <HiOutlineMagnifyingGlass className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
          <input
            ref={campo}
            type="search"
            enterKeyHint="search"
            value={busqueda}
            onChange={(e) => setBusqueda?.(e.target.value)}
            placeholder="Buscar por patente o nombre"
            aria-label="Buscar un trámite"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-[16px] text-titulo dark:text-titulo-dark outline-none placeholder:text-suave dark:placeholder:text-suave-dark [&::-webkit-search-cancel-button]:hidden"
          />
          {busqueda ? (
            <button
              type="button"
              onClick={() => {
                setBusqueda?.("");
                campo.current?.focus();
              }}
              aria-label="Borrar la búsqueda"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-surface dark:hover:bg-surface-dark ${foco}`}
            >
              <HiOutlineXMark className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}
        </label>

        {/* Filtros (mientras se busca, se busca en todos) */}
        {!q && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide" role="group" aria-label="Filtrar trámites">
            {FILTROS.map((f) => {
              const on = f.id === filtro.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTabGestor?.(f.id)}
                  className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14.5px] transition-colors ${
                    on
                      ? "bg-titulo text-white dark:bg-titulo-dark dark:text-slate-900 font-extrabold"
                      : "border-[1.5px] border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark font-bold"
                  } ${foco}`}
                >
                  {f.label}
                  <span className={on ? "opacity-80" : suave}>{cuenta[f.id] || 0}</span>
                </button>
              );
            })}
          </div>
        )}

        {cuerpo}
      </main>
    </>
  );
}
