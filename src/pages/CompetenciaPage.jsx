// src/pages/CompetenciaPage.jsx
import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { HiPlus, HiRefresh, HiPencil, HiTrash, HiChartBar } from "react-icons/hi";
import toast from "react-hot-toast";

import CompetenciaTable from "../components/competencia/CompetenciaTable";
import CompetenciaResumen from "../components/competencia/CompetenciaResumen";
import CompetenciaFormModal from "../components/competencia/CompetenciaFormModal";

import {
  fetchCompetenciaData,
  createRegistro,
  updateRegistro,
  deleteRegistro,
  fetchMisPrecios,
  crearMiPrecio,
  actualizarMiPrecio,
  eliminarMiPrecio,
} from "../store/slices/competenciaSlice";

const emptyMiPrecio = {
  id: null,
  cobertura: "",
  compania: "",
  ciudad: "",
  precio: "",
  notas: "",
};

const fmtMoney = (v) =>
  v == null || isNaN(Number(v)) ? "—" : `$${Number(v).toLocaleString("es-AR")}`;

const CompetenciaPage = () => {
  const dispatch = useDispatch();

  const {
    ubicaciones = [],
    misPrecios = [],
    stats,
    loading = false,
    saving = false,
  } = useSelector((state) => state.competencia || {});

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [miPrecioForm, setMiPrecioForm] = useState(emptyMiPrecio);

  useEffect(() => {
    dispatch(fetchCompetenciaData());
    dispatch(fetchMisPrecios());
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    dispatch(fetchCompetenciaData());
    dispatch(fetchMisPrecios());
  }, [dispatch]);

  /* ===== Registros de competencia (wizard) ===== */
  const handleNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (row) => {
    setEditing(row);
    setModalOpen(true);
  };

  const handleDelete = (row) => {
    if (!row?.id) return;
    const ok = window.confirm(
      `¿Eliminar el registro de "${row.nombre || "competidor"}"?`
    );
    if (ok) dispatch(deleteRegistro(row.id));
  };

  const handleSave = async (data) => {
    try {
      const { ofertas = [], ...competidor } = data || {};
      if (!ofertas.length) {
        toast.error("Agregá al menos una oferta.");
        return;
      }

      if (editing?.id) {
        const first = ofertas[0] || {};
        await dispatch(
          updateRegistro({
            id: editing.id,
            original: editing,
            data: {
              ...competidor,
              compania: first.compania || "",
              cobertura: first.cobertura || "",
              precio: first.precio ?? null,
            },
          })
        ).unwrap();
      } else {
        for (const oferta of ofertas) {
          await dispatch(
            createRegistro({
              ...competidor,
              compania: oferta.compania || "",
              cobertura: oferta.cobertura || "",
              precio: oferta.precio ?? null,
            })
          ).unwrap();
        }
        toast.success("Registro creado");
      }

      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      // El slice ya muestra el toast de error
    }
  };

  /* ===== Mis precios de referencia ===== */
  const resetMiPrecio = () => setMiPrecioForm(emptyMiPrecio);

  const handleMiPrecioChange = (e) => {
    const { name, value } = e.target;
    setMiPrecioForm((prev) => ({
      ...prev,
      [name]: name === "precio" ? value.replace(",", ".") : value,
    }));
  };

  const handleMiPrecioSubmit = async (e) => {
    e.preventDefault();
    if (!miPrecioForm.cobertura.trim()) {
      toast.error("La cobertura es obligatoria.");
      return;
    }
    try {
      if (miPrecioForm.id) {
        await dispatch(
          actualizarMiPrecio({ id: miPrecioForm.id, data: miPrecioForm })
        ).unwrap();
      } else {
        await dispatch(crearMiPrecio(miPrecioForm)).unwrap();
      }
      resetMiPrecio();
    } catch {
      // toast en el slice
    }
  };

  const handleMiPrecioEdit = (p) =>
    setMiPrecioForm({
      id: p.id,
      cobertura: p.cobertura || "",
      compania: p.compania || "",
      ciudad: p.ciudad || "",
      precio: p.precio == null ? "" : String(p.precio),
      notas: p.notas || "",
    });

  const handleMiPrecioDelete = (id) => {
    if (window.confirm("¿Eliminar este precio de referencia?")) {
      dispatch(eliminarMiPrecio(id));
      if (miPrecioForm.id === id) resetMiPrecio();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-50 flex items-center gap-2">
            <HiChartBar className="text-primary-400" /> Competencia
          </h1>
          <p className="text-xs text-slate-500">
            Radar de competidores: precios, coberturas, redes y ubicación en el mapa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center h-10 px-3 rounded-xl border border-slate-600 bg-slate-900/70 text-slate-200 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            <HiRefresh className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Recargar
          </button>
          <button
            type="button"
            onClick={handleNew}
            className="inline-flex items-center h-10 px-4 rounded-xl bg-primary-500 text-sm font-semibold text-white hover:bg-primary-400"
          >
            <HiPlus className="w-4 h-4 mr-1" />
            Nuevo registro
          </button>
        </div>
      </div>

      {/* Layout */}
      <motion.div layout className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Tabla */}
        <div className="lg:col-span-2">
          <CompetenciaTable
            registros={ubicaciones}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>

        {/* Panel derecho */}
        <div className="space-y-4">
          <CompetenciaResumen stats={stats} />

          {/* Mis precios */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
            <div className="mb-2">
              <h2 className="text-xs font-semibold text-slate-200">
                Mis precios de referencia
              </h2>
              <p className="text-[11px] text-slate-500">
                Tus precios por cobertura/compañía para compararte con la competencia.
              </p>
            </div>

            <form onSubmit={handleMiPrecioSubmit} className="space-y-2 mb-3 text-xs">
              <input
                name="cobertura"
                value={miPrecioForm.cobertura}
                onChange={handleMiPrecioChange}
                placeholder="Cobertura * (ej.: Terceros completo)"
                className="w-full h-8 rounded-lg bg-slate-950/80 border border-slate-700 px-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  name="compania"
                  value={miPrecioForm.compania}
                  onChange={handleMiPrecioChange}
                  placeholder="Compañía"
                  className="w-full h-8 rounded-lg bg-slate-950/80 border border-slate-700 px-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
                <input
                  name="ciudad"
                  value={miPrecioForm.ciudad}
                  onChange={handleMiPrecioChange}
                  placeholder="Ciudad"
                  className="w-full h-8 rounded-lg bg-slate-950/80 border border-slate-700 px-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
              </div>
              <input
                name="precio"
                inputMode="decimal"
                value={miPrecioForm.precio}
                onChange={handleMiPrecioChange}
                placeholder="Precio"
                className="w-full h-8 rounded-lg bg-slate-950/80 border border-slate-700 px-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="h-8 px-3 rounded-lg bg-primary-500 text-white text-xs font-semibold hover:bg-primary-400 disabled:opacity-50"
                >
                  {miPrecioForm.id ? "Guardar" : "Agregar"}
                </button>
                {miPrecioForm.id && (
                  <button
                    type="button"
                    onClick={resetMiPrecio}
                    className="h-8 px-3 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <div className="space-y-1 max-h-56 overflow-y-auto">
              {misPrecios.length === 0 && (
                <p className="text-[11px] text-slate-500">Todavía no cargaste precios.</p>
              )}
              {misPrecios.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/60 border border-slate-800 px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-slate-200 truncate">
                      {[p.compania, p.cobertura].filter(Boolean).join(" · ") || "—"}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {p.ciudad || ""} {p.ciudad ? "·" : ""} {fmtMoney(p.precio)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMiPrecioEdit(p)}
                      className="p-1 rounded text-slate-400 hover:text-primary-300 hover:bg-slate-800"
                      title="Editar"
                    >
                      <HiPencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMiPrecioDelete(p.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-300 hover:bg-slate-800"
                      title="Eliminar"
                    >
                      <HiTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <CompetenciaFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        initialData={editing}
        saving={saving}
      />
    </div>
  );
};

export default CompetenciaPage;