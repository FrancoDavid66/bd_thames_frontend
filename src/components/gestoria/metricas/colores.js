// src/components/gestoria/metricas/colores.js
//
// 🎨 Colores de los gráficos de «Métricas». Revisados para que se distingan también
// con daltonismo y para que el texto se lea (en claro y en oscuro):
//   - 2 series (cargados / entregados): violeta y verde (además llevan leyenda).
//   - Las partes de «¿Cuánto tardan?»: violeta claro → violeta oscuro (van en orden),
//     y en gris lo que ya no depende del gestor (esperando que lo retiren).
// El texto de los números va siempre en los colores de texto de la app, nunca en el
// color de la barra (salvo las etiquetas de adentro de cada parte, con su contraste).

export const COLOR = {
  cargados: "bg-[#5b52e6] dark:bg-[#8b84f3]",
  entregados: "bg-[#16a34a]",
  barra: "bg-[#5b52e6] dark:bg-[#8b84f3]",
  presentar: "bg-[#8e87f0] dark:bg-[#6a63dc]",
  presentarTxt: "text-[#0f172a] dark:text-white",
  registro: "bg-[#453ecc] dark:bg-[#a8a3f8]",
  registroTxt: "text-white dark:text-[#0f172a]",
  retiro: "bg-[#cbd5e1] dark:bg-[#475569]",
  retiroTxt: "text-[#0f172a] dark:text-[#f1f5f9]",
  esperado: "bg-[#0f172a] dark:bg-[#f1f5f9]",
  grilla: "bg-slate-200/80 dark:bg-white/[0.08]",
  cobrado: "bg-[#16a34a]",
  cobradoFondo: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]",
  comision: "bg-[#5b52e6] dark:bg-[#8b84f3]",
  comisionFondo: "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)]",
};

// Color del texto de las líneas chiquitas (siempre con un ícono al lado: no solo color).
export const TONO = {
  bien: "text-duo-verde-sombra dark:text-green-400",
  mal: "text-duo-rojo dark:text-red-400",
  aviso: "text-duo-amarillo-sombra dark:text-duo-amarillo",
  neutro: "text-suave dark:text-suave-dark",
};
