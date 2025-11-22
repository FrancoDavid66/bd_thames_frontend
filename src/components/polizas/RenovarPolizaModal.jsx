// src/components/polizas/RenovarPolizaModal.jsx
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { PolizasAPI } from "../../api/polizas";

export default function RenovarPolizaModal({ open, onClose, poliza }) {
  // Compañía actual (fallbacks)
  const companiaActual =
    poliza?.compania_nombre ??
    poliza?.compania?.nombre ??
    poliza?.aseguradora?.nombre ??
    poliza?.cia?.nombre ??
    (typeof poliza?.compania === "string" ? poliza.compania : "") ??
    "";

  const numeroActual =
    poliza?.numero_poliza ??
    poliza?.numero ??
    poliza?.nro_poliza ??
    poliza?.n_poliza ??
    "";

  // --- Hooks (orden fijo) ---
  const [nuevoNumero, setNuevoNumero] = useState("");
  const [nuevaCompania, setNuevaCompania] = useState(companiaActual || "");
  const [companias, setCompanias] = useState([]);
  const [loadingCompanias, setLoadingCompanias] = useState(false);
  const [loading, setLoading] = useState(false);

  const disabled = loading || !nuevoNumero.trim();

  // Cargar compañías y reset al abrir
  useEffect(() => {
    if (!open) return;
    setNuevoNumero("");
    setNuevaCompania(companiaActual || "");

    (async () => {
      try {
        setLoadingCompanias(true);
        const list =
          (await PolizasAPI.getCompanias?.()) ??
          (await (async () => {
            try {
              const r = await fetch("/api/companias/");
              if (!r.ok) return [];
              const data = await r.json();
              if (Array.isArray(data)) {
                if (typeof data[0] === "string") return data;
                return data.map((it) => it?.nombre).filter(Boolean);
              }
              return [];
            } catch {
              return [];
            }
          })());

        const unique = Array.from(new Set((list || []).map((s) => String(s))));
        const withSelected =
          companiaActual && !unique.includes(companiaActual)
            ? [companiaActual, ...unique]
            : unique;
        setCompanias(withSelected.sort((a, b) => a.localeCompare(b, "es")));
      } finally {
        setLoadingCompanias(false);
      }
    })();
  }, [open, companiaActual]);

  // Opciones para el select
  const options = useMemo(
    () =>
      (Array.isArray(companias) ? companias : []).map((n) => ({
        value: n,
        label: n,
      })),
    [companias]
  );

  // Corto después de los hooks para no romper reglas
  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!poliza?.id) return;
    setLoading(true);

    const payload = {
      nuevo_numero: nuevoNumero.trim(),
      nueva_compania: (nuevaCompania || "").trim() || undefined,
      anclar_dia: true,
    };

    try {
      let data = await PolizasAPI.renovarPoliza(poliza.id, payload);
      if (!data?.id && PolizasAPI.duplicarRenovacion) {
        data = await PolizasAPI.duplicarRenovacion(poliza.id, payload);
      }
      if (!data?.id) throw new Error("No se recibió la nueva póliza");

      window.dispatchEvent(
        new CustomEvent("poliza:renovada", { detail: { nuevaPoliza: data } })
      );
      toast.success("Póliza renovada correctamente");
      onClose?.();
    } catch (err) {
      toast.error(err?.message || "Error al renovar la póliza");
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = () => {
    if (!loading) onClose?.();
  };

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <form
        onSubmit={submit}
        onClick={stopPropagation}
        className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950/90 text-slate-100 shadow-2xl overflow-hidden"
      >
        {/* Barra superior con gradiente */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-sky-400 to-emerald-500" />

        <div className="p-5 space-y-4">
          {/* Header + resumen póliza actual */}
          <div>
            <h3 className="text-xl font-semibold">Renovar póliza</h3>
            <p className="text-sm text-slate-300 mt-1">
              Se creará una{" "}
              <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                nueva póliza
              </span>{" "}
              para este mismo vehículo, con{" "}
              <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-pink-400">
                cuotas nuevas
              </span>
              . La póliza anterior quedará como historial.
            </p>

            {numeroActual || companiaActual ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 flex flex-wrap gap-x-4 gap-y-1">
                {numeroActual && (
                  <span>
                    Actual: <strong>{numeroActual}</strong>
                  </span>
                )}
                {companiaActual && (
                  <span>
                    Compañía: <strong>{companiaActual}</strong>
                  </span>
                )}
              </div>
            ) : null}
          </div>

          {/* Campos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nuevo número */}
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Nuevo número <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                className="w-full rounded-lg bg-slate-900/80 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-slate-500"
                placeholder="Ej. 123456/2026"
                value={nuevoNumero}
                onChange={(e) => setNuevoNumero(e.target.value)}
                autoFocus
                required
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Usá el criterio que venís manejando (año de vigencia, sufijo,
                etc.).
              </p>
            </div>

            {/* Nueva compañía (opcional) */}
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Nueva compañía (opcional)
              </label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-lg bg-slate-900/80 ring-1 ring-white/10 px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-70"
                  value={nuevaCompania}
                  onChange={(e) => setNuevaCompania(e.target.value)}
                  disabled={loadingCompanias}
                >
                  <option value="">
                    {loadingCompanias
                      ? "Cargando compañías..."
                      : "— Sin cambio —"}
                  </option>
                  {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  ▾
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Si no elegís nada, se conserva la compañía actual.
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-white/10 text-slate-200 text-sm hover:bg-white/10 transition disabled:opacity-60"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={disabled}
              className="px-4 py-2 rounded-lg text-sm text-white font-semibold
                         bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500
                         shadow-md hover:shadow-lg hover:brightness-110 transition
                         disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {loading ? "Renovando..." : "Renovar póliza"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
