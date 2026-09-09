// src/components/layout/FooterNav.jsx
//
// 📱 MENÚ EN MODO "BARRA INFERIOR" (footer) — versión con:
//    · 5 accesos SIMPLES fijos (ícono + texto chico) + botón "Más".
//    · La barra se puede ESCONDER. Cuando está escondida, sobresale una
//      LENGÜETA con flechita ↑ que la vuelve a subir.
//    · "Más" abre una HOJA desde abajo con TODO el menú (mismas secciones
//      y badges que el sidebar → usa menuData.js).
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
  ICON_MAP, FOOTER_TABS, buildMenuGroups,
} from "./menuData";

// 🎨 Mismo criterio que el Sidebar: UN SOLO acento (azul) para todo lo
//    interactivo, en vez de un color distinto por tab/sección/acceso
//    rápido. El color se reserva para este acento y para las badges
//    numéricas (rojo/amarillo), que sí avisan algo pendiente.
const ACTIVE_CLS = "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul border-duo-azul/40";
const INACTIVE_CLS = "text-suave dark:text-suave-dark border-transparent bg-card/50 dark:bg-card-dark/40 hover:bg-surface dark:hover:bg-surface-dark";

// Ítems con `highlight` en menuData.js: `highlight: true` → azul (default);
// `highlight: "verde"` → verde (ej. Gestión de Pagos, el más usado).
const HIGHLIGHT_CLS = {
  azul: "text-duo-azul border-duo-azul/25 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)]",
  verde: "text-duo-verde-sombra dark:text-duo-verde border-duo-verde/25 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]",
};

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
                       h-6 w-14 rounded-t-lg bg-duo-azul text-white
                       hover:h-7 transition-all active:scale-95"
          >
            <HiChevronUp className="w-4 h-4" />
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
            className="fixed bottom-0 left-0 right-0 z-50 bg-card dark:bg-card-dark border-t border-linea dark:border-linea-dark shadow-[0_-2px_12px_rgba(0,0,0,.08)]"
          >
            {/* mini-solapa para ESCONDER la barra (flechita ↓) */}
            <button
              onClick={() => onHide?.()}
              aria-label="Esconder barra"
              className="absolute -top-5 left-1/2 -translate-x-1/2 h-5 w-14 rounded-t-lg bg-duo-azul text-white flex items-center justify-center hover:h-6 transition-all active:scale-95"
            >
              <HiChevronDown className="w-4 h-4" />
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
                      relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-colors active:scale-95
                      ${isActive ? "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)]" : "hover:bg-surface dark:hover:bg-surface-dark"}
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <span className="relative">
                          <Icon className={`w-5 h-5 ${isActive ? "text-duo-azul" : "text-suave dark:text-suave-dark"}`} />
                          {b > 0 && (
                            <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-duo-rojo text-white text-[8px] font-medium flex items-center justify-center">
                              {b}
                            </span>
                          )}
                        </span>
                        <span
                          className={`text-[10px] font-medium leading-none truncate max-w-full ${isActive ? "text-duo-azul" : "text-suave dark:text-suave-dark"}`}
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
                className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-colors active:scale-95 hover:bg-surface dark:hover:bg-surface-dark"
              >
                <span className="relative">
                  <HiDotsHorizontal className="w-5 h-5 text-titulo dark:text-titulo-dark" />
                  {totalBadges > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-duo-rojo text-white text-[8px] font-medium flex items-center justify-center">
                      {totalBadges}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium leading-none text-suave dark:text-suave-dark">Más</span>
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
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[61] max-h-[88dvh] flex flex-col bg-card dark:bg-card-dark rounded-t-2xl border-t border-linea dark:border-linea-dark shadow-xl"
            >
              <div className="shrink-0 pt-2">
                <div className="mx-auto h-1 w-10 rounded-full bg-linea dark:bg-linea-dark" />
              </div>
              <div className="px-4 py-3 flex items-center justify-between border-b border-linea dark:border-linea-dark shrink-0">
                <h2 className="text-[14px] font-semibold text-titulo dark:text-titulo-dark">Menú completo</h2>
                <button onClick={() => setSheetOpen(false)}
                  aria-label="Cerrar menú"
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-suave dark:text-suave-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors">
                  <HiX className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-hide pb-6">

                {/* 📦 Secciones — TODAS desplegadas, ítems en GRID auto-fill responsivo. */}
                {menuGroups.map((group, gi) => {
                  return (
                    <div key={gi} className="rounded-lg p-2 mt-1.5">
                      {/* Título de sección (si tiene — el grupo "Inicio" no lleva) */}
                      {group.title && (
                        <p className="px-1 pb-1.5 text-[12px] font-medium text-suave dark:text-suave-dark flex items-center gap-2">
                          {group.title}
                          <GroupBadge items={group.items} />
                        </p>
                      )}
                      {/* Ítems en grilla que llena columnas según el ancho */}
                      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
                        {group.items.map(item => {
                          const Icon = ICON_MAP[item.icon] || HiHome;
                          return (
                            <NavLink key={item.to} to={item.to} end={item.to === "/"}
                              title={item.label}
                              className={({ isActive }) => `
                                flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors border
                                ${isActive
                                  ? ACTIVE_CLS
                                  : item.highlight
                                    ? (HIGHLIGHT_CLS[item.highlight] || HIGHLIGHT_CLS.azul)
                                    : INACTIVE_CLS
                                }`}>
                              {({ isActive }) => (
                                <>
                                  <Icon className="w-4 h-4 shrink-0" />
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

              {/* Footer de la hoja: solo el tema */}
              <div className="shrink-0 px-4 py-3 border-t border-linea dark:border-linea-dark">
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
    <span className={`shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-medium ${cls}`}>
      {v}
    </span>
  );
}

function GroupBadge({ items }) {
  const total = (items || []).reduce((acc, it) => acc + (Number(it.badge) || 0), 0);
  if (total <= 0) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-medium bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo">
      {total}
    </span>
  );
}