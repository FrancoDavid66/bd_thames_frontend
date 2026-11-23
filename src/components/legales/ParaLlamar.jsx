// src/components/legales/ParaLlamar.jsx
//
// 📞 PARA LLAMAR (Franco 23/11/2026) — arriba del Tablero y de «Turnos de hoy».
//   Las «Consultas rápidas» que cargaron los chicos y que todavía nadie contactó:
//   urgentes primero, después la más vieja. Cada una con WhatsApp (ya escrito),
//   Llamar y «Ya lo contacté» (con una nota si querés). Si no hay ninguna, no se ve.
//
//   Ej: Sofi carga a Juan Pérez · ART · urgente · a la tarde → acá aparece arriba
//       de todo → lo llamás → «Ya lo contacté: viene el jueves» → sale de la lista
//       y queda anotado en el caso.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiChevronRight, HiPhone } from "react-icons/hi";

import useDatosVivos from "../../hooks/useDatosVivos";
import { useLegales } from "./legalesContext";
import { marcarContactado, mensajeError, pedirParaLlamar } from "../../services/legales";
import { BotonWa, Chip } from "./PiezasLegales";
import { linkWhatsAppOElegir, motivoDe, preguntasDe, primerNombre, respuestaTxt } from "./legalesUtils";

const HORARIO_TXT = { MANIANA: "A la mañana", TARDE: "A la tarde" };

function haceCuanto(iso) {
  if (!iso) return "";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  return dias === 1 ? "ayer" : `hace ${dias} días`;
}

function Consulta({ c, catalogo, onAbrir, onListo }) {
  const [nota, setNota] = useState("");
  const [abierta, setAbierta] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const boton = (catalogo?.consulta_rapida || []).find((b) => b.motivo === c.motivo);
  const motivo = motivoDe(catalogo, c.motivo);
  const tema = boton?.titulo || motivo?.titulo || "consulta";
  const respuestas = preguntasDe(motivo, c.respuestas)
    .map((p) => ({ p, v: respuestaTxt(p, c.respuestas?.[p.key]) }))
    .filter((x) => x.v);
  const marca = /malvinas/i.test(c.oficina_nombre || "") ? "Malvinas" : "Estudio Thames";
  const nombre = primerNombre(c.persona_nombre);
  const mensaje = `Hola ${nombre}! Te escribo de ${marca} por la consulta que hiciste en la oficina (${tema.toLowerCase()}). ¿Cuándo podemos hablar?`;
  const tel = String(c.persona_telefono || "").replace(/[^\d+]/g, "");

  const listo = async () => {
    setGuardando(true);
    try {
      await marcarContactado(c.id, { nota: nota.trim() });
      toast.success(`Listo: ${nombre || "contactado"} salió de «Para llamar»`);
      onListo();
    } catch (e) {
      toast.error(mensajeError(e, "No se pudo marcar."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className={`flex flex-col gap-2.5 rounded-2xl border bg-card dark:bg-card-dark p-3.5 ${
        c.urgente ? "border-duo-rojo/50 border-l-4 border-l-duo-rojo" : "border-linea dark:border-linea-dark"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onAbrir} className="min-w-0 text-left">
          <strong className="block truncate text-[16px] text-titulo dark:text-titulo-dark">{c.persona_nombre}</strong>
          <span className="block text-[13px] text-suave dark:text-suave-dark">
            <b className="text-titulo dark:text-titulo-dark">{tema}</b> · {haceCuanto(c.creado_en)}
            {c.oficina_nombre ? ` · ${c.oficina_nombre}` : ""}
            {c.cargado_por ? ` · cargó ${primerNombre(c.cargado_por)}` : ""}
          </span>
        </button>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {c.urgente && <Chip tono="rojo">URGENTE</Chip>}
          {HORARIO_TXT[c.horario] && <Chip tono="azul">{HORARIO_TXT[c.horario]}</Chip>}
          <Chip tono={c.es_cliente ? "verde" : "violeta"}>{c.es_cliente ? "Cliente" : "No es cliente"}</Chip>
        </div>
      </div>

      {(respuestas.length > 0 || c.relato) && (
        <div className="flex flex-col gap-1 rounded-xl bg-surface dark:bg-surface-dark px-3 py-2 text-[13px]">
          {respuestas.map(({ p, v }) => (
            <span key={p.key} className="text-suave dark:text-suave-dark">
              {p.texto} <b className="text-titulo dark:text-titulo-dark">{v}</b>
            </span>
          ))}
          {c.relato && <span className="italic text-titulo dark:text-titulo-dark whitespace-pre-line">“{c.relato}”</span>}
        </div>
      )}

      {abierta ? (
        <div className="flex flex-col gap-2">
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={500}
            autoFocus
            placeholder="¿Qué hablaste? (opcional) Ej: viene el jueves con el DNI"
            className="h-11 w-full rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 text-[14px] text-titulo dark:text-titulo-dark outline-none focus:border-sky-600"
            onKeyDown={(e) => e.key === "Enter" && listo()}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAbierta(false)}
              className="flex-1 min-h-[42px] rounded-lg border border-linea dark:border-linea-dark text-[14px] font-semibold text-titulo dark:text-titulo-dark"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={listo}
              disabled={guardando}
              className="flex-1 min-h-[42px] rounded-lg bg-sky-700 hover:bg-sky-800 text-[14px] font-bold text-white disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Listo, contactado"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <BotonWa href={linkWhatsAppOElegir(c.persona_telefono, mensaje)} size="sm">
            WhatsApp
          </BotonWa>
          {tel && (
            <a
              href={`tel:${tel}`}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark px-3 text-[13px] font-semibold text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
            >
              <HiPhone className="w-4 h-4" /> {c.persona_telefono}
            </a>
          )}
          <button
            type="button"
            onClick={() => setAbierta(true)}
            className="inline-flex min-h-[36px] items-center rounded-lg bg-sky-700 hover:bg-sky-800 px-3 text-[13px] font-bold text-white"
          >
            Ya lo contacté
          </button>
          <button
            type="button"
            onClick={onAbrir}
            className="ml-auto inline-flex min-h-[36px] items-center gap-1 px-1 text-[13px] font-semibold text-sky-800 dark:text-sky-300"
          >
            Ver caso <HiChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function ParaLlamar() {
  const { catalogo, esStaff } = useLegales();
  const navigate = useNavigate();
  const [lista, setLista] = useState([]);

  const cargar = useCallback(async () => {
    if (!esStaff) return;
    try {
      const r = await pedirParaLlamar();
      setLista(Array.isArray(r) ? r : []);
    } catch {
      /* se reintenta con el próximo refresco */
    }
  }, [esStaff]);

  useEffect(() => {
    cargar();
  }, [cargar]);
  useDatosVivos(["legales"], () => cargar());

  if (!esStaff || lista.length === 0) return null;
  const urgentes = lista.filter((c) => c.urgente).length;

  return (
    <section className="mb-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[17px] font-bold text-titulo dark:text-titulo-dark">
          <HiPhone className="w-5 h-5 text-sky-700 dark:text-sky-400" /> Para llamar · {lista.length}
          {urgentes > 0 && <Chip tono="rojo">{urgentes} urgente{urgentes === 1 ? "" : "s"}</Chip>}
        </h2>
        <span className="hidden sm:block text-[13px] text-suave dark:text-suave-dark">Consultas que cargaron las oficinas</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {lista.map((c) => (
          <Consulta key={c.id} c={c} catalogo={catalogo} onAbrir={() => navigate(`/legales/${c.id}`)} onListo={cargar} />
        ))}
      </div>
    </section>
  );
}
