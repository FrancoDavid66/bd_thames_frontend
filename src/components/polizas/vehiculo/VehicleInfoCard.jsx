// src/components/polizas/vehiculo/VehicleInfoCard.jsx
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { HiPencil, HiCheck, HiX } from "react-icons/hi";
import { updatePoliza } from "../../../store/slices/polizasSlice";

const Safe = (v) => (v === 0 ? "0" : !v ? "—" : String(v).trim() || "—");

export default function VehicleInfoCard({ poliza, onSaved }) {
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    marca: poliza?.marca || "",
    modelo: poliza?.modelo || "",
    anio: poliza?.anio || "",
    patente: poliza?.patente || "",
    tipo: poliza?.tipo || "Auto",
  });

  useEffect(() => {
    setForm({
      marca: poliza?.marca || "",
      modelo: poliza?.modelo || "",
      anio: poliza?.anio || "",
      patente: poliza?.patente || "",
      tipo: poliza?.tipo || "Auto",
    });
  }, [poliza?.marca, poliza?.modelo, poliza?.anio, poliza?.patente, poliza?.tipo]);

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const guardar = async () => {
    if (!poliza?.id) return;
    const anioNum = Number(form.anio);
    if (!form.marca || !form.modelo || !form.patente || !anioNum) {
      toast.error("Completá Marca, Modelo, Año y Patente");
      return;
    }
    try {
      await dispatch(
        updatePoliza({
          id: poliza.id,
          ...form,
          anio: anioNum,
          patente: String(form.patente).toUpperCase().trim(),
        })
      ).unwrap();
      toast.success("Datos del vehículo actualizados");
      setEditing(false);
      onSaved?.();
    } catch (e) {
      toast.error(e?.detail || e?.message || "No se pudo actualizar");
    }
  };

  return (
    <div className="p-5 lg:p-6">
      {/* Encabezado + botón editar */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-white/70">Vehículo</div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">
            {Safe(poliza?.marca)} <span className="text-white/70">·</span> {Safe(poliza?.modelo)}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/10 text-white">
              Año {Safe(poliza?.anio)}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-400/15 border border-emerald-400/30 text-emerald-100">
              {Safe(poliza?.tipo)}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400/15 border border-amber-400/30 text-amber-100">
              Patente <span className="font-mono tracking-wide">{Safe(poliza?.patente)}</span>
            </span>
          </div>
        </div>

        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm border border-white/10 transition-colors cursor-pointer"
          >
            <HiPencil className="w-4 h-4" /> Editar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={guardar}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              <HiCheck className="w-4 h-4" /> Guardar
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setForm({
                  marca: poliza?.marca || "",
                  modelo: poliza?.modelo || "",
                  anio: poliza?.anio || "",
                  patente: poliza?.patente || "",
                  tipo: poliza?.tipo || "Auto",
                });
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm border border-white/10 transition-colors cursor-pointer"
            >
              <HiX className="w-4 h-4" /> Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Editor inline */}
      {editing && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            ["Marca","marca"],["Modelo","modelo"],["Año","anio","number"],["Patente","patente"],["Tipo","tipo","select"],
          ].map(([label,name,type]) => (
            <div key={name}>
              <label className="block text-xs text-white/70 mb-1">{label}</label>
              {type === "select" ? (
                <select
                  name={name}
                  value={form[name]}
                  onChange={onChange}
                  className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 ring-sky-400/30"
                >
                  <option>Auto</option><option>Camioneta</option><option>Camion</option><option>Moto</option><option>Otro</option>
                </select>
              ) : (
                <input
                  name={name}
                  type={type || "text"}
                  value={form[name]}
                  onChange={onChange}
                  className={`w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 ring-sky-400/30 ${name==="patente" ? "uppercase tracking-wider" : ""}`}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
