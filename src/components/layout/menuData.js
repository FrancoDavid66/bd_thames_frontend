// src/components/layout/menuData.js
//
// 📚 FUENTE ÚNICA del menú. La usan TANTO el Sidebar COMO el Footer,
//    así los dos muestran exactamente lo mismo (mismos ítems, colores,
//    accesos rápidos y badges). Si mañana agregás una sección, la tocás
//    UNA sola vez acá y aparece en los dos lados.
//
import {
  HiHome, HiUsers, HiDocumentText, HiCurrencyDollar, HiDatabase,
  HiChartBar, HiClipboardList, HiClipboardCheck, HiRefresh,
  HiBan, HiCash, HiReceiptTax,
  HiShieldCheck, HiCog, HiViewGrid, HiStar,
  HiPencilAlt, HiCalculator,
} from "react-icons/hi";

export const ICON_MAP = {
  home: HiHome, users: HiUsers, doc: HiDocumentText, money: HiCurrencyDollar,
  db: HiDatabase, chart: HiChartBar, clipboard: HiClipboardList,
  star: HiStar, tasks: HiClipboardCheck, refresh: HiRefresh,
  ban: HiBan, cash: HiCash, receipt: HiReceiptTax,
  shield: HiShieldCheck, cog: HiCog, grid: HiViewGrid,
  pencil: HiPencilAlt, calc: HiCalculator,
};

// 🎨 Color por SECCIÓN — tokens REALES de tu index.css (@theme duo-*).
//    icon = color del ícono/acento · soft = fondo tenue · rail = riel lateral.
export const SECTION_COLORS = {
  principal: { icon: "var(--color-duo-azul)",     soft: "rgba(28,176,246,.10)",  rail: "var(--color-duo-azul)" },
  cartera:   { icon: "var(--color-duo-violeta)",  soft: "rgba(206,130,255,.10)", rail: "var(--color-duo-violeta)" },
  finanzas:  { icon: "var(--color-duo-verde)",    soft: "rgba(88,204,2,.10)",    rail: "var(--color-duo-verde)" },
  admin:     { icon: "var(--color-duo-amarillo)", soft: "rgba(255,200,0,.12)",   rail: "var(--color-duo-amarillo)" },
};

// 🚀 ACCESOS RÁPIDOS (cada uno su color, estilo 3D). ORDEN = orden de aparición.
//    ⭐ "Emisión de póliza" va PRIMERO y marcado como `hero` (más grande/vistoso).
//    Ojo: tu paleta NO tiene naranja → Cotizador usa amarillo (texto oscuro).
export const QUICK_ACTIONS = [
  {
    to: "/solicitudes", label: "Emisión", sub: "Dar de alta una póliza",
    icon: "pencil", bg: "var(--color-duo-violeta)", shadow: "var(--color-duo-violeta-sombra)",
    hero: true, // ⭐ el más destacado
  },
  {
    to: "/pagos", label: "Registrar pago", sub: "Cobrar una cuota",
    icon: "money", bg: "var(--color-duo-verde)", shadow: "var(--color-duo-verde-sombra)",
  },
  {
    to: "/balanzes", label: "Balances", sub: "Caja del día",
    icon: "db", bg: "var(--color-duo-azul)", shadow: "var(--color-duo-azul-sombra)",
  },
  {
    to: "/cotizaciones", label: "Cotizador", sub: "Nueva cotización",
    icon: "calc", bg: "var(--color-duo-amarillo)", shadow: "var(--color-duo-amarillo-sombra)",
    darkText: true, adminOnly: true, // amarillo → texto oscuro; solo admin
  },
];

// 🏗️ Construye los grupos del menú según el rol y los contadores (badges).
//    Es la MISMA lógica que ya tenías en el Sidebar, extraída acá para
//    compartirla con el Footer.
export function buildMenuGroups({
  isAdmin, isVendedor,
  solTotal = 0, renovacionesPendientes = 0, cuponVencidas = 0,
  bajasPendientes = 0, serviciosAlertas = 0, siniestrosAbiertos = 0,
}) {
  if (isVendedor) {
    return [{
      title: "Mi Panel", flat: true, id: "principal",
      items: [
        { to: "/", label: "Inicio", icon: "home" },
        { to: "/polizas", label: "Mis Asegurados", icon: "users" },
        { to: "/comisiones", label: "Mis Comisiones", icon: "money" },
      ],
    }];
  }

  const finanzasItems = [
    { to: "/pagos", label: "Gestión de Pagos", icon: "cash" },
    { to: "/recaudacion", label: "Recaudación", icon: "cash" },
    { to: "/balanzes", label: "Balances", icon: "db" },
  ];
  if (isAdmin) {
    finanzasItems.push({
      to: "/servicios", label: "Servicios Fijos", icon: "receipt",
      badge: serviciosAlertas, tone: "rojo",
    });
  }

  return [
    {
      title: "Principal", flat: true, id: "principal",
      items: [
        { to: "/", label: "Inicio", icon: "home" },
        { to: "/tareas", label: "Tareas del día", icon: "tasks", highlight: true },
        { to: "/control-diario", label: "Control diario", icon: "clipboard" },
        { to: "/ranking", label: "Ranking", icon: "star" },
        { to: "/solicitudes", label: "Altas", icon: "clipboard", badge: solTotal, tone: "amarillo" },
      ],
    },
    {
      title: "Cartera", id: "cartera", icon: "doc",
      items: [
        { to: "/clientes", label: "Clientes", icon: "users" },
        { to: "/polizas", label: "Pólizas", icon: "doc" },
        { to: "/polizas/renovaciones", label: "Renovaciones", icon: "refresh", badge: renovacionesPendientes, tone: "amarillo" },
        { to: "/cuponeras", label: "Cuponeras", icon: "receipt", badge: cuponVencidas, tone: "rojo" },
        { to: "/polizas/bajas", label: "Bajas", icon: "ban", badge: bajasPendientes, tone: "rojo" },
        { to: "/siniestros", label: "Siniestros", icon: "doc", badge: siniestrosAbiertos, tone: "rojo" },
      ],
    },
    {
      title: "Finanzas", id: "finanzas", icon: "db",
      items: finanzasItems,
    },
    ...(isAdmin ? [{
      title: "Gerencia", id: "admin", icon: "shield",
      items: [
        { to: "/cotizaciones", label: "Cotizador", icon: "receipt" },
        { to: "/estadisticas", label: "Estadísticas", icon: "chart" },
        { to: "/admin", label: "Configuración", icon: "cog" },
      ],
    }] : []),
  ];
}

// 📱 TABS SIMPLES del footer (los 5 accesos que van SIEMPRE visibles en la
//    barra inferior, sin abrir el menú). Estilo simple: ícono + texto chico.
//    Cada uno lleva su color de acento (para el ícono cuando está activo).
//    El resto del menú vive en la hoja (botón "Más").
export const FOOTER_TABS = [
  { to: "/",            label: "Inicio",   icon: "home",   color: "var(--color-duo-azul)" },
  { to: "/solicitudes", label: "Emisión",  icon: "pencil", color: "var(--color-duo-violeta)" },
  { to: "/pagos",       label: "Pagos",    icon: "money",  color: "var(--color-duo-verde)" },
  { to: "/balanzes",    label: "Balances", icon: "db",     color: "var(--color-duo-azul)" },
  { to: "/clientes",    label: "Clientes", icon: "users",  color: "var(--color-duo-violeta)" },
];