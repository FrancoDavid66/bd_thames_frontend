// src/components/legales/abogado/AgendaAbogado.jsx
//
// 🗓️ «Agenda» de la app del abogado (05/10): el mes entero con sus fechas (plazos,
// audiencias, pericias, reuniones) y los turnos con clientes.
//   - Los días INHÁBILES (sábados, domingos y feriados) van en gris.
//   - Se toca un día y abajo sale lo de ese día; «Agendar» lo carga en un caso.
//   - «No puedo un día»: lo bloquea para que la oficina no le dé turnos.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineNoSymbol, HiOutlinePlus } from "react-icons/hi2";

import useDatosVivos from "../../../hooks/useDatosVivos";
import { cambiarEstadoTurno, desbloquearDia, listarBloqueos, listarTurnos, mensajeError, pedirAgenda } from "../../../services/legales";
import { diaCorto, hoyYmd } from "../legalesUtils";
import { useAbogado } from "./abogadoContext";
import { cajaDeTono, diaCompleto, esFinde, foco, juntarAgenda, mesDe, moverMes, nombreMes, suave, tipoFecha } from "./abogadoUtils";
import { BarraTitulo, Boton, CabeceraTarjeta, FilaAgenda, Tarjeta } from "./piezasAbogado";
import { HojaBloquear, HojaElegirCaso, HojaFecha, HojaTurno } from "./hojas";

const DIAS_SEM = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const dos = (n) => String(n).padStart(2, "0");

export default function AgendaAbogado() {
  const { casos, cargar } = useAbogado();
  const navigate = useNavigate();
  const hoy = hoyYmd();
  const [clave, setClave] = useState(hoy.slice(0, 7));
  const [dia, setDia] = useState(hoy);
  const [datos, setDatos] = useState({ clave: "", fechas: [], turnos: [], feriados: [] });
  const [bloqueos, setBloqueos] = useState([]);
  const [error, setError] = useState("");
  const [hoja, setHoja] = useState(null);
  const mes = useMemo(() => mesDe(clave), [clave]);

  const traer = useCallback(async () => {
    try {
      const [a, t, b] = await Promise.all([
        pedirAgenda({ desde: mes.desde, hasta: mes.hasta }),
        listarTurnos({ desde: mes.desde, hasta: mes.hasta }),
        listarBloqueos(),
      ]);
      setDatos({ clave: mes.clave, fechas: a.fechas || [], turnos: (t || []).filter((x) => x.estado !== "CANCELADO"), feriados: a.feriados || [] });
      setBloqueos(b || []);
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudo traer la agenda."));
    }
  }, [mes]);

  useEffect(() => {
    traer();
  }, [traer]);
  useDatosVivos(["legales"], () => traer());

  const vigente = datos.clave === mes.clave;
  const feriados = useMemo(() => Object.fromEntries((vigente ? datos.feriados : []).map((f) => [f.fecha, f.nombre])), [datos, vigente]);
  const bloqueados = useMemo(() => new Set(bloqueos.map((b) => b.fecha)), [bloqueos]);
  const porDia = useMemo(() => {
    const m = {};
    if (!vigente) return m;
    juntarAgenda(datos.fechas, datos.turnos).forEach((x) => {
      (m[x.dia] = m[x.dia] || []).push(x);
    });
    return m;
  }, [datos, vigente]);
  const delDia = porDia[dia] || [];

  const cambiarMes = (n) => {
    const nueva = n === 0 ? hoy.slice(0, 7) : moverMes(clave, n);
    setClave(nueva);
    setDia(nueva === hoy.slice(0, 7) ? hoy : `${nueva}-01`);
  };
  const cerrar = () => setHoja(null);
  const alListo = (_, mensaje) => {
    setHoja(null);
    if (mensaje) toast.success(mensaje);
    traer();
    cargar?.();
  };
  const tocar = (x) => {
    if (x.clase === "turno") setHoja({ tipo: "turno", t: x.t });
    else setHoja({ tipo: "fecha", caso: { id: x.f.expediente, caratula: x.f.caratula }, fecha: x.f });
  };
  const marcarTurno = async (t, estado) => {
    try {
      await cambiarEstadoTurno(t.id, estado);
    } catch (e) {
      throw new Error(mensajeError(e));
    }
    alListo(null, estado === "ATENDIDO" ? "Turno atendido" : estado === "CANCELADO" ? "Turno cancelado" : "Anotado: no vino");
  };
  const liberar = async (b) => {
    try {
      await desbloquearDia(b.id);
      toast.success("Día liberado");
      traer();
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const celdas = [];
  for (let i = 0; i < mes.primerDia; i += 1) celdas.push(null);
  for (let d = 1; d <= mes.dias; d += 1) celdas.push(`${mes.clave}-${dos(d)}`);
  const pasado = dia < hoy;

  return (
    <>
      <BarraTitulo
        titulo="Agenda"
        derecha={
          <button type="button" onClick={() => setHoja({ tipo: "bloquear" })} className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-2 text-[13.5px] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff] ${foco}`}>
            <HiOutlineNoSymbol className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" /> No puedo un día
          </button>
        }
      />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-3.5 px-4 pb-4 pt-3.5">
        <div className="flex items-center gap-1">
          <h2 className="flex-1 text-[20px] font-extrabold text-titulo dark:text-titulo-dark" aria-live="polite">
            {nombreMes(clave)}
          </h2>
          {clave !== hoy.slice(0, 7) ? (
            <button type="button" onClick={() => cambiarMes(0)} className={`min-h-[40px] rounded-xl px-3 text-[14px] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff] ${foco}`}>
              Hoy
            </button>
          ) : null}
          <button type="button" onClick={() => cambiarMes(-1)} aria-label="Mes anterior" className={`flex h-11 w-11 items-center justify-center rounded-full text-titulo dark:text-titulo-dark hover:bg-card dark:hover:bg-card-dark ${foco}`}>
            <HiOutlineChevronLeft className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => cambiarMes(1)} aria-label="Mes siguiente" className={`flex h-11 w-11 items-center justify-center rounded-full text-titulo dark:text-titulo-dark hover:bg-card dark:hover:bg-card-dark ${foco}`}>
            <HiOutlineChevronRight className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        {error ? <p className="rounded-xl bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2 text-[14px] font-semibold text-duo-rojo dark:text-red-300">{error}</p> : null}

        <div className={`overflow-hidden rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark ${vigente ? "" : "opacity-60"}`}>
          <div className="grid grid-cols-7 border-b border-linea dark:border-linea-dark">
            {DIAS_SEM.map((d) => (
              <span key={d} className={`py-2 text-center text-[11.5px] font-extrabold uppercase tracking-wide ${suave}`}>
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {celdas.map((f, i) => {
              if (!f) return <span key={`v${i}`} className="min-h-[56px] border-b border-r border-slate-100 dark:border-slate-700/60" />;
              const items = porDia[f] || [];
              const inhabil = esFinde(f) || !!feriados[f];
              const on = f === dia;
              const esHoy = f === hoy;
              const pend = items.filter((x) => x.clase === "turno" || !x.f.cumplido);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setDia(f)}
                  aria-pressed={on}
                  aria-label={`${diaCompleto(f)}${feriados[f] ? `, feriado (${feriados[f]})` : ""}${bloqueados.has(f) ? ", no atendés" : ""}: ${items.length ? `${items.length} en la agenda` : "nada agendado"}`}
                  className={`relative flex min-h-[56px] flex-col items-center gap-1 border-b border-r border-slate-100 dark:border-slate-700/60 px-0.5 py-1.5 ${inhabil ? "bg-slate-50 dark:bg-slate-900/40" : ""} ${
                    on ? "ring-2 ring-inset ring-duo-violeta" : ""
                  } ${foco} focus-visible:ring-inset focus-visible:ring-offset-0`}
                >
                  <span
                    className={`flex h-[26px] min-w-[26px] items-center justify-center rounded-full px-1 text-[13.5px] tabular-nums ${
                      esHoy ? "bg-duo-violeta font-extrabold text-white" : inhabil ? `font-semibold ${suave}` : "font-bold text-titulo dark:text-titulo-dark"
                    }`}
                  >
                    {Number(f.slice(8))}
                  </span>
                  <span className="flex min-h-[8px] flex-wrap justify-center gap-[3px]" aria-hidden="true">
                    {pend.slice(0, 4).map((x) => (
                      <i key={x.id} className={`h-[7px] w-[7px] rounded-full ${x.clase === "turno" ? "bg-duo-azul" : x.f.vencida ? "bg-duo-rojo" : { ambar: "bg-duo-amarillo", violeta: "bg-duo-violeta", azul: "bg-sky-500", verde: "bg-duo-verde", neutro: "bg-slate-400" }[tipoFecha(x.f.tipo).tono]}`} />
                    ))}
                  </span>
                  {bloqueados.has(f) ? <HiOutlineNoSymbol className="absolute right-0.5 top-0.5 h-3.5 w-3.5 text-duo-amarillo-sombra dark:text-amber-300" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] ${suave}`}>
          <span className="inline-flex items-center gap-1.5">
            <i className="h-3 w-3 rounded bg-slate-100 dark:bg-slate-900/60 ring-1 ring-slate-200 dark:ring-slate-700" aria-hidden="true" /> Día inhábil
          </span>
          {[
            ["bg-duo-amarillo", "Plazo"],
            ["bg-duo-violeta", "Audiencia"],
            ["bg-sky-500", "Pericia"],
            ["bg-duo-verde", "Reunión"],
            ["bg-duo-azul", "Turno"],
          ].map(([c, n]) => (
            <span key={n} className="inline-flex items-center gap-1.5">
              <i className={`h-[7px] w-[7px] rounded-full ${c}`} aria-hidden="true" /> {n}
            </span>
          ))}
        </p>

        <Tarjeta>
          <CabeceraTarjeta titulo={diaCompleto(dia)} n={delDia.length || null} />
          {feriados[dia] || bloqueados.has(dia) ? (
            <div className="flex flex-wrap gap-2 px-3.5 pt-2">
              {feriados[dia] ? <span className={`rounded-md px-2 py-0.5 text-[12.5px] font-bold ${cajaDeTono("neutro")}`}>Feriado: {feriados[dia]}</span> : null}
              {bloqueados.has(dia) ? <span className={`rounded-md px-2 py-0.5 text-[12.5px] font-bold ${cajaDeTono("ambar")}`}>Ese día no atendés</span> : null}
            </div>
          ) : null}
          {delDia.length ? (
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700/70 pt-1">
              {delDia.map((x) => (
                <FilaAgenda key={x.id} item={x} onTocar={() => tocar(x)} />
              ))}
            </div>
          ) : (
            <p className={`px-3.5 pb-1 pt-2 text-[14.5px] ${suave}`}>No hay nada agendado este día.</p>
          )}
          {!pasado ? (
            <div className="p-3.5 pt-2.5">
              <Boton chico tono="blanco" icono={HiOutlinePlus} onClick={() => ((casos || []).length ? setHoja({ tipo: "elegir" }) : toast("Primero cargá un caso."))}>
                Agendar el {diaCorto(dia)}
              </Boton>
            </div>
          ) : (
            <span className="pb-2.5" />
          )}
        </Tarjeta>

        {bloqueos.length ? (
          <Tarjeta>
            <CabeceraTarjeta titulo="Días que no atendés" n={bloqueos.length} />
            <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700/70 px-3.5 pb-1.5 pt-1">
              {bloqueos.map((b) => (
                <li key={b.id} className="flex min-h-[48px] items-center gap-2">
                  <span className="flex-1 text-[14.5px] font-semibold text-titulo dark:text-titulo-dark">
                    {b.dia_txt}
                    {b.motivo ? <span className={`font-normal ${suave}`}> · {b.motivo}</span> : null}
                  </span>
                  <button type="button" onClick={() => liberar(b)} className={`min-h-[40px] rounded-lg px-2 text-[13.5px] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff] ${foco}`}>
                    Liberar
                  </button>
                </li>
              ))}
            </ul>
          </Tarjeta>
        ) : null}
      </main>

      <HojaElegirCaso abierto={hoja?.tipo === "elegir"} casos={casos || []} titulo="¿En qué caso lo agendás?" onCerrar={cerrar} onElegir={(e) => setHoja({ tipo: "fecha", caso: e, inicial: { fecha: dia } })} />
      <HojaFecha
        abierto={hoja?.tipo === "fecha"}
        caso={hoja?.tipo === "fecha" ? hoja.caso : null}
        fecha={hoja?.tipo === "fecha" ? hoja.fecha || null : null}
        inicial={hoja?.tipo === "fecha" ? hoja.inicial || null : null}
        onCerrar={cerrar}
        onListo={alListo}
        onVerCaso={() => {
          const id = hoja.caso.id;
          setHoja(null);
          navigate(`/legales/${id}`);
        }}
      />
      <HojaTurno
        abierto={hoja?.tipo === "turno"}
        t={hoja?.tipo === "turno" ? hoja.t : null}
        onCerrar={cerrar}
        onEstado={marcarTurno}
        onVerCaso={() => {
          const id = hoja.t.expediente;
          setHoja(null);
          navigate(`/legales/${id}`);
        }}
      />
      <HojaBloquear abierto={hoja?.tipo === "bloquear"} onCerrar={cerrar} onListo={() => alListo(null, "Listo: ese día no te dan turnos")} />
    </>
  );
}
