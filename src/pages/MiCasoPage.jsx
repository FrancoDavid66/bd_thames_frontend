// src/pages/MiCasoPage.jsx
//
// 📁 "MI CASO" — página pública, sin login. La persona entra con el link
// único que le pasa la oficina/el abogado: /#/mi-caso/<token>
//
// Es la versión standalone, para quien NO tiene Portal del Asegurado (no
// paga cuponera, o no es cliente de seguros). Si SÍ tiene ese portal, el
// caso también aparece ahí como una sección más — mismo dato, dos puertas.
//
// 👁️ Solo lectura. Solo muestra los movimientos de bitácora marcados
// como visibles para el cliente — el backend ya filtra el resto.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import { HiScale, HiLockClosed } from "react-icons/hi";

const API_ORIGIN = String(
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? `${window.location.origin}/api/` : "/api/")
).replace(/\/api\/?$/, "");

const TEMA_LABEL = {
  LABORAL: "Laboral", ACCIDENTE: "Accidente / ART", FAMILIA: "Familia",
  PENAL: "Penal", PROPIEDAD: "Propiedad", OTRO: "Otro",
};

const ESTADOS_PASOS = [
  "CONSULTA", "ASIGNADO", "EN_TRAMITE", "DEMANDA_PRESENTADA",
  "EN_JUZGADO", "SENTENCIA", "COBRADO",
];

export default function MiCasoPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch(`${API_ORIGIN}/public/legales/${token}/`)
      .then(async (res) => {
        if (!res.ok) throw new Error("no");
        return res.json();
      })
      .then((d) => { if (vivo) setData(d); })
      .catch(() => { if (vivo) setError(true); })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-surface-dark">
        <div className="w-6 h-6 border-2 border-duo-violeta/25 border-t-duo-violeta rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-surface dark:bg-surface-dark px-6 text-center">
        <HiLockClosed className="w-7 h-7 text-suave dark:text-suave-dark" />
        <p className="font-semibold text-titulo dark:text-titulo-dark">Link inválido o vencido</p>
        <p className="text-[13px] text-suave dark:text-suave-dark">Pedile a la oficina que te pase el link actualizado.</p>
      </div>
    );
  }

  const idxActual = ESTADOS_PASOS.indexOf(data.estado);
  const esTerminal = data.estado === "CERRADO" || data.estado === "DESISTIDO";

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <HiScale className="w-6 h-6 text-duo-violeta mx-auto" />
          <h1 className="text-base font-semibold text-titulo dark:text-titulo-dark mt-2">{data.persona_nombre_completo}</h1>
          <p className="text-[12px] text-suave dark:text-suave-dark font-mono">{data.numero} · {TEMA_LABEL[data.tema] || data.tema}</p>
        </div>

        {/* Estado actual */}
        <div className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5 mb-4">
          <span className="block text-[12px] text-suave dark:text-suave-dark mb-3">Estado actual</span>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta font-medium text-[13px]">
            {data.estado_label}
          </div>

          {!esTerminal && (
            <div className="flex gap-1.5 mt-4 flex-wrap">
              {ESTADOS_PASOS.map((e, i) => (
                <span
                  key={e}
                  className={`h-1 flex-1 min-w-[20px] rounded-full ${i <= idxActual ? "bg-duo-violeta" : "bg-linea dark:bg-linea-dark"}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Vencimientos */}
        {data.vencimientos?.length > 0 && (
          <div className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5 mb-4">
            <span className="block text-[12px] text-suave dark:text-suave-dark mb-3">Fechas importantes</span>
            <div className="space-y-2">
              {data.vencimientos.map((v, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                    v.cumplido ? "bg-surface dark:bg-surface-dark opacity-60" : "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)]"
                  }`}
                >
                  <span className={`text-[13px] ${v.cumplido ? "line-through text-suave dark:text-suave-dark" : "text-titulo dark:text-titulo-dark"}`}>
                    {v.titulo}
                  </span>
                  <span className="text-[12px] font-medium text-suave dark:text-suave-dark">{dayjs(v.fecha).format("DD/MM/YYYY")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Movimientos visibles */}
        <div className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5">
          <span className="block text-[12px] text-suave dark:text-suave-dark mb-3">Novedades</span>
          {data.movimientos?.length > 0 ? (
            <div className="space-y-2.5">
              {data.movimientos.map((m, i) => (
                <div key={i} className="p-3 bg-surface dark:bg-surface-dark rounded-lg">
                  <p className="text-[11px] font-medium text-duo-violeta mb-1">{dayjs(m.creado_en).format("DD MMM YYYY")}</p>
                  <p className="text-[13px] text-titulo dark:text-titulo-dark">{m.descripcion}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-suave dark:text-suave-dark">Todavía no hay novedades cargadas.</p>
          )}
        </div>

        <p className="text-center text-[12px] text-suave dark:text-suave-dark mt-6">
          Thames Seguros · Legales
        </p>
      </div>
    </div>
  );
}