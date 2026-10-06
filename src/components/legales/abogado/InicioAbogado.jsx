// src/components/legales/abogado/InicioAbogado.jsx
//
// 🏠 «Inicio» de la app del abogado (05/10, estilo billetera):
//   - arriba, en violeta: "Buen día, Martín" y PARA HOY · 4 cosas (+ lo vencido sin marcar);
//   - 4 botones grandes: Caso nuevo · Anotar · Agendar · Plazos;
//   - «Vencido y sin marcar» y «Lo que viene» (los próximos 7 días, con sus turnos),
//     como los movimientos de una cuenta: se toca uno y se marca hecho o se cambia;
//   - «Para ponerte al día»: honorarios sin cargar, lo que le debe a THAMES, casos quietos;
//   - «Tus casos», por estado.
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  HiOutlineBanknotes,
  HiOutlineCalculator,
  HiOutlineCalendarDays,
  HiOutlineChevronRight,
  HiOutlineExclamationTriangle,
  HiOutlineFolderPlus,
  HiOutlinePause,
  HiOutlinePencilSquare,
} from "react-icons/hi2";

import { cambiarEstadoTurno, mensajeError } from "../../../services/legales";
import { Cargando } from "../../gestoria/Piezas";
import { AvatarAbogado } from "../PiezasLegales";
import { hoyYmd, plata } from "../legalesUtils";
import { useAbogado } from "./abogadoContext";
import { diaCompleto, esQuieto, estadoDe, foco, juntarAgenda, linkCls, saludoHora, sinTitulo, suave } from "./abogadoUtils";
import { CabeceraTarjeta, Etiqueta, FilaAgenda, IconoRedondo, Tarjeta, Vacio } from "./piezasAbogado";
import { HojaAnotar, HojaElegirCaso, HojaFecha, HojaPlazos, HojaTurno } from "./hojas";

function Accion({ icono, children, onClick }) {
  const Icono = icono;
  return (
    <button type="button" onClick={onClick} className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-1.5 text-center text-[12.5px] font-bold leading-tight text-titulo dark:text-titulo-dark ${foco}`}>
      <span className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta-sombra dark:text-[#a5a0ff] transition-transform active:scale-95" aria-hidden="true">
        <Icono className="h-6 w-6" strokeWidth={1.9} />
      </span>
      {children}
    </button>
  );
}

function Renglon({ icono, tono, titulo, sub, to }) {
  return (
    <Link to={to} className={`flex min-h-[60px] items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] ${foco} focus-visible:ring-inset focus-visible:ring-offset-0`}>
      <IconoRedondo icono={icono} tono={tono} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-bold text-titulo dark:text-titulo-dark">{titulo}</span>
        {sub ? <span className={`text-[13px] ${suave}`}>{sub}</span> : null}
      </span>
      <HiOutlineChevronRight className="h-[18px] w-[18px] shrink-0 text-slate-400" aria-hidden="true" />
    </Link>
  );
}

export default function InicioAbogado() {
  const { catalogo, yo, casos, res, agenda, turnos, error, cargar, abrirCasoNuevo, setFiltro } = useAbogado();
  const navigate = useNavigate();
  // {tipo: "elegir", para} · {tipo: "anotar", e} · {tipo: "fecha", caso, fecha?, inicial?} · {tipo: "plazos"} · {tipo: "turno", t}
  const [hoja, setHoja] = useState(null);

  const hoy = hoyYmd();
  const vencidas = agenda?.vencidas || [];
  const pendientes = useMemo(() => (agenda?.fechas || []).filter((f) => !f.cumplido), [agenda]);
  const viene = useMemo(() => juntarAgenda(pendientes, turnos), [pendientes, turnos]);
  const deHoy = viene.filter((x) => x.dia === hoy);
  const despues = viene.filter((x) => x.dia > hoy);

  if (error && !casos) {
    return <p className="m-4 rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] p-4 text-[14.5px] font-semibold text-duo-rojo dark:text-red-300">{error}</p>;
  }

  const nombre = sinTitulo(res?.perfil?.nombre || yo?.nombre || "");
  const listo = !!casos && !!agenda;
  const quietos = (casos || []).filter(esQuieto);
  const debe = Number(res?.comisiones_a_cobrar || 0);
  const sinHonorarios = res?.sin_honorarios || 0;
  const porEstado = [];
  (casos || []).forEach((e) => {
    const o = estadoDe(e);
    const fila = porEstado.find((x) => x.o.nombre === o.nombre);
    if (fila) fila.n += 1;
    else porEstado.push({ o, n: 1 });
  });

  const tocar = (item) => {
    if (item.clase === "turno") return setHoja({ tipo: "turno", t: item.t });
    return setHoja({ tipo: "fecha", caso: { id: item.f.expediente, caratula: item.f.caratula }, fecha: item.f });
  };
  const cerrar = () => setHoja(null);
  const alListo = (_, mensaje) => {
    setHoja(null);
    if (mensaje) toast.success(mensaje);
    cargar();
  };
  const marcarTurno = async (t, estado) => {
    try {
      await cambiarEstadoTurno(t.id, estado);
      toast.success(estado === "ATENDIDO" ? "Turno atendido" : estado === "CANCELADO" ? "Turno cancelado" : "Anotado: no vino");
      setHoja(null);
      cargar();
    } catch (e) {
      throw new Error(mensajeError(e));
    }
  };
  const elegirPara = (para, extra = {}) => {
    if (!(casos || []).length) return toast("Primero cargá un caso (o esperá a que la oficina te pase uno).");
    return setHoja({ tipo: "elegir", para, ...extra });
  };

  const cuantas = deHoy.length;
  return (
    <>
      <header className="bg-duo-violeta text-white" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-14 pt-4">
          <Link to="/legales/perfil" className={`flex items-center gap-3 self-start rounded-xl pr-2 ${foco} focus-visible:ring-white focus-visible:ring-offset-duo-violeta`} aria-label="Mi perfil">
            <span className="rounded-full ring-2 ring-white/40">
              <AvatarAbogado id={yo?.id} nombre={res?.perfil?.nombre || yo?.nombre || ""} foto={res?.perfil?.foto_url || yo?.foto_url} size={40} />
            </span>
            <span className="flex flex-col">
              <span className="text-[13px] text-white/85">{saludoHora()}</span>
              <span className="text-[17px] font-extrabold leading-tight">{nombre || "Legales"}</span>
            </span>
          </Link>
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-white/85">Para hoy · {diaCompleto(hoy).toLowerCase()}</span>
            <strong className="text-[34px] font-extrabold leading-none tracking-[-0.5px]">
              {!listo ? "…" : cuantas === 0 ? "Nada agendado" : `${cuantas} ${cuantas === 1 ? "cosa" : "cosas"}`}
            </strong>
            {vencidas.length ? (
              <span className="mt-1.5 inline-flex items-center gap-1.5 self-start rounded-full bg-white/20 px-3 py-1 text-[13px] font-bold">
                <HiOutlineExclamationTriangle className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                {vencidas.length === 1 ? "1 vencida sin marcar" : `${vencidas.length} vencidas sin marcar`}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-9 flex w-full max-w-2xl flex-col gap-4 px-4 pb-4">
        <div className="grid grid-cols-4 gap-1 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-2 py-3 shadow-[0_6px_18px_rgba(15,23,42,0.08)]">
          <Accion icono={HiOutlineFolderPlus} onClick={abrirCasoNuevo}>
            Caso nuevo
          </Accion>
          <Accion icono={HiOutlinePencilSquare} onClick={() => elegirPara("anotar")}>
            Anotar
          </Accion>
          <Accion icono={HiOutlineCalendarDays} onClick={() => elegirPara("fecha")}>
            Agendar
          </Accion>
          <Accion icono={HiOutlineCalculator} onClick={() => setHoja({ tipo: "plazos" })}>
            Plazos
          </Accion>
        </div>

        {error ? <p className="rounded-xl bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-3 py-2 text-[13.5px] font-semibold text-duo-amarillo-sombra dark:text-amber-300">{error}</p> : null}

        {!listo ? (
          <>
            <Cargando alto="h-40" />
            <Cargando alto="h-56" />
          </>
        ) : (
          <>
            {vencidas.length ? (
              <Tarjeta className="!border-duo-rojo/40">
                <CabeceraTarjeta titulo={<span className="text-duo-rojo dark:text-red-400">Vencido y sin marcar</span>} n={vencidas.length} />
                <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700/70 pt-1">
                  {vencidas.map((f) => (
                    <FilaAgenda key={f.id} item={{ clase: "fecha", f }} onTocar={() => tocar({ clase: "fecha", f })} />
                  ))}
                </div>
              </Tarjeta>
            ) : null}

            <Tarjeta>
              <CabeceraTarjeta titulo="Lo que viene">
                <Link to="/legales/agenda" className={linkCls}>
                  Ver la agenda
                </Link>
              </CabeceraTarjeta>
              {viene.length ? (
                <div className="flex flex-col pt-1">
                  {deHoy.length ? <p className={`px-3.5 pt-2 text-[12px] font-extrabold uppercase tracking-wide ${suave}`}>Hoy</p> : null}
                  <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700/70">
                    {deHoy.map((x) => (
                      <FilaAgenda key={x.id} item={x} onTocar={() => tocar(x)} />
                    ))}
                  </div>
                  {despues.length ? <p className={`px-3.5 pt-3 text-[12px] font-extrabold uppercase tracking-wide ${suave}`}>Próximos 7 días</p> : null}
                  <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700/70">
                    {despues.map((x) => (
                      <FilaAgenda key={x.id} item={x} onTocar={() => tocar(x)} />
                    ))}
                  </div>
                </div>
              ) : (
                <p className={`px-3.5 pb-4 pt-2 text-[14.5px] ${suave}`}>No tenés fechas ni turnos en los próximos 7 días.</p>
              )}
            </Tarjeta>

            {sinHonorarios > 0 || debe > 0 || quietos.length > 0 ? (
              <Tarjeta lista>
                <CabeceraTarjeta titulo="Para ponerte al día" />
                {sinHonorarios > 0 ? (
                  <Renglon icono={HiOutlineBanknotes} tono="ambar" to="/legales/plata" titulo={sinHonorarios === 1 ? "Falta cargar los honorarios de 1 caso" : `Falta cargar los honorarios de ${sinHonorarios} casos`} sub="Ya se cobraron: cargá cuánto fue." />
                ) : null}
                {debe > 0 ? <Renglon icono={HiOutlineBanknotes} tono="violeta" to="/legales/plata" titulo={`Comisión de THAMES: ${plata(debe)}`} sub={(res?.avisos_pago || []).length ? "Mandaste el comprobante: falta que lo confirmen." : "Cuando pagues, subí el comprobante."} /> : null}
                {quietos.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFiltro({ estado: "", instancia: "", etiqueta: "", ver: "quietos" });
                      navigate("/legales/casos");
                    }}
                    className={`flex min-h-[60px] w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] ${foco} focus-visible:ring-inset focus-visible:ring-offset-0`}
                  >
                    <IconoRedondo icono={HiOutlinePause} tono="neutro" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] font-bold text-titulo dark:text-titulo-dark">{quietos.length === 1 ? "1 caso quieto" : `${quietos.length} casos quietos`}</span>
                      <span className={`text-[13px] ${suave}`}>Más de 30 días sin novedades y sin nada agendado.</span>
                    </span>
                    <HiOutlineChevronRight className="h-[18px] w-[18px] shrink-0 text-slate-400" aria-hidden="true" />
                  </button>
                ) : null}
              </Tarjeta>
            ) : null}

            {casos.length ? (
              <Tarjeta>
                <CabeceraTarjeta titulo="Tus casos" n={casos.length}>
                  <Link to="/legales/casos" className={linkCls}>
                    Ver todos
                  </Link>
                </CabeceraTarjeta>
                <div className="flex flex-wrap gap-2 px-3.5 pb-3.5 pt-2.5">
                  {porEstado.map(({ o, n }) => (
                    <button
                      key={o.nombre}
                      type="button"
                      onClick={() => {
                        setFiltro({ estado: o.id ? String(o.id) : "", instancia: "", etiqueta: "", ver: "todos" });
                        navigate("/legales/casos");
                      }}
                      className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-linea dark:border-linea-dark px-2.5 ${foco}`}
                      aria-label={`${o.nombre}: ${n} ${n === 1 ? "caso" : "casos"}`}
                    >
                      <Etiqueta o={o} punto />
                      <span className="text-[14px] font-extrabold tabular-nums text-titulo dark:text-titulo-dark">{n}</span>
                    </button>
                  ))}
                </div>
              </Tarjeta>
            ) : (
              <Vacio icono={HiOutlineFolderPlus} tono="violeta" titulo="Todavía no tenés casos" texto="Cuando una oficina te derive uno, aparece acá. También podés cargar los tuyos con el botón «Nuevo»." />
            )}
          </>
        )}
      </main>

      <HojaElegirCaso
        abierto={hoja?.tipo === "elegir"}
        casos={casos || []}
        titulo={hoja?.para === "anotar" ? "¿En qué caso anotás?" : "¿En qué caso lo agendás?"}
        onCerrar={cerrar}
        onElegir={(e) => setHoja(hoja.para === "anotar" ? { tipo: "anotar", e } : { tipo: "fecha", caso: e, inicial: hoja.plazo ? { plazo: hoja.plazo } : null })}
      />
      <HojaAnotar abierto={hoja?.tipo === "anotar"} e={hoja?.tipo === "anotar" ? hoja.e : null} tipos={catalogo?.tipos_movimiento || []} onCerrar={cerrar} onListo={alListo} />
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
      <HojaPlazos abierto={hoja?.tipo === "plazos"} onCerrar={cerrar} onAgendar={(plazo) => elegirPara("fecha", { plazo })} />
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
    </>
  );
}
