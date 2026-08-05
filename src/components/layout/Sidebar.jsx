// src/components/layout/Sidebar.jsx
import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiChevronDown, HiChevronRight, HiChevronLeft, HiViewGrid, HiHome,
} from "react-icons/hi";
import ThemeToggle from "./ThemeToggle";
// 🚀 Isotipo oficial (columna)
import logoThames from "../../assets/logos/logo_thames.svg";
// 📚 Fuente única del menú (compartida con el Footer)
import { ICON_MAP, SECTION_COLORS, QUICK_ACTIONS, buildMenuGroups } from "./menuData";

export default function Sidebar({
  isOpen,
  onClose,
  onOpen,                    // 🚀 abre el sidebar (lo usa la lengüeta lateral)
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

  // 🚀 Accesos rápidos visibles según rol (Cotizador es solo admin)
  const quickActions = useMemo(
    () => QUICK_ACTIONS.filter((q) => (q.adminOnly ? isAdmin : true)),
    [isAdmin]
  );

  const menuGroups = useMemo(
    () => buildMenuGroups({
      isAdmin, isVendedor, solTotal, renovacionesPendientes,
      cuponVencidas, bajasPendientes, serviciosAlertas, siniestrosAbiertos,
    }),
    [isAdmin, isVendedor, solTotal, renovacionesPendientes, cuponVencidas, bajasPendientes, serviciosAlertas, siniestrosAbiertos]
  );

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

      {/* 🚀 LENGÜETA lateral — aparece cuando el sidebar está CERRADO.
          Sobresale del borde izquierdo con una flechita →; al tocarla, abre.
          z-[45] para quedar por encima del contenido/header pero por debajo
          del sidebar abierto (z-50). */}
      <AnimatePresence>
        {!isOpen && onOpen && (
          <motion.button
            key="side-tab"
            type="button"
            onClick={onOpen}
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ duration: 0.22 }}
            aria-label="Abrir menú lateral"
            title="Abrir menú"
            className="group fixed left-0 top-1/2 -translate-y-1/2 z-[45] flex items-center justify-center
                       h-20 w-7 rounded-r-2xl bg-marca text-white shadow-[3px_0_12px_rgba(0,0,0,.3)]
                       hover:w-9 transition-all duration-200 active:scale-95"
          >
            <HiChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 🚀 SOLAPA para CERRAR — aparece SOLO cuando el sidebar está ABIERTO.
          Es `fixed` y se ubica en el borde DERECHO del sidebar (a w-72 = 18rem
          de la izquierda). Sobresale con una flechita ←. NO va dentro del aside
          (si no, al cerrarse el aside se la lleva y termina pisando la de abrir). */}
      <AnimatePresence>
        {isOpen && onClose && (
          <motion.button
            key="side-close-tab"
            type="button"
            onClick={onClose}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            aria-label="Cerrar menú lateral"
            title="Cerrar menú"
            className="group fixed left-72 top-1/2 -translate-y-1/2 z-[55] flex items-center justify-center
                       h-20 w-7 rounded-r-2xl bg-marca text-white shadow-[3px_0_12px_rgba(0,0,0,.3)]
                       hover:w-9 transition-all duration-200 active:scale-95"
          >
            <HiChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </motion.button>
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
        <div className="px-4 py-4 border-b-2 border-linea dark:border-linea-dark flex items-center gap-3 shrink-0">
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

        {/* ⭐ ACCESOS RÁPIDOS (multicolor). Emisión de póliza = hero (primero y grande) */}
        {!isVendedor && quickActions.length > 0 && (
          <div className="px-3 pt-3 shrink-0 space-y-2">
            <p className="px-1 text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark">
              Accesos rápidos
            </p>
            {quickActions.map((q) => {
              const Icon = ICON_MAP[q.icon] || HiHome;
              const txt = q.darkText ? "text-[#3c3c3c]" : "text-white";
              const subCls = q.darkText ? "text-black/60" : "text-white/80";
              const chip = q.darkText ? "bg-black/10" : "bg-white/20";
              // ⭐ HERO: un poco más alto/ícono más grande (versión compacta)
              const heroPad = q.hero ? "py-3" : "py-2.5";
              const heroIcon = q.hero ? "h-9 w-9" : "h-8 w-8";
              const heroTitle = q.hero ? "text-[14px]" : "text-[13px]";
              return (
                <NavLink
                  key={q.to}
                  to={q.to}
                  className={`group relative flex items-center gap-2.5 px-3 ${heroPad} rounded-xl transition-all hover:brightness-105 active:translate-y-[2px] ${txt} ${q.hero ? "ring-2 ring-white/25" : ""}`}
                  style={{ backgroundColor: q.bg, boxShadow: `0 4px 0 ${q.shadow}` }}
                >
                  {q.hero && (
                    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-4 px-1.5 rounded-full bg-white text-[8px] font-black tracking-wide shadow" style={{ color: q.bg }}>
                      ★ RÁPIDO
                    </span>
                  )}
                  <span className={`flex items-center justify-center ${heroIcon} rounded-lg shrink-0 ${chip}`}>
                    <Icon className={q.hero ? "w-5 h-5" : "w-[18px] h-[18px]"} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`${heroTitle} font-black leading-tight truncate`}>{q.label}</div>
                    <div className={`text-[9px] font-bold uppercase tracking-widest leading-tight truncate ${subCls}`}>{q.sub}</div>
                  </div>
                  <HiChevronDown className="w-4 h-4 -rotate-90 opacity-80 group-hover:opacity-100 transition shrink-0" />
                </NavLink>
              );
            })}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2.5 px-3 space-y-1.5 scrollbar-hide">
          {menuGroups.map((group, gi) => {
            const sc = SECTION_COLORS[group.id] || { icon: "currentColor", soft: "transparent", rail: "transparent" };
            return (
              <div key={gi} className={gi > 0 ? "mt-2" : ""}>

                {/* Grupo plano */}
                {group.flat ? (
                  <div className="rounded-2xl p-1.5" style={{ backgroundColor: sc.soft }}>
                    <p className="px-2 pb-1 pt-0.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: sc.icon }}>
                      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.icon }} />
                      {group.title}
                    </p>
                    {group.items.map(item => {
                      const Icon = ICON_MAP[item.icon] || HiHome;
                      return (
                        <NavLink key={item.to} to={item.to} end={item.to === "/"}
                          className={({ isActive }) => `
                            group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-bold
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
                              <Icon className="w-[18px] h-[18px] shrink-0" style={!isActive && !item.highlight ? { color: sc.icon } : undefined} />
                              <span className="flex-1 truncate">{item.label}</span>
                              <Badge value={item.badge} tone={item.tone} />
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                ) : (
                  /* Grupo con acordeón */
                  <div className="rounded-2xl p-1.5" style={{ backgroundColor: sc.soft }}>
                    <button onClick={() => toggle(group.id)}
                      className={`
                        w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg
                        text-sm font-black transition-all duration-150
                        ${open[group.id]
                          ? "bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark"
                          : "text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
                        }
                      `}>
                      <div className="flex items-center gap-2">
                        {(() => { const Icon = ICON_MAP[group.icon] || HiViewGrid; return <Icon className="w-[18px] h-[18px] shrink-0" style={{ color: sc.icon }} />; })()}
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
                          <div className="pl-3 pt-1">
                            <div className="pl-3 space-y-0.5 border-l-2" style={{ borderColor: sc.rail }}>
                              {group.items.map(item => {
                                const Icon = ICON_MAP[item.icon] || HiHome;
                                return (
                                  <NavLink key={item.to} to={item.to}
                                    className={({ isActive }) => `
                                      group flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-bold
                                      transition-all duration-150
                                      ${isActive
                                        ? "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul"
                                        : "text-suave dark:text-suave-dark hover:bg-surface dark:hover:bg-surface-dark hover:text-titulo dark:hover:text-titulo-dark"
                                      }
                                    `}>
                                    {({ isActive }) => (
                                      <>
                                        <Icon className="w-4 h-4 shrink-0" style={!isActive ? { color: sc.icon } : undefined} />
                                        <span className="flex-1 truncate">{item.label}</span>
                                        <Badge value={item.badge} tone={item.tone} />
                                      </>
                                    )}
                                  </NavLink>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer del sidebar */}
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