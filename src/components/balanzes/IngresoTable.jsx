// src/components/balanzes/IngresoTable.jsx
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");
import { HiClock } from "react-icons/hi";

// 🚀 IMPORTAMOS LINK PARA LA RUTA A PÓLIZAS
import { Link } from "react-router-dom";

// 🚀 IMPORTAMOS CONTEXTO PARA SEGURIDAD
import { useAuth } from "../../context/AuthContext";

import { deleteIngreso, fetchIngresos } from "../../store/slices/ingresosSlice";
import IngresoEditModal from "./IngresoEditModal";
import { HiPencil, HiTrash, HiUser, HiOfficeBuilding } from "react-icons/hi";

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

  // 🚀 ESCUDO DE SUCURSAL: Identificamos si es admin
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

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
  const fmtMoney = (n) => {
    // Forzamos a que reemplace comas por puntos para que JavaScript lo entienda
    const numeroLimpio = Number(String(n || "0").replace(",", "."));
    return (Number.isFinite(numeroLimpio) ? numeroLimpio : 0).toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
    
  const renderFechaConHora = (item) => {
    if (!item?.fecha) return "—";
    const fechaCorta = dayjs(item.fecha).format("DD/MM/YYYY");
    const hora = item.created_at ? dayjs(item.created_at).format("HH:mm") : null;
    
    return (
      <div className="flex flex-col">
        <span className="text-zinc-300 font-medium">{fechaCorta}</span>
        {hora && <span className="text-[10px] text-zinc-500 mt-0.5">{hora} hs</span>}
      </div>
    );
  };

  // 🚀 NUEVO: Detector de Pólizas para convertirlas en Link
  const renderDescripcionConLink = (descripcion) => {
    if (!descripcion) return "—";
    
    // Busca la palabra "Póliza " seguida de letras, números o guiones
    const match = descripcion.match(/(.*Póliza\s+)([\w-]+)(.*)/i);
    
    if (match) {
      const prefix = match[1];
      const polizaNum = match[2];
      const suffix = match[3];
      
      return (
        <>
          {prefix}
          <Link 
            to={`/polizas?search=${polizaNum}`} 
            className="text-sky-400 hover:text-sky-300 hover:underline underline-offset-2 transition-colors relative z-10"
            title="Buscar esta póliza"
          >
            {polizaNum}
          </Link>
          {suffix}
        </>
      );
    }
    return descripcion;
  };

  // 🚀 FIX: El totalizador también se rompía por las comas, ahora está blindado
  const totalVisible = useMemo(
    () => (data || []).reduce((acc, it) => {
      const val = Number(String(it?.monto || "0").replace(",", "."));
      return acc + (Number.isFinite(val) ? val : 0);
    }, 0),
    [data]
  );

  // ---- Acciones ----
  const handleDelete = async (ingreso) => {
    if (!isWebAdmin) {
      alert("No tienes permisos para eliminar ingresos. Contacta al administrador.");
      return;
    }
    const ok = window.confirm("¿Seguro que querés eliminar este ingreso? Esta acción afectará el balance.");
    if (!ok) return;

    try {
      await dispatch(deleteIngreso(ingreso.id)).unwrap();
      if (!Array.isArray(ingresosProp)) {
        dispatch(fetchIngresos({ page }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isLoading = !Array.isArray(ingresosProp) && status === "loading";
  const hasError = !Array.isArray(ingresosProp) && status === "failed";

  return (
    <div className={`w-full ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
        <h2 className="text-sm sm:text-lg font-semibold flex items-center gap-2">
          Ingresos
          {isWebAdmin && !Array.isArray(ingresosProp) && (
            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 font-normal">
              Vista Global
            </span>
          )}
        </h2>
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
                <th className="px-3 sm:px-4 py-2 text-left">Fecha y Hora</th>
                <th className="px-3 sm:px-4 py-2 text-left">Categoría / Forma</th>
                <th className="px-3 sm:px-4 py-2 text-left">Cargado por</th>
                <th className="px-3 sm:px-4 py-2 text-left">Pagado por</th>
                <th className="px-3 sm:px-4 py-2 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={`sk-${i}`}
                    className="border-b border-zinc-800/70"
                  >
                    <td className="px-3 sm:px-4 py-3"><div className="h-3 w-32 sm:w-40 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-3 text-right"><div className="h-3 w-16 sm:w-24 bg-zinc-800 rounded ml-auto" /></td>
                    <td className="px-3 sm:px-4 py-3"><div className="h-3 w-20 sm:w-24 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-3"><div className="h-3 w-24 sm:w-28 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-3"><div className="h-3 w-24 sm:w-28 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-3"><div className="h-3 w-20 sm:w-24 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-3 text-center"><div className="h-3 w-12 sm:w-16 bg-zinc-800 rounded mx-auto" /></td>
                  </tr>
                ))
              ) : data?.length ? (
                data.map((ingreso) => (
                  <tr
                    key={ingreso.id}
                    className="border-b border-zinc-800/70 hover:bg-zinc-900/70"
                  >
                    <td className="px-3 sm:px-4 py-2 align-top">
                      <div className="max-w-xs sm:max-w-md truncate font-semibold text-zinc-200">
                        {/* 🚀 Renderizamos con el Link inyectado */}
                        {renderDescripcionConLink(ingreso.descripcion)}
                      </div>
                      {isWebAdmin && ingreso.oficina_nombre && (
                        <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                          <HiOfficeBuilding /> {ingreso.oficina_nombre}
                        </div>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-2 text-right align-top font-bold text-emerald-400">
                      ${fmtMoney(ingreso.monto)}
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top">
                      {renderFechaConHora(ingreso)}
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded w-fit">
                          {ingreso.categoria || "S/C"}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {ingreso.forma_pago || "Efectivo"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top">
                      <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                        <HiUser className="text-zinc-500" />
                        {ingreso.usuario_nombre || "Sistema"}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top text-zinc-400 text-xs">
                      {ingreso.pagado_por || "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-2 align-top">
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2 relative z-20">
                        {isWebAdmin ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setIngresoAEditar(ingreso)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-white bg-emerald-600/80 hover:bg-emerald-600 text-xs transition-colors"
                              title="Editar ingreso"
                            >
                              <HiPencil className="text-sm" />
                              <span className="hidden xl:inline">Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(ingreso)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-white bg-rose-600/80 hover:bg-rose-600 text-xs transition-colors"
                              title="Eliminar ingreso"
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
                    No hay ingresos para mostrar.
                  </td>
                </tr>
              )}
            </tbody>

            {data?.length ? (
              <tfoot>
                <tr className="bg-emerald-900/30 border-t border-emerald-800/50">
                  <td className="px-3 sm:px-4 py-3 font-semibold text-zinc-300">
                    Total Acumulado
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right font-extrabold text-emerald-300 text-base">
                    ${fmtMoney(totalVisible)}
                  </td>
                  <td className="px-3 sm:px-4 py-3" colSpan={5} />
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
                  className="bg-zinc-950/70 border border-zinc-900 rounded-2xl px-3 py-3 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-zinc-50 leading-tight">
                        {/* 🚀 Renderizamos con el Link inyectado también en Mobile */}
                        {renderDescripcionConLink(ingreso.descripcion)}
                      </p>
                      {isWebAdmin && ingreso.oficina_nombre && (
                        <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                          <HiOfficeBuilding /> {ingreso.oficina_nombre}
                        </p>
                      )}
                    </div>
                    <span className="text-base font-extrabold text-emerald-400 whitespace-nowrap">
                      +${fmtMoney(ingreso.monto)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400 border-t border-zinc-800/50 pt-2 mt-1">
                    <span className="flex items-center gap-1">
                      <HiClock className="text-zinc-600"/> 
                      {ingreso.fecha ? dayjs(ingreso.fecha).format("DD/MM/YY") : "—"}
                      {ingreso.created_at && ` - ${dayjs(ingreso.created_at).format("HH:mm")} hs`}
                    </span>
                    {ingreso.categoria && (
                      <span className="bg-zinc-800 px-1.5 rounded">{ingreso.categoria}</span>
                    )}
                    {ingreso.forma_pago && (
                      <span className="text-zinc-500">{ingreso.forma_pago}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-1">
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <HiUser /> {ingreso.usuario_nombre || "Sistema"}
                    </span>
                    
                    <div className="flex gap-2 relative z-20">
                      {isWebAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setIngresoAEditar(ingreso)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600/80 text-white hover:bg-emerald-600 transition"
                            title="Editar ingreso"
                          >
                            <HiPencil className="text-[10px]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ingreso)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-600/80 text-white hover:bg-rose-600 transition"
                            title="Eliminar ingreso"
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

            <div className="mt-3 bg-emerald-900/30 border border-emerald-800/50 rounded-2xl px-4 py-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-zinc-300">
                Total acumulado
              </span>
              <span className="font-extrabold text-emerald-300">
                ${fmtMoney(totalVisible)}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-3 text-xs text-zinc-500 text-center py-6 bg-zinc-950/50 rounded-2xl border border-dashed border-zinc-800">
            No hay ingresos para mostrar.
          </div>
        )}
      </div>

      {/* Paginación */}
      {!Array.isArray(ingresosProp) && (
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
      {ingresoAEditar && isWebAdmin ? (
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