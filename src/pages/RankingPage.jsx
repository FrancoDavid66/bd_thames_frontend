/* src/pages/RankingPage.jsx
 *
 * 🏆 RANKING — dos pestañas:
 *   · OFICINAS (la que abre por defecto): el podio de las oficinas con más
 *     pólizas nuevas del mes, estilo "estadio de noche" (RankingOficinas.jsx).
 *   · EQUIPO: el ranking de puntos de cada empleado, el de siempre
 *     (RankingEquipo.jsx).
 *
 * Recuerda la última pestaña en este navegador. Si venís desde el cartel del
 * Inicio ("Ver ranking"), abre directo en Oficinas.
 */
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HiOfficeBuilding, HiUserGroup } from "react-icons/hi";

import RankingOficinas from "../components/ranking/RankingOficinas";
import RankingEquipo from "../components/ranking/RankingEquipo";
import { leerPref, guardarPref } from "../components/polizasNuevas/comun";

const CLAVE_VISTA = "ranking.vista";
const valida = (v) => (v === "equipo" ? "equipo" : "oficinas");

export default function RankingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [vista, setVista] = useState(() =>
    valida(location.state?.vista || leerPref(CLAVE_VISTA, "oficinas"))
  );

  // Si vino con {vista} desde el Inicio: se anota como la última vista y se
  // borra del historial (si no, al recargar volvía siempre a Oficinas).
  useEffect(() => {
    if (!location.state?.vista) return;
    guardarPref(CLAVE_VISTA, valida(location.state.vista));
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiar = (v) => {
    const nueva = valida(v);
    setVista(nueva);
    guardarPref(CLAVE_VISTA, nueva);
  };

  if (vista === "equipo") {
    return (
      <RankingEquipo
        selector={
          <div
            role="group"
            aria-label="Qué ranking ver"
            className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-1"
          >
            <button
              type="button"
              aria-pressed="false"
              onClick={() => cambiar("oficinas")}
              className="flex min-h-[40px] items-center justify-center gap-2 rounded-lg text-[13px] font-semibold text-suave transition-colors hover:bg-surface dark:text-suave-dark dark:hover:bg-surface-dark"
            >
              <HiOfficeBuilding className="h-4 w-4" /> Oficinas
            </button>
            <button
              type="button"
              aria-pressed="true"
              className="flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-titulo text-[13px] font-semibold text-white dark:bg-titulo-dark dark:text-surface-dark"
            >
              <HiUserGroup className="h-4 w-4" /> Equipo
            </button>
          </div>
        }
      />
    );
  }

  return <RankingOficinas onCambiarVista={cambiar} />;
}
