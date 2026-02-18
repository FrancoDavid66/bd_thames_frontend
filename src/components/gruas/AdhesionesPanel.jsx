// src/components/gruas/AdhesionesPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";

import AdhesionesModal from "./AdhesionesModal";

import {
  fetchAdhesiones,
  createAdhesion,
  fetchPlanes,
  selectAdhesiones,
  selectAdhesionesStatus,
  selectPlanes,
  selectPlanesStatus,
} from "../../store/slices/gruasSlice";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

const ESTADOS = ["TODAS", "ACTIVA", "PAUSADA", "CANCELADA", "VENCIDA"];

function getNombreAseguradoFromPoliza(polizaSel) {
  const nombre =
    `${polizaSel?.cliente?.apellido || ""} ${polizaSel?.cliente?.nombre || ""}`.trim() ||
    polizaSel?.cliente ||
    "";
  return nombre || "Asegurado";
}

function getPatenteFromPoliza(polizaSel) {
  return (polizaSel?.patente || "").toString().trim().toUpperCase() || "—";
}

function getPolizaLabel(polizaSel) {
  if (!polizaSel) return "";
  return `${getPatenteFromPoliza(polizaSel)} · ${getNombreAseguradoFromPoliza(polizaSel)}`;
}

function getAdhesionClienteNombre(a) {
  const n = (a?.cliente_nombre || "").toString().trim();
  if (n) return n;
  // fallback si backend viejo:
  const cli = a?.cliente || "";
  if (typeof cli === "string" && cli.trim()) return cli.trim();
  return "Asegurado";
}

function getAdhesionPatente(a) {
  const p = (a?.poliza_patente || a?.patente || "").toString().trim().toUpperCase();
  return p || "—";
}

function getAdhesionPlanNombre(a) {
  const pd = a?.plan_detalle;
  const n = (pd?.nombre || a?.plan || "").toString().trim();
  return n || "—";
}

export default function AdhesionesPanel() {
  const dispatch = useDispatch();

  const [q, setQ] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [estado, setEstado] = useState("TODAS");
  const [estadoApplied, setEstadoApplied] = useState("TODAS");

  const [modalOpen, setModalOpen] = useState(false);
  const [polizaSel, setPolizaSel] = useState(null);

  const [planId, setPlanId] = useState("");
  const [fechaActivacion, setFechaActivacion] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const items = useSelector(selectAdhesiones);
  const status = useSelector(selectAdhesionesStatus);
  const error = useSelector((s) => s.gruas?.adhesiones?.error || null);

  const planes = useSelector(selectPlanes);
  const planesStatus = useSelector(selectPlanesStatus);
  const planesError = useSelector((s) => s.gruas?.planes?.error || null);

  const createStatus = useSelector((s) => s.gruas?.createAdhesion?.status || "idle");
  const createError = useSelector((s) => s.gruas?.createAdhesion?.error || null);

  // debounce q/estado
  useEffect(() => {
    const t = setTimeout(() => setQApplied(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => setEstadoApplied(estado), 0);
    return () => clearTimeout(t);
  }, [estado]);

  // cargar planes + adhesiones
  useEffect(() => {
    dispatch(fetchPlanes({ q: "", activo: "" }));
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      fetchAdhesiones({
        q: qApplied,
        estado: estadoApplied,
        page: 1,
        page_size: 25,
      })
    );
  }, [dispatch, qApplied, estadoApplied]);

  // si cambia la selección de póliza, reset plan
  useEffect(() => {
    setPlanId("");
  }, [polizaSel?.id]);

  const loading = status === "loading";
  const planesLoading = planesStatus === "loading";
  const busy = createStatus === "loading";

  const canContinuar = !!polizaSel;
  const canCrear = !!polizaSel && !!planId && !!fechaActivacion && !busy;

  const polizaLabel = useMemo(() => getPolizaLabel(polizaSel), [polizaSel]);

  async function handleCrearAdhesion() {
    if (!polizaSel?.id) return;
    if (!planId) return;

    try {
      await dispatch(
        createAdhesion({
          poliza: polizaSel.id,
          plan: Number(planId),
          fecha_activacion: fechaActivacion,
          carencia_dias: 15,
        })
      ).unwrap();

      setPolizaSel(null);
      setPlanId("");
      // refrescar listado
      dispatch(
        fetchAdhesiones({
          q: qApplied,
          estado: estadoApplied,
          page: 1,
          page_size: 25,
        })
      );
    } catch (e) {
      // queda en createError
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-base font-semibold text-slate-100">Adhesiones</div>
          <div className="text-xs text-slate-500">
            Adherir el servicio de grúa a una póliza y ver su estado.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className={classNames(
              "px-3 py-2 rounded-xl text-sm",
              "bg-slate-900 border border-slate-800 text-slate-100",
              "focus:outline-none focus:ring-2 focus:ring-slate-700"
            )}
          >
            {ESTADOS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cliente o patente…"
            className={classNames(
              "px-3 py-2 rounded-xl text-sm w-full sm:w-80",
              "bg-slate-900 border border-slate-800 text-slate-100",
              "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
            )}
          />

          <button
            className="px-3 py-2 rounded-xl text-sm border bg-slate-100 text-slate-900 border-slate-100 hover:opacity-90"
            onClick={() => setModalOpen(true)}
          >
            Adherir
          </button>
        </div>
      </div>

      {/* estados */}
      {(loading || planesLoading || busy) && (
        <div className="mt-3 text-xs text-slate-400">
          {busy ? "Creando adhesión…" : loading ? "Cargando adhesiones…" : "Cargando planes…"}
        </div>
      )}

      {(error || createError || planesError) && (
        <div className="mt-3 text-xs text-red-300 bg-red-950/30 border border-red-900 rounded-xl p-2">
          {String(createError || error || planesError)}
        </div>
      )}

      {/* Selección actual + crear */}
      {polizaSel ? (
        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950 p-3">
          <div className="text-xs text-slate-400">Póliza seleccionada</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-100">{polizaLabel}</div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="block">
              <div className="text-xs text-slate-400 mb-1">Plan</div>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                disabled={planesLoading || busy}
                className={classNames(
                  "w-full px-3 py-2 rounded-xl text-sm",
                  "bg-slate-900 border border-slate-800",
                  planesLoading || busy ? "text-slate-500" : "text-slate-100",
                  "focus:outline-none focus:ring-2 focus:ring-slate-700"
                )}
              >
                <option value="">Seleccionar plan…</option>
                {(planes || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p?.nombre || `Plan #${p?.id}`} · {p?.km_incluidos ?? "—"}km
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-xs text-slate-400 mb-1">Fecha activación</div>
              <input
                type="date"
                value={fechaActivacion}
                onChange={(e) => setFechaActivacion(e.target.value)}
                disabled={busy}
                className={classNames(
                  "w-full px-3 py-2 rounded-xl text-sm",
                  "bg-slate-900 border border-slate-800 text-slate-100",
                  "focus:outline-none focus:ring-2 focus:ring-slate-700"
                )}
              />
            </label>

            <div className="flex items-end gap-2">
              <button
                onClick={() => setModalOpen(true)}
                className="px-3 py-2 rounded-xl text-xs border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800"
                disabled={busy}
              >
                Cambiar póliza
              </button>

              <button
                onClick={() => setPolizaSel(null)}
                className="px-3 py-2 rounded-xl text-xs border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800"
                disabled={busy}
              >
                Limpiar
              </button>

              <button
                onClick={handleCrearAdhesion}
                disabled={!canCrear}
                className={classNames(
                  "px-3 py-2 rounded-xl text-xs border",
                  canCrear
                    ? "border-emerald-800 bg-emerald-950 text-emerald-200 hover:opacity-90"
                    : "border-slate-800 bg-slate-900 text-slate-500 cursor-not-allowed"
                )}
                title={!planId ? "Elegí un plan" : !fechaActivacion ? "Elegí fecha" : ""}
              >
                Crear adhesión
              </button>
            </div>
          </div>

          {!canContinuar ? null : (
            <div className="mt-2 text-[11px] text-slate-500">
              Carencia default: 15 días (se calcula en backend).
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {(items || []).map((a) => {
          const cliente = getAdhesionClienteNombre(a);
          const patente = getAdhesionPatente(a);
          const planNombre = getAdhesionPlanNombre(a);
          const est = (a?.estado || "").toString().toUpperCase();

          return (
            <motion.div
              key={a.id}
              layout
              className="rounded-2xl border border-slate-800 bg-slate-950 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-100 truncate">
                    #{a.id} · {cliente}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    Patente: {patente} · Plan: {planNombre}
                  </div>
                </div>

                <span className="text-[11px] px-2 py-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-200">
                  {est || "—"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => alert("Luego: ver detalle adhesión")}
                  className="px-3 py-2 rounded-xl text-xs border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800"
                >
                  Ver
                </button>
                <button
                  onClick={() => alert("Luego: subir contrato (2 fotos)")}
                  className="px-3 py-2 rounded-xl text-xs border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800"
                >
                  Contrato
                </button>
                <button
                  onClick={() => alert("Luego: cancelar/pausar")}
                  className="px-3 py-2 rounded-xl text-xs border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800"
                >
                  Acciones
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {!loading && !(items || []).length && (
        <div className="mt-6 text-sm text-slate-400">Sin adhesiones.</div>
      )}

      <AdhesionesModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectPoliza={(p) => {
          setPolizaSel(p);
          setModalOpen(false);
        }}
      />
    </div>
  );
}
