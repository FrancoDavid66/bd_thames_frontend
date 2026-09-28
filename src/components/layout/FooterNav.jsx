// src/components/layout/FooterNav.jsx
//
// 📱 MENÚ EN MODO "BARRA INFERIOR" (footer) — versión con:
//    · 5 accesos SIMPLES fijos (ícono + texto chico) + botón "Más".
//    · 🖥️ En la COMPU la barra se puede ESCONDER. Cuando está escondida,
//      sobresale una LENGÜETA con flechita ↑ que la vuelve a subir.
//    · 📱 En el CELU y la TABLET (menos de 1024 px) la barra es el menú
//      principal, como en cualquier app: está SIEMPRE, sin lengüetas que
//      tapen el contenido, y respeta la rayita del iPhone (safe area).
//    · "Más" abre una HOJA desde abajo con TODO el menú (mismas secciones
//      y badges que el sidebar → usa menuData.js). Se cierra tocando afuera,
//      con la X, con Escape o arrastrando la manija hacia abajo.
//
import { useMemo, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  HiChevronDown, HiChevronUp, HiX, HiHome,
  HiDotsHorizontal,
} from "react-icons/hi";
import ThemeToggle from "./ThemeToggle";
import {
  ICON_MAP, FOOTER_TABS, buildMenuGroups,
} from "./menuData";
import { useEsEscritorio } from "../../hooks/useMediaQuery";

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
  gestoriaDemorados = 0,     // 🚗 badge de Gestoría (trámites demorados)
  legalesAlertas = 0,        // ⚖️ badge de Legales (fechas vencidas + demorados)
}) {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const isVendedor = user?.perfil?.rol === "VENDEDOR";
  const veGestoria = ["ADMIN", "OFICINA"].includes(user?.perfil?.rol);
  const solTotal = (Number(solPendienteAlta) || 0) + (Number(solPendienteEnvio) || 0);

  const [sheetOpen, setSheetOpen] = useState(false);
  // 🚀 visible/escondida ahora lo maneja App (para persistir).
  //    📱 En celu/tablet NO se esconde nunca (es el menú principal).
  const esEscritorio = useEsEscritorio();
  const barHidden = esEscritorio ? !isVisible : false;
  const arrastre = useDragControls();

  // Al cambiar de ruta, cerramos la hoja
  useEffect(() => { setSheetOpen(false); }, [location.pathname]);

  // Bloquea scroll del body mientras la hoja está abierta + Escape la cierra
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") setSheetOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  const menuGroups = useMemo(
    () => buildMenuGroups({
      isAdmin, isVendedor, solTotal, renovacionesPendientes,
      cuponVencidas, bajasPendientes, serviciosAlertas, siniestrosAbiertos,
      gestoriaDemorados, veGestoria, legalesAlertas,
    }),
    [isAdmin, isVendedor, solTotal, renovacionesPendientes, cuponVencidas, bajasPendientes, serviciosAlertas, siniestrosAbiertos, gestoriaDemorados, veGestoria, legalesAlertas]
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
      {/* ============ LENGÜETA (cuando la barra está ESCONDIDA — solo compu) ============ */}
      <AnimatePresence>
        {barHidden && (
          <motion.button
            key="foot-tab"
            type="button"
            onClick={() => onShow?.()}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-label="Mostrar barra de menú"
            className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center
                       h-6 w-14 rounded-t-lg bg-duo-azul text-white
                       hover:h-7 transition-all active:scale-95"
          >
            <HiChevronUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ===================== BARRA FIJA INFERIOR =====================
          z-40 (igual que el header): así cualquier ventana/modal de las
          pantallas (z-50 para arriba) queda POR ENCIMA de la barra y no
          tapada por ella en el celu. */}
      <AnimatePresence>
        {!barHidden && (
          <motion.nav
            key="foot-bar"
            aria-label="Menú principal"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-linea dark:border-linea-dark bg-card/95 dark:bg-card-dark/95 backdrop-blur shadow-[0_-2px_12px_rgba(0,0,0,.08)]"
            style={{
              paddingBottom: "env(safe-area-inset-bottom)",
              paddingLeft: "env(safe-area-inset-left)",
              paddingRight: "env(safe-area-inset-right)",
            }}
          >
            {/* mini-solapa para ESCONDER la barra (flechita ↓) — solo compu */}
            {esEscritorio && (
              <button
                type="button"
                onClick={() => onHide?.()}
                aria-label="Esconder barra"
                className="absolute -top-5 left-1/2 -translate-x-1/2 h-5 w-14 rounded-t-lg bg-duo-azul text-white flex items-center justify-center hover:h-6 transition-all active:scale-95"
              >
                <HiChevronDown className="w-4 h-4" />
              </button>
            )}

            <div className="mx-auto flex max-w-2xl items-stretch justify-around gap-0.5 px-1 py-1">
              {FOOTER_TABS.map((t) => {
                const Icon = ICON_MAP[t.icon] || HiHome;
                const b = badgeByRoute[t.to] || 0;
                return (
                  <NavLink
                    key={t.to}
                    to={t.to}
                    end={t.to === "/"}
                    className="group relative flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 transition-colors active:bg-surface dark:active:bg-surface-dark"
                  >
                    {({ isActive }) => (
                      <>
                        {/* Píldora detrás del ícono cuando está activo (estilo app) */}
                        <span
                          className={`relative flex h-7 w-12 items-center justify-center rounded-full transition-colors sm:w-14 ${
                            isActive
                              ? "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)]"
                              : "group-hover:bg-surface dark:group-hover:bg-surface-dark"
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${isActive ? "text-duo-azul" : "text-suave dark:text-suave-dark"}`} />
                          {b > 0 && (
                            <span className="absolute -top-1 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-duo-rojo px-1 text-[10px] font-semibold leading-none text-white dark:border-card-dark">
                              {b > 99 ? "99+" : b}
                            </span>
                          )}
                        </span>
                        <span
                          className={`max-w-full truncate text-[11px] leading-none ${isActive ? "font-semibold text-duo-azul" : "font-medium text-suave dark:text-suave-dark"}`}
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
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-label={totalBadges > 0 ? `Más opciones (${totalBadges} pendientes)` : "Más opciones"}
                aria-haspopup="dialog"
                aria-expanded={sheetOpen}
                className="group relative flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 transition-colors active:bg-surface dark:active:bg-surface-dark"
              >
                <span className="relative flex h-7 w-12 items-center justify-center rounded-full transition-colors group-hover:bg-surface dark:group-hover:bg-surface-dark sm:w-14">
                  <HiDotsHorizontal className="h-5 w-5 text-titulo dark:text-titulo-dark" />
                  {totalBadges > 0 && (
                    <span className="absolute -top-1 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-duo-rojo px-1 text-[10px] font-semibold leading-none text-white dark:border-card-dark">
                      {totalBadges > 99 ? "99+" : totalBadges}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-medium leading-none text-suave dark:text-suave-dark">Más</span>
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
              role="dialog"
              aria-modal="true"
              aria-label="Menú completo"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragControls={arrastre}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.7 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 110 || info.velocity.y > 600) setSheetOpen(false);
              }}
              className="fixed bottom-0 left-0 right-0 z-[61] mx-auto flex max-h-[88dvh] w-full max-w-3xl flex-col rounded-t-2xl border-t border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-xl sm:border-x"
            >
              {/* Manija: arrastrala hacia abajo para cerrar */}
              <div
                className="shrink-0 cursor-grab touch-none pb-1 pt-2.5 active:cursor-grabbing"
                onPointerDown={(e) => arrastre.start(e)}
              >
                <div className="mx-auto h-1.5 w-10 rounded-full bg-linea dark:bg-linea-dark" />
              </div>
              <div
                className="flex shrink-0 touch-none items-center justify-between border-b border-linea dark:border-linea-dark py-1.5 pl-4 pr-2"
                onPointerDown={(e) => { if (!e.target.closest("button")) arrastre.start(e); }}
              >
                <h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">Menú completo</h2>
                <button type="button" onClick={() => setSheetOpen(false)}
                  aria-label="Cerrar menú"
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-suave dark:text-suave-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors">
                  <HiX className="w-5 h-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-2 scrollbar-hide pb-6">

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
                      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
                        {group.items.map(item => {
                          const Icon = ICON_MAP[item.icon] || HiHome;
                          return (
                            <NavLink key={item.to} to={item.to} end={item.to === "/"}
                              title={item.label}
                              className={({ isActive }) => `
                                flex min-h-[48px] items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] font-medium transition-colors border
                                ${isActive
                                  ? ACTIVE_CLS
                                  : item.highlight
                                    ? (HIGHLIGHT_CLS[item.highlight] || HIGHLIGHT_CLS.azul)
                                    : INACTIVE_CLS
                                }`}>
                              {() => (
                                <>
                                  <Icon className="w-5 h-5 shrink-0" />
                                  <span className="flex-1 line-clamp-2 leading-tight">{item.label}</span>
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

              {/* Footer de la hoja: solo el tema (+ la rayita del iPhone) */}
              <div
                className="shrink-0 border-t border-linea dark:border-linea-dark px-4 pt-3"
                style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
              >
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