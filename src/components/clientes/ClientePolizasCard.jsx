// src/components/clientes/ClientePolizasCard.jsx
import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  HiCollection,
  HiArrowRight,
  HiShieldCheck,
  HiOutlineDocumentSearch
} from "react-icons/hi";

import CardDuo from "../ui/CardDuo";

// Helpers puros: viven en module scope para no recrearse en cada render.
const fmt = (v) => (v === 0 || v ? String(v) : "—");
const upper = (v) => (v ? String(v).toUpperCase() : "—");

const ClientePolizasCard = ({ cliente }) => {
  // 🚀 Ordenamos: la póliza MÁS NUEVA primero. Criterio: fecha de emisión más reciente;
  // si dos comparten fecha, gana la de mayor ID (la que se creó después).
  const polizas = useMemo(() => {
    return [...(cliente?.polizas || [])].sort((a, b) => {
      const fa = a?.fecha_emision ? new Date(a.fecha_emision).getTime() : 0;
      const fb = b?.fecha_emision ? new Date(b.fecha_emision).getTime() : 0;
      if (fb !== fa) return fb - fa;
      return (Number(b?.id) || 0) - (Number(a?.id) || 0);
    });
  }, [cliente?.polizas]);

  return (
    <CardDuo
      as={motion.section}
      className="overflow-hidden mt-2"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
    >
      <div className="flex flex-col h-full">
        {/* Header General */}
        <div className="px-5 py-5 border-b border-linea dark:border-linea-dark flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] flex items-center justify-center text-duo-azul shrink-0">
            <HiCollection className="text-2xl" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-titulo dark:text-titulo-dark truncate leading-none mb-1">
              Pólizas del Cliente
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-suave dark:text-suave-dark truncate">
                Seguros asociados a este perfil
              </span>
              {polizas.length > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul text-[11px] font-medium">
                  {polizas.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contenido / Listado */}
        <div className="p-4 sm:p-5 flex-1">
          {polizas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-linea dark:border-linea-dark rounded-xl bg-surface dark:bg-surface-dark">
              <HiOutlineDocumentSearch className="text-4xl text-suave dark:text-suave-dark mb-3" />
              <p className="text-sm font-medium text-titulo dark:text-titulo-dark">Sin pólizas vigentes</p>
              <p className="text-xs text-suave dark:text-suave-dark mt-1 max-w-xs">
                Este cliente no tiene ningún seguro registrado en el sistema.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {polizas.map((p, idx) => {
                const titulo = `${fmt(p.compania)} · ${fmt(p.numero_poliza || "S/N")}`;
                const esMasReciente = idx === 0 && polizas.length > 1;
                const estado = p.estado && typeof p.estado === "string" ? p.estado.toLowerCase() : p.estado;

                const estadoClass = estado === "activa"
                  ? "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde"
                  : estado === "vencida"
                  ? "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo"
                  : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border border-linea dark:border-linea-dark";

                return (
                  <li
                    key={p.id}
                    className="rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-4 flex flex-col gap-4"
                  >
                    {/* Header de la Póliza */}
                    <div className="flex items-start justify-between gap-3 border-b border-linea dark:border-linea-dark pb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                           <HiShieldCheck className="text-duo-azul text-base shrink-0" />
                           <p className="text-sm font-medium text-titulo dark:text-titulo-dark truncate leading-none">
                             {titulo}
                           </p>
                        </div>
                        {p.producto && (
                          <p className="text-[11px] text-suave dark:text-suave-dark truncate ml-5">
                            {fmt(p.producto)}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        {esMasReciente && (
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul">
                            Más reciente
                          </span>
                        )}
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium ${estadoClass}`}>
                          {fmt(p.estado)}
                        </span>
                      </div>
                    </div>

                    {/* Datos del vehículo (Grid responsiva) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-suave dark:text-suave-dark">Vehículo</span>
                        <span className="font-medium text-titulo dark:text-titulo-dark truncate">{fmt(p.marca)}</span>
                      </div>
                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-suave dark:text-suave-dark">Modelo</span>
                        <span className="font-medium text-titulo dark:text-titulo-dark truncate">{fmt(p.modelo)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-suave dark:text-suave-dark">Año</span>
                        <span className="font-medium text-titulo dark:text-titulo-dark">{fmt(p.anio)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-suave dark:text-suave-dark">Patente</span>
                        <span className="font-mono font-semibold text-duo-azul">{upper(p.patente)}</span>
                      </div>

                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-4 pt-1">
                        <span className="text-[10px] text-suave dark:text-suave-dark">Cobertura</span>
                        <span className="text-suave dark:text-suave-dark truncate">{fmt(p.cobertura)}</span>
                      </div>
                    </div>

                    {/* Acción / Footer de la tarjeta */}
                    <div className="pt-3 border-t border-linea dark:border-linea-dark mt-auto">
                      <Link
                        to={`/polizas/${p.id}`}
                        className="w-full h-11 rounded-lg cursor-pointer bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark text-[12px] font-medium border border-linea dark:border-linea-dark hover:border-duo-azul transition-colors flex items-center justify-center gap-2"
                      >
                        Ver Detalle de Póliza <HiArrowRight />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </CardDuo>
  );
};

export default memo(ClientePolizasCard);
