// src/components/legales/ParaDerivar.jsx
//
// 🚗 PARA DERIVAR (Franco 26/11/2026) — al lado de «Para llamar», SOLO para el admin.
//   Las consultas de «Gestoría del auto» que cargaron las oficinas (y los trámites que
//   venían de la Gestoría vieja) y que todavía no se derivaron a una gestoría.
//   La más vieja primero. Cada una: qué necesita, papeles que faltan, WhatsApp/llamar
//   al cliente y «Derivar» (elegís la gestoría → WhatsApp listo). Si no hay, no se ve.
//
//   Ej: Juan Pérez · Transferir el auto (08) · Km 39 → Derivar → Gestoría López → listo.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiChevronDown, HiChevronRight, HiPhone, HiTruck } from "react-icons/hi";

import useDatosVivos from "../../hooks/useDatosVivos";
import { useLegales } from "./legalesContext";
import { pedirParaDerivar } from "../../services/legales";
import { BotonWa, Chip } from "./PiezasLegales";
import { ModalDerivar } from "./DerivarGestoria";
import { linkWhatsAppOElegir, primerNombre } from "./legalesUtils";

const MAX_VISIBLES = 4;

function haceCuanto(iso) {
  if (!iso) return "";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return min < 1 ? "recién" : `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  return dias === 1 ? "ayer" : `hace ${dias} días`;
}

function Consulta({ c, onAbrir, onDerivar }) {
  const necesita = c.respuestas?.find((r) => /necesita/i.test(r.pregunta))?.respuesta || "Gestoría del auto";
  const otras = (c.respuestas || []).filter((r) => !/necesita/i.test(r.pregunta));
  const marca = /malvinas/i.test(c.oficina_nombre || "") ? "Malvinas" : "Estudio Thames";
  const mensaje = `Hola ${primerNombre(c.persona_nombre)}, le escribimos de ${marca} por su consulta de gestoría (${necesita.toLowerCase()}). ¿Tiene un minuto para hablar?`;
  const tel = String(c.persona_telefono || "").replace(/[^\d+]/g, "");

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3.5">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onAbrir} className="min-w-0 text-left">
          <strong className="block truncate text-[16px] text-titulo dark:text-titulo-dark">{c.persona_nombre || "Sin nombre"}</strong>
          <span className="block text-[13px] text-suave dark:text-suave-dark">
            <b className="text-titulo dark:text-titulo-dark">{necesita}</b> · {haceCuanto(c.creado_en)}
            {c.oficina_nombre ? ` · ${c.oficina_nombre}` : ""}
          </span>
        </button>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {c.urgente && <Chip tono="rojo">URGENTE</Chip>}
          {c.patente && <Chip tono="neutro">{c.patente}</Chip>}
          {c.de_tramite ? <Chip tono="ambar">Venía de Gestoría</Chip> : <Chip tono={c.es_cliente ? "verde" : "violeta"}>{c.es_cliente ? "Cliente" : "No es cliente"}</Chip>}
        </div>
      </div>

      {(otras.length > 0 || c.relato || c.papeles_faltan?.length > 0) && (
        <div className="flex flex-col gap-1 rounded-xl bg-surface dark:bg-surface-dark px-3 py-2 text-[13px]">
          {otras.map((r) => (
            <span key={r.pregunta} className="text-suave dark:text-suave-dark">
              {r.pregunta} <b className="text-titulo dark:text-titulo-dark">{r.respuesta}</b>
            </span>
          ))}
          {c.papeles_faltan?.length > 0 && (
            <span className="text-suave dark:text-suave-dark">
              Faltan: <b className="text-titulo dark:text-titulo-dark">{c.papeles_faltan.join(", ")}</b>
            </span>
          )}
          {c.relato && <span className="line-clamp-2 italic text-titulo dark:text-titulo-dark">“{c.relato}”</span>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDerivar}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-sky-700 px-3 text-[13px] font-bold text-white hover:bg-sky-800"
        >
          <HiTruck className="h-4 w-4" /> Derivar
        </button>
        <BotonWa href={linkWhatsAppOElegir(c.persona_telefono, mensaje)} size="sm" variante="borde">
          WhatsApp
        </BotonWa>
        {tel && (
          <a
            href={`tel:${tel}`}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark px-3 text-[13px] font-semibold text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
          >
            <HiPhone className="h-4 w-4" /> {c.persona_telefono}
          </a>
        )}
        <button
          type="button"
          onClick={onAbrir}
          className="ml-auto inline-flex min-h-[36px] items-center gap-1 px-1 text-[13px] font-semibold text-sky-800 dark:text-sky-300"
        >
          Ver <HiChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function ParaDerivar() {
  const { esAdmin } = useLegales();
  const navigate = useNavigate();
  const [lista, setLista] = useState([]);
  const [todas, setTodas] = useState(false);
  const [derivando, setDerivando] = useState(null); // la consulta del modal

  const cargar = useCallback(async () => {
    if (!esAdmin) return;
    try {
      const r = await pedirParaDerivar();
      setLista(Array.isArray(r) ? r : []);
    } catch {
      /* se reintenta con el próximo refresco */
    }
  }, [esAdmin]);

  useEffect(() => {
    cargar();
  }, [cargar]);
  useDatosVivos(["legales"], () => cargar());

  if (!esAdmin || (lista.length === 0 && !derivando)) return null;
  const visibles = todas ? lista : lista.slice(0, MAX_VISIBLES);

  return (
    <section className="mb-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[17px] font-bold text-titulo dark:text-titulo-dark">
          <HiTruck className="h-5 w-5 text-sky-700 dark:text-sky-400" /> Para derivar · gestoría · {lista.length}
        </h2>
        <span className="hidden text-[13px] text-suave sm:block dark:text-suave-dark">Elegís la gestoría y se arma el WhatsApp</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {visibles.map((c) => (
          <Consulta
            key={c.id}
            c={c}
            onAbrir={() => navigate(`/legales/${c.id}`)}
            onDerivar={() => setDerivando({ id: c.id, persona_nombre: c.persona_nombre, gestoria: null })}
          />
        ))}
      </div>
      {lista.length > MAX_VISIBLES && (
        <button
          type="button"
          onClick={() => setTodas((t) => !t)}
          className="inline-flex items-center gap-1 self-start text-[14px] font-semibold text-sky-800 dark:text-sky-300"
        >
          <HiChevronDown className={`h-4 w-4 transition-transform ${todas ? "rotate-180" : ""}`} />
          {todas ? "Ver menos" : `Ver las ${lista.length}`}
        </button>
      )}
      <ModalDerivar
        caso={derivando}
        abierto={!!derivando}
        onCerrar={() => {
          setDerivando(null);
          cargar();
        }}
        onDerivado={() => {}}
      />
    </section>
  );
}
