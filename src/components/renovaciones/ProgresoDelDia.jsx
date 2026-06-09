// src/components/renovaciones/ProgresoDelDia.jsx
//
// Versión discreta: una línea con "Hoy gestionaste N" + barrita fina.
// Sin animaciones, trofeos ni efectos. Mantiene la misma interfaz de props
// que la versión anterior para no romper la llamada desde la página.

export default function ProgresoDelDia({
  hechasHoy = 0,
  pendientesTotales = 0,
}) {
  // Meta = lo que ya hiciste + lo que queda. La barra se llena al gestionar.
  const meta = Math.max(1, pendientesTotales + hechasHoy);
  const pct = Math.min(100, Math.round((hechasHoy / meta) * 100));
  const completo = pendientesTotales === 0 && hechasHoy > 0;

  return (
    <div className="flex items-center gap-2 text-xs text-white/50 whitespace-nowrap">
      <span>
        Hoy gestionaste{" "}
        <span className="font-bold text-white/80 tabular-nums">{hechasHoy}</span>
      </span>
      <span className="relative inline-block h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
        <span
          className={completo ? "absolute inset-y-0 left-0 rounded-full bg-amber-400" : "absolute inset-y-0 left-0 rounded-full bg-emerald-400"}
          style={{ width: `${pct}%` }}
        />
      </span>
      {completo && <span className="text-amber-300 font-semibold">¡Listo!</span>}
    </div>
  );
}