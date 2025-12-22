// src/components/estadisticas/AseguradosExportModal.jsx
import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { motion } from "framer-motion";
import { HiDownload, HiX, HiOfficeBuilding, HiShieldCheck } from "react-icons/hi";

const boolToParam = (v) => (v ? "1" : "0");

export default function AseguradosExportModal({
  open,
  onClose,
  apiBase,
  oficinas,
  defaultOficina,
  getOficinaNombre,
}) {
  const [oficina, setOficina] = useState(defaultOficina || "");
  const [soloActivas, setSoloActivas] = useState(true);
  const [soloConAuto, setSoloConAuto] = useState(false);
  const [formato, setFormato] = useState("xlsx"); // xlsx | csv

  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setOficina(defaultOficina || "");
      setSoloActivas(true);
      setSoloConAuto(false);
      setFormato("xlsx");
    }
  }, [open, defaultOficina]);

  const oficinaLabel = useMemo(() => getOficinaNombre(oficina), [oficina, getOficinaNombre]);

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (oficina) params.set("oficina", oficina);
      params.set("solo_activas", boolToParam(soloActivas));
      params.set("tiene_auto", boolToParam(soloConAuto));
      params.set("formato", formato);

      const url = `${apiBase}polizas/asegurados-export/?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });

      if (!res.ok) {
        let msg = `Error HTTP ${res.status}`;
        try {
          const data = await res.json();
          msg = data?.detail || data?.error || msg;
        } catch (_) {}
        throw new Error(msg);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition") || "";
      const filenameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);
      const filename =
        filenameMatch?.[1] ||
        `asegurados_${oficina ? `ofi_${oficina}` : "todas"}.${
          formato === "csv" ? "csv" : "xlsx"
        }`;

      const a = document.createElement("a");
      const href = URL.createObjectURL(blob);
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);

      onClose?.();
    } catch (e) {
      console.error(e);
      setError(String(e?.message || "No se pudo descargar el archivo."));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95 y-2"
              enterTo="opacity-100 scale-100 y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100 y-0"
              leaveTo="opacity-0 scale-95 y-2"
            >
              <Dialog.Panel className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
                <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-800">
                  <div>
                    <Dialog.Title className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <HiDownload className="h-5 w-5 text-sky-300" />
                      Descargar asegurados
                    </Dialog.Title>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Armá tu “propósito” con filtros y descargá CSV/XLSX.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-xl p-2 text-slate-300 hover:text-white hover:bg-slate-900/60"
                  >
                    <HiX className="h-5 w-5" />
                  </button>
                </div>

                <div className="px-4 py-4 space-y-4">
                  {/* Oficina */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <HiOfficeBuilding className="text-sky-300" />
                      Oficina
                    </label>
                    <select
                      className="h-10 rounded-xl bg-slate-950 border border-slate-700 text-sm px-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={oficina}
                      onChange={(e) => setOficina(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {oficinas.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.nombre}
                        </option>
                      ))}
                    </select>
                    <div className="text-[11px] text-slate-500">
                      Seleccionada:{" "}
                      <span className="text-slate-300 font-medium">
                        {oficina ? oficinaLabel : "Todas"}
                      </span>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/20 px-3 py-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-sky-500"
                        checked={soloActivas}
                        onChange={(e) => setSoloActivas(e.target.checked)}
                      />
                      <span className="text-sm text-slate-200 flex items-center gap-1.5">
                        <HiShieldCheck className="h-4 w-4 text-emerald-300" />
                        Solo pólizas activas
                      </span>
                    </label>

                    <label className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/20 px-3 py-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-sky-500"
                        checked={soloConAuto}
                        onChange={(e) => setSoloConAuto(e.target.checked)}
                      />
                      <span className="text-sm text-slate-200">
                        Solo con auto (patente)
                      </span>
                    </label>
                  </div>

                  {/* Formato */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-200">
                      Formato
                    </label>
                    <select
                      className="h-10 rounded-xl bg-slate-950 border border-slate-700 text-sm px-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={formato}
                      onChange={(e) => setFormato(e.target.value)}
                    >
                      <option value="xlsx">Excel (.xlsx)</option>
                      <option value="csv">CSV (.csv)</option>
                    </select>
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-rose-700/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-100">
                      {error}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-200 hover:bg-slate-900/60 ring-1 ring-slate-800"
                  >
                    Cancelar
                  </button>
                  <motion.button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="h-10 rounded-xl px-4 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    whileHover={{ scale: downloading ? 1 : 1.02 }}
                    whileTap={{ scale: downloading ? 1 : 0.98 }}
                  >
                    <HiDownload className={downloading ? "animate-pulse" : ""} />
                    {downloading ? "Descargando..." : "Descargar"}
                  </motion.button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
