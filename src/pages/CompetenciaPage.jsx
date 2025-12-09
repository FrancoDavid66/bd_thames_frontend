// src/pages/CompetenciaPage.jsx
import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { HiPlus, HiRefresh, HiChartBar } from "react-icons/hi";
import toast from "react-hot-toast";

import CompetenciaTable from "../components/competencia/CompetenciaTable";
import CompetenciaResumen from "../components/competencia/CompetenciaResumen";
import CompetenciaFormModal from "../components/competencia/CompetenciaFormModal";

import {
  fetchCompetenciaData,
  createRegistro,
  updateRegistro,
  deleteRegistro,
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
  activo: true,
};

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

  // Mis precios (form simple en el panel derecho)
  const [miPrecioForm, setMiPrecioForm] = useState(emptyMiPrecio);
  const [editandoMiPrecioId, setEditandoMiPrecioId] = useState(null);

  useEffect(() => {
    dispatch(fetchCompetenciaData());
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    dispatch(fetchCompetenciaData());
  }, [dispatch]);

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
    if (!ok) return;
    dispatch(deleteRegistro(row.id));
  };

  const handleSave = async (data) => {
    try {
      const { ofertas = [], ...competidor } = data || {};

      if (!ofertas.length) {
        toast.error("Agregá al menos una oferta (compañía/cobertura/precio).");
        return;
      }

      if (editing?.id) {
        // ✏️ EDITAR: actualizamos SOLO este registro usando la primera oferta
        const first = ofertas[0] || {};
        const payload = {
          ...competidor,
          compania: first.compania || "",
          cobertura: first.cobertura || "",
          precio:
            first.precio === null || first.precio === undefined
              ? null
              : first.precio,
        };

        await dispatch(
          updateRegistro({
            id: editing.id,
            original: editing,
            data: payload,
          })
        ).unwrap();
      } else {
        // ➕ CREAR: una fila por cada oferta (misma ubicación / redes / nombre)
        for (const oferta of ofertas) {
          const payload = {
            ...competidor,
            compania: oferta.compania || "",
            cobertura: oferta.cobertura || "",
            precio:
              oferta.precio === null || oferta.precio === undefined
                ? null
                : oferta.precio,
          };
          await dispatch(createRegistro(payload)).unwrap();
        }
      }

      setModalOpen(false);
      setEditing(null);
      dispatch(fetchCompetenciaData());
    } catch (err) {
      console.error("Error guardando registro de competencia", err);
      toast.error("No se pudo guardar la competencia");
    }
  };

  // ==== Mis precios: helpers ====
  const resetMiPrecioForm = () => {
    setMiPrecioForm(emptyMiPrecio);
    setEditandoMiPrecioId(null);
  };

  const handleMiPrecioChange = (e) => {
    const { name, value } = e.target;
    setMiPrecioForm((prev) => ({
      ...prev,
      [name]: name === "precio" ? value.replace(",", ".") : value,
    }));
  };

  const handleMiPrecioSubmit = async (e) => {
    e.preventDefault();
    const { cobertura, compania, ciudad, precio, notas, activo } =
      miPrecioForm;

    if (!cobertura.trim()) {
      toast.error("La cobertura es obligatoria");
      return;
    }
    if (!precio || isNaN(Number(precio))) {
      toast.error("Ingresá un precio válido");
      return;
    }

    const payload = {
      cobertura: cobertura.trim(),
      compania: (compania || "").trim(),
      ciudad: (ciudad || "").trim(),
      precio: Number(precio),
      notas: (notas || "").trim(),
      activo: activo !== false,
    };

    try {
      if (editandoMiPrecioId) {
        await dispatch(
          actualizarMiPrecio({ id: editandoMiPrecioId, data: payload })
        ).unwrap();
      } else {
        await dispatch(crearMiPrecio(payload)).unwrap();
      }
      resetMiPrecioForm();
      // refresco general para tener datos consistentes
      dispatch(fetchCompetenciaData());
    } catch (err) {
      console.error("Error guardando precio propio", err);
    }
  };

  const handleEditMiPrecio = (item) => {
    if (!item) return;
    setEditandoMiPrecioId(item.id);
    setMiPrecioForm({
      id: item.id,
      cobertura: item.cobertura || "",
      compania: item.compania || "",
      ciudad: item.ciudad || "",
      precio: item.precio != null ? String(item.precio) : "",
      notas: item.notas || "",
      activo: item.activo !== false,
    });
  };

  const handleDeleteMiPrecio = (item) => {
    if (!item?.id) return;
    const ok = window.confirm(
      `¿Eliminar tu precio de referencia para "${item.cobertura}"?`
    );
    if (!ok) return;
    dispatch(eliminarMiPrecio(item.id));
  };

  const formatMoney = (value) => {
    if (value == null || isNaN(Number(value))) return "—";
    return `$${Number(value).toLocaleString("es-AR")}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <HiChartBar className="w-6 h-6 text-primary-300" />
            Competencia
          </h1>
          <p className="text-sm text-slate-400">
            Compará precios y coberturas de tus competidores, y guardá tus
            precios de referencia para ver rápidamente dónde estás parado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center h-10 px-3 rounded-xl border border-slate-600 bg-slate-900/70 text-slate-200 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            <HiRefresh className="w-4 h-4 mr-1" />
            Recargar
          </button>
          <button
            type="button"
            onClick={handleNew}
            className="inline-flex items-center h-10 px-4 rounded-xl bg-primary-500 text-sm font-semibold text-white hover:bg-primary-400 disabled:opacity-50"
          >
            <HiPlus className="w-4 h-4 mr-1" />
            Nuevo registro
          </button>
        </div>
      </div>

      {/* Layout main */}
      <motion.div
        layout
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start"
      >
        {/* Tabla principal */}
        <div className="lg:col-span-2">
          <CompetenciaTable
            registros={ubicaciones}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>

        {/* Panel derecho: Resumen + Mis precios */}
        <div className="space-y-4">
          <CompetenciaResumen stats={stats} />

          {/* Mis precios propios */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xs font-semibold text-slate-200">
                  Mis precios de referencia
                </h2>
                <p className="text-[11px] text-slate-500">
                  Cargá tus precios por cobertura/compañía para compararlos con
                  la tabla de competencia.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleMiPrecioSubmit}
              className="space-y-2 mb-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="block text-[11px] text-slate-400 mb-0.5">
                    Cobertura *
                  </label>
                  <input
                    type="text"
                    name="cobertura"
                    value={miPrecioForm.cobertura}
                    onChange={handleMiPrecioChange}
                    className="w-full h-8 rounded-lg bg-slate-950/80 border border-slate-700 px-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400"
                    placeholder="Ej. Terceros completo"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">
                    Compañía
                  </label>
                  <input
                    type="text"
                    name="compania"
                    value={miPrecioForm.compania}
                    onChange={handleMiPrecioChange}
                    className="w-full h-8 rounded-lg bg-slate-950/80 border border-slate-700 px-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    name="ciudad"
                    value={miPrecioForm.ciudad}
                    onChange={handleMiPrecioChange}
                    className="w-full h-8 rounded-lg bg-slate-950/80 border border-slate-700 px-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">
                    Precio *
                  </label>
                  <input
                    type="number"
                    name="precio"
                    value={miPrecioForm.precio}
                    onChange={handleMiPrecioChange}
                    className="w-full h-8 rounded-lg bg-slate-950/80 border border-slate-700 px-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400"
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] text-slate-400 mb-0.5">
                    Notas
                  </label>
                  <input
                    type="text"
                    name="notas"
                    value={miPrecioForm.notas}
                    onChange={handleMiPrecioChange}
                    className="w-full h-8 rounded-lg bg-slate-950/80 border border-slate-700 px-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400"
                    placeholder="Algo a recordar (opcional)"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={resetMiPrecioForm}
                  className="text-[11px] text-slate-400 hover:text-slate-200"
                >
                  Limpiar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center h-8 px-3 rounded-lg bg-primary-500 text-[11px] font-semibold text-white hover:bg-primary-400 disabled:opacity-50"
                >
                  {editandoMiPrecioId ? "Actualizar precio" : "Guardar precio"}
                </button>
              </div>
            </form>

            <div className="border-t border-slate-800 pt-2 mt-2 max-h-40 overflow-y-auto">
              {(!misPrecios || misPrecios.length === 0) && (
                <p className="text-[11px] text-slate-500">
                  Aún no cargaste precios propios.
                </p>
              )}

              {misPrecios &&
                misPrecios.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-1 text-[11px]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-100 truncate">
                        {item.cobertura}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {item.compania ? `${item.compania} · ` : ""}
                        {item.ciudad}
                      </div>
                    </div>
                    <div className="ml-2 text-right">
                      <div className="text-slate-100">
                        {formatMoney(item.precio)}
                      </div>
                      <div className="flex gap-1 justify-end mt-0.5">
                        <button
                          type="button"
                          onClick={() => handleEditMiPrecio(item)}
                          className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-200 hover:bg-slate-700"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMiPrecio(item)}
                          className="px-2 py-0.5 rounded-md bg-red-900/80 text-[10px] text-red-100 hover:bg-red-800"
                        >
                          Borrar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </motion.div>

      <CompetenciaFormModal
        isOpen={modalOpen}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
            setEditing(null);
          }
        }}
        onSave={handleSave}
        initialData={editing}
        saving={saving}
      />
    </div>
  );
};

export default CompetenciaPage;
