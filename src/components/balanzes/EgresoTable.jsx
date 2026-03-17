import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

// 🚀 IMPORTAMOS CONTEXTO PARA SEGURIDAD
import { useAuth } from "../../context/AuthContext";

import { deleteEgreso, fetchEgresos } from "../../store/slices/egresosSlice";
import EgresoEditModal from "./EgresoEditModal";
import { HiPencil, HiTrash, HiUser, HiOfficeBuilding, HiClock } from "react-icons/hi";

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

  // 🚀 ESCUDO DE SUCURSAL: Identificamos si es admin
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

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
    // 🚀 Doble check de seguridad en el front
    if (!isWebAdmin) {
      alert("No tienes permisos para eliminar egresos. Contacta al administrador.");
      return;
    }
    const ok = window.confirm("¿Seguro que querés eliminar este egreso? Esto sumará dinero a tu caja chica nuevamente.");
    if (!ok) return;

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
        <h2 className="text-sm sm:text-lg font-semibold flex items-center gap-2">
          Egresos
          {isWebAdmin && !Array.isArray(egresosProp) && (
            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 font-normal">
              Vista Global
            </span>
          )}
        </h2>
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
              <tr className="bg-rose-600/95 text-white">
                <th className="px-3 sm:px-4 py-2 text-left">Categoría</th>
                <th className="px-3 sm:px-4 py-2 text-left">Descripción</th>
                <th className="px-3 sm:px-4 py-2 text-left">Forma de pago</th>
                <th className="px-3 sm:px-4 py-2 text-right">Monto</th>
                <th className="px-3 sm:px-4 py-2 text-left">Fecha</th>
                <th className="px-3 sm:px-4 py-2 text-left">Cargado por</th>
                <th className="px-3 sm:px-4 py-2 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-zinc-800/70">
                    <td className="px-3 sm:px-4 py-3"><div className="h-3 w-24 sm:w-28 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-3"><div className="h-3 w-40 sm:w-48 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-3"><div className="h-3 w-24 sm:w-28 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-3 text-right"><div className="h-3 w-16 sm:w-20 bg-zinc-800 rounded ml-auto" /></td>
                    <td className="px-3 sm:px-4 py-3"><div className="h-3 w-20 sm:w-24 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-3"><div className="h-3 w-24 sm:w-28 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-3 text-center"><div className="h-3 w-14 sm:w-16 bg-zinc-800 rounded mx-auto" /></td>
                  </tr>
                ))
              ) : data?.length ? (
                data.map((egreso) => (
                  <tr
                    key={egreso.id}
                    className="border-b border-zinc-800/70 hover:bg-zinc-900/70"
                  >
                    <td className="px-3 sm:px-4 py-2 align-top">
                      <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded w-fit inline-block">
                        {egreso.categoria || "S/C"}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top">
                      <div className="max-w-xs sm:max-w-md truncate font-semibold text-zinc-200">
                        {egreso.descripcion || "—"}
                      </div>
                      {/* 🚀 Si es admin, mostramos la oficina de donde viene este egreso */}
                      {isWebAdmin && egreso.oficina_nombre && (
                        <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                          <HiOfficeBuilding /> {egreso.oficina_nombre}
                        </div>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top text-zinc-400">
                      {egreso.forma_pago || "Efectivo"}
                    </td>
                    <td className="px-3 sm:px-4 py-2 text-right align-top font-bold text-rose-400">
                      ${fmtMoney(egreso.monto)}
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top text-zinc-300">
                      {fmtDate(egreso.fecha)}
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top">
                      <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                        <HiUser className="text-zinc-500" />
                        {egreso.usuario_nombre || "Sistema"}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top">
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        {/* 🚀 Editar y Borrar solo visibles para el Admin */}
                        {isWebAdmin ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setEgresoAEditar(egreso)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-white bg-sky-600/80 hover:bg-sky-600 text-xs transition-colors"
                              title="Editar egreso"
                            >
                              <HiPencil className="text-sm" />
                              <span className="hidden xl:inline">Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(egreso)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-white bg-rose-600/80 hover:bg-rose-600 text-xs transition-colors"
                              title="Eliminar egreso"
                            >
                              <HiTrash className="text-sm" />
                              <span className="hidden xl:inline">Eliminar</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-zinc-600 italic">Solo Admin</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-zinc-500"
                    colSpan={7}
                  >
                    No hay egresos para mostrar.
                  </td>
                </tr>
              )}
            </tbody>

            {data?.length ? (
              <tfoot>
                <tr className="bg-rose-900/30 border-t border-rose-800/50">
                  <td className="px-3 sm:px-4 py-3 font-semibold text-zinc-300" colSpan={3}>
                    Total Acumulado
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right font-extrabold text-rose-300 text-base">
                    ${fmtMoney(totalVisible)}
                  </td>
                  <td className="px-3 sm:px-4 py-3" colSpan={3} />
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
                  className="bg-zinc-950/70 border border-zinc-900 rounded-2xl px-3 py-3 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-zinc-400">
                          {egreso.categoria || "S/C"}
                        </span>
                        <p className="text-sm font-semibold text-zinc-50 leading-tight mt-0.5">
                          {egreso.descripcion || "Sin descripción"}
                        </p>
                      </div>
                      {isWebAdmin && egreso.oficina_nombre && (
                        <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                          <HiOfficeBuilding /> {egreso.oficina_nombre}
                        </p>
                      )}
                    </div>
                    <span className="text-base font-extrabold text-rose-400 whitespace-nowrap">
                      -${fmtMoney(egreso.monto)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400 border-t border-zinc-800/50 pt-2">
                    <span className="flex items-center gap-1"><HiClock className="text-zinc-600"/> {fmtDate(egreso.fecha)}</span>
                    {egreso.forma_pago && (
                      <span className="text-zinc-500">{egreso.forma_pago}</span>
                    )}
                  </div>

                  {/* 🚀 Fila extra para autoría y botones mobile */}
                  <div className="flex items-center justify-between mt-1 pt-1">
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <HiUser /> {egreso.usuario_nombre || "Sistema"}
                    </span>
                    
                    <div className="flex gap-2">
                      {isWebAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEgresoAEditar(egreso)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-sky-600/80 text-white hover:bg-sky-600 transition"
                            title="Editar egreso"
                          >
                            <HiPencil className="text-[10px]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(egreso)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-600/80 text-white hover:bg-rose-600 transition"
                            title="Eliminar egreso"
                          >
                            <HiTrash className="text-[10px]" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Total resumido en mobile */}
            <div className="mt-3 bg-rose-900/30 border border-rose-800/50 rounded-2xl px-4 py-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-zinc-300">
                Total acumulado
              </span>
              <span className="font-extrabold text-rose-300">
                ${fmtMoney(totalVisible)}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-3 text-xs text-zinc-500 text-center py-6 bg-zinc-950/50 rounded-2xl border border-dashed border-zinc-800">
            No hay egresos para mostrar.
          </div>
        )}
      </div>

      {/* Paginación (solo modo store) */}
      {!Array.isArray(egresosProp) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 text-xs sm:text-sm bg-zinc-950 p-2 rounded-xl border border-zinc-900">
          <button
            type="button"
            onClick={() => previous && setPage(Math.max(1, page - 1))}
            disabled={!previous}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              previous
                ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                : "bg-zinc-900 text-zinc-600 cursor-not-allowed"
            }`}
          >
            Anterior
          </button>
          <span className="opacity-70 font-semibold">Página {page}</span>
          <button
            type="button"
            onClick={() => next && setPage(page + 1)}
            disabled={!next}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              next
                ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                : "bg-zinc-900 text-zinc-600 cursor-not-allowed"
            }`}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal edición */}
      {egresoAEditar && isWebAdmin ? (
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