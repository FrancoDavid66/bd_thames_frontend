// src/components/estadisticas/GestoriaResumenPanel.jsx
//
// 🚗 Estadísticas → «Gestoría» (30/09): un resumen del mes de Gestoría (con el mes y
// la oficina que elegiste arriba) y el botón para ver todo en Gestoría → «Métricas».
// Los números salen del mismo lugar que Métricas (GET /api/gestoria/metricas/).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HiArrowRight, HiChartBar } from "react-icons/hi2";

import { mensajeError, pedirMetricas } from "../../services/gestoria";
import { Kpi } from "../gestoria/metricas/piezasMetricas";
import { claveMes, dec, diferencia, entero, nombreMes, pctTxt } from "../gestoria/metricas/metricasUtils";

function Esqueleto() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[108px] animate-pulse rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark" />
      ))}
    </div>
  );
}

export default function GestoriaResumenPanel({ anio, mes, oficina = "" }) {
  const [res, setRes] = useState({ clave: "", datos: null });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const clave = `${anio}-${mes}|${oficina}`;

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError("");
    pedirMetricas({ anio, mes, ...(oficina ? { oficina } : {}) })
      .then((d) => vivo && setRes({ clave: `${anio}-${mes}|${oficina}`, datos: d }))
      .catch((e) => vivo && setError(mensajeError(e, "No se pudo cargar el resumen de Gestoría.")))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [anio, mes, oficina]);

  // Los números de otro mes u oficina no se muestran como si fueran de este (si falló, se avisa).
  const datos = res.clave === clave ? res.datos : null;
  const periodo = { anio: Number(anio), mes: Number(mes) };
  const link = `/gestoria/metricas?mes=${claveMes(periodo)}${oficina ? `&oficina=${oficina}` : ""}`;

  let cuerpo;
  if (!datos) {
    cuerpo = error ? (
      <p role="alert" className="rounded-lg border border-egreso/30 bg-egreso/10 px-3 py-2 text-[12px] font-medium text-egreso dark:text-egreso-claro">
        {error}
      </p>
    ) : (
      <Esqueleto />
    );
  } else {
    const n = datos.numeros;
    const a = datos.anterior;
    const mesAnt = a.a_esta_altura ? `a esta altura de ${datos.periodo.anterior.nombre}` : datos.periodo.anterior.nombre;
    const dif = (actual, antes, opciones) => {
      const d = a.hubo_actividad ? diferencia(actual, antes, { mes: mesAnt, ...opciones }) : null;
      return d ? { tono: d.tono, icono: d.dir, texto: d.texto } : null;
    };
    const dias = n.dias_hasta_listo;
    cuerpo = (
      <div className={`grid grid-cols-2 gap-3 transition-opacity lg:grid-cols-4 ${cargando ? "opacity-60" : ""}`}>
        <Kpi
          titulo="Trámites cargados"
          valor={entero(n.cargados)}
          linea={dif(n.cargados, a.cargados) || { tono: "neutro", texto: "Sin contar los cancelados" }}
        />
        <Kpi
          titulo="Entregados"
          valor={entero(n.entregados)}
          linea={dif(n.entregados, a.entregados) || { tono: "neutro", texto: "Entregados al cliente" }}
        />
        <Kpi
          titulo="Días hasta LISTO"
          valor={dias == null ? "—" : dec(dias)}
          unidad={dias == null ? "" : Number(dias) === 1 ? "día" : "días"}
          linea={
            dif(dias, a.dias_hasta_listo, { tipo: "días", menosEsMejor: true }) || {
              tono: "neutro",
              texto: n.listos ? `Promedio de ${n.listos} que quedaron LISTO` : "Ninguno quedó LISTO todavía",
            }
          }
        />
        <Kpi
          titulo="Observados"
          valor={pctTxt(n.observados_pct)}
          linea={
            dif(n.observados_pct, a.observados_pct, { tipo: "puntos", menosEsMejor: true }) || {
              tono: "neutro",
              texto: n.cargados ? `${entero(n.observados)} de ${entero(n.cargados)}` : "Sin trámites cargados",
            }
          }
        />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-duo-violeta text-white" aria-hidden="true">
          <HiChartBar className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-titulo dark:text-titulo-dark">Gestoría · {nombreMes(periodo)}</h2>
          <p className="text-[12.5px] text-suave dark:text-suave-dark">
            Un resumen{datos?.filtros?.oficina_nombre ? ` de ${datos.filtros.oficina_nombre}` : ""}. El detalle (cuánto tarda cada
            trámite, gestores, oficinas y plata) está en Gestoría → Métricas.
          </p>
        </div>
      </div>
      {cuerpo}
      <Link
        to={link}
        className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-lg bg-duo-violeta px-4 text-[13.5px] font-bold text-white hover:bg-duo-violeta-sombra focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-duo-violeta focus-visible:ring-offset-2"
      >
        <HiChartBar className="h-[18px] w-[18px]" aria-hidden="true" />
        Ver todas las métricas
        <HiArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
