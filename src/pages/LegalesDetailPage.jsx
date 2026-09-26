// src/pages/LegalesDetailPage.jsx
//
// 📁 Detalle de un expediente. Página completa (no modal) porque hay mucho
// para mostrar: datos + estado + vencimientos + documentos + bitácora.
//
// 🔒 El ABOGADO puede cambiar el estado y cargar movimientos/vencimientos,
// pero NO reasignar el abogado (eso lo hace la oficina/admin). El backend
// ya lo bloquea; acá además lo ocultamos para que no se confunda.
//
// 🔗 "Copiar link para el cliente": genera (si hacía falta) y copia el
// link público /#/mi-caso/<token> — el cliente lo abre sin login y ve su
// estado, vencimientos y las novedades marcadas como visibles.
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import { HiArrowLeft, HiPlus, HiCheck, HiClipboardCopy } from "react-icons/hi";

import { useAuth } from "../context/AuthContext";
import useDatosVivos from "../hooks/useDatosVivos";
import {
  fetchExpediente,
  updateExpediente,
  fetchMovimientos,
  addMovimiento,
  fetchVencimientos,
  addVencimiento,
  updateVencimiento,
  fetchAbogados,
  fetchPortalLink,
} from "../store/slices/legalesSlice";
import { CAMPOS_POR_TEMA } from "../components/legales/camposPorTema";

import ExpedienteDocumentosPanel from "../components/legales/ExpedienteDocumentosPanel";
import CardDuo from "../components/ui/CardDuo";
import Boton3D from "../components/ui/Boton3D";
import Badge from "../components/ui/Badge";
import SelectDuo from "../components/ui/SelectDuo";

const ESTADOS = [
  { value: "CONSULTA", label: "Consulta" },
  { value: "ASIGNADO", label: "Asignado" },
  { value: "EN_TRAMITE", label: "En trámite" },
  { value: "DEMANDA_PRESENTADA", label: "Demanda presentada" },
  { value: "EN_JUZGADO", label: "En juzgado" },
  { value: "SENTENCIA", label: "Sentencia" },
  { value: "COBRADO", label: "Cobrado" },
  { value: "CERRADO", label: "Cerrado" },
  { value: "DESISTIDO", label: "Desistido" },
];

const ESTADO_TONO = {
  CONSULTA: "rojo", ASIGNADO: "amarillo", EN_TRAMITE: "amarillo",
  DEMANDA_PRESENTADA: "azul", EN_JUZGADO: "violeta", SENTENCIA: "violeta",
  COBRADO: "verde", CERRADO: "neutro", DESISTIDO: "neutro",
};

const TEMA_LABEL = {
  LABORAL: "Laboral", ACCIDENTE: "Accidente / ART", FAMILIA: "Familia",
  PENAL: "Penal", PROPIEDAD: "Propiedad", OTRO: "Otro",
};

function Dato({ label, value }) {
  return (
    <div>
      <span className="block text-[12px] text-suave dark:text-suave-dark mb-0.5">{label}</span>
      <span className="text-[14px] font-medium text-titulo dark:text-titulo-dark">{value || "—"}</span>
    </div>
  );
}

export default function LegalesDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();

  const rol = user?.perfil?.rol;
  const esAbogado = rol === "ABOGADO";
  const esAdmin = rol === "ADMIN" || !!user?.is_superuser;
  // Solo oficina/admin reasignan el abogado del expediente.
  const puedeReasignarAbogado = !esAbogado || esAdmin;

  const expediente = useSelector((s) => s.legales.actual);
  const actualLoading = useSelector((s) => s.legales.actualLoading);
  const abogados = useSelector((s) => s.legales.abogados);

  const movimientos = useSelector((s) => s.legales.movimientos[String(id)] || []);
  const vencimientos = useSelector((s) => s.legales.vencimientos[String(id)] || []);

  const [notaTexto, setNotaTexto] = useState("");
  const [notaVisible, setNotaVisible] = useState(false);
  const [guardandoNota, setGuardandoNota] = useState(false);

  const [nuevoVencTitulo, setNuevoVencTitulo] = useState("");
  const [nuevoVencFecha, setNuevoVencFecha] = useState("");
  const [agregandoVenc, setAgregandoVenc] = useState(false);
  const [mostrarFormVenc, setMostrarFormVenc] = useState(false);

  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [guardandoAbogado, setGuardandoAbogado] = useState(false);
  const [copiandoLink, setCopiandoLink] = useState(false);

  useEffect(() => {
    dispatch(fetchExpediente(id));
    dispatch(fetchMovimientos(id));
    dispatch(fetchVencimientos(id));
    dispatch(fetchAbogados());
  }, [dispatch, id]);

  // 📡 EN VIVO: si otra persona agrega un movimiento o un vencimiento, o cambia
  //    el estado, se ve acá solo. Lo que estás escribiendo no se toca.
  useDatosVivos(["legales"], () => {
    dispatch(fetchExpediente(id));
    dispatch(fetchMovimientos(id));
    dispatch(fetchVencimientos(id));
  }, { activo: !!id });

  const handleEstadoChange = async (nuevoEstado) => {
    setGuardandoEstado(true);
    try {
      await dispatch(updateExpediente({ id, data: { estado: nuevoEstado } })).unwrap();
      toast.success("Estado actualizado");
    } catch (err) {
      toast.error(err?.detail || "No se pudo cambiar el estado");
    } finally {
      setGuardandoEstado(false);
    }
  };

  const handleAbogadoChange = async (abogadoId) => {
    setGuardandoAbogado(true);
    try {
      await dispatch(updateExpediente({ id, data: { abogado: abogadoId || null } })).unwrap();
      toast.success("Abogado actualizado");
    } catch {
      toast.error("No se pudo cambiar el abogado");
    } finally {
      setGuardandoAbogado(false);
    }
  };

  const handleAddNota = async () => {
    if (!notaTexto.trim() || guardandoNota) return;
    setGuardandoNota(true);
    try {
      await dispatch(addMovimiento({
        expediente_id: Number(id),
        descripcion: notaTexto.trim(),
        visible_cliente: notaVisible,
      })).unwrap();
      setNotaTexto("");
      setNotaVisible(false);
      toast.success("Movimiento agregado");
    } catch {
      toast.error("Error al guardar el movimiento");
    } finally {
      setGuardandoNota(false);
    }
  };

  const handleAddVencimiento = async () => {
    if (!nuevoVencTitulo.trim() || !nuevoVencFecha || agregandoVenc) return;
    setAgregandoVenc(true);
    try {
      await dispatch(addVencimiento({
        expediente_id: Number(id),
        titulo: nuevoVencTitulo.trim(),
        fecha: nuevoVencFecha,
      })).unwrap();
      setNuevoVencTitulo("");
      setNuevoVencFecha("");
      setMostrarFormVenc(false);
      toast.success("Vencimiento agregado");
    } catch {
      toast.error("Error al guardar el vencimiento");
    } finally {
      setAgregandoVenc(false);
    }
  };

  const toggleCumplido = async (venc) => {
    try {
      await dispatch(updateVencimiento({ id: venc.id, data: { cumplido: !venc.cumplido } })).unwrap();
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  const handleCopiarLink = async () => {
    if (copiandoLink) return;
    setCopiandoLink(true);
    try {
      const res = await dispatch(fetchPortalLink(id)).unwrap();
      const url = `${window.location.origin}${res.portal_path}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado — pegalo en el WhatsApp del cliente");
    } catch {
      toast.error("No se pudo generar el link");
    } finally {
      setCopiandoLink(false);
    }
  };

  if (actualLoading && !expediente) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-7 h-7 border-2 border-duo-violeta/25 border-t-duo-violeta rounded-full animate-spin" />
      </div>
    );
  }

  if (!expediente) return null;

  const abogadoActual = abogados.find((a) => a.id === expediente.abogado);

  // Campos propios del tema (ej: Laboral → fechas de trabajo), ya con su
  // etiqueta legible y formateados si son fecha. Solo se muestran los que
  // realmente tienen un valor cargado.
  const camposTemaConValor = (CAMPOS_POR_TEMA[expediente.tema] || [])
    .map((campo) => {
      const valor = expediente.datos_tema?.[campo.key];
      if (!valor) return null;
      const valorMostrado = campo.type === "date" ? dayjs(valor).format("DD/MM/YYYY") : valor;
      return { key: campo.key, label: campo.label, valor: valorMostrado };
    })
    .filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => navigate("/legales")}
          className="h-9 w-9 shrink-0 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:bg-surface dark:hover:bg-surface-dark inline-flex items-center justify-center transition-colors"
          aria-label="Volver"
        >
          <HiArrowLeft className="w-4 h-4 text-titulo dark:text-titulo-dark" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-titulo dark:text-titulo-dark truncate">{expediente.persona_label}</h1>
          <p className="text-[12px] text-suave dark:text-suave-dark font-mono">{expediente.numero} · {TEMA_LABEL[expediente.tema] || expediente.tema}</p>
        </div>
        <Badge tono={ESTADO_TONO[expediente.estado] || "neutro"}>{expediente.estado_label}</Badge>
      </div>

      <div className="flex justify-end mb-5">
        <button
          type="button"
          onClick={handleCopiarLink}
          disabled={copiandoLink}
          className="h-9 px-3 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-[12px] font-medium text-duo-violeta flex items-center gap-1.5 hover:border-duo-violeta transition-colors disabled:opacity-50"
        >
          <HiClipboardCopy className="w-4 h-4" /> {copiandoLink ? "Generando…" : "Copiar link para el cliente"}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* IZQUIERDA */}
        <div className="flex-1 space-y-4 min-w-0">

          {/* Estado */}
          <CardDuo className="p-4">
            <span className="block text-[12px] text-suave dark:text-suave-dark mb-2">Estado</span>
            <SelectDuo
              value={expediente.estado}
              onChange={(e) => handleEstadoChange(e.target.value)}
              disabled={guardandoEstado}
              options={ESTADOS}
            />
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {ESTADOS.filter((e) => e.value !== "DESISTIDO").map((e) => {
                const idxActual = ESTADOS.findIndex((x) => x.value === expediente.estado);
                const idxEste = ESTADOS.findIndex((x) => x.value === e.value);
                const pasado = expediente.estado !== "DESISTIDO" && idxEste <= idxActual;
                return (
                  <span
                    key={e.value}
                    className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                      pasado
                        ? "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta"
                        : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark"
                    }`}
                  >
                    {e.label}
                  </span>
                );
              })}
            </div>
          </CardDuo>

          {/* Datos */}
          <CardDuo className="p-4">
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
              <Dato label="DNI" value={expediente.persona_dni} />
              <Dato label="Teléfono" value={expediente.persona_telefono} />
              <Dato label="Tipo" value={expediente.cliente ? `Cliente — ${expediente.cliente_label || ""}` : "No cliente"} />
              <Dato label="Fecha del hecho" value={expediente.fecha_hecho ? dayjs(expediente.fecha_hecho).format("DD/MM/YYYY") : "—"} />
              <Dato label="Oficina" value={expediente.oficina_nombre || "—"} />
              <Dato label="Cargado por" value={expediente.creado_por_nombre} />
            </div>

            {camposTemaConValor.length > 0 && (
              <div className="mt-3 pt-3 border-t border-linea dark:border-linea-dark">
                <span className="block text-[12px] text-suave dark:text-suave-dark mb-2">
                  Datos de {TEMA_LABEL[expediente.tema] || "este caso"}
                </span>
                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
                  {camposTemaConValor.map((c) => (
                    <Dato key={c.key} label={c.label} value={c.valor} />
                  ))}
                </div>
              </div>
            )}

            {expediente.relato && (
              <div className="mt-3">
                <span className="block text-[12px] text-suave dark:text-suave-dark mb-2">Relato</span>
                <div className="p-3 bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark rounded-lg text-[13px] text-titulo dark:text-titulo-dark whitespace-pre-wrap">
                  {expediente.relato}
                </div>
              </div>
            )}
          </CardDuo>

          {/* Abogado asignado */}
          <CardDuo className="p-4">
            <span className="block text-[12px] text-suave dark:text-suave-dark mb-2">Abogado asignado</span>
            {puedeReasignarAbogado ? (
              <SelectDuo
                value={expediente.abogado || ""}
                onChange={(e) => handleAbogadoChange(e.target.value)}
                disabled={guardandoAbogado}
                placeholder="Sin asignar"
                options={abogados.map((a) => ({ value: a.id, label: a.nombre_completo }))}
              />
            ) : (
              <p className="text-[14px] font-medium text-titulo dark:text-titulo-dark">{abogadoActual?.nombre_completo || "Sin asignar"}</p>
            )}
          </CardDuo>

          {/* Vencimientos */}
          <CardDuo className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] text-suave dark:text-suave-dark">Vencimientos</span>
              <button
                type="button"
                onClick={() => setMostrarFormVenc((v) => !v)}
                className="text-[12px] font-medium text-duo-violeta flex items-center gap-1"
              >
                <HiPlus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>

            {mostrarFormVenc && (
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <input
                  value={nuevoVencTitulo}
                  onChange={(e) => setNuevoVencTitulo(e.target.value)}
                  placeholder="Ej: Audiencia preliminar"
                  className="flex-1 h-10 px-3 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-[13px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-violeta"
                />
                <input
                  type="date"
                  value={nuevoVencFecha}
                  onChange={(e) => setNuevoVencFecha(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-[13px] text-titulo dark:text-titulo-dark outline-none focus:border-duo-violeta [color-scheme:light] dark:[color-scheme:dark]"
                />
                <Boton3D variant="violeta" size="sm" onClick={handleAddVencimiento} disabled={agregandoVenc}>
                  {agregandoVenc ? "..." : "Guardar"}
                </Boton3D>
              </div>
            )}

            {vencimientos.length === 0 ? (
              <p className="text-[13px] text-suave dark:text-suave-dark">Sin vencimientos cargados.</p>
            ) : (
              <div className="space-y-2">
                {vencimientos.map((v) => {
                  const dias = Math.ceil((new Date(v.fecha) - new Date()) / 86400000);
                  const urgente = !v.cumplido && dias <= 3;
                  return (
                    <div
                      key={v.id}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${
                        v.cumplido
                          ? "bg-surface dark:bg-surface-dark opacity-60"
                          : urgente
                          ? "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)]"
                          : "bg-surface dark:bg-surface-dark"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCumplido(v)}
                        className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          v.cumplido ? "bg-duo-verde border-duo-verde text-white" : "border-linea dark:border-linea-dark"
                        }`}
                        aria-label="Marcar cumplido"
                      >
                        {v.cumplido && <HiCheck className="w-3 h-3" />}
                      </button>
                      <span className={`flex-1 text-[13px] ${v.cumplido ? "line-through text-suave dark:text-suave-dark" : "text-titulo dark:text-titulo-dark"}`}>
                        {v.titulo}
                      </span>
                      <span className={`text-[12px] font-medium shrink-0 ${urgente ? "text-duo-rojo" : "text-suave dark:text-suave-dark"}`}>
                        {dayjs(v.fecha).format("DD/MM")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardDuo>

          {/* Documentos */}
          <CardDuo className="p-0 overflow-hidden">
            <ExpedienteDocumentosPanel expedienteId={id} />
          </CardDuo>
        </div>

        {/* DERECHA: bitácora */}
        <div className="w-full lg:w-80 flex flex-col border-t lg:border-t-0 lg:border-l border-linea dark:border-linea-dark pt-5 lg:pt-0 lg:pl-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[14px] font-semibold text-titulo dark:text-titulo-dark">Bitácora</h3>
          </div>

          <CardDuo className="p-3 mb-4 space-y-3">
            <textarea
              value={notaTexto}
              onChange={(e) => setNotaTexto(e.target.value)}
              rows={3}
              placeholder="Qué se hizo, qué falta..."
              className="w-full rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 py-2.5 text-[13px] text-titulo dark:text-titulo-dark outline-none focus:border-duo-violeta resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNotaVisible(false)}
                className={`flex-1 h-8 rounded-lg border text-[12px] font-medium transition-colors ${
                  !notaVisible
                    ? "border-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta"
                    : "border-linea dark:border-linea-dark text-suave dark:text-suave-dark"
                }`}
              >
                Interno
              </button>
              <button
                type="button"
                onClick={() => setNotaVisible(true)}
                className={`flex-1 h-8 rounded-lg border text-[12px] font-medium transition-colors ${
                  notaVisible
                    ? "border-duo-verde bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde"
                    : "border-linea dark:border-linea-dark text-suave dark:text-suave-dark"
                }`}
              >
                Visible al cliente
              </button>
            </div>
            <Boton3D variant="verde" size="sm" full onClick={handleAddNota} disabled={guardandoNota || !notaTexto.trim()}>
              {guardandoNota ? "..." : "Guardar"}
            </Boton3D>
          </CardDuo>

          <div className="flex-1 space-y-2.5">
            {movimientos.length > 0 ? (
              movimientos.map((m) => (
                <div key={m.id} className="p-3 bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-medium text-duo-violeta">{dayjs(m.creado_en).format("DD MMM YYYY HH:mm")}</p>
                    {m.visible_cliente && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde">
                        Visible
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-titulo dark:text-titulo-dark leading-relaxed">{m.descripcion}</p>
                  <p className="text-[12px] text-suave dark:text-suave-dark mt-1">{m.autor_nombre}</p>
                </div>
              ))
            ) : (
              <div className="p-4 border border-dashed border-linea dark:border-linea-dark rounded-lg text-center">
                <p className="text-[13px] text-suave dark:text-suave-dark">No hay movimientos registrados.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}