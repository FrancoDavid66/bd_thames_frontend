// src/components/admin/AdminHorariosCierre.jsx  (diseño Duo · responsive)
//
// Panel para configurar el horario de cierre de caja de cada oficina (diseño Duo).
// Lo usa el ADMIN. Este horario dispara el pop-up recordatorio de los cajeros.
//
// 📱 RESPONSIVE: los 3 inputs (hora/aviso/tolerancia) ya van en grid (1 col en
//    mobile, 3 desde sm). Esta pasada: inputs h-12 (48px) + text-base (sin zoom
//    de iOS), y el botón Guardar a lo ancho en mobile.
import { useEffect, useState, useCallback } from "react";
import { HiSave, HiClock } from "react-icons/hi";
import toast from "react-hot-toast";
import api from "../../services/api";

const INPUT =
  "w-full h-12 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark " +
  "px-3 text-base sm:text-sm font-bold text-titulo dark:text-titulo-dark outline-none " +
  "focus:border-oficina transition-colors dark:[color-scheme:dark]";

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
          hora_cierre: h.hora_cierre ? String(h.hora_cierre).slice(0, 5) : "",
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
        hora_cierre: fila.hora_cierre || "",
        aviso_min: Number(fila.aviso_min) || 30,
        tolerancia_min: Number(fila.tolerancia_min) || 5,
        activo: true,
      });
      toast.success(`Horario de ${fila.oficina_nombre} guardado`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo guardar");
    } finally {
      setGuardando(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-linea dark:border-linea-dark border-t-oficina" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
      <p className="px-5 pt-5 text-[13px] leading-relaxed font-bold text-suave dark:text-suave-dark">
        Configurá el horario de cierre por oficina. El sistema avisa con un pop-up
        <strong className="text-titulo dark:text-titulo-dark"> {filas[0]?.aviso_min ?? 30} min antes</strong> y da
        <strong className="text-titulo dark:text-titulo-dark"> {filas[0]?.tolerancia_min ?? 5} min de tolerancia</strong>.
        Dejá vacío si esa oficina no tiene un horario fijo.
      </p>

      <div className="divide-y-2 divide-linea dark:divide-linea-dark">
        {filas.map((f, i) => (
          <div key={f.oficina} className="px-5 py-6">
            <div className="mb-4 flex items-center gap-2 text-[15px] font-black text-titulo dark:text-titulo-dark">
              <HiClock className="text-oficina" />
              {f.oficina_nombre}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Campo label="Hora de cierre">
                <input type="time" value={f.hora_cierre} onChange={(e) => set(i, "hora_cierre", e.target.value)} className={INPUT} />
              </Campo>
              <Campo label="Avisar antes (min)">
                <input type="number" min="1" value={f.aviso_min} onChange={(e) => set(i, "aviso_min", e.target.value)} className={INPUT} />
              </Campo>
              <Campo label="Tolerancia (min)">
                <input type="number" min="0" value={f.tolerancia_min} onChange={(e) => set(i, "tolerancia_min", e.target.value)} className={INPUT} />
              </Campo>
            </div>

            <button
              onClick={() => guardar(f)}
              disabled={guardando === f.oficina}
              className="mt-4 w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-oficina px-4 py-2.5 text-sm font-black text-white shadow-[0_4px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 transition-all disabled:opacity-50"
            >
              {guardando === f.oficina
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                : <HiSave className="text-[15px]" />}
              Guardar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-suave dark:text-suave-dark">
        {label}
      </label>
      {children}
    </div>
  );
}
