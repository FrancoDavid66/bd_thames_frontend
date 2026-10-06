// src/components/gestoria/metricas/MetricasPanel.jsx
//
// 📊 Gestoría → «Métricas» (30/09; mockup aprobado por Franco: "MANDALE").
//
// Un mes a la vez (flechitas), comparado con el anterior:
//   - los números grandes: cargados, entregados, días hasta LISTO, % observados y
//     cómo está HOY (abiertos y demorados; la oficina: listos sin retirar);
//   - mes a mes, qué trámites llegan, cuánto tarda cada parte, qué oficina trae más;
//   - 🔒 la plata del mes (solo el admin) y la tabla de gestores.
// Quién ve qué lo decide el SERVIDOR (gestoria/metricas.py): la oficina recibe solo
// lo suyo y sin plata; el gestor no entra. Acá solo se acomoda la pantalla.
//
// Los filtros van en la dirección, así se puede mandar el link (y Estadísticas →
// «Gestoría» abre justo el mes y la oficina que estabas mirando):
//   /gestoria/metricas?mes=2026-09&oficina=2&gestor=5
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  HiArrowDownTray,
  HiArrowPath,
  HiBuildingStorefront,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi2";

import useDatosVivos from "../../../hooks/useDatosVivos";
import { mensajeError, pedirMetricas } from "../../../services/gestoria";
import { useGestoria } from "../gestoriaContext";
import { Cargando } from "../Piezas";
import { MesAMes, Oficinas, Tiempos, TiposLlegan } from "./graficos";
import { Gestores, ListosParaEntregar, PlataDelMes } from "./secciones";
import { Kpi } from "./piezasMetricas";
import { descargarExcelMetricas } from "./excelMetricas";
import {
  claveMes,
  compararMeses,
  dec,
  diferencia,
  entero,
  leerMes,
  mesDeHoy,
  moverMes,
  nombreMes,
  pctTxt,
} from "./metricasUtils";

const CONTROL =
  "h-11 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-[14px] font-semibold text-titulo dark:text-titulo-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-duo-violeta";
const FLECHA =
  "flex h-full w-11 items-center justify-center rounded-xl text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark disabled:cursor-default disabled:text-slate-300 dark:disabled:text-slate-600 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-duo-violeta";

/** La línea de abajo de un número: contra el mes anterior o, si no hay, un texto neutro. */
function lineaDe(dif, neutro) {
  if (dif) return { tono: dif.tono, icono: dif.dir, texto: dif.texto };
  return neutro ? { tono: "neutro", icono: null, texto: neutro } : null;
}

function Esqueleto() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Cargando key={i} alto={`h-[112px] ${i === 4 ? "col-span-2 lg:col-span-1" : ""}`} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Cargando alto="h-[300px]" />
        </div>
        <div className="lg:col-span-5">
          <Cargando alto="h-[300px]" />
        </div>
      </div>
      <Cargando alto="h-64" />
    </div>
  );
}

export default function MetricasPanel() {
  const { esAdmin, catalogo, gestores: gestoresCtx } = useGestoria();
  const [params, setParams] = useSearchParams();
  // "Hoy" lo dice el SERVIDOR (hora de Argentina): hasta que conteste, el de la compu.
  const [hoySrv, setHoySrv] = useState(null);
  const hoyLocal = useMemo(() => mesDeHoy(), []);
  const hoy = hoySrv || hoyLocal;

  // El mes y los filtros salen de la dirección. Sin ?mes (o uno que todavía no llegó) =
  // el mes de hoy: ahí no se manda el mes y el servidor usa el suyo.
  const pedido = leerMes(params.get("mes"));
  const pedidoOk = pedido && compararMeses(pedido, hoy) < 0 ? pedido : null;
  const mes = pedidoOk || hoy;
  const oficina = esAdmin ? String(params.get("oficina") || "").replace(/\D/g, "") : "";
  const gestor = String(params.get("gestor") || "").replace(/\D/g, "");
  const pAnio = pedidoOk?.anio || 0;
  const pMes = pedidoOk?.mes || 0;
  // Qué se está pidiendo: si lo que hay en pantalla es de otro pedido, no se muestra como si fuera este.
  const clave = `${pAnio}-${pMes}|${oficina}|${gestor}`;

  const [datos, setDatos] = useState(null);
  const [datosDe, setDatosDe] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [bajando, setBajando] = useState(false);
  const turno = useRef(0); // si cambiás de mes rápido, gana el último pedido
  const idFiltro = useId();

  const cargar = useCallback(async () => {
    const mio = ++turno.current;
    setCargando(true);
    try {
      const d = await pedirMetricas({
        ...(pAnio ? { anio: pAnio, mes: pMes } : {}),
        ...(oficina ? { oficina } : {}),
        ...(gestor ? { gestor } : {}),
      });
      if (mio !== turno.current) return;
      setDatos(d);
      setDatosDe(`${pAnio}-${pMes}|${oficina}|${gestor}`);
      if (d?.hoy) setHoySrv({ anio: d.hoy.anio, mes: d.hoy.mes });
      setError("");
    } catch (e) {
      if (mio !== turno.current) return;
      setError(mensajeError(e, "No se pudieron cargar las métricas."));
    } finally {
      if (mio === turno.current) setCargando(false);
    }
  }, [pAnio, pMes, oficina, gestor]);

  useEffect(() => {
    cargar();
  }, [cargar]);
  // 📡 Si cambia algún trámite, se recalcula (como mucho una vez por minuto).
  useDatosVivos(["gestoria"], () => cargar(), { cadaMs: 60000 });

  const vigente = !!datos && datosDe === clave;

  const cambiar = useCallback(
    (cambios) => {
      const p = new URLSearchParams(params);
      Object.entries(cambios).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
      setParams(p, { replace: true });
    },
    [params, setParams]
  );
  const irAMes = (m) => cambiar({ mes: compararMeses(m, hoy) >= 0 ? "" : claveMes(m) });

  // 🧹 Si en la dirección quedó algo que el servidor no usó (un gestor u oficina que no
  //    existe, un mes que todavía no llegó), se saca: así los filtros dicen la verdad.
  useEffect(() => {
    if (!vigente) return;
    const sobra = {};
    if (gestor && !datos.filtros?.gestor) sobra.gestor = "";
    if (oficina && !datos.filtros?.oficina) sobra.oficina = "";
    if (hoySrv && params.get("mes") && !pedidoOk) sobra.mes = "";
    if (Object.keys(sobra).length) cambiar(sobra);
  }, [vigente, datos, gestor, oficina, hoySrv, params, pedidoOk, cambiar]);

  /** Tocar una oficina o un gestor filtra, y el foco va a su filtro (arriba). */
  const elegir = (campo, id) => {
    cambiar({ [campo]: String(id) });
    requestAnimationFrame(() => document.getElementById(`${idFiltro}-${campo}`)?.focus());
  };

  const primero = leerMes(datos?.primer_mes);
  const hayAntes = primero ? compararMeses(mes, primero) > 0 : false;
  const hayDespues = compararMeses(mes, hoy) < 0;

  const oficinas = datos?.opciones?.oficinas || catalogo?.oficinas || [];
  const gestores = datos?.opciones?.gestores || (gestoresCtx || []).map((g) => ({ id: g.id, nombre: g.nombre, activo: g.activo }));
  const gestorEnLista = !gestor || gestores.some((g) => String(g.id) === gestor);

  const bajarExcel = async () => {
    if (!vigente || bajando) return;
    setBajando(true);
    try {
      await descargarExcelMetricas(datos);
      toast.success("Listo: se descargó el Excel");
    } catch {
      toast.error("No se pudo armar el Excel. Probá de nuevo.");
    } finally {
      setBajando(false);
    }
  };

  // ── Filtros ──
  const filtros = (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className={`${CONTROL} inline-flex w-full items-center justify-between sm:w-auto`}>
        <button
          type="button"
          className={FLECHA}
          onClick={() => irAMes(moverMes(mes, -1))}
          disabled={!hayAntes}
          aria-label="Mes anterior"
          title={hayAntes ? "Mes anterior" : "No hay trámites antes"}
        >
          <HiChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="min-w-[150px] px-1 text-center font-bold" aria-live="polite">
          {nombreMes(mes)}
        </span>
        <button
          type="button"
          className={FLECHA}
          onClick={() => irAMes(moverMes(mes, 1))}
          disabled={!hayDespues}
          aria-label="Mes siguiente"
        >
          <HiChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {esAdmin ? (
        <div className="flex min-w-[150px] flex-1 items-center gap-2 sm:flex-none">
          <label htmlFor={`${idFiltro}-oficina`} className="text-[13px] font-semibold text-suave dark:text-suave-dark">
            Oficina
          </label>
          <select
            id={`${idFiltro}-oficina`}
            value={oficina}
            onChange={(e) => cambiar({ oficina: e.target.value })}
            className={`${CONTROL} min-w-0 flex-1 px-2.5 sm:min-w-[150px]`}
          >
            <option value="">Todas</option>
            {oficinas.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.nombre}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-surface dark:bg-surface-dark px-3 text-[14px] font-bold text-titulo dark:text-titulo-dark">
          <HiBuildingStorefront className="h-[18px] w-[18px] text-suave dark:text-suave-dark" aria-hidden="true" />
          {datos?.filtros?.oficina_nombre || "Tu oficina"}
        </span>
      )}

      <div className="flex min-w-[150px] flex-1 items-center gap-2 sm:flex-none">
        <label htmlFor={`${idFiltro}-gestor`} className="text-[13px] font-semibold text-suave dark:text-suave-dark">
          Gestor
        </label>
        <select
          id={`${idFiltro}-gestor`}
          value={gestor}
          onChange={(e) => cambiar({ gestor: e.target.value })}
          className={`${CONTROL} min-w-0 flex-1 px-2.5 sm:min-w-[160px]`}
        >
          <option value="">Todos</option>
          {!gestorEnLista ? <option value={gestor}>{datos?.filtros?.gestor_nombre || "Ese gestor"}</option> : null}
          {gestores.map((g) => (
            <option key={g.id} value={String(g.id)}>
              {g.nombre}
              {g.activo === false ? " (desactivado)" : ""}
            </option>
          ))}
        </select>
      </div>

      <span className="hidden grow sm:block" />
      {cargando && datos ? (
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-suave dark:text-suave-dark" role="status">
          <HiArrowPath className="h-4 w-4 animate-spin" aria-hidden="true" />
          Actualizando…
        </span>
      ) : null}
      <button
        type="button"
        onClick={bajarExcel}
        disabled={!vigente || bajando}
        className={`${CONTROL} inline-flex items-center gap-2 px-3.5 hover:bg-surface dark:hover:bg-surface-dark disabled:opacity-50`}
      >
        <HiArrowDownTray className="h-[18px] w-[18px]" aria-hidden="true" />
        {bajando ? "Armando el Excel…" : "Descargar Excel"}
      </button>
    </div>
  );

  let cuerpo;
  if (!datos || (!vigente && error)) {
    // Sin nada todavía, o falló el pedido de ESTE mes/filtro: no se muestran números de otro.
    cuerpo = error ? (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-duo-rojo/40 bg-card dark:bg-card-dark p-4">
        <p className="text-[14px] text-duo-rojo dark:text-red-400">{error}</p>
        <button type="button" onClick={cargar} className={`${CONTROL} px-4`}>
          Probar de nuevo
        </button>
      </div>
    ) : (
      <Esqueleto />
    );
  } else {
    const n = datos.numeros;
    const a = datos.anterior;
    const esOficina = datos.rol === "OFICINA";
    const mesTxt = datos.periodo.nombre;
    // Mes en curso: contra el anterior "a esta altura" (ej: del 1 al 3 de septiembre).
    const mesAnt = a.a_esta_altura ? `a esta altura de ${datos.periodo.anterior.nombre}` : datos.periodo.anterior.nombre;
    const dif = (actual, antes, opciones) => (a.hubo_actividad ? diferencia(actual, antes, { mes: mesAnt, ...opciones }) : null);
    const dias = n.dias_hasta_listo;

    cuerpo = (
      <div className={`flex flex-col gap-4 transition-opacity ${cargando ? "opacity-70" : ""}`}>
        {error ? (
          <p role="alert" className="rounded-lg border border-duo-rojo/40 px-3 py-2 text-[13px] text-duo-rojo dark:text-red-400">
            No se pudo actualizar: {error}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi
            titulo="Trámites cargados"
            valor={entero(n.cargados)}
            linea={lineaDe(dif(n.cargados, a.cargados), "Sin contar los cancelados")}
          />
          <Kpi
            titulo="Entregados"
            valor={entero(n.entregados)}
            linea={lineaDe(dif(n.entregados, a.entregados), "Entregados al cliente")}
          />
          <Kpi
            titulo="Días hasta LISTO"
            valor={dias == null ? "—" : dec(dias)}
            unidad={dias == null ? "" : Number(dias) === 1 ? "día" : "días"}
            linea={lineaDe(
              dif(dias, a.dias_hasta_listo, { tipo: "días", menosEsMejor: true }),
              n.listos ? `Promedio de ${n.listos} que quedaron LISTO` : "Ninguno quedó LISTO todavía"
            )}
          />
          <Kpi
            titulo="Observados"
            extra={
              n.cargados ? (
                <span className="font-normal">
                  · {entero(n.observados)} de {entero(n.cargados)}
                </span>
              ) : null
            }
            valor={pctTxt(n.observados_pct)}
            linea={lineaDe(
              dif(n.observados_pct, a.observados_pct, { tipo: "puntos", menosEsMejor: true }),
              a.a_esta_altura ? "Con al menos una observación (hasta hoy)" : "Con al menos una observación"
            )}
          />
          <div className="col-span-2 lg:col-span-1">
            {esOficina ? (
              <Kpi
                titulo="Listos sin retirar"
                valor={entero(n.listos_sin_retirar)}
                linea={
                  n.listos_sin_retirar
                    ? {
                        tono: n.listo_mas_viejo_dias >= datos.dias_demorado ? "mal" : "aviso",
                        icono: "alerta",
                        texto:
                          n.listo_mas_viejo_dias === 0
                            ? "Quedaron listos hoy"
                            : `El más viejo, hace ${n.listo_mas_viejo_dias} día${n.listo_mas_viejo_dias === 1 ? "" : "s"}`,
                      }
                    : { tono: "bien", icono: "ok", texto: "Ninguno esperando" }
                }
              />
            ) : (
              <Kpi
                titulo="Abiertos ahora"
                valor={entero(n.abiertos)}
                linea={
                  n.demorados
                    ? {
                        tono: "mal",
                        icono: "alerta",
                        texto: `${n.demorados} demorado${n.demorados === 1 ? "" : "s"} (${datos.dias_demorado} días o más)`,
                      }
                    : { tono: "bien", icono: "ok", texto: "Ninguno demorado" }
                }
              />
            )}
          </div>
        </div>

        {datos.listos_para_entregar ? (
          <ListosParaEntregar
            datos={datos.listos_para_entregar}
            oficinaNombre={datos.filtros?.oficina_nombre}
            diasDemorado={datos.dias_demorado}
          />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="flex min-w-0 flex-col lg:col-span-7 [&>section]:grow">
            <MesAMes serie={datos.mes_a_mes} />
          </div>
          <div className="flex min-w-0 flex-col lg:col-span-5 [&>section]:grow">
            <TiposLlegan tipos={datos.tipos} mes={mesTxt} />
          </div>
        </div>

        <Tiempos tiempos={datos.tiempos} mes={mesTxt} esOficina={esOficina} />

        {datos.oficinas || datos.plata ? (
          <div className={`grid gap-4 ${datos.oficinas && datos.plata ? "lg:grid-cols-2" : ""}`}>
            {datos.oficinas ? (
              <Oficinas
                oficinas={datos.oficinas}
                porGestor={n.cargados_por_gestor}
                cargados={n.cargados}
                mes={mesTxt}
                onElegir={(id) => elegir("oficina", id)}
              />
            ) : null}
            {datos.plata ? <PlataDelMes p={datos.plata} mes={mesTxt} /> : null}
          </div>
        ) : null}

        <Gestores
          filas={datos.gestores}
          numeros={n}
          plataTotal={datos.plata}
          conPlata={!!datos.con_plata}
          mes={mesTxt}
          elegido={!!datos.filtros?.gestor}
          onElegir={(id) => elegir("gestor", id)}
        />

        <p className="px-1 text-center text-[12.5px] text-suave dark:text-suave-dark">
          {esOficina
            ? "Ves solo los trámites de tu oficina."
            : datos.con_plata
              ? "La plata la ves solo vos (admin). La oficina ve solo sus trámites y sin plata; el gestor no ve Métricas."
              : "La oficina ve solo sus trámites; el gestor no ve Métricas."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-titulo dark:text-titulo-dark">Métricas</h2>
        <span className="text-[13px] text-suave dark:text-suave-dark">
          Cómo viene Gestoría en el mes, comparado con el anterior.{" "}
          {esAdmin ? "Tocá una oficina o un gestor para ver solo lo suyo." : "Tocá un gestor para ver solo lo suyo."}
        </span>
      </div>
      {filtros}
      {cuerpo}
    </div>
  );
}
