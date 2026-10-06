// src/components/legales/abogado/ListasAbogado.jsx
//
// 🏷️ «Estados y listas» (05/10): acá el estudio arma SUS listas, como en un Lex-Doctor.
//   - Estados: el camino de los casos ("Juntando papeles", "Prueba", "Esperando al perito"…).
//     Cada uno cuelga de una ETAPA, que es lo que ven la oficina y el cliente.
//   - Instancias: "1ª instancia", "Cámara"…        - Etiquetas: "Urgente", "Con perito"…
// Se pueden crear, renombrar, cambiar de color, ordenar (↑ ↓) y borrar.
// Un estado o una instancia que está en uso no se borra: primero se pasan esos casos a otro.
// La usan los abogados (pantalla completa en su app) y el admin (pestaña de Legales: embebida).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiOutlineChevronDown, HiOutlineChevronUp, HiOutlinePencilSquare, HiOutlinePlus, HiOutlineTag, HiOutlineTrash } from "react-icons/hi2";

import ModalDuo from "../../ui/ModalDuo";
import { borrarOpcion, crearOpcion, editarOpcion, mensajeError, ordenarOpciones, pedirCatalogo, pedirListas } from "../../../services/legales";
import { Cargando } from "../../gestoria/Piezas";
import { volverOIr } from "../legalesUtils";
import { useAbogado } from "./abogadoContext";
import { COLORES, colorDe, foco, inputCls, suave } from "./abogadoUtils";
import { BarraVolver, Boton, Campo, CartelError, Tarjeta } from "./piezasAbogado";

const TIPOS = [
  { id: "ESTADO", plural: "Estados", uno: "estado", creada: "estado creado", nuevo: "Nuevo estado", ej: "Ej: Esperando al perito", ayuda: "El camino que siguen tus casos. Van en el orden en que suelen pasar." },
  { id: "INSTANCIA", plural: "Instancias", uno: "instancia", creada: "instancia creada", nuevo: "Nueva instancia", ej: "Ej: Cámara Federal", ayuda: "En qué instancia está el expediente." },
  { id: "ETIQUETA", plural: "Etiquetas", uno: "etiqueta", creada: "etiqueta creada", nuevo: "Nueva etiqueta", ej: "Ej: Con perito", ayuda: "Marcas de color para encontrar rápido un caso." },
];

/** Crear o editar una opción: nombre, color y (en los estados) la etapa. */
function HojaOpcion({ tipo, opcion, etapas, abierto, onCerrar, onListo }) {
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState("gris");
  const [etapa, setEtapa] = useState("EN_TRAMITE");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirma, setConfirma] = useState(false);
  const t = TIPOS.find((x) => x.id === tipo) || TIPOS[0];
  const esEstado = tipo === "ESTADO";

  useEffect(() => {
    if (!abierto) return;
    setNombre(opcion?.nombre || "");
    setColor(opcion?.color || "");
    setEtapa(opcion?.etapa || "EN_TRAMITE");
    setError("");
    setConfirma(false);
  }, [abierto, opcion]);

  const correr = async (fn, mensaje) => {
    if (guardando) return;
    setGuardando(true);
    setError("");
    try {
      onListo(await fn(), mensaje);
    } catch (e) {
      setError(mensajeError(e));
      setConfirma(false);
    } finally {
      setGuardando(false);
    }
  };
  const guardar = () => {
    const n = nombre.trim();
    if (!n) return setError("Ponele un nombre.");
    const body = { nombre: n };
    if (color) body.color = color;
    if (esEstado) body.etapa = etapa;
    return correr(() => (opcion ? editarOpcion(opcion.id, body) : crearOpcion({ tipo, ...body })), opcion ? "Guardado" : `Listo: ${t.creada}`);
  };

  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiOutlineTag />}
      iconTono="violeta"
      title={opcion ? `Editar «${opcion.nombre}»` : t.nuevo}
      footer={
        <>
          <Boton tono="blanco" chico onClick={onCerrar} className="sm:w-auto">
            Volver
          </Boton>
          <Boton chico onClick={guardar} disabled={guardando} className="sm:w-auto">
            {guardando ? "Guardando…" : opcion ? "Guardar" : "Crear"}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <CartelError texto={error} />
        <Campo label="Nombre" htmlFor="op-nombre">
          <input id="op-nombre" value={nombre} maxLength={60} autoFocus={!opcion} onChange={(ev) => setNombre(ev.target.value)} placeholder={t.ej} className={inputCls} />
        </Campo>
        <Campo label="Color">
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Color">
            {Object.entries(COLORES).map(([k, c]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={color === k}
                aria-label={c.nombre}
                onClick={() => setColor(k)}
                className={`h-10 w-10 rounded-full ${c.punto} ${color === k ? "ring-[3px] ring-duo-violeta ring-offset-2 ring-offset-card dark:ring-offset-card-dark" : ""} ${foco}`}
              />
            ))}
          </div>
        </Campo>
        {esEstado ? (
          <Campo
            label="¿De qué etapa es?"
            htmlFor="op-etapa"
            ayuda={opcion?.en_uso ? `Hay ${opcion.en_uso} caso(s) en este estado: por eso la etapa no se puede cambiar.` : "La etapa es lo que lee el cliente en «Mi caso». La oficina ve la etapa y también el nombre de tu estado."}
          >
            <select id="op-etapa" value={etapa} disabled={!!opcion?.en_uso} onChange={(ev) => setEtapa(ev.target.value)} className={inputCls}>
              {etapas.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                  {x.cliente ? ` — el cliente ve: ${x.cliente}` : ""}
                </option>
              ))}
            </select>
          </Campo>
        ) : null}
        {opcion ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-linea dark:border-linea-dark pt-3">
            {confirma ? (
              <>
                <span className="text-[14.5px] font-semibold text-titulo dark:text-titulo-dark">¿Borrar «{opcion.nombre}»?</span>
                <button type="button" onClick={() => correr(() => borrarOpcion(opcion.id), `Se borró «${opcion.nombre}»`)} disabled={guardando} className={`min-h-[42px] rounded-lg bg-duo-rojo px-3 text-[14px] font-extrabold text-white ${foco}`}>
                  Sí, borrar
                </button>
                <button type="button" onClick={() => setConfirma(false)} className={`min-h-[42px] rounded-lg px-2 text-[14px] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff] ${foco}`}>
                  No
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirma(true)} className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-lg px-2 text-[14.5px] font-extrabold text-duo-rojo dark:text-red-400 ${foco}`}>
                <HiOutlineTrash className="h-[18px] w-[18px]" aria-hidden="true" /> Borrar {t.uno === "estado" ? "este estado" : `esta ${t.uno}`}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </ModalDuo>
  );
}

export default function ListasAbogado({ embebida = false }) {
  const ctx = useAbogado();
  const navigate = useNavigate();
  const [propias, setPropias] = useState(null); // (embebida: no hay contexto de la app del abogado)
  const [etapas, setEtapas] = useState(ctx.catalogo?.estados || []);
  const [tab, setTab] = useState("ESTADO");
  const [hoja, setHoja] = useState(null); // {opcion} o {nueva: true}
  const [error, setError] = useState("");
  const listas = embebida ? propias : ctx.listas;
  const poner = (r) => {
    const limpio = { ESTADO: r.ESTADO || [], INSTANCIA: r.INSTANCIA || [], ETIQUETA: r.ETIQUETA || [], puede_editar: r.puede_editar ?? listas?.puede_editar ?? true };
    if (embebida) setPropias(limpio);
    else ctx.setListas?.(limpio);
  };

  useEffect(() => {
    let vivo = true;
    if (embebida) {
      pedirListas()
        .then((r) => vivo && setPropias(r))
        .catch((e) => vivo && setError(mensajeError(e, "No se pudieron traer las listas.")));
    }
    if (!etapas.length) {
      pedirCatalogo()
        .then((c) => vivo && setEtapas(c?.estados || []))
        .catch(() => {});
    }
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embebida]);

  const t = TIPOS.find((x) => x.id === tab);
  const lista = listas?.[tab] || [];
  const puede = listas?.puede_editar !== false;

  const mover = async (i, d) => {
    const j = i + d;
    if (j < 0 || j >= lista.length) return;
    const ids = lista.map((o) => o.id);
    ids.splice(j, 0, ids.splice(i, 1)[0]);
    // Se ve al toque y después lo confirma el servidor.
    const antes = listas;
    poner({ ...listas, [tab]: ids.map((id) => lista.find((o) => o.id === id)) });
    try {
      poner(await ordenarOpciones(tab, ids));
    } catch (e) {
      poner(antes);
      toast.error(mensajeError(e));
    }
  };

  const cuerpo = (
    <div className={`flex flex-col gap-3.5 ${embebida ? "max-w-2xl" : "mx-auto w-full max-w-2xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3.5"}`}>
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-1" role="tablist" aria-label="Qué lista">
        {TIPOS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`min-h-[42px] rounded-lg text-[14px] font-extrabold ${tab === x.id ? "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark shadow-sm" : suave} ${foco}`}
          >
            {x.plural}
            {listas ? <span className="font-semibold"> · {(listas[x.id] || []).length}</span> : null}
          </button>
        ))}
      </div>
      <p className={`px-0.5 text-[14px] ${suave}`}>
        {t.ayuda}
        {tab === "ESTADO" ? " El cliente lee la etapa; la oficina ve la etapa y también el nombre del estado: poneles nombres que se puedan leer." : ""}
      </p>
      {error ? <p className="rounded-xl bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2 text-[14px] font-semibold text-duo-rojo dark:text-red-300">{error}</p> : null}

      {!listas ? (
        <Cargando alto="h-64" />
      ) : lista.length ? (
        <Tarjeta lista>
          {lista.map((o, i) => (
            <div key={o.id} className="flex min-h-[60px] items-center gap-2 py-1.5 pl-3.5 pr-1.5">
              <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${colorDe(o.color).punto}`} aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="break-words text-[15.5px] font-bold leading-snug text-titulo dark:text-titulo-dark">{o.nombre}</span>
                <span className={`text-[12.5px] ${suave}`}>
                  {[tab === "ESTADO" ? `Etapa: ${o.etapa_nombre}${o.terminado ? " (cierra el caso)" : ""}` : "", o.en_uso ? `${o.en_uso} caso${o.en_uso === 1 ? "" : "s"}` : "sin usar"].filter(Boolean).join(" · ")}
                </span>
              </span>
              {puede ? (
                <>
                  <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${o.nombre}`} className={`flex h-10 w-9 items-center justify-center rounded-lg text-titulo dark:text-titulo-dark disabled:opacity-25 ${foco}`}>
                    <HiOutlineChevronUp className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} aria-label={`Bajar ${o.nombre}`} className={`flex h-10 w-9 items-center justify-center rounded-lg text-titulo dark:text-titulo-dark disabled:opacity-25 ${foco}`}>
                    <HiOutlineChevronDown className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => setHoja({ opcion: o })} aria-label={`Editar ${o.nombre}`} className={`flex h-10 w-10 items-center justify-center rounded-lg text-duo-violeta-sombra dark:text-[#a5a0ff] ${foco}`}>
                    <HiOutlinePencilSquare className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>
          ))}
        </Tarjeta>
      ) : (
        <p className={`rounded-2xl border border-dashed border-linea dark:border-linea-dark p-5 text-center text-[14.5px] ${suave}`}>Todavía no hay ninguna. Creá la primera.</p>
      )}

      {puede && listas ? (
        <Boton chico icono={HiOutlinePlus} onClick={() => setHoja({ nueva: true })}>
          {t.nuevo}
        </Boton>
      ) : null}

      <HojaOpcion
        tipo={tab}
        opcion={hoja?.opcion || null}
        etapas={etapas}
        abierto={!!hoja}
        onCerrar={() => setHoja(null)}
        onListo={(r, mensaje) => {
          poner(r);
          if (mensaje) toast.success(mensaje);
          setHoja(null);
        }}
      />
    </div>
  );

  if (embebida) return cuerpo;
  return (
    <>
      <BarraVolver titulo="Estados y listas" sub="Las arma tu estudio: valen para todos los abogados" onVolver={() => volverOIr(navigate, "/legales/perfil")} />
      {cuerpo}
    </>
  );
}
