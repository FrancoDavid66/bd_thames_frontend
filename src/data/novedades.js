// src/data/novedades.js
//
// 📣 NOTICIAS DE THAMES (Franco 23/11/2026) — lo que se ve al tocar «Noticias» en el header.
//    Cada vez que sale algo nuevo en la app se agrega ACÁ, ARRIBA DE TODO, y a todos les
//    aparece el numerito rojo hasta que lo leen.
//
//    {
//      id:     "2026-11-23-consultas"   ← único y que no cambie (con él se sabe quién ya la leyó)
//      fecha:  "2026-11-23"
//      emoji:  "💬"
//      titulo: "..."                     ← corto
//      texto:  "..."                     ← en palabras simples, como se lo explicarías a los chicos
//      link:   { to: "/legales/consulta", texto: "Probarlo" }   (opcional)
//      roles:  ["ADMIN"]                 ← opcional: solo la ven esos roles (sin esto, todos)
//    }
//
//    Para que un botón del menú BRILLE con «NUEVO», en components/layout/menuData.js se le
//    pone `nuevo: "AAAA-MM-DD"` (la fecha hasta la que brilla).

export const NOVEDADES = [
  {
    id: "2026-11-24-whatsapp",
    fecha: "2026-11-24",
    emoji: "📲",
    titulo: "Nuevo: panel de WhatsApp",
    texto:
      "Ves quién está esperando respuesta en cada línea de WhatsApp y cuánto tardan en contestar. " +
      "Si alguien espera más de 15 minutos, aparece en rojo. Por ahora está la línea de Siniestros; después se suman las oficinas.",
    link: { to: "/whatsapp", texto: "Ver el panel" },
    roles: ["ADMIN"],
  },
  {
    id: "2026-11-23-consultas",
    fecha: "2026-11-23",
    emoji: "💬",
    titulo: "«Legales» ahora se llama «Consultas»",
    texto:
      "Todo lo que pregunta el cliente, en un solo lugar: ART, escribanía y contratos (boleto, cesión de derechos, poder), papeles de la casa, gestoría del auto (08, cédula, libre deuda), defensa del consumidor, familia, penal y trabajo. Tocá «Consulta rápida»: un chat te pregunta de a una cosa y no hace falta saber de leyes. Al guardar, Franco ya sabe a quién llamar.",
    link: { to: "/legales/consulta", texto: "Probar la consulta rápida" },
  },
  {
    id: "2026-11-23-aviso-siniestro",
    fecha: "2026-11-23",
    emoji: "🚨",
    titulo: "Link para que el cliente avise un siniestro",
    texto:
      "Si un cliente choca o le roban, mandale el link desde Siniestros → «Mandar link por WhatsApp». Lo llena en 2 minutos desde el celu (con fotos y los datos del otro) y aparece en «Avisos de clientes». Con un botón lo cargás como siniestro.",
    link: { to: "/siniestros", texto: "Ir a Siniestros" },
  },
];
