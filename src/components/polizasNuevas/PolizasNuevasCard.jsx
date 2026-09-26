// src/components/polizasNuevas/PolizasNuevasCard.jsx
// ============================================================
// 🏁 Cartel del Inicio: "Pólizas nuevas · Septiembre".
//
// El puesto de cada oficina en el mes (pólizas nuevas, sin renovaciones),
// cuánto sube o baja contra los mismos días del mes anterior, "Hoy" y
// cuántas ya pagaron la 1ª cuota. Todos ven los números de todas las
// oficinas (es un ranking); el empleado ve la suya resaltada.
// Se actualiza solo (en vivo).
// ============================================================
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { HiDocumentAdd, HiArrowRight, HiStar } from "react-icons/hi";

import { useAuth } from "../../context/AuthContext";
import { useNuevasMes } from "../../hooks/usePolizasNuevas";
import { colorOficina, varsColor, ordenarPorMetrica, delta, nombreMesSolo, etiquetaComparacion, guardarPref, mesActual } from "./comun";

const TONO_DELTA = {
  sube: "text-ingreso-fuerte dark:text-ingreso-claro",
  baja: "text-egreso-fuerte dark:text-egreso-claro",
  igual: "text-suave dark:text-suave-dark",
};

export default function PolizasNuevasCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const esAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN" || !!user?.is_superuser;
  const miOficina = user?.perfil?.oficina?.id ?? user?.perfil?.oficina ?? null;

  const { data: r, cargando, error, recargar } = useNuevasMes("");
  const ranking = useMemo(() => ordenarPorMetrica(r?.oficinas, "nuevas"), [r]);
  const lider = ranking.length ? Number(ranking[0].nuevas || 0) : 0;
  const comparacion = etiquetaComparacion(r);

  // Mensaje para el empleado: "Axión va 2ª, a 4 de 5 Esquinas".
  const mensaje = useMemo(() => {
    if (esAdmin || miOficina === null || !ranking.length) return null;
    const i = ranking.findIndex((o) => String(o.id) === String(miOficina));
    if (i < 0) return null;
    const yo = ranking[i];
    if (!lider) return { txt: "Todavía nadie cargó pólizas nuevas este mes: ¡la primera arranca la carrera!", pos: i };
    if (i === 0) {
      const segundo = ranking[1];
      const ventaja = segundo ? Number(yo.nuevas) - Number(segundo.nuevas) : null;
      return {
        txt: ventaja ? `${yo.nombre} va 1ª, le saca ${ventaja} a ${segundo.nombre}` : `${yo.nombre} va 1ª`,
        pos: i,
      };
    }
    const faltan = lider - Number(yo.nuevas || 0);
    return {
      txt: faltan > 0 ? `${yo.nombre} va ${i + 1}ª, a ${faltan} de ${ranking[0].nombre}` : `${yo.nombre} va ${i + 1}ª, empatada con ${ranking[0].nombre}`,
      pos: i,
    };
  }, [esAdmin, miOficina, ranking, lider]);

  const irAEstadisticas = () => {
    guardarPref("estadisticas.tab", "nuevas");
    navigate("/estadisticas");
  };

  const mes = r?.mes || mesActual();

  return (
    <section
      aria-label="Pólizas nuevas del mes"
      className="rounded-xl border-2 border-oficina-fuerte/70 bg-card dark:bg-card-dark p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-oficina/15 text-oficina-fuerte dark:text-oficina-claro">
            <HiDocumentAdd className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">
              Pólizas nuevas · {nombreMesSolo(mes)}
            </h2>
            <p className="text-[12px] text-suave dark:text-suave-dark">
              {r ? `Del 1 al ${dayjs(r.hasta).date()} · sin contar renovaciones` : "Sin contar renovaciones"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {r?.en_curso && (
            <span className="rounded-full bg-oficina/15 px-3 py-1 text-[12px] font-semibold text-oficina-fuerte dark:text-oficina-claro">
              Hoy: {r.totales?.hoy?.nuevas ?? 0} {r.totales?.hoy?.nuevas === 1 ? "nueva" : "nuevas"}
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
              const dd = delta(o.nuevas, o.antes?.nuevas);
              const mia = !esAdmin && String(o.id) === String(miOficina);
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
                      {i + 1}º
                    </span>
                    <span className="truncate text-[14px] font-bold text-[color:var(--of-txt)] dark:text-[color:var(--of-claro)]">{o.nombre}</span>
                    {mia && (
                      <span className="shrink-0 rounded-full bg-[color:var(--of-base)] px-2 py-0.5 text-[10px] font-bold text-white">Tu oficina</span>
                    )}
                    {i === 0 && lider > 0 && <HiStar className="h-5 w-5 shrink-0 text-[#d97706] dark:text-tarjeta-claro sm:ml-auto" aria-label="Va primera" />}
                    <span className="ml-auto text-[26px] font-extrabold leading-none tabular-nums text-titulo dark:text-titulo-dark sm:hidden">{o.nuevas}</span>
                  </div>
                  <div className="hidden items-baseline gap-2 sm:flex">
                    <span className="text-[36px] font-extrabold leading-none tabular-nums text-titulo dark:text-titulo-dark">{o.nuevas}</span>
                    <span className={`text-[12px] font-semibold ${TONO_DELTA[dd.tono]}`}>
                      {dd.txt} {comparacion}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-titulo/5 dark:bg-white/10">
                    <div className="h-2 rounded-full" style={{ width: `${lider ? Math.max(4, Math.round((o.nuevas * 100) / lider)) : 0}%`, background: c.base }} />
                  </div>
                  <span className="text-[12px] text-suave dark:text-suave-dark">
                    <span className={`sm:hidden font-semibold ${TONO_DELTA[dd.tono]}`}>{dd.txt} · </span>
                    {o.pagaron} ya {o.pagaron === 1 ? "pagó" : "pagaron"} la 1ª cuota
                    {r.en_curso ? ` · hoy ${o.hoy?.nuevas ?? 0}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
          {mensaje && (
            <p className="mt-3 rounded-lg border border-ingreso/25 bg-ingreso/[0.06] px-3 py-2 text-[13px] font-semibold text-ingreso-fuerte dark:text-ingreso-claro">
              {mensaje.txt}
            </p>
          )}
        </>
      )}
    </section>
  );
}
