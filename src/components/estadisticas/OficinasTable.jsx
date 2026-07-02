// src/components/estadisticas/OficinasTable.jsx
import { motion } from "framer-motion";
import { HiOfficeBuilding } from "react-icons/hi";
import AnimatedCard from "./AnimatedCard";

export default function OficinasTable({
  oficinasData,
  getOficinaNombre,
  formatMixPercent,
}) {
  return (
    <AnimatedCard
      index={7}
      interactive={false}
      glow="from-indigo-500/50 via-sky-500/25 to-transparent"
    >
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-100">
            <HiOfficeBuilding className="text-sky-300" />
            <span>Detalle por oficina</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {oficinasData.length} oficinas encontradas
          </span>
        </div>

        {oficinasData.length === 0 ? (
          <div className="px-1 py-4 text-xs sm:text-sm text-slate-400">
            No hay datos para los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-300">
                    Oficina
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-300">
                    Pólizas totales
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-emerald-300">
                    Al día
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-emerald-200">
                    Altas mes
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-rose-200">
                    Bajas (Canceladas)
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-orange-200">
                    En Mora (Vencidas)
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-200">
                    Churn %
                  </th>
                </tr>
              </thead>
              <tbody>
                {oficinasData.map((o, idx) => {
                  const totalOf = Number(o.polizas_total || 0);
                  const bajasOf = Number(o.bajas_mes || 0);
                  const vencidasOf = Number(o.en_mora || o.vencidas_mes || 0);
                  
                  const mixCob = o.por_cobertura || {};
                  const mixComp = o.por_compania || {};
                  const antig = o.antiguedad || {};
                  
                  const churnPct = totalOf > 0 ? ((bajasOf + vencidasOf) / totalOf) * 100 : 0;

                  // 🚀 FIX: OBLIGAMOS AL SISTEMA A USAR EL NOMBRE REAL DE LA BASE DE DATOS
                  const oficinaNombre = getOficinaNombre ? getOficinaNombre(o.oficina) : (o.oficina_nombre || o.oficina || "—");

                  const cobKeys = Object.keys(mixCob);
                  const cobResumen = cobKeys
                    .slice(0, 3)
                    .map((k) => `${k}: ${formatMixPercent(mixCob[k], totalOf)}`)
                    .join(" · ");

                  const compKeys = Object.keys(mixComp);
                  const compResumen = compKeys
                    .slice(0, 3)
                    .map((k) => {
                      const count = Number(mixComp[k] || 0);
                      const pct = formatMixPercent(count, totalOf);
                      return `${k}: ${count} (${pct})`;
                    })
                    .join(" · ");

                  const antigResumenParts = [];
                  if (antig["0_1"]) antigResumenParts.push(`0–1: ${antig["0_1"]}`);
                  if (antig["1_3"]) antigResumenParts.push(`1–3: ${antig["1_3"]}`);
                  if (antig["3_5"]) antigResumenParts.push(`3–5: ${antig["3_5"]}`);
                  if (antig["5_plus"]) antigResumenParts.push(`5+: ${antig["5_plus"]}`);
                  const antigResumen = antigResumenParts.join(" · ");

                  let churnColor = "text-slate-100";
                  if (churnPct >= 5 && churnPct < 10) churnColor = "text-amber-300";
                  else if (churnPct >= 10) churnColor = "text-rose-300";
                  else if (churnPct > 0 && churnPct < 5) churnColor = "text-emerald-300";

                  return (
                    <motion.tr
                      key={`${o.oficina || "SIN"}-${idx}`}
                      className={idx % 2 === 0 ? "bg-slate-900/40" : "bg-slate-900/10"}
                      whileHover={{ backgroundColor: "rgba(15,23,42,0.95)" }}
                      transition={{ duration: 0.15 }}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-slate-100 align-top">
                        {/* El Nombre Principal */}
                        <div className="font-semibold text-sky-400">{oficinaNombre}</div>
                        
                        {/* El Código/ID chiquito abajo */}
                        {o.oficina && String(o.oficina) !== "SIN_OFICINA" && String(o.oficina) !== "OTRAS" ? (
                          <div className="mt-0.5 text-[10px] text-slate-500">
                            Código / ID: {String(o.oficina)}
                          </div>
                        ) : null}

                        <div className="mt-1.5 text-[10px] text-slate-400 space-y-0.5">
                          {cobResumen && <div>Coberturas: {cobResumen}</div>}
                          {compResumen && <div>Compañías: {compResumen}</div>}
                          {antigResumen && <div>Antigüedad (años): {antigResumen}</div>}
                        </div>
                      </td>

                      <td className="px-3 py-2 text-right text-slate-100 align-top font-bold">
                        {totalOf.toLocaleString("es-AR")}
                      </td>
                      {/* Al día — activas SIN cuotas vencidas */}
                      <td className="px-3 py-2 text-right align-top">
                        <span className="font-bold text-emerald-400">
                          {(o.activas_al_dia ?? o.polizas_activas ?? 0).toLocaleString("es-AR")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-200 align-top">
                        {(o.nuevas_mes || 0).toLocaleString("es-AR")}
                      </td>
                      <td className="px-3 py-2 text-right text-rose-200 align-top">
                        {bajasOf.toLocaleString("es-AR")}
                      </td>
                      <td className="px-3 py-2 text-right text-orange-300 align-top font-bold">
                        {vencidasOf.toLocaleString("es-AR")}
                      </td>
                      <td className={`px-3 py-2 text-right align-top font-black tracking-widest ${churnColor}`}>
                        {churnPct.toFixed(1)}%
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AnimatedCard>
  );
}