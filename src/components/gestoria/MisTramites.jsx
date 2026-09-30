// src/components/gestoria/MisTramites.jsx
//
// 🏠 INICIO de la app de la gestora (rediseño 30/09, estilo Envíos Flex).
// Franco: "cuando entra a su cuenta es pésimo, no se entiende nada". Ahora, de un vistazo:
//   - "Hola, Laura · Tenés 11 trámites para hacer" y la 🔍 para buscar;
//   - 3 números que se tocan: Observados · Para presentar · En el registro
//     (y "Hoy: 3 presentados · 1 listo" cuando hizo algo en el día);
//   - «Primero esto»: los que observó el registro (lo más urgente);
//   - «Para presentar»: los 3 que más esperan + "Ver los 9";
//   - «En el registro»: los 3 que hace más que presentó (los primeros en salir).
// Cada trámite es una fila corta (patente · tipo, cliente · oficina y lo importante);
// al tocarla se abre la ficha con EL botón del paso (FichaGestora).
// Los datos los pide AppGestora (useGestora) y se actualizan solos.
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HiOutlineCheckCircle, HiOutlineChevronRight, HiOutlineMagnifyingGlass } from "react-icons/hi2";

import logoThames from "../../assets/logos/logo_thames.svg";
import { useGestoria } from "./gestoriaContext";
import { useGestora } from "./gestora/gestoraContext";
import { Cargando } from "./Piezas";
import { FilaTramite, Seccion, Tarjeta, Vacio } from "./gestora/piezas";
import { TONO_TEXTO, foco, porAntiguedad, saludo, suave } from "./gestora/gestoraUtils";

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export default function MisTramites() {
  const navigate = useNavigate();
  const { catalogo, setTabGestor } = useGestoria();
  const { lista, res, error, cargar, setBusqueda } = useGestora();

  const g = useMemo(() => {
    const de = (estado) => (lista || []).filter((t) => t.estado === estado).sort(porAntiguedad);
    return { obs: de("OBSERVADO"), pre: de("ASIGNADO"), reg: de("EN_REGISTRO") };
  }, [lista]);

  // Los números y "Ver todos" llevan a «Trámites» con el filtro puesto (y sin la búsqueda de antes).
  const irATramites = (filtro) => {
    setTabGestor?.(filtro);
    setBusqueda?.("");
    navigate("/gestoria/tramites");
  };

  const cabecera = (
    <header
      className="sticky top-0 z-30 border-b border-linea dark:border-linea-dark bg-card dark:bg-card-dark"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-2 pl-4 pr-2">
        <div className="flex items-center gap-2.5">
          <img src={logoThames} alt="THAMES" className="h-[26px] w-auto" />
          <span className="text-[17px] font-extrabold text-titulo dark:text-titulo-dark">Gestoría</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setBusqueda?.("");
            navigate("/gestoria/tramites", { state: { buscar: true } });
          }}
          aria-label="Buscar un trámite"
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark ${foco}`}
        >
          <HiOutlineMagnifyingGlass className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </header>
  );

  if (!lista || !res) {
    return (
      <>
        {cabecera}
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-[18px]">
          {error ? (
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
              <Cargando alto="h-16" />
              <Cargando alto="h-20" />
              <Cargando alto="h-52" />
            </>
          )}
        </main>
      </>
    );
  }

  const nombre = saludo(res.gestor_nombre || res.perfil?.nombre);
  const pendientes = g.obs.length + g.pre.length;
  const hoy = res.hoy || {};
  const hoyTxt = [
    hoy.presentados ? plural(hoy.presentados, "presentado", "presentados") : "",
    hoy.listos ? plural(hoy.listos, "listo", "listos") : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const puedeCargar = !!catalogo?.gestor; // sin ficha de gestor no puede cargar trámites

  const numeros = [
    { n: g.obs.length, label: "Observados", tono: "ambar", filtro: "hacer" },
    { n: g.pre.length, label: "Para presentar", tono: "azul", filtro: "hacer" },
    { n: g.reg.length, label: "En el registro", tono: "violeta", filtro: "registro" },
  ];

  return (
    <>
      {cabecera}
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-4 pt-[18px]">
        {/* Hola */}
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[27px] font-extrabold leading-tight tracking-[-0.4px] text-titulo dark:text-titulo-dark">
            Hola{nombre ? `, ${nombre}` : ""}
          </h1>
          <p className={`text-[15px] ${suave}`}>
            {pendientes ? (
              <>
                Tenés <strong className="text-titulo dark:text-titulo-dark">{plural(pendientes, "trámite", "trámites")}</strong> para hacer
              </>
            ) : (
              "No tenés nada pendiente"
            )}
          </p>
        </div>

        {/* Los 3 números (se tocan) + lo que hizo hoy */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            {numeros.map((x) => (
              <button
                key={x.label}
                type="button"
                onClick={() => irATramites(x.filtro)}
                aria-label={`${x.label}: ${x.n}`}
                className={`flex min-h-[72px] flex-col items-start gap-0.5 rounded-[14px] border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-[11px] text-left hover:border-slate-300 dark:hover:border-slate-500 ${foco}`}
              >
                <span className={`text-[26px] font-extrabold leading-[1.1] ${x.n ? TONO_TEXTO[x.tono] : suave}`}>{x.n}</span>
                <span className="text-[12.5px] font-bold leading-tight text-slate-600 dark:text-slate-300">{x.label}</span>
              </button>
            ))}
          </div>
          {hoyTxt && (
            <span className={`flex items-center gap-1.5 pl-0.5 text-[13.5px] font-bold ${TONO_TEXTO.verde}`}>
              <HiOutlineCheckCircle className="h-[17px] w-[17px]" strokeWidth={2} aria-hidden="true" />
              Hoy: {hoyTxt}
            </span>
          )}
        </div>

        {/* Nada para hacer */}
        {!pendientes && (
          <Vacio
            titulo="Estás al día"
            texto={
              g.reg.length
                ? "No hay nada para presentar ni observado. Abajo, los que están en el registro."
                : "Cuando THAMES te pase un trámite, te aparece acá."
            }
          >
            {puedeCargar && (
              <Link
                to="/gestoria/nuevo"
                className={`mt-1 inline-flex min-h-[44px] items-center rounded-xl px-3 text-[15px] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff] hover:underline ${foco}`}
              >
                Cargar un trámite
              </Link>
            )}
          </Vacio>
        )}

        {/* 1 · Lo que observó el registro */}
        {g.obs.length > 0 && (
          <Seccion titulo="Primero esto" n={g.obs.length} derecha={<span className={`text-[13px] ${suave}`}>Los observó el registro</span>}>
            <Tarjeta lista>
              {g.obs.map((t) => (
                <FilaTramite key={t.id} t={t} />
              ))}
            </Tarjeta>
          </Seccion>
        )}

        {/* 2 · Para presentar (los 3 que más esperan) */}
        {g.pre.length > 0 && (
          <Seccion titulo="Para presentar" n={g.pre.length}>
            <Tarjeta lista>
              {g.pre.slice(0, 3).map((t) => (
                <FilaTramite key={t.id} t={t} />
              ))}
              {g.pre.length > 3 && <VerTodos texto={`Ver los ${g.pre.length} para presentar`} onClick={() => irATramites("hacer")} />}
            </Tarjeta>
          </Seccion>
        )}

        {/* 3 · En el registro (los que hace más que presentó: los primeros en salir) */}
        {g.reg.length > 0 && (
          <Seccion titulo="En el registro" n={g.reg.length} derecha={<span className={`text-[13px] ${suave}`}>Los que más esperan</span>}>
            <Tarjeta lista>
              {g.reg.slice(0, 3).map((t) => (
                <FilaTramite key={t.id} t={t} />
              ))}
              {g.reg.length > 3 && <VerTodos texto={`Ver los ${g.reg.length} en el registro`} onClick={() => irATramites("registro")} />}
            </Tarjeta>
          </Seccion>
        )}
      </main>
    </>
  );
}

function VerTodos({ texto, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[48px] items-center justify-center gap-1 text-[15px] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff] hover:bg-slate-50 dark:hover:bg-white/[0.03] ${foco} focus-visible:ring-inset focus-visible:ring-offset-0`}
    >
      {texto}
      <HiOutlineChevronRight className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
