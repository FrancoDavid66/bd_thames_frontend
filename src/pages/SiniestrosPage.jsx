// src/pages/SiniestrosPage.jsx
import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSiniestros, addSiniestro, editSiniestro, removeSiniestro } from "../store/slices/siniestrosSlice";
import SiniestrosList    from "../components/siniestros/SiniestrosList";
import SiniestrosForm    from "../components/siniestros/SiniestrosForm";
import SiniestrosWizard  from "../components/siniestros/SiniestrosWizard";
import SiniestrosDetails from "../components/siniestros/SiniestrosDetails";
import SiniestrosDeleteModal from "../components/siniestros/SiniestrosDeleteModal";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { HiPlus, HiRefresh, HiExclamationCircle, HiClock, HiCheckCircle, HiDocumentSearch } from "react-icons/hi";
import dayjs from "dayjs";

const ESTADOS = [
  { key: "todos",      label: "Todos" },
  { key: "PENDIENTE",  label: "Pendiente doc." },
  { key: "DENUNCIADO", label: "Denunciado" },
  { key: "INSPECCION", label: "Inspección" },
  { key: "LIQUIDACION",label: "Liquidación" },
  { key: "CERRADO",    label: "Cerrado" },
];

export default function SiniestrosPage() {
  const dispatch   = useDispatch();
  const { user }   = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const { siniestros, loading } = useSelector((s) => s.siniestros);

  const [selected, setSelected]     = useState(null);
  const [formOpen, setFormOpen]     = useState(false);
  const [wizardOpen, setWizardOpen]  = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroQ, setFiltroQ]           = useState("");

  useEffect(() => { dispatch(getSiniestros()); }, [dispatch]);

  const handleAdd = async (data) => {
    try {
      await dispatch(addSiniestro(data)).unwrap();
      toast.success("Siniestro creado");
      setFormOpen(false);
    } catch { toast.error("Error al crear el siniestro"); }
  };

  const handleEdit = async (data) => {
    try {
      await dispatch(editSiniestro({ id: selected.id, siniestro: data })).unwrap();
      toast.success("Siniestro actualizado");
      setFormOpen(false);
    } catch { toast.error("Error al actualizar"); }
  };

  const handleDelete = async () => {
    try {
      await dispatch(removeSiniestro(selected.id)).unwrap();
      toast.success("Siniestro eliminado");
      setDeleteOpen(false);
      setSelected(null);
    } catch { toast.error("Error al eliminar"); }
  };

  // KPIs
  const kpis = useMemo(() => {
    const abiertos  = siniestros.filter(s => s.estado !== "CERRADO").length;
    const pendientes= siniestros.filter(s => s.estado === "PENDIENTE").length;
    const cerrados  = siniestros.filter(s => s.estado === "CERRADO").length;
    const mesActual = siniestros.filter(s =>
      s.fecha_siniestro && dayjs(s.fecha_siniestro).isAfter(dayjs().startOf("month"))
    ).length;
    return { abiertos, pendientes, cerrados, mesActual, total: siniestros.length };
  }, [siniestros]);

  // Lista filtrada
  const filtrados = useMemo(() => {
    let list = [...siniestros];
    if (filtroEstado !== "todos") list = list.filter(s => s.estado === filtroEstado);
    if (filtroQ.trim()) {
      const q = filtroQ.toLowerCase();
      list = list.filter(s =>
        (s.cliente_label || "").toLowerCase().includes(q) ||
        (s.patente || "").toLowerCase().includes(q) ||
        (s.nro_reclamo_cia || "").toLowerCase().includes(q) ||
        (s.marca_auto || "").toLowerCase().includes(q) ||
        (s.descripcion || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [siniestros, filtroEstado, filtroQ]);

  return (
    <div className="p-4 sm:p-6 w-full max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Centro de Siniestros</h1>
          <p className="text-sm text-slate-400 mt-1">
            {isWebAdmin ? "Vista administrador — todas las agencias" : "Siniestros de tu oficina"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => dispatch(getSiniestros())}
            className="h-10 w-10 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors">
            <HiRefresh className="w-4 h-4" />
          </button>
          <button onClick={() => { setSelected(null); setWizardOpen(true); }}
            className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/30 transition-colors">
            <HiPlus className="w-4 h-4" /> Nuevo Siniestro
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Este mes",   value: kpis.mesActual, color: "text-indigo-400",  Icon: HiDocumentSearch },
          { label: "Abiertos",   value: kpis.abiertos,  color: "text-amber-400",   Icon: HiClock },
          { label: "Sin docs",   value: kpis.pendientes,color: "text-rose-400",    Icon: HiExclamationCircle },
          { label: "Cerrados",   value: kpis.cerrados,  color: "text-emerald-400", Icon: HiCheckCircle },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <Icon className={`w-7 h-7 shrink-0 ${color}`} />
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text" placeholder="Buscar por cliente, patente, reclamo..."
          value={filtroQ} onChange={e => setFiltroQ(e.target.value)}
          className="flex-1 h-10 px-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <div className="flex gap-1.5 flex-wrap">
          {ESTADOS.map(({ key, label }) => (
            <button key={key} onClick={() => setFiltroEstado(key)}
              className={`h-10 px-4 rounded-xl text-sm font-medium border transition-colors ${
                filtroEstado === key
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Resultados */}
      <p className="text-xs text-slate-500">
        {filtrados.length} siniestro{filtrados.length !== 1 ? "s" : ""}
        {filtroQ || filtroEstado !== "todos" ? ` (filtrado de ${siniestros.length} total)` : ""}
      </p>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <SiniestrosList
          siniestros={filtrados}
          isWebAdmin={isWebAdmin}
          onView={(s) => { setSelected(s); setDetailOpen(true); }}
          onEdit={(s) => { setSelected(s); setFormOpen(true); }}
          onDelete={(s) => { setSelected(s); setDeleteOpen(true); }}
        />
      )}

      {/* Modales */}
      {/* Wizard para nuevos siniestros */}
      <SiniestrosWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleAdd}
        isAdmin={isWebAdmin}
      />

      {/* Formulario clásico para editar */}
      <SiniestrosForm
        isOpen={formOpen && !!selected}
        onClose={() => setFormOpen(false)}
        onSubmit={selected ? handleEdit : handleAdd}
        initialData={selected}
      />
      <SiniestrosDetails
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        siniestro={selected}
        onEdit={() => { setDetailOpen(false); setFormOpen(true); }}
      />
      <SiniestrosDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        siniestro={selected}
      />
    </div>
  );
}