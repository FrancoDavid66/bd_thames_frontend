// src/components/estadisticas/PolizasNuevasPanel.jsx
// ============================================================
// 🆕 Estadísticas → "Pólizas nuevas": cuántas pólizas nuevas hace cada
// oficina, día por día, por semana y mes a mes.
//
//   · Contar: Pólizas nuevas · Clientes nuevos · Pagaron la 1ª cuota
//   · Tarjeta por oficina con su puesto, ▲/▼ contra el mes anterior y "Hoy"
//   · Gráfico apilado por oficina (tocá una barra → la lista de abajo)
//   · Lista de las pólizas del día/semana (link a cada póliza) + CSV
//   · Vista Mes: 12 meses, tabla y la ganadora de cada mes
//
// Lo suma el servidor (estadisticas/polizas_nuevas.py) y se actualiza EN VIVO.
// ============================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from "recharts";
import { HiChevronLeft, HiChevronRight, HiDownload, HiRefresh, HiStar } from "react-icons/hi";

import { useAuth } from "../../context/AuthContext";
import { useNuevasMes, useNuevasSerie } from "../../hooks/usePolizasNuevas";
import { pedirNuevasDetalle } from "../../services/polizasNuevas";
import {
  METRICAS,
  metricaPorId,
  colorOficina,
  varsColor,
  ordenarPorMetrica,
  delta,
  mesActual,
  moverMes,
  nombreMes,
  nombreMesSolo,
  mesCorto,
  fechaLarga,
  hora,
  etiquetaComparacion,
  semanasDelMes,
  mejorDelMes,
  useIsDark,
  useIsMobile,
  leerPref,
  guardarPref,
} from "../polizasNuevas/comun";

const VISTAS = [
  { id: "dia", label: "Día" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
];

const claveOfi = (id) => (id === null || id === undefined ? "sin" : String(id));
const TONO_DELTA = {
  sube: "text-ingreso-fuerte dark:text-ingreso-claro",
  baja: "text-egreso-fuerte dark:text-egreso-claro",
  igual: "text-suave dark:text-suave-dark",
};

/* ── Botonera segmentada ─────────────────────────────────────────── */
function Segmentado({ opciones, valor, onCambiar, etiqueta }) {
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className="flex gap-1 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-1"
    >
      {opciones.map((o) => {
        const activo = o.id === valor;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={activo}
            onClick={() => onCambiar(o.id)}
            className={`min-h-[36px] rounded-md px-3 text-[12px] font-medium transition-colors ${
              activo
                ? "bg-oficina-fuerte text-white"
                : "text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Cartelito del gráfico ───────────────────────────────────────── */
function Cartelito({ active, payload, series, titulo }) {
  if (!active || !payload?.length) return null;
  const fila = payload[0]?.payload || {};
  return (
    <div className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-3 text-[12px] shadow-lg">
      <p className="mb-1.5 font-semibold text-titulo dark:text-titulo-dark">{titulo(fila)}</p>
      {fila.futuro ? (
        <p className="text-suave dark:text-suave-dark">Todavía no llegó</p>
      ) : (
        <>
          {series.map((s) => (
            <p key={s.key} className="flex items-center justify-between gap-4 text-titulo dark:text-titulo-dark">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color.base }} />
                {s.nombre}
              </span>
              <span className="font-semibold tabular-nums">{fila[s.key] || 0}</span>
            </p>
          ))}
          <p className="mt-1.5 flex justify-between border-t border-linea dark:border-linea-dark pt-1.5 font-semibold text-titulo dark:text-titulo-dark">
            <span>Total</span>
            <span className="tabular-nums">{fila.total || 0}</span>
          </p>
        </>
      )}
    </div>
  );
}

/* ── CSV (se abre con Excel) ─────────────────────────────────────── */
function descargarCSV(items, nombreArchivo) {
  const cols = ["Fecha", "Hora", "Oficina", "Cliente", "Vehículo", "Patente", "Compañía", "Cobertura", "Nº póliza", "Cliente nuevo", "Pagó la 1ª cuota"];
  const esc = (v) => {
    let s = String(v ?? "");
    // Que Excel no lo tome como fórmula (=, +, -, @ al principio).
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    // Números largos o con 0 adelante (nº de póliza) → como texto (si no: 2,03E+13).
    if (/^\d{11,}$/.test(s) || /^0\d+$/.test(s)) return `="${s}"`;
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const filas = items.map((p) => [
    dayjs(p.creado_en).format("DD/MM/YYYY"),
    hora(p.creado_en),
    p.oficina,
    p.cliente,
    p.vehiculo,
    p.patente,
    p.compania,
    p.cobertura,
    p.numero,
    p.cliente_nuevo ? "Sí" : "No",
    p.pago_1a ? "Sí" : "No",
  ]);
  const texto = "﻿" + [cols, ...filas].map((f) => f.map(esc).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/* ── Chip de sí/no ───────────────────────────────────────────────── */
const Chip = ({ si, textoSi, textoNo, tonoNo = "gris" }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
      si
        ? "bg-ingreso/15 text-ingreso-fuerte dark:text-ingreso-claro"
        : tonoNo === "ambar"
          ? "bg-tarjeta/15 text-[#b45309] dark:text-tarjeta-claro"
          : "bg-titulo/5 dark:bg-white/10 text-suave dark:text-suave-dark"
    }`}
  >
    {si ? textoSi : textoNo}
  </span>
);

const ChipOficina = ({ nombre, color }) => (
  <span
    style={{ ...varsColor(color), backgroundColor: `${color.base}22` }}
    className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold text-[color:var(--of-txt)] dark:text-[color:var(--of-claro)]"
  >
    {nombre}
  </span>
);

// "2026-09" válido y no en el futuro (si piden un mes que todavía no llegó, va el actual).
function mesValido(m) {
  const s = String(m || "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s) || s < "2000-01") return null;
  return s > mesActual() ? mesActual() : s;
}

// mesInicial / oficinaInicial = los filtros de arriba de Estadísticas (Año, Mes, Oficina):
// si los cambiás, el panel los sigue (después podés moverte con ‹ › sin tocarlos).
export default function PolizasNuevasPanel({ oficinaInicial = "", mesInicial = "" }) {
  const { user } = useAuth();
  const esAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN" || !!user?.is_superuser;
  const dark = useIsDark();
  const mobile = useIsMobile();

  const [vista, setVistaEstado] = useState(() => {
    const v = leerPref("estadisticas.nuevas.vista", "dia");
    return VISTAS.some((x) => x.id === v) ? v : "dia";
  });
  const [metrica, setMetricaEstado] = useState(() => {
    const m = leerPref("estadisticas.nuevas.metrica", "nuevas");
    return METRICAS.some((x) => x.id === m) ? m : "nuevas";
  });
  const [mes, setMes] = useState(() => mesValido(mesInicial) || mesActual());
  const [sel, setSel] = useState(null); // día (1..31) o índice de semana elegido
  const [ofiLista, setOfiLista] = useState(oficinaInicial ? String(oficinaInicial) : "ALL");

  // Cambiaron Año/Mes u Oficina arriba → el panel va a ese mes / esa oficina.
  useEffect(() => {
    const m = mesValido(mesInicial);
    if (m) {
      setMes(m);
      setSel(null);
    }
  }, [mesInicial]);
  useEffect(() => {
    setOfiLista(oficinaInicial ? String(oficinaInicial) : "ALL");
  }, [oficinaInicial]);

  const setVista = (v) => {
    setVistaEstado(v);
    guardarPref("estadisticas.nuevas.vista", v);
    setSel(null);
  };
  const setMetrica = (m) => {
    setMetricaEstado(m);
    guardarPref("estadisticas.nuevas.metrica", m);
  };
  const cambiarMes = (n) => {
    setMes((m) => {
      const nuevo = moverMes(m, n);
      return nuevo > mesActual() ? m : nuevo;
    });
    setSel(null);
  };

  const hoyMes = mesActual();
  const esMesActual = mes === hoyMes;
  const resumen = useNuevasMes(mes, { activo: vista !== "mes" });
  const serie = useNuevasSerie({ desde: moverMes(mes, -11), hasta: mes }, { activo: vista === "mes" });
  const r = resumen.data;
  const met = metricaPorId(metrica);

  // Oficinas (con su color) que aparecen en el gráfico.
  const oficinas = useMemo(() => (vista === "mes" ? serie.data?.oficinas : r?.oficinas) || [], [vista, serie.data, r]);
  const series = useMemo(
    () =>
      oficinas.map((o) => ({
        key: `o_${claveOfi(o.id)}`,
        k: claveOfi(o.id),
        nombre: o.nombre,
        color: colorOficina(oficinas, o.id),
      })),
    [oficinas]
  );

  // ── Día elegido por defecto: hoy (mes en curso) o el último día con pólizas ──
  const diaPorDefecto = useMemo(() => {
    if (!r) return null;
    if (r.en_curso) return dayjs(r.hoy).date();
    const n = r.oficinas?.[0]?.dias?.nuevas?.length || 0;
    for (let i = n - 1; i >= 0; i--) {
      if ((r.oficinas || []).some((o) => (o.dias?.nuevas?.[i] || 0) > 0)) return i + 1;
    }
    return n || null;
  }, [r]);
  const semanas = useMemo(() => (r ? semanasDelMes(r, metrica) : []), [r, metrica]);

  const selDia = vista === "dia" ? sel ?? diaPorDefecto : null;
  const selSemana = useMemo(() => {
    if (vista !== "semana" || !semanas.length) return null;
    if (sel !== null && sel < semanas.length) return sel;
    const d = diaPorDefecto ? dayjs(r.desde).date(diaPorDefecto).format("YYYY-MM-DD") : null;
    const i = semanas.findIndex((s) => d && s.desde <= d && d <= s.hasta);
    return i >= 0 ? i : semanas.length - 1;
  }, [vista, semanas, sel, diaPorDefecto, r]);

  // ── Datos del gráfico ──
  const datos = useMemo(() => {
    if (vista === "mes") {
      return (serie.data?.puntos || []).map((p) => {
        const fila = { etiqueta: mesCorto(p.periodo), periodo: p.periodo, total: 0, ganadora: p.ganadora };
        for (const s of series) {
          const v = p.por_oficina?.[s.k]?.[metrica] || 0;
          fila[s.key] = v;
          fila.total += v;
        }
        return fila;
      });
    }
    if (!r) return [];
    if (vista === "semana") {
      return semanas.map((w, i) => {
        const fila = { etiqueta: w.etiqueta, indice: i, desde: w.desde, hasta: w.hasta, total: w.total, futuro: w.futuro };
        for (const s of series) fila[s.key] = w.porOficina[s.k] || 0;
        return fila;
      });
    }
    const n = r.oficinas?.[0]?.dias?.[metrica]?.length || 0;
    const filas = [];
    for (let i = 0; i < n; i++) {
      const fila = { etiqueta: String(i + 1), dia: i + 1, total: 0, futuro: false };
      for (const o of r.oficinas) {
        const v = o.dias?.[metrica]?.[i];
        if (v === null || v === undefined) fila.futuro = true;
        fila[`o_${claveOfi(o.id)}`] = v || 0;
        fila.total += v || 0;
      }
      filas.push(fila);
    }
    return filas;
  }, [vista, serie.data, r, semanas, series, metrica]);

  const etiquetaSel =
    vista === "dia" && selDia ? String(selDia) : vista === "semana" && selSemana !== null ? semanas[selSemana]?.etiqueta : null;

  const tocarBarra = (e) => {
    const i = e?.activeTooltipIndex;
    if (i === undefined || i === null || !datos[i] || datos[i].futuro) return;
    if (vista === "mes") {
      setMes(datos[i].periodo);
      setVista("dia");
    } else if (vista === "semana") setSel(i);
    else setSel(datos[i].dia);
  };

  // ── La lista (día o semana elegida) ──
  const rango = useMemo(() => {
    if (!r || vista === "mes") return null;
    if (vista === "dia" && selDia) {
      const f = dayjs(r.desde).date(selDia).format("YYYY-MM-DD");
      return f > r.hasta ? null : { desde: f, hasta: f };
    }
    if (vista === "semana" && selSemana !== null && semanas[selSemana] && !semanas[selSemana].futuro) {
      return { desde: semanas[selSemana].desde, hasta: semanas[selSemana].hasta };
    }
    return null;
  }, [r, vista, selDia, selSemana, semanas]);

  const [lista, setLista] = useState({ items: [], total: 0, recortado: false, cargando: false, error: null });
  const listaRef = useRef(0);
  const claveAnterior = useRef("");
  const claveRango = rango ? `${rango.desde}|${rango.hasta}|${ofiLista}` : "";
  // Cuando llega una póliza nueva (en vivo), la lista también se pone al día.
  const refresco = r ? `${r.totales?.nuevas}|${r.totales?.pagaron}|${r.ultima?.creado_en || ""}` : "";
  useEffect(() => {
    if (!rango) {
      // Se va la lista (vista Mes o día sin elegir): se olvida el rango y se
      // ignora cualquier respuesta que llegue tarde.
      claveAnterior.current = "";
      listaRef.current += 1;
      setLista({ items: [], total: 0, recortado: false, cargando: false, error: null });
      return;
    }
    const mio = ++listaRef.current;
    const cambioDeRango = claveAnterior.current !== claveRango;
    claveAnterior.current = claveRango;
    if (cambioDeRango) setLista((s) => ({ ...s, cargando: true, error: null }));
    const pedido =
      rango.desde === rango.hasta
        ? { fecha: rango.desde, oficina: ofiLista }
        : { desde: rango.desde, hasta: rango.hasta, oficina: ofiLista };
    pedirNuevasDetalle(pedido)
      .then((d) => {
        if (mio !== listaRef.current) return;
        setLista({ items: d.polizas || [], total: d.total || 0, recortado: !!d.recortado, cargando: false, error: null });
      })
      .catch((e) => {
        if (mio !== listaRef.current) return;
        setLista((s) => ({
          ...s,
          cargando: false,
          error: cambioDeRango ? e?.response?.data?.detail || "No se pudo cargar la lista." : s.error,
          items: cambioDeRango ? [] : s.items,
        }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveRango, refresco]);

  // ── Tarjetas por oficina (mes día por día o semana) ──
  const ranking = useMemo(() => ordenarPorMetrica(r?.oficinas, metrica), [r, metrica]);
  const lider = ranking.length ? Number(ranking[0][metrica] || 0) : 0;
  const sinOficina = (r?.oficinas || []).find((o) => o.id === null && o.nuevas > 0);
  const comparacion = etiquetaComparacion(r);
  const mejor = useMemo(() => (r && !r.en_curso ? mejorDelMes(r) : null), [r]);

  // ── Vista Mes: totales de 12 meses ──
  const resumen12 = useMemo(() => {
    const puntos = serie.data?.puntos || [];
    if (!puntos.length) return null;
    const totales = puntos.map((p) => Object.values(p.por_oficina || {}).reduce((s, v) => s + (v?.[metrica] || 0), 0));
    const total = totales.reduce((a, b) => a + b, 0);
    let iMejor = 0;
    totales.forEach((t, i) => {
      if (t > totales[iMejor]) iMejor = i;
    });
    const cerrados = puntos.filter((p) => !p.en_curso).length || 1;
    const sumaCerrados = totales.filter((_, i) => !puntos[i].en_curso).reduce((a, b) => a + b, 0);
    return {
      total,
      promedio: Math.round(sumaCerrados / cerrados),
      mejor: { periodo: puntos[iMejor].periodo, total: totales[iMejor] },
      ultimo: { periodo: puntos[puntos.length - 1].periodo, total: totales[totales.length - 1], enCurso: puntos[puntos.length - 1].en_curso },
    };
  }, [serie.data, metrica]);

  const cargando = vista === "mes" ? serie.cargando : resumen.cargando;
  const error = vista === "mes" ? serie.error : resumen.error;
  const recargar = () => (vista === "mes" ? serie.recargar() : resumen.recargar());
  const desactualizado = vista === "mes" ? serie.desactualizado : resumen.desactualizado;

  const tituloCartel = (fila) => {
    if (vista === "mes") return nombreMes(fila.periodo);
    if (vista === "semana") return `Semana del ${dayjs(fila.desde).format("D")} al ${dayjs(fila.hasta).format("D [de] MMMM")}`;
    return r ? fechaLarga(dayjs(r.desde).date(fila.dia).format("YYYY-MM-DD")) : "";
  };

  const colorEje = dark ? "#94a3b8" : "#64748b";
  const colorGrilla = dark ? "#334155" : "#e2e8f0";

  const tituloLista = (() => {
    if (!rango) return "";
    const cuantas = `${lista.total} ${lista.total === 1 ? "póliza nueva" : "pólizas nuevas"}`;
    if (rango.desde === rango.hasta) {
      const esHoy = r?.en_curso && rango.desde === r.hoy;
      return `${fechaLarga(rango.desde)}${esHoy ? " (hoy)" : ""} · ${cuantas}`;
    }
    return `Semana del ${dayjs(rango.desde).format("D")} al ${dayjs(rango.hasta).format("D [de] MMMM")} · ${cuantas}`;
  })();

  // ‹ › de la lista: día anterior/siguiente (o semana), sin pasar de hoy.
  const maxDia = r ? (r.en_curso ? dayjs(r.hoy).date() : r.oficinas?.[0]?.dias?.nuevas?.length || dayjs(r.fin_de_mes).date()) : 0;
  const pasoLista = (n) => {
    if (vista === "dia" && selDia) {
      const d = selDia + n;
      if (d >= 1 && d <= maxDia) setSel(d);
    } else if (vista === "semana" && selSemana !== null) {
      let i = selSemana + n;
      while (i >= 0 && i < semanas.length && semanas[i].futuro) i += n;
      if (i >= 0 && i < semanas.length) setSel(i);
    }
  };
  const puedeAtras = vista === "dia" ? selDia > 1 : selSemana > 0;
  const puedeAdelante =
    vista === "dia" ? !!selDia && selDia < maxDia : selSemana !== null && semanas.slice(selSemana + 1).some((w) => !w.futuro);
  const unidadPaso = vista === "semana" ? "Semana" : "Día";

  const tituloGrafico =
    vista === "mes" ? "Mes a mes · últimos 12 meses" : vista === "semana" ? `Semana por semana · ${nombreMes(mes)}` : `Día por día · ${nombreMes(mes)}`;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Controles ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Segmentado opciones={VISTAS} valor={vista} onCambiar={setVista} etiqueta="Agrupar por" />

        <div className="flex items-center gap-1 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-1">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() => cambiarMes(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
          >
            <HiChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[150px] text-center text-[13px] font-semibold text-titulo dark:text-titulo-dark">
            {vista === "mes" ? `${mesCorto(moverMes(mes, -11))} – ${mesCorto(mes)}` : nombreMes(mes)}
          </span>
          <button
            type="button"
            aria-label="Mes siguiente"
            disabled={esMesActual}
            onClick={() => cambiarMes(1)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark disabled:cursor-not-allowed disabled:opacity-30"
          >
            <HiChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-suave dark:text-suave-dark">Contar:</span>
          <Segmentado opciones={METRICAS} valor={metrica} onCambiar={setMetrica} etiqueta="Qué contar" />
        </div>

        <button
          type="button"
          onClick={recargar}
          aria-label="Actualizar"
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"
        >
          <HiRefresh className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-egreso/25 bg-egreso/10 px-4 py-3 text-[13px] text-egreso-fuerte dark:text-egreso-claro">
          <span>{error}</span>
          <button type="button" onClick={recargar} className="font-semibold underline">
            Reintentar
          </button>
        </div>
      )}

      {/* ── Resumen ── */}
      {vista !== "mes" && r && (
        <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 transition-opacity ${desactualizado ? "opacity-60" : ""}`}>
          {METRICAS.map((m) => {
            const dd = delta(r.totales?.[m.id], r.totales?.antes?.[m.id]);
            const activo = m.id === metrica;
            const nota =
              m.id === "pagaron"
                ? `${r.totales?.nuevas ? Math.round((100 * (r.totales?.pagaron || 0)) / r.totales.nuevas) : 0}% de las pólizas nuevas`
                : m.id === "clientes_nuevos"
                  ? "DNI que nunca tuvo póliza"
                  : r.en_curso
                    ? `Del 1 al ${dayjs(r.hasta).date()} · sin renovaciones`
                    : "Mes completo · sin renovaciones";
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetrica(m.id)}
                aria-pressed={activo}
                className={`flex flex-col gap-1 rounded-xl border bg-card dark:bg-card-dark p-4 text-left transition-colors ${
                  activo ? "border-oficina-fuerte ring-1 ring-oficina-fuerte" : "border-linea dark:border-linea-dark hover:border-oficina/50"
                }`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-suave dark:text-suave-dark">{m.label}</span>
                <span className="flex items-baseline gap-2">
                  <span className="text-[28px] font-bold tabular-nums text-titulo dark:text-titulo-dark">{r.totales?.[m.id] ?? 0}</span>
                  <span className={`text-[12px] font-semibold ${TONO_DELTA[dd.tono]}`}>
                    {dd.txt} {comparacion}
                  </span>
                </span>
                <span className="text-[12px] text-suave dark:text-suave-dark">{nota}</span>
              </button>
            );
          })}
          <div className="flex flex-col gap-1 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
            {r.en_curso ? (
              <>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-suave dark:text-suave-dark">Hoy</span>
                <span className="flex items-baseline gap-2">
                  <span className="text-[28px] font-bold tabular-nums text-titulo dark:text-titulo-dark">{r.totales?.hoy?.[metrica] ?? 0}</span>
                  <span className="text-[12px] text-suave dark:text-suave-dark">{met.unidad}</span>
                </span>
                <span className="text-[12px] text-suave dark:text-suave-dark">
                  {r.ultima ? `Última: ${r.ultima.oficina}, ${dayjs(r.ultima.creado_en).format("DD/MM HH:mm")}` : "Todavía ninguna este mes"}
                </span>
              </>
            ) : (
              <>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-suave dark:text-suave-dark">Mejor día</span>
                <span className="text-[28px] font-bold tabular-nums text-titulo dark:text-titulo-dark">{mejor?.mejorDia?.total ?? 0}</span>
                <span className="text-[12px] text-suave dark:text-suave-dark">
                  {mejor?.mejorDia ? `pólizas nuevas el ${mejor.mejorDia.fecha}` : "Sin pólizas nuevas"}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {vista === "mes" && resumen12 && (
        <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 transition-opacity ${desactualizado ? "opacity-60" : ""}`}>
          {[
            { t: "Últimos 12 meses", v: resumen12.total, n: `${met.unidad}, todas las oficinas` },
            { t: "Promedio por mes", v: resumen12.promedio, n: "de los meses ya cerrados" },
            { t: "Mejor mes", v: resumen12.mejor.total, n: nombreMes(resumen12.mejor.periodo) },
            {
              t: resumen12.ultimo.enCurso ? `${nombreMesSolo(resumen12.ultimo.periodo)} va` : nombreMesSolo(resumen12.ultimo.periodo),
              v: resumen12.ultimo.total,
              n: resumen12.ultimo.enCurso ? "el mes todavía no terminó" : "mes completo",
            },
          ].map((x) => (
            <div key={x.t} className="flex flex-col gap-1 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-suave dark:text-suave-dark">{x.t}</span>
              <span className="text-[28px] font-bold tabular-nums text-titulo dark:text-titulo-dark">{x.v}</span>
              <span className="text-[12px] text-suave dark:text-suave-dark">{x.n}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Una tarjeta por oficina ── */}
      {vista !== "mes" && r && ranking.length > 0 && (
        <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-4 transition-opacity ${desactualizado ? "opacity-60" : ""}`}>
          {ranking.map((o, i) => {
            const c = colorOficina(r.oficinas, o.id);
            const valor = Number(o[metrica] || 0);
            const dd = delta(valor, o.antes?.[metrica]);
            return (
              <div key={o.id} style={varsColor(c)} className="flex flex-col gap-3 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-[color:var(--of-txt)] dark:text-[color:var(--of-claro)]"
                      style={{ backgroundColor: `${c.base}22` }}
                    >
                      {i + 1}º
                    </span>
                    <span className="truncate text-[15px] font-bold text-[color:var(--of-txt)] dark:text-[color:var(--of-claro)]">{o.nombre}</span>
                  </div>
                  {i === 0 && valor > 0 && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-tarjeta/15 px-2 py-0.5 text-[11px] font-semibold text-[#92400e] dark:text-tarjeta-claro">
                      <HiStar className="h-3.5 w-3.5" /> {r.en_curso ? "Va primera" : "Ganó"}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[40px] font-extrabold leading-none tabular-nums text-titulo dark:text-titulo-dark">{valor}</span>
                  <span className="text-[12px] text-suave dark:text-suave-dark">{met.unidad}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-titulo/5 dark:bg-white/10">
                  <div className="h-2 rounded-full" style={{ width: `${lider ? Math.max(4, Math.round((valor * 100) / lider)) : 0}%`, background: c.base }} />
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className={`font-semibold ${TONO_DELTA[dd.tono]}`}>
                    {dd.txt} {comparacion}
                  </span>
                  {r.en_curso && (
                    <span className="text-titulo dark:text-titulo-dark">
                      Hoy: <strong>{o.hoy?.[metrica] ?? 0}</strong>
                    </span>
                  )}
                </div>
                <span className="border-t border-linea dark:border-linea-dark pt-2 text-[11px] text-suave dark:text-suave-dark">
                  {o.nuevas} nuevas · {o.clientes_nuevos} clientes nuevos · {o.pagaron} pagaron
                </span>
              </div>
            );
          })}
        </div>
      )}
      {vista !== "mes" && sinOficina && (
        <p className="text-[12px] text-suave dark:text-suave-dark">
          + {sinOficina.nuevas} {sinOficina.nuevas === 1 ? "póliza nueva" : "pólizas nuevas"} sin oficina (ni en la póliza ni en el cliente).
        </p>
      )}

      {/* ── Gráfico ── */}
      <section className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">{tituloGrafico}</h3>
            <p className="mt-0.5 text-[12px] text-suave dark:text-suave-dark">
              {met.label}, apiladas por oficina.{" "}
              {vista === "mes" ? "Tocá un mes para verlo día por día." : "Tocá una barra para ver la lista."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {series.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5 text-[12px] text-titulo dark:text-titulo-dark">
                <span className="h-3 w-3 rounded-sm" style={{ background: s.color.base }} />
                {s.nombre}
              </span>
            ))}
          </div>
        </div>
        <div className={`h-[260px] w-full transition-opacity ${desactualizado || cargando ? "opacity-60" : ""}`}>
          {datos.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos} onClick={tocarBarra} margin={{ top: 8, right: 8, left: mobile ? -24 : -12, bottom: 0 }} style={{ cursor: "pointer" }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colorGrilla} vertical={false} />
                <XAxis
                  dataKey="etiqueta"
                  tick={{ fill: colorEje, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: colorGrilla }}
                  interval={vista === "dia" && mobile ? 4 : 0}
                />
                <YAxis allowDecimals={false} tick={{ fill: colorEje, fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
                <Tooltip
                  cursor={{ fill: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)" }}
                  content={<Cartelito series={series} titulo={tituloCartel} />}
                />
                {etiquetaSel && (
                  <ReferenceArea x1={etiquetaSel} x2={etiquetaSel} fill={dark ? "#ffffff" : "#0f172a"} fillOpacity={dark ? 0.08 : 0.06} />
                )}
                {series.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.nombre}
                    stackId="a"
                    fill={s.color.base}
                    radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    maxBarSize={vista === "dia" ? 26 : 56}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-[13px] text-suave dark:text-suave-dark">
              {cargando ? "Cargando…" : "Sin datos para este período."}
            </div>
          )}
        </div>
      </section>

      {/* ── Lista del día / semana ── */}
      {vista !== "mes" && rango && (
        <section className="overflow-hidden rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linea dark:border-linea-dark px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                aria-label={`${unidadPaso} anterior`}
                disabled={!puedeAtras}
                onClick={() => pasoLista(-1)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark hover:border-oficina disabled:cursor-not-allowed disabled:opacity-30"
              >
                <HiChevronLeft className="h-5 w-5" />
              </button>
              <h3 className="min-w-0 text-[15px] font-semibold text-titulo dark:text-titulo-dark">{tituloLista}</h3>
              <button
                type="button"
                aria-label={`${unidadPaso} siguiente`}
                disabled={!puedeAdelante}
                onClick={() => pasoLista(1)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark hover:border-oficina disabled:cursor-not-allowed disabled:opacity-30"
              >
                <HiChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {esAdmin && (
                <label className="flex items-center gap-2 text-[12px] text-suave dark:text-suave-dark">
                  Oficina
                  <select
                    value={ofiLista}
                    onChange={(e) => setOfiLista(e.target.value)}
                    className="min-h-[36px] rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-2.5 text-[12px] text-titulo dark:text-titulo-dark dark:[color-scheme:dark]"
                  >
                    <option value="ALL">Todas</option>
                    {(r?.oficinas || []).map((o) => (
                      <option key={claveOfi(o.id)} value={o.id === null ? "sin" : String(o.id)}>
                        {o.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                disabled={!lista.items.length}
                onClick={() => descargarCSV(lista.items, `polizas_nuevas_${rango.desde}${rango.hasta !== rango.desde ? `_al_${rango.hasta}` : ""}.csv`)}
                className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark px-3 text-[12px] font-medium text-titulo dark:text-titulo-dark hover:border-oficina disabled:cursor-not-allowed disabled:opacity-40"
              >
                <HiDownload className="h-4 w-4" /> Descargar lista (Excel)
              </button>
            </div>
          </div>

          {lista.error ? (
            <p className="px-5 py-6 text-[13px] text-egreso-fuerte dark:text-egreso-claro">{lista.error}</p>
          ) : lista.cargando && !lista.items.length ? (
            <p className="px-5 py-6 text-[13px] text-suave dark:text-suave-dark">Cargando…</p>
          ) : !lista.items.length ? (
            <p className="px-5 py-6 text-[13px] text-suave dark:text-suave-dark">No hay pólizas nuevas en este período.</p>
          ) : mobile ? (
            <ul className="divide-y divide-linea dark:divide-linea-dark">
              {lista.items.map((p) => (
                <li key={p.id} className="flex flex-col gap-1.5 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link to={`/polizas/${p.id}`} className="truncate text-[14px] font-semibold text-titulo dark:text-titulo-dark hover:underline">
                      {p.cliente}
                    </Link>
                    <ChipOficina nombre={p.oficina} color={colorOficina(r?.oficinas, p.oficina_id)} />
                  </div>
                  <span className="text-[12px] text-suave dark:text-suave-dark">
                    {rango.desde === rango.hasta ? hora(p.creado_en) : dayjs(p.creado_en).format("DD/MM HH:mm")} · {p.vehiculo}
                    {p.patente ? ` · ${p.patente}` : ""} · {p.compania}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip si={p.cliente_nuevo} textoSi="Cliente nuevo" textoNo="Ya tenía otra póliza" />
                    <Chip si={p.pago_1a} textoSi="Pagó la 1ª" textoNo="Falta la 1ª" tonoNo="ambar" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[12px]">
                <thead>
                  <tr className="bg-surface dark:bg-surface-dark text-left text-suave dark:text-suave-dark">
                    <th className="px-5 py-2.5 font-medium">{rango.desde === rango.hasta ? "Hora" : "Fecha"}</th>
                    <th className="px-3 py-2.5 font-medium">Oficina</th>
                    <th className="px-3 py-2.5 font-medium">Cliente</th>
                    <th className="px-3 py-2.5 font-medium">Vehículo</th>
                    <th className="px-3 py-2.5 font-medium">Compañía</th>
                    <th className="px-3 py-2.5 font-medium">¿Cliente nuevo?</th>
                    <th className="px-5 py-2.5 font-medium">1ª cuota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea/60 dark:divide-linea-dark/60">
                  {lista.items.map((p) => (
                    <tr key={p.id} className="hover:bg-oficina/5">
                      <td className="whitespace-nowrap px-5 py-2.5 tabular-nums text-suave dark:text-suave-dark">
                        {rango.desde === rango.hasta ? hora(p.creado_en) : dayjs(p.creado_en).format("DD/MM HH:mm")}
                      </td>
                      <td className="px-3 py-2.5">
                        <ChipOficina nombre={p.oficina} color={colorOficina(r?.oficinas, p.oficina_id)} />
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-titulo dark:text-titulo-dark">
                        <Link to={`/polizas/${p.id}`} className="hover:underline">
                          {p.cliente}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-titulo dark:text-titulo-dark">
                        {p.vehiculo}
                        {p.patente ? <span className="text-suave dark:text-suave-dark"> · {p.patente}</span> : null}
                      </td>
                      <td className="px-3 py-2.5 text-titulo dark:text-titulo-dark">{p.compania}</td>
                      <td className="px-3 py-2.5">
                        <Chip si={p.cliente_nuevo} textoSi="Sí" textoNo="No, ya tenía otra" />
                      </td>
                      <td className="px-5 py-2.5">
                        <Chip si={p.pago_1a} textoSi="Pagó" textoNo="Falta" tonoNo="ambar" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {lista.recortado && (
            <p className="border-t border-linea dark:border-linea-dark px-5 py-2 text-[12px] text-suave dark:text-suave-dark">
              Se muestran las primeras 1000.
            </p>
          )}
        </section>
      )}

      {/* ── Vista Mes: tabla ── */}
      {vista === "mes" && serie.data?.puntos?.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
          <div className="border-b border-linea dark:border-linea-dark px-5 py-3">
            <h3 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">Tabla por mes · {met.label.toLowerCase()}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[12px] tabular-nums">
              <thead>
                <tr className="bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark">
                  <th className="px-5 py-2.5 text-left font-medium">Mes</th>
                  {series.map((s) => (
                    <th key={s.key} className="px-3 py-2.5 text-right font-semibold" style={{ color: dark ? s.color.claro : s.color.texto }}>
                      {s.nombre}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right font-semibold text-titulo dark:text-titulo-dark">Total</th>
                  <th className="px-5 py-2.5 text-left font-medium">Ganó</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea/60 dark:divide-linea-dark/60">
                {datos
                  .slice()
                  .reverse()
                  .map((f) => {
                    const g = (serie.data?.oficinas || []).find((o) => o.id === f.ganadora);
                    const punto = (serie.data?.puntos || []).find((p) => p.periodo === f.periodo);
                    return (
                      <tr key={f.periodo} className="cursor-pointer hover:bg-oficina/5" onClick={() => { setMes(f.periodo); setVista("dia"); }}>
                        <td className="px-5 py-2.5 font-semibold text-titulo dark:text-titulo-dark">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMes(f.periodo);
                              setVista("dia");
                            }}
                            className="text-left font-semibold hover:underline"
                          >
                            {nombreMes(f.periodo)}
                          </button>
                          {punto?.en_curso ? <span className="ml-1 font-normal text-suave dark:text-suave-dark">(en curso)</span> : null}
                        </td>
                        {series.map((s) => (
                          <td key={s.key} className="px-3 py-2.5 text-right text-titulo dark:text-titulo-dark">
                            {f[s.key] || "–"}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-right font-bold text-titulo dark:text-titulo-dark">{f.total}</td>
                        <td className="px-5 py-2.5">
                          {g ? <ChipOficina nombre={`${punto?.en_curso ? "Va " : ""}${g.nombre}`} color={colorOficina(serie.data.oficinas, g.id)} /> : "–"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-linea dark:border-linea-dark px-5 py-2 text-[12px] text-suave dark:text-suave-dark">
            "Ganó" cuenta pólizas nuevas; si empatan, gana la que llegó primero a ese número.
          </p>
        </section>
      )}

      <p className="text-[12px] leading-relaxed text-suave dark:text-suave-dark">
        <strong className="text-titulo dark:text-titulo-dark">Cómo se cuenta.</strong> Póliza nueva: la que se cargó en THAMES ese día y no es
        renovación. Cliente nuevo: su DNI nunca tuvo otra póliza antes. Pagó la 1ª cuota: la 1ª cuota ya figura paga (en la oficina, por transferencia o con el comprobante de Rapipago). La comparación
        es contra los mismos días del mes anterior{r && !r.en_curso ? " (con el mes cerrado, contra el mes anterior entero)" : ""}.
      </p>
    </div>
  );
}
