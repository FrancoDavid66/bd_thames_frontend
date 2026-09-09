// src/components/legales/camposPorTema.js
//
// 📋 Campos EXTRA por tema. Además de "fecha del hecho" + "relato" (que
// son siempre iguales para cualquier expediente), cada tema puede pedir
// sus propios datos puntuales — ej: Laboral pide fecha de inicio y fin
// del trabajo.
//
// Se guardan en `datos_tema` (un JSON en el backend, sin columnas fijas).
// Lo usan LegalesWizard.jsx (para pedirlos al cargar) y
// LegalesDetailPage.jsx (para mostrarlos en el detalle) — está acá para
// que los dos lean siempre lo mismo.
//
// 🆕 Para sumar un campo a un tema (o un tema nuevo): agregá un objeto
// {key, label, type} a su lista. type: "date" | "text". No hace falta
// tocar el backend ni hacer una migración — el campo ya guarda
// cualquier cosa que le mandes en formato JSON.
export const CAMPOS_POR_TEMA = {
  LABORAL: [
    { key: "fecha_inicio_trabajo", label: "Fecha de inicio de trabajo", type: "date" },
    { key: "fecha_fin_trabajo", label: "Último día trabajado", type: "date" },
  ],
  // FAMILIA: [],
  // ACCIDENTE: [],
  // PENAL: [],
  // PROPIEDAD: [],
  // OTRO: [],
};