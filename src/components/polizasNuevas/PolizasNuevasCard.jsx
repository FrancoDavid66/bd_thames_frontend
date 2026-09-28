// src/components/polizasNuevas/PolizasNuevasCard.jsx
// ============================================================
// 🏁 Cartel del Inicio: "Ranking de oficinas · Septiembre".
//
// El puesto de cada oficina en el mes por CRECIMIENTO NETO: autos que
// entraron (nuevos, sin renovaciones ni repetidos) − autos que se fueron (no
// pagó, cancelada/de baja, terminó y no renovó). Ejemplo: entraron 60 y se
// fueron 22 → +38. Muestra cuánto sube o baja contra los mismos días del mes
// anterior, la barra entraron/se fueron, la retención y "hoy".
// Todos ven los números de todas las oficinas (es un ranking); el empleado ve
// la suya resaltada y cuántos se fueron por no pagar (si pagan, vuelven).
// Se actualiza solo (en vivo).
// ============================================================
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { HiTrendingUp, HiArrowRight, HiStar } from "react-icons/hi";

import { useAuth } from "../../context/AuthContext";
import { useNuevasMes } from "../../hooks/usePolizasNuevas";
import {
  colorOficina,
  varsColor,
  rankingOficinas,
  hayMovimiento as hayMov,
  conSigno,
  formatoRetencion,
  delta,
  nombreMesSolo,
  etiquetaComparacion,
  guardarPref,
  mesActual,
} from "./comun";

const TONO_DELTA = {
  sube: "text-ingreso-fuerte dark:text-ingreso-claro",
  baja: "text-egreso-fuerte dark:text-egreso-claro",
  igual: "text-suave dark:text-suave-dark",
};
const tonoNeto = (n) =>
  n > 0
    ? "text-ingreso-fuerte dark:text-ingreso-claro"
    : n < 0
      ? "text-egreso-fuerte dark:text-egreso-claro"
      : "text-titulo dark:text-titulo-dark";

/** Barra partida: verde lo que entró, rojo lo que se fue. */
function BarraBalance({ entraron, seFueron }) {
  const e = Number(entraron || 0);
  const s = Number(seFueron || 0);
  const total = e + s;
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-titulo/5 dark:bg-white/10" aria-hidden="true">
      {total > 0 && (
        <>
          <div className="bg-ingreso" style={{ width: `${(e * 100) / total}%` }} />
          <div className="bg-egreso" style={{ width: `${(s * 100) / total}%` }} />
        </>
      )}
    </div>
  );
}

export default function PolizasNuevasCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const esAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN" || !!user?.is_superuser;
  const miOficina = user?.perfil?.oficina?.id ?? user?.perfil?.oficina ?? null;

  const { data: r, cargando, error, recargar } = useNuevasMes("");
  const ranking = useMemo(() => rankingOficinas(r?.oficinas), [r]);
  const enJuego = ranking.filter((o) => !o.sinMovimiento);
  const hayMovimiento = hayMov(enJuego);
  const comparacion = etiquetaComparacion(r);

  // Mensaje para el empleado: "Axión va 2ª, a 6 de Km 39" (+ los que se pueden recuperar).
  const mensaje = useMemo(() => {
    if (esAdmin || miOficina === null || !ranking.length) return null;
    const i = ranking.findIndex((o) => String(o.id) === String(miOficina));
    if (i < 0) return null;
    const yo = ranking[i];
    const recup = Number(yo.recuperables || 0);
    const extra =
      recup > 0
        ? `${recup} ${recup === 1 ? "se fue por no pagar y tiene" : "se fueron por no pagar y tienen"} la póliza vencida: si ${recup === 1 ? "paga, vuelve" : "pagan, vuelven"} y tu oficina sube.`
        : "";
    if (!hayMovimiento) return { txt: "Todavía no hay movimiento este mes: ¡la primera póliza arranca la carrera!", extra };
    if (yo.sinMovimiento) return { txt: `${yo.nombre} todavía no tuvo movimiento este mes.`, extra };
    const lider = enJuego[0];
    if (i === 0) {
      const segundo = enJuego[1];
      const ventaja = segundo ? Number(yo.neto || 0) - Number(segundo.neto || 0) : null;
      return { txt: ventaja ? `${yo.nombre} va 1ª, le saca ${ventaja} a ${segundo.nombre}` : `${yo.nombre} va 1ª`, extra };
    }
    const faltan = Number(lider.neto || 0) - Number(yo.neto || 0);
    return {
      txt: faltan > 0 ? `${yo.nombre} va ${i + 1}ª, a ${faltan} de ${lider.nombre}` : `${yo.nombre} va ${i + 1}ª, empatada con ${lider.nombre}`,
      extra,
    };
  }, [esAdmin, miOficina, ranking, enJuego, hayMovimiento]);

  const irAEstadisticas = () => {
    guardarPref("estadisticas.tab", "nuevas");
    navigate("/estadisticas");
  };

  const mes = r?.mes || mesActual();
  const hoyT = r?.totales?.hoy;

  return (
    <section
      aria-label="Ranking de oficinas del mes"
      className="rounded-xl border-2 border-oficina-fuerte/70 bg-card dark:bg-card-dark p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-oficina/15 text-oficina-fuerte dark:text-oficina-claro">
            <HiTrendingUp className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">
              Ranking de oficinas · {nombreMesSolo(mes)}
            </h2>
            <p className="text-[12px] text-suave dark:text-suave-dark">
              Crecimiento neto: entraron − se fueron{r ? ` · del 1 al ${dayjs(r.hasta).date()}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {r?.en_curso && (
            <span className="rounded-full bg-oficina/15 px-3 py-1 text-[12px] font-semibold text-oficina-fuerte dark:text-oficina-claro">
              Hoy: entraron {hoyT?.entraron ?? hoyT?.nuevas ?? 0} · {hoyT?.se_fueron === 1 ? "se fue" : "se fueron"} {hoyT?.se_fueron ?? 0}
            </span>
          )}
          {esAdmin && (
            <button
              type="button"
              onClick={irAEstadisticas}
              className="flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-oficina-fuerte hover:underline dark:text-oficina-claro"
            >
              Ver detalle <HiArrowRight className="h-4 w-4" />
            </button>
          )}
          <Link
            to="/ranking"
            state={{ vista: "oficinas" }}
            className="flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-oficina-fuerte hover:underline dark:text-oficina-claro"
          >
            Ver ranking <HiArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {error && !r ? (
        <div className="mt-4 flex items-center gap-3 text-[13px] text-egreso-fuerte dark:text-egreso-claro">
          {error}
          <button type="button" onClick={() => recargar()} className="font-semibold underline">
            Reintentar
          </button>
        </div>
      ) : !r ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[112px] animate-pulse rounded-xl bg-surface dark:bg-surface-dark" />
          ))}
        </div>
      ) : (
        <>
          <div className={`mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 transition-opacity ${cargando ? "opacity-70" : ""}`}>
            {ranking.map((o, i) => {
              const c = colorOficina(r.oficinas, o.id);
              const dd = delta(o.neto, o.antes?.neto);
              const mia = !esAdmin && String(o.id) === String(miOficina);
              const neto = Number(o.neto || 0);
              return (
                <div
                  key={o.id}
                  style={varsColor(c)}
                  className={`flex flex-col gap-2 rounded-xl border p-3 sm:p-4 ${
                    mia
                      ? "border-2 border-[color:var(--of-base)] bg-[color:var(--of-base)]/5"
                      : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-[color:var(--of-txt)] dark:text-[color:var(--of-claro)]"
                      style={{ backgroundColor: `${c.base}22` }}
                    >
                      {o.sinMovimiento ? "–" : `${i + 1}º`}
                    </span>
                    <span className="truncate text-[14px] font-bold text-[color:var(--of-txt)] dark:text-[color:var(--of-claro)]">{o.nombre}</span>
                    {mia && (
                      <span className="shrink-0 rounded-full bg-[color:var(--of-base)] px-2 py-0.5 text-[10px] font-bold text-white">Tu oficina</span>
                    )}
                    {i === 0 && hayMovimiento && !o.sinMovimiento && (
                      <HiStar className="h-5 w-5 shrink-0 text-[#d97706] dark:text-tarjeta-claro sm:ml-auto" aria-label="Va primera" />
                    )}
                    <span className={`ml-auto text-[26px] font-extrabold leading-none tabular-nums sm:hidden ${tonoNeto(neto)}`}>{conSigno(neto)}</span>
                  </div>
                  <div className="hidden items-baseline gap-2 sm:flex">
                    <span className={`text-[36px] font-extrabold leading-none tabular-nums ${tonoNeto(neto)}`}>{conSigno(neto)}</span>
                    <span className={`text-[12px] font-semibold ${TONO_DELTA[dd.tono]}`}>
                      {dd.txt} {comparacion}
                    </span>
                  </div>
                  <BarraBalance entraron={o.entraron} seFueron={o.se_fueron} />
                  {o.sinMovimiento ? (
                    <span className="text-[12px] text-suave dark:text-suave-dark">Sin movimiento este mes</span>
                  ) : (
                    <span className="text-[12px] text-suave dark:text-suave-dark">
                      <span className={`sm:hidden font-semibold ${TONO_DELTA[dd.tono]}`}>{dd.txt} · </span>
                      entraron <strong className="text-titulo dark:text-titulo-dark">{o.entraron}</strong> · se fueron{" "}
                      <strong className="text-titulo dark:text-titulo-dark">{o.se_fueron}</strong> · retención {formatoRetencion(o.retencion)}
                      {r.en_curso ? ` · hoy ${conSigno(o.hoy?.neto)}` : ""}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {mensaje && (
            <p className="mt-3 rounded-lg border border-ingreso/25 bg-ingreso/[0.06] px-3 py-2 text-[13px] font-semibold text-ingreso-fuerte dark:text-ingreso-claro">
              {mensaje.txt}
              {mensaje.extra ? <span className="mt-0.5 block font-medium">💡 {mensaje.extra}</span> : null}
            </p>
          )}
        </>
      )}
    </section>
  );
}
