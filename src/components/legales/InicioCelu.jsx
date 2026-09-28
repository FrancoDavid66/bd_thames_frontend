// src/components/legales/InicioCelu.jsx
//
// 📱 "Hoy" — la pantalla de inicio de la oficina (pensada para el celu):
//   - ¿Qué necesita el cliente? → "Cargar una denuncia" o "Pedir turno con el abogado".
//   - Buscar un caso por DNI o nombre.
//   - Los turnos de hoy (con el botón "Llegó").
//   - "Para hacer hoy": recordar turnos, dar turnos que faltan, casos quietos,
//     fechas para avisar… cada una con su botón (el WhatsApp ya va escrito).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiCalendar, HiCheck, HiChevronRight, HiDocumentAdd, HiSearch } from "react-icons/hi";

import useDatosVivos from "../../hooks/useDatosVivos";
import { useLegales } from "./legalesContext";
import {
  avisoWhatsapp,
  cambiarEstadoTurno,
  listarAbiertos,
  listarTurnos,
  mensajeError,
  pedirResumen,
} from "../../services/legales";
import { Cargando } from "../gestoria/Piezas";
import { BotonWa, Chip } from "./PiezasLegales";
import {
  MOTIVO_CORTO,
  coincide,
  conArticulo,
  diaCorto,
  hoyYmd,
  linkWhatsApp,
  linkWhatsAppOElegir,
  nombreCorto,
  primerNombre,
} from "./legalesUtils";

export default function InicioCelu() {
  const { user, catalogo } = useLegales();
  const navigate = useNavigate();
  const [resumen, setResumen] = useState(null);
  const [turnos, setTurnos] = useState(null);
  const [casos, setCasos] = useState(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const miOficina = catalogo?.mi_oficina || null;

  const cargar = useCallback(async () => {
    try {
      const hoy = hoyYmd();
      const [r, t, c] = await Promise.all([pedirResumen(), listarTurnos({ desde: hoy, hasta: hoy }), listarAbiertos()]);
      setResumen(r);
      setTurnos(t);
      setCasos(c);
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar. Probá de nuevo."));
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useDatosVivos(["legales"], () => cargar());

  const encontrados = useMemo(() => {
    if (!q.trim() || !casos) return [];
    return casos.filter((e) => coincide(`${e.persona_nombre} ${e.persona_dni || ""} ${e.numero}`, q)).slice(0, 6);
  }, [q, casos]);

  const llego = async (t) => {
    try {
      await cambiarEstadoTurno(t.id, "LLEGO");
      toast.success(`Anotado: llegó ${primerNombre(t.persona)}`);
      cargar();
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const anotarAviso = (tarea) => {
    const extra = tarea.tipo === "turno" ? { turno: tarea.turno } : tarea.tipo === "fecha" ? { fecha: tarea.fecha_id } : {};
    const motivo = tarea.tipo === "turno" ? "turno" : "fecha";
    avisoWhatsapp(tarea.expediente, motivo, extra)
      .then(() => {
        toast.success("Anotado en el caso");
        cargar();
      })
      .catch((e) => toast.error(mensajeError(e, "No se pudo anotar el aviso.")));
  };

  const nombre = primerNombre(user?.first_name || user?.username || "");
  const tareas = resumen?.para_hacer || [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start max-w-5xl">
      <div className="flex flex-col gap-4 min-w-0">
        <div>
          <p className="text-[15px] text-suave dark:text-suave-dark">Hola{nombre ? `, ${nombre}` : ""}</p>
          <h2 className="text-[24px] font-bold leading-tight text-titulo dark:text-titulo-dark">¿Qué necesita el cliente?</h2>
        </div>

        <button
          type="button"
          onClick={() => navigate("/legales/nuevo")}
          className="flex items-center gap-4 rounded-2xl bg-sky-700 hover:bg-sky-800 p-4 text-left text-white shadow-md"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <HiDocumentAdd className="w-6 h-6" />
          </span>
          <span className="min-w-0">
            <strong className="block text-[18px] leading-tight">Cargar una denuncia</strong>
            <span className="block text-[13px] text-white/85">El cliente te cuenta qué le pasó. Te guiamos paso a paso.</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/legales/turno")}
          className="flex items-center gap-4 rounded-2xl border-2 border-sky-700 bg-card dark:bg-card-dark p-4 text-left hover:bg-sky-50 dark:hover:bg-sky-500/10"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300">
            <HiCalendar className="w-6 h-6" />
          </span>
          <span className="min-w-0">
            <strong className="block text-[17px] leading-tight text-titulo dark:text-titulo-dark">Pedir turno con el abogado</strong>
            <span className="block text-[13px] text-suave dark:text-suave-dark">Solo quiere hablar con un abogado.</span>
          </span>
        </button>

        <div className="flex flex-col gap-2">
          <label className="relative">
            <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-suave dark:text-suave-dark pointer-events-none" />
            <span className="sr-only">Buscar un caso</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar un caso por DNI o nombre"
              className="w-full h-14 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark pl-12 pr-4 text-[16px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-sky-600"
            />
          </label>
          {q.trim() && casos && (
            <div className="flex flex-col rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark divide-y divide-linea dark:divide-linea-dark">
              {encontrados.length ? (
                encontrados.map((e) => (
                  <button key={e.id} type="button" onClick={() => navigate(`/legales/${e.id}`)} className="flex items-center gap-3 px-4 py-3 text-left">
                    <span className="flex-1 min-w-0">
                      <strong className="block text-[15px] text-titulo dark:text-titulo-dark truncate">{e.persona_nombre}</strong>
                      <span className="block text-[12px] text-suave dark:text-suave-dark truncate">
                        {e.motivo_titulo || e.tema_nombre} · {e.numero} · {e.estado_nombre}
                      </span>
                    </span>
                    <HiChevronRight className="w-5 h-5 text-suave dark:text-suave-dark" />
                  </button>
                ))
              ) : (
                <p className="px-4 py-3 text-[13px] text-suave dark:text-suave-dark">
                  No hay casos abiertos con «{q.trim()}». Si es nuevo, tocá «Cargar una denuncia».
                </p>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-[13px] font-semibold text-duo-rojo">{error}</p>}
        {turnos === null ? (
          <Cargando alto="h-40" />
        ) : (
          <TurnosDeHoy turnos={turnos} miOficina={miOficina} onLlego={llego} abrir={(t) => navigate(`/legales/${t.expediente}`)} />
        )}
      </div>

      <div className="flex flex-col gap-3 min-w-0">
        <h3 className="text-[17px] font-bold text-titulo dark:text-titulo-dark">
          Para hacer hoy{resumen ? ` · ${tareas.length}` : ""}
        </h3>
        {resumen === null ? (
          <Cargando alto="h-40" />
        ) : tareas.length ? (
          tareas.map((t, i) => (
            <Tarea
              key={`${t.tipo}-${t.expediente}-${t.turno || t.fecha_id || i}`}
              t={t}
              abrir={() => navigate(`/legales/${t.expediente}`)}
              darTurno={() => navigate(`/legales/${t.expediente}?turno=1`)}
              onAvisado={() => anotarAviso(t)}
            />
          ))
        ) : (
          <p className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 text-[14px] text-suave dark:text-suave-dark">
            <HiCheck className="inline w-4 h-4 mr-1 text-duo-verde" /> Nada pendiente por hoy. ¡Bien!
          </p>
        )}
        <button
          type="button"
          onClick={() => navigate("/legales/casos")}
          className="mt-1 flex items-center justify-between rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-4 text-[15px] font-semibold text-titulo dark:text-titulo-dark"
        >
          Ver los casos de la oficina{resumen ? ` (${resumen.abiertos})` : ""}
          <HiChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function dondeTurno(t, miOficina) {
  const ab = conArticulo(nombreCorto(t.abogado_nombre));
  if (t.modalidad === "TELEFONO") return `lo llama por teléfono ${ab}`;
  const aca = t.oficina && miOficina && Number(t.oficina) === Number(miOficina);
  return `con ${ab} · ${aca ? "acá" : `en ${t.oficina_nombre || "la oficina"}`}`;
}

function TurnosDeHoy({ turnos, miOficina, onLlego, abrir }) {
  const activos = turnos.filter((t) => t.estado !== "CANCELADO");
  return (
    <section className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 flex flex-col gap-1" aria-label="Turnos de hoy">
      <div className="flex items-center justify-between gap-2 pb-1">
        <h3 className="text-[16px] font-bold text-titulo dark:text-titulo-dark">Turnos de hoy · {activos.length}</h3>
        <span className="text-[13px] text-suave dark:text-suave-dark">{diaCorto(hoyYmd())}</span>
      </div>
      {!activos.length && <p className="py-2 text-[13px] text-suave dark:text-suave-dark">Hoy no hay turnos con los abogados.</p>}
      {activos.map((t) => (
        <div key={t.id} className="flex items-center gap-3 border-t border-linea dark:border-linea-dark py-3 first-of-type:border-t-0">
          <span className="w-12 shrink-0 text-[15px] font-bold text-sky-700 dark:text-sky-400">{t.hora}</span>
          <button type="button" onClick={() => t.puede_abrir && abrir(t)} className="flex-1 min-w-0 text-left" disabled={!t.puede_abrir}>
            <strong className="block text-[15px] text-titulo dark:text-titulo-dark truncate">
              {t.persona}
              {t.titulo ? <span className="font-normal text-suave dark:text-suave-dark"> · {MOTIVO_CORTO[t.motivo] || t.tema_nombre || t.titulo}</span> : null}
            </strong>
            <span className="block text-[12px] text-suave dark:text-suave-dark truncate">{dondeTurno(t, miOficina)}</span>
          </button>
          {t.estado === "PENDIENTE" && t.modalidad === "OFICINA" ? (
            <button
              type="button"
              onClick={() => onLlego(t)}
              className="shrink-0 min-h-[40px] rounded-lg border border-green-700/50 px-3.5 text-[14px] font-semibold text-green-800 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10"
            >
              Llegó
            </button>
          ) : t.estado === "LLEGO" ? (
            <Chip tono="verde"><HiCheck className="w-3 h-3" /> Llegó</Chip>
          ) : t.estado === "ATENDIDO" ? (
            <Chip tono="neutro">Atendido</Chip>
          ) : t.estado === "NO_VINO" ? (
            <Chip tono="rojo">No vino</Chip>
          ) : t.puede_abrir ? (
            <button type="button" onClick={() => abrir(t)} className="shrink-0 text-[14px] font-semibold text-sky-700 dark:text-sky-400 underline">
              Ver
            </button>
          ) : null}
        </div>
      ))}
    </section>
  );
}

function Tarea({ t, abrir, darTurno, onAvisado }) {
  let boton = null;
  if (t.accion === "whatsapp_turno" || t.accion === "whatsapp_fecha") {
    boton = (
      <BotonWa href={linkWhatsAppOElegir(t.telefono, t.mensaje || "")} onEnviado={onAvisado}>
        Mandarle WhatsApp
      </BotonWa>
    );
  } else if (t.accion === "whatsapp_abogado") {
    const href = linkWhatsApp(t.telefono, t.mensaje || "");
    boton = href ? (
      <BotonWa href={href} variante="borde">Escribirle al abogado</BotonWa>
    ) : (
      <button type="button" onClick={abrir} className="rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-2.5 text-[14px] font-semibold text-titulo dark:text-titulo-dark">
        Ver el caso
      </button>
    );
  } else if (t.accion === "dar_turno") {
    boton = (
      <button type="button" onClick={darTurno} className="rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-2.5 text-[14px] font-semibold text-titulo dark:text-titulo-dark">
        Darle turno
      </button>
    );
  } else {
    boton = (
      <button type="button" onClick={abrir} className="rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-2.5 text-[14px] font-semibold text-titulo dark:text-titulo-dark">
        Ver el caso
      </button>
    );
  }
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] p-4">
      <button type="button" onClick={abrir} className="text-left text-[14px] leading-snug text-amber-900 dark:text-amber-200">
        {t.texto}
      </button>
      {boton}
    </div>
  );
}
