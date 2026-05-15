// src/components/balanzes/EgresoTable.jsx
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");
import { HiClock, HiPencil, HiTrash, HiUser, HiOfficeBuilding, HiOutlineExternalLink } from "react-icons/hi";
import { Link } from "react-router-dom"; // 🚀 Importación para enlaces

import { useAuth } from "../../context/AuthContext";
import { deleteEgreso, fetchEgresos } from "../../store/slices/egresosSlice";
import EgresoEditModal from "./EgresoEditModal";

const EgresoTable = ({ egresos: egresosProp, className = "" }) => {
  const dispatch = useDispatch();

  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const {
    list: egresosStore = [],
    status = "idle",
    error = null,
    next = null,
    previous = null,
    currentPage = 1,
  } = useSelector((s) => s.egresos || {});

  const [page, setPage] = useState(currentPage || 1);
  useEffect(() => {
    if (!Array.isArray(egresosProp)) {
      dispatch(fetchEgresos({ page }));
    }
  }, [dispatch, page, egresosProp]);

  const [egresoAEditar, setEgresoAEditar] = useState(null);
  const [filtroForma, setFiltroForma] = useState("TODAS");

  const data = Array.isArray(egresosProp) ? egresosProp : egresosStore;

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (filtroForma === "TODAS") return data;
    return data.filter(it => {
      const forma = (it?.forma_pago || "EFECTIVO").toUpperCase();
      return forma === filtroForma;
    });
  }, [data, filtroForma]);

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
    return (
      <span className="inline-flex items-center gap-1.5 bg-zinc-700/50 text-zinc-300 border border-zinc-600 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-sm">
        💳 {forma}
      </span>
    );
  };

  // 🚀 NUEVA FUNCIÓN: Limpia la descripción, quita la patente y detecta pólizas
  const renderDescripcion = (descripcionOriginal) => {
    if (!descripcionOriginal) return "—";

    // Regex para buscar "Póliza " seguido de cualquier cosa hasta un paréntesis (la patente) o el final
    const matchPoliza = descripcionOriginal.match(/(.*?)(Póliza\s+[\w-]+)(?:\s*\([^)]+\))?(.*)/i);

    if (matchPoliza) {
      const [, preTexto, polizaParte, postTexto] = matchPoliza;
      
      // Extraemos solo el número de póliza para la URL (asumiendo que empieza después de "Póliza ")
      const polizaNumero = polizaParte.replace(/Póliza\s+/i, "").trim();
      
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-zinc-200">
            {preTexto.trim() || "Pago de Egreso"}
          </span>
          <div className="flex items-center">
            {/* OJO: Aquí asumo que la ruta para ver pólizas por número/busqueda es /polizas. 
                Si tu ruta requiere ID interno, dejaremos el link para que filtre por número de póliza en la grilla */}
            <Link 
              to={`/polizas?search=${polizaNumero}`} 
              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 transition-colors uppercase tracking-wider bg-sky-400/10 px-1.5 py-0.5 rounded border border-sky-400/20"
            >
              {polizaParte} <HiOutlineExternalLink className="text-[10px]" />
            </Link>
            {postTexto && <span className="text-zinc-500 ml-1 text-[11px]">{postTexto}</span>}
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-xs sm:max-w-md font-semibold text-zinc-200">
        {descripcionOriginal}
      </div>
    );
  };

  const totalVisible = useMemo(
    () => (filteredData || []).reduce((acc, it) => {
      const val = Number(String(it?.monto || "0").replace(",", "."));
      return acc + (Number.isFinite(val) ? val : 0);
    }, 0),
    [filteredData]
  );

  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDelete = (egreso) => {
    if (!isWebAdmin) return;
    setConfirmDelete(egreso);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    try {
      await dispatch(deleteEgreso(confirmDelete.id)).unwrap();
      if (!Array.isArray(egresosProp)) dispatch(fetchEgresos({ page }));
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmDelete(null);
    }
  };

  const isLoading = !Array.isArray(egresosProp) && status === "loading";
  const hasError = !Array.isArray(egresosProp) && status === "failed";

  return (
    <div className={`w-full ${className}`}>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <h2 className="text-sm sm:text-lg font-semibold flex items-center gap-2">
          Listado de Egresos
          {isWebAdmin && !Array.isArray(egresosProp) && (
            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 font-normal">
              Vista Global
            </span>
          )}
        </h2>

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
          {error || "Error al cargar egresos"}
        </div>
      )}

      {/* ===== Vista DESKTOP/TABLET ===== */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/60">
          <table className="min-w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-3 sm:px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Descripción</th>
                <th className="px-3 sm:px-4 py-2.5 text-right text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Monto</th>
                <th className="px-3 sm:px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Fecha</th>
                <th className="px-3 sm:px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Categoría</th>
                <th className="px-3 sm:px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Forma</th>
                <th className="px-3 sm:px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Cargado por</th>
                {isWebAdmin && <th className="px-3 sm:px-4 py-2.5 text-center text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Acciones</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800/60">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    <td className="px-3 sm:px-4 py-3"><div className="h-3 w-40 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-3 text-right"><div className="h-3 w-20 bg-zinc-800 rounded ml-auto" /></td>
                    <td className="px-3 sm:px-4 py-3"><div className="h-3 w-24 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-3"><div className="h-5 w-24 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-3"><div className="h-5 w-20 bg-zinc-800 rounded" /></td>
                    <td className="px-3 sm:px-4 py-3"><div className="h-3 w-24 bg-zinc-800 rounded" /></td>
                    {isWebAdmin && <td className="px-3 sm:px-4 py-3"><div className="h-5 w-16 bg-zinc-800 rounded mx-auto" /></td>}
                  </tr>
                ))
              ) : filteredData?.length ? (
                filteredData.map((egreso) => (
                  <tr key={egreso.id} className="hover:bg-zinc-900/60 transition-colors">
                    <td className="px-3 sm:px-4 py-3 align-middle">
                      <div className="max-w-xs truncate text-zinc-200 text-xs">
                        {renderDescripcion(egreso.descripcion)}
                      </div>
                      {isWebAdmin && egreso.oficina_nombre && (
                        <div className="text-[10px] text-zinc-600 mt-0.5 flex items-center gap-1 font-mono">
                          <HiOfficeBuilding className="w-3 h-3" /> {egreso.oficina_nombre}
                        </div>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right align-middle font-mono font-semibold text-rose-400 text-sm">
                      -${fmtMoney(egreso.monto)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 align-middle">
                      {renderFechaConHora(egreso)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 align-middle">
                      <span className="text-[10px] font-mono border border-zinc-700 text-zinc-400 rounded px-1.5 py-0.5 bg-zinc-900">
                        {egreso.categoria || "S/C"}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 align-middle">
                      <div className="flex flex-col items-start gap-1.5">
                        {renderFormaPago(egreso.forma_pago)}
                        {egreso.billetera && egreso.forma_pago !== "EFECTIVO" && (
                          <span className="text-[10px] font-mono text-rose-400/80 bg-rose-950/40 border border-rose-800/40 px-2 py-0.5 rounded-md truncate max-w-[140px]" title={egreso.billetera}>
                            {egreso.billetera}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                        <HiUser className="w-3 h-3 text-zinc-600" />
                        {egreso.usuario_nombre || "Sistema"}
                      </div>
                    </td>
                    {isWebAdmin && (
                      <td className="px-3 sm:px-4 py-3 align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEgresoAEditar(egreso)}
                            className="h-7 w-7 rounded-md bg-zinc-800 hover:bg-emerald-700 text-zinc-300 hover:text-white transition-colors inline-flex items-center justify-center"
                            title="Editar"
                          >
                            <HiPencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(egreso)}
                            className="h-7 w-7 rounded-md bg-zinc-800 hover:bg-rose-700 text-zinc-300 hover:text-white transition-colors inline-flex items-center justify-center"
                            title="Eliminar"
                          >
                            <HiTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-zinc-600 text-sm" colSpan={isWebAdmin ? 7 : 6}>
                    No se encontraron egresos para este filtro.
                  </td>
                </tr>
              )}
            </tbody>

            {filteredData?.length ? (
              <tfoot>
                <tr className="border-t border-zinc-800 bg-zinc-900/60">
                  <td className="px-3 sm:px-4 py-3 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                    Total filtrado
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right font-mono font-semibold text-rose-400">
                    -${fmtMoney(totalVisible)}
                  </td>
                  <td colSpan={isWebAdmin ? 5 : 4} />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>

      {/* ===== Vista MOBILE ===== */}
      <div className="md:hidden">
        {isLoading ? (
          <ul className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={`sk-m-${i}`} className="bg-zinc-950/70 border border-zinc-900 rounded-2xl px-3 py-2.5 flex gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-zinc-800 rounded" />
                  <div className="h-3 w-20 bg-zinc-800 rounded" />
                </div>
              </li>
            ))}
          </ul>
        ) : filteredData?.length ? (
          <>
            <ul className="space-y-3">
              {filteredData.map((egreso) => (
                <li
                  key={egreso.id}
                  className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xl font-black text-rose-400 tracking-tight">
                      -${fmtMoney(egreso.monto)}
                    </span>
                    <div className="flex flex-col items-end gap-1.5">
                      {renderFormaPago(egreso.forma_pago)}
                      <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                        {egreso.categoria || "S/C"}
                      </span>
                    </div>
                  </div>

                  <div>
                    {/* 🚀 APLICAMOS EL NUEVO FORMATO DE DESCRIPCIÓN CON ENLACE EN MÓVILES */}
                    {renderDescripcion(egreso.descripcion)}

                    {isWebAdmin && egreso.oficina_nombre && (
                      <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1 font-semibold uppercase tracking-wider">
                        <HiOfficeBuilding /> {egreso.oficina_nombre}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
                        <HiClock className="text-zinc-600"/> 
                        {egreso.fecha ? dayjs(egreso.fecha).format("DD/MM/YY") : "—"}
                        {egreso.created_at && ` - ${dayjs(egreso.created_at).format("HH:mm")} hs`}
                      </span>
                      {/* 🚀 AUMENTO DE TAMAÑO AL USUARIO EN MOBILE */}
                      <span className="text-[12px] text-zinc-200 flex items-center gap-1 mt-0.5 font-semibold">
                        <HiUser className="text-zinc-400" /> Por: {egreso.usuario_nombre || "Sistema"}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 relative z-20">
                      {isWebAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEgresoAEditar(egreso)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 hover:bg-rose-600 hover:text-white transition"
                          >
                            <HiPencil className="text-[12px]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(egreso)}
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

            <div className="mt-4 bg-rose-900/20 border border-rose-800/30 rounded-2xl px-4 py-4 flex items-center justify-between shadow-sm">
              <span className="font-bold text-zinc-300 uppercase text-xs tracking-widest">
                Total Filtrado
              </span>
              <span className="font-black text-rose-400 text-xl tracking-tight">
                ${fmtMoney(totalVisible)}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-3 text-sm text-zinc-500 text-center py-10 bg-zinc-950/50 rounded-2xl border border-dashed border-zinc-800">
            No se encontraron egresos.
          </div>
        )}
      </div>

      {!Array.isArray(egresosProp) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 text-xs sm:text-sm bg-zinc-950 p-2 rounded-xl border border-zinc-900">
          <button
            type="button"
            onClick={() => previous && setPage(Math.max(1, page - 1))}
            disabled={!previous}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              previous ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700" : "bg-zinc-900 text-zinc-600 cursor-not-allowed"
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
              next ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700" : "bg-zinc-900 text-zinc-600 cursor-not-allowed"
            }`}
          >
            Siguiente
          </button>
        </div>
      )}

      {egresoAEditar && isWebAdmin ? (
        <EgresoEditModal
          isOpen={!!egresoAEditar}
          egreso={egresoAEditar}
          onClose={() => setEgresoAEditar(null)}
        />
      ) : null}

      {/* Modal confirmación borrado */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">¿Eliminar egreso?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                <span className="font-mono text-rose-400">-${fmtMoney(confirmDelete.monto)}</span>
                {" — "}{confirmDelete.descripcion || "Sin descripción"}
              </p>
              <p className="text-xs text-zinc-600 mt-1">Esta acción afectará el balance. No se puede deshacer.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="h-9 px-4 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeDelete}
                className="h-9 px-4 rounded-lg bg-rose-700 hover:bg-rose-600 border border-rose-600 text-white text-sm font-medium transition-colors"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EgresoTable;