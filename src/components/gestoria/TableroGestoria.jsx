// src/components/gestoria/TableroGestoria.jsx
//
// 📋 Tablero de Gestoría: quién tiene cada trámite y cómo va.
//   - Compu (pantalla ancha): 5 columnas, una por estado (tipo Trello).
//   - Celu: pestañas por estado.
//   - Filtros: gestor, "solo demorados", oficina (admin), tipo y buscador.
// Se actualiza solo (📡 en vivo) cuando otro cambia algo.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiDocumentText, HiExclamation, HiSearch } from "react-icons/hi";

import useDatosVivos from "../../hooks/useDatosVivos";
import { useGestoria } from "./gestoriaContext";
import { listarAbiertos, mensajeError, pedirResumen } from "../../services/gestoria";
import { Candado, Cargando, Punto, Tile } from "./Piezas";
import TarjetaTramite from "./TarjetaTramite";
import { ABIERTOS, DIAS_DEMORADO, ESTADOS, diasEnEstado, esDemorado, norm, plata } from "./gestoriaUtils";

// ¿Pantalla ancha (compu)? → columnas. Si no → pestañas. Se dibuja SOLO una de
// las dos (antes de esto, las tarjetas quedaban repetidas escondidas).
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

export default function TableroGestoria() {
  const { esAdmin, user, catalogo, gestores, filtros, setFiltros, tabCelu, setTabCelu } = useGestoria();
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

  useDatosVivos(["gestoria"], () => cargar());

  const ab = useMemo(() => lista || [], [lista]);
  // 📲 LISTOS a los que nadie le avisó todavía (el WhatsApp se manda a mano desde la ficha).
  const sinAvisar = useMemo(() => ab.filter((t) => t.aviso_listo_pendiente).length, [ab]);

  const filtrada = useMemo(() => {
    const q = norm(filtros.q);
    return ab
      .filter((t) => {
        if (filtros.gestor === "sin" ? t.gestor : filtros.gestor !== "todos" && String(t.gestor) !== String(filtros.gestor)) return false;
        if (filtros.oficina !== "todas" && String(t.oficina) !== String(filtros.oficina)) return false;
        if (filtros.tipo !== "todos" && t.tipo !== filtros.tipo) return false;
        if (filtros.demorados && !esDemorado(t)) return false;
        if (q && !norm(`${t.patente} ${t.persona_nombre} ${t.persona_dni || ""} ${t.numero}`).includes(q)) return false;
        return true;
      })
      .sort((a, b) => diasEnEstado(b) - diasEnEstado(a));
  }, [ab, filtros]);

  // Chips de gestores: los activos + cualquiera que tenga trámites abiertos.
  const chips = useMemo(() => {
    const vistos = new Map(gestores.map((g) => [String(g.id), g.nombre]));
    ab.forEach((t) => {
      if (t.gestor && !vistos.has(String(t.gestor))) vistos.set(String(t.gestor), t.gestor_nombre);
    });
    return [["todos", "Todos"], ...[...vistos.entries()], ["sin", "Sin gestor"]];
  }, [gestores, ab]);

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

  const avisos = esAdmin ? resumen.avisos_pago || [] : [];
  const quienes = [...new Set(avisos.map((a) => a.gestor_nombre))];
  const totalAvisos = avisos.reduce((a, x) => a + Number(x.monto || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-suave dark:text-suave-dark -mt-1">
        {esAdmin ? "Todas las oficinas." : `Los de la oficina ${miOficina}.`} Quién tiene cada uno y cómo va.
      </p>

      {avisos.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-duo-azul/40 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-4 py-3 text-[13px] text-duo-azul">
          <span className="inline-flex flex-wrap items-center gap-2">
            <HiDocumentText className="w-4 h-4" />
            <span>
              <strong>{quienes.join(" y ")}</strong> {quienes.length > 1 ? "subieron comprobantes" : "subió un comprobante"} de pago de comisiones ({plata(totalAvisos)}).
            </span>
            <Candado />
          </span>
          <button
            type="button"
            onClick={() => navigate("/gestoria/gestores")}
            className="rounded-lg border border-duo-azul/40 bg-card dark:bg-card-dark px-3 py-1.5 text-[13px] font-semibold text-duo-azul"
          >
            Revisar en Gestores
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile k="ABIERTOS" v={resumen.abiertos} n={`${resumen.sin_gestor} sin gestor asignado`} />
        <Tile
          k={<span className="inline-flex items-center gap-1"><HiExclamation className="w-3.5 h-3.5" /> DEMORADOS</span>}
          v={resumen.demorados}
          n={`${DIAS_DEMORADO} días o más sin moverse`}
          tono="rojo"
        />
        <Tile
          k="LISTOS PARA ENTREGAR"
          v={resumen.listos}
          n={
            catalogo?.whatsapp_auto
              ? "Al cliente le llega un WhatsApp"
              : sinAvisar
                ? `${sinAvisar} sin avisar al cliente`
                : "Se les avisa por WhatsApp desde la ficha"
          }
          tono="verde"
        />
        {esAdmin ? (
          <Tile
            k="COMISIONES · 30 DÍAS"
            extra={<Candado />}
            v={plata(resumen.comisiones_cobradas_30d)}
            n={
              <>
                A cobrar: {plata(resumen.comisiones_a_cobrar)}
                {resumen.sin_precio ? (
                  <b className="text-duo-amarillo-sombra dark:text-duo-amarillo"> · {resumen.sin_precio} sin precio</b>
                ) : null}
              </>
            }
          />
        ) : (
          <Tile k="ENTREGADOS · 30 DÍAS" v={resumen.entregados_30d} n={`Terminados de la oficina ${miOficina}`} />
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5" role="group" aria-label="Filtrar por gestor">
          {chips.map(([id, nombre]) => {
            const n = ab.filter((t) => (id === "todos" ? true : id === "sin" ? !t.gestor : String(t.gestor) === id)).length;
            const on = String(filtros.gestor) === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => set("gestor", id)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  on
                    ? "bg-duo-violeta text-white border-duo-violeta"
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
          <label className="inline-flex items-center gap-1.5 text-[13px] text-suave dark:text-suave-dark">
            Tipo
            <select
              value={filtros.tipo}
              onChange={(e) => set("tipo", e.target.value)}
              className="h-9 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-2 text-[13px] text-titulo dark:text-titulo-dark"
            >
              <option value="todos">Todos</option>
              {(catalogo?.tipos || []).map((tp) => (
                <option key={tp.id} value={tp.id}>{tp.corto}</option>
              ))}
            </select>
          </label>
          <label className="relative w-full sm:w-auto sm:ml-auto sm:min-w-[280px]">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark pointer-events-none" />
            <span className="sr-only">Buscar</span>
            <input
              type="search"
              value={filtros.q}
              onChange={(e) => set("q", e.target.value)}
              placeholder="Buscar patente, DNI o cliente"
              className="w-full h-9 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark pl-9 pr-3 text-[13px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-violeta"
            />
          </label>
        </div>
      </div>

      {esAncho ? (
        <Columnas lista={filtrada} abrir={(t) => navigate(`/gestoria/tramite/${t.id}`)} />
      ) : (
        <PestanasCelu lista={filtrada} tab={tabCelu} setTab={setTabCelu} abrir={(t) => navigate(`/gestoria/tramite/${t.id}`)} />
      )}
    </div>
  );
}

/** Compu: 5 columnas, una por estado (tipo Trello). */
function Columnas({ lista, abrir }) {
  return (
    <div className="grid grid-cols-5 gap-3 items-start">
      {ABIERTOS.map((e) => {
        const cards = lista.filter((t) => t.estado === e);
        return (
          <section
            key={e}
            className="flex flex-col gap-2.5 rounded-xl bg-surface dark:bg-surface-dark/60 border border-linea dark:border-linea-dark p-2.5 min-h-[180px]"
            aria-label={ESTADOS[e].n}
          >
            <header className="flex items-center gap-2 px-1">
              <Punto color={ESTADOS[e].dot} />
              <h2 className="flex-1 text-[13px] font-semibold text-titulo dark:text-titulo-dark">{ESTADOS[e].n}</h2>
              <span className="rounded-full bg-card dark:bg-card-dark border border-linea dark:border-linea-dark px-2 text-[12px] font-bold text-suave dark:text-suave-dark">
                {cards.length}
              </span>
            </header>
            {cards.length ? (
              cards.map((t) => <TarjetaTramite key={t.id} t={t} onClick={() => abrir(t)} />)
            ) : (
              <p className="px-1 py-6 text-center text-[12px] text-suave dark:text-suave-dark">Nada con este filtro</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Celu / pantalla chica: pestañas por estado. */
function PestanasCelu({ lista, tab, setTab, abrir }) {
  const cards = lista.filter((t) => t.estado === tab);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Estado">
        {ABIERTOS.map((e) => {
          const n = lista.filter((t) => t.estado === e).length;
          const on = tab === e;
          return (
            <button
              key={e}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(e)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-semibold ${
                on
                  ? "bg-titulo dark:bg-titulo-dark text-card dark:text-card-dark border-titulo dark:border-titulo-dark"
                  : "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark border-linea dark:border-linea-dark"
              }`}
            >
              <Punto color={ESTADOS[e].dot} />
              {ESTADOS[e].corto} · {n}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {cards.length ? (
          cards.map((t) => <TarjetaTramite key={t.id} t={t} onClick={() => abrir(t)} />)
        ) : (
          <p className="py-8 text-center text-[13px] text-suave dark:text-suave-dark md:col-span-2">Nada con este filtro</p>
        )}
      </div>
    </div>
  );
}
