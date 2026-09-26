// src/pages/ClientesPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { HiShieldCheck, HiRefresh, HiUserAdd, HiSearch, HiCheckCircle, HiExclamation, HiUsers } from "react-icons/hi";
import toast from "react-hot-toast";

// 🚀 SEGURIDAD Y COMPONENTES GLOBALES
import { useAuth } from "../context/AuthContext";
import ClienteFormModal from "../components/clientes/ClienteFormModal"; // ✅ Modal unificado (alta/edición)
import ClientesTable from "../components/clientes/ClientesTable";
import ConfirmModal from "../components/comunes/ConfirmModal";
import Boton3D from "../components/ui/Boton3D";
import CardDuo from "../components/ui/CardDuo";
import PageContainer from "../components/ui/PageContainer";
import { lanzarConfetti } from "../utils/confetti"; // celebración al crear
import useDatosVivos from "../hooks/useDatosVivos";

import {
  fetchClientes,
  deleteCliente,
  setSearch,
  setEstado,
  setPage,
  setPageSize,
  setOrdering,
} from "../store/slices/clientesSlice";

// Chips de estado (fuera del componente: no se recrean por render)
const FILTROS_ESTADO = [
  { value: "todos", label: "Todos" },
  { value: "activos", label: "Con pólizas" },
  { value: "inactivos", label: "Sin pólizas" },
];

// Mini-tarjeta de estadística
const StatCard = React.memo(function StatCard({ icon: Icon, num, label, tono }) {
  return (
    <CardDuo className="p-3.5 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${tono}`}>
        <Icon />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-semibold leading-none text-titulo dark:text-titulo-dark">{num}</div>
        <div className="text-[12px] text-suave dark:text-suave-dark truncate">{label}</div>
      </div>
    </CardDuo>
  );
});

const ClientesPage = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();

  // 🛡️ Permisos admin
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const {
    clientes = [],
    count = 0,
    status,
    error,
    search = "",
    estado = "todos",
    page = 1,
    pageSize = 25,
    ordering = "-id",
  } = useSelector((s) => s.clientes);

  const total = Number.isFinite(count) ? count : 0;

  const [clienteAEliminar, setClienteAEliminar] = useState(null);
  const [clienteCrearAbierto, setClienteCrearAbierto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState(search); // buscador local con debounce

  useEffect(() => {
    const promise = dispatch(fetchClientes({ page, page_size: pageSize, search, estado, ordering }));
    return () => { if (promise?.abort) promise.abort(); };
  }, [dispatch, page, pageSize, search, estado, ordering]);

  // Debounce del buscador (300ms) → despacha setSearch
  useEffect(() => {
    const t = setTimeout(() => { dispatch(setSearch(busqueda.trim().toLowerCase())); }, 300);
    return () => clearTimeout(t);
  }, [busqueda, dispatch]);

  const handleEstado = useCallback((nuevo) => { dispatch(setEstado(nuevo || "todos")); }, [dispatch]);
  const handlePageChange = useCallback((p) => { dispatch(setPage(p)); }, [dispatch]);
  const handlePageSizeChange = useCallback((ps) => { dispatch(setPageSize(ps)); }, [dispatch]);
  // force: true → vuelve a pedir aunque sea la misma página (antes el botón
  // "Actualizar" no hacía nada: el pedido se salteaba por ser igual al anterior).
  const handleRefresh = useCallback(() => {
    return dispatch(fetchClientes({ page, page_size: pageSize, search, estado, ordering, force: true }));
  }, [dispatch, page, pageSize, search, estado, ordering]);

  // 📡 EN VIVO: un cliente nuevo (o una póliza nueva) de otra oficina aparece solo.
  //    silencioso: si esa recarga falla, queda la lista que se veía (sin cartel).
  const recargandoVivo = useDatosVivos(["clientes", "polizas"], () =>
    dispatch(fetchClientes({ page, page_size: pageSize, search, estado, ordering, force: true, silencioso: true }))
  );
  const cargandoVisible = status === "loading" && !recargandoVivo;

  // KPIs rápidos (de la página actual — sin queries extra)
  const stats = useMemo(() => {
    let completos = 0, incompletos = 0, polizas = 0;
    for (const c of clientes) {
      const est = String(c?.estado ?? "").toLowerCase();
      if (est.includes("completo")) completos++;
      else if (est.includes("borrador") || est.includes("incompleto")) incompletos++;
      if (Array.isArray(c?.polizas)) polizas += c.polizas.filter((p) => p?.estado === "activa").length;
      else if (Number.isFinite(c?.polizas_activas)) polizas += Number(c.polizas_activas);
    }
    return { completos, incompletos, polizas };
  }, [clientes]);

  const onConfirmDelete = async () => {
    if (!isWebAdmin) return toast.error("Permiso denegado");
    if (!clienteAEliminar?.id) return;
    try {
      setSaving(true);
      await dispatch(deleteCliente(clienteAEliminar.id)).unwrap();
      toast.success("Cliente eliminado");
      setClienteAEliminar(null);
      const maxPage = Math.max(1, Math.ceil((total - 1) / pageSize));
      if (page > maxPage) dispatch(setPage(maxPage));
    } catch (e) { toast.error("Error al borrar"); } finally { setSaving(false); }
  };

  // Al crear con éxito: confetti + refrescar
  const onClienteCreado = useCallback(() => {
    setClienteCrearAbierto(false);
    lanzarConfetti();
    handleRefresh();
  }, [handleRefresh]);

  return (
    <PageContainer className="overflow-x-hidden">
      <motion.div
        className="flex flex-col"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {/* ===== TOPBAR ===== */}
        <CardDuo className="p-4 sm:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-lg bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] flex items-center justify-center shrink-0">
              <HiUsers className="text-duo-violeta text-lg" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-[22px] font-semibold truncate text-titulo dark:text-titulo-dark">Clientes</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde px-2 py-0.5 rounded-full text-[11px] font-medium">
                  <HiShieldCheck className="text-sm" /> {user?.perfil?.oficina_nombre || "Soporte"}
                </span>
                <span className="text-[12px] text-suave dark:text-suave-dark">
                  {cargandoVisible ? "Sincronizando…" : `${total} registrados`}
                </span>
              </div>
            </div>
          </div>
          <Boton3D variant="violeta" onClick={() => setClienteCrearAbierto(true)} className="shrink-0">
            <HiUserAdd className="text-base" /> Nuevo cliente
          </Boton3D>
        </CardDuo>

        {/* ===== STATS ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard icon={HiUsers} num={total} label="Total" tono="bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta" />
          <StatCard icon={HiCheckCircle} num={stats.completos} label="Completos" tono="bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde" />
          <StatCard icon={HiExclamation} num={stats.incompletos} label="Incompletos" tono="bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo" />
          <StatCard icon={HiShieldCheck} num={stats.polizas} label="Pólizas" tono="bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul" />
        </div>

        {/* ===== BUSCADOR + CHIPS ===== */}
        <div className="flex flex-col lg:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark text-base" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, apellido, DNI o CUIT…"
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-card dark:bg-card-dark border border-linea dark:border-linea-dark text-[14px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-violeta transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {FILTROS_ESTADO.map((f) => {
              const on = estado === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => handleEstado(f.value)}
                  className={`px-3.5 py-2 rounded-md text-[13px] font-medium transition-colors border ${
                    on
                      ? "bg-duo-violeta text-white border-duo-violeta"
                      : "bg-card dark:bg-card-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark hover:border-duo-violeta"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== ORDEN + REFRESCAR ===== */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-[12px] text-suave dark:text-suave-dark mr-1">Ordenar:</span>
          <button
            onClick={() => dispatch(setOrdering("-id"))}
            className={`h-8 px-3 rounded-md text-[12px] font-medium transition-colors border ${
              ordering === "-id" ? "bg-duo-violeta text-white border-duo-violeta" : "bg-card dark:bg-card-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark"
            }`}
          >
            Nuevos
          </button>
          <button
            onClick={() => dispatch(setOrdering("apellido"))}
            className={`h-8 px-3 rounded-md text-[12px] font-medium transition-colors border ${
              ordering === "apellido" ? "bg-duo-violeta text-white border-duo-violeta" : "bg-card dark:bg-card-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark"
            }`}
          >
            A-Z
          </button>
          <button
            onClick={handleRefresh}
            className="h-8 px-3 rounded-md bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta border border-duo-violeta/30 hover:border-duo-violeta transition-colors flex items-center gap-1.5 ml-auto"
            title="Refrescar"
          >
            <HiRefresh className={cargandoVisible ? "animate-spin text-sm" : "text-sm"} />
            <span className="text-[12px] font-medium">Actualizar</span>
          </button>
        </div>

        {/* ===== TABLA / LISTA ===== */}
        <CardDuo className="flex-1 min-h-[400px] flex flex-col overflow-hidden relative p-0">
          {status === "loading" && clientes.length === 0 && (
            <div className="absolute inset-0 z-10 bg-card/70 dark:bg-card-dark/70 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="h-8 w-8 border-2 border-duo-violeta/30 border-t-duo-violeta rounded-full animate-spin mb-3" />
              <p className="text-suave dark:text-suave-dark text-[12px]">Sincronizando…</p>
            </div>
          )}

          {status === "failed" && (
            <div className="m-4 rounded-lg bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] border border-duo-rojo/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <HiExclamation className="text-duo-rojo text-xl shrink-0" />
                <div>
                  <p className="font-semibold text-[14px] text-titulo dark:text-titulo-dark">Ups, algo salió mal</p>
                  <p className="text-suave dark:text-suave-dark text-[12px] mt-0.5">{error || "Error de servidor."}</p>
                </div>
              </div>
              <Boton3D variant="rojo" size="sm" onClick={handleRefresh}>Reintentar</Boton3D>
            </div>
          )}

          {clientes.length > 0 && (
            <div className="flex-1 overflow-x-hidden flex flex-col">
              <ClientesTable
                clientes={clientes}
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                showFooter={true}
              />
              <div className="p-3 border-t border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-center">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-suave dark:text-suave-dark">
                  {isWebAdmin ? <><HiCheckCircle className="text-duo-verde" /> Modo administrador</> : "Base de datos protegida"}
                </span>
              </div>
            </div>
          )}

          {clientes.length === 0 && status !== "loading" && status !== "failed" && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <HiSearch className="text-suave dark:text-suave-dark text-3xl mb-3" />
              <p className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">No hay clientes para mostrar</p>
              <p className="text-[12px] text-suave dark:text-suave-dark mt-1">Probá cambiar los filtros o creá uno nuevo.</p>
            </div>
          )}
        </CardDuo>
      </motion.div>

      {/* MODAL DE ALTA (unificado — sin cliente = modo alta) */}
      <ClienteFormModal
        isOpen={clienteCrearAbierto}
        onClose={() => setClienteCrearAbierto(false)}
        onSuccess={onClienteCreado}
      />

      {/* MODAL ELIMINAR */}
      <ConfirmModal
        isOpen={!!clienteAEliminar}
        nombre={`${clienteAEliminar?.nombre ?? ""} ${clienteAEliminar?.apellido ?? ""}`.trim()}
        onClose={() => setClienteAEliminar(null)}
        onConfirm={onConfirmDelete}
        confirmDisabled={saving}
      />
    </PageContainer>
  );
};

export default ClientesPage;
