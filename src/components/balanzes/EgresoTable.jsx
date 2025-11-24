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
 * Mobile-first: en celular se muestra como lista de cards compactas.
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
        <h2 className="text-sm sm:text-lg font-semibold">Egresos</h2>
        {!Array.isArray(egresosProp) && (
          <span className="text-[11px] sm:text-xs opacity-70">
            Página {page}
          </span>
        )}
      </div>

      {hasError && (
        <div className="mb-3 text-xs sm:text-sm text-red-400">
          {error || "Error al cargar egresos"}
        </div>
      )}

      {/* ===== Vista DESKTOP/TABLET: tabla clásica ===== */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60 shadow-sm">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-red-600/95 text-white">
                <th className="px-3 sm:px-4 py-2 text-left">Categoría</th>
                <th className="px-3 sm:px-4 py-2 text-left">Descripción</th>
                <th className="px-3 sm:px-4 py-2 text-right">Monto</th>
                <th className="px-3 sm:px-4 py-2 text-left">Fecha</th>
                <th className="px-3 sm:px-4 py-2 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-zinc-800/70">
                    <td className="px-3 sm:px-4 py-3">
                      <div className="h-3 w-24 sm:w-28 bg-zinc-800 rounded" />
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="h-3 w-40 sm:w-48 bg-zinc-800 rounded" />
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <div className="h-3 w-16 sm:w-20 bg-zinc-800 rounded ml-auto" />
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="h-3 w-20 sm:w-24 bg-zinc-800 rounded" />
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-center">
                      <div className="h-3 w-14 sm:w-16 bg-zinc-800 rounded mx-auto" />
                    </td>
                  </tr>
                ))
              ) : data?.length ? (
                data.map((egreso) => (
                  <tr
                    key={egreso.id}
                    className="border-b border-zinc-800/70 hover:bg-zinc-900/70"
                  >
                    <td className="px-3 sm:px-4 py-2 align-top">
                      {egreso.categoria || "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top">
                      <div className="max-w-xs sm:max-w-md truncate">
                        {egreso.descripcion || "—"}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 text-right align-top">
                      ${fmtMoney(egreso.monto)}
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top">
                      {fmtDate(egreso.fecha)}
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top">
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => setEgresoAEditar(egreso)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-white bg-sky-600 hover:bg-sky-700 text-xs"
                          title="Editar egreso"
                        >
                          <HiPencil className="text-sm" />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(egreso)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-white bg-rose-600 hover:bg-rose-700 text-xs"
                          title="Eliminar egreso"
                        >
                          <HiTrash className="text-sm" />
                          <span className="hidden sm:inline">Eliminar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-zinc-500"
                    colSpan={5}
                  >
                    No hay egresos para mostrar.
                  </td>
                </tr>
              )}
            </tbody>

            {data?.length ? (
              <tfoot>
                <tr className="bg-rose-900/30">
                  <td className="px-3 sm:px-4 py-2 font-semibold">Total</td>
                  <td className="px-3 sm:px-4 py-2" />
                  <td className="px-3 sm:px-4 py-2 text-right font-extrabold">
                    ${fmtMoney(totalVisible)}
                  </td>
                  <td className="px-3 sm:px-4 py-2" colSpan={2} />
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
                  <div className="h-3 w-24 bg-zinc-800 rounded" />
                  <div className="h-3 w-40 bg-zinc-800 rounded" />
                  <div className="h-3 w-20 bg-zinc-800 rounded" />
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
              {data.map((egreso) => (
                <li
                  key={egreso.id}
                  className="bg-zinc-950/70 border border-zinc-900 rounded-2xl px-3 py-2.5 flex gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-zinc-400">
                          {egreso.categoria || "Egreso"}
                        </span>
                        <p className="text-xs font-semibold text-zinc-50 truncate">
                          {egreso.descripcion || "Sin descripción"}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-rose-300 whitespace-nowrap">
                        -${fmtMoney(egreso.monto)}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-400">
                      {fmtDate(egreso.fecha)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setEgresoAEditar(egreso)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-sky-600 text-white text-xs hover:bg-sky-700"
                      title="Editar egreso"
                    >
                      <HiPencil className="text-sm" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(egreso)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-600 text-white text-xs hover:bg-rose-700"
                      title="Eliminar egreso"
                    >
                      <HiTrash className="text-sm" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Total resumido en mobile */}
            <div className="mt-3 bg-rose-500/15 border border-rose-400/40 rounded-2xl px-3 py-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-100">
                Total visible
              </span>
              <span className="font-bold text-rose-300">
                ${fmtMoney(totalVisible)}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-3 text-xs text-zinc-500">
            No hay egresos para mostrar.
          </div>
        )}
      </div>

      {/* Paginación (solo modo store) */}
      {!Array.isArray(egresosProp) && (
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
