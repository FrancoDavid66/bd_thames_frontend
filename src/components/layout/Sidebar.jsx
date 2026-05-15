// src/components/layout/Sidebar.jsx
import { useMemo, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiHome, HiUsers, HiDocumentText, HiCurrencyDollar, HiDatabase,
  HiChartBar, HiMap, HiClipboardList, HiSpeakerphone,
  HiChevronDown, HiRefresh,
  HiClock, HiBan, HiTruck, HiCash, HiReceiptTax,
  HiShieldCheck, HiX, HiCog,
  HiViewGrid
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

    return [
      {
        title: "Principal", flat: true,
        items: [
          { to: "/",           label: "Inicio",           icon: "home" },
          { to: "/solicitudes",label: "Solicitudes",       icon: "clipboard", badge: solTotal },
          { to: "/clientes",   label: "Clientes",          icon: "users" },
          { to: "/siniestros", label: "Siniestros", icon: "doc", badge: siniestrosAbiertos, tone: "red" },
          { to: "/pagos",      label: "Gestión de Pagos",  icon: "cash" },
        ]
      },
      {
        title: "Pólizas", id: "polizas", icon: "doc",
        items: [
          { to: "/polizas",            label: "Listado",      icon: "doc" },
          { to: "/vencimientos",       label: "Vencimientos", icon: "clock" },
          { to: "/polizas/renovaciones",label: "Renovaciones",icon: "refresh", badge: renovacionesPendientes, tone: "amber" },
          { to: "/cuponeras",          label: "Cuponeras",    icon: "receipt", badge: cuponVencidas },
          { to: "/polizas/bajas",      label: "Bajas",        icon: "ban",     badge: bajasPendientes, tone: "red" },
        ]
      },
      {
        title: "Finanzas", id: "finanzas", icon: "db",
        items: [
          { to: "/recaudacion", label: "Recaudación", icon: "cash" },
          { to: "/balanzes",    label: "Balances",    icon: "db" },
        ]
      },
      ...(isAdmin ? [{
        title: "Gerencia", id: "admin", icon: "shield",
        items: [
          { to: "/gruas",        label: "Grúas",        icon: "truck" },
          { to: "/cotizaciones", label: "Cotizador",    icon: "receipt" },
          { to: "/marketing",    label: "Campañas",     icon: "speaker" },
          { to: "/estadisticas", label: "Estadísticas", icon: "chart" },
          { to: "/competencia",  label: "Competencia",  icon: "chart" },
          { to: "/geo",          label: "Mapa Geo",     icon: "map" },
          { to: "/admin",        label: "Configuración",icon: "cog" },
        ]
      }] : [])
    ];
  }, [isAdmin, isVendedor, solTotal, renovacionesPendientes, cuponVencidas, bajasPendientes]);

  const [open, setOpen] = useState({
    polizas:  ["/polizas", "/vencimientos", "/cuponeras"].some(p => location.pathname.startsWith(p)),
    finanzas: ["/recaudacion", "/balanzes"].some(p => location.pathname.startsWith(p)),
    admin:    ["/gruas", "/cotizaciones", "/marketing", "/estadisticas", "/competencia", "/geo", "/admin"].some(p => location.pathname.startsWith(p)),
  });

  // Cerrar sidebar automáticamente al cambiar de ruta (sin llamar onClose manualmente)
  useEffect(() => {
    if (isOpen) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

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
            {/* Logo / Avatar empresa */}
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
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                          }
                        `}>
                        {({ isActive }) => (
                          <>
                            <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-primary-400" : "text-slate-500 group-hover:text-slate-300"}`} />
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
                    </div>
                    <motion.div
                      animate={{ rotate: open[group.id] ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-center justify-center h-6 w-6 rounded-lg transition-colors ${
                        open[group.id] ? "bg-primary-600/30 text-primary-400" : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      <HiChevronDown className="w-4 h-4" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {open[group.id] && (
                      <motion.div
                        key="accordion"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-1 ml-3 pl-3 border-l border-slate-800 space-y-0.5 pb-1">
                          {group.items.map(item => {
                            const Icon = ICON_MAP[item.icon] || HiHome;
                            return (
                              <NavLink key={item.to} to={item.to} end={item.to === "/polizas"}
                                className={({ isActive }) => `
                                  group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px]
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