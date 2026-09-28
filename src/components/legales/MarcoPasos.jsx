// src/components/legales/MarcoPasos.jsx
//
// 🧭 El marco de las pantallas guiadas ("Cargar una denuncia", "Pedir turno"):
// arriba ← (volver) · título · × (salir), la barrita "Paso 3 de 7" y abajo los
// botones grandes (Atrás / Siguiente). Pensado para el dedo en el celu.
import { HiArrowLeft, HiX } from "react-icons/hi";

export default function MarcoPasos({
  titulo,
  paso = 0,
  total = 0,
  etiqueta = "",
  derecha = "",
  onAtras,
  onCerrar,
  pie = null,
  children,
}) {
  return (
    <div className="mx-auto w-full max-w-lg flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onAtras}
            className="h-11 w-11 -ml-2 inline-flex items-center justify-center rounded-full text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
            aria-label="Volver"
          >
            <HiArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-[16px] font-semibold text-titulo dark:text-titulo-dark">{titulo}</h1>
          <button
            type="button"
            onClick={onCerrar}
            className="h-11 w-11 -mr-2 inline-flex items-center justify-center rounded-full text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
            aria-label="Salir"
          >
            <HiX className="w-6 h-6" />
          </button>
        </div>
        {total > 0 && (
          <>
            <div className="flex items-center justify-between gap-2 text-[13px]">
              <span className="text-suave dark:text-suave-dark">
                <b className="text-sky-700 dark:text-sky-400">Paso {paso} de {total}</b>
                {etiqueta ? ` · ${etiqueta}` : ""}
              </span>
              <span className="text-suave dark:text-suave-dark truncate">{derecha}</span>
            </div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className={`h-1.5 rounded-full ${i < paso ? "bg-sky-700 dark:bg-sky-500" : "bg-linea dark:bg-linea-dark"}`} />
              ))}
            </div>
          </>
        )}
      </div>
      {children}
      {pie && <div className="flex gap-3 border-t border-linea dark:border-linea-dark pt-4 mt-1">{pie}</div>}
    </div>
  );
}

/** Botón grande de abajo: "Siguiente →", "Guardar", "Dar el turno"… */
export function BotonGrande({ children, onClick, disabled = false, tono = "azul", type = "button", className = "" }) {
  const tonos = {
    azul: "bg-sky-700 hover:bg-sky-800 text-white",
    verde: "bg-green-700 hover:bg-green-800 text-white",
    blanco:
      "bg-card dark:bg-card-dark border border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl min-h-[54px] px-5 text-[16px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        tonos[tono] || tonos.azul
      } ${className}`}
    >
      {children}
    </button>
  );
}
