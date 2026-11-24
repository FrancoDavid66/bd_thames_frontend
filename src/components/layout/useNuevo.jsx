// src/components/layout/useNuevo.jsx
//
// ✨ Botones NUEVOS del menú (Franco 23/11/2026): brillan y dicen «NUEVO» hasta que la
//    persona entra una vez a esa sección (o hasta la fecha que dice `nuevo` en menuData.js).
//    Se acuerda en ESTE navegador (localStorage), por usuario.
//
//    Ej: { to: "/legales", label: "Consultas", nuevo: "2026-12-07" } → brilla hasta que
//        entrás a Consultas, o hasta el 07/12 (lo que pase primero).
//
//    const { esNuevo, hayNuevos } = useNuevo(items, usuario);
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const clave = (usuario, to) => `thames.nuevo.visto:${usuario || "-"}:${to}`;

function leido(usuario, to) {
  try {
    return window.localStorage.getItem(clave(usuario, to)) === "1";
  } catch {
    return false;
  }
}

export default function useNuevo(items = [], usuario = "") {
  const { pathname } = useLocation();
  const [vistos, setVistos] = useState(0); // solo para volver a dibujar

  const conNuevo = useMemo(() => (items || []).filter((it) => it && it.nuevo), [items]);

  // Al entrar a la sección, deja de brillar.
  useEffect(() => {
    conNuevo.forEach((it) => {
      if (pathname === it.to || pathname.startsWith(`${it.to}/`)) {
        try {
          if (!leido(usuario, it.to)) {
            window.localStorage.setItem(clave(usuario, it.to), "1");
            setVistos((n) => n + 1);
          }
        } catch {
          /* sin localStorage: brilla hasta la fecha */
        }
      }
    });
  }, [pathname, conNuevo, usuario]);

  const esNuevo = useCallback(
    (item) => Boolean(item?.nuevo) && hoy() <= item.nuevo && !leido(usuario, item.to),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usuario, vistos]
  );
  const hayNuevos = useMemo(() => conNuevo.some((it) => esNuevo(it)), [conNuevo, esNuevo]);

  return { esNuevo, hayNuevos };
}

/** El cartelito «NUEVO» que va al lado del nombre del botón. */
export function PillNuevo() {
  return (
    <span className="shrink-0 rounded-full bg-duo-azul px-1.5 py-[2px] text-[9px] font-bold leading-none tracking-wide text-white">
      NUEVO
    </span>
  );
}
