// src/components/estadisticas/FutureModulesCard.jsx
import AnimatedCard from "./AnimatedCard";

export default function FutureModulesCard() {
  return (
    <AnimatedCard
      index={8}
      interactive={false}
      glow="from-amber-500/50 via-rose-500/30 to-transparent"
    >
      <div className="text-[11px] sm:text-xs text-slate-400">
        Próximos módulos a sumar en este tablero:
        <ul className="mt-1 list-disc list-inside space-y-0.5">
          <li>Cobranzas y morosidad por oficina (desde Pagos).</li>
          <li>Solicitudes y tasa de conversión por oficina.</li>
          <li>Clientes nuevos, cartera y churn de clientes.</li>
        </ul>
      </div>
    </AnimatedCard>
  );
}
