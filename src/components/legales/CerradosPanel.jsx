// src/components/legales/CerradosPanel.jsx
//
// 📁 Casos cerrados y desistidos (de a 50, los más nuevos primero).
// Se pueden abrir para ver toda su historia.
// 🆕 09/10: misma tabla que el Tablero (TablaDuo): fila entera clickeable,
//    orden por columna y, en el celu, renglones compactos.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import useDatosVivos from "../../hooks/useDatosVivos";
import { useLegales } from "./legalesContext";
import { listarCerrados, mensajeError } from "../../services/legales";
import { Cargando, Punto } from "../gestoria/Piezas";
import { AvatarAbogado, EstadoPill } from "./PiezasLegales";
import TablaDuo, { BarraTabla, BuscadorTabla } from "../ui/TablaDuo";
import { colorOficina, ddmm } from "./legalesUtils";

export default function CerradosPanel() {
  const { esAbogado } = useLegales();
  const navigate = useNavigate();
  const [pagina, setPagina] = useState(1);
  const [q, setQ] = useState("");
  const [buscado, setBuscado] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setData(await listarCerrados(pagina, buscado ? { q: buscado } : {}));
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron traer los casos cerrados."));
    }
  }, [pagina, buscado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useDatosVivos(["legales"], () => cargar());

  const total = data?.count || 0;
  const paginas = Math.max(1, Math.ceil(total / 50));

  const columnas = useMemo(
    () => [
      {
        key: "caso",
        header: "Caso",
        sortValue: (e) => e.persona_nombre || "",
        render: (e) => (
          <span className="flex flex-col gap-0.5 min-w-0 max-w-[320px]">
            <span className="text-[14px] font-semibold text-titulo dark:text-titulo-dark truncate">{e.persona_nombre}</span>
            <span className="text-[12px] text-suave dark:text-suave-dark truncate">
              {e.numero} · {e.motivo_titulo || e.tema_nombre}
            </span>
          </span>
        ),
      },
      {
        key: "estado",
        header: "Estado",
        sortValue: (e) => e.estado || "",
        render: (e) => <EstadoPill estado={e.estado} chico />,
      },
      {
        key: "abogado",
        header: "Abogado",
        sortValue: (e) => e.abogado_nombre || "",
        render: (e) => (
          <span className="inline-flex items-center gap-2 min-w-0">
            <AvatarAbogado id={e.abogado} nombre={e.abogado_nombre} foto={e.abogado_foto} size={24} />
            <span className="truncate max-w-[160px]">{e.abogado_nombre || "Sin abogado"}</span>
          </span>
        ),
      },
      {
        key: "oficina",
        header: "Oficina",
        desde: "lg",
        sortValue: (e) => e.oficina_nombre || "",
        render: (e) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Punto color={colorOficina(e.oficina)} />
            {e.oficina_nombre || "—"}
          </span>
        ),
      },
      {
        key: "desde",
        header: "Desde",
        align: "right",
        primeroDesc: true,
        sortValue: (e) => e.estado_desde || "",
        render: (e) => <span className="whitespace-nowrap">{ddmm(e.estado_desde)}</span>,
      },
    ],
    []
  );

  const filaCelu = (e) => (
    <span className="flex-1 min-w-0 flex flex-col gap-1">
      <span className="flex items-center justify-between gap-2">
        <strong className="truncate text-[14px] text-titulo dark:text-titulo-dark">{e.persona_nombre}</strong>
        <span className="shrink-0 text-[12px] text-suave dark:text-suave-dark">{ddmm(e.estado_desde)}</span>
      </span>
      <span className="truncate text-[12px] text-suave dark:text-suave-dark">
        {e.motivo_titulo || e.tema_nombre} · {e.numero} · {e.abogado_nombre || "sin abogado"}
      </span>
      <span>
        <EstadoPill estado={e.estado} chico />
      </span>
    </span>
  );

  return (
    <div className="flex flex-col gap-3">
      {esAbogado && (
        <button type="button" onClick={() => navigate("/legales")} className="self-start text-[14px] font-semibold text-sky-700 dark:text-sky-400">
          ← Mis casos
        </button>
      )}
      <h2 className="text-[16px] font-bold text-titulo dark:text-titulo-dark">Cerrados y desistidos{data ? ` · ${total}` : ""}</h2>
      {error && <p className="text-[13px] font-semibold text-duo-rojo">{error}</p>}

      <section className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-sm overflow-hidden">
        <BarraTabla
          buscador={
            <BuscadorTabla
              value={q}
              onChange={setQ}
              placeholder="Buscar nombre, DNI o N° de caso (Enter)"
              onSubmit={() => {
                setPagina(1);
                setBuscado(q.trim());
              }}
            />
          }
        />
        {!data ? (
          <div className="p-3">
            <Cargando alto="h-48" />
          </div>
        ) : (
          <TablaDuo
            bare
            columns={columnas}
            rows={data.results || []}
            rowHref={(e) => `/legales/${e.id}`}
            rowLabel={(e) => `Abrir ${e.numero}, ${e.persona_nombre || ""}`}
            mobileRow={filaCelu}
            emptyText={buscado ? `No hay casos cerrados con «${buscado}».` : "Todavía no hay casos cerrados."}
          />
        )}
      </section>

      {paginas > 1 && (
        <div className="flex items-center justify-center gap-3 text-[14px]">
          <button
            type="button"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => p - 1)}
            className="rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 font-semibold text-titulo dark:text-titulo-dark disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-suave dark:text-suave-dark">
            Página {pagina} de {paginas}
          </span>
          <button
            type="button"
            disabled={pagina >= paginas}
            onClick={() => setPagina((p) => p + 1)}
            className="rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 font-semibold text-titulo dark:text-titulo-dark disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
