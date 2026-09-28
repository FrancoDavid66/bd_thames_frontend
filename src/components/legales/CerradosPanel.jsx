// src/components/legales/CerradosPanel.jsx
//
// 📁 Casos cerrados y desistidos (de a 50, los más nuevos primero).
// Se pueden abrir para ver toda su historia.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiChevronRight, HiSearch } from "react-icons/hi";

import useDatosVivos from "../../hooks/useDatosVivos";
import { useLegales } from "./legalesContext";
import { listarCerrados, mensajeError } from "../../services/legales";
import { Cargando } from "../gestoria/Piezas";
import { AvatarAbogado, EstadoPill } from "./PiezasLegales";
import { ddmm } from "./legalesUtils";

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

  return (
    <div className="flex flex-col gap-3">
      {esAbogado && (
        <button type="button" onClick={() => navigate("/legales")} className="self-start text-[14px] font-semibold text-sky-700 dark:text-sky-400">
          ← Mis casos
        </button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-bold text-titulo dark:text-titulo-dark">Cerrados y desistidos{data ? ` · ${total}` : ""}</h2>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            setPagina(1);
            setBuscado(q.trim());
          }}
          className="relative w-full sm:w-auto sm:min-w-[280px]"
        >
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark pointer-events-none" />
          <input
            type="search"
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
            placeholder="Buscar nombre, DNI o N° de caso"
            className="w-full h-10 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark pl-9 pr-3 text-[14px] text-titulo dark:text-titulo-dark outline-none focus:border-sky-600"
          />
        </form>
      </div>
      {error && <p className="text-[13px] font-semibold text-duo-rojo">{error}</p>}
      {!data ? (
        <Cargando alto="h-48" />
      ) : !data.results?.length ? (
        <p className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5 text-[14px] text-suave dark:text-suave-dark">
          {buscado ? `No hay casos cerrados con «${buscado}».` : "Todavía no hay casos cerrados."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-linea dark:divide-linea-dark rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
          {data.results.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => navigate(`/legales/${e.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface dark:hover:bg-surface-dark">
                <AvatarAbogado id={e.abogado} nombre={e.abogado_nombre} foto={e.abogado_foto} size={32} />
                <span className="flex-1 min-w-0">
                  <strong className="block truncate text-[14px] text-titulo dark:text-titulo-dark">{e.persona_nombre}</strong>
                  <span className="block truncate text-[12px] text-suave dark:text-suave-dark">
                    {e.motivo_titulo || e.tema_nombre} · {e.numero} · {e.abogado_nombre || "sin abogado"} · {e.oficina_nombre || "—"}
                  </span>
                </span>
                <span className="hidden sm:flex flex-col items-end gap-1">
                  <EstadoPill estado={e.estado} chico />
                  <span className="text-[11px] text-suave dark:text-suave-dark">desde {ddmm(e.estado_desde)}</span>
                </span>
                <HiChevronRight className="w-5 h-5 text-suave dark:text-suave-dark" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {paginas > 1 && (
        <div className="flex items-center justify-center gap-3 text-[14px]">
          <button type="button" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} className="rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 font-semibold disabled:opacity-40">
            Anterior
          </button>
          <span className="text-suave dark:text-suave-dark">
            Página {pagina} de {paginas}
          </span>
          <button type="button" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)} className="rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 font-semibold disabled:opacity-40">
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
