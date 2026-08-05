// src/components/polizas/PolizaFilter.jsx
import React, { useEffect, useState } from "react";
import { HiSearch } from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { PolizasAPI } from "../../api/polizas";
import InputDuo from "../ui/InputDuo";
import SelectDuo from "../ui/SelectDuo";
import Boton3D from "../ui/Boton3D";

const LEGACY_COMPANIAS = [
  "Agrosalta", "ATM", "Equidad", "Federacion Patronal", "La Equidad", "NRE", "Providencia",
];

/**
 * 🔎 Filtro de pólizas — versión simplificada.
 *
 * - Usuario COMÚN (no admin): solo el buscador. Nada de filtros ni chips
 *   (el análisis de datos se hace en la app de Estadísticas).
 * - ADMIN: buscador + sucursal + aseguradora. Sin toggle Pólizas/Cuotas,
 *   sin chips de estado, sin filtros avanzados (mora/fechas).
 *
 * Nota: se mantienen todas las props en la firma para no romper la conexión
 * con PolizasPage, aunque ahora solo se usan las de buscador/sucursal/aseguradora.
 */
export default function PolizaFilter({
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
  onClearSearchApplied,
  searchApplied = "",
  totalFiltradas,
  oficinaActual = "ALL",
  onOficinaChange,
  companiaActual = "",
  onCompaniaChange,
  status = "idle",
}) {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN";

  const [oficinasList, setOficinasList] = useState([]);
  const [companiasList, setCompaniasList] = useState([]);

  const [localValue, setLocalValue] = useState(searchValue || "");
  useEffect(() => { setLocalValue(searchValue || ""); }, [searchValue]);
  useEffect(() => { onSearchChange?.(localValue); }, [localValue, onSearchChange]);

  useEffect(() => {
    api.get("companias/").then((res) => {
      const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
      const dinamicas = arr.filter((c) => c.activa).map((c) => c.nombre);
      const unificadas = Array.from(new Set([...LEGACY_COMPANIAS, ...dinamicas])).sort();
      setCompaniasList(unificadas);
    }).catch((e) => console.warn("Error cargando aseguradoras", e));

    if (isWebAdmin) {
      PolizasAPI.listOficinas().then((res) => {
        setOficinasList(Array.isArray(res) ? res : res.results || []);
      }).catch((e) => console.warn("Error cargando sucursales", e));
    }
  }, [isWebAdmin]);

  const isLoading = status === "loading";
  const clearSearch = () => setLocalValue("");

  return (
    <div className="space-y-3 rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3 shadow-[0_2px_0_var(--color-duo-linea)] dark:shadow-[0_2px_0_var(--color-linea-dark)] md:p-4">
      {/* ===== Buscador ===== */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <InputDuo
            type="search"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSearchSubmit?.(); } }}
            placeholder="Buscar póliza por patente, nombre o DNI..."
            icon={<HiSearch />}
          />
        </div>
        <Boton3D variant="azul" onClick={() => onSearchSubmit?.()} disabled={isLoading}>
          <HiSearch className="h-5 w-5" /> {isLoading ? "Buscando…" : "Buscar"}
        </Boton3D>
      </div>

      {/* ===== Selects (SOLO ADMIN): sucursal + aseguradora ===== */}
      {isWebAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          {onOficinaChange && (
            <SelectDuo
              value={oficinaActual}
              onChange={(e) => onOficinaChange(e.target.value)}
              className="min-w-[180px]"
            >
              <option value="ALL">Todas las sucursales</option>
              {oficinasList.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </SelectDuo>
          )}

          {onCompaniaChange !== undefined && (
            <SelectDuo
              value={companiaActual}
              onChange={(e) => onCompaniaChange(e.target.value)}
              className="min-w-[180px]"
            >
              <option value="">Todas las aseguradoras</option>
              {companiasList.map((c) => <option key={c} value={c}>{c}</option>)}
            </SelectDuo>
          )}
        </div>
      )}

      {/* ===== Fila de estado (búsqueda aplicada + resultados) ===== */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-suave dark:text-suave-dark md:text-xs">
        <span className="flex items-center gap-2 font-bold">
          <span>Sucursal: <strong className="uppercase text-duo-verde-sombra dark:text-duo-verde">{user?.perfil?.oficina_nombre || "Local"}</strong></span>
          {typeof totalFiltradas === "number" && (
            <>
              <span className="opacity-40">|</span>
              <span>{totalFiltradas} resultados</span>
            </>
          )}
        </span>
        <span className="flex items-center gap-2">
          {localValue && (
            <Boton3D variant="blanco" size="sm" onClick={clearSearch} disabled={isLoading}>Limpiar</Boton3D>
          )}
          {!!searchApplied && (
            <Boton3D variant="blanco" size="sm" onClick={() => onClearSearchApplied?.()} disabled={isLoading}>Quitar búsqueda</Boton3D>
          )}
        </span>
      </div>
    </div>
  );
}