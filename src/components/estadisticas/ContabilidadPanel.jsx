// src/components/estadisticas/ContabilidadPanel.jsx
import { useEffect, useState } from "react";
import { HiOutlineCash, HiOutlineCreditCard, HiExclamationCircle, HiTrendingUp } from "react-icons/hi";
import AnimatedCard from "./AnimatedCard";

// Formateador de pesos argentinos
const formatMoney = (amount) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export default function ContabilidadPanel({ apiBase, oficina, anio, mes, getOficinaNombre }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchContabilidad = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("anio", anio);
      params.set("mes", mes);
      if (oficina) params.set("oficina", oficina);

      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}estadisticas/contabilidad/resumen/?${params.toString()}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!res.ok) throw new Error("Error al cargar datos contables");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError("No se pudieron cargar los datos de caja.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContabilidad();
  }, [oficina, anio, mes]);

  if (loading) return <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-400 text-sm">Calculando saldos de caja...</div>;
  if (error) return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-rose-400 text-sm">{error}</div>;
  if (!data) return null;

  return (
    <div className="grid gap-4">
      {/* TARJETA PRINCIPAL: RECAUDACIÓN */}
      <AnimatedCard index={1} interactive={false} glow="from-emerald-500/30 via-teal-500/10 to-transparent">
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
              <HiOutlineCash className="text-4xl" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Recaudación del Mes</h2>
              <div className="text-4xl font-extrabold text-white mt-1">
                {formatMoney(data.recaudacion?.total)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {oficina ? `Sucursal: ${getOficinaNombre(oficina)}` : "Todas las sucursales"}
              </p>
            </div>
          </div>

          <div className="flex gap-4 md:border-l border-white/10 md:pl-6">
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-400 flex items-center gap-1"><HiOutlineCash /> Efectivo</span>
              <span className="text-lg font-bold text-emerald-300">{formatMoney(data.recaudacion?.efectivo)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-400 flex items-center gap-1"><HiOutlineCreditCard /> Transferencia</span>
              <span className="text-lg font-bold text-sky-300">{formatMoney(data.recaudacion?.transferencia)}</span>
            </div>
          </div>
        </div>
      </AnimatedCard>

      <div className="grid md:grid-cols-2 gap-4">
        {/* TARJETA SECUNDARIA: PROYECCIÓN DEL MES */}
        <AnimatedCard index={2} interactive={false} glow="from-sky-500/20 to-transparent">
          <div className="p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <HiTrendingUp className="text-sky-400 text-xl" />
              <h3 className="text-sm font-bold text-slate-200">Proyección del Mes Actual</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <span className="text-xs text-slate-400">Total a cobrar en el mes (Esperado)</span>
                <span className="font-bold text-slate-200">{formatMoney(data.mes_actual?.esperado)}</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <span className="text-xs text-slate-400">Cuotas ya cobradas</span>
                <span className="font-bold text-emerald-400">{formatMoney(data.mes_actual?.cobrado)}</span>
              </div>
              <div className="flex justify-between items-end pb-1">
                <span className="text-xs text-slate-400">Pendiente de cobro</span>
                <span className="font-bold text-amber-400">{formatMoney(data.mes_actual?.pendiente)}</span>
              </div>
            </div>
          </div>
        </AnimatedCard>

        {/* TARJETA SECUNDARIA: MOROSIDAD */}
        <AnimatedCard index={3} interactive={false} glow="from-rose-500/20 to-transparent">
          <div className="p-5 h-full flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <HiExclamationCircle className="text-rose-400 text-xl" />
              <h3 className="text-sm font-bold text-slate-200">Plata en la calle (Morosidad)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">Suma de todas las cuotas vencidas e impagas hasta el día de hoy.</p>
            
            <div className="text-3xl font-extrabold text-rose-400 mt-auto">
              {formatMoney(data.morosidad_historica)}
            </div>
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}