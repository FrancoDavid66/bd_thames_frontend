// src/components/recaudacion/EstadoCierresDia.jsx
// 🚀 Muestra, para un día, qué sucursales cerraron caja y cuáles NO.
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { HiCheckCircle, HiXCircle, HiCalendar } from "react-icons/hi";
import api from "../../services/api";

export default function EstadoCierresDia() {
  const [fecha, setFecha] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [data, setData] = useState({ oficinas: [], pendientes: [], cerraron: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let activo = true;
    setLoading(true);
    api
      .get("recaudacion/estado-dia/", { params: { fecha } })
      .then((res) => {
        if (activo) setData(res.data || { oficinas: [], pendientes: [], cerraron: 0, total: 0 });
      })
      .catch(() => {
        if (activo) setData({ oficinas: [], pendientes: [], cerraron: 0, total: 0 });
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, [fecha]);

  const todasCerraron = data.total > 0 && data.pendientes.length === 0;

  const estadoBadge = (estado) => {
    const map = {
      OK: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
      SOBRANTE: "bg-amber-500/15 text-amber-300 border-amber-500/40",
      FALTANTE: "bg-rose-500/15 text-rose-300 border-rose-500/40",
      PENDIENTE: "bg-sky-500/15 text-sky-300 border-sky-500/40",
    };
    return map[estado] || "bg-slate-700/30 text-slate-300 border-slate-600";
  };

  const esHoy = fecha === dayjs().format("YYYY-MM-DD");

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-sm sm:text-base font-bold text-slate-100">
          ¿Quién cerró caja {esHoy ? "hoy" : "ese día"}?
        </h3>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
          <HiCalendar className="text-slate-500 w-4 h-4 shrink-0" />
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="bg-transparent text-xs sm:text-sm text-slate-100 outline-none"
          />
          {!esHoy && (
            <button
              onClick={() => setFecha(dayjs().format("YYYY-MM-DD"))}
              className="text-[11px] text-sky-300 hover:text-sky-200 font-semibold"
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* Resumen grande */}
      {loading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : data.total === 0 ? (
        <p className="text-sm text-slate-500">No hay sucursales para mostrar.</p>
      ) : todasCerraron ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-emerald-300 text-sm font-semibold">
          <HiCheckCircle className="w-5 h-5 shrink-0" />
          Todas las sucursales cerraron caja ({data.cerraron}/{data.total}).
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-rose-300 text-sm font-semibold">
          <HiXCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>
            Faltan cerrar: {data.pendientes.join(", ")}.
            <span className="text-rose-300/70 font-normal"> ({data.cerraron}/{data.total} cerraron)</span>
          </span>
        </div>
      )}

      {/* Lista por sucursal */}
      {!loading && data.oficinas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.oficinas.map((o) => (
            <div
              key={o.oficina_id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                o.cerro ? "border-slate-800 bg-slate-900/50" : "border-rose-500/30 bg-rose-500/[0.06]"
              }`}
            >
              <span className="text-sm text-slate-200 truncate">{o.oficina_nombre}</span>
              {o.cerro ? (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${estadoBadge(o.estado)}`}>
                  {o.estado || "Cerró"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300">
                  <HiXCircle className="w-4 h-4" /> No cerró
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}