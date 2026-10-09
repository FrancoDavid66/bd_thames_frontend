// src/pages/SiniestrosPage.jsx  (responsive)
//
// 🚨 Página de Siniestros.
// Orquesta todo: lista + búsqueda + filtro por estado + wizard (alta/edición)
// + detalle + borrar. Es autónoma (no recibe props; la ruta la monta sola).
//
// 🆕 09/10: TABLA (estilo Linear / Stripe) en vez de las tarjetas.
//   - Una sola tarjeta: arriba las pestañas por estado CON SU NÚMERO
//     (Todos · Falta doc. · Denunciado · …), abajo el buscador y la tabla.
//   - Tocás una fila → se abre el detalle. Desde el detalle también podés
//     Editar o Eliminar (admin). En la fila quedan el lápiz y el tacho.
//   - Celu: renglones compactos (sin tarjetas).
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { HiPlus, HiExclamationCircle } from "react-icons/hi";
import { toast } from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import {
  getSiniestros,
  addSiniestro,
  editSiniestro,
  removeSiniestro,
  addFoto,
} from "../store/slices/siniestrosSlice";
import { invalidarCacheSiniestrosCliente } from "../hooks/useSiniestrosCliente";
import useDatosVivos from "../hooks/useDatosVivos";

import SiniestrosList, { ESTADO_CFG } from "../components/siniestros/SiniestrosList";
import SiniestrosDetails from "../components/siniestros/SiniestrosDetails";
import SiniestrosWizard from "../components/siniestros/SiniestrosWizard";
import ModalDuo from "../components/ui/ModalDuo";
import Boton3D from "../components/ui/Boton3D";
import Badge from "../components/ui/Badge";
import { BarraTabla, BuscadorTabla, FranjaPestanas, PestanasTabla } from "../components/ui/TablaDuo";

// Filtros por estado (pestañas). value === "" → todos.
const FILTROS = [
  { value: "",            label: "Todos"      },
  { value: "PENDIENTE",   label: "Falta doc." },
  { value: "DENUNCIADO",  label: "Denunciado" },
  { value: "INSPECCION",  label: "Inspección" },
  { value: "LIQUIDACION", label: "Liquidación"},
  { value: "CERRADO",     label: "Cerrado"    },
];
const TODOS = "TODOS";

// Sube las fotos borrador (del wizard) al siniestro recién creado.
// 🐛 FIX: devuelve CUÁNTAS fotos no se pudieron adjuntar (antes fallaban calladas).
async function subirFotosBorrador(dispatch, siniestroId, draftFotos) {
  if (!Array.isArray(draftFotos) || draftFotos.length === 0) return 0;
  if (!siniestroId) return draftFotos.length;
  let fallidas = 0;
  for (const f of draftFotos) {
    try {
      await dispatch(addFoto({
        siniestro_id: Number(siniestroId),
        url: f.url,
        public_id: f.public_id,
        nombre: f.nombre || "",
        mime: f.mime || "image/jpeg",
      })).unwrap();
    } catch {
      // Si una foto falla no cortamos el resto, pero la contamos.
      fallidas++;
    }
  }
  return fallidas;
}

export default function SiniestrosPage() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN" || !!user?.is_superuser;

  const { siniestros, loading } = useSelector((s) => s.siniestros);

  // UI state
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  // Modales
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editData, setEditData] = useState(null);      // siniestro a editar (o null = alta)
  const [verSiniestro, setVerSiniestro] = useState(null);
  const [borrarSiniestro, setBorrarSiniestro] = useState(null);
  const [borrando, setBorrando] = useState(false);

  useEffect(() => {
    dispatch(getSiniestros());
  }, [dispatch]);

  // 📡 EN VIVO: un siniestro cargado o actualizado en otra oficina aparece solo.
  useDatosVivos(["siniestros"], () => dispatch(getSiniestros()));

  // 1) Filtro por búsqueda (así cada pestaña muestra cuántos hay con esa búsqueda).
  const porBusqueda = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return siniestros || [];
    return (siniestros || []).filter((s) => {
      const campos = [
        s.cliente_label, s.poliza_label, s.patente, s.nro_reclamo_cia,
        s.marca_auto, s.modelo_auto, s.id ? `#${s.id}` : "",
      ].filter(Boolean).join(" ").toLowerCase();
      return campos.includes(q);
    });
  }, [siniestros, busqueda]);

  // 2) Filtro por estado (la pestaña elegida).
  const listaFiltrada = useMemo(
    () => (filtroEstado ? porBusqueda.filter((s) => s.estado === filtroEstado) : porBusqueda),
    [porBusqueda, filtroEstado]
  );

  const pestanas = useMemo(
    () =>
      FILTROS.map((f) => ({
        id: f.value || TODOS,
        label: f.label,
        color: f.value ? ESTADO_CFG[f.value]?.color : undefined,
        n: f.value ? porBusqueda.filter((s) => s.estado === f.value).length : porBusqueda.length,
      })),
    [porBusqueda]
  );

  const abiertos = useMemo(
    () => (siniestros || []).filter((s) => s.estado !== "CERRADO").length,
    [siniestros]
  );

  // ── Handlers ──────────────────────────────────────────
  const abrirAlta = () => { setEditData(null); setWizardOpen(true); };
  const abrirEdicion = (s) => { setEditData(s); setWizardOpen(true); };

  // El wizard llama esto con (payload, draftFotos)
  const handleGuardar = async (payload, draftFotos = []) => {
    if (editData?.id) {
      // Edición: no tocamos fotos borrador (se manejan desde el detalle).
      const actualizado = await dispatch(editSiniestro({ id: editData.id, siniestro: payload })).unwrap();
      invalidarCacheSiniestrosCliente(actualizado?.cliente ?? payload.cliente);
      toast.success("Siniestro actualizado");
    } else {
      // Alta: creamos y luego subimos las fotos borrador.
      const creado = await dispatch(addSiniestro(payload)).unwrap();
      const fallidas = await subirFotosBorrador(dispatch, creado?.id, draftFotos);
      invalidarCacheSiniestrosCliente(creado?.cliente ?? payload.cliente);
      if (fallidas > 0) {
        // El siniestro quedó guardado: avisamos que faltan fotos (antes no decía nada).
        toast.error(
          `El siniestro se guardó, pero ${fallidas} foto${fallidas > 1 ? "s" : ""} no se ${fallidas > 1 ? "pudieron" : "pudo"} adjuntar. Agregala${fallidas > 1 ? "s" : ""} desde "Ver detalle".`,
          { duration: 8000 }
        );
      } else {
        toast.success("Siniestro cargado");
      }
    }
    // El error se propaga y lo maneja el propio wizard (toast rojo).
  };

  const confirmarBorrado = async () => {
    if (!borrarSiniestro?.id || borrando) return;
    setBorrando(true);
    try {
      await dispatch(removeSiniestro(borrarSiniestro.id)).unwrap();
      invalidarCacheSiniestrosCliente(borrarSiniestro.cliente);
      toast.success("Siniestro eliminado");
      setBorrarSiniestro(null);
    } catch {
      toast.error("No se pudo eliminar el siniestro");
    } finally {
      setBorrando(false);
    }
  };

  const hayFiltro = !!(busqueda.trim() || filtroEstado);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 sm:px-0 py-4 sm:py-6 space-y-4"
    >
      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] flex items-center justify-center shrink-0">
            <HiExclamationCircle className="text-duo-rojo text-xl" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-titulo dark:text-titulo-dark">Siniestros</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[13px] text-suave dark:text-suave-dark">{siniestros?.length || 0} en total</span>
              {abiertos > 0 && <Badge tono="rojo" size="sm">{abiertos} abierto{abiertos !== 1 ? "s" : ""}</Badge>}
            </div>
          </div>
        </div>

        {/* 📱 Full-width en mobile; ancho natural en desktop (el wrapper w-auto lo encoge). */}
        <div className="w-full sm:w-auto shrink-0">
          <Boton3D variant="verde" full onClick={abrirAlta}>
            <HiPlus className="w-4 h-4" /> Nuevo siniestro
          </Boton3D>
        </div>
      </div>

      {/* ── Tabla con sus pestañas y el buscador arriba (todo en una tarjeta) ── */}
      <section className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-sm overflow-hidden">
        <FranjaPestanas>
          <PestanasTabla
            items={pestanas}
            valor={filtroEstado || TODOS}
            onCambiar={(id) => setFiltroEstado(id === TODOS ? "" : id)}
            ariaLabel="Estado del siniestro"
          />
        </FranjaPestanas>
        <BarraTabla
          buscador={
            <BuscadorTabla
              value={busqueda}
              onChange={setBusqueda}
              placeholder="Buscar por cliente, patente, póliza o N° de reclamo"
              ancho="lg:w-96"
            />
          }
        />

        {loading && (!siniestros || siniestros.length === 0) ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-duo-azul/25 border-t-duo-azul rounded-full animate-spin" />
          </div>
        ) : (
          <SiniestrosList
            siniestros={listaFiltrada}
            isWebAdmin={isWebAdmin}
            onView={setVerSiniestro}
            onEdit={abrirEdicion}
            onDelete={setBorrarSiniestro}
            vacio={
              hayFiltro ? (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[14px] font-medium text-suave dark:text-suave-dark">Nada con este filtro.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setBusqueda("");
                      setFiltroEstado("");
                    }}
                    className="text-[13px] font-semibold text-duo-azul hover:underline"
                  >
                    Ver todos los siniestros
                  </button>
                </div>
              ) : null
            }
          />
        )}
      </section>

      {/* ── Wizard (alta / edición) ── */}
      <SiniestrosWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleGuardar}
        initialData={editData}
        isAdmin={isWebAdmin}
      />

      {/* ── Detalle (con Editar / Eliminar abajo) ── */}
      <SiniestrosDetails
        isOpen={!!verSiniestro}
        siniestro={verSiniestro}
        onClose={() => setVerSiniestro(null)}
        onEdit={(s) => {
          setVerSiniestro(null);
          abrirEdicion(s);
        }}
        onDelete={
          isWebAdmin
            ? (s) => {
                setVerSiniestro(null);
                setBorrarSiniestro(s);
              }
            : undefined
        }
      />

      {/* ── Confirmar borrado ── */}
      <ModalDuo
        isOpen={!!borrarSiniestro}
        onClose={() => setBorrarSiniestro(null)}
        title="Eliminar siniestro"
        subtitle="Esta acción no se puede deshacer"
        icon={<HiExclamationCircle className="w-5 h-5" />}
        iconTono="rojo"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-[14px] text-titulo dark:text-titulo-dark">
            ¿Seguro que querés eliminar el siniestro
            {borrarSiniestro?.cliente_label ? <> de <b className="font-medium">{borrarSiniestro.cliente_label}</b></> : ""}
            {borrarSiniestro?.id ? <> (#{borrarSiniestro.id})</> : ""}? Se borrarán también sus fotos y su bitácora.
          </p>
          <div className="flex gap-2">
            <Boton3D variant="blanco" full onClick={() => setBorrarSiniestro(null)} disabled={borrando}>
              Cancelar
            </Boton3D>
            <Boton3D variant="rojo" full onClick={confirmarBorrado} disabled={borrando}>
              {borrando ? "Eliminando..." : "Sí, eliminar"}
            </Boton3D>
          </div>
        </div>
      </ModalDuo>
    </motion.div>
  );
}
