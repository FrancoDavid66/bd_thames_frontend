import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

import { deleteEgreso, fetchEgresos } from "../../store/slices/egresosSlice";
import EgresoEditModal from "./EgresoEditModal";
import { HiPencil, HiTrash } from "react-icons/hi";

/**
 * EgresoTable
 *
 * Modos:
 * 1) Con prop: <EgresoTable egresos={arrayFiltrada} /> → sin paginación, usa la data provista.
 * 2) Sin prop: <EgresoTable /> → usa Redux (fetchEgresos) con paginación.
 *
 * Estilo: encabezado sticky rojo, skeleton al cargar, vacío elegante y total al pie.
 */
const EgresoTable = ({ egresos: egresosProp, className = "" }) => {
  const dispatch = useDispatch();

  // ---- STORE (modo paginado) ----
  const {
    list: egresosStore = [],
    status = "idle",
    error = null,
    next = null,
    previous = null,
    currentPage = 1,
  } = useSelector((s) => s.egresos || {});

  // ---- Página (solo modo store) ----
  const [page, setPage] = useState(currentPage || 1);
  useEffect(() => {
    if (!Array.isArray(egresosProp)) {
      dispatch(fetchEgresos({ page }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, page, egresosProp]);

  // ---- Modal edición ----
  const [egresoAEditar, setEgresoAEditar] = useState(null);

  // ---- Fuente de datos visible ----
  const data = Array.isArray(egresosProp) ? egresosProp : egresosStore;

  // ---- Helpers ----
  const fmtMoney = (n) =>
    (Number(n) || 0).toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");

  const totalVisible = useMemo(
    () => (data || []).reduce((acc, it) => acc + (Number(it?.monto) || 0), 0),
    [data]
  );

  // ---- Acciones ----
  const handleDelete = async (egreso) => {
    try {
      await dispatch(deleteEgreso(egreso.id)).unwrap();
      if (!Array.isArray(egresosProp)) {
        dispatch(fetchEgresos({ page }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isLoading = !Array.isArray(egresosProp) && status === "loading";
  const hasError = !Array.isArray(egresosProp) && status === "failed";

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Egresos</h2>
        {!Array.isArray(egresosProp) && (
          <span className="text-xs opacity-70">Página {page}</span>
        )}
      </div>

      {hasError && (
        <div className="mb-3 text-sm text-red-400">
          {error || "Error al cargar egresos"}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-red-600 text-white">
              <th className="px-4 py-2 text-left">Categoría</th>
              <th className="px-4 py-2 text-left">Descripción</th>
              <th className="px-4 py-2 text-right">Monto</th>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-zinc-200/60 dark:border-zinc-700/60">
                  <td className="px-4 py-3">
                    <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-3 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded ml-auto" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded mx-auto" />
                  </td>
                </tr>
              ))
            ) : data?.length ? (
              data.map((egreso) => (
                <tr
                  key={egreso.id}
                  className="border-b border-zinc-200/60 dark:border-zinc-700/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <td className="px-4 py-2">{egreso.categoria || "—"}</td>
                  <td className="px-4 py-2">{egreso.descripcion || "—"}</td>
                  <td className="px-4 py-2 text-right">${fmtMoney(egreso.monto)}</td>
                  <td className="px-4 py-2">{fmtDate(egreso.fecha)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEgresoAEditar(egreso)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-white bg-blue-600 hover:bg-blue-700"
                        title="Editar egreso"
                      >
                        <HiPencil />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(egreso)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-white bg-red-600 hover:bg-red-700"
                        title="Eliminar egreso"
                      >
                        <HiTrash />
                        <span className="hidden sm:inline">Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400"
                  colSpan={5}
                >
                  No hay egresos para mostrar.
                </td>
              </tr>
            )}
          </tbody>

          {data?.length ? (
            <tfoot>
              <tr className="bg-red-50 dark:bg-red-900/20">
                <td className="px-4 py-2 font-semibold">Total</td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2 text-right font-extrabold">
                  ${fmtMoney(totalVisible)}
                </td>
                <td className="px-4 py-2" colSpan={2} />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {/* Paginación (solo modo store) */}
      {!Array.isArray(egresosProp) && (
        <div className="flex items-center justify-between mt-3">
          <button
            type="button"
            onClick={() => previous && setPage(Math.max(1, page - 1))}
            disabled={!previous}
            className={`px-3 py-2 rounded ${
              previous
                ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                : "bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-400 cursor-not-allowed"
            }`}
          >
            Anterior
          </button>
          <span className="text-xs opacity-70">Página {page}</span>
          <button
            type="button"
            onClick={() => next && setPage(page + 1)}
            disabled={!next}
            className={`px-3 py-2 rounded ${
              next
                ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                : "bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-400 cursor-not-allowed"
            }`}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal edición */}
      {egresoAEditar ? (
        <EgresoEditModal
          isOpen={!!egresoAEditar}
          egreso={egresoAEditar}
          onClose={() => setEgresoAEditar(null)}
        />
      ) : null}
    </div>
  );
};

export default EgresoTable;
