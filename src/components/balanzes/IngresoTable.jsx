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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
        <h2 className="text-sm sm:text-lg font-semibold">Ingresos</h2>
        {!Array.isArray(ingresosProp) && (
          <span className="text-[11px] sm:text-xs opacity-70">
            Página {page}
          </span>
        )}
      </div>

      {hasError && (
        <div className="mb-3 text-xs sm:text-sm text-red-400">
          {error || "Error al cargar ingresos"}
        </div>
      )}

      {/* ===== Vista DESKTOP/TABLET: tabla clásica ===== */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60 shadow-sm">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-emerald-600/95 text-white">
                <th className="px-3 sm:px-4 py-2 text-left">Descripción</th>
                <th className="px-3 sm:px-4 py-2 text-right">Monto</th>
                <th className="px-3 sm:px-4 py-2 text-left">Fecha</th>
                <th className="px-3 sm:px-4 py-2 text-left">Categoría</th>
                <th className="px-3 sm:px-4 py-2 text-left">Forma de pago</th>
                <th className="px-3 sm:px-4 py-2 text-left">Pagado por</th>
                <th className="px-3 sm:px-4 py-2 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                // ---- Skeleton simple ----
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={`sk-${i}`}
                    className="border-b border-zinc-800/70"
                  >
                    <td className="px-3 sm:px-4 py-3">
                      <div className="h-3 w-32 sm:w-40 bg-zinc-800 rounded" />
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <div className="h-3 w-16 sm:w-24 bg-zinc-800 rounded ml-auto" />
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="h-3 w-20 sm:w-24 bg-zinc-800 rounded" />
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="h-3 w-24 sm:w-28 bg-zinc-800 rounded" />
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="h-3 w-24 sm:w-28 bg-zinc-800 rounded" />
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="h-3 w-20 sm:w-24 bg-zinc-800 rounded" />
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-center">
                      <div className="h-3 w-12 sm:w-16 bg-zinc-800 rounded mx-auto" />
                    </td>
                  </tr>
                ))
              ) : data?.length ? (
                data.map((ingreso) => (
                  <tr
                    key={ingreso.id}
                    className="border-b border-zinc-800/70 hover:bg-zinc-900/70"
                  >
                    <td className="px-3 sm:px-4 py-2 align-top">
                      <div className="max-w-xs sm:max-w-md truncate">
                        {ingreso.descripcion || "—"}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 text-right align-top">
                      ${fmtMoney(ingreso.monto)}
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top">
                      {fmtDate(ingreso.fecha)}
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top">
                      {ingreso.categoria || "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top">
                      {ingreso.forma_pago || "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top">
                      {ingreso.pagado_por || "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top">
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => setIngresoAEditar(ingreso)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 text-xs"
                          title="Editar ingreso"
                        >
                          <HiPencil className="text-sm" />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ingreso)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-white bg-rose-600 hover:bg-rose-700 text-xs"
                          title="Eliminar ingreso"
                        >
                          <HiTrash className="text-sm" />
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
                    className="px-4 py-8 text-center text-zinc-500"
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
                <tr className="bg-emerald-900/30">
                  <td className="px-3 sm:px-4 py-2 font-semibold">
                    Total
                  </td>
                  <td className="px-3 sm:px-4 py-2 text-right font-extrabold">
                    ${fmtMoney(totalVisible)}
                  </td>
                  <td className="px-3 sm:px-4 py-2" colSpan={5} />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>

      {/* ===== Vista MOBILE: lista tipo cards ===== */}
      <div className="md:hidden">
        {isLoading ? (
          <ul className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <li
                key={`sk-m-${i}`}
                className="bg-zinc-950/70 border border-zinc-900 rounded-2xl px-3 py-2.5 flex gap-3"
              >
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-zinc-800 rounded" />
                  <div className="h-3 w-20 bg-zinc-800 rounded" />
                  <div className="h-3 w-24 bg-zinc-800 rounded" />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-6 w-6 bg-zinc-800 rounded-full" />
                  <div className="h-6 w-6 bg-zinc-800 rounded-full" />
                </div>
              </li>
            ))}
          </ul>
        ) : data?.length ? (
          <>
            <ul className="space-y-2">
              {data.map((ingreso) => (
                <li
                  key={ingreso.id}
                  className="bg-zinc-950/70 border border-zinc-900 rounded-2xl px-3 py-2.5 flex gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-zinc-50 truncate">
                        {ingreso.descripcion || "Ingreso"}
                      </p>
                      <span className="text-sm font-semibold text-emerald-300 whitespace-nowrap">
                        +${fmtMoney(ingreso.monto)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-400">
                      <span>{fmtDate(ingreso.fecha)}</span>
                      {ingreso.categoria && (
                        <span className="truncate max-w-[40%]">
                          {ingreso.categoria}
                        </span>
                      )}
                      {ingreso.forma_pago && (
                        <span className="truncate max-w-[40%]">
                          {ingreso.forma_pago}
                        </span>
                      )}
                      {ingreso.pagado_por && (
                        <span className="truncate max-w-[40%]">
                          {ingreso.pagado_por}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setIngresoAEditar(ingreso)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                      title="Editar ingreso"
                    >
                      <HiPencil className="text-sm" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ingreso)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-600 text-white text-xs hover:bg-rose-700"
                      title="Eliminar ingreso"
                    >
                      <HiTrash className="text-sm" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Total resumido en mobile */}
            <div className="mt-3 bg-emerald-500/15 border border-emerald-400/40 rounded-2xl px-3 py-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-100">
                Total visible
              </span>
              <span className="font-bold text-emerald-300">
                ${fmtMoney(totalVisible)}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-3 text-xs text-zinc-500">
            No hay ingresos para mostrar.
          </div>
        )}
      </div>

      {/* Paginación (solo modo store) */}
      {!Array.isArray(ingresosProp) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => previous && setPage(Math.max(1, page - 1))}
            disabled={!previous}
            className={`px-3 py-2 rounded-lg ${
              previous
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                : "bg-zinc-200/60 dark:bg-zinc-900/60 text-zinc-500 cursor-not-allowed"
            }`}
          >
            Anterior
          </button>
          <span className="opacity-70">Página {page}</span>
          <button
            type="button"
            onClick={() => next && setPage(page + 1)}
            disabled={!next}
            className={`px-3 py-2 rounded-lg ${
              next
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                : "bg-zinc-200/60 dark:bg-zinc-900/60 text-zinc-500 cursor-not-allowed"
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
