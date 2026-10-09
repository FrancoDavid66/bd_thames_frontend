// src/components/legales/TableroLegales.jsx
//
// 📋 Tablero de Legales: qué abogado tiene cada caso y cómo va.
//
// 🆕 09/10: TABLA (estilo Linear / Stripe) en vez de las tarjetas tipo Trello.
//   - Pestañas por etapa con su número: Todos · Consulta · Con el abogado ·
//     En juicio · Sentencia · Cobrado (la elegida queda al volver de un caso).
//   - Barra: buscador, abogado, tema, oficina (admin), "Solo demorados" y Limpiar.
//   - Cada fila es un caso: tocás en cualquier lado y entrás a la ficha
//     (Ctrl o la rueda del mouse = en otra pestaña). Los títulos ordenan.
//   - Raya roja a la izquierda = demorado (30 días sin novedades) o con una
//     fecha vencida que nadie marcó.
//   - Celu: la misma lista en renglones compactos (sin tarjetas).
//   - Arriba sigue: la fecha vencida que nadie marcó y los números.
// "Faltan los honorarios" / "Comisión a cobrar" solo le llegan al admin.
// Se actualiza solo (📡 en vivo) cuando otro cambia algo.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiCalendar, HiClock, HiDocumentText, HiExclamation } from "react-icons/hi";

import useDatosVivos from "../../hooks/useDatosVivos";
import { useLegales } from "./legalesContext";
import { listarAbiertos, mensajeError, pedirResumen } from "../../services/legales";
import { Candado, Cargando, Punto, Tile } from "../gestoria/Piezas";
import { AvatarAbogado, DiasChip, EstadoPill } from "./PiezasLegales";
import { Etiqueta } from "./abogado/piezasAbogado";
import TablaDuo, {
  BarraTabla,
  BuscadorTabla,
  FranjaPestanas,
  LimpiarTabla,
  MarcaTabla,
  PestanasTabla,
  SelectTabla,
  ToggleTabla,
} from "../ui/TablaDuo";
import {
  ABIERTOS,
  DIAS_DEMORADO,
  FASES,
  colorOficina,
  coincide,
  diaCorto,
  diasHasta,
  diasSinNovedad,
  esDemorado,
  hhmm,
  hoyYmd,
  plata,
  textoDias,
} from "./legalesUtils";

const TODOS = "TODOS";

function textoTurno(t) {
  if (!t) return "";
  const hoy = t.fecha === hoyYmd();
  return `${t.modalidad === "TELEFONO" ? "Llamada" : "Turno"} ${hoy ? "hoy" : diaCorto(t.fecha)} ${t.hora || hhmm(t.inicio)}`;
}

function textoFecha(f) {
  if (!f) return "";
  if (f.vencida) return `${f.titulo} venció ${diaCorto(f.fecha).split(" ")[1]}`;
  const d = diasHasta(f.fecha);
  const cuando = d === 0 ? "hoy" : d === 1 ? "mañana" : diaCorto(f.fecha);
  return `${f.titulo} ${cuando}${f.hora ? ` ${f.hora}` : ""}${d > 1 && d <= 7 ? ` · en ${d} días` : ""}`;
}

/** Lo que viene: el turno, "Falta darle turno" y/o la fecha (audiencia, plazo…). */
function marcasProximo(e) {
  const t = e.proximo_turno;
  const f = e.proxima_fecha;
  const fechaCerca = f && (f.vencida || diasHasta(f.fecha) <= 7);
  const salida = [];
  if (t) {
    salida.push(
      <MarcaTabla key="turno" tono="azul" icono={HiCalendar}>
        {textoTurno(t)}
      </MarcaTabla>
    );
  }
  if (e.falta_turno) {
    salida.push(
      <MarcaTabla key="falta" tono="ambar" icono={HiCalendar}>
        Falta darle turno
      </MarcaTabla>
    );
  }
  if (f && (fechaCerca || !t)) {
    salida.push(
      <MarcaTabla key="fecha" tono={f.vencida ? "rojo" : fechaCerca ? "ambar" : "neutro"} icono={f.vencida ? HiExclamation : HiClock} title={textoFecha(f)}>
        {textoFecha(f)}
      </MarcaTabla>
    );
  }
  return salida;
}

/** Para ordenar por "Próximo": la fecha más cercana entre el turno y la fecha del caso. */
function proximaYmd(e) {
  return [e.proximo_turno?.fecha, e.proxima_fecha?.fecha].filter(Boolean).sort()[0] || "";
}

export default function TableroLegales() {
  const { esAdmin, user, catalogo, abogados, filtros, setFiltros, tabCelu, setTabCelu } = useLegales();
  const navigate = useNavigate();
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

  // Todos los filtros MENOS la pestaña de etapa (así cada pestaña muestra su número).
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

  // Abogados del desplegable: los activos + cualquiera que tenga casos abiertos.
  const opcionesAbogado = useMemo(() => {
    const vistos = new Map((abogados || []).filter((a) => a.activo !== false).map((a) => [String(a.id), a.nombre]));
    ab.forEach((e) => {
      if (e.abogado && !vistos.has(String(e.abogado))) vistos.set(String(e.abogado), e.abogado_nombre);
    });
    const cuenta = (id) => ab.filter((e) => (id === "todos" ? true : id === "sin" ? !e.abogado : String(e.abogado) === id)).length;
    return [["todos", "Todos"], ...vistos.entries(), ["sin", "Sin abogado"]].map(([id, nombre]) => [id, nombre, cuenta(id)]);
  }, [abogados, ab]);

  const set = (k, v) => setFiltros((f) => ({ ...f, [k]: v }));
  const hayFiltros = !!(filtros.q || filtros.abogado !== "todos" || filtros.oficina !== "todas" || filtros.tema !== "todos" || filtros.demorados);
  const limpiar = () => setFiltros((f) => ({ ...f, abogado: "todos", oficina: "todas", tema: "todos", q: "", demorados: false }));
  const miOficina = user?.perfil?.oficina_nombre || "";

  // Pestañas por etapa (las 5 columnas de antes) con "Todos" primero.
  const pestanas = useMemo(
    () => [
      { id: TODOS, label: "Todos", n: filtrada.length },
      ...FASES.map((f) => ({ id: f.id, label: f.n, color: f.dot, title: f.sub, n: filtrada.filter((e) => f.estados.includes(e.estado)).length })),
    ],
    [filtrada]
  );
  const tab = pestanas.some((p) => p.id === tabCelu) ? tabCelu : TODOS;
  const fase = FASES.find((f) => f.id === tab);
  const visibles = fase ? filtrada.filter((e) => fase.estados.includes(e.estado)) : filtrada;

  const columnas = useMemo(
    () => [
      {
        key: "caso",
        header: "Caso",
        sortValue: (e) => e.persona_nombre || "",
        render: (e) => (
          <span className="flex flex-col gap-0.5 min-w-0 max-w-[300px]">
            <span className="text-[14px] font-semibold text-titulo dark:text-titulo-dark truncate">{e.persona_nombre || "Sin nombre"}</span>
            <span className="text-[12px] text-suave dark:text-suave-dark truncate">
              {e.numero} · {e.tema_nombre}
            </span>
            {e.resumen && (
              <span className="hidden xl:block text-[12px] text-suave dark:text-suave-dark truncate" title={e.resumen}>
                {e.resumen}
              </span>
            )}
          </span>
        ),
      },
      {
        key: "estado",
        header: "Estado",
        sortValue: (e) => ABIERTOS.indexOf(e.estado),
        render: (e) => (
          <span className="flex flex-wrap items-center gap-1 max-w-[260px]">
            <EstadoPill estado={e.estado} chico />
            {/* Lo del abogado: su estado propio (si dice algo más que la etapa), la instancia y las etiquetas. */}
            {e.estado_propio && e.estado_propio.nombre !== e.estado_nombre && <Etiqueta o={e.estado_propio} chica punto />}
            {e.instancia && <Etiqueta o={e.instancia} chica />}
            {(e.etiquetas || []).slice(0, 2).map((q) => (
              <Etiqueta key={q.id} o={q} chica />
            ))}
            {e.cliente_subio_papeles && (
              <MarcaTabla tono="azul" icono={HiDocumentText}>
                Cliente subió papeles
              </MarcaTabla>
            )}
            {e.sin_honorarios && <MarcaTabla tono="ambar">Faltan honorarios</MarcaTabla>}
            {e.comision_pendiente && <MarcaTabla tono="verde">Comisión a cobrar</MarcaTabla>}
          </span>
        ),
      },
      {
        key: "proximo",
        header: "Próximo",
        sortValue: (e) => proximaYmd(e),
        render: (e) => {
          const m = marcasProximo(e);
          return m.length ? <span className="flex flex-col items-start gap-1 max-w-[230px]">{m}</span> : <span className="text-suave dark:text-suave-dark">—</span>;
        },
      },
      {
        key: "abogado",
        header: "Abogado",
        sortValue: (e) => e.abogado_nombre || "",
        render: (e) => (
          <span className="inline-flex items-center gap-2 min-w-0">
            <AvatarAbogado id={e.abogado} nombre={e.abogado_nombre} foto={e.abogado_foto} size={24} />
            <span className={`truncate max-w-[160px] ${e.abogado_nombre ? "text-titulo dark:text-titulo-dark" : "italic text-suave dark:text-suave-dark"}`}>
              {e.abogado_nombre || "Sin abogado"}
            </span>
          </span>
        ),
      },
      // La oficina ve solo lo suyo: la columna le sobra. Un caso PROPIO del abogado dice "Caso del abogado".
      esAdmin && {
        key: "oficina",
        header: "Oficina",
        desde: "xl",
        sortValue: (e) => (e.propio ? "Caso del abogado" : e.oficina_nombre || ""),
        render: (e) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-titulo dark:text-titulo-dark">
            <Punto color={colorOficina(e.oficina)} />
            {e.propio ? "Caso del abogado" : e.oficina_nombre || "Sin oficina"}
          </span>
        ),
      },
      {
        key: "dias",
        header: "Sin novedades",
        align: "right",
        primeroDesc: true,
        sortValue: (e) => diasSinNovedad(e),
        render: (e) => {
          const d = diasSinNovedad(e);
          return <DiasChip dias={d} texto={textoDias(d)} />;
        },
      },
    ],
    [esAdmin]
  );

  // 📱 Renglón del celu.
  const filaCelu = (e) => {
    const d = diasSinNovedad(e);
    const prox = marcasProximo(e)[0] || null;
    return (
      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="flex items-center justify-between gap-2">
          <strong className="truncate text-[14px] text-titulo dark:text-titulo-dark">{e.persona_nombre || "Sin nombre"}</strong>
          <DiasChip dias={d} texto={textoDias(d)} />
        </span>
        <span className="truncate text-[12px] text-suave dark:text-suave-dark">
          {e.numero} · {e.tema_nombre}
          {e.abogado_nombre ? ` · ${e.abogado_nombre}` : " · sin abogado"}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <EstadoPill estado={e.estado} chico />
          {prox}
          {e.cliente_subio_papeles && (
            <MarcaTabla tono="azul" icono={HiDocumentText}>
              Papeles
            </MarcaTabla>
          )}
        </span>
      </span>
    );
  };

  if (error && !lista) {
    return <p className="rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] p-4 text-[14px] text-duo-rojo">{error}</p>;
  }
  if (!lista || !resumen) {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Cargando key={i} alto="h-24" />
          ))}
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
            <b>
              {vencida.titulo} vencida el {diaCorto(vencida.fecha).split(" ")[1]}
            </b>
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
          k={
            <span className="inline-flex items-center gap-1">
              <HiExclamation className="w-3.5 h-3.5" /> DEMORADOS
            </span>
          }
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
              {resumen.vencidas ? (
                <b className="text-duo-rojo">
                  {" "}
                  · {resumen.vencidas} vencida{resumen.vencidas > 1 ? "s" : ""} sin marcar
                </b>
              ) : null}
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
                  <b className="text-duo-amarillo-sombra dark:text-duo-amarillo">
                    {" "}
                    · {resumen.sin_honorarios} cobrado{resumen.sin_honorarios > 1 ? "s" : ""} sin honorarios
                  </b>
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

      {/* Tabla con sus pestañas y filtros arriba (todo en una tarjeta) */}
      <section className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-sm overflow-hidden">
        <FranjaPestanas>
          <PestanasTabla items={pestanas} valor={tab} onCambiar={setTabCelu} ariaLabel="En qué etapa está" />
        </FranjaPestanas>
        <BarraTabla buscador={<BuscadorTabla value={filtros.q} onChange={(v) => set("q", v)} placeholder="Buscar nombre, DNI o N° de caso" />}>
          <SelectTabla etiqueta="Abogado" value={filtros.abogado} onChange={(v) => set("abogado", v)}>
            {opcionesAbogado.map(([id, nombre, n]) => (
              <option key={id} value={id}>
                {nombre} ({n})
              </option>
            ))}
          </SelectTabla>
          <SelectTabla etiqueta="Tema" value={filtros.tema} onChange={(v) => set("tema", v)}>
            <option value="todos">Todos</option>
            {(catalogo?.temas || []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </SelectTabla>
          {esAdmin && (
            <SelectTabla etiqueta="Oficina" value={filtros.oficina} onChange={(v) => set("oficina", v)}>
              <option value="todas">Todas</option>
              {(catalogo?.oficinas || []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </SelectTabla>
          )}
          <ToggleTabla activo={filtros.demorados} onChange={(v) => set("demorados", v)}>
            <HiExclamation className="w-4 h-4" /> Solo demorados
          </ToggleTabla>
          {hayFiltros && <LimpiarTabla onClick={limpiar} />}
        </BarraTabla>
        <TablaDuo
          bare
          columns={columnas}
          rows={visibles}
          rowHref={(e) => `/legales/${e.id}`}
          rowLabel={(e) => `Abrir ${e.numero}, ${e.persona_nombre || ""}`}
          rowTone={(e) => (esDemorado(e) || e.proxima_fecha?.vencida ? "rojo" : null)}
          mobileRow={filaCelu}
          vacio={
            <div className="flex flex-col items-center gap-2">
              <p className="text-[14px] font-medium text-suave dark:text-suave-dark">Nada con este filtro.</p>
              {(hayFiltros || tab !== TODOS) && (
                <button
                  type="button"
                  onClick={() => {
                    limpiar();
                    setTabCelu(TODOS);
                  }}
                  className="text-[13px] font-semibold text-sky-700 dark:text-sky-400 hover:underline"
                >
                  Ver todos los casos
                </button>
              )}
            </div>
          }
        />
      </section>
    </div>
  );
}
