// src/components/layout/Sidebar.jsx
import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiHome, HiUsers, HiDocumentText, HiCurrencyDollar, HiDatabase,
  HiChartBar, HiMap, HiClipboardList, HiClipboardCheck, HiSpeakerphone,
  HiChevronDown, HiRefresh,
  HiClock, HiBan, HiTruck, HiCash, HiReceiptTax,
  HiShieldCheck, HiX, HiCog,
  HiViewGrid, HiStar
} from "react-icons/hi";
import ThemeToggle from "./ThemeToggle";

const ICON_MAP = {
  home:        HiHome,
  users:       HiUsers,
  doc:         HiDocumentText,
  money:       HiCurrencyDollar,
  db:          HiDatabase,
  chart:       HiChartBar,
  map:         HiMap,
  clipboard:   HiClipboardList,
  star:        HiStar,
  tasks:       HiClipboardCheck,
  speaker:     HiSpeakerphone,
  refresh:     HiRefresh,
  clock:       HiClock,
  ban:         HiBan,
  truck:       HiTruck,
  cash:        HiCash,
  receipt:     HiReceiptTax,
  shield:      HiShieldCheck,
  cog:         HiCog,
  grid:        HiViewGrid,
};

export default function Sidebar({
  isOpen,
  onClose,
  solPendienteAlta = 0,
  solPendienteEnvio = 0,
  cuponVencidas = 0,
  renovacionesPendientes = 0,
  bajasPendientes = 0,
  // 🚀 NUEVO: Badge de servicios fijos (vencidos + por vencer ≤3d)
  serviciosAlertas = 0,
  // 🆕 Verificación y Siniestros: el dato ya se pedía en App.jsx, faltaba pasarlo
  verificacionCount = 0,
  siniestrosAbiertos = 0,
}) {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin    = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const isVendedor = user?.perfil?.rol === "VENDEDOR";
  const solTotal   = (Number(solPendienteAlta) || 0) + (Number(solPendienteEnvio) || 0);

  const userInicial = (user?.first_name || user?.username || "U")[0].toUpperCase();
  const userName    = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "Usuario";
  const oficinaNombre = user?.perfil?.oficina_nombre || "Sucursal";

  const menuGroups = useMemo(() => {
    if (isVendedor) return [{
      title: "Mi Panel", flat: true,
      items: [
        { to: "/",          label: "Inicio",          icon: "home" },
        { to: "/polizas",   label: "Mis Asegurados",  icon: "users" },
        { to: "/comisiones",label: "Mis Comisiones",  icon: "money" },
      ]
    }];

    // 💰 Finanzas: Pagos (operación diaria) + caja/contabilidad
    const finanzasItems = [
      { to: "/pagos",       label: "Gestión de Pagos", icon: "cash" },
      { to: "/recaudacion", label: "Recaudación",      icon: "cash" },
      { to: "/balanzes",    label: "Balances",         icon: "db" },
    ];

    // 🚀 Servicios Fijos solo para admin
    if (isAdmin) {
      finanzasItems.push({
        to: "/servicios",
        label: "Servicios Fijos",
        icon: "receipt",
        badge: serviciosAlertas,
        tone: "red",
      });
    }

    return [
      // 🏠 Lo de todos los días: inicio + tareas operativas + bandeja de solicitudes
      {
        title: "Principal", flat: true,
        items: [
          { to: "/",               label: "Inicio",         icon: "home" },
          { to: "/tareas",         label: "Tareas del día", icon: "tasks", highlight: true },
          { to: "/control-diario", label: "Control diario", icon: "clipboard" },
          { to: "/ranking",        label: "Ranking",        icon: "star" },
          { to: "/solicitudes",    label: "Solicitudes",    icon: "clipboard", badge: solTotal },
        ]
      },
      // 📋 Cartera: clientes + pólizas + siniestros (todo el libro de negocio junto)
      {
        title: "Cartera", id: "cartera", icon: "doc",
        items: [
          { to: "/clientes",             label: "Clientes",      icon: "users" },
          { to: "/polizas",              label: "Pólizas",       icon: "doc" },
          { to: "/vencimientos",         label: "Vencimientos",  icon: "clock" },
          { to: "/polizas/renovaciones", label: "Renovaciones",  icon: "refresh", badge: renovacionesPendientes, tone: "amber" },
          { to: "/cuponeras",            label: "Cuponeras",     icon: "receipt", badge: cuponVencidas },
          { to: "/polizas/bajas",        label: "Bajas",         icon: "ban",     badge: bajasPendientes, tone: "red" },
          { to: "/polizas/verificacion", label: "Verificación",  icon: "shield", badge: verificacionCount, tone: "amber" },
          { to: "/siniestros",           label: "Siniestros",    icon: "doc",    badge: siniestrosAbiertos, tone: "red" },
        ]
      },
      // 💰 Finanzas: todo lo que es plata en un solo lugar
      {
        title: "Finanzas", id: "finanzas", icon: "db",
        items: finanzasItems,
      },
      // 🛡️ Gerencia (solo admin)
      ...(isAdmin ? [{
        title: "Gerencia", id: "admin", icon: "shield",
        items: [
          { to: "/cotizaciones", label: "Cotizador",     icon: "receipt" },
          { to: "/gruas",        label: "Grúas",         icon: "truck" },
          { to: "/marketing",    label: "Campañas",      icon: "speaker" },
          { to: "/estadisticas", label: "Estadísticas",  icon: "chart" },
          { to: "/competencia",  label: "Competencia",   icon: "chart" },
          { to: "/geo",          label: "Mapa Geo",      icon: "map" },
          { to: "/admin",        label: "Configuración", icon: "cog" },
        ]
      }] : [])
    ];
  }, [isAdmin, isVendedor, solTotal, renovacionesPendientes, cuponVencidas, bajasPendientes, serviciosAlertas, verificacionCount, siniestrosAbiertos]);

  const [open, setOpen] = useState({
    cartera:  true, // 📋 el libro de negocio abierto por defecto
    finanzas: ["/pagos", "/recaudacion", "/balanzes", "/servicios"].some(p => location.pathname.startsWith(p)),
    admin:    ["/gruas", "/cotizaciones", "/marketing", "/estadisticas", "/competencia", "/geo", "/admin"].some(p => location.pathname.startsWith(p)),
  });

  // 🆕 El cierre automático al cambiar de ruta ya lo maneja App.jsx
  //    (ahí SÍ se chequea si es mobile antes de cerrar). Este efecto
  //    duplicaba esa lógica pero sin el chequeo, y cerraba el sidebar
  //    en escritorio también — por eso "se borraba" en cada click.

  const toggle = (id) => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-[100dvh] w-72
        flex flex-col
        bg-slate-950 border-r border-slate-800/60
        shadow-2xl shadow-black/50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>

        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-800/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 shadow-lg shadow-primary-900/40">
              <span className="text-white font-black text-sm">T</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-100 truncate leading-tight">Thames Seguros</h1>
              <p className="text-[10px] text-primary-400 font-bold uppercase tracking-widest truncate leading-tight">
                {isVendedor ? "Recomendador" : oficinaNombre}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors shrink-0">
            <HiX className="w-4 h-4" />
          </button>
        </div>

        {/* Usuario */}
        <div className="px-4 py-3 border-b border-slate-800/40 shrink-0">
          <div className="flex items-center gap-3 bg-slate-900/60 rounded-xl px-3 py-2.5">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 shrink-0">
              {userInicial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-200 truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-slate-500 truncate leading-tight">
                {isAdmin ? "Administrador" : isVendedor ? "Vendedor" : "Operador"}
              </p>
            </div>
          </div>
        </div>

        {/* 💸 Acceso rápido DESTACADO a Pagos — para cobrar al toque, sin abrir Finanzas */}
        {!isVendedor && (
          <div className="px-3 pt-3 shrink-0">
            <NavLink
              to="/pagos"
              className="group flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-900/40 hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/40 transition-all active:scale-[0.98]"
            >
              <span className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/20 shrink-0">
                <HiCurrencyDollar className="w-6 h-6" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-black leading-tight">Registrar pago</div>
                <div className="text-[10px] font-bold text-emerald-50/80 uppercase tracking-widest leading-tight">Cobrar una cuota</div>
              </div>
              <HiChevronDown className="w-5 h-5 -rotate-90 opacity-80 group-hover:opacity-100 transition" />
            </NavLink>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 custom-scrollbar">
          {menuGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-2" : ""}>

              {/* Grupo plano (sin acordeón) */}
              {group.flat ? (
                <>
                  <p className="px-2 pb-1.5 text-[11px] font-black uppercase tracking-widest text-slate-600">
                    {group.title}
                  </p>
                  {group.items.map(item => {
                    const Icon = ICON_MAP[item.icon] || HiHome;
                    return (
                      <NavLink key={item.to} to={item.to} end={item.to === "/"}
                        className={({ isActive }) => `
                          group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium
                          transition-all duration-150 mb-0.5
                          ${isActive
                            ? "bg-primary-600/20 text-primary-400 border border-primary-600/30 shadow-sm"
                            : item.highlight
                              ? "text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 font-bold"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                          }
                        `}>
                        {({ isActive }) => (
                          <>
                            <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-primary-400" : item.highlight ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                            <span className="flex-1 truncate">{item.label}</span>
                            <Badge value={item.badge} tone={item.tone} />
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </>
              ) : (
                /* Grupo con acordeón */
                <div>
                  <button onClick={() => toggle(group.id)}
                    className={`
                      w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl
                      text-[15px] font-semibold transition-all duration-150
                      ${open[group.id]
                        ? "bg-slate-800/80 text-slate-100"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                      }
                    `}>
                    <div className="flex items-center gap-2.5">
                      {(() => { const Icon = ICON_MAP[group.icon] || HiViewGrid; return <Icon className="w-5 h-5 shrink-0" />; })()}
                      <span>{group.title}</span>
                      {/* Mini-badge en el header del grupo si hay alertas dentro */}
                      <GroupBadge items={group.items} />
                    </div>
                    <motion.div
                      animate={{ rotate: open[group.id] ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-center justify-center h-6 w-6 rounded-lg transition-colors ${
                        open[group.id] ? "text-slate-300" : "text-slate-500 group-hover:text-slate-400"
                      }`}>
                      <HiChevronDown className="w-4 h-4" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {open[group.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 pt-1 space-y-0.5">
                          {group.items.map(item => {
                            const Icon = ICON_MAP[item.icon] || HiHome;
                            return (
                              <NavLink key={item.to} to={item.to}
                                className={({ isActive }) => `
                                  group flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                                  transition-all duration-150
                                  ${isActive
                                    ? "bg-primary-600/20 text-primary-400 font-semibold"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 font-medium"
                                  }
                                `}>
                                {({ isActive }) => (
                                  <>
                                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary-400" : "text-slate-500 group-hover:text-slate-400"}`} />
                                    <span className="flex-1 truncate">{item.label}</span>
                                    <Badge value={item.badge} tone={item.tone} />
                                  </>
                                )}
                              </NavLink>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-800/60 shrink-0 space-y-2">
          <ThemeToggle />
          <p className="text-center text-[10px] text-slate-700">Thames Seguros © 2026</p>
        </div>
      </aside>
    </>
  );
}

function Badge({ value = 0, tone = "red" }) {
  const v = Number(value) || 0;
  if (v <= 0) return null;
  const cls = tone === "amber"
    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
    : "bg-red-500/20 text-red-400 border border-red-500/40";
  return (
    <span className={`shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${cls}`}>
      {v}
    </span>
  );
}

// 🚀 Mini-badge en el header del grupo (suma de badges de sus items)
function GroupBadge({ items }) {
  const total = (items || []).reduce((acc, it) => acc + (Number(it.badge) || 0), 0);
  if (total <= 0) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
      {total}
    </span>
  );
}