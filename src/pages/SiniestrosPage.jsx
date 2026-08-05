// src/pages/SiniestrosPage.jsx
//
// 🚨 Página de Siniestros (diseño Duo claro/oscuro).
// Orquesta todo: lista + búsqueda + filtro por estado + wizard (alta/edición)
// + detalle + borrar. Es autónoma (no recibe props; la ruta la monta sola).
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { HiPlus, HiSearch, HiExclamationCircle } from "react-icons/hi";
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

import SiniestrosList from "../components/siniestros/SiniestrosList";
import SiniestrosDetails from "../components/siniestros/SiniestrosDetails";
import SiniestrosWizard from "../components/siniestros/SiniestrosWizard";
import ModalDuo from "../components/ui/ModalDuo";
import Boton3D from "../components/ui/Boton3D";
import Badge from "../components/ui/Badge";

// Filtros por estado (chips). value === "" → todos.
const FILTROS = [
  { value: "",            label: "Todos"      },
  { value: "PENDIENTE",   label: "Falta doc." },
  { value: "DENUNCIADO",  label: "Denunciado" },
  { value: "INSPECCION",  label: "Inspección" },
  { value: "LIQUIDACION", label: "Liquidación"},
  { value: "CERRADO",     label: "Cerrado"    },
];

// Sube las fotos borrador (del wizard) al siniestro recién creado.
async function subirFotosBorrador(dispatch, siniestroId, draftFotos) {
  if (!siniestroId || !Array.isArray(draftFotos) || draftFotos.length === 0) return;
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
      // Si una foto falla no cortamos el resto.
    }
  }
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

  // Filtrado en memoria (búsqueda + estado)
  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (siniestros || []).filter((s) => {
      if (filtroEstado && s.estado !== filtroEstado) return false;
      if (!q) return true;
      const campos = [
        s.cliente_label, s.poliza_label, s.patente, s.nro_reclamo_cia,
        s.marca_auto, s.modelo_auto,
      ].filter(Boolean).join(" ").toLowerCase();
      return campos.includes(q);
    });
  }, [siniestros, busqueda, filtroEstado]);

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
      await subirFotosBorrador(dispatch, creado?.id, draftFotos);
      invalidarCacheSiniestrosCliente(creado?.cliente ?? payload.cliente);
      toast.success("Siniestro cargado");
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto px-4 sm:px-0 py-4 sm:py-6 space-y-5"
    >
      {/* ── Encabezado ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] flex items-center justify-center">
            <span className="text-2xl">🚨</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-titulo dark:text-titulo-dark">Siniestros</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-bold text-suave dark:text-suave-dark">{siniestros?.length || 0} en total</span>
              {abiertos > 0 && <Badge tono="rojo" size="sm">{abiertos} abierto{abiertos !== 1 ? "s" : ""}</Badge>}
            </div>
          </div>
        </div>

        <Boton3D variant="verde" onClick={abrirAlta}>
          <HiPlus className="w-5 h-5" /> Nuevo siniestro
        </Boton3D>
      </div>

      {/* ── Búsqueda ── */}
      <div className="relative">
        <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-suave dark:text-suave-dark" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente, patente, póliza o N° de reclamo..."
          className="w-full h-13 pl-12 pr-4 rounded-2xl border-[3px] border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark py-3 text-[15px] font-bold text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-azul transition-colors"
        />
      </div>

      {/* ── Chips de estado ── */}
      <div className="flex gap-2 flex-wrap">
        {FILTROS.map((f) => {
          const active = filtroEstado === f.value;
          return (
            <button
              key={f.value || "todos"}
              type="button"
              onClick={() => setFiltroEstado(f.value)}
              className={`h-9 px-4 rounded-xl border-2 text-xs font-black transition-colors ${
                active
                  ? "bg-duo-azul border-duo-azul text-white"
                  : "bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-duo-azul"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── Lista ── */}
      {loading && (!siniestros || siniestros.length === 0) ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-duo-azul/25 border-t-duo-azul rounded-full animate-spin" />
        </div>
      ) : (
        <SiniestrosList
          siniestros={listaFiltrada}
          isWebAdmin={isWebAdmin}
          onView={setVerSiniestro}
          onEdit={abrirEdicion}
          onDelete={setBorrarSiniestro}
        />
      )}

      {/* ── Wizard (alta / edición) ── */}
      <SiniestrosWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleGuardar}
        initialData={editData}
        isAdmin={isWebAdmin}
      />

      {/* ── Detalle ── */}
      <SiniestrosDetails
        isOpen={!!verSiniestro}
        siniestro={verSiniestro}
        onClose={() => setVerSiniestro(null)}
      />

      {/* ── Confirmar borrado ── */}
      <ModalDuo
        isOpen={!!borrarSiniestro}
        onClose={() => setBorrarSiniestro(null)}
        title="Eliminar siniestro"
        subtitle="Esta acción no se puede deshacer"
        icon={<HiExclamationCircle className="w-6 h-6" />}
        iconTono="rojo"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm font-bold text-titulo dark:text-titulo-dark">
            ¿Seguro que querés eliminar el siniestro
            {borrarSiniestro?.cliente_label ? <> de <b>{borrarSiniestro.cliente_label}</b></> : ""}
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
