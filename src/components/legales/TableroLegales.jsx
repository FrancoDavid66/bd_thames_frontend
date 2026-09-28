// src/components/legales/TableroLegales.jsx
//
// 📋 Tablero de Legales: qué abogado tiene cada caso y cómo va.
//   - Compu (pantalla ancha): 5 columnas (Consulta · Con el abogado · En
//     juicio · Sentencia · Cobrado), tipo Trello.
//   - Celu: pestañas con las mismas 5.
//   - Arriba: la fecha vencida que nadie marcó, los números y los filtros
//     (abogado, "solo demorados", tema, oficina para el admin y buscador).
// Se actualiza solo (📡 en vivo) cuando otro cambia algo.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiDocumentText, HiExclamation, HiSearch } from "react-icons/hi";

import useDatosVivos from "../../hooks/useDatosVivos";
import { useLegales } from "./legalesContext";
import { listarAbiertos, mensajeError, pedirResumen } from "../../services/legales";
import { Candado, Cargando, Punto, Tile } from "../gestoria/Piezas";
import TarjetaCaso from "./TarjetaCaso";
import { DIAS_DEMORADO, FASES, coincide, diaCorto, diasSinNovedad, esDemorado, plata } from "./legalesUtils";

// ¿Pantalla ancha (compu)? → columnas. Si no → pestañas (se dibuja SOLO una).
const ANCHO_COLUMNAS = "(min-width: 1280px)";
function useEsAncho() {
  const [ancho, setAncho] = useState(() => typeof window !== "undefined" && window.matchMedia(ANCHO_COLUMNAS).matches);
  useEffect(() => {
    const mq = window.matchMedia(ANCHO_COLUMNAS);
    const cambio = () => setAncho(mq.matches);
    mq.addEventListener("change", cambio);
    return () => mq.removeEventListener("change", cambio);
  }, []);
  return ancho;
}

export default function TableroLegales() {
  const { esAdmin, user, catalogo, abogados, filtros, setFiltros, tabCelu, setTabCelu } = useLegales();
  const navigate = useNavigate();
  const esAncho = useEsAncho();
  const [lista, setLista] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const [l, r] = await Promise.all([listarAbiertos(), pedirResumen()]);
      setLista(l);
      setResumen(r);
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar el tablero."));
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useDatosVivos(["legales"], () => cargar());

  const ab = useMemo(() => lista || [], [lista]);

  const filtrada = useMemo(() => {
    return ab
      .filter((e) => {
        if (filtros.abogado === "sin" ? e.abogado : filtros.abogado !== "todos" && String(e.abogado) !== String(filtros.abogado)) return false;
        if (filtros.oficina !== "todas" && String(e.oficina) !== String(filtros.oficina)) return false;
        if (filtros.tema !== "todos" && e.tema !== filtros.tema) return false;
        if (filtros.demorados && !esDemorado(e)) return false;
        if (filtros.q && !coincide(`${e.persona_nombre} ${e.persona_dni || ""} ${e.numero}`, filtros.q)) return false;
        return true;
      })
      .sort((a, b) => diasSinNovedad(b) - diasSinNovedad(a));
  }, [ab, filtros]);

  // Chips de abogados: los activos + cualquiera que tenga casos abiertos.
  const chips = useMemo(() => {
    const vistos = new Map((abogados || []).filter((a) => a.activo !== false).map((a) => [String(a.id), a.nombre]));
    ab.forEach((e) => {
      if (e.abogado && !vistos.has(String(e.abogado))) vistos.set(String(e.abogado), e.abogado_nombre);
    });
    return [["todos", "Todos"], ...[...vistos.entries()], ["sin", "Sin abogado"]];
  }, [abogados, ab]);

  const set = (k, v) => setFiltros((f) => ({ ...f, [k]: v }));
  const miOficina = user?.perfil?.oficina_nombre || "";

  if (error && !lista) {
    return <p className="rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] p-4 text-[14px] text-duo-rojo">{error}</p>;
  }
  if (!lista || !resumen) {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Cargando key={i} alto="h-24" />)}
        </div>
        <Cargando alto="h-64" />
      </div>
    );
  }

  const vencida = (resumen.vencidas_lista || [])[0];
  const masVencidas = Math.max(0, (resumen.vencidas || 0) - 1);
  const avisos = esAdmin ? resumen.avisos_pago || [] : [];
  const quienes = [...new Set(avisos.map((a) => a.abogado_nombre))];
  const totalAvisos = avisos.reduce((a, x) => a + Number(x.monto || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-suave dark:text-suave-dark -mt-1">
        {esAdmin ? "Todas las oficinas." : `Los de la oficina ${miOficina}.`} Qué abogado tiene cada caso y cómo va.
      </p>

      {vencida && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-4 py-3 text-[13px] text-duo-rojo">
          <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <HiExclamation className="w-4 h-4 shrink-0" />
            <b>{vencida.titulo} vencida el {diaCorto(vencida.fecha).split(" ")[1]}</b>
            <span className="text-titulo dark:text-titulo-dark">
              · {vencida.persona || "—"} · {vencida.numero}
              {vencida.abogado_nombre ? ` · ${vencida.abogado_nombre}` : ""}. Nadie la marcó como hecha.
              {masVencidas ? ` (y ${masVencidas} más)` : ""}
            </span>
          </span>
          <button
            type="button"
            onClick={() => navigate(`/legales/${vencida.expediente}`)}
            className="rounded-lg border border-duo-rojo/40 bg-card dark:bg-card-dark px-3 py-1.5 text-[13px] font-semibold text-duo-rojo"
          >
            Ver el caso
          </button>
        </div>
      )}

      {avisos.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/10 px-4 py-3 text-[13px] text-sky-900 dark:text-sky-200">
          <span className="inline-flex flex-wrap items-center gap-2">
            <HiDocumentText className="w-4 h-4" />
            <span>
              <strong>{quienes.join(" y ")}</strong> {quienes.length > 1 ? "subieron comprobantes" : "subió un comprobante"} de pago de comisiones ({plata(totalAvisos)}).
            </span>
            <Candado />
          </span>
          <button
            type="button"
            onClick={() => navigate("/legales/abogados")}
            className="rounded-lg border border-sky-300 dark:border-sky-500/40 bg-card dark:bg-card-dark px-3 py-1.5 text-[13px] font-semibold text-sky-800 dark:text-sky-300"
          >
            Revisar en Abogados
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile k="ABIERTOS" v={resumen.abiertos} n={`${resumen.sin_abogado} sin abogado asignado`} />
        <Tile
          k={<span className="inline-flex items-center gap-1"><HiExclamation className="w-3.5 h-3.5" /> DEMORADOS</span>}
          v={resumen.demorados}
          n={`${DIAS_DEMORADO} días o más sin novedades del estudio`}
          tono="rojo"
        />
        <Tile
          k="PRÓXIMOS 7 DÍAS"
          v={resumen.proximos_7}
          n={
            <>
              audiencias y plazos
              {resumen.vencidas ? <b className="text-duo-rojo"> · {resumen.vencidas} vencida{resumen.vencidas > 1 ? "s" : ""} sin marcar</b> : null}
            </>
          }
          tono="ambar"
        />
        {esAdmin ? (
          <Tile
            k="COMISIONES · 30 DÍAS"
            extra={<Candado />}
            v={plata(resumen.comisiones_cobradas_30d)}
            n={
              <>
                A cobrar: {plata(resumen.comisiones_a_cobrar)}
                {resumen.sin_honorarios ? (
                  <b className="text-duo-amarillo-sombra dark:text-duo-amarillo"> · {resumen.sin_honorarios} cobrado{resumen.sin_honorarios > 1 ? "s" : ""} sin honorarios</b>
                ) : null}
              </>
            }
          />
        ) : (
          <Tile
            k="TURNOS DE HOY"
            v={resumen.turnos_hoy}
            n={resumen.cliente_subio ? `${resumen.cliente_subio} cliente(s) subieron papeles` : "Con los abogados"}
            tono="verde"
          />
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5" role="group" aria-label="Filtrar por abogado">
          {chips.map(([id, nombre]) => {
            const n = ab.filter((e) => (id === "todos" ? true : id === "sin" ? !e.abogado : String(e.abogado) === id)).length;
            const on = String(filtros.abogado) === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => set("abogado", id)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  on
                    ? "bg-sky-700 text-white border-sky-700"
                    : "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark border-linea dark:border-linea-dark hover:bg-surface dark:hover:bg-surface-dark"
                }`}
              >
                {nombre}
                <span className={`rounded-full px-1.5 text-[11px] font-bold ${on ? "bg-white/25" : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark"}`}>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="inline-flex items-center gap-2 text-[13px] text-titulo dark:text-titulo-dark cursor-pointer">
            <input
              type="checkbox"
              checked={filtros.demorados}
              onChange={(e) => set("demorados", e.target.checked)}
              className="w-4 h-4 accent-[var(--color-duo-rojo)]"
            />
            Solo demorados
          </label>
          <label className="inline-flex items-center gap-1.5 text-[13px] text-suave dark:text-suave-dark">
            Tema
            <select
              value={filtros.tema}
              onChange={(e) => set("tema", e.target.value)}
              className="h-9 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-2 text-[13px] text-titulo dark:text-titulo-dark"
            >
              <option value="todos">Todos</option>
              {(catalogo?.temas || []).map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </label>
          {esAdmin && (
            <label className="inline-flex items-center gap-1.5 text-[13px] text-suave dark:text-suave-dark">
              Oficina
              <select
                value={filtros.oficina}
                onChange={(e) => set("oficina", e.target.value)}
                className="h-9 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-2 text-[13px] text-titulo dark:text-titulo-dark"
              >
                <option value="todas">Todas</option>
                {(catalogo?.oficinas || []).map((o) => (
                  <option key={o.id} value={o.id}>{o.nombre}</option>
                ))}
              </select>
            </label>
          )}
          <label className="relative w-full sm:w-auto sm:ml-auto sm:min-w-[280px]">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark pointer-events-none" />
            <span className="sr-only">Buscar</span>
            <input
              type="search"
              value={filtros.q}
              onChange={(e) => set("q", e.target.value)}
              placeholder="Buscar nombre, DNI o N° de caso"
              className="w-full h-9 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark pl-9 pr-3 text-[13px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-sky-600"
            />
          </label>
        </div>
      </div>

      {esAncho ? (
        <Columnas lista={filtrada} abrir={(e) => navigate(`/legales/${e.id}`)} />
      ) : (
        <PestanasCelu lista={filtrada} tab={tabCelu} setTab={setTabCelu} abrir={(e) => navigate(`/legales/${e.id}`)} />
      )}
    </div>
  );
}

/** Compu: 5 columnas (tipo Trello). */
function Columnas({ lista, abrir }) {
  return (
    <div className="grid grid-cols-5 gap-3 items-start">
      {FASES.map((f) => {
        const cards = lista.filter((e) => f.estados.includes(e.estado));
        return (
          <section
            key={f.id}
            className="flex flex-col gap-2.5 rounded-xl bg-surface dark:bg-surface-dark/60 border border-linea dark:border-linea-dark p-2.5 min-h-[180px]"
            aria-label={f.n}
          >
            <header className="flex items-start gap-2 px-1">
              <Punto color={f.dot} className="mt-1.5" />
              <span className="flex-1 min-w-0">
                <h2 className="text-[13px] font-semibold text-titulo dark:text-titulo-dark">{f.n}</h2>
                <p className="text-[11px] text-suave dark:text-suave-dark">{f.sub}</p>
              </span>
              <span className="rounded-full bg-card dark:bg-card-dark border border-linea dark:border-linea-dark px-2 text-[12px] font-bold text-suave dark:text-suave-dark">
                {cards.length}
              </span>
            </header>
            {cards.length ? (
              cards.map((e) => <TarjetaCaso key={e.id} e={e} onClick={() => abrir(e)} />)
            ) : (
              <p className="px-1 py-6 text-center text-[12px] text-suave dark:text-suave-dark">Nada con este filtro</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Celu / pantalla chica: pestañas con las 5 columnas. */
function PestanasCelu({ lista, tab, setTab, abrir }) {
  const fase = FASES.find((f) => f.id === tab) || FASES[0];
  const cards = lista.filter((e) => fase.estados.includes(e.estado));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide" role="tablist" aria-label="En qué etapa está">
        {FASES.map((f) => {
          const n = lista.filter((e) => f.estados.includes(e.estado)).length;
          const on = fase.id === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(f.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-semibold ${
                on
                  ? "bg-titulo dark:bg-titulo-dark text-card dark:text-card-dark border-titulo dark:border-titulo-dark"
                  : "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark border-linea dark:border-linea-dark"
              }`}
            >
              <Punto color={f.dot} />
              {f.n} · {n}
            </button>
          );
        })}
      </div>
      <p className="text-[12px] text-suave dark:text-suave-dark -mt-1">{fase.sub}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {cards.length ? (
          cards.map((e) => <TarjetaCaso key={e.id} e={e} onClick={() => abrir(e)} />)
        ) : (
          <p className="py-8 text-center text-[13px] text-suave dark:text-suave-dark md:col-span-2">Nada con este filtro</p>
        )}
      </div>
    </div>
  );
}
