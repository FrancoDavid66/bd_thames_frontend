// src/components/gestoria/EntregadosPanel.jsx
//
// ✅ Entregados y cancelados (los trámites cerrados), del más nuevo al más viejo.
// El admin ve además el precio de la gestoría y la comisión (cobrada o pendiente),
// solo con las comisiones prendidas (🎚️ hoy apagadas).
// 🆕 09/10: misma tabla que el Tablero (TablaDuo): fila entera clickeable,
//    orden por columna y, en el celu, renglones compactos.
import { useCallback, useEffect, useMemo, useState } from "react";

import useDatosVivos from "../../hooks/useDatosVivos";
import { useGestoria } from "./gestoriaContext";
import { listarCerrados, mensajeError } from "../../services/gestoria";
import { Avatar, Candado, Cargando, Punto } from "./Piezas";
import TablaDuo, { MarcaTabla } from "../ui/TablaDuo";
import { colorOficina, ddmm, diasEntre, plata, tipoCorto } from "./gestoriaUtils";

const cierreDe = (t) => t.entregado_en || t.cancelado_en || "";
const tardo = (t) => (t.listo_en ? diasEntre(t.creado_en, t.listo_en) : null);

export default function EntregadosPanel() {
  const { esAdmin } = useGestoria();
  const [filas, setFilas] = useState(null);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async (hasta = 1) => {
    setCargando(true);
    try {
      let todas = [];
      let r = null;
      for (let p = 1; p <= hasta; p += 1) {
        r = await listarCerrados(p);
        todas = todas.concat(r.results || []);
        if (!r.next) break;
      }
      setFilas(todas);
      setTotal(r?.count || 0);
      setHayMas(!!r?.next);
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar la lista."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar(1);
  }, [cargar]);
  useDatosVivos(["gestoria"], () => cargar(pagina), { cadaMs: 30000 });

  // 🎚️ Precio y comisión: solo si el servidor los mandó (con las comisiones apagadas, no).
  const conPlata = esAdmin && (filas || []).some((t) => t.ve_plata);

  const columnas = useMemo(
    () => [
      {
        key: "tramite",
        header: "Trámite",
        sortValue: (t) => tipoCorto(t),
        render: (t) => (
          <span className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-semibold text-titulo dark:text-titulo-dark truncate max-w-[240px]">{tipoCorto(t)}</span>
            <span className="text-[12px] text-suave dark:text-suave-dark">
              {t.numero}
              {t.con_vehiculo === false ? null : t.patente ? (
                <>
                  {" · "}
                  <span className="font-mono font-bold text-titulo dark:text-titulo-dark">{t.patente}</span>
                </>
              ) : (
                " · sin patente"
              )}
            </span>
          </span>
        ),
      },
      {
        key: "cliente",
        header: "Cliente",
        sortValue: (t) => t.persona_nombre || "",
        render: (t) => <span className="block truncate max-w-[220px]">{t.persona_nombre || "—"}</span>,
      },
      {
        key: "oficina",
        header: "Oficina",
        desde: "lg",
        sortValue: (t) => t.oficina_nombre || "",
        render: (t) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Punto color={colorOficina(t.oficina)} />
            {t.oficina_nombre || "—"}
          </span>
        ),
      },
      {
        key: "gestor",
        header: "Gestor",
        sortValue: (t) => t.gestor_nombre || "",
        render: (t) => (
          <span className="inline-flex items-center gap-2 min-w-0">
            <Avatar id={t.gestor} nombre={t.gestor_nombre} foto={t.gestor_foto} size={24} />
            <span className="truncate max-w-[160px]">{t.gestor_nombre || "—"}</span>
          </span>
        ),
      },
      {
        key: "tardo",
        header: "Tardó",
        align: "right",
        sortValue: (t) => tardo(t),
        render: (t) => <span className="whitespace-nowrap">{tardo(t) === null ? "—" : `${tardo(t)} días`}</span>,
      },
      conPlata && {
        key: "precio",
        header: (
          <span className="inline-flex items-center gap-1">
            Precio (gestoría) <Candado texto={false} />
          </span>
        ),
        align: "right",
        sortValue: (t) => (t.precio_gestoria == null ? "" : Number(t.precio_gestoria)),
        render: (t) => <span className="whitespace-nowrap">{t.precio_gestoria == null ? "—" : plata(t.precio_gestoria)}</span>,
      },
      conPlata && {
        key: "comision",
        header: "Comisión",
        align: "right",
        sortValue: (t) => (Number(t.comision) > 0 ? Number(t.comision) : ""),
        render: (t) =>
          Number(t.comision) > 0 ? (
            <span className="inline-flex flex-col items-end">
              <b className="whitespace-nowrap">{plata(t.comision)}</b>
              {t.comision_cobrada ? <MarcaTabla tono="verde">cobrada</MarcaTabla> : <MarcaTabla tono="ambar">pendiente</MarcaTabla>}
            </span>
          ) : (
            <span className="text-suave dark:text-suave-dark">—</span>
          ),
      },
      {
        key: "cierre",
        header: "Cerrado",
        align: "right",
        primeroDesc: true,
        sortValue: (t) => cierreDe(t),
        render: (t) => (
          <span className="inline-flex flex-col items-end">
            <span className="whitespace-nowrap font-medium">{ddmm(cierreDe(t))}</span>
            {t.estado === "CANCELADO" ? <MarcaTabla tono="rojo">Cancelado</MarcaTabla> : <span className="text-[12px] text-suave dark:text-suave-dark">Entregado</span>}
          </span>
        ),
      },
    ],
    [conPlata]
  );

  const filaCelu = (t) => (
    <span className="flex-1 min-w-0 flex flex-col gap-1">
      <span className="flex items-center justify-between gap-2">
        <strong className="truncate text-[14px] text-titulo dark:text-titulo-dark">{t.persona_nombre || "—"}</strong>
        <span className="shrink-0 text-[12px] font-medium text-suave dark:text-suave-dark">{ddmm(cierreDe(t))}</span>
      </span>
      <span className="truncate text-[12px] text-suave dark:text-suave-dark">
        {tipoCorto(t)}
        {t.con_vehiculo !== false && t.patente ? (
          <>
            {" · "}
            <span className="font-mono font-bold text-titulo dark:text-titulo-dark">{t.patente}</span>
          </>
        ) : null}
      </span>
      <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-suave dark:text-suave-dark">
        {t.estado === "CANCELADO" ? <MarcaTabla tono="rojo">Cancelado</MarcaTabla> : <MarcaTabla tono="verde">Entregado</MarcaTabla>}
        {t.gestor_nombre ? t.gestor_nombre.split(" ")[0] : ""}
        {tardo(t) !== null ? ` · tardó ${tardo(t)} días` : ""}
      </span>
    </span>
  );

  if (error && !filas) return <p className="rounded-xl border border-duo-rojo/40 p-4 text-[14px] text-duo-rojo">{error}</p>;
  if (!filas) return <Cargando alto="h-72" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-titulo dark:text-titulo-dark">Entregados y cancelados</h2>
        <span className="text-[13px] text-suave dark:text-suave-dark">{total} trámites cerrados. Tocá uno para ver su historial.</span>
      </div>
      <TablaDuo
        columns={columnas}
        rows={filas}
        rowHref={(t) => `/gestoria/tramite/${t.id}`}
        rowLabel={(t) => `Abrir ${t.numero}`}
        mobileRow={filaCelu}
        emptyText="Todavía no hay trámites cerrados."
      />
      {hayMas && (
        <button
          type="button"
          disabled={cargando}
          onClick={() => {
            const p = pagina + 1;
            setPagina(p);
            cargar(p);
          }}
          className="self-center rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-2 text-[13px] font-semibold text-titulo dark:text-titulo-dark disabled:opacity-50"
        >
          {cargando ? "Cargando…" : "Ver más"}
        </button>
      )}
    </div>
  );
}
