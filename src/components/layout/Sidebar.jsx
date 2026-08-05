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
// 🚀 Isotipo oficial (columna)
import logoThames from "../../assets/logos/logo_thames.svg";

const ICON_MAP = {
  home: HiHome, users: HiUsers, doc: HiDocumentText, money: HiCurrencyDollar,
  db: HiDatabase, chart: HiChartBar, map: HiMap, clipboard: HiClipboardList,
  star: HiStar, tasks: HiClipboardCheck, speaker: HiSpeakerphone, refresh: HiRefresh,
  clock: HiClock, ban: HiBan, truck: HiTruck, cash: HiCash, receipt: HiReceiptTax,
  shield: HiShieldCheck, cog: HiCog, grid: HiViewGrid,
};

export default function Sidebar({
  isOpen,
  onClose,
  solPendienteAlta = 0,
  solPendienteEnvio = 0,
  cuponVencidas = 0,
  renovacionesPendientes = 0,
  bajasPendientes = 0,
  serviciosAlertas = 0,
  siniestrosAbiertos = 0,
}) {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const isVendedor = user?.perfil?.rol === "VENDEDOR";
  const solTotal = (Number(solPendienteAlta) || 0) + (Number(solPendienteEnvio) || 0);

  const userInicial = (user?.first_name || user?.username || "U")[0].toUpperCase();
  const userName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "Usuario";
  const oficinaNombre = user?.perfil?.oficina_nombre || "Sucursal";

  const menuGroups = useMemo(() => {
    if (isVendedor) return [{
      title: "Mi Panel", flat: true,
      items: [
        { to: "/", label: "Inicio", icon: "home" },
        { to: "/polizas", label: "Mis Asegurados", icon: "users" },
        { to: "/comisiones", label: "Mis Comisiones", icon: "money" },
      ]
    }];

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
        title: "Principal", flat: true,
        items: [
          { to: "/", label: "Inicio", icon: "home" },
          { to: "/tareas", label: "Tareas del día", icon: "tasks", highlight: true },
          { to: "/control-diario", label: "Control diario", icon: "clipboard" },
          { to: "/ranking", label: "Ranking", icon: "star" },
          { to: "/solicitudes", label: "Altas", icon: "clipboard", badge: solTotal, tone: "amarillo" },
        ]
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
        ]
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
        ]
      }] : [])
    ];
  }, [isAdmin, isVendedor, solTotal, renovacionesPendientes, cuponVencidas, bajasPendientes, serviciosAlertas, siniestrosAbiertos]);

  const [open, setOpen] = useState({
    cartera: true,
    finanzas: ["/pagos", "/recaudacion", "/balanzes", "/servicios"].some(p => location.pathname.startsWith(p)),
    admin: ["/cotizaciones", "/estadisticas", "/admin"].some(p => location.pathname.startsWith(p)),
  });

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
        fixed top-0 left-0 z-50 h-[100dvh] w-72 flex flex-col
        bg-card dark:bg-card-dark border-r-2 border-linea dark:border-linea-dark
        shadow-2xl
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>

        {/* Header */}
        <div className="px-4 py-4 border-b-2 border-linea dark:border-linea-dark flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark flex items-center justify-center shrink-0 p-1.5 shadow-[0_3px_0_var(--color-linea)] dark:shadow-[0_3px_0_var(--color-linea-dark)]">
              <img src={logoThames} alt="Thames Seguros" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-titulo dark:text-titulo-dark truncate leading-tight">Thames Seguros</h1>
              <p className="text-[10px] text-duo-azul font-extrabold uppercase tracking-widest truncate leading-tight">
                {isVendedor ? "Recomendador" : oficinaNombre}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors shrink-0 active:scale-90">
            <HiX className="w-4 h-4" />
          </button>
        </div>

        {/* Usuario */}
        <div className="px-4 py-3 border-b-2 border-linea dark:border-linea-dark shrink-0">
          <div className="flex items-center gap-3 bg-surface dark:bg-surface-dark rounded-2xl px-3 py-2.5 border-2 border-linea dark:border-linea-dark">
            <div className="h-9 w-9 rounded-full bg-duo-azul flex items-center justify-center text-sm font-black text-white shrink-0">
              {userInicial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-titulo dark:text-titulo-dark truncate leading-tight">{userName}</p>
              <p className="text-[10px] font-bold text-suave dark:text-suave-dark truncate leading-tight uppercase tracking-wide">
                {isAdmin ? "Administrador" : isVendedor ? "Vendedor" : "Operador"}
              </p>
            </div>
          </div>
        </div>

        {/* Acceso rápido a Pagos */}
        {!isVendedor && (
          <div className="px-3 pt-3 shrink-0">
            <NavLink
              to="/pagos"
              className="group flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-duo-verde text-white shadow-[0_4px_0_var(--color-duo-verde-sombra)] hover:brightness-105 transition-all active:translate-y-[2px] active:shadow-[0_2px_0_var(--color-duo-verde-sombra)]"
            >
              <span className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/20 shrink-0">
                <HiCurrencyDollar className="w-6 h-6" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-black leading-tight">Registrar pago</div>
                <div className="text-[10px] font-bold text-white/80 uppercase tracking-widest leading-tight">Cobrar una cuota</div>
              </div>
              <HiChevronDown className="w-5 h-5 -rotate-90 opacity-80 group-hover:opacity-100 transition" />
            </NavLink>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 scrollbar-hide">
          {menuGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-2" : ""}>

              {/* Grupo plano */}
              {group.flat ? (
                <>
                  <p className="px-2 pb-1.5 text-[11px] font-black uppercase tracking-widest text-suave dark:text-suave-dark">
                    {group.title}
                  </p>
                  {group.items.map(item => {
                    const Icon = ICON_MAP[item.icon] || HiHome;
                    return (
                      <NavLink key={item.to} to={item.to} end={item.to === "/"}
                        className={({ isActive }) => `
                          group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-bold
                          transition-all duration-150 mb-0.5 border-2
                          ${isActive
                            ? "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul border-duo-azul/40"
                            : item.highlight
                              ? "text-duo-amarillo-sombra dark:text-duo-amarillo bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] border-duo-amarillo/40"
                              : "text-suave dark:text-suave-dark border-transparent hover:bg-surface dark:hover:bg-surface-dark hover:text-titulo dark:hover:text-titulo-dark"
                          }
                        `}>
                        {({ isActive }) => (
                          <>
                            <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-duo-azul" : item.highlight ? "text-duo-amarillo-sombra dark:text-duo-amarillo" : ""}`} />
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
                      text-[15px] font-black transition-all duration-150
                      ${open[group.id]
                        ? "bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark"
                        : "text-suave dark:text-suave-dark hover:bg-surface dark:hover:bg-surface-dark hover:text-titulo dark:hover:text-titulo-dark"
                      }
                    `}>
                    <div className="flex items-center gap-2.5">
                      {(() => { const Icon = ICON_MAP[group.icon] || HiViewGrid; return <Icon className="w-5 h-5 shrink-0" />; })()}
                      <span>{group.title}</span>
                      <GroupBadge items={group.items} />
                    </div>
                    <motion.div
                      animate={{ rotate: open[group.id] ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-center h-6 w-6 rounded-lg text-suave dark:text-suave-dark">
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
                                  group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold
                                  transition-all duration-150
                                  ${isActive
                                    ? "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul"
                                    : "text-suave dark:text-suave-dark hover:bg-surface dark:hover:bg-surface-dark hover:text-titulo dark:hover:text-titulo-dark"
                                  }
                                `}>
                                {({ isActive }) => (
                                  <>
                                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-duo-azul" : ""}`} />
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
        <div className="px-4 py-3 border-t-2 border-linea dark:border-linea-dark shrink-0 space-y-2">
          <ThemeToggle />
          <p className="text-center text-[10px] font-bold text-suave dark:text-suave-dark">Thames Seguros © 2026</p>
        </div>
      </aside>
    </>
  );
}

// Badge de conteo — estilo THAMES (duo-*)
function Badge({ value = 0, tone = "rojo" }) {
  const v = Number(value) || 0;
  if (v <= 0) return null;
  const cls = tone === "amarillo"
    ? "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo"
    : "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo";
  return (
    <span className={`shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black ${cls}`}>
      {v}
    </span>
  );
}

// Mini-badge en el header del grupo (suma de badges de sus items)
function GroupBadge({ items }) {
  const total = (items || []).reduce((acc, it) => acc + (Number(it.badge) || 0), 0);
  if (total <= 0) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo">
      {total}
    </span>
  );
}
