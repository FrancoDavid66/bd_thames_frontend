// src/pages/CuponPublicoPage.jsx
//
// Página PÚBLICA (sin login) donde el cliente ve los cupones de su póliza de robo
// y confirma el pago tocando "Ya pagué". Se entra por el link /cupon/:token.
//
// El token viene en la URL y es la llave: no hace falta usuario ni contraseña.

import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";

// Base de la API (misma var que el resto del front). Le sacamos un /api final
// si viniera incluido, y armamos la ruta pública del portal.
const RAW = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || "";
const ROOT = String(RAW).trim().replace(/\/+$/, "").replace(/\/api\/?$/i, "");
const API = (ROOT || "") + "/api/polizas/portal/cupon";

function fmtFecha(s) {
  if (!s) return "—";
  const [y, m, d] = String(s).split("-");
  return d && m ? `${d}/${m}/${y}` : s;
}
function fmtMonto(v) {
  if (v == null) return "—";
  const n = Number(v);
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const BADGE = {
  PENDIENTE: { txt: "Pendiente", cls: "bg-amber-100 text-amber-700" },
  REPORTADO: { txt: "Aviso recibido", cls: "bg-sky-100 text-sky-700" },
  PAGADA:    { txt: "Pagado", cls: "bg-emerald-100 text-emerald-700" },
  VENCIDA:   { txt: "Vencido", cls: "bg-rose-100 text-rose-700" },
};

export default function CuponPublicoPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(null); // id del cupón que se está reportando

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/${token}/`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("No encontramos esta póliza.");
      setData(await res.json());
    } catch (e) {
      setError(e.message || "Hubo un problema al cargar tus cupones.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  const reportar = async (cupon_id) => {
    setEnviando(cupon_id);
    try {
      const res = await fetch(`${API}/${token}/reportar/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ cupon_id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo registrar.");
      // Actualizamos el estado local del cupón a REPORTADO
      setData((prev) => ({
        ...prev,
        cupones: prev.cupones.map((c) =>
          c.id === cupon_id ? { ...c, estado: "REPORTADO" } : c
        ),
      }));
    } catch (e) {
      alert(e.message || "No se pudo registrar el pago. Probá de nuevo.");
    } finally {
      setEnviando(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">T</div>
          <span className="font-bold text-slate-800 text-lg">Estudio Thames</span>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            Cargando tus cupones…
          </div>
        )}

        {!loading && error && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p className="text-rose-600 font-semibold mb-1">No pudimos abrir tus cupones</p>
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Datos */}
            <div className="p-5 border-b border-slate-100">
              <p className="text-sm text-slate-500">Hola{data.nombre ? `, ${data.nombre}` : ""} 👋</p>
              <p className="font-bold text-slate-800 text-lg leading-tight mt-0.5">{data.vehiculo}</p>
              <p className="text-sm text-slate-500">Patente {data.patente}</p>
            </div>

            {/* Cupones */}
            <div className="p-4 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Tus cupones</p>

              {data.cupones.length === 0 && (
                <p className="text-sm text-slate-500 px-1 py-4 text-center">No hay cupones cargados todavía.</p>
              )}

              {data.cupones.map((c) => {
                const badge = BADGE[c.estado] || BADGE.PENDIENTE;
                const puedeReportar = c.estado === "PENDIENTE" || c.estado === "VENCIDA";
                return (
                  <div key={c.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Vence {fmtFecha(c.fecha_vencimiento)}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                        {badge.txt}
                      </span>
                    </div>
                    <p className="text-2xl font-black text-slate-800 mb-3">{fmtMonto(c.monto)}</p>

                    {puedeReportar && (
                      <button
                        onClick={() => reportar(c.id)}
                        disabled={enviando === c.id}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition"
                      >
                        {enviando === c.id ? "Registrando…" : "✓ Ya pagué"}
                      </button>
                    )}
                    {c.estado === "REPORTADO" && (
                      <p className="text-center text-sky-600 text-sm font-medium py-2">
                        ¡Gracias! Ya recibimos tu aviso 🙌
                      </p>
                    )}
                    {c.estado === "PAGADA" && (
                      <p className="text-center text-emerald-600 text-sm font-medium py-2">
                        Pago confirmado ✓
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center leading-relaxed">
                Pagá el cupón en Rapipago, Pago Fácil o Mercado Pago, y después tocá "Ya pagué".
                Nosotros lo verificamos. 🙌
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}