// src/components/balanzes/IngresoTable.jsx
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");
import { HiClock, HiPencil, HiTrash, HiUser, HiOfficeBuilding } from "react-icons/hi";

// 🚀 IMPORTAMOS LINK PARA LA RUTA A PÓLIZAS
import { Link } from "react-router-dom";

// 🚀 IMPORTAMOS CONTEXTO PARA SEGURIDAD
import { useAuth } from "../../context/AuthContext";

import { deleteIngreso, fetchIngresos } from "../../store/slices/ingresosSlice";
import IngresoEditModal from "./IngresoEditModal";

/**
 * IngresoTable
 *
 * Dos modos de uso:
 * 1) CONTROLADO POR PROPS (sin paginación): <IngresoTable ingresos={arrayFiltrada} />
 * 2) CONTROLADO POR STORE (con paginación): <IngresoTable /> → usa redux (fetchIngresos)
 *
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
      dispatch(fetchIngresos({ page }));
    }
  }, [dispatch, page, ingresosProp]);

  // ---- Modal edición ----
  const [ingresoAEditar, setIngresoAEditar] = useState(null);

  // 🚀 NUEVO ESTADO: Filtro por Forma de Pago
  const [filtroForma, setFiltroForma] = useState("TODAS");

  // ---- Fuente de datos original ----
  const data = Array.isArray(ingresosProp) ? ingresosProp : ingresosStore;

  // 🚀 FILTRAMOS LOS DATOS SEGÚN EL BOTÓN SELECCIONADO
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (filtroForma === "TODAS") return data;
    return data.filter(it => {
      const forma = (it?.forma_pago || "EFECTIVO").toUpperCase();
      return forma === filtroForma;
    });
  }, [data, filtroForma]);

  // ---- Helpers de formato ----
  const fmtMoney = (n) => {
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

  // 🚀 INSIGNIAS DE FORMA DE PAGO GIGANTES
  const renderFormaPago = (formaRaw) => {
    const forma = (formaRaw || "EFECTIVO").toUpperCase();
    
    if (forma === "EFECTIVO") {
      return (
        <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-sm">
          💵 EFECTIVO
        </span>
      );
    }
    if (forma === "TRANSFERENCIA") {
      return (
        <span className="inline-flex items-center gap-1.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-sm">
          🏦 TRANSF.
        </span>
      );
    }
    // Otros (MercadoPago, Tarjeta, etc)
    return (
      <span className="inline-flex items-center gap-1.5 bg-zinc-700/50 text-zinc-300 border border-zinc-600 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-sm">
        💳 {forma}
      </span>
    );
  };

  // 🚀 ELIMINA EL NÚMERO DE PÓLIZA Y PONE EL LINK SOLO EN LA PALABRA
  const renderDescripcionConLink = (descripcion) => {
    if (!descripcion) return "—";
    
    // Busca todo hasta "Póliza ", atrapa "Póliza", atrapa el "número feo" y lo que sigue.
    const match = descripcion.match(/(.*)(Póliza)\s+([\w-]+)(.*)/i);
    
    if (match) {
      const prefix = match[1];       // Ej: "Pago cuota 2 - "
      const wordPoliza = match[2];   // "Póliza"
      const polizaNum = match[3];    // "SN-202603..." (el número que queremos ocultar)
      const suffix = match[4];       // ""
      
      return (
        <>
          {prefix}
          <Link 
            to={`/polizas?search=${polizaNum}`} 
            className="text-sky-400 hover:text-sky-300 hover:underline underline-offset-2 transition-colors relative z-10"
            title={`Buscar póliza ${polizaNum}`}
          >
            {wordPoliza}
          </Link>
          {suffix}
        </>
      );
    }
    return descripcion;
  };

  const totalVisible = useMemo(
    () => (filteredData || []).reduce((acc, it) => {
      const val = Number(String(it?.monto || "0").replace(",", "."));
      return acc + (Number.isFinite(val) ? val : 0);
    }, 0),
    [filteredData]
  );

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
      
      {/* 🚀 ENCABEZADO Y FILTROS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <h2 className="text-sm sm:text-lg font-semibold flex items-center gap-2">
          Listado de Ingresos
          {isWebAdmin && !Array.isArray(ingresosProp) && (
            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 font-normal">
              Vista Global
            </span>
          )}
        </h2>

        {/* 🚀 BOTONES DE FILTRO */}
        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setFiltroForma("TODAS")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroForma === "TODAS" ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            Todas
          </button>
          <button
            onClick={() => setFiltroForma("EFECTIVO")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroForma === "EFECTIVO" ? "bg-emerald-500/20 text-emerald-400 shadow-sm" : "text-zinc-400 hover:text-emerald-400/70"}`}
          >
            Efectivo
          </button>
          <button
            onClick={() => setFiltroForma("TRANSFERENCIA")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroForma === "TRANSFERENCIA" ? "bg-sky-500/20 text-sky-400 shadow-sm" : "text-zinc-400 hover:text-sky-400/70"}`}
          >
            Transf.
          </button>
        </div>
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
                <th className="px-3 sm:px-4 py-3 text-left">Descripción</th>
                <th className="px-3 sm:px-4 py-3 text-right">Monto</th>
                <th className="px-3 sm:px-4 py-3 text-left">Fecha y Hora</th>
                <th className="px-3 sm:px-4 py-3 text-center">Categoría / Forma</th>
                <th className="px-3 sm:px-4 py-3 text-left">Cargado por</th>
                <th className="px-3 sm:px-4 py-3 text-left">Pagado por</th>
                <th className="px-3 sm:px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-zinc-800/70">
                    <td className="px-3 sm:px-4 py-4"><div className="h-3 w-32 sm:w-40 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-4 text-right"><div className="h-3 w-16 sm:w-24 bg-zinc-800 rounded ml-auto" /></td>
                    <td className="px-3 sm:px-4 py-4"><div className="h-3 w-20 sm:w-24 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-4"><div className="h-6 w-24 sm:w-28 bg-zinc-800 rounded mx-auto" /></td>
                    <td className="px-3 sm:px-4 py-4"><div className="h-3 w-24 sm:w-28 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-4"><div className="h-3 w-20 sm:w-24 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-4 text-center"><div className="h-3 w-12 sm:w-16 bg-zinc-800 rounded mx-auto" /></td>
                  </tr>
                ))
              ) : filteredData?.length ? (
                filteredData.map((ingreso) => (
                  <tr
                    key={ingreso.id}
                    className="border-b border-zinc-800/70 hover:bg-zinc-900/70"
                  >
                    <td className="px-3 sm:px-4 py-3 align-middle">
                      <div className="max-w-xs sm:max-w-md truncate font-semibold text-zinc-200">
                        {renderDescripcionConLink(ingreso.descripcion)}
                      </div>
                      {isWebAdmin && ingreso.oficina_nombre && (
                        <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1 font-semibold uppercase tracking-wider">
                          <HiOfficeBuilding /> {ingreso.oficina_nombre}
                        </div>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right align-middle font-extrabold text-emerald-400 text-base tracking-tight">
                      ${fmtMoney(ingreso.monto)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 align-middle">
                      {renderFechaConHora(ingreso)}
                    </td>
                    
                    {/* 🚀 COLUMNA DE CATEGORÍA Y FORMA DE PAGO */}
                    <td className="px-3 sm:px-4 py-3 align-middle text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        {renderFormaPago(ingreso.forma_pago)}
                        {ingreso.billetera && ingreso.forma_pago !== "EFECTIVO" && (
                          <span className="text-[10px] font-mono text-sky-400/80 bg-sky-950/40 border border-sky-800/40 px-2 py-0.5 rounded-md truncate max-w-[120px]" title={ingreso.billetera}>
                            {ingreso.billetera}
                          </span>
                        )}
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 truncate max-w-[100px]">
                          {ingreso.categoria || "S/C"}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 sm:px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium">
                        <HiUser className="text-zinc-500" />
                        {ingreso.usuario_nombre || "Sistema"}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 align-middle text-zinc-300 font-medium text-xs">
                      {ingreso.pagado_por || "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-3 align-middle">
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2 relative z-20">
                        {isWebAdmin ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setIngresoAEditar(ingreso)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white bg-zinc-800 hover:bg-emerald-600 transition-colors"
                              title="Editar ingreso"
                            >
                              <HiPencil className="text-sm" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(ingreso)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white bg-zinc-800 hover:bg-rose-600 transition-colors"
                              title="Eliminar ingreso"
                            >
                              <HiTrash className="text-sm" />
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
                  <td className="px-4 py-12 text-center text-zinc-500" colSpan={7}>
                    No se encontraron ingresos para este filtro.
                  </td>
                </tr>
              )}
            </tbody>

            {filteredData?.length ? (
              <tfoot>
                <tr className="bg-emerald-900/30 border-t border-emerald-800/50">
                  <td className="px-3 sm:px-4 py-4 font-semibold text-zinc-300 uppercase tracking-widest text-xs">
                    Total Filtrado
                  </td>
                  <td className="px-3 sm:px-4 py-4 text-right font-extrabold text-emerald-300 text-lg tracking-tight">
                    ${fmtMoney(totalVisible)}
                  </td>
                  <td className="px-3 sm:px-4 py-4" colSpan={5} />
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
              <li key={`sk-m-${i}`} className="bg-zinc-950/70 border border-zinc-900 rounded-2xl px-3 py-2.5 flex gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-zinc-800 rounded" />
                  <div className="h-3 w-20 bg-zinc-800 rounded" />
                  <div className="h-3 w-24 bg-zinc-800 rounded" />
                </div>
              </li>
            ))}
          </ul>
        ) : filteredData?.length ? (
          <>
            <ul className="space-y-3">
              {filteredData.map((ingreso) => (
                <li
                  key={ingreso.id}
                  className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3 shadow-sm"
                >
                  {/* Fila 1: Monto y Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xl font-black text-emerald-400 tracking-tight">
                      +${fmtMoney(ingreso.monto)}
                    </span>
                    <div className="flex flex-col items-end gap-1.5">
                      {renderFormaPago(ingreso.forma_pago)}
                      <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                        {ingreso.categoria || "S/C"}
                      </span>
                    </div>
                  </div>

                  {/* Fila 2: Descripción y Oficina */}
                  <div>
                    <p className="text-sm font-semibold text-zinc-100 leading-snug">
                      {renderDescripcionConLink(ingreso.descripcion)}
                    </p>
                    {isWebAdmin && ingreso.oficina_nombre && (
                      <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1 font-semibold uppercase tracking-wider">
                        <HiOfficeBuilding /> {ingreso.oficina_nombre}
                      </p>
                    )}
                  </div>

                  {/* Fila 3: Pagador */}
                  <div className="text-xs text-zinc-400 flex items-center gap-1.5 bg-zinc-900/50 p-2 rounded-lg">
                    <span className="font-semibold text-zinc-500 uppercase text-[10px]">De:</span> 
                    <span className="text-zinc-300 truncate">{ingreso.pagado_por || "—"}</span>
                  </div>

                  {/* Fila 4: Footer de la tarjeta (Fecha, Usuario y Botones) */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
                        <HiClock className="text-zinc-600"/> 
                        {ingreso.fecha ? dayjs(ingreso.fecha).format("DD/MM/YY") : "—"}
                        {ingreso.created_at && ` - ${dayjs(ingreso.created_at).format("HH:mm")} hs`}
                      </span>
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5 font-medium">
                        <HiUser className="text-zinc-600" /> Por: {ingreso.usuario_nombre || "Sistema"}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 relative z-20">
                      {isWebAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setIngresoAEditar(ingreso)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 hover:bg-emerald-600 hover:text-white transition"
                          >
                            <HiPencil className="text-[12px]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ingreso)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 hover:bg-rose-600 hover:text-white transition"
                          >
                            <HiTrash className="text-[12px]" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 bg-emerald-900/30 border border-emerald-800/50 rounded-2xl px-4 py-4 flex items-center justify-between shadow-sm">
              <span className="font-bold text-zinc-300 uppercase text-xs tracking-widest">
                Total Filtrado
              </span>
              <span className="font-black text-emerald-400 text-xl tracking-tight">
                ${fmtMoney(totalVisible)}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-3 text-sm text-zinc-500 text-center py-10 bg-zinc-950/50 rounded-2xl border border-dashed border-zinc-800">
            No se encontraron ingresos.
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