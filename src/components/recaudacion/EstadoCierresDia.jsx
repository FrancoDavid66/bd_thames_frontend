// src/components/recaudacion/EstadoCierresDia.jsx
// Muestra, para un día, qué sucursales cerraron caja y cuáles NO.
// 📱 RESPONSIVE: el selector de fecha y el botón "Hoy" con tap target ≥44px, y la
//    lista de sucursales usa 1 columna en celu (2 desde sm).
import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { HiCheckCircle, HiXCircle, HiCalendar } from "react-icons/hi";
import api from "../../services/api";
import useDatosVivos from "../../hooks/useDatosVivos";

export default function EstadoCierresDia() {
  const [fecha, setFecha] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [data, setData] = useState({ oficinas: [], pendientes: [], cerraron: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  // 📡 EN VIVO: cuando una sucursal cierra caja, se tilda sola acá (sin "Cargando...").
  const [vivo, setVivo] = useState(0);
  const silenciosoRef = useRef(false);
  useDatosVivos(["recaudacion"], () => {
    silenciosoRef.current = true;
    setVivo((n) => n + 1);
  });

  useEffect(() => {
    let activo = true;
    const silencioso = silenciosoRef.current;
    silenciosoRef.current = false;
    if (!silencioso) setLoading(true);
    api
      .get("recaudacion/estado-dia/", { params: { fecha } })
      .then((res) => {
        if (activo) setData(res.data || { oficinas: [], pendientes: [], cerraron: 0, total: 0 });
      })
      .catch(() => {
        // En una recarga EN VIVO que falla, se queda lo que ya se veía.
        if (activo && !silencioso) setData({ oficinas: [], pendientes: [], cerraron: 0, total: 0 });
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, [fecha, vivo]);

  const todasCerraron = data.total > 0 && data.pendientes.length === 0;

  const estadoBadge = (estado) => {
    const map = {
      OK: "bg-ingreso/10 text-ingreso dark:text-ingreso-claro border-ingreso/30",
      SOBRANTE: "bg-tarjeta/10 text-tarjeta dark:text-tarjeta-claro border-tarjeta/30",
      FALTANTE: "bg-egreso/10 text-egreso dark:text-egreso-claro border-egreso/30",
      PENDIENTE: "bg-oficina/10 text-oficina dark:text-oficina-claro border-oficina/30",
    };
    return map[estado] || "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark";
  };

  const esHoy = fecha === dayjs().format("YYYY-MM-DD");

  return (
    <div className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5 space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-sm sm:text-base font-semibold text-titulo dark:text-titulo-dark">
          ¿Quién cerró caja {esHoy ? "hoy" : "ese día"}?
        </h3>
        <div className="flex items-center gap-2 rounded-lg border border-linea dark:border-linea-dark px-3 h-11 focus-within:border-oficina transition-colors">
          <HiCalendar className="text-oficina w-4 h-4 shrink-0" />
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-base sm:text-sm text-titulo dark:text-titulo-dark outline-none dark:[color-scheme:dark]"
          />
          {!esHoy && (
            <button
              onClick={() => setFecha(dayjs().format("YYYY-MM-DD"))}
              className="shrink-0 text-[11px] text-oficina hover:opacity-80 font-medium px-1"
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* Resumen grande */}
      {loading ? (
        <p className="text-sm text-suave dark:text-suave-dark">Cargando...</p>
      ) : data.total === 0 ? (
        <p className="text-sm text-suave dark:text-suave-dark">No hay sucursales para mostrar.</p>
      ) : todasCerraron ? (
        <div className="flex items-center gap-2 rounded-xl border border-ingreso/30 bg-ingreso/10 px-3 py-3 text-ingreso dark:text-ingreso-claro text-sm font-medium">
          <HiCheckCircle className="w-5 h-5 shrink-0" />
          Todas las sucursales cerraron caja ({data.cerraron}/{data.total}).
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-xl border border-egreso/30 bg-egreso/10 px-3 py-3 text-egreso dark:text-egreso-claro text-sm font-medium">
          <HiXCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>
            Faltan cerrar: {data.pendientes.join(", ")}.
            <span className="text-suave dark:text-suave-dark font-normal"> ({data.cerraron}/{data.total} cerraron)</span>
          </span>
        </div>
      )}

      {/* Lista por sucursal */}
      {!loading && data.oficinas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {data.oficinas.map((o) => (
            <div
              key={o.oficina_id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                o.cerro
                  ? "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark"
                  : "border-egreso/30 bg-egreso/5"
              }`}
            >
              <span className="text-sm font-medium text-titulo dark:text-titulo-dark truncate">{o.oficina_nombre}</span>
              {o.cerro ? (
                <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full border ${estadoBadge(o.estado)}`}>
                  {o.estado || "Cerró"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-egreso dark:text-egreso-claro">
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
