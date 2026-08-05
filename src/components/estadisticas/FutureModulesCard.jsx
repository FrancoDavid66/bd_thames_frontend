// src/components/estadisticas/FutureModulesCard.jsx  (diseño Duo)
import AnimatedCard from "./AnimatedCard";

export default function FutureModulesCard() {
  return (
    <AnimatedCard index={8} interactive={false}>
      <div className="text-xs font-bold text-suave dark:text-suave-dark">
        Próximos módulos a sumar en este tablero:
        <ul className="mt-2 list-disc list-inside space-y-1">
          <li>Cobranzas y morosidad por oficina (desde Pagos).</li>
          <li>Solicitudes y tasa de conversión por oficina.</li>
          <li>Clientes nuevos, cartera y churn de clientes.</li>
        </ul>
      </div>
    </AnimatedCard>
  );
}
