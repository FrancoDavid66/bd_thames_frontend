// src/components/legales/MisCasos.jsx
//
// ⚖️ "MIS CASOS" — lo que ve el ABOGADO (pensado para su celu):
//   - Sus turnos de hoy (y los próximos) · "No puedo un día: bloquearlo".
//   - Las fechas vencidas que nadie marcó y las de esta semana.
//   - Lo que le falta de plata: honorarios sin cargar y lo que le debe a THAMES
//     ("Ya pagué: subir comprobante").
//   - Sus casos agrupados (nuevos, en trámite, en juicio, sentencia, cobrados)
//     con el botón de lo que sigue: "Empecé", "Presenté la demanda", "Ya se cobró"…
//   - Sus datos, con su foto (la puede cambiar él).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiCalendar, HiCamera, HiClock, HiExclamation, HiPencil, HiUpload } from "react-icons/hi";

import useDatosVivos from "../../hooks/useDatosVivos";
import ModalDuo from "../ui/ModalDuo";
import Boton3D from "../ui/Boton3D";
import { useLegales } from "./legalesContext";
import {
  avisarPago,
  bloquearDia,
  cambiarEstado,
  cambiarEstadoTurno,
  cargarHonorarios,
  desbloquearDia,
  editarAbogado,
  editarCaso,
  editarFecha,
  guardarDocumento,
  guardarNovedadEnPartes,
  listarAbiertos,
  listarBloqueos,
  listarTurnos,
  mensajeError,
  pedirCaso,
  pedirResumen,
  subirArchivo,
  subirFotoPerfil,
} from "../../services/legales";
import { Cargando } from "../gestoria/Piezas";
import { AvatarAbogado, CajaFecha, Chip, DiasChip, EstadoPill } from "./PiezasLegales";
import { ModalCambiarFecha, ModalHonorarios, ModalNovedad, inputCls } from "./ModalesCaso";
import {
  diaCorto,
  diasHasta,
  diasSinNovedad,
  esDemorado,
  hoyYmd,
  plata,
  primerNombre,
  temasTxt,
  textoDias,
  ymdMas,
} from "./legalesUtils";

const GRUPOS = [
  { id: "nuevos", n: "Nuevos para vos", estados: ["CONSULTA", "ASIGNADO"], color: "text-sky-800 dark:text-sky-300" },
  { id: "tramite", n: "En trámite", estados: ["EN_TRAMITE"], color: "text-cyan-800 dark:text-cyan-300" },
  { id: "juicio", n: "En juicio", estados: ["DEMANDA_PRESENTADA", "EN_JUZGADO"], color: "text-indigo-800 dark:text-indigo-300" },
  { id: "sentencia", n: "Sentencia", estados: ["SENTENCIA"], color: "text-amber-800 dark:text-amber-300" },
  { id: "cobrados", n: "Cobrados", estados: ["COBRADO"], color: "text-green-800 dark:text-green-300" },
];

export default function MisCasos() {
  const { catalogo } = useLegales();
  const navigate = useNavigate();
  const [resumen, setResumen] = useState(null);
  const [casos, setCasos] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("todos");
  const [modal, setModal] = useState(null); // {tipo, e?, v?}
  const [perfil, setPerfil] = useState(null);
  const yo = catalogo?.abogado;

  const cargar = useCallback(async () => {
    try {
      const hoy = hoyYmd();
      const [r, c, t, b] = await Promise.all([
        pedirResumen(),
        listarAbiertos(),
        listarTurnos({ desde: hoy, hasta: ymdMas(7), activos: 1 }),
        listarBloqueos(),
      ]);
      setResumen(r);
      setCasos(c);
      setTurnos(t);
      setBloqueos(b);
      setPerfil(r.perfil || null);
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron traer tus casos."));
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useDatosVivos(["legales"], () => cargar());

  const lista = useMemo(() => casos || [], [casos]);
  const conFecha = lista.filter((e) => e.proxima_fecha);
  const demorados = lista.filter((e) => esDemorado(e));
  const visibles = tab === "fecha" ? conFecha : tab === "demorados" ? demorados : lista;
  const hoy = hoyYmd();
  const turnosHoy = turnos.filter((t) => t.fecha === hoy);
  const proximos = turnos.filter((t) => t.fecha !== hoy).slice(0, 3);
  const semana = lista
    .filter((e) => e.proxima_fecha && !e.proxima_fecha.vencida && diasHasta(e.proxima_fecha.fecha) <= 7)
    .sort((a, b) => a.proxima_fecha.fecha.localeCompare(b.proxima_fecha.fecha));

  // ── acciones ──
  const conDetalle = async (e, tipo, extra = {}) => {
    try {
      const det = await pedirCaso(e.id);
      setModal({ tipo, e: det, ...extra });
    } catch (err) {
      toast.error(mensajeError(err, "No se pudo abrir el caso."));
    }
  };
  const pasarA = async (e, estado, texto) => {
    if (!window.confirm(`${e.persona_nombre}: ¿${texto}?`)) return;
    try {
      const nuevo = await cambiarEstado(e.id, { estado, visible: true });
      toast.success("Listo");
      if (estado === "COBRADO" && nuevo.plata?.puede_cargar && !nuevo.plata?.honorarios) setModal({ tipo: "honorarios", e: nuevo });
      cargar();
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };
  const subirPapel = async (e, file) => {
    if (!file) return;
    try {
      const arch = await subirArchivo(file, "legales/papeles");
      await guardarDocumento(e.id, { ...arch, tipo: "PAPEL" });
      toast.success(`Subido: ${arch.nombre}`);
      cargar();
    } catch (err) {
      toast.error(mensajeError(err, "No se pudo subir el archivo."));
    }
  };
  const turnoEstado = async (t, estado) => {
    try {
      await cambiarEstadoTurno(t.id, estado);
      toast.success(estado === "ATENDIDO" ? "Turno atendido" : estado === "NO_VINO" ? "Anotado: no vino" : "Turno cancelado");
      cargar();
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };
  const fechaHecha = async (v) => {
    try {
      await editarFecha(v.expediente, v.id, { cumplido: true });
      toast.success("Marcada como hecha");
      cargar();
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };
  const yaPague = async (file) => {
    if (!file) return;
    try {
      const arch = await subirArchivo(file, "legales/comprobantes");
      await avisarPago(arch);
      toast.success("¡Gracias! THAMES lo va a confirmar.");
      cargar();
    } catch (err) {
      toast.error(mensajeError(err, "No se pudo subir el comprobante."));
    }
  };
  const cambiarFoto = async (file) => {
    if (!file || !yo) return;
    try {
      const { url, public_id } = await subirFotoPerfil(file);
      await editarAbogado(yo.id, { foto_url: url, foto_public_id: public_id });
      toast.success("Foto actualizada");
      cargar();
    } catch (err) {
      toast.error(mensajeError(err, "No se pudo cambiar la foto."));
    }
  };

  if (error && !resumen) return <p className="rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft p-4 text-[14px] text-duo-rojo">{error}</p>;
  if (!resumen || !casos) {
    return (
      <div className="mx-auto max-w-2xl flex flex-col gap-3">
        <Cargando alto="h-24" />
        <Cargando alto="h-40" />
        <Cargando alto="h-64" />
      </div>
    );
  }

  const nombre = primerNombre(String(perfil?.nombre || "").replace(/^dra?\.?\s+/i, ""));
  const debe = Number(resumen.comisiones_a_cobrar || 0);
  const vencidas = resumen.vencidas_lista || [];
  const lugaresHoy = [...new Set(turnosHoy.filter((t) => t.modalidad === "OFICINA").map((t) => t.oficina_nombre))];

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-4">
      <div>
        <h1 className="text-[26px] font-bold leading-tight text-titulo dark:text-titulo-dark">Hola{nombre ? `, ${nombre}` : ""}</h1>
        <p className="text-[14px] text-suave dark:text-suave-dark">
          Tenés {lista.length} caso{lista.length === 1 ? "" : "s"}. {turnosHoy.length ? `Hoy tenés ${turnosHoy.length} turno${turnosHoy.length === 1 ? "" : "s"}.` : "Hoy no tenés turnos."}
        </p>
      </div>

      {/* Turnos */}
      <section className="flex flex-col gap-2 rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 p-4">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-sky-800 dark:text-sky-300">
          <HiClock className="w-4 h-4" /> TUS TURNOS · HOY{lugaresHoy.length === 1 ? ` EN ${lugaresHoy[0].toUpperCase()}` : ""}
        </span>
        {turnosHoy.length ? (
          turnosHoy.map((t) => <FilaTurno key={t.id} t={t} onAbrir={() => navigate(`/legales/${t.expediente}`)} onEstado={turnoEstado} />)
        ) : (
          <p className="text-[13px] text-sky-900 dark:text-sky-200">Hoy no tenés turnos.</p>
        )}
        {proximos.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-sky-200 dark:border-sky-500/30 pt-2">
            <span className="text-[12px] font-semibold text-sky-800 dark:text-sky-300">Próximos</span>
            {proximos.map((t) => (
              <button key={t.id} type="button" onClick={() => navigate(`/legales/${t.expediente}`)} className="text-left text-[13px] text-titulo dark:text-titulo-dark">
                <b>{diaCorto(t.fecha)} {t.hora}</b> · {t.persona} · {t.modalidad === "TELEFONO" ? "por teléfono" : t.oficina_nombre}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="button" onClick={() => setModal({ tipo: "bloquear" })} className="rounded-xl border border-sky-700/40 bg-card dark:bg-card-dark px-3.5 py-2 text-[13px] font-semibold text-sky-800 dark:text-sky-300">
            No puedo un día: bloquearlo
          </button>
          {bloqueos.map((b) => (
            <Chip key={b.id} tono="ambar">
              No atendés el {b.dia_txt}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await desbloquearDia(b.id);
                    toast.success("Día liberado");
                    cargar();
                  } catch (err) {
                    toast.error(mensajeError(err));
                  }
                }}
                className="ml-1 underline"
              >
                liberar
              </button>
            </Chip>
          ))}
        </div>
      </section>

      {/* Fechas vencidas */}
      {vencidas.map((v) => (
        <section key={v.id} className="flex flex-col gap-2 rounded-2xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] p-4">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-duo-rojo">
            <HiExclamation className="w-4 h-4" /> FECHA VENCIDA
          </span>
          <strong className="text-[16px] text-duo-rojo">
            {v.titulo} · {diaCorto(v.fecha)}
          </strong>
          <span className="text-[13px] text-titulo dark:text-titulo-dark">
            {v.persona} · {v.numero}
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => fechaHecha(v)} className="min-h-[44px] rounded-xl bg-duo-rojo hover:bg-duo-rojo-sombra text-[14px] font-bold text-white">
              Ya se hizo
            </button>
            <button type="button" onClick={() => setModal({ tipo: "fecha", v })} className="min-h-[44px] rounded-xl border border-duo-rojo/40 bg-card dark:bg-card-dark text-[14px] font-bold text-duo-rojo">
              Cambiar la fecha
            </button>
          </div>
        </section>
      ))}

      {/* Esta semana */}
      {semana.length > 0 && (
        <section className="flex flex-col gap-2 rounded-2xl border border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] p-4">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-amber-800 dark:text-amber-300">
            <HiCalendar className="w-4 h-4" /> ESTA SEMANA
          </span>
          {semana.map((e) => (
            <button key={e.id} type="button" onClick={() => navigate(`/legales/${e.id}`)} className="flex items-center gap-3 text-left">
              <CajaFecha ymd={e.proxima_fecha.fecha} tono="ambar" />
              <span className="min-w-0">
                <strong className="block text-[14px] text-titulo dark:text-titulo-dark">
                  {e.proxima_fecha.titulo}
                  {e.proxima_fecha.hora ? ` · ${e.proxima_fecha.hora}` : ""}
                </strong>
                <span className="block text-[12px] text-suave dark:text-suave-dark">
                  {e.persona_nombre} · {e.numero}
                </span>
              </span>
            </button>
          ))}
        </section>
      )}

      {/* Plata */}
      {(resumen.sin_honorarios > 0 || debe > 0 || (resumen.avisos_pago || []).length > 0) && (
        <section className="flex flex-col gap-2 rounded-2xl border border-duo-amarillo/40 bg-card dark:bg-card-dark p-4 text-[13px]">
          {resumen.sin_honorarios > 0 && (
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              Te falta cargar los honorarios de {resumen.sin_honorarios} caso{resumen.sin_honorarios === 1 ? "" : "s"} cobrado{resumen.sin_honorarios === 1 ? "" : "s"}.
            </p>
          )}
          {debe > 0 ? (
            <>
              <p className="text-titulo dark:text-titulo-dark">
                Comisiones con THAMES ({Number(resumen.comision_pct || 0)}%): <b>le debés {plata(debe)}</b>.
              </p>
              {(resumen.avisos_pago || []).length ? (
                <p className="text-suave dark:text-suave-dark">Mandaste un comprobante: THAMES lo tiene que confirmar.</p>
              ) : (
                <label className="self-start inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-green-700 hover:bg-green-800 px-4 py-2.5 text-[14px] font-bold text-white">
                  <HiUpload className="w-4 h-4" /> Ya pagué: subir comprobante
                  <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(ev) => { yaPague(ev.target.files?.[0]); ev.target.value = ""; }} />
                </label>
              )}
            </>
          ) : (
            <p className="text-suave dark:text-suave-dark">Comisiones con THAMES: al día.</p>
          )}
        </section>
      )}

      {/* Pestañas */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-1" role="tablist">
        {[
          ["todos", `Todos · ${lista.length}`],
          ["fecha", `Con fecha · ${conFecha.length}`],
          ["demorados", `Demorados · ${demorados.length}`],
        ].map(([id, txt]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-[40px] rounded-lg text-[13px] font-bold ${
              tab === id ? "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark shadow-sm" : id === "demorados" && demorados.length ? "text-duo-rojo" : "text-suave dark:text-suave-dark"
            }`}
          >
            {txt}
          </button>
        ))}
      </div>

      {!visibles.length && (
        <p className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5 text-center text-[14px] text-suave dark:text-suave-dark">
          {tab === "todos" ? "Todavía no tenés casos. Cuando la oficina te asigne uno, aparece acá." : "Nada por acá."}
        </p>
      )}

      {GRUPOS.map((g) => {
        const del = visibles.filter((e) => g.estados.includes(e.estado));
        if (!del.length) return null;
        return (
          <div key={g.id} className="flex flex-col gap-2.5">
            <h2 className={`text-[15px] font-bold ${g.color}`}>
              {g.n} · {del.length}
            </h2>
            {del.map((e) => (
              <CasoAbogado
                key={e.id}
                e={e}
                nuevo={g.id === "nuevos"}
                onAbrir={() => navigate(`/legales/${e.id}`)}
                onPasar={pasarA}
                onNovedad={() => conDetalle(e, "novedad")}
                onFecha={() => conDetalle(e, "novedad", { conFecha: true })}
                onHonorarios={() => conDetalle(e, "honorarios")}
                onPapel={(file) => subirPapel(e, file)}
              />
            ))}
          </div>
        );
      })}

      <button type="button" onClick={() => navigate("/legales/cerrados")} className="self-center py-2 text-[14px] font-semibold text-sky-700 dark:text-sky-400 underline">
        Ver mis casos cerrados
      </button>

      {/* Tus datos */}
      {perfil && (
        <section className="flex flex-col gap-3 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
          <h2 className="text-[15px] font-bold text-titulo dark:text-titulo-dark">Tus datos</h2>
          <div className="flex items-center gap-3">
            <AvatarAbogado id={perfil.id} nombre={perfil.nombre} foto={perfil.foto_url} size={56} />
            <span className="min-w-0">
              <strong className="block text-[16px] text-titulo dark:text-titulo-dark">{perfil.nombre}</strong>
              <span className="block text-[12px] text-suave dark:text-suave-dark">{temasTxt(perfil.especialidades, catalogo?.temas || []) || "Todos los temas"}</span>
            </span>
          </div>
          <p className="text-[13px] text-titulo dark:text-titulo-dark">
            {perfil.telefono ? `WhatsApp ${perfil.telefono}` : "Sin WhatsApp"} · {perfil.email || "sin email"}
            <br />
            {perfil.agenda_txt ? `Turnos: ${perfil.agenda_txt}` : "Sin días de turnos cargados"}
          </p>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark px-3 py-2 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
              <HiCamera className="w-4 h-4" /> {perfil.foto_url ? "Cambiar mi foto" : "Subir mi foto"}
              <input type="file" accept="image/*" className="sr-only" onChange={(ev) => { cambiarFoto(ev.target.files?.[0]); ev.target.value = ""; }} />
            </label>
            <button type="button" onClick={() => setModal({ tipo: "perfil" })} className="inline-flex items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark px-3 py-2 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
              <HiPencil className="w-4 h-4" /> Editar mis datos
            </button>
          </div>
          <p className="text-[12px] text-suave dark:text-suave-dark">Así te ve la oficina. Los días de turnos y tu % los cambia THAMES.</p>
        </section>
      )}

      <ModalNovedad
        e={modal?.tipo === "novedad" ? modal.e : null}
        abierto={modal?.tipo === "novedad"}
        conFechaInicial={!!modal?.conFecha}
        onCerrar={() => setModal(null)}
        onGuardar={async (datos, hecho = {}) => {
          const nuevo = await guardarNovedadEnPartes(modal.e, datos, hecho);
          const { estado } = datos;
          toast.success("Guardado");
          setModal(estado === "COBRADO" && nuevo.plata?.puede_cargar && !nuevo.plata?.honorarios ? { tipo: "honorarios", e: nuevo } : null);
          cargar();
        }}
      />
      <ModalHonorarios
        e={modal?.tipo === "honorarios" ? modal.e : null}
        abierto={modal?.tipo === "honorarios"}
        onCerrar={() => setModal(null)}
        onGuardar={async (body, pactado) => {
          await cargarHonorarios(modal.e.id, body);
          if (pactado !== null && pactado !== undefined) await editarCaso(modal.e.id, { honorarios_pactados: pactado });
          toast.success("Honorarios guardados");
          setModal(null);
          cargar();
        }}
      />
      <ModalCambiarFecha
        v={modal?.tipo === "fecha" ? modal.v : null}
        abierto={modal?.tipo === "fecha"}
        onCerrar={() => setModal(null)}
        onGuardar={async (body) => {
          await editarFecha(modal.v.expediente, modal.v.id, body);
          toast.success("Fecha cambiada");
          setModal(null);
          cargar();
        }}
      />
      <ModalBloquear
        abierto={modal?.tipo === "bloquear"}
        onCerrar={() => setModal(null)}
        onGuardar={async (body) => {
          await bloquearDia(body);
          toast.success("Listo: ese día no te dan turnos");
          setModal(null);
          cargar();
        }}
      />
      <ModalPerfil
        abierto={modal?.tipo === "perfil"}
        perfil={perfil}
        onCerrar={() => setModal(null)}
        onGuardar={async (body) => {
          await editarAbogado(yo.id, body);
          toast.success("Datos guardados");
          setModal(null);
          cargar();
        }}
      />
    </div>
  );
}

function FilaTurno({ t, onAbrir, onEstado }) {
  return (
    <div className="flex flex-col gap-2 border-t border-sky-200/70 dark:border-sky-500/20 pt-2 first-of-type:border-t-0 first-of-type:pt-0">
      <button type="button" onClick={onAbrir} className="flex items-start gap-3 text-left">
        <span className="w-12 shrink-0 text-[15px] font-bold text-sky-800 dark:text-sky-300">{t.hora}</span>
        <span className="min-w-0">
          <strong className="block text-[14px] text-titulo dark:text-titulo-dark">
            {t.persona} · {t.titulo}
          </strong>
          <span className="block text-[12px] text-suave dark:text-suave-dark">
            {t.modalidad === "TELEFONO" ? "Lo llamás por teléfono" : `En ${t.oficina_nombre || "la oficina"}`}
            {t.expediente_oficina_nombre ? ` · la cargó ${t.expediente_oficina_nombre}` : ""}
            {t.estado === "LLEGO" ? " · ya llegó" : ""}
          </span>
        </span>
      </button>
      {(t.estado === "PENDIENTE" || t.estado === "LLEGO") && (
        <div className="flex gap-2 pl-15">
          <button type="button" onClick={() => onEstado(t, "ATENDIDO")} className="rounded-lg border border-green-700/50 bg-card dark:bg-card-dark px-3 py-1.5 text-[13px] font-semibold text-green-800 dark:text-green-400">
            Atendido
          </button>
          {t.estado === "PENDIENTE" && (
            <button type="button" onClick={() => onEstado(t, "NO_VINO")} className="rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
              No vino
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CasoAbogado({ e, nuevo, onAbrir, onPasar, onNovedad, onFecha, onHonorarios, onPapel }) {
  const d = diasSinNovedad(e);
  const dem = esDemorado(e);
  const f = e.proxima_fecha;
  const btn = "min-h-[44px] rounded-xl px-3 text-[14px] font-bold";
  const primario = `${btn} bg-sky-700 hover:bg-sky-800 text-white`;
  const secundario = `${btn} border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark`;
  let acciones = null;
  if (e.estado === "CONSULTA" || e.estado === "ASIGNADO") {
    acciones = (
      <button type="button" onClick={() => onPasar(e, "EN_TRAMITE", "empezaste (pasa a EN TRÁMITE)")} className={`${primario} w-full`}>
        Empecé: pasar a EN TRÁMITE
      </button>
    );
  } else if (e.estado === "EN_TRAMITE") {
    acciones = (
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onNovedad} className={secundario}>Anotar novedad</button>
        <button type="button" onClick={() => onPasar(e, "DEMANDA_PRESENTADA", "presentaste la demanda")} className={`${btn} bg-violet-700 hover:bg-violet-800 text-white`}>
          Presenté la demanda
        </button>
      </div>
    );
  } else if (e.estado === "DEMANDA_PRESENTADA" || e.estado === "EN_JUZGADO") {
    acciones = (
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={onNovedad} className={primario}>Anotar novedad</button>
        <button type="button" onClick={onFecha} className={secundario}>Agregar fecha</button>
        <label className={`${secundario} inline-flex cursor-pointer items-center justify-center gap-1`}>
          <HiCamera className="w-4 h-4" /> Papel
          <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(ev) => { onPapel(ev.target.files?.[0]); ev.target.value = ""; }} />
        </label>
      </div>
    );
  } else if (e.estado === "SENTENCIA") {
    acciones = (
      <button type="button" onClick={() => onPasar(e, "COBRADO", "ya se cobró")} className={`${btn} w-full bg-green-700 hover:bg-green-800 text-white`}>
        Ya se cobró
      </button>
    );
  } else if (e.estado === "COBRADO") {
    acciones = (
      <div className="grid grid-cols-2 gap-2">
        {e.sin_honorarios ? <Chip tono="ambar" className="self-center justify-center">Faltan los honorarios</Chip> : <span />}
        {e.sin_honorarios ? (
          <button type="button" onClick={onHonorarios} className={secundario}>Cargar honorarios</button>
        ) : (
          <button type="button" onClick={() => onPasar(e, "CERRADO", "cerrás el caso")} className={secundario}>Cerrar el caso</button>
        )}
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-2.5 rounded-2xl border bg-card dark:bg-card-dark p-4 ${dem ? "border-duo-rojo/50" : "border-linea dark:border-linea-dark"}`}>
      <button type="button" onClick={onAbrir} className="flex flex-col gap-1.5 text-left">
        <span className="flex items-center justify-between gap-2">
          <Chip>{e.tema_nombre}</Chip>
          {nuevo ? (
            <span className="text-[12px] font-semibold text-green-700 dark:text-green-400">te lo asignaron {textoDias(d)}</span>
          ) : dem ? (
            <Chip tono="rojo">DEMORADO</Chip>
          ) : (
            <DiasChip dias={d} texto={textoDias(d)} />
          )}
        </span>
        <strong className="text-[16px] text-titulo dark:text-titulo-dark">{e.persona_nombre}</strong>
        <span className="text-[13px] text-suave dark:text-suave-dark">
          {e.resumen}
          {e.oficina_nombre ? ` · oficina ${e.oficina_nombre}` : ""}
        </span>
        <span className="flex flex-wrap gap-1.5">
          {!nuevo && <EstadoPill estado={e.estado} chico />}
          {e.cliente_subio_papeles && <Chip tono="azul">El cliente subió papeles</Chip>}
          {e.proximo_turno && (
            <Chip tono="azul">
              <HiClock className="w-3 h-3" /> Turno {e.proximo_turno.fecha === hoyYmd() ? "hoy" : diaCorto(e.proximo_turno.fecha)} {e.proximo_turno.hora}
            </Chip>
          )}
          {f && (
            <Chip tono={f.vencida ? "rojo" : diasHasta(f.fecha) <= 7 ? "ambar" : "neutro"}>
              <HiCalendar className="w-3 h-3" /> {f.titulo} {diaCorto(f.fecha)}
              {f.hora ? ` ${f.hora}` : ""}
            </Chip>
          )}
        </span>
      </button>
      {acciones}
    </div>
  );
}

function ModalBloquear({ abierto, onCerrar, onGuardar }) {
  const [fecha, setFecha] = useState("");
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (abierto) {
      setFecha("");
      setMotivo("");
      setError("");
    }
  }, [abierto]);
  const guardar = async () => {
    if (!fecha) return setError("Elegí el día.");
    setGuardando(true);
    setError("");
    try {
      await onGuardar({ fecha, motivo: motivo.trim() });
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
    return undefined;
  };
  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      title="No puedo un día"
      subtitle="Ese día la oficina no te va a dar turnos."
      footer={
        <>
          <Boton3D variant="blanco" onClick={onCerrar} className="w-full sm:w-auto">Volver</Boton3D>
          <Boton3D variant="azul" onClick={guardar} disabled={guardando} className="w-full sm:w-auto">{guardando ? "Guardando…" : "Bloquear el día"}</Boton3D>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && <p className="rounded-lg bg-duo-rojo-soft px-3 py-2 text-[13px] font-semibold text-duo-rojo">{error}</p>}
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-suave dark:text-suave-dark">
          Día
          <input type="date" min={hoyYmd()} value={fecha} onChange={(ev) => setFecha(ev.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-suave dark:text-suave-dark">
          Motivo (opcional)
          <input value={motivo} onChange={(ev) => setMotivo(ev.target.value)} maxLength={120} placeholder="Ej: audiencia en La Plata" className={inputCls} />
        </label>
        <p className="text-[12px] text-suave dark:text-suave-dark">Si ya tenés turnos ese día, primero cancelalos (o pedile a la oficina que los cambie).</p>
      </div>
    </ModalDuo>
  );
}

function ModalPerfil({ abierto, perfil, onCerrar, onGuardar }) {
  const [f, setF] = useState({ telefono: "", email: "", direccion: "", horario: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (abierto && perfil) {
      setF({ telefono: perfil.telefono || "", email: perfil.email || "", direccion: perfil.direccion || "", horario: perfil.horario || "" });
      setError("");
    }
  }, [abierto, perfil]);
  const set = (k) => (ev) => setF((x) => ({ ...x, [k]: ev.target.value }));
  const guardar = async () => {
    setGuardando(true);
    setError("");
    try {
      await onGuardar({ telefono: f.telefono.trim(), email: f.email.trim(), direccion: f.direccion.trim(), horario: f.horario.trim() });
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };
  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      title="Mis datos"
      subtitle="Así te ve la oficina (el cliente ve solo tu nombre y tu foto)."
      footer={
        <>
          <Boton3D variant="blanco" onClick={onCerrar} className="w-full sm:w-auto">Volver</Boton3D>
          <Boton3D variant="azul" onClick={guardar} disabled={guardando} className="w-full sm:w-auto">{guardando ? "Guardando…" : "Guardar"}</Boton3D>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && <p className="rounded-lg bg-duo-rojo-soft px-3 py-2 text-[13px] font-semibold text-duo-rojo">{error}</p>}
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-suave dark:text-suave-dark">
          WhatsApp
          <input value={f.telefono} onChange={set("telefono")} inputMode="tel" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-suave dark:text-suave-dark">
          Email
          <input value={f.email} onChange={set("email")} type="email" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-suave dark:text-suave-dark">
          Dirección de tu estudio (si tenés)
          <input value={f.direccion} onChange={set("direccion")} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-suave dark:text-suave-dark">
          Horario de tu estudio
          <input value={f.horario} onChange={set("horario")} placeholder="Ej: lunes a viernes de 9 a 13" className={inputCls} />
        </label>
      </div>
    </ModalDuo>
  );
}
