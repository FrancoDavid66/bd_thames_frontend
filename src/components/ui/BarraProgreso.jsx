// src/components/ui/BarraProgreso.jsx
/**
 * 📊 Barra de progreso estilo Duolingo (para procesos de varios pasos o completitud).
 *
 * Sirve para: asegurar un cliente nuevo, cobrar, tareas, controles diarios, etc.
 * Podés usarla de 2 formas:
 *
 *  A) Por PASOS:   <BarraProgreso paso={2} totalPasos={4} label="Alta de cliente" />
 *  B) Por PORCENTAJE: <BarraProgreso valor={80} label="Ficha completa" />
 *
 * Props:
 *   valor: 0-100 (si no pasás paso/totalPasos)
 *   paso, totalPasos: para modo pasos (calcula el % solo)
 *   label: texto a la izquierda arriba (opcional)
 *   mostrarTexto: muestra el % o "Paso X de Y" a la derecha (default true)
 *   tono: "verde" | "azul" | "amarillo"  (default "verde")
 *   size: "sm" | "md" | "lg"             (default "md")
 */
const TONOS_FILL = {
  verde: "bg-duo-verde",
  azul: "bg-duo-azul",
  amarillo: "bg-duo-amarillo",
};
const ALTURAS = { sm: "h-2.5", md: "h-4", lg: "h-5" };

export default function BarraProgreso({
  valor = 0,
  paso = null,
  totalPasos = null,
  label = null,
  mostrarTexto = true,
  tono = "verde",
  size = "md",
  className = "",
}) {
  const modoPasos = Number.isFinite(paso) && Number.isFinite(totalPasos) && totalPasos > 0;
  const pct = modoPasos
    ? Math.round((Math.min(paso, totalPasos) / totalPasos) * 100)
    : Math.max(0, Math.min(100, Number(valor) || 0));

  const completo = pct >= 100;
  const fill = completo ? "bg-duo-verde" : (TONOS_FILL[tono] || TONOS_FILL.verde);
  const alt = ALTURAS[size] || ALTURAS.md;

  const textoDerecha = modoPasos
    ? completo ? "¡Completo! 🎉" : `Paso ${Math.min(paso, totalPasos)} de ${totalPasos}`
    : completo ? "¡Completo! 🎉" : `${pct}%`;

  return (
    <div className={className}>
      {(label || mostrarTexto) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark">
              {label}
            </span>
          )}
          {mostrarTexto && (
            <span className={`text-[11px] font-extrabold uppercase tracking-wide ${completo ? "text-duo-verde-sombra dark:text-duo-verde" : "text-suave dark:text-suave-dark"}`}>
              {textoDerecha}
            </span>
          )}
        </div>
      )}
      <div className={`w-full ${alt} bg-linea dark:bg-linea-dark rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full ${fill} transition-all duration-500 relative`}
          style={{ width: `${pct}%` }}
        >
          {/* brillo superior estilo Duo */}
          <span className="absolute top-[2px] left-1.5 right-1.5 h-[3px] bg-white/40 rounded-full" />
        </div>
      </div>
    </div>
  );
}
