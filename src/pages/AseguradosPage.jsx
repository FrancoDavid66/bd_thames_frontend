// src/pages/asegurados/AseguradosPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HiSearch, HiRefresh, HiPlus } from "react-icons/hi";
import debounce from "lodash.debounce";

import AseguradosTable from "../components/asegurados/AseguradosTable";
import { fetchAsegurados, setSearch, setPage, setPageSize, setOrdering } from "../store/slices/aseguradosSlice";

export default function AseguradosPage() {
  const dispatch = useDispatch();
  const { items, count, page, pageSize, search, ordering, status } = useSelector((s) => s.asegurados);

  useEffect(() => {
    dispatch(fetchAsegurados());
  }, [dispatch, page, pageSize, search, ordering]);

  const [localSearch, setLocalSearch] = useState(search || "");
  const debounced = useMemo(
    () =>
      debounce((val) => {
        dispatch(setSearch(val));
      }, 300),
    [dispatch]
  );

  const onSearchChange = (val) => {
    setLocalSearch(val);
    debounced(val);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4 bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark min-h-[100dvh]">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-[20px] font-semibold">Asegurados</h1>
        <div className="flex items-center gap-2">
          {/* Sprint 2 y 3: se conectarán */}
          <button className="inline-flex items-center gap-2 px-3 py-2 border border-linea dark:border-linea-dark rounded-lg text-[13px] font-medium text-suave dark:text-suave-dark hover:bg-card dark:hover:bg-card-dark transition-colors">
            <HiPlus /> Crear solicitud
          </button>
          <button className="inline-flex items-center gap-2 px-3 py-2 border border-linea dark:border-linea-dark rounded-lg text-[13px] font-medium text-suave dark:text-suave-dark hover:bg-card dark:hover:bg-card-dark transition-colors">
            <HiPlus /> Agregar cliente
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark" />
          <input
            value={localSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, apellido o DNI…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-[14px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-violeta transition-colors"
          />
        </div>
        <button
          className="inline-flex items-center gap-2 px-3 py-2 border border-linea dark:border-linea-dark rounded-lg text-[13px] font-medium text-suave dark:text-suave-dark hover:bg-card dark:hover:bg-card-dark transition-colors"
          onClick={() => dispatch(fetchAsegurados())}
          title="Refrescar"
        >
          <HiRefresh /> Refrescar
        </button>
      </div>

      <AseguradosTable
        rows={items}
        loading={status === "loading"}
        page={page}
        pageSize={pageSize}
        total={count}
        ordering={ordering}
        onSort={(ord) => dispatch(setOrdering(ord))}
        onPageChange={(p) => dispatch(setPage(p))}
        onPageSizeChange={(ps) => dispatch(setPageSize(ps))}
      />
    </div>
  );
}
