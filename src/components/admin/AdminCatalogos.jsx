// src/components/admin/AdminCatalogos.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  HiPlus, HiTrash, HiPencil, HiCollection, HiShieldCheck,
  HiX, HiOfficeBuilding, HiPhotograph, HiArrowLeft, HiStar, HiDocumentText,
  HiCash
} from "react-icons/hi";
import toast from "react-hot-toast";

import { fetchAdminCompanias, fetchAdminCoberturas } from "../../store/slices/adminSlice";

const getApiUrl = () => (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || "/api").replace(/\/+$/, "");

const parseDjangoError = (errorData) => {
  if (!errorData) return "Error desconocido del servidor.";
  if (typeof errorData === 'string') return errorData;
  const firstKey = Object.keys(errorData)[0];
  if (firstKey && Array.isArray(errorData[firstKey])) return `${firstKey.toUpperCase()}: ${errorData[firstKey][0]}`;
  return "Error al guardar. Revisa los campos.";
};

const parseTextToArray = (text) => {
  if (!text) return [];
  if (Array.isArray(text)) return text;
  return String(text).split('\n').map(item => item.trim()).filter(Boolean);
};

export default function AdminCatalogos() {
  const dispatch = useDispatch();
  const { companias, coberturas, loadingCompanias, loadingCoberturas } = useSelector((state) => state.admin);

  const [view, setView] = useState("LIST");
  const [selectedCia, setSelectedCia] = useState(null);
  const [q, setQ] = useState("");

  const [ciaModalOpen, setCiaModalOpen] = useState(false);
  const [cobModalOpen, setCobModalOpen] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [ciaForm, setCiaForm] = useState({
    nombre: "",
    comision_default: "0.00",
    antiguedad_maxima: "25",
    activa: true,
    logo_url: ""
  });

  // 🚀 FORMULARIO ÚNICO UNIFICADO PARA COBERTURAS
  const [cobForm, setCobForm] = useState({
    nombre: "",
    activa: true,
    cuotas_a_generar: 6,
    genera_cupones_robo: false,
    beneficios_default: [],
    fotos_requeridas: [],
    documentos_requeridos: []
  });

  useEffect(() => {
    dispatch(fetchAdminCompanias());
    dispatch(fetchAdminCoberturas());
  }, [dispatch]);

  useEffect(() => {
    if (selectedCia) {
      const updated = companias.find(c => c.id === selectedCia.id);
      if (updated) setSelectedCia(updated);
    }
  }, [companias, selectedCia]);

  const openCiaModal = (cia = null) => {
    setEditingId(cia?.id || null);
    setCiaForm({
      nombre: cia?.nombre || "",
      comision_default: cia?.comision_default || "0.00",
      antiguedad_maxima: cia?.antiguedad_maxima || "25",
      activa: cia?.activa ?? true,
      logo_url: cia?.logo_url || ""
    });
    setCiaModalOpen(true);
  };

  const saveCia = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const url = editingId ? `${getApiUrl()}/cotizaciones/companias/${editingId}/` : `${getApiUrl()}/cotizaciones/companias/`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(ciaForm)
      });
      if (!res.ok) throw new Error(parseDjangoError(await res.json()));
      toast.success("Aseguradora guardada");
      setCiaModalOpen(false);
      dispatch(fetchAdminCompanias());
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const openCobModal = (cob = null) => {
    setEditingId(cob?.id || null);
    setCobForm({
      nombre: cob?.nombre || "",
      activa: cob?.activa ?? true,
      cuotas_a_generar: cob?.cuotas_a_generar ?? 6, // 🚀 CARGA LAS CUOTAS
      genera_cupones_robo: cob?.genera_cupones_robo ?? false, // 🚀 CARGA EL CHECKBOX
      beneficios_default: Array.isArray(cob?.beneficios_default) ? cob.beneficios_default : parseTextToArray(cob?.beneficios_default),
      fotos_requeridas: Array.isArray(cob?.fotos_requeridas) ? cob.fotos_requeridas : parseTextToArray(cob?.fotos_requeridas),
      documentos_requeridos: Array.isArray(cob?.documentos_requeridos) ? cob.documentos_requeridos : parseTextToArray(cob?.documentos_requeridos)
    });
    setCobModalOpen(true);
  };

  const saveCob = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const url = editingId ? `${getApiUrl()}/cotizaciones/coberturas/${editingId}/` : `${getApiUrl()}/cotizaciones/coberturas/`;
      const payload = {
        ...cobForm,
        compania: selectedCia.id,
      };
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(parseDjangoError(await res.json()));
      toast.success("Cobertura actualizada");
      setCobModalOpen(false);
      dispatch(fetchAdminCoberturas());
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const deleteItem = async (id, tipo) => {
    if (!confirm("¿Eliminar este registro?")) return;
    try {
      const token = localStorage.getItem('access_token');
      let endpoint = tipo === 'cia' ? 'cotizaciones/companias' : 'cotizaciones/coberturas';

      const res = await fetch(`${getApiUrl()}/${endpoint}/${id}/`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("No se pudo eliminar.");
      toast.success("Eliminado");

      if (tipo === 'cia') { setView("LIST"); dispatch(fetchAdminCompanias()); }
      else dispatch(fetchAdminCoberturas());
    } catch (e) { toast.error(e.message); }
  };

  const ciaCoverages = useMemo(() => {
    if (!selectedCia) return [];
    return coberturas.filter(c => {
      const ciaId = typeof c.compania === 'object' ? c.compania?.id : c.compania;
      return Number(ciaId) === Number(selectedCia.id);
    });
  }, [coberturas, selectedCia]);

  return (
    <div className="space-y-5">
      {view === "LIST" ? (
        <div>
          <div className="mb-5 flex items-center justify-between rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-tarjeta)] text-white shadow-[0_4px_0_#d97706]"><HiCollection /></div>
              <div><h2 className="text-lg font-black text-[var(--color-titulo)]">Aseguradoras</h2></div>
            </div>
            <button onClick={() => openCiaModal()} className="flex items-center gap-1.5 rounded-xl bg-[var(--color-tarjeta)] px-4 py-2.5 text-sm font-black text-white shadow-[0_4px_0_#d97706] transition-all active:translate-y-0.5 active:shadow-[0_0_0_#d97706]"><HiPlus /> Nueva Empresa</button>
          </div>

          {/* Buscador */}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar aseguradora..."
            className="mb-4 w-full rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] px-4 py-3 text-sm font-semibold text-[var(--color-titulo)] outline-none placeholder:text-[var(--color-suave)] focus:border-[var(--color-tarjeta)]"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companias.filter(c => c.nombre.toLowerCase().includes(q.toLowerCase())).map(cia => (
              <div key={cia.id} onClick={() => { setSelectedCia(cia); setView("PROFILE"); }} className="cursor-pointer rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-5 transition-all hover:border-[var(--color-tarjeta)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-suave)]"><HiOfficeBuilding /></div>
                  <h3 className="font-black text-[var(--color-titulo)]">{cia.nombre}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-5 rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-6">
            <button onClick={() => setView("LIST")} className="mb-4 flex items-center gap-1 text-[11px] font-black uppercase text-[var(--color-suave)] transition hover:text-[var(--color-titulo)]"><HiArrowLeft /> Volver</button>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-[var(--color-titulo)]">{selectedCia?.nombre}</h2>
                <p className="mt-1 text-[11px] font-black uppercase text-[#d97706]">Comisión: {selectedCia?.comision_default}% · Antigüedad: {selectedCia?.antiguedad_maxima} años</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openCiaModal(selectedCia)} className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] text-[var(--color-suave)] transition hover:border-[var(--color-oficina)] hover:text-[var(--color-oficina)]"><HiPencil /></button>
                <button onClick={() => deleteItem(selectedCia.id, 'cia')} className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] text-[var(--color-suave)] transition hover:border-[var(--color-egreso)] hover:text-[var(--color-egreso)]"><HiTrash /></button>
              </div>
            </div>
          </div>

          <div className="w-full">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-[var(--color-titulo)]">
                  <HiShieldCheck className="text-lg text-[var(--color-ingreso)]" /> Catálogo de Coberturas
                </h3>
                <button onClick={() => openCobModal()} className="flex items-center gap-1 rounded-xl bg-[var(--color-ingreso)] px-4 py-2.5 text-xs font-black uppercase text-white shadow-[0_4px_0_var(--color-ingreso-fuerte)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-ingreso-fuerte)]">
                  <HiPlus /> Nueva Cobertura
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {ciaCoverages.length === 0 ? (
                  <div className="col-span-full rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] py-10 text-center">
                    <p className="text-sm font-semibold text-[var(--color-suave)]">Sin coberturas cargadas.</p>
                  </div>
                ) : (
                  ciaCoverages.map(cob => (
                    <div key={cob.id} className="flex items-center justify-between rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-4 transition-colors hover:border-[var(--color-ingreso)]">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cob.activa ? 'bg-[var(--color-ingreso)]/15 text-[var(--color-ingreso-fuerte)]' : 'bg-[var(--color-surface)] text-[var(--color-suave)]'}`}><HiShieldCheck /></div>
                        <div>
                          <p className="text-sm font-black uppercase text-[var(--color-titulo)]">{cob.nombre}</p>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                              <span className="rounded border-2 border-[var(--color-oficina)]/30 bg-[var(--color-oficina)]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[var(--color-oficina-fuerte)]">
                                  {cob.cuotas_a_generar} Cuotas
                              </span>
                              {cob.genera_cupones_robo && (
                                  <span className="rounded border-2 border-[var(--color-egreso)]/30 bg-[var(--color-egreso)]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[var(--color-egreso-fuerte)]">
                                      Robo
                                  </span>
                              )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openCobModal(cob)} className="flex items-center gap-1.5 rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2 text-xs font-black uppercase text-[var(--color-oficina)] transition hover:border-[var(--color-oficina)]"><HiPencil /> Editar</button>
                        <button onClick={() => deleteItem(cob.id, 'cob')} className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] text-[var(--color-suave)] transition hover:border-[var(--color-egreso)] hover:text-[var(--color-egreso)]"><HiTrash /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
          </div>
        </div>
      )}

      <Modal open={ciaModalOpen} onClose={() => setCiaModalOpen(false)} title="Datos de Aseguradora">
        <form onSubmit={saveCia} className="space-y-4">
          <Input label="Nombre" value={ciaForm.nombre} onChange={v => setCiaForm({...ciaForm, nombre: v})} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Comisión %" type="number" step="0.01" value={ciaForm.comision_default} onChange={v => setCiaForm({...ciaForm, comision_default: v})} />
            <Input label="Antigüedad Máx" type="number" value={ciaForm.antiguedad_maxima} onChange={v => setCiaForm({...ciaForm, antiguedad_maxima: v})} />
          </div>
          <button type="submit" className="mt-2 w-full rounded-xl bg-[var(--color-tarjeta)] py-3 text-sm font-black uppercase text-white shadow-[0_4px_0_#d97706] transition-all active:translate-y-0.5 active:shadow-[0_0_0_#d97706]">Guardar</button>
        </form>
      </Modal>

      <Modal open={cobModalOpen} onClose={() => setCobModalOpen(false)} title="Configuración de Cobertura" wide>
        <form onSubmit={saveCob} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                  <Input label="Nombre de Cobertura (ej: B1)" value={cobForm.nombre} onChange={v => setCobForm({...cobForm, nombre: v})} required />
              </div>
              <div className="space-y-4 rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-ingreso-fuerte)]">
                    <HiCash className="text-lg" /> Parámetros de Facturación
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                      <Input
                          label="Cuotas a Generar"
                          type="number"
                          value={cobForm.cuotas_a_generar}
                          onChange={v => setCobForm({...cobForm, cuotas_a_generar: v})}
                          required
                      />
                      <div className="flex flex-col justify-end pb-2">
                          <label className="group flex w-fit cursor-pointer items-center gap-3">
                              <input
                                  type="checkbox"
                                  checked={cobForm.genera_cupones_robo}
                                  onChange={e => setCobForm({...cobForm, genera_cupones_robo: e.target.checked})}
                                  className="h-5 w-5 cursor-pointer accent-[var(--color-ingreso)]"
                              />
                              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-suave)] transition-colors group-hover:text-[var(--color-titulo)]">
                                  Genera Chequera Robo
                              </span>
                          </label>
                      </div>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 gap-6 border-t-2 border-[var(--color-linea)] pt-4 md:grid-cols-3">
            <div>
               <TagInput
                  label="¿Qué Cubre? (Beneficios)"
                  icon={<HiStar className="text-[var(--color-tarjeta)]" />}
                  color="tarjeta"
                  tags={cobForm.beneficios_default}
                  onChange={(newTags) => setCobForm({...cobForm, beneficios_default: newTags})}
                  suggestions={["Robo Total", "Incendio Parcial", "Granizo", "Cristales", "Cerraduras"]}
               />
            </div>
            <div>
               <TagInput
                  label="Fotos Obligatorias"
                  icon={<HiPhotograph className="text-[var(--color-oficina)]" />}
                  color="oficina"
                  tags={cobForm.fotos_requeridas}
                  onChange={(newTags) => setCobForm({...cobForm, fotos_requeridas: newTags})}
                  suggestions={["FRENTE", "TRASERA", "LATERAL_IZQ", "LATERAL_DER", "INTERIOR"]}
               />
            </div>
            <div>
               <TagInput
                  label="Papeles Legales"
                  icon={<HiDocumentText className="text-[var(--color-transferencia)]" />}
                  color="transferencia"
                  tags={cobForm.documentos_requeridos}
                  onChange={(newTags) => setCobForm({...cobForm, documentos_requeridos: newTags})}
                  suggestions={["CEDULA_VERDE_FRENTE", "CEDULA_VERDE_DORSO", "TITULO", "VTV"]}
               />
            </div>
          </div>

          <button type="submit" disabled={saving} className="mt-4 flex w-full justify-center rounded-xl bg-[var(--color-ingreso)] py-3.5 text-sm font-black uppercase text-white shadow-[0_4px_0_var(--color-ingreso-fuerte)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-ingreso-fuerte)] disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar Cobertura"}
          </button>
        </form>
      </Modal>
    </div>
  );
}

function Modal({ open, onClose, title, wide = false, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`relative max-h-[90vh] w-full overflow-y-auto rounded-3xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-8 shadow-2xl ${wide ? 'max-w-5xl' : 'max-w-md'}`}>
        <button onClick={onClose} className="absolute right-6 top-6 text-[var(--color-suave)] hover:text-[var(--color-titulo)]"><HiX size={24}/></button>
        <h3 className="mb-6 text-lg font-black uppercase text-[var(--color-titulo)]">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Input({ label, onChange, ...props }) {
  return (
    <div className="space-y-1.5">
      <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-[var(--color-suave)]">{label}</label>
      <input
        {...props}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-4 py-3 text-sm font-bold text-[var(--color-titulo)] outline-none transition-all focus:border-[var(--color-tarjeta)]"
      />
    </div>
  );
}

function TagInput({ label, tags = [], onChange, suggestions = [], icon, color = "oficina" }) {
  const [input, setInput] = useState("");
  const colorClasses = {
    tarjeta: "bg-[var(--color-tarjeta)]/10 text-[#d97706] border-[var(--color-tarjeta)]/30",
    oficina: "bg-[var(--color-oficina)]/10 text-[var(--color-oficina-fuerte)] border-[var(--color-oficina)]/30",
    transferencia: "bg-[var(--color-transferencia)]/10 text-[var(--color-transferencia)] border-[var(--color-transferencia)]/30"
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = input.trim().toUpperCase();
      if (newTag && !tags.includes(newTag)) onChange([...tags, newTag]);
      setInput("");
    }
  };
  const removeTag = (tagToRemove) => onChange(tags.filter(t => t !== tagToRemove));
  const addSuggestion = (sug) => {
    const newTag = sug.toUpperCase();
    if (!tags.includes(newTag)) onChange([...tags, newTag]);
  };
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-suave)]">
        {icon} {label}
      </label>
      <div className="flex min-h-[120px] flex-col rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] p-3">
        <div className="mb-2 flex flex-wrap gap-2">
          {tags.map((tag, idx) => (
            <span key={idx} className={`flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${colorClasses[color]}`}>
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-[var(--color-titulo)]"><HiX /></button>
            </span>
          ))}
        </div>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Agregar..." className="w-full border-none bg-transparent text-sm font-medium text-[var(--color-titulo)] outline-none placeholder:text-[var(--color-suave)]" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.filter(s => !tags.includes(s.toUpperCase())).map((sug, idx) => (
            <button key={idx} type="button" onClick={() => addSuggestion(sug)} className="rounded border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-2 py-1 text-[9px] font-bold uppercase text-[var(--color-suave)] transition hover:text-[var(--color-titulo)]">
                + {sug}
            </button>
        ))}
      </div>
    </div>
  );
}
