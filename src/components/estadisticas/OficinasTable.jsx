// src/components/estadisticas/OficinasTable.jsx
import { motion } from "framer-motion";
import { HiOfficeBuilding } from "react-icons/hi";

function ChurnBadge({ pct }) {
  if (pct === 0) return <span className="text-slate-600 tabular-nums text-xs">0%</span>;
  if (pct < 5)   return <span className="text-emerald-400 font-medium tabular-nums text-xs">{pct.toFixed(1)}%</span>;
  if (pct < 10)  return <span className="text-amber-400 font-semibold tabular-nums text-xs">{pct.toFixed(1)}%</span>;
  return <span className="text-rose-400 font-bold tabular-nums text-xs">{pct.toFixed(1)}%</span>;
}

function MiniBar({ value, total, color }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="h-1 w-14 rounded-full bg-slate-800 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

export default function OficinasTable({ oficinasData, getOficinaNombre, formatMixPercent }) {
  if (!oficinasData?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/50">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <HiOfficeBuilding className="text-sky-400 text-sm" />
          <span className="text-xs font-semibold text-slate-200">Detalle por oficina</span>
        </div>
        <span className="text-[10px] text-slate-600">{oficinasData.length} {oficinasData.length === 1 ? "oficina" : "oficinas"}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800/60 bg-slate-950/30">
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Oficina</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Activas</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Altas nuevas</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-rose-600">Bajas</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-amber-600">En mora</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Churn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {oficinasData.map((o, idx) => {
              const total   = Number(o.polizas_total   || 0);
              const activas = Number(o.polizas_activas  || 0);
              const altas   = Number(o.altas_nuevas_mes ?? o.nuevas_mes ?? 0);
              const bajas   = Number(o.bajas_mes        || 0);
              const mora    = Number(o.en_mora || o.vencidas_mes || 0);
              const churn   = total > 0 ? ((bajas + mora) / total) * 100 : 0;
              const nombre  = getOficinaNombre ? getOficinaNombre(o.oficina) : (o.oficina_nombre || o.oficina || "—");

              const compTop = Object.entries(o.por_compania || {})
                .sort(([,a],[,b]) => b - a).slice(0, 2)
                .map(([k, v]) => `${k} ${formatMixPercent(v, total)}`).join(" · ");

              return (
                <motion.tr
                  key={`${o.oficina}-${idx}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: idx * 0.04 }}
                  className="hover:bg-slate-800/25 transition-colors group"
                >
                  <td className="px-4 py-3.5 align-top min-w-[160px]">
                    <div className="font-semibold text-slate-100 text-xs">{nombre}</div>
                    {compTop && <div className="text-[10px] text-slate-600 mt-0.5">{compTop}</div>}
                  </td>
                  <td className="px-4 py-3.5 text-right align-middle">
                    <span className="font-semibold text-slate-200 tabular-nums">{total.toLocaleString("es-AR")}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right align-middle">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-slate-300 tabular-nums">{activas.toLocaleString("es-AR")}</span>
                      <MiniBar value={activas} total={total} color="bg-slate-500" />
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right align-middle">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-emerald-400 tabular-nums font-medium">{altas.toLocaleString("es-AR")}</span>
                      <MiniBar value={altas} total={total} color="bg-emerald-500" />
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right align-middle">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-rose-400 tabular-nums">{bajas.toLocaleString("es-AR")}</span>
                      <MiniBar value={bajas} total={total} color="bg-rose-500" />
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right align-middle">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-amber-400 tabular-nums font-semibold">{mora.toLocaleString("es-AR")}</span>
                      <MiniBar value={mora} total={total} color="bg-amber-500" />
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right align-middle">
                    <ChurnBadge pct={churn} />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}