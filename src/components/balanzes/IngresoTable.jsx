import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

import { deleteIngreso, fetchIngresos } from "../../store/slices/ingresosSlice";
import IngresoEditModal from "./IngresoEditModal";
import { HiPencil, HiTrash } from "react-icons/hi";

/**
 * IngresoTable
 *
 * Dos modos de uso:
 * 1) CONTROLADO POR PROPS (sin paginación): <IngresoTable ingresos={arrayFiltrada} />
 * 2) CONTROLADO POR STORE (con paginación): <IngresoTable /> → usa redux (fetchIngresos)
 *
 * Colores: verde para encabezado, textos y estados alineados a la paleta actual.
 */
const IngresoTable = ({ ingresos: ingresosProp, className = "" }) => {
  const dispatch = useDispatch();

  // ---- STORE (modo paginado) ----
  const {
    list: ingresosStore = [],
    status = "idle",
    error = null,
    next = null,
    previous = null,
    currentPage = 1,
  } = useSelector((s) => s.ingresos || {});

  // ---- Control de página (solo en modo store) ----
  const [page, setPage] = useState(currentPage || 1);
  useEffect(() => {
    if (!Array.isArray(ingresosProp)) {
      // Modo store: traer página actual
      dispatch(fetchIngresos({ page }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, page, ingresosProp]);

  // ---- Modal edición ----
  const [ingresoAEditar, setIngresoAEditar] = useState(null);

  // ---- Fuente de datos visible ----
  const data = Array.isArray(ingresosProp) ? ingresosProp : ingresosStore;

  // ---- Helpers de formato ----
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
  const handleDelete = async (ingreso) => {
    try {
      await dispatch(deleteIngreso(ingreso.id)).unwrap();
      // Refrescar página actual solo en modo store
      if (!Array.isArray(ingresosProp)) {
        dispatch(fetchIngresos({ page }));
      }
    } catch (err) {
      // El slice ya setea el error; acá no mostramos toast para no duplicar
      console.error(err);
    }
  };

  const isLoading = !Array.isArray(ingresosProp) && status === "loading";
  const hasError = !Array.isArray(ingresosProp) && status === "failed";

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Ingresos</h2>
        {!Array.isArray(ingresosProp) && (
          <span className="text-xs opacity-70">Página {page}</span>
        )}
      </div>

      {hasError && (
        <div className="mb-3 text-sm text-red-400">
          {error || "Error al cargar ingresos"}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-green-600 text-white">
              <th className="px-4 py-2 text-left">Descripción</th>
              <th className="px-4 py-2 text-right">Monto</th>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Categoría</th>
              <th className="px-4 py-2 text-left">Forma de pago</th>
              <th className="px-4 py-2 text-left">Pagado por</th>
              <th className="px-4 py-2 text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              // ---- Skeleton simple ----
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-zinc-200/60 dark:border-zinc-700/60">
                  <td className="px-4 py-3">
                    <div className="h-3 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded ml-auto" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
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
              data.map((ingreso) => (
                <tr
                  key={ingreso.id}
                  className="border-b border-zinc-200/60 dark:border-zinc-700/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <td className="px-4 py-2">{ingreso.descripcion || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    ${fmtMoney(ingreso.monto)}
                  </td>
                  <td className="px-4 py-2">{fmtDate(ingreso.fecha)}</td>
                  <td className="px-4 py-2">{ingreso.categoria || "—"}</td>
                  <td className="px-4 py-2">{ingreso.forma_pago || "—"}</td>
                  <td className="px-4 py-2">{ingreso.pagado_por || "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIngresoAEditar(ingreso)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-white bg-green-600 hover:bg-green-700"
                        title="Editar ingreso"
                      >
                        <HiPencil />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(ingreso)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-white bg-red-600 hover:bg-red-700"
                        title="Eliminar ingreso"
                      >
                        <HiTrash />
                        <span className="hidden sm:inline">Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              // ---- Estado vacío ----
              <tr>
                <td
                  className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400"
                  colSpan={7}
                >
                  No hay ingresos para mostrar.
                </td>
              </tr>
            )}
          </tbody>

          {/* ---- Total al pie (solo cuando hay data) ---- */}
          {data?.length ? (
            <tfoot>
              <tr className="bg-green-50 dark:bg-green-900/20">
                <td className="px-4 py-2 font-semibold">Total</td>
                <td className="px-4 py-2 text-right font-extrabold">
                  ${fmtMoney(totalVisible)}
                </td>
                <td className="px-4 py-2" colSpan={5} />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {/* Paginación (solo modo store) */}
      {!Array.isArray(ingresosProp) && (
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
      {ingresoAEditar ? (
        <IngresoEditModal
          isOpen={!!ingresoAEditar}
          ingreso={ingresoAEditar}
          onClose={() => setIngresoAEditar(null)}
        />
      ) : null}
    </div>
  );
};

export default IngresoTable;
