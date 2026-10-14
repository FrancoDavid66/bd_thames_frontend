// src/utils/pagos/avisoReactivacion.js
// ============================================================
// 💳 COBRO DE UNA PÓLIZA QUE ESTABA DADA DE BAJA
//
// Cuando la oficina cobra una cuota (PATCH /cuotas/<id>/pagar/ o
// POST /pagos/registrar/) y la póliza estaba CANCELADA, el backend la vuelve
// a dejar viva y en la respuesta manda "reactivacion" (ver
// polizas/reactivar_pago.py en el backend).
//
// Acá se mira CADA respuesta de la API (lo llama services/sesion.js) y, si
// viene ese dato, se avisa a toda la app con un evento. El cartel lo muestra
// components/polizas/AvisoPolizaReactivada.jsx (montado una vez en App.jsx).
//
//   Ej: Sofi cobra la cuota 3 de Juan (dado de baja el 17/09)
//       → aparece: "Esta póliza estaba dada de baja. Verificá en NRE si sigue activa."
//
// Así no hay que tocar las 5 pantallas que cobran: todas pasan por acá.
// ============================================================
export const EVENTO_POLIZA_REACTIVADA = "thames:poliza-reactivada";

export function avisarSiEstabaDeBaja(respuesta) {
  try {
    const r = respuesta?.data?.reactivacion;
    if (!r || typeof r !== "object" || !r.estaba_de_baja) return;
    window.dispatchEvent(new CustomEvent(EVENTO_POLIZA_REACTIVADA, { detail: r }));
  } catch {
    /* el aviso nunca puede romper el cobro */
  }
}
