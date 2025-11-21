// src/components/solicitudes/modalcreate/SolicitudStep.jsx
import { HiUser } from "react-icons/hi";

/**
 * Paso 4: Datos de la Solicitud
 *
 * Props:
 * - responsableNombre: string (muestra el responsable elegido)
 * - onCambiarResponsable: () => void (abre el gate para cambiarlo)
 * - solicitud: { prioridad: "BAJA" | "NORMAL" | "ALTA", observaciones: string }
 * - setSolicitud: (updater) => void
 */
export default function SolicitudStep({
  responsableNombre = "",
  onCambiarResponsable = () => {},
  solicitud = { prioridad: "NORMAL", observaciones: "" },
  setSolicitud = () => {},
}) {
  return (
    <fieldset className="rounded-2xl border border-white/10 bg-white/[.06] p-3 md:p-4">
      <legend className="px-1 text-white/85 text-sm">Solicitud</legend>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Responsable */}
        <div className="space-y-1.5">
          <span className="block text-white/80 text-sm">Responsable</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border border-white/15 text-white/90 bg-white/5">
              <HiUser className="opacity-80" />
              <span className="max-w-[180px] sm:max-w-[220px] truncate">
                {responsableNombre || "—"}
              </span>
            </span>
            <button
              type="button"
              onClick={onCambiarResponsable}
              className="
                inline-flex items-center justify-center
                text-xs px-3 py-1.5 rounded-lg
                bg-white/5 border border-white/10
                text-white/80 hover:bg-white/10 hover:text-white
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
              "
              title="Cambiar responsable"
            >
              Cambiar
            </button>
          </div>
        </div>

        {/* Prioridad */}
        <Select
          label="Prioridad"
          value={solicitud.prioridad || "NORMAL"}
          onChange={(v) => setSolicitud((s) => ({ ...s, prioridad: v }))}
          options={[
            { id: "BAJA", nombre: "Baja" },
            { id: "NORMAL", nombre: "Normal" },
            { id: "ALTA", nombre: "Alta" },
          ]}
        />

        {/* Observaciones */}
        <Textarea
          label="Observaciones"
          value={solicitud.observaciones || ""}
          onChange={(v) => setSolicitud((s) => ({ ...s, observaciones: v }))}
          className="md:col-span-2"
        />
      </div>
    </fieldset>
  );
}

/* ============== UI Bits locales (estilo oscuro consistente) ============== */
function Textarea({ label, value, onChange, className = "" }) {
  return (
    <label className={`text-sm ${className}`}>
      <span className="block text-white/85 mb-1">{label}</span>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-3 outline-none focus:ring-4 ring-rose-200/30 text-white placeholder:text-white/40 transition"
      />
    </label>
  );
}

function Select({ label, value, onChange, options = [], className = "" }) {
  const normalized = Array.isArray(options)
    ? options.map((op) => (typeof op === "string" ? { id: op, nombre: op } : op))
    : [];
  return (
    <label className={`text-sm ${className}`}>
      <span className="block text-white/85 mb-1">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 px-3 py-3 pr-9 outline-none focus:ring-4 ring-violet-200/30 text-white appearance-none transition"
          style={{ backgroundColor: "#141827" }}
          data-theme="dark"
        >
          <option value="">— Seleccionar —</option>
          {normalized.map((op) => (
            <option key={op.id} value={op.id} className="bg-[#0f1324] text-white">
              {op.nombre || op.id}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/80">
          ▾
        </span>
      </div>
    </label>
  );
}
