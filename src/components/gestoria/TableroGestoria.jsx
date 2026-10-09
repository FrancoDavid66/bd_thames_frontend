// src/components/gestoria/TableroGestoria.jsx
//
// 📋 Tablero de Gestoría: quién tiene cada trámite y cómo va.
//
// 🆕 09/10: TABLA (estilo Linear / Stripe) en vez de las tarjetas tipo Trello.
//   - Pestañas por estado con su número: Todos · Recibido · Asignado · En el
//     registro · Observado · Listo (la elegida queda al volver de un trámite).
//   - Barra: buscador, gestor, oficina (admin), tipo, "Solo demorados" y Limpiar.
//   - Cada fila es un trámite: tocás en cualquier lado y entrás a su ficha
//     (Ctrl o la rueda del mouse = en otra pestaña). Los títulos ordenan.
//   - Raya roja a la izquierda = demorado (7 días o más sin moverse).
//   - Celu: la misma lista en renglones compactos (sin tarjetas).
// "Sin precio" solo le llega al admin (el servidor no se lo manda a la oficina).
// Se actualiza solo (📡 en vivo) cuando otro cambia algo.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiChatAlt2, HiDocumentText, HiExclamation, HiUserAdd } from "react-icons/hi";

import useDatosVivos from "../../hooks/useDatosVivos";
import { useGestoria } from "./gestoriaContext";
import { listarAbiertos, mensajeError, pedirResumen } from "../../services/gestoria";
import { Avatar, Candado, Cargando, DiasChip, Punto, Tile } from "./Piezas";
import TablaDuo, {
  BarraTabla,
  BuscadorTabla,
  FranjaPestanas,
  LimpiarTabla,
  MarcaTabla,
  PestanasTabla,
  PildoraTabla,
  SelectTabla,
  ToggleTabla,
} from "../ui/TablaDuo";
import {
  ABIERTOS,
  DIAS_DEMORADO,
  ESTADOS,
  colorOficina,
  diasEnEstado,
  esDemorado,
  norm,
  plata,
  textoDias,
  tipoCorto,
} from "./gestoriaUtils";

const TODOS = "TODOS";

function PillEstado({ estado }) {
  const e = ESTADOS[estado] || { corto: estado, dot: "#94a3b8" };
  return <PildoraTabla color={e.dot}>{e.corto}</PildoraTabla>;
}

export default function TableroGestoria() {
  const { esAdmin, user, catalogo, gestores, filtros, setFiltros, tabCelu, setTabCelu } = useGestoria();
  const navigate = useNavigate();
  const [lista, setLista] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const [l, r] = await Promise.all([listarAbiertos(), pedirResumen()]);
      setLista(l);
      setResumen(r);
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar el tablero."));
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useDatosVivos(["gestoria"], () => cargar());

  const ab = useMemo(() => lista || [], [lista]);
  // 📲 LISTOS a los que nadie le avisó todavía (el WhatsApp se manda a mano desde la ficha).
  const sinAvisar = useMemo(() => ab.filter((t) => t.aviso_listo_pendiente).length, [ab]);

  // Todos los filtros MENOS la pestaña de estado (así cada pestaña muestra su número).
  const filtrada = useMemo(() => {
    const q = norm(filtros.q);
    return ab
      .filter((t) => {
        if (filtros.gestor === "sin" ? t.gestor : filtros.gestor !== "todos" && String(t.gestor) !== String(filtros.gestor)) return false;
        if (filtros.oficina !== "todas" && String(t.oficina) !== String(filtros.oficina)) return false;
        if (filtros.tipo !== "todos" && t.tipo !== filtros.tipo) return false;
        if (filtros.demorados && !esDemorado(t)) return false;
        if (q && !norm(`${t.patente} ${t.persona_nombre} ${t.persona_dni || ""} ${t.numero}`).includes(q)) return false;
        return true;
      })
      .sort((a, b) => diasEnEstado(b) - diasEnEstado(a));
  }, [ab, filtros]);

  // Gestores del desplegable: los activos + cualquiera que tenga trámites abiertos.
  const opcionesGestor = useMemo(() => {
    const vistos = new Map(gestores.map((g) => [String(g.id), g.nombre]));
    ab.forEach((t) => {
      if (t.gestor && !vistos.has(String(t.gestor))) vistos.set(String(t.gestor), t.gestor_nombre);
    });
    const cuenta = (id) => ab.filter((t) => (id === "todos" ? true : id === "sin" ? !t.gestor : String(t.gestor) === id)).length;
    return [["todos", "Todos"], ...vistos.entries(), ["sin", "Sin gestor"]].map(([id, nombre]) => [id, nombre, cuenta(id)]);
  }, [gestores, ab]);

  const set = (k, v) => setFiltros((f) => ({ ...f, [k]: v }));
  const hayFiltros = !!(filtros.q || filtros.gestor !== "todos" || filtros.oficina !== "todas" || filtros.tipo !== "todos" || filtros.demorados);
  const limpiar = () => setFiltros((f) => ({ ...f, gestor: "todos", oficina: "todas", tipo: "todos", q: "", demorados: false }));
  const miOficina = user?.perfil?.oficina_nombre || "";

  // Pestañas por estado (la de "Todos" primero).
  const pestanas = useMemo(
    () => [
      { id: TODOS, label: "Todos", n: filtrada.length },
      ...ABIERTOS.map((e) => ({ id: e, label: ESTADOS[e].corto, color: ESTADOS[e].dot, title: ESTADOS[e].n, n: filtrada.filter((t) => t.estado === e).length })),
    ],
    [filtrada]
  );
  const tab = pestanas.some((p) => p.id === tabCelu) ? tabCelu : TODOS;
  const visibles = tab === TODOS ? filtrada : filtrada.filter((t) => t.estado === tab);

  const columnas = useMemo(
    () => [
      {
        key: "tramite",
        header: "Trámite",
        sortValue: (t) => tipoCorto(t),
        render: (t) => (
          <span className="flex flex-col gap-1 min-w-0">
            <span className="text-[14px] font-semibold text-titulo dark:text-titulo-dark truncate max-w-[240px]">{tipoCorto(t) || "Trámite"}</span>
            <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-suave dark:text-suave-dark">
              {t.numero}
              {t.cargado_por_gestor && (
                <MarcaTabla tono="violeta" icono={HiUserAdd}>
                  Lo cargó el gestor
                </MarcaTabla>
              )}
              {t.sin_precio && <MarcaTabla tono="ambar">Sin precio</MarcaTabla>}
            </span>
          </span>
        ),
      },
      {
        key: "vehiculo",
        header: "Vehículo",
        sortValue: (t) => (t.con_vehiculo === false ? "" : t.patente || ""),
        render: (t) =>
          // 🪪 Trámites de la persona (licencia, con_vehiculo=false): sin auto.
          t.con_vehiculo === false ? (
            <span className="text-suave dark:text-suave-dark">—</span>
          ) : (
            <span className="flex flex-col min-w-0">
              {t.patente ? (
                <span className="font-mono text-[13px] font-bold tracking-wide text-titulo dark:text-titulo-dark whitespace-nowrap">{t.patente}</span>
              ) : (
                <span className="text-[13px] font-semibold text-suave dark:text-suave-dark">Sin patente</span>
              )}
              {t.vehiculo && <span className="text-[12px] text-suave dark:text-suave-dark truncate max-w-[200px]">{t.vehiculo}</span>}
            </span>
          ),
      },
      {
        key: "cliente",
        header: "Cliente",
        sortValue: (t) => t.persona_nombre || "",
        render: (t) => (
          <span className="flex flex-col min-w-0">
            <span className="truncate max-w-[220px] text-titulo dark:text-titulo-dark">{t.persona_nombre || "—"}</span>
            {t.persona_dni && <span className="text-[12px] text-suave dark:text-suave-dark">DNI {t.persona_dni}</span>}
          </span>
        ),
      },
      {
        key: "estado",
        header: "Estado",
        sortValue: (t) => ABIERTOS.indexOf(t.estado),
        render: (t) => (
          <span className="flex flex-col items-start gap-1">
            <PillEstado estado={t.estado} />
            {t.estado === "OBSERVADO" && t.falta && (
              <span className="max-w-[220px] truncate text-[12px] font-semibold text-orange-700 dark:text-orange-300" title={t.falta}>
                Falta: {t.falta}
              </span>
            )}
            {t.aviso_listo_pendiente && (
              <MarcaTabla tono="verde" icono={HiChatAlt2}>
                Avisar al cliente
              </MarcaTabla>
            )}
            {t.cliente_subio_papeles && (
              <MarcaTabla tono="azul" icono={HiDocumentText}>
                Cliente subió papeles
              </MarcaTabla>
            )}
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
            <span className={`truncate max-w-[160px] ${t.gestor_nombre ? "text-titulo dark:text-titulo-dark" : "italic text-suave dark:text-suave-dark"}`}>
              {t.gestor_nombre || "Sin gestor"}
            </span>
          </span>
        ),
      },
      // La oficina ve solo lo suyo: la columna le sobra.
      esAdmin && {
        key: "oficina",
        header: "Oficina",
        desde: "xl",
        sortValue: (t) => t.oficina_nombre || "",
        render: (t) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-titulo dark:text-titulo-dark">
            <Punto color={colorOficina(t.oficina)} />
            {t.oficina_nombre || "Sin oficina"}
          </span>
        ),
      },
      {
        key: "dias",
        header: "En este estado",
        align: "right",
        primeroDesc: true,
        sortValue: (t) => diasEnEstado(t),
        render: (t) => {
          const d = diasEnEstado(t);
          return <DiasChip dias={d} texto={textoDias(d)} />;
        },
      },
    ],
    [esAdmin]
  );

  // 📱 Renglón del celu.
  const filaCelu = (t) => {
    const d = diasEnEstado(t);
    return (
      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="flex items-center justify-between gap-2">
          <strong className="truncate text-[14px] text-titulo dark:text-titulo-dark">{t.persona_nombre || "Sin nombre"}</strong>
          <DiasChip dias={d} texto={textoDias(d)} />
        </span>
        <span className="truncate text-[12px] text-suave dark:text-suave-dark">
          {tipoCorto(t)}
          {t.con_vehiculo !== false && (
            <>
              {" · "}
              <span className="font-mono font-bold text-titulo dark:text-titulo-dark">{t.patente || "sin patente"}</span>
            </>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <PillEstado estado={t.estado} />
          <span className="text-[12px] text-suave dark:text-suave-dark">{t.gestor_nombre ? t.gestor_nombre.split(" ")[0] : "Sin gestor"}</span>
          {t.aviso_listo_pendiente && (
            <MarcaTabla tono="verde" icono={HiChatAlt2}>
              Avisar
            </MarcaTabla>
          )}
          {t.cliente_subio_papeles && (
            <MarcaTabla tono="azul" icono={HiDocumentText}>
              Papeles
            </MarcaTabla>
          )}
          {t.sin_precio && <MarcaTabla tono="ambar">Sin precio</MarcaTabla>}
        </span>
      </span>
    );
  };

  if (error && !lista) {
    return <p className="rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] p-4 text-[14px] text-duo-rojo">{error}</p>;
  }
  if (!lista || !resumen) {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Cargando key={i} alto="h-24" />
          ))}
        </div>
        <Cargando alto="h-64" />
      </div>
    );
  }

  const conPlata = esAdmin && resumen.comisiones_a_cobrar !== undefined; // 🎚️ el servidor no la manda con las comisiones apagadas
  const avisos = conPlata ? resumen.avisos_pago || [] : [];
  const quienes = [...new Set(avisos.map((a) => a.gestor_nombre))];
  const totalAvisos = avisos.reduce((a, x) => a + Number(x.monto || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-suave dark:text-suave-dark -mt-1">
        {esAdmin ? "Todas las oficinas." : `Los de la oficina ${miOficina}.`} Quién tiene cada uno y cómo va.
      </p>

      {avisos.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-duo-azul/40 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-4 py-3 text-[13px] text-duo-azul">
          <span className="inline-flex flex-wrap items-center gap-2">
            <HiDocumentText className="w-4 h-4" />
            <span>
              <strong>{quienes.join(" y ")}</strong> {quienes.length > 1 ? "subieron comprobantes" : "subió un comprobante"} de pago de comisiones ({plata(totalAvisos)}).
            </span>
            <Candado />
          </span>
          <button
            type="button"
            onClick={() => navigate("/gestoria/gestores")}
            className="rounded-lg border border-duo-azul/40 bg-card dark:bg-card-dark px-3 py-1.5 text-[13px] font-semibold text-duo-azul"
          >
            Revisar en Gestores
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile k="ABIERTOS" v={resumen.abiertos} n={`${resumen.sin_gestor} sin gestor asignado`} />
        <Tile
          k={
            <span className="inline-flex items-center gap-1">
              <HiExclamation className="w-3.5 h-3.5" /> DEMORADOS
            </span>
          }
          v={resumen.demorados}
          n={`${DIAS_DEMORADO} días o más sin moverse`}
          tono="rojo"
        />
        <Tile
          k="LISTOS PARA ENTREGAR"
          v={resumen.listos}
          n={
            !catalogo?.aviso_cliente
              ? "Esperando que los retiren"
              : catalogo?.whatsapp_auto
                ? "Al cliente le llega un WhatsApp"
                : sinAvisar
                  ? `${sinAvisar} sin avisar al cliente`
                  : "Se les avisa por WhatsApp desde la ficha"
          }
          tono="verde"
        />
        {conPlata ? (
          <Tile
            k="COMISIONES · 30 DÍAS"
            extra={<Candado />}
            v={plata(resumen.comisiones_cobradas_30d)}
            n={
              <>
                A cobrar: {plata(resumen.comisiones_a_cobrar)}
                {resumen.sin_precio ? <b className="text-duo-amarillo-sombra dark:text-duo-amarillo"> · {resumen.sin_precio} sin precio</b> : null}
              </>
            }
          />
        ) : (
          <Tile k="ENTREGADOS · 30 DÍAS" v={resumen.entregados_30d} n={esAdmin ? "Terminados de todas las oficinas" : `Terminados de la oficina ${miOficina}`} />
        )}
      </div>

      {/* Tabla con sus pestañas y filtros arriba (todo en una tarjeta) */}
      <section className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-sm overflow-hidden">
        <FranjaPestanas>
          <PestanasTabla items={pestanas} valor={tab} onCambiar={setTabCelu} ariaLabel="Estado del trámite" />
        </FranjaPestanas>
        <BarraTabla buscador={<BuscadorTabla value={filtros.q} onChange={(v) => set("q", v)} placeholder="Buscar patente, DNI o cliente" />}>
          <SelectTabla etiqueta="Gestor" value={filtros.gestor} onChange={(v) => set("gestor", v)}>
            {opcionesGestor.map(([id, nombre, n]) => (
              <option key={id} value={id}>
                {nombre} ({n})
              </option>
            ))}
          </SelectTabla>
          {esAdmin && (
            <SelectTabla etiqueta="Oficina" value={filtros.oficina} onChange={(v) => set("oficina", v)}>
              <option value="todas">Todas</option>
              {(catalogo?.oficinas || []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </SelectTabla>
          )}
          <SelectTabla etiqueta="Tipo" value={filtros.tipo} onChange={(v) => set("tipo", v)}>
            <option value="todos">Todos</option>
            {(catalogo?.tipos || []).map((tp) => (
              <option key={tp.id} value={tp.id}>
                {tp.corto}
              </option>
            ))}
          </SelectTabla>
          <ToggleTabla activo={filtros.demorados} onChange={(v) => set("demorados", v)}>
            <HiExclamation className="w-4 h-4" /> Solo demorados
          </ToggleTabla>
          {hayFiltros && <LimpiarTabla onClick={limpiar} />}
        </BarraTabla>
        <TablaDuo
          bare
          columns={columnas}
          rows={visibles}
          rowHref={(t) => `/gestoria/tramite/${t.id}`}
          rowLabel={(t) => `Abrir ${t.numero}${t.patente ? `, ${t.patente}` : ""}`}
          rowTone={(t) => (esDemorado(t) ? "rojo" : null)}
          mobileRow={filaCelu}
          vacio={
            <div className="flex flex-col items-center gap-2">
              <p className="text-[14px] font-medium text-suave dark:text-suave-dark">Nada con este filtro.</p>
              {(hayFiltros || tab !== TODOS) && (
                <button
                  type="button"
                  onClick={() => {
                    limpiar();
                    setTabCelu(TODOS);
                  }}
                  className="text-[13px] font-semibold text-duo-violeta hover:underline"
                >
                  Ver todos los trámites
                </button>
              )}
            </div>
          }
        />
      </section>
    </div>
  );
}
