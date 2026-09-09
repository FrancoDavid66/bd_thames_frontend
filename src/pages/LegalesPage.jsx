// src/pages/LegalesPage.jsx
//
// 📋 Página de Legales. Orquesta: resumen + búsqueda + filtro por estado +
// lista + wizard de alta. La ruta la monta sola (sin props), igual que
// SiniestrosPage.
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { HiPlus, HiSearch, HiScale } from "react-icons/hi";
import { toast } from "react-hot-toast";

import {
  fetchExpedientes,
  fetchResumen,
  createExpediente,
  addDocumento,
} from "../store/slices/legalesSlice";

import LegalesWizard from "../components/legales/LegalesWizard";
import Boton3D from "../components/ui/Boton3D";
import CardDuo from "../components/ui/CardDuo";
import Badge from "../components/ui/Badge";

const ESTADO_CFG = {
  CONSULTA: { tono: "rojo", label: "Consulta" },
  ASIGNADO: { tono: "amarillo", label: "Asignado" },
  EN_TRAMITE: { tono: "amarillo", label: "En trámite" },
  DEMANDA_PRESENTADA: { tono: "azul", label: "Demanda" },
  EN_JUZGADO: { tono: "violeta", label: "En juzgado" },
  SENTENCIA: { tono: "violeta", label: "Sentencia" },
  COBRADO: { tono: "verde", label: "Cobrado" },
  CERRADO: { tono: "neutro", label: "Cerrado" },
  DESISTIDO: { tono: "neutro", label: "Desistido" },
};

const TEMA_LABEL = {
  LABORAL: "Laboral", ACCIDENTE: "Accidente", FAMILIA: "Familia",
  PENAL: "Penal", PROPIEDAD: "Propiedad", OTRO: "Otro",
};

const FILTROS = [
  { value: "", label: "Todos" },
  { value: "CONSULTA", label: "Consulta" },
  { value: "ASIGNADO", label: "Asignado" },
  { value: "EN_TRAMITE", label: "En trámite" },
  { value: "DEMANDA_PRESENTADA", label: "Demanda" },
  { value: "EN_JUZGADO", label: "Juzgado" },
  { value: "SENTENCIA", label: "Sentencia" },
  { value: "COBRADO", label: "Cobrado" },
];

// Sube los documentos borrador (del wizard) al expediente recién creado.
async function subirDocumentosBorrador(dispatch, expedienteId, draftDocumentos) {
  if (!expedienteId || !Array.isArray(draftDocumentos) || draftDocumentos.length === 0) return;
  for (const d of draftDocumentos) {
    try {
      await dispatch(addDocumento({
        expediente_id: Number(expedienteId),
        url: d.url,
        public_id: d.public_id,
        nombre: d.nombre || "",
        mime: d.mime || "image/jpeg",
      })).unwrap();
    } catch {
      // si uno falla, seguimos con el resto
    }
  }
}

function proximoVencimiento(exp) {
  const pend = (exp.vencimientos || []).filter((v) => !v.cumplido);
  if (pend.length === 0) return null;
  return pend.reduce((a, b) => (a.fecha < b.fecha ? a : b));
}

function ExpedienteCard({ exp, onClick }) {
  const cfg = ESTADO_CFG[exp.estado] || { tono: "neutro", label: exp.estado };
  const venc = proximoVencimiento(exp);

  let vencTxt = null;
  let vencUrgente = false;
  if (venc) {
    const dias = Math.ceil((new Date(venc.fecha) - new Date()) / 86400000);
    vencUrgente = dias <= 3;
    vencTxt = dias < 0 ? `${venc.titulo} — vencido` : dias === 0 ? `${venc.titulo} — hoy` : `${venc.titulo} — en ${dias} día${dias === 1 ? "" : "s"}`;
  }

  return (
    <CardDuo hover onClick={onClick} className="p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta flex items-center justify-center text-[12px] font-semibold shrink-0">
          {(exp.persona_label || "??").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[14px] text-titulo dark:text-titulo-dark truncate">{exp.persona_label}</span>
            {exp.cliente && (
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark">
                cliente
              </span>
            )}
          </div>
          <p className="text-[13px] text-suave dark:text-suave-dark truncate">
            {TEMA_LABEL[exp.tema] || exp.tema} · {exp.abogado_nombre || "sin abogado asignado"}
            {exp.numero ? ` · ${exp.numero}` : ""}
          </p>
          {vencTxt && (
            <p className={`text-[12px] font-medium mt-0.5 ${vencUrgente ? "text-duo-rojo" : "text-suave dark:text-suave-dark"}`}>
              {vencTxt}
            </p>
          )}
        </div>
        <Badge tono={cfg.tono} size="sm">{exp.estado_label || cfg.label}</Badge>
      </div>
    </CardDuo>
  );
}

function ResumenCard({ label, value, tono }) {
  const colorMap = {
    amarillo: "text-duo-amarillo-sombra dark:text-duo-amarillo",
    rojo: "text-duo-rojo",
    verde: "text-duo-verde-sombra dark:text-duo-verde",
  };
  return (
    <CardDuo className="p-3.5">
      <div className="text-[12px] font-medium text-suave dark:text-suave-dark">{label}</div>
      <div className={`text-xl font-semibold ${colorMap[tono] || "text-titulo dark:text-titulo-dark"}`}>{value ?? 0}</div>
    </CardDuo>
  );
}

export default function LegalesPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const expedientes = useSelector((s) => s.legales.expedientes);
  const loading = useSelector((s) => s.legales.loading);
  const resumen = useSelector((s) => s.legales.resumen);

  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchResumen());
  }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => {
      dispatch(fetchExpedientes({ search: search || undefined, estado: filtro || undefined }));
    }, 300);
    return () => clearTimeout(t);
  }, [dispatch, search, filtro]);

  const handleCrear = async (payload, draftDocumentos) => {
    const nuevo = await dispatch(createExpediente(payload)).unwrap();
    await subirDocumentosBorrador(dispatch, nuevo.id, draftDocumentos);
    dispatch(fetchResumen());
    toast.success(`Expediente ${nuevo.numero} creado`);
    navigate(`/legales/${nuevo.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <HiScale className="w-5 h-5 text-duo-violeta" />
          <h1 className="text-lg font-semibold text-titulo dark:text-titulo-dark">Legales</h1>
        </div>
        <Boton3D variant="violeta" onClick={() => setWizardOpen(true)} className="w-full sm:w-auto">
          <HiPlus className="w-4 h-4" /> Nuevo expediente
        </Boton3D>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        <ResumenCard label="Abiertos" value={resumen.abiertos} />
        <ResumenCard label="Sin abogado" value={resumen.sin_abogado} tono="amarillo" />
        <ResumenCard label="Vencen ≤7 días" value={resumen.vencen_pronto} tono="rojo" />
        <ResumenCard label="Cobrados" value={resumen.cobrados} tono="verde" />
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark text-base pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, DNI o número de expediente…"
          className="w-full h-10 pl-10 pr-3.5 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-[14px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-violeta transition-colors"
        />
      </div>

      {/* Filtros por estado */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`shrink-0 px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors ${
              filtro === f.value
                ? "bg-duo-violeta text-white border-duo-violeta"
                : "bg-card dark:bg-card-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : expedientes.length === 0 ? (
        <div className="text-center py-16">
          <HiScale className="w-8 h-8 text-suave dark:text-suave-dark mx-auto" />
          <p className="mt-3 font-semibold text-titulo dark:text-titulo-dark">No hay expedientes todavía</p>
          <p className="text-[13px] text-suave dark:text-suave-dark mt-1">Creá el primero con "Nuevo expediente"</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {expedientes.map((exp) => (
            <ExpedienteCard key={exp.id} exp={exp} onClick={() => navigate(`/legales/${exp.id}`)} />
          ))}
        </div>
      )}

      <LegalesWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} onSubmit={handleCrear} />
    </div>
  );
}