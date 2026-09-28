// src/components/legales/PedirTurno.jsx
//
// 📅 PEDIR TURNO CON EL ABOGADO — para cuando el cliente solo quiere hablar
// con un abogado (lo demás se carga después). Una sola pantalla con 3 pasos:
//   1. ¿Quién es? (DNI) — si ya vino por algo, "¿Es por eso o por otra cosa?"
//   2. ¿Con quién? (el abogado sugerido, o el que ya lleva su caso)
//   3. ¿Cuándo? (en la oficina o que lo llame, con los horarios libres)
// Al dar el turno se abre el WhatsApp con el mensaje escrito.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiCheck } from "react-icons/hi";

import { useLegales } from "./legalesContext";
import { avisoWhatsapp, crearCaso, darTurno, esOcupado, mensajeError } from "../../services/legales";
import MarcoPasos, { BotonGrande } from "./MarcoPasos";
import BuscarPersona from "./BuscarPersona";
import { PERSONA_VACIA, nombrePersona, personaLista, telefonoPersona } from "./persona";
import ElegirAbogado from "./ElegirAbogado";
import ElegirHorario from "./ElegirHorario";
import { BotonWa } from "./PiezasLegales";
import { MOTIVO_CORTO, abogadoSugerido, linkWhatsAppOElegir, motivoDe, textoConLink, textoTurnoElegido, volverOIr } from "./legalesUtils";

function Seccion({ n, titulo, children }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
      <h2 className="flex items-center gap-2.5 text-[17px] font-bold text-titulo dark:text-titulo-dark">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-700 text-[14px] font-bold text-white">{n}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export default function PedirTurno() {
  const { catalogo, abogados, esAdmin, recargarAbogados } = useLegales();
  const navigate = useNavigate();
  const [persona, setPersona] = useState(PERSONA_VACIA);
  const [casoElegido, setCasoElegido] = useState(undefined); // undefined = sin elegir · null = "otra cosa" · {caso}
  const [motivo, setMotivo] = useState("");
  const [abogadoId, setAbogadoId] = useState(null);
  const [turno, setTurno] = useState(null);
  const [oficina, setOficina] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [listo, setListo] = useState(null); // { caso, turno }

  const casos = useMemo(() => {
    if (!persona.buscado) return [];
    if (persona.cliente) return persona.cliente.casos || [];
    // Si no es cliente, solo cuentan los casos con el MISMO DNI: buscar "Vega"
    // trae a cualquier Vega, y darle el turno en el caso de otro sería un lío.
    const dni = soloDigitos(persona.dni);
    if (dni.length < 6) return [];
    return (persona.casosSinCliente || []).filter((k) => soloDigitos(k.persona_dni) === dni);
  }, [persona]);

  const personaOk = personaLista(persona);
  const porCasoViejo = casoElegido && casoElegido.id;
  const mot = motivoDe(catalogo, motivo);
  // El caso que ya existe puede tener abogado: el turno va con él.
  const abogadoDelCaso = porCasoViejo ? casoElegido.abogado || null : null;
  // El tema para sugerir: el del caso que ya tiene (si es por eso) o el de lo que eligió ahora.
  const temaTurno = porCasoViejo ? casoElegido.tema || "" : mot?.tema || "";
  const sugerido = abogadoSugerido(abogados || [], temaTurno);
  const abId = abogadoDelCaso || abogadoId || sugerido?.id || null;
  const abogado = (abogados || []).find((a) => a.id === abId) || null;
  const miOficina = esAdmin ? oficina || persona.cliente?.oficina || null : catalogo?.mi_oficina || null;

  const quienListo = personaOk && (casos.length === 0 || casoElegido !== undefined) && (porCasoViejo || !!motivo);
  const faltaOficina = esAdmin && !porCasoViejo && !(oficina || persona.cliente?.oficina);

  const cambiarPersona = (p) => {
    setPersona(p);
    setCasoElegido(undefined);
    setTurno(null);
  };

  const dar = async () => {
    if (!abogado || !turno) return;
    setGuardando(true);
    try {
      let caso;
      let t;
      if (porCasoViejo) {
        const r = await darTurno({ expediente: casoElegido.id, abogado: abogado.id, inicio: turno.inicio, modalidad: turno.modalidad });
        caso = r.expediente;
        t = r.turno;
      } else {
        const c = persona.cliente;
        const body = {
          cliente: c ? c.cliente : null,
          persona_nombre: c ? "" : persona.nombre.trim(),
          persona_apellido: c ? "" : persona.apellido.trim(),
          persona_dni: c ? "" : String(persona.dni || "").trim(),
          persona_telefono: c && persona.telOk !== false ? "" : telefonoPersona(persona),
          motivo,
          respuestas: {},
          relato: "",
          abogado: abogado.id,
          turno: { inicio: turno.inicio, modalidad: turno.modalidad },
        };
        if (esAdmin) body.oficina = oficina || c?.oficina || null;
        caso = await crearCaso(body);
        t = caso.proximo_turno;
      }
      setListo({ caso, turno: t });
      recargarAbogados?.();
    } catch (e) {
      if (esOcupado(e)) {
        toast.error("Ese horario se acaba de ocupar. Elegí otro.");
        setTurno(null);
        setRecarga((x) => x + 1);
      } else {
        toast.error(mensajeError(e));
      }
    } finally {
      setGuardando(false);
    }
  };

  if (listo) {
    return <TurnoDado listo={listo} miOficina={miOficina} onVer={() => navigate(`/legales/${listo.caso.id}`)} onInicio={() => navigate("/legales")} />;
  }

  return (
    <MarcoPasos
      titulo="Pedir turno"
      onAtras={() => volverOIr(navigate)}
      onCerrar={() => navigate("/legales")}
      pie={
        <div className="flex w-full flex-col gap-2">
          <BotonGrande tono="verde" onClick={dar} disabled={!quienListo || !abogado || !turno || guardando || faltaOficina} className="w-full">
            <HiCheck className="w-5 h-5" /> {guardando ? "Guardando…" : "Dar el turno"}
          </BotonGrande>
          <p className="text-center text-[12px] text-suave dark:text-suave-dark">Después se abre el WhatsApp con el mensaje del turno.</p>
        </div>
      }
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-[24px] font-bold leading-tight text-titulo dark:text-titulo-dark">Pedir turno con el abogado</h2>
        <p className="text-[15px] leading-snug text-suave dark:text-suave-dark">
          Para cuando el cliente solo quiere hablar con un abogado. Lo demás se carga después.
        </p>
      </div>

      <Seccion n={1} titulo="¿Quién es?">
        <BuscarPersona valor={persona} onChange={cambiarPersona} mostrarCasos={false} />
        {personaOk && casos.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="rounded-xl bg-green-50 dark:bg-green-500/10 px-3.5 py-2.5 text-[14px] text-green-900 dark:text-green-200">
              {casos.length === 1 ? (
                <>
                  Ya vino antes: <b>«{casos[0].titulo}»</b> ({casos[0].estado_nombre.toLowerCase()}) · {casos[0].numero}
                  {casos[0].persona_nombre ? ` · ${casos[0].persona_nombre}` : ""}.
                </>
              ) : (
                <>Ya tiene {casos.length} casos abiertos.</>
              )}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {casos.map((k) => {
                const on = casoElegido?.id === k.id;
                return (
                  <OpcionRadio key={k.id} on={on} onClick={() => { setCasoElegido(k); setTurno(null); }}>
                    {casos.length === 1 ? "Es por eso" : `Por ${k.titulo.toLowerCase()}`}
                  </OpcionRadio>
                );
              })}
              <OpcionRadio on={casoElegido === null} onClick={() => { setCasoElegido(null); setTurno(null); }}>
                Es por otra cosa
              </OpcionRadio>
            </div>
          </div>
        )}
        {personaOk && (casos.length === 0 || casoElegido === null) && (
          <div className="flex flex-col gap-2">
            <span className="text-[15px] font-bold text-titulo dark:text-titulo-dark">¿Por qué quiere hablar?</span>
            <div className="grid grid-cols-2 gap-2">
              {(catalogo?.motivos || []).map((m) => (
                <OpcionRadio key={m.id} on={motivo === m.id} onClick={() => { setMotivo(m.id); setAbogadoId(null); setTurno(null); }}>
                  {MOTIVO_CORTO[m.id] || m.titulo}
                </OpcionRadio>
              ))}
            </div>
          </div>
        )}
        {esAdmin && personaOk && !porCasoViejo && (
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-titulo dark:text-titulo-dark">
            ¿De qué oficina es?
            <select
              value={oficina || persona.cliente?.oficina || ""}
              onChange={(e) => setOficina(e.target.value ? Number(e.target.value) : null)}
              className="h-12 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 text-[16px] text-titulo dark:text-titulo-dark"
            >
              <option value="">Elegí la oficina…</option>
              {(catalogo?.oficinas || []).map((o) => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          </label>
        )}
      </Seccion>

      {quienListo && (
        <Seccion n={2} titulo="¿Con quién?">
          {abogadoDelCaso ? (
            <>
              <ElegirAbogado abogados={(abogados || []).filter((a) => a.id === abogadoDelCaso)} temas={catalogo?.temas || []} value={abogadoDelCaso} />
              <p className="text-[12px] text-suave dark:text-suave-dark">Es el abogado que ya lleva su caso.</p>
            </>
          ) : (
            <ElegirAbogado
              abogados={abogados || []}
              temas={catalogo?.temas || []}
              tema={temaTurno}
              value={abId}
              onChange={(id) => { setAbogadoId(id); setTurno(null); }}
            />
          )}
        </Seccion>
      )}

      {quienListo && abogado && (
        <Seccion n={3} titulo="¿Cuándo?">
          <ElegirHorario
            key={`${abogado.id}-${recarga}`}
            abogado={abogado}
            value={turno}
            onChange={(t) => {
              setTurno(t);
              // El abogado sugerido queda FIJO al elegir el horario (si se
              // refresca la lista de abogados, no cambia por otro).
              if (t && !abogadoDelCaso) setAbogadoId(abogado.id);
            }}
            miOficina={miOficina}
          />
        </Seccion>
      )}
      {quienListo && !abogado && casoElegido && casoElegido.abogado && (
        <p className="text-[13px] text-suave dark:text-suave-dark">El abogado de ese caso ya no está activo: pedile al admin que le asigne otro.</p>
      )}
      {persona.buscado && nombrePersona(persona) && !quienListo && personaOk && (
        <p className="text-center text-[13px] text-suave dark:text-suave-dark">Elegí por qué quiere hablar y seguís.</p>
      )}
    </MarcoPasos>
  );
}

function soloDigitos(x) {
  return String(x || "").replace(/\D/g, "");
}

function OpcionRadio({ on, onClick, children }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl border px-3 min-h-[52px] text-left text-[15px] font-bold transition-colors ${
        on ? "border-2 border-sky-700 bg-sky-50 dark:bg-sky-500/10 text-titulo dark:text-titulo-dark" : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark"
      }`}
    >
      <span className={`h-5 w-5 shrink-0 rounded-full border-2 ${on ? "border-sky-700 bg-sky-700 ring-2 ring-inset ring-white dark:ring-slate-900" : "border-slate-400"}`} />
      <span className="min-w-0">{children}</span>
    </button>
  );
}

function TurnoDado({ listo, miOficina, onVer, onInicio }) {
  const { caso, turno } = listo;
  const mensaje = textoConLink(caso.whatsapp_textos?.turno || caso.whatsapp_textos?.link || "", caso);
  const [avisado, setAvisado] = useState(false);
  const anotar = () => {
    avisoWhatsapp(caso.id, turno ? "turno" : "link", turno ? { turno: turno.id } : {})
      .then(() => setAvisado(true))
      .catch((e) => toast.error(mensajeError(e, "No se pudo anotar el aviso.")));
  };
  return (
    <div className="mx-auto w-full max-w-lg flex flex-col gap-4 py-2">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-green-600 text-white ring-8 ring-green-600/15">
          <HiCheck className="w-10 h-10" />
        </span>
        <h2 className="text-[26px] font-bold text-titulo dark:text-titulo-dark">¡Turno dado!</h2>
        {turno && (
          <p className="text-[15px] text-titulo dark:text-titulo-dark">{textoTurnoElegido(turno, turno.abogado_nombre, miOficina)}</p>
        )}
        <p className="text-[13px] text-suave dark:text-suave-dark">
          {caso.numero} · {caso.persona_nombre}
        </p>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-green-700/70 bg-card dark:bg-card-dark p-4">
        <strong className="text-[17px] text-titulo dark:text-titulo-dark">Mandale el turno por WhatsApp</strong>
        <p className="whitespace-pre-line [overflow-wrap:anywhere] rounded-xl bg-green-50 dark:bg-green-500/10 px-3.5 py-3 text-[14px] leading-relaxed text-titulo dark:text-titulo-dark">
          {mensaje}
        </p>
        <BotonWa href={linkWhatsAppOElegir(caso.persona_telefono, mensaje)} onEnviado={anotar} size="lg" full>
          {avisado ? "Mandado ✓ (mandar de nuevo)" : "Mandar por WhatsApp"}
        </BotonWa>
        <p className="text-center text-[12px] text-suave dark:text-suave-dark">Se abre con el mensaje escrito. Queda anotado en el caso.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <BotonGrande tono="blanco" onClick={onVer}>
          Ver el caso
        </BotonGrande>
        <BotonGrande tono="blanco" onClick={onInicio}>
          Volver al inicio
        </BotonGrande>
      </div>
    </div>
  );
}
