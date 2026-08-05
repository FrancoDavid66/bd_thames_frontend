// src/components/layout/FooterNav.jsx
//
// 📱 MENÚ EN MODO "BARRA INFERIOR" (footer) — versión con:
//    · 5 accesos SIMPLES fijos (ícono + texto chico) + botón "Más".
//    · La barra se puede ESCONDER. Cuando está escondida, sobresale una
//      LENGÜETA con flechita ↑ que la vuelve a subir.
//    · "Más" abre una HOJA desde abajo con TODO el menú (mismas secciones,
//      colores y badges que el sidebar → usa menuData.js).
//
import { useMemo, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiChevronDown, HiChevronUp, HiX, HiHome,
  HiDotsHorizontal,
} from "react-icons/hi";
import ThemeToggle from "./ThemeToggle";
import {
  ICON_MAP, SECTION_COLORS, QUICK_ACTIONS, FOOTER_TABS, buildMenuGroups,
} from "./menuData";

export default function FooterNav({
  isVisible = true,          // 🚀 la barra está visible o escondida (viene de App)
  onHide,                    // 🚀 esconder la barra (persiste)
  onShow,                    // 🚀 mostrar la barra (persiste) — la usa la lengüeta
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

  const [sheetOpen, setSheetOpen] = useState(false);
  // 🚀 visible/escondida ahora lo maneja App (para persistir). Alias locales:
  const barHidden = !isVisible;

  // Al cambiar de ruta, cerramos la hoja
  useEffect(() => { setSheetOpen(false); }, [location.pathname]);

  // Bloquea scroll del body mientras la hoja está abierta
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [sheetOpen]);

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

  // Badges totales por RUTA (para pintar el puntito en un tab si corresponde)
  const badgeByRoute = useMemo(() => {
    const map = {};
    for (const g of menuGroups) for (const it of g.items) {
      if (it.badge) map[it.to] = (map[it.to] || 0) + Number(it.badge);
    }
    return map;
  }, [menuGroups]);

  const totalBadges = useMemo(
    () => Object.values(badgeByRoute).reduce((a, b) => a + b, 0),
    [badgeByRoute]
  );

  return (
    <>
      {/* ============ LENGÜETA (cuando la barra está ESCONDIDA) ============ */}
      <AnimatePresence>
        {barHidden && (
          <motion.button
            key="foot-tab"
            onClick={() => onShow?.()}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-label="Mostrar barra de menú"
            className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center
                       h-7 w-16 rounded-t-2xl bg-marca text-white shadow-[0_-3px_10px_rgba(0,0,0,.25)]
                       hover:h-8 transition-all active:scale-95"
          >
            <HiChevronUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ===================== BARRA FIJA INFERIOR ===================== */}
      <AnimatePresence>
        {!barHidden && (
          <motion.nav
            key="foot-bar"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card dark:bg-card-dark border-t-2 border-linea dark:border-linea-dark shadow-[0_-4px_20px_rgba(0,0,0,.15)]"
          >
            {/* 🔴 mini-solapa ROJA para ESCONDER la barra (flechita ↓) — igual
                estilo que la lengüeta del sidebar (bg-marca). */}
            <button
              onClick={() => onHide?.()}
              aria-label="Esconder barra"
              className="absolute -top-6 left-1/2 -translate-x-1/2 h-6 w-14 rounded-t-2xl bg-marca text-white shadow-[0_-3px_10px_rgba(0,0,0,.25)] flex items-center justify-center hover:h-7 transition-all active:scale-95"
            >
              <HiChevronDown className="w-5 h-5" />
            </button>

            <div className="flex items-stretch justify-around px-1 py-1 gap-0.5 max-w-2xl mx-auto">
              {FOOTER_TABS.map((t) => {
                const Icon = ICON_MAP[t.icon] || HiHome;
                const b = badgeByRoute[t.to] || 0;
                return (
                  <NavLink
                    key={t.to}
                    to={t.to}
                    end={t.to === "/"}
                    className={({ isActive }) => `
                      relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-all active:scale-90
                      ${isActive ? "bg-surface dark:bg-surface-dark" : "hover:bg-surface dark:hover:bg-surface-dark"}
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <span className="relative">
                          <Icon className="w-[22px] h-[22px]" style={{ color: isActive ? t.color : undefined }} />
                          {b > 0 && (
                            <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-duo-rojo text-white text-[8px] font-black flex items-center justify-center">
                              {b}
                            </span>
                          )}
                        </span>
                        <span
                          className={`text-[9px] font-black leading-none truncate max-w-full ${isActive ? "" : "text-suave dark:text-suave-dark"}`}
                          style={{ color: isActive ? t.color : undefined }}
                        >
                          {t.label}
                        </span>
                      </>
                    )}
                  </NavLink>
                );
              })}

              {/* Botón MÁS (abre la hoja con TODO) */}
              <button
                onClick={() => setSheetOpen(true)}
                className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-all active:scale-90 hover:bg-surface dark:hover:bg-surface-dark"
              >
                <span className="relative">
                  <HiDotsHorizontal className="w-[22px] h-[22px] text-titulo dark:text-titulo-dark" />
                  {totalBadges > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-duo-rojo text-white text-[8px] font-black flex items-center justify-center">
                      {totalBadges}
                    </span>
                  )}
                </span>
                <span className="text-[9px] font-black leading-none text-suave dark:text-suave-dark">Más</span>
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* ===================== HOJA DESDE ABAJO (menú completo) ===================== */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              key="sheet-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[61] max-h-[88dvh] flex flex-col bg-card dark:bg-card-dark rounded-t-3xl border-t-2 border-linea dark:border-linea-dark shadow-2xl"
            >
              <div className="shrink-0 pt-2">
                <div className="mx-auto h-1.5 w-12 rounded-full bg-linea dark:bg-linea-dark" />
              </div>
              <div className="px-4 py-3 flex items-center justify-between border-b-2 border-linea dark:border-linea-dark shrink-0">
                <h2 className="text-sm font-black text-titulo dark:text-titulo-dark">Menú completo</h2>
                {/* 🔴 ✕ estilo Duo 3D rojo */}
                <button onClick={() => setSheetOpen(false)}
                  aria-label="Cerrar menú"
                  className="h-9 w-9 rounded-xl flex items-center justify-center bg-duo-rojo text-white shadow-[0_3px_0_var(--color-duo-rojo-sombra)] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_0_0_var(--color-duo-rojo-sombra)] transition-all">
                  <HiX className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-hide pb-6">

                {/* ⭐ Accesos rápidos — GRID responsivo de CAJAS compactas.
                    Base: 3 columnas. En pantallas anchas pasa a 4/5 columnas y
                    aprovecha todo el espacio. "Registrar pago" es una caja más,
                    pero SIEMPRE verde y resaltada (anillo + ★) por ser la más usada. */}
                {!isVendedor && quickActions.length > 0 && (
                  <div className="space-y-2">
                    <p className="px-1 text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark text-center">Accesos rápidos</p>

                    {/* Centrado horizontalmente: grid con ancho acotado y auto-centrado */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 justify-items-center max-w-md mx-auto">
                      {quickActions.map((q) => {
                        const Icon = ICON_MAP[q.icon] || HiHome;
                        const esPago = q.to === "/pagos";           // el destacado
                        const txt = q.darkText ? "text-[#3c3c3c]" : "text-white";
                        const chip = q.darkText ? "bg-black/10" : "bg-white/20";
                        return (
                          <NavLink
                            key={q.to}
                            to={q.to}
                            title={q.label}
                            className={`relative w-full flex flex-col items-center justify-center text-center gap-1.5 p-2.5 rounded-2xl transition-all active:translate-y-[2px] ${txt} ${esPago ? "ring-2 ring-white/40" : ""}`}
                            style={{ backgroundColor: q.bg, boxShadow: `0 4px 0 ${q.shadow}` }}
                          >
                            {esPago && (
                              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-4 w-4 rounded-full bg-white text-[9px] font-black shadow" style={{ color: q.bg }}>★</span>
                            )}
                            <span className={`flex items-center justify-center h-9 w-9 rounded-xl shrink-0 ${chip}`}>
                              <Icon className="w-5 h-5" />
                            </span>
                            <span className="text-[11px] font-black leading-tight w-full truncate">{q.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 📦 Secciones — TODAS desplegadas, ítems en GRID auto-fill
                    responsivo (chips ícono+texto). Ocupa mucho menos alto. */}
                {menuGroups.map((group, gi) => {
                  const sc = SECTION_COLORS[group.id] || { icon: "currentColor", soft: "transparent", rail: "transparent" };
                  return (
                    <div key={gi} className="rounded-2xl p-2 mt-1.5" style={{ backgroundColor: sc.soft }}>
                      {/* Título de sección */}
                      <p className="px-1 pb-1.5 text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: sc.icon }}>
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: sc.icon }} />
                        {group.title}
                        <GroupBadge items={group.items} />
                      </p>
                      {/* Ítems en grilla que llena columnas según el ancho */}
                      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
                        {group.items.map(item => {
                          const Icon = ICON_MAP[item.icon] || HiHome;
                          return (
                            <NavLink key={item.to} to={item.to} end={item.to === "/"}
                              title={item.label}
                              className={({ isActive }) => `
                                flex items-center gap-2 px-2.5 py-2 rounded-xl text-[13px] font-bold transition-all border-2
                                ${isActive
                                  ? "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul border-duo-azul/40"
                                  : item.highlight
                                    ? "text-duo-amarillo-sombra dark:text-duo-amarillo bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] border-duo-amarillo/40"
                                    : "text-suave dark:text-suave-dark border-transparent bg-card/50 dark:bg-card-dark/40 hover:bg-surface dark:hover:bg-surface-dark"
                                }`}>
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
                    </div>
                  );
                })}
              </div>

              {/* Footer de la hoja: solo el tema (el botón de alternar se quitó) */}
              <div className="shrink-0 px-4 py-3 border-t-2 border-linea dark:border-linea-dark">
                <ThemeToggle />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

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

function GroupBadge({ items }) {
  const total = (items || []).reduce((acc, it) => acc + (Number(it.badge) || 0), 0);
  if (total <= 0) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo">
      {total}
    </span>
  );
}