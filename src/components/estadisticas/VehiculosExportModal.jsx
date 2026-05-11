// src/components/estadisticas/VehiculosExportModal.jsx
import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { HiDownload, HiX, HiOfficeBuilding, HiTruck, HiCalendar, HiSearch, HiShieldCheck, HiExclamationCircle } from "react-icons/hi";

const TIPOS = ["", "Auto", "Camioneta", "Camion", "Moto", "Trailer"];
const bool  = (v) => v ? "1" : "0";

function Field({ label, icon: Icon, children }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
          {Icon && <Icon className="text-xs" />}{label}
        </label>
      )}
      {children}
    </div>
  );
}

const inputCls = "h-8 rounded-lg bg-slate-950 border border-slate-800 px-2.5 text-xs text-slate-300 outline-none focus:border-slate-600 placeholder:text-slate-700 transition-colors w-full";
const selectCls = `${inputCls} cursor-pointer`;

export default function VehiculosExportModal({ open, onClose, apiBase, oficinas, getOficinaNombre, defaults }) {
  const [oficina,    setOficina]    = useState("");
  const [tipo,       setTipo]       = useState("");
  const [anio,       setAnio]       = useState("");
  const [anioDesde,  setAnioDesde]  = useState("");
  const [anioHasta,  setAnioHasta]  = useState("");
  const [marca,      setMarca]      = useState("");
  const [modelo,     setModelo]     = useState("");
  const [patente,    setPatente]    = useState("");
  const [soloAct,    setSoloAct]    = useState(true);
  const [formato,    setFormato]    = useState("xlsx");
  const [downloading,setDownloading]= useState(false);
  const [error,      setError]      = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setFormato(defaults?.formato || "xlsx");
      setOficina(defaults?.oficina || "");
      setTipo(defaults?.tipo || "");
      setAnio(defaults?.anio || "");
      setAnioDesde(defaults?.anio_desde || defaults?.anioDesde || "");
      setAnioHasta(defaults?.anio_hasta || defaults?.anioHasta || "");
      setMarca(defaults?.marca || "");
      setModelo(defaults?.modelo || "");
      setPatente(defaults?.patente || "");
      setSoloAct(defaults?.solo_activas !== undefined ? !!defaults.solo_activas : true);
    }
  }, [open, defaults]);

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      const p = new URLSearchParams();
      if (oficina)                  p.set("oficina",       oficina);
      if (tipo)                     p.set("tipo",          tipo);
      if (String(anio).trim())      p.set("anio_vehiculo", String(anio).trim());  // año del vehículo, no del período
      if (String(anioDesde).trim()) p.set("anio_desde",    String(anioDesde).trim());
      if (String(anioHasta).trim()) p.set("anio_hasta",    String(anioHasta).trim());
      if (String(marca).trim())     p.set("marca",         String(marca).trim());
      if (String(modelo).trim())    p.set("modelo",        String(modelo).trim());
      if (String(patente).trim())   p.set("patente",       String(patente).trim());
      p.set("solo_activas", bool(soloAct));
      p.set("formato", formato);
      p.set("tipo_listado", "TOTALES");  // exportar sin filtro de estado

      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const res = await fetch(`${apiBase}estadisticas/vehiculos/export/?${p}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        let msg = `Error HTTP ${res.status}`;
        try { const d = await res.json(); msg = d?.detail || d?.error || msg; } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const cd   = res.headers.get("content-disposition") || "";
      const m    = /filename="?([^"]+)"?/i.exec(cd);
      const name = m?.[1] || `vehiculos_${oficina ? `ofi_${oficina}` : "todas"}.${formato === "csv" ? "csv" : "xlsx"}`;
      const a    = document.createElement("a");
      a.href     = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      onClose?.();
    } catch (e) {
      setError(String(e?.message || "No se pudo descargar el archivo."));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Transition.Root show={!!open} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95 translate-y-2" enterTo="opacity-100 scale-100 translate-y-0" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
                  <div>
                    <Dialog.Title className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <HiDownload className="text-sky-400" /> Exportar vehículos
                    </Dialog.Title>
                    <p className="text-[10px] text-slate-500 mt-0.5">Descargá el set filtrado en CSV o Excel</p>
                  </div>
                  <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors">
                    <HiX className="text-xs" />
                  </button>
                </div>

                {/* Filtros */}
                <div className="px-5 py-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">

                    <Field label="Oficina" icon={HiOfficeBuilding}>
                      <select value={oficina} onChange={e => setOficina(e.target.value)} className={selectCls}>
                        <option value="">Todas</option>
                        {(Array.isArray(oficinas) ? oficinas : []).map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                      </select>
                    </Field>

                    <Field label="Tipo" icon={HiTruck}>
                      <select value={tipo} onChange={e => setTipo(e.target.value)} className={selectCls}>
                        {TIPOS.map(t => <option key={t||"all"} value={t}>{t||"Todos"}</option>)}
                      </select>
                    </Field>

                    <Field label="Formato">
                      <select value={formato} onChange={e => setFormato(e.target.value)} className={selectCls}>
                        <option value="xlsx">Excel (.xlsx)</option>
                        <option value="csv">CSV (.csv)</option>
                      </select>
                    </Field>

                    <Field label="Año vehículo" icon={HiCalendar}>
                      <input type="number" value={anio} onChange={e => setAnio(e.target.value)} placeholder="2015" className={inputCls} />
                    </Field>

                    <Field label="Año desde" icon={HiCalendar}>
                      <input type="number" value={anioDesde} onChange={e => setAnioDesde(e.target.value)} placeholder="2010" className={inputCls} />
                    </Field>

                    <Field label="Año hasta" icon={HiCalendar}>
                      <input type="number" value={anioHasta} onChange={e => setAnioHasta(e.target.value)} placeholder="2024" className={inputCls} />
                    </Field>

                    <Field label="Marca" icon={HiSearch}>
                      <input type="text" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Ford" className={inputCls} />
                    </Field>

                    <Field label="Modelo" icon={HiSearch}>
                      <input type="text" value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Ranger" className={inputCls} />
                    </Field>

                    <Field label="Solo activas">
                      <label className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-slate-800 bg-slate-950 cursor-pointer hover:border-slate-700 transition-colors">
                        <input type="checkbox" checked={soloAct} onChange={e => setSoloAct(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-500" />
                        <span className="text-xs text-slate-400 flex items-center gap-1"><HiShieldCheck className="text-emerald-500 text-xs"/>Solo activas</span>
                      </label>
                    </Field>

                    <div className="col-span-2 sm:col-span-3">
                      <Field label="Patente (contiene)" icon={HiSearch}>
                        <input type="text" value={patente} onChange={e => setPatente(e.target.value)} placeholder="AA123BB" className={inputCls} />
                      </Field>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/20 px-3 py-2.5 text-xs text-rose-300">
                      <HiExclamationCircle className="shrink-0" /> {error}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-800 bg-slate-900/40">
                  <button onClick={onClose} className="h-8 px-4 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors text-xs font-medium">
                    Cancelar
                  </button>
                  <button onClick={handleDownload} disabled={downloading}
                    className="h-8 flex items-center gap-1.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors">
                    <HiDownload className={downloading ? "animate-pulse" : ""} />
                    {downloading ? "Descargando..." : "Descargar"}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}