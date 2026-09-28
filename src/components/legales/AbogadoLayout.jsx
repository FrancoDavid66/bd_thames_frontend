// src/components/legales/AbogadoLayout.jsx
//
// ⚖️ Marco de la app para un usuario ABOGADO (alguien de afuera de THAMES).
// Sin menú lateral, sin barra de abajo, sin caja ni contadores: solo una
// barrita arriba (THAMES · Legales, su foto y su nombre, modo oscuro y Salir)
// y sus casos. El servidor igual le bloquea todo lo que no sea Legales.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HiLogout, HiMoon, HiSun } from "react-icons/hi";

import logoThames from "../../assets/logos/logo_thames.svg";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { pedirCatalogo } from "../../services/legales";
import { AvatarAbogado } from "./PiezasLegales";

export default function AbogadoLayout({ children }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [yo, setYo] = useState(null); // su perfil de abogado (nombre y foto)
  const nombre = yo?.nombre || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "";

  useEffect(() => {
    let vivo = true;
    pedirCatalogo()
      .then((c) => vivo && setYo(c?.abogado || null))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark">
      {/* 📱 safe-area: con viewport-fit=cover, en el iPhone nada queda debajo del notch */}
      <header
        className="sticky top-0 z-40 border-b border-linea dark:border-linea-dark bg-card/95 dark:bg-card-dark/95 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
      >
        <div className="max-w-5xl mx-auto flex items-center gap-3 px-3 sm:px-4 h-14">
          <Link to="/legales" className="flex items-center gap-3">
            <img src={logoThames} alt="THAMES" className="h-7 w-auto" />
            <span className="text-[14px] font-semibold text-suave dark:text-suave-dark border-l border-linea dark:border-linea-dark pl-3">Legales</span>
          </Link>
          <span className="flex-1" />
          <span className="inline-flex items-center gap-2 text-[13px] font-medium" title={nombre}>
            <AvatarAbogado id={yo?.id} nombre={nombre} foto={yo?.foto_url} size={28} />
            <span className="hidden sm:inline">{nombre}</span>
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"
            aria-label={isDark ? "Modo claro" : "Modo oscuro"}
            title={isDark ? "Modo claro" : "Modo oscuro"}
          >
            {isDark ? <HiSun className="w-4 h-4" /> : <HiMoon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={logout}
            className="h-9 inline-flex items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark px-3 text-[13px] font-semibold text-titulo dark:text-titulo-dark"
          >
            <HiLogout className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>
      <main className="px-0 sm:px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">{children}</main>
    </div>
  );
}
