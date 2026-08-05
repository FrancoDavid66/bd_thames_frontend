// src/components/recaudacion/RankingCierres.jsx  (diseño Duo · responsive)
// 🚀 Ranking de cumplimiento: por oficina, cuántos días cerró de los que debía.
//    Toca una fila/tarjeta para ver las fechas exactas que faltaron.
//
// 📱 RESPONSIVE: la tabla tiene 6 columnas y no entra en 375px. En MOBILE cada
//    sucursal se muestra como TARJETA (con Cerró/Debía/Faltó y el % grande);
//    en DESKTOP (sm+) sigue siendo la tabla de siempre. Ambas comparten el
//    mismo estado `abierta` para expandir las fechas que faltaron.
import { useEffect, useMemo, useState, Fragment } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { HiChevronLeft, HiChevronRight, HiChevronDown } from "react-icons/hi";
import api from "../../services/api";

dayjs.locale("es");

function esDiaDeCaja(diaSemana, modo) {
  if (modo === "todos") return true;
  if (modo === "lunsab") return diaSemana >= 1 && diaSemana <= 6;
  return diaSemana >= 1 && diaSemana <= 5; // lunvie
}

export default function RankingCierres({ isAdmin = true }) {
  const [mes, setMes] = useState(() => dayjs().format("YYYY-MM"));
  const [modoDias, setModoDias] = useState("lunvie");
  const [oficinas, setOficinas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [abierta, setAbierta] = useState(null); // oficina_id expandida

  useEffect(() => {
    let activo = true;
    setLoading(true);
    api
      .get("recaudacion/ranking/", { params: { mes } })
      .then((res) => {
        if (activo) setOficinas(res.data?.oficinas || []);
      })
      .catch(() => {
        if (activo) setOficinas([]);
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, [mes]);

  // Cálculo de debía / cerró / faltó / % por oficina
  const filas = useMemo(() => {
    const inicio = dayjs(`${mes}-01`);
    const finMes = inicio.endOf("month");
    const hoy = dayjs().startOf("day");
    const tope = hoy.isBefore(finMes) ? hoy : finMes; // contamos hasta hoy (o fin de mes si ya pasó)

    return oficinas
      .map((o) => {
        const cerradoSet = new Set(o.dias_cerrados || []);
        let debia = 0;
        let cerro = 0;
        const faltantes = [];
        for (let d = 1; d <= finMes.date(); d++) {
          const fecha = inicio.date(d);
          if (fecha.isAfter(tope)) break; // no contamos días futuros
          if (!esDiaDeCaja(fecha.day(), modoDias)) continue; // no es día de caja
          debia += 1;
          const key = fecha.format("YYYY-MM-DD");
          if (cerradoSet.has(key)) cerro += 1;
          else faltantes.push(key);
        }
        const falto = debia - cerro;
        const pct = debia > 0 ? Math.round((cerro / debia) * 100) : null;
        return {
          id: o.oficina_id,
          nombre: o.oficina_nombre,
          debia,
          cerro,
          falto,
          pct,
          faltantes,
        };
      })
      .sort((a, b) => {
        if (a.pct === null) return 1;
        if (b.pct === null) return -1;
        return a.pct - b.pct;
      });
  }, [oficinas, mes, modoDias]);

  const mesLabel = dayjs(`${mes}-01`).format("MMMM YYYY");
  const irMes = (delta) => setMes(dayjs(`${mes}-01`).add(delta, "month").format("YYYY-MM"));

  const pctColor = (pct) => {
    if (pct === null) return "text-suave dark:text-suave-dark";
    if (pct >= 90) return "text-ingreso dark:text-ingreso-claro";
    if (pct >= 70) return "text-tarjeta";
    return "text-egreso dark:text-egreso-claro";
  };
  const pctDot = (pct) => {
    if (pct === null) return "bg-suave/40 dark:bg-suave-dark/40";
    if (pct >= 90) return "bg-ingreso";
    if (pct >= 70) return "bg-tarjeta";
    return "bg-egreso";
  };

  return (
    <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5 space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-black text-titulo dark:text-titulo-dark">Cumplimiento de cierres por sucursal</h3>
          <p className="text-[11px] font-bold text-suave dark:text-suave-dark mt-0.5">Tocá una fila para ver las fechas que faltaron</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => irMes(-1)} className="p-2 rounded-xl bg-surface dark:bg-surface-dark hover:brightness-95 text-suave dark:text-suave-dark transition-colors">
            <HiChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 text-xs sm:text-sm font-black text-titulo dark:text-titulo-dark capitalize min-w-[120px] text-center">
            {mesLabel}
          </span>
          <button onClick={() => irMes(1)} className="p-2 rounded-xl bg-surface dark:bg-surface-dark hover:brightness-95 text-suave dark:text-suave-dark transition-colors">
            <HiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selector de días de caja */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-suave dark:text-suave-dark">Días de caja:</span>
        <div className="flex gap-1">
          {[
            { id: "lunvie", label: "Lun-Vie" },
            { id: "lunsab", label: "Lun-Sáb" },
            { id: "todos", label: "Todos" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setModoDias(opt.id)}
              className={`px-3 py-1.5 text-[11px] font-black rounded-xl border-2 transition-colors ${
                modoDias === opt.id
                  ? "bg-oficina/15 border-oficina/40 text-oficina dark:text-oficina-claro"
                  : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:border-oficina"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla / Tarjetas */}
      {loading ? (
        <p className="text-sm font-bold text-suave dark:text-suave-dark">Cargando...</p>
      ) : filas.length === 0 ? (
        <p className="text-sm font-bold text-suave dark:text-suave-dark">No hay sucursales para mostrar.</p>
      ) : (
      <>
        {/* 📱 MOBILE: tarjetas (oculto en sm+) */}
        <div className="sm:hidden flex flex-col gap-2.5">
          {filas.map((f) => {
            const exp = abierta === f.id;
            return (
              <div key={f.id} className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAbierta(exp ? null : f.id)}
                  className="w-full text-left p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-black text-titulo dark:text-titulo-dark truncate">{f.nombre}</span>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 text-lg font-black ${pctColor(f.pct)}`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${pctDot(f.pct)}`} />
                      {f.pct === null ? "—" : `${f.pct}%`}
                    </span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-2 py-1.5 text-center">
                      <div className="text-[10px] font-black uppercase text-suave dark:text-suave-dark">Cerró</div>
                      <div className="font-mono font-black text-titulo dark:text-titulo-dark">{f.cerro}</div>
                    </div>
                    <div className="rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-2 py-1.5 text-center">
                      <div className="text-[10px] font-black uppercase text-suave dark:text-suave-dark">Debía</div>
                      <div className="font-mono font-black text-suave dark:text-suave-dark">{f.debia}</div>
                    </div>
                    <div className="rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-2 py-1.5 text-center">
                      <div className="text-[10px] font-black uppercase text-suave dark:text-suave-dark">Faltó</div>
                      <div className={`font-mono font-black ${f.falto > 0 ? "text-egreso dark:text-egreso-claro" : "text-suave dark:text-suave-dark"}`}>{f.falto}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-1 text-[11px] font-black text-suave dark:text-suave-dark">
                    {exp ? "Ocultar fechas" : "Ver fechas que faltaron"}
                    <HiChevronDown className={`w-4 h-4 transition-transform ${exp ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {exp && (
                  <div className="px-3 pb-3 border-t-2 border-linea dark:border-linea-dark pt-3">
                    {f.faltantes.length === 0 ? (
                      <p className="text-xs font-black text-ingreso dark:text-ingreso-claro">✅ No faltó ningún día de caja este mes.</p>
                    ) : (
                      <div>
                        <p className="text-[11px] font-bold text-suave dark:text-suave-dark mb-2.5">
                          Días que <span className="text-egreso dark:text-egreso-claro font-black">no cerró</span> ({f.faltantes.length}):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {f.faltantes.map((d) => (
                            <span key={d} className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border-2 border-egreso/30 bg-egreso/10 text-egreso dark:text-egreso-claro">
                              {dayjs(d).format("ddd DD/MM")}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 💻 DESKTOP: tabla (oculto en mobile) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-suave dark:text-suave-dark border-b-2 border-linea dark:border-linea-dark">
                <th className="text-left font-black py-2.5 px-2">Sucursal</th>
                <th className="text-center font-black py-2.5 px-2">Cerró</th>
                <th className="text-center font-black py-2.5 px-2">Debía</th>
                <th className="text-center font-black py-2.5 px-2">Faltó</th>
                <th className="text-right font-black py-2.5 px-2">Cumplimiento</th>
                <th className="w-6"></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const exp = abierta === f.id;
                return (
                  <Fragment key={f.id}>
                    <tr
                      onClick={() => setAbierta(exp ? null : f.id)}
                      className="border-b-2 border-linea/60 dark:border-linea-dark/60 hover:bg-surface dark:hover:bg-surface-dark cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-2 text-titulo dark:text-titulo-dark font-black">{f.nombre}</td>
                      <td className="py-3 px-2 text-center text-titulo dark:text-titulo-dark font-mono font-bold">{f.cerro}</td>
                      <td className="py-3 px-2 text-center text-suave dark:text-suave-dark font-mono font-bold">{f.debia}</td>
                      <td className={`py-3 px-2 text-center font-mono font-black ${f.falto > 0 ? "text-egreso dark:text-egreso-claro" : "text-suave dark:text-suave-dark"}`}>
                        {f.falto}
                      </td>
                      <td className={`py-3 px-2 text-right font-black ${pctColor(f.pct)}`}>
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${pctDot(f.pct)}`} />
                          {f.pct === null ? "—" : `${f.pct}%`}
                        </span>
                      </td>
                      <td className="text-center text-suave dark:text-suave-dark">
                        <HiChevronDown className={`w-4 h-4 inline transition-transform ${exp ? "rotate-180" : ""}`} />
                      </td>
                    </tr>
                    {exp && (
                      <tr key={`${f.id}-det`} className="bg-surface dark:bg-surface-dark">
                        <td colSpan={6} className="px-3 py-3.5">
                          {f.faltantes.length === 0 ? (
                            <p className="text-xs font-black text-ingreso dark:text-ingreso-claro">✅ No faltó ningún día de caja este mes.</p>
                          ) : (
                            <div>
                              <p className="text-[11px] font-bold text-suave dark:text-suave-dark mb-2.5">
                                Días que <span className="text-egreso dark:text-egreso-claro font-black">no cerró</span> ({f.faltantes.length}):
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {f.faltantes.map((d) => (
                                  <span key={d} className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border-2 border-egreso/30 bg-egreso/10 text-egreso dark:text-egreso-claro">
                                    {dayjs(d).format("ddd DD/MM")}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
      )}
    </div>
  );
}
