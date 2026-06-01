// src/components/recaudacion/RankingCierres.jsx
// 🚀 Ranking de cumplimiento: por oficina, cuántos días cerró de los que debía.
//    Toca una fila para ver las fechas exactas que faltaron.
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
        // peor cumplimiento primero; los sin datos (pct null) al final
        if (a.pct === null) return 1;
        if (b.pct === null) return -1;
        return a.pct - b.pct;
      });
  }, [oficinas, mes, modoDias]);

  const mesLabel = dayjs(`${mes}-01`).format("MMMM YYYY");
  const irMes = (delta) => setMes(dayjs(`${mes}-01`).add(delta, "month").format("YYYY-MM"));

  const pctColor = (pct) => {
    if (pct === null) return "text-slate-500";
    if (pct >= 90) return "text-emerald-300";
    if (pct >= 70) return "text-amber-300";
    return "text-rose-300";
  };
  const pctDot = (pct) => {
    if (pct === null) return "⚪";
    if (pct >= 90) return "🟢";
    if (pct >= 70) return "🟡";
    return "🔴";
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100">Cumplimiento de cierres por sucursal</h3>
          <p className="text-[11px] text-slate-500">Tocá una fila para ver las fechas que faltaron</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button onClick={() => irMes(-1)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
            <HiChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 text-xs sm:text-sm font-semibold text-slate-200 capitalize min-w-[120px] text-center">
            {mesLabel}
          </span>
          <button onClick={() => irMes(1)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
            <HiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selector de días de caja */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-500">Días de caja:</span>
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          {[
            { id: "lunvie", label: "Lun-Vie" },
            { id: "lunsab", label: "Lun-Sáb" },
            { id: "todos", label: "Todos" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setModoDias(opt.id)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                modoDias === opt.id ? "bg-sky-500/20 text-sky-300" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : filas.length === 0 ? (
        <p className="text-sm text-slate-500">No hay sucursales para mostrar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="text-left py-2 px-2">Sucursal</th>
                <th className="text-center py-2 px-2">Cerró</th>
                <th className="text-center py-2 px-2">Debía</th>
                <th className="text-center py-2 px-2">Faltó</th>
                <th className="text-right py-2 px-2">Cumplimiento</th>
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
                      className="border-b border-slate-800/60 hover:bg-slate-900/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-2 text-slate-200 font-medium">{f.nombre}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300 font-mono">{f.cerro}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400 font-mono">{f.debia}</td>
                      <td className={`py-2.5 px-2 text-center font-mono font-bold ${f.falto > 0 ? "text-rose-300" : "text-slate-500"}`}>
                        {f.falto}
                      </td>
                      <td className={`py-2.5 px-2 text-right font-black ${pctColor(f.pct)}`}>
                        {pctDot(f.pct)} {f.pct === null ? "—" : `${f.pct}%`}
                      </td>
                      <td className="text-center text-slate-500">
                        <HiChevronDown className={`w-4 h-4 inline transition-transform ${exp ? "rotate-180" : ""}`} />
                      </td>
                    </tr>
                    {exp && (
                      <tr key={`${f.id}-det`} className="bg-slate-900/40">
                        <td colSpan={6} className="px-3 py-3">
                          {f.faltantes.length === 0 ? (
                            <p className="text-xs text-emerald-300">✅ No faltó ningún día de caja este mes.</p>
                          ) : (
                            <div>
                              <p className="text-[11px] text-slate-400 mb-2">
                                Días que <span className="text-rose-300 font-semibold">no cerró</span> ({f.faltantes.length}):
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {f.faltantes.map((d) => (
                                  <span key={d} className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-rose-500/30 bg-rose-500/[0.08] text-rose-300">
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
      )}
    </div>
  );
}