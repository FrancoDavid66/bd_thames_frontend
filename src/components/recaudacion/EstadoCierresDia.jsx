// src/components/recaudacion/EstadoCierresDia.jsx  (diseño Duo)
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
      OK: "bg-ingreso/10 text-ingreso dark:text-ingreso-claro border-ingreso/40",
      SOBRANTE: "bg-tarjeta/10 text-tarjeta dark:text-tarjeta-claro border-tarjeta/40",
      FALTANTE: "bg-egreso/10 text-egreso dark:text-egreso-claro border-egreso/40",
      PENDIENTE: "bg-oficina/10 text-oficina dark:text-oficina-claro border-oficina/40",
    };
    return map[estado] || "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark";
  };

  const esHoy = fecha === dayjs().format("YYYY-MM-DD");

  return (
    <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5 space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-sm sm:text-base font-black text-titulo dark:text-titulo-dark">
          ¿Quién cerró caja {esHoy ? "hoy" : "ese día"}?
        </h3>
        <div className="flex items-center gap-2 rounded-xl border-2 border-linea dark:border-linea-dark px-2.5 py-1.5 focus-within:border-oficina transition-colors">
          <HiCalendar className="text-oficina w-4 h-4 shrink-0" />
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="bg-transparent text-xs sm:text-sm font-bold text-titulo dark:text-titulo-dark outline-none dark:[color-scheme:dark]"
          />
          {!esHoy && (
            <button
              onClick={() => setFecha(dayjs().format("YYYY-MM-DD"))}
              className="text-[11px] text-oficina hover:opacity-80 font-black"
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* Resumen grande */}
      {loading ? (
        <p className="text-sm font-bold text-suave dark:text-suave-dark">Cargando...</p>
      ) : data.total === 0 ? (
        <p className="text-sm font-bold text-suave dark:text-suave-dark">No hay sucursales para mostrar.</p>
      ) : todasCerraron ? (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-ingreso/40 bg-ingreso/10 px-3 py-3 text-ingreso dark:text-ingreso-claro text-sm font-black">
          <HiCheckCircle className="w-5 h-5 shrink-0" />
          Todas las sucursales cerraron caja ({data.cerraron}/{data.total}).
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-2xl border-2 border-egreso/40 bg-egreso/10 px-3 py-3 text-egreso dark:text-egreso-claro text-sm font-black">
          <HiXCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>
            Faltan cerrar: {data.pendientes.join(", ")}.
            <span className="text-suave dark:text-suave-dark font-bold"> ({data.cerraron}/{data.total} cerraron)</span>
          </span>
        </div>
      )}

      {/* Lista por sucursal */}
      {!loading && data.oficinas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {data.oficinas.map((o) => (
            <div
              key={o.oficina_id}
              className={`flex items-center justify-between rounded-xl border-2 px-3 py-2.5 ${
                o.cerro
                  ? "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark"
                  : "border-egreso/40 bg-egreso/5"
              }`}
            >
              <span className="text-sm font-bold text-titulo dark:text-titulo-dark truncate">{o.oficina_nombre}</span>
              {o.cerro ? (
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border-2 ${estadoBadge(o.estado)}`}>
                  {o.estado || "Cerró"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-egreso dark:text-egreso-claro">
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
