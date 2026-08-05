// src/components/admin/AdminHorariosCierre.jsx
//
// Panel para configurar los horarios de cierre de caja (mediodía y noche)
// de cada oficina. Lo usa el ADMIN. Estos horarios disparan el pop-up
// recordatorio de los cajeros.
import { useEffect, useState, useCallback } from "react";
import { HiSave, HiClock } from "react-icons/hi";
import toast from "react-hot-toast";
import api from "../../services/api";

export default function AdminHorariosCierre() {
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [ofiRes, horRes] = await Promise.all([
        api.get("usuarios/oficinas/"),
        api.get("recaudacion/horarios-cierre/").catch(() => ({ data: [] })),
      ]);
      const ofis = Array.isArray(ofiRes.data) ? ofiRes.data : ofiRes.data?.results || [];
      const hor = Array.isArray(horRes.data) ? horRes.data : horRes.data?.results || [];
      const porOfi = {};
      hor.forEach((h) => { porOfi[h.oficina] = h; });

      setFilas(ofis.map((o) => {
        const h = porOfi[o.id] || {};
        return {
          oficina: o.id,
          oficina_nombre: o.nombre,
          mediodia: h.mediodia ? String(h.mediodia).slice(0, 5) : "",
          noche: h.noche ? String(h.noche).slice(0, 5) : "",
          aviso_min: h.aviso_min ?? 30,
          tolerancia_min: h.tolerancia_min ?? 5,
        };
      }));
    } catch {
      toast.error("No se pudieron cargar los horarios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const set = (i, campo, val) =>
    setFilas((fs) => fs.map((f, idx) => (idx === i ? { ...f, [campo]: val } : f)));

  const guardar = async (fila) => {
    setGuardando(fila.oficina);
    try {
      await api.post("recaudacion/horarios-cierre/", {
        oficina: fila.oficina,
        mediodia: fila.mediodia || "",
        noche: fila.noche || "",
        aviso_min: Number(fila.aviso_min) || 30,
        tolerancia_min: Number(fila.tolerancia_min) || 5,
        activo: true,
      });
      toast.success(`Horarios de ${fila.oficina_nombre} guardados`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo guardar");
    } finally {
      setGuardando(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-linea)] border-t-[var(--color-oficina)]" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-4 text-[13px] font-semibold text-[var(--color-suave)]">
        Configurá el horario de cada cierre por oficina. El sistema avisa con un pop-up
        <strong className="text-[var(--color-titulo)]"> {filas[0]?.aviso_min ?? 30} min antes</strong> y da
        <strong className="text-[var(--color-titulo)]"> {filas[0]?.tolerancia_min ?? 5} min de tolerancia</strong>.
        Dejá vacío un turno si esa oficina no lo tiene.
      </p>

      {filas.map((f, i) => (
        <div key={f.oficina} className="rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-4">
          <div className="mb-3 text-[15px] font-black text-[var(--color-titulo)]">{f.oficina_nombre}</div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Cierre mediodía">
              <input type="time" value={f.mediodia} onChange={(e) => set(i, "mediodia", e.target.value)} className="inp" />
            </Campo>
            <Campo label="Cierre noche">
              <input type="time" value={f.noche} onChange={(e) => set(i, "noche", e.target.value)} className="inp" />
            </Campo>
            <Campo label="Avisar antes (min)">
              <input type="number" min="1" value={f.aviso_min} onChange={(e) => set(i, "aviso_min", e.target.value)} className="inp" />
            </Campo>
            <Campo label="Tolerancia (min)">
              <input type="number" min="0" value={f.tolerancia_min} onChange={(e) => set(i, "tolerancia_min", e.target.value)} className="inp" />
            </Campo>
          </div>

          <button
            onClick={() => guardar(f)}
            disabled={guardando === f.oficina}
            className="mt-3 flex items-center gap-1.5 rounded-xl bg-[var(--color-oficina)] px-4 py-2.5 text-sm font-black text-white shadow-[0_4px_0_var(--color-oficina-fuerte)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-oficina-fuerte)] disabled:opacity-50"
          >
            {guardando === f.oficina
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              : <HiSave />}
            Guardar
          </button>
        </div>
      ))}

      <style>{`
        .inp { width:100%; border-radius:0.75rem; border:2px solid var(--color-linea);
          background:var(--color-surface); padding:0.6rem 0.75rem; font-size:0.875rem;
          font-weight:600; color:var(--color-titulo); outline:none; }
        .inp:focus { border-color:var(--color-oficina); }
        .dark .inp { color-scheme: dark; }
      `}</style>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-[var(--color-suave)]">
        <HiClock className="text-[13px]" /> {label}
      </label>
      {children}
    </div>
  );
}
