/* src/components/tareas/TareaCard.jsx */
export default function TareaCard({ seccion, count, activa, onClick }) {
  const Icon = seccion.icon;
  const vacia = count === 0;
  return (
    <button
      type="button"
      onClick={vacia ? undefined : onClick}
      disabled={vacia}
      className={`text-left rounded-xl border p-4 transition-all ${
        activa
          ? "border-slate-600 bg-slate-800/80 ring-1 ring-slate-600"
          : "border-slate-800 bg-slate-900 hover:bg-slate-800/60"
      } ${vacia ? "opacity-40 cursor-default" : "cursor-pointer"}`}
    >
      <div className="flex items-center justify-between">
        <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${seccion.c.chip}`}>
          <Icon className={`w-5 h-5 ${seccion.c.icon}`} />
        </span>
        <span className={`text-2xl font-semibold ${count > 0 ? "text-slate-100" : "text-slate-600"}`}>{count}</span>
      </div>
      <div className="mt-3 text-sm font-medium text-slate-200 leading-snug">{seccion.titulo}</div>
      {!vacia && (
        <div className={`mt-1 text-xs ${seccion.c.icon}`}>{activa ? "Ocultar lista" : "Ver lista"}</div>
      )}
    </button>
  );
}