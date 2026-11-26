// src/utils/opiniones/avisoOpinion.js
// ============================================================
// ⭐ DESPUÉS DE COBRAR: «PEDILE LA OPINIÓN AL CLIENTE»
//
// Cuando la oficina cobra una cuota (PATCH /cuotas/<id>/pagar/ o
// POST /pagos/registrar/) el backend arma el link personal para que el
// cliente puntúe la atención y lo manda en la respuesta como "opinion"
// (ver opiniones/servicios.py → pedido_por_cobro).
//
// Acá se mira CADA respuesta de la API (lo llama services/sesion.js) y, si
// viene ese dato, se avisa a toda la app con un evento. La tarjetita la
// muestra components/opiniones/AvisoPedirOpinion.jsx (montada en App.jsx).
//
//   Ej: Sofi cobra la cuota de Juan → abajo a la derecha:
//       "⭐ Pedile la opinión a Juan" [WhatsApp]
// ============================================================
export const EVENTO_PEDIR_OPINION = "thames:pedir-opinion";

export function avisarPedirOpinion(respuesta) {
  try {
    const o = respuesta?.data?.opinion;
    if (!o || typeof o !== "object" || !o.wa_url) return;
    window.dispatchEvent(new CustomEvent(EVENTO_PEDIR_OPINION, { detail: o }));
  } catch {
    /* el aviso nunca puede romper el cobro */
  }
}
