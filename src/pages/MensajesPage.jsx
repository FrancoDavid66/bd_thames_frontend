// src/pages/MensajesPage.jsx
//
// 💬 MENSAJES — los WhatsApp se mandan A MANO desde cada oficina.
//
//   · "Descargar reporte": el PDF/Excel de contactos de siempre (antes estaba
//     en Pagos). La oficina baja SOLO lo suyo; el admin elige la oficina.
//   · OFICINA: ve la lista de clientes para contactar hoy SIN botones (es una
//     ayuda) y baja el PDF. No marca nada.
//   · ADMIN: es el único que marca, en cada cliente:
//       "✓ Enviado", o "No se mandó" y elige el MOTIVO:
//         - Hoy no se pudo   (número mal, no tiene WhatsApp, otro) → solo hoy
//         - No enviarle más  (mal llevado, pidió que no le escriban, otro)
//           → no aparece más en Mensajes ni en el reporte
//     Lo que no se marcó sigue en la lista al otro día ("Pendiente desde 15/09").
//     Controla el avance de cada oficina y en "Clientes sin mensajes" puede
//     volver a activar a un cliente. El sistema NO le avisa nada a las oficinas.
//
// Backend: notificaciones/views_control_mensajes.py
//   GET  /api/notificaciones/mensajes/?fecha=AAAA-MM-DD&actualizar=1
//   POST /api/notificaciones/mensajes/<id>/marcar/  { accion, motivo, detalle }
//   GET  /api/notificaciones/mensajes/sin-mensajes/?historial=1
//   POST /api/notificaciones/mensajes/sin-mensajes/<id>/reactivar/

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  HiChatAlt2,
  HiDownload,
  HiCheck,
  HiCheckCircle,
  HiClock,
  HiRefresh,
  HiSearch,
  HiOfficeBuilding,
  HiExclamation,
  HiPhone,
  HiBan,
} from "react-icons/hi";

import { useAuth } from "../context/AuthContext";
import useDatosVivos from "../hooks/useDatosVivos";
import ReporteContactosModal from "../components/notificaciones/ReporteContactosModal";
import ModalDuo from "../components/ui/ModalDuo";
import Boton3D from "../components/ui/Boton3D";

dayjs.locale("es");

const BASE_URL = (import.meta.env.VITE_API_URL || "/api/").replace(/\/+$/, "");

const authHeaders = () => {
  const token = localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("jwt");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const errorDe = (err, fallback) => err?.response?.data?.error || err?.response?.data?.detail || fallback;

const fmtDia = (iso) => (iso ? dayjs(iso).format("DD/MM") : "");

const SIN_MANDAR = new Set(["PENDIENTE", "REEMPLAZADO", "VENCIDO"]);

const FILTROS = [
  { id: "todos", label: "Todos" },
  { id: "sin_mandar", label: "Sin mandar" },
  { id: "enviados", label: "Enviados" },
  { id: "no_se_pudo", label: "No se pudo" },
  { id: "atrasados", label: "Atrasados" },
];

// Las dos formas de "no se mandó" y sus motivos (mismos códigos que el backend).
const OPCIONES_NO_MANDAR = [
  { id: "no_se_pudo", titulo: "Hoy no se pudo", detalle: "Solo por hoy" },
  { id: "no_enviar_mas", titulo: "No enviarle más", detalle: "De acá en adelante" },
];

const MOTIVOS = {
  no_se_pudo: [
    { id: "NUMERO_MAL", label: "Número mal" },
    { id: "SIN_WHATSAPP", label: "No tiene WhatsApp" },
    { id: "OTRO", label: "Otro" },
  ],
  no_enviar_mas: [
    { id: "MAL_LLEVADO", label: "Mal llevado" },
    { id: "NO_QUIERE", label: "Pidió que no le escriban" },
    { id: "OTRO", label: "Otro" },
  ],
};

const TONOS = {
  rojo: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo",
  amarillo: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo",
  verde: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde",
  azul: "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul",
  violeta: "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta",
  gris: "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border border-linea dark:border-linea-dark",
};

// Mismo criterio de colores que el reporte: atrasado rojo, hoy amarillo,
// faltan días verde, oferta azul, renovación violeta.
function tonoSituacion(item) {
  if (item.tipo === "OFERTA") return "azul";
  if (item.situacion === "RENOVACIÓN") return "violeta";
  const d = Number(item.delta);
  if (item.delta === null || item.delta === undefined || !Number.isFinite(d)) return "gris";
  if (d < 0) return "rojo";
  if (d === 0) return "amarillo";
  return "verde";
}

function Pill({ tono = "gris", children, title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${TONOS[tono] || TONOS.gris}`}
    >
      {children}
    </span>
  );
}

/* ---------- Tarjeta de avance de una oficina ---------- */
function TarjetaOficina({ o, activa, onClick, clickeable = true }) {
  const total = Number(o?.a_mandar) || 0;
  const enviados = Number(o?.enviados) || 0;
  const noSePudo = Number(o?.no_se_pudo) || 0;
  const sinMandar = Number(o?.sin_mandar) || 0;
  const gestionados = enviados + noSePudo;
  const pct = total ? Math.round((gestionados / total) * 100) : 0;
  const completo = total > 0 && sinMandar === 0;
  const nadie = total > 0 && gestionados === 0;
  const barra = completo ? "bg-duo-verde" : nadie ? "bg-duo-rojo" : "bg-duo-amarillo";
  const colorNumero = completo
    ? "text-duo-verde-sombra dark:text-duo-verde"
    : nadie
    ? "text-duo-rojo"
    : "text-titulo dark:text-titulo-dark";

  const contenido = (
    <>
      <div className="flex items-center gap-1.5 text-[12px] text-suave dark:text-suave-dark">
        <HiOfficeBuilding className="shrink-0" />
        <span className="truncate">{o?.nombre}</span>
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${colorNumero}`}>
        {enviados}/{total}
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-surface dark:bg-surface-dark overflow-hidden">
        <div className={`h-full ${barra}`} style={{ width: `${total ? Math.max(pct, 4) : 0}%` }} />
      </div>
      <div className="mt-2 text-[11px] text-suave dark:text-suave-dark leading-relaxed">
        {total === 0 ? "Sin mensajes" : completo ? "Completo" : `${sinMandar} sin mandar`}
        {noSePudo > 0 && (
          <span className="text-duo-amarillo-sombra dark:text-duo-amarillo"> · {noSePudo} no se pudo</span>
        )}
        {o?.anteriores > 0 && (
          <span className="text-duo-amarillo-sombra dark:text-duo-amarillo"> · {o.anteriores} atrasado{o.anteriores !== 1 ? "s" : ""}</span>
        )}
        {o?.pagaron > 0 && <span> · {o.pagaron} pagaron</span>}
        {o?.excluidos > 0 && <span> · {o.excluidos} no enviar más</span>}
      </div>
    </>
  );

  const base = "text-left rounded-xl border bg-card dark:bg-card-dark p-3.5 transition-colors";
  if (!clickeable) {
    return <div className={`${base} border-linea dark:border-linea-dark`}>{contenido}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} cursor-pointer ${
        activa ? "border-duo-azul ring-1 ring-duo-azul/40" : "border-linea dark:border-linea-dark hover:border-duo-azul/50"
      }`}
    >
      {contenido}
    </button>
  );
}

/* ---------- Modal "No se mandó" (motivo obligatorio) ---------- */
function ModalNoMandar({ item, guardando, onClose, onConfirmar }) {
  const [tipo, setTipo] = useState("no_se_pudo");
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");

  useEffect(() => {
    if (item) {
      setTipo("no_se_pudo");
      setMotivo("");
      setDetalle("");
    }
  }, [item]);

  const falta = !motivo ? "Elegí el motivo" : motivo === "OTRO" && !detalle.trim() ? "Escribí cuál es el motivo" : "";
  const esNoEnviarMas = tipo === "no_enviar_mas";

  const confirmar = () => {
    if (falta || guardando) return;
    onConfirmar({ accion: tipo, motivo, detalle: detalle.trim() });
  };

  return (
    <ModalDuo
      isOpen={!!item}
      onClose={guardando ? () => {} : onClose}
      title="¿Por qué no se mandó?"
      subtitle={item?.cliente || ""}
      icon={<HiExclamation />}
      iconTono="amarillo"
      size="sm"
      footer={
        <>
          <Boton3D variant="blanco" onClick={onClose} disabled={guardando}>
            Cancelar
          </Boton3D>
          <Boton3D variant={esNoEnviarMas ? "rojo" : "amarillo"} onClick={confirmar} disabled={guardando || !!falta}>
            {guardando ? "Guardando…" : esNoEnviarMas ? "No enviarle más" : "Guardar"}
          </Boton3D>
        </>
      }
    >
      <div className="space-y-4">
        {/* Qué pasó */}
        <div className="grid grid-cols-2 gap-2">
          {OPCIONES_NO_MANDAR.map((op) => {
            const activa = tipo === op.id;
            return (
              <button
                key={op.id}
                type="button"
                onClick={() => {
                  setTipo(op.id);
                  setMotivo("");
                }}
                className={`text-left rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                  activa
                    ? op.id === "no_enviar_mas"
                      ? "border-duo-rojo bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)]"
                      : "border-duo-amarillo bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)]"
                    : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-duo-azul/50"
                }`}
              >
                <div className="text-[13px] font-medium text-titulo dark:text-titulo-dark">{op.titulo}</div>
                <div className="text-[11px] text-suave dark:text-suave-dark">{op.detalle}</div>
              </button>
            );
          })}
        </div>

        {/* Motivo */}
        <div>
          <label className="text-[11px] text-suave dark:text-suave-dark mb-1.5 block">
            Motivo <span className="text-duo-rojo">*</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {MOTIVOS[tipo].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMotivo(m.id)}
                className={`h-9 px-3 rounded-lg border text-[13px] transition-colors cursor-pointer ${
                  motivo === m.id
                    ? "border-duo-azul bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul font-medium"
                    : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark hover:border-duo-azul/50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Detalle */}
        <div>
          <label className="text-[11px] text-suave dark:text-suave-dark mb-1.5 block">
            {motivo === "OTRO" ? (
              <>
                ¿Cuál es el motivo? <span className="text-duo-rojo">*</span>
              </>
            ) : (
              "Detalle (opcional)"
            )}
          </label>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            maxLength={255}
            rows={2}
            placeholder={esNoEnviarMas ? "Ej: insulta cuando le escribimos" : "Ej: el número es de otra persona"}
            className="w-full rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-2 text-[13px] text-titulo dark:text-titulo-dark outline-none focus:border-duo-azul resize-none"
          />
        </div>

        {esNoEnviarMas && (
          <div className="rounded-lg bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2.5 text-[12px] text-duo-rojo leading-relaxed">
            Deja de aparecer en Mensajes y en el reporte, de hoy en adelante. Solo el admin lo puede volver a activar.
            Si no paga, la baja le llega igual.
          </div>
        )}
      </div>
    </ModalDuo>
  );
}

/* ---------- Estado de un mensaje (lado derecho de la fila) ---------- */
function EstadoMensaje({ item, esAdmin, marcando, onAccion, onNoMandar }) {
  const motivoTxt = [item.motivo_label, item.motivo_detalle].filter(Boolean).join(": ");

  if (item.estado === "PENDIENTE") {
    // 👀 La oficina solo mira (la lista es una ayuda): sin botones.
    if (!esAdmin) return null;
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onAccion(item, { accion: "enviado" })}
          disabled={marcando}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-duo-verde text-duo-verde-sombra dark:text-duo-verde text-[13px] font-medium hover:bg-duo-verde-soft dark:hover:bg-[var(--color-duo-verde-soft-dark)] transition-colors cursor-pointer disabled:opacity-60"
        >
          <HiCheck className={marcando ? "animate-pulse" : ""} />
          {marcando ? "Guardando…" : "Enviado"}
        </button>
        <button
          type="button"
          onClick={() => onNoMandar(item)}
          disabled={marcando}
          className="inline-flex items-center h-9 px-3 rounded-lg border border-linea dark:border-linea-dark text-suave dark:text-suave-dark text-[13px] hover:border-duo-amarillo hover:text-duo-amarillo-sombra dark:hover:text-duo-amarillo transition-colors cursor-pointer disabled:opacity-60"
        >
          No se mandó
        </button>
      </div>
    );
  }

  const deshacer = esAdmin && (
    <button
      type="button"
      onClick={() => onAccion(item, { accion: "deshacer" })}
      disabled={marcando}
      className="text-[11px] text-suave dark:text-suave-dark hover:text-duo-rojo underline underline-offset-2 cursor-pointer disabled:opacity-60"
    >
      Deshacer
    </button>
  );

  if (item.estado === "ENVIADO") {
    return (
      <div className="flex items-center gap-2">
        <Pill tono="verde">
          <HiCheckCircle /> Enviado {item.enviado_en}
          {item.enviado_por ? ` · ${item.enviado_por}` : ""}
        </Pill>
        {deshacer}
      </div>
    );
  }

  if (item.estado === "NO_SE_PUDO") {
    return (
      <div className="flex items-center gap-2">
        <Pill tono="amarillo" title={motivoTxt}>
          <HiExclamation /> No se pudo · {item.motivo_label}
          {item.cerrado_por ? ` · ${item.cerrado_por}` : ""}
        </Pill>
        {deshacer}
      </div>
    );
  }

  if (item.estado === "EXCLUIDO") {
    return (
      <Pill tono="rojo" title={motivoTxt}>
        <HiBan /> No enviarle más · {item.motivo_label}
        {item.cerrado_por ? ` · ${item.cerrado_por}` : ""}
      </Pill>
    );
  }

  if (item.estado === "PAGO") return <Pill tono="gris">Pagó · se cerró solo</Pill>;
  if (item.estado === "REEMPLAZADO") return <Pill tono="rojo">No se mandó · siguió al otro día</Pill>;
  if (item.estado === "VENCIDO") return <Pill tono="rojo">No se mandó</Pill>;
  return <Pill>{item.estado_label || item.estado}</Pill>;
}

/* ---------- Fila de un cliente ---------- */
function FilaMensaje({ item, esAdmin, verOficina, marcando, onAccion, onNoMandar }) {
  const pendiente = item.estado === "PENDIENTE";
  const apagado = item.estado === "PAGO" || item.estado === "EXCLUIDO";
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 px-4 py-3 border-t first:border-t-0 border-linea dark:border-linea-dark">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[14px] font-medium truncate ${
              apagado ? "text-suave dark:text-suave-dark" : "text-titulo dark:text-titulo-dark"
            }`}
          >
            {item.cliente}
          </span>
          <Pill tono={tonoSituacion(item)}>{item.situacion}</Pill>
          {pendiente && item.pendiente_desde && (
            <Pill tono="amarillo">
              <HiClock /> Pendiente desde {fmtDia(item.pendiente_desde)}
            </Pill>
          )}
        </div>
        <div className="mt-0.5 text-[12px] text-suave dark:text-suave-dark truncate">
          {verOficina && <span className="font-medium">{item.oficina} · </span>}
          {item.detalle || "—"}
        </div>
        {item.motivo_detalle && (item.estado === "NO_SE_PUDO" || item.estado === "EXCLUIDO") && (
          <div className="mt-0.5 text-[12px] text-suave dark:text-suave-dark italic truncate">“{item.motivo_detalle}”</div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
        {!apagado && !esAdmin &&
          (item.telefono ? (
            item.whatsapp_link ? (
              <a
                href={item.whatsapp_link}
                target="_blank"
                rel="noreferrer"
                title="Abrir en WhatsApp"
                className="inline-flex items-center gap-1 text-[13px] text-titulo dark:text-titulo-dark hover:text-duo-verde-sombra dark:hover:text-duo-verde"
              >
                <HiPhone className="text-suave dark:text-suave-dark" /> {item.telefono}
              </a>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-[13px] text-duo-amarillo-sombra dark:text-duo-amarillo"
                title="Revisá el número en la ficha"
              >
                <HiPhone /> {item.telefono}
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 text-[12px] text-duo-rojo">
              <HiExclamation /> Sin teléfono
            </span>
          ))}
        {!apagado && esAdmin &&
          (item.whatsapp_link ? (
            <a
              href={item.whatsapp_link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-linea dark:border-linea-dark text-[13px] text-titulo dark:text-titulo-dark hover:border-duo-verde transition-colors"
              title={item.telefono}
            >
              <HiChatAlt2 className="text-duo-verde-sombra dark:text-duo-verde" /> WhatsApp
            </a>
          ) : item.telefono ? (
            <span
              className="inline-flex items-center gap-1 text-[12px] text-duo-amarillo-sombra dark:text-duo-amarillo"
              title="Revisá el número en la ficha"
            >
              <HiPhone /> {item.telefono}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[12px] text-duo-rojo">
              <HiExclamation /> Sin teléfono
            </span>
          ))}
        <EstadoMensaje item={item} esAdmin={esAdmin} marcando={marcando} onAccion={onAccion} onNoMandar={onNoMandar} />
      </div>
    </div>
  );
}

/* ---------- Admin: clientes a los que no se les manda más ---------- */
function PanelSinMensajes({ onCambio }) {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [historial, setHistorial] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [guardandoId, setGuardandoId] = useState(null);

  // silencioso = recarga EN VIVO: sin "cargando" y sin cartel de error.
  const cargar = useCallback(async (opciones) => {
    const silencioso = !!opciones?.silencioso;
    if (!silencioso) setCargando(true);
    try {
      const params = historial ? "?historial=1" : "";
      const res = await axios.get(`${BASE_URL}/notificaciones/mensajes/sin-mensajes/${params}`, { headers: authHeaders() });
      setItems(res.data?.items || []);
      setError("");
    } catch (err) {
      if (!silencioso) setError(errorDe(err, "No se pudo cargar la lista"));
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, [historial]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // 📡 EN VIVO: si otra persona saca o reactiva a un cliente, se ve acá solo.
  useDatosVivos(["mensajes"], () => cargar({ silencioso: true }));

  const reactivar = async (it) => {
    setGuardandoId(it.id);
    try {
      await axios.post(`${BASE_URL}/notificaciones/mensajes/sin-mensajes/${it.id}/reactivar/`, {}, { headers: authHeaders() });
      toast.success(`${it.cliente}: vuelve a recibir mensajes`);
      setConfirmandoId(null);
      await cargar();
      onCambio?.();
    } catch (err) {
      toast.error(errorDe(err, "No se pudo reactivar"));
    } finally {
      setGuardandoId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[13px] text-suave dark:text-suave-dark">
          Clientes que las oficinas marcaron con "No enviarle más". No aparecen en Mensajes ni en el reporte.
        </p>
        <label className="inline-flex items-center gap-2 text-[12px] text-suave dark:text-suave-dark cursor-pointer shrink-0">
          <input type="checkbox" checked={historial} onChange={(e) => setHistorial(e.target.checked)} />
          Ver también reactivados
        </label>
      </div>

      <div className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark overflow-hidden">
        {cargando ? (
          <div className="px-4 py-10 text-center text-[13px] text-suave dark:text-suave-dark">Cargando…</div>
        ) : error ? (
          <div className="px-4 py-10 text-center text-[13px] text-duo-rojo">{error}</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-suave dark:text-suave-dark">
            No hay clientes marcados para no enviarles mensajes
          </div>
        ) : (
          items.map((it) => (
            <div
              key={it.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 px-4 py-3 border-t first:border-t-0 border-linea dark:border-linea-dark"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-medium text-titulo dark:text-titulo-dark truncate">{it.cliente}</span>
                  <Pill tono={it.activo ? "rojo" : "gris"}>
                    <HiBan /> {it.motivo_label}
                  </Pill>
                  {!it.activo && <Pill tono="verde">Reactivado</Pill>}
                </div>
                {it.detalle && (
                  <div className="mt-0.5 text-[12px] text-titulo dark:text-titulo-dark italic truncate">“{it.detalle}”</div>
                )}
                <div className="mt-0.5 text-[12px] text-suave dark:text-suave-dark truncate">
                  Marcado por {it.creado_por || "—"} · {it.oficina} · {it.creado_en}
                  {it.telefono ? ` · Tel. ${it.telefono}` : ""}
                  {!it.activo && it.reactivado_por ? ` · Reactivado por ${it.reactivado_por} el ${it.reactivado_en}` : ""}
                </div>
              </div>

              {it.activo && (
                <div className="flex items-center gap-2 shrink-0">
                  {confirmandoId === it.id ? (
                    <>
                      <span className="text-[12px] text-suave dark:text-suave-dark">¿Volver a mandarle mensajes?</span>
                      <button
                        type="button"
                        onClick={() => reactivar(it)}
                        disabled={guardandoId === it.id}
                        className="h-9 px-3 rounded-lg bg-duo-verde text-white text-[13px] font-medium hover:brightness-110 cursor-pointer disabled:opacity-60"
                      >
                        {guardandoId === it.id ? "Guardando…" : "Sí"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmandoId(null)}
                        disabled={guardandoId === it.id}
                        className="h-9 px-3 rounded-lg border border-linea dark:border-linea-dark text-[13px] text-suave dark:text-suave-dark cursor-pointer"
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmandoId(it.id)}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-linea dark:border-linea-dark text-[13px] text-titulo dark:text-titulo-dark hover:border-duo-verde transition-colors cursor-pointer"
                    >
                      <HiRefresh /> Volver a activar
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ================== PAGE ================== */
export default function MensajesPage() {
  const { user } = useAuth();
  const esAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const hoyIso = dayjs().format("YYYY-MM-DD");

  const [vista, setVista] = useState("dia"); // admin: "dia" | "sin_mensajes"
  const [fecha, setFecha] = useState(hoyIso);
  const [oficinaId, setOficinaId] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");
  const [marcandoId, setMarcandoId] = useState(null);
  const [noMandarItem, setNoMandarItem] = useState(null);
  const [showReporte, setShowReporte] = useState(false);

  // vivo = recarga EN VIVO: como silencioso, y si falla no muestra el error
  // (queda lo que ya se veía; se reintenta con el próximo aviso).
  const cargar = useCallback(
    async ({ silencioso = false, actualizar = false, vivo = false } = {}) => {
      if (!silencioso) setCargando(true);
      if (actualizar) setActualizando(true);
      try {
        const params = new URLSearchParams();
        if (esAdmin && fecha) params.set("fecha", fecha);
        if (esAdmin && actualizar) params.set("actualizar", "1");
        const res = await axios.get(`${BASE_URL}/notificaciones/mensajes/?${params.toString()}`, {
          headers: authHeaders(),
        });
        setData(res.data);
        setError("");
        if (actualizar) toast.success("Lista actualizada");
      } catch (err) {
        console.error("[Mensajes] Error:", err);
        if (!vivo) setError(errorDe(err, "No se pudieron cargar los mensajes"));
      } finally {
        if (!silencioso) setCargando(false);
        if (actualizar) setActualizando(false);
      }
    },
    [esAdmin, fecha]
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  // 📡 EN VIVO: si otra persona marca un mensaje, o el cliente paga (y su
  //    aviso de cobranza se cierra solo), la lista se pone al día sola.
  useDatosVivos(["mensajes", "cuotas"], () => cargar({ silencioso: true, vivo: true }), { cadaMs: 30_000 });

  // payload: { accion: "enviado" | "deshacer" | "no_se_pudo" | "no_enviar_mas", motivo?, detalle? }
  const accionar = async (item, payload) => {
    setMarcandoId(item.id);
    try {
      const res = await axios.post(`${BASE_URL}/notificaciones/mensajes/${item.id}/marcar/`, payload, {
        headers: authHeaders(),
      });
      const nuevo = res.data?.item;
      if (nuevo) {
        setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === nuevo.id ? { ...x, ...nuevo } : x)) } : d));
      }
      if (payload.accion === "enviado") toast.success(`${item.cliente}: enviado`);
      if (payload.accion === "no_se_pudo") toast.success(`${item.cliente}: no se pudo`);
      if (payload.accion === "no_enviar_mas") toast.success(`${item.cliente}: no se le envía más`);
      setNoMandarItem(null);
      cargar({ silencioso: true }); // refresca contadores (y otros días del mismo cliente)
    } catch (err) {
      toast.error(errorDe(err, "No se pudo guardar"));
    } finally {
      setMarcandoId(null);
    }
  };

  const oficinas = data?.oficinas || [];
  const todos = data?.items || [];
  const esHoy = data ? data.es_hoy : true;

  // Los ítems de la oficina elegida (admin) o todos (oficina: ya vienen filtrados).
  const base = useMemo(
    () => todos.filter((it) => !(esAdmin && oficinaId && String(it.oficina_id) !== String(oficinaId))),
    [todos, esAdmin, oficinaId]
  );

  const conteos = useMemo(
    () => ({
      todos: base.length,
      sin_mandar: base.filter((it) => SIN_MANDAR.has(it.estado)).length,
      enviados: base.filter((it) => it.estado === "ENVIADO").length,
      no_se_pudo: base.filter((it) => it.estado === "NO_SE_PUDO").length,
      atrasados: base.filter((it) => it.anterior && it.estado === "PENDIENTE").length,
    }),
    [base]
  );

  const items = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return base.filter((it) => {
      if (filtro === "sin_mandar" && !SIN_MANDAR.has(it.estado)) return false;
      if (filtro === "enviados" && it.estado !== "ENVIADO") return false;
      if (filtro === "no_se_pudo" && it.estado !== "NO_SE_PUDO") return false;
      if (filtro === "atrasados" && !(it.anterior && it.estado === "PENDIENTE")) return false;
      if (q) {
        const texto = `${it.cliente} ${it.detalle} ${it.telefono} ${it.oficina}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [base, filtro, busqueda]);

  const verSinMensajes = esAdmin && vista === "sin_mensajes";

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark">
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] flex items-center justify-center shrink-0">
              <HiChatAlt2 className="text-duo-verde-sombra dark:text-duo-verde text-xl" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">Mensajes</h1>
              <p className="text-suave dark:text-suave-dark text-[13px] mt-0.5">
                {esAdmin
                  ? "Marcá y controlá los mensajes de cada oficina"
                  : `Clientes para contactar hoy · ${user?.perfil?.oficina_nombre || "tu oficina"}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {esAdmin && !verSinMensajes && (
              <button
                type="button"
                onClick={() => cargar({ actualizar: true })}
                disabled={actualizando}
                title="Vuelve a revisar la lista de hoy (suma clientes nuevos)"
                className="inline-flex flex-1 sm:flex-none justify-center items-center gap-2 rounded-lg bg-card dark:bg-card-dark border border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark px-4 h-10 text-[13px] font-medium hover:border-duo-azul transition-colors cursor-pointer disabled:opacity-60"
              >
                <HiRefresh className={actualizando ? "animate-spin" : ""} />
                <span>Actualizar</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowReporte(true)}
              className="inline-flex flex-1 sm:flex-none justify-center items-center gap-2 rounded-lg bg-duo-azul text-white px-4 h-10 text-[13px] font-medium hover:brightness-110 transition-colors cursor-pointer"
            >
              <HiDownload className="text-base" />
              <span>Descargar reporte</span>
            </button>
          </div>
        </div>

        {/* Pestañas (admin) */}
        {esAdmin && (
          <div className="flex items-center gap-1 mb-4 border-b border-linea dark:border-linea-dark">
            {[
              { id: "dia", label: "Control del día" },
              { id: "sin_mensajes", label: `Clientes sin mensajes${data?.sin_mensajes ? ` (${data.sin_mensajes})` : ""}` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setVista(t.id)}
                className={`h-10 px-3 -mb-px border-b-2 text-[13px] font-medium transition-colors cursor-pointer ${
                  vista === t.id
                    ? "border-duo-azul text-duo-azul"
                    : "border-transparent text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {verSinMensajes ? (
          <PanelSinMensajes onCambio={() => cargar({ silencioso: true })} />
        ) : (
          <>
            {/* Avance */}
            {esAdmin ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {oficinas.map((o) => (
                  <TarjetaOficina
                    key={o.id ?? "sin"}
                    o={o}
                    activa={String(oficinaId) === String(o.id)}
                    onClick={() => setOficinaId((prev) => (String(prev) === String(o.id) ? "" : String(o.id ?? "")))}
                  />
                ))}
              </div>
            ) : (
              <div className="mb-4 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3.5 py-2.5 text-[13px] text-suave dark:text-suave-dark">
                Esta lista es una <span className="font-medium text-titulo dark:text-titulo-dark">ayuda</span>: son los
                clientes para contactar hoy. Antes de escribirles,{" "}
                <span className="font-medium text-duo-rojo">verificá el estado de la cuota en la app</span>.
              </div>
            )}

            {/* Filtros */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 mb-3">
              {esAdmin && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {FILTROS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltro(f.id)}
                    className={`h-9 px-3 rounded-lg border text-[13px] font-medium transition-colors cursor-pointer ${
                      filtro === f.id
                        ? "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] border-duo-azul text-duo-azul"
                        : "bg-card dark:bg-card-dark border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-duo-azul/50"
                    }`}
                  >
                    {f.label}
                    <span className="ml-1.5 text-[11px] opacity-80 tabular-nums">{conteos[f.id]}</span>
                  </button>
                ))}
              </div>
              )}

              <div className="flex items-center gap-2 lg:ml-auto flex-wrap">
                {esAdmin && (
                  <>
                    <input
                      type="date"
                      value={fecha}
                      max={hoyIso}
                      onChange={(e) => setFecha(e.target.value || hoyIso)}
                      className="h-9 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-2.5 text-[13px] text-titulo dark:text-titulo-dark outline-none focus:border-duo-azul"
                    />
                    <select
                      value={oficinaId}
                      onChange={(e) => setOficinaId(e.target.value)}
                      className="h-9 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-2.5 text-[13px] text-titulo dark:text-titulo-dark outline-none focus:border-duo-azul cursor-pointer"
                    >
                      <option value="">Todas las oficinas</option>
                      {oficinas.map((o) => (
                        <option key={o.id ?? "sin"} value={String(o.id ?? "")}>
                          {o.nombre}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <div className="relative flex-1 min-w-[180px] lg:w-64 lg:flex-none">
                  <HiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar cliente o patente"
                    className="w-full h-9 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark pl-8 pr-2.5 text-[13px] text-titulo dark:text-titulo-dark outline-none focus:border-duo-azul"
                  />
                </div>
              </div>
            </div>

            {esAdmin && !esHoy && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3.5 py-2 text-[13px] text-suave dark:text-suave-dark">
                <span>
                  Estás viendo el <span className="font-medium text-titulo dark:text-titulo-dark">{fmtDia(data?.fecha)}</span>
                </span>
                <button type="button" onClick={() => setFecha(hoyIso)} className="text-duo-azul font-medium cursor-pointer">
                  Volver a hoy
                </button>
              </div>
            )}

            {/* Lista */}
            <div className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark overflow-hidden">
              {cargando ? (
                <div className="px-4 py-10 text-center text-[13px] text-suave dark:text-suave-dark">Cargando mensajes…</div>
              ) : error ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-[13px] text-duo-rojo">{error}</p>
                  <button type="button" onClick={() => cargar()} className="mt-2 text-[13px] text-duo-azul font-medium cursor-pointer">
                    Reintentar
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="px-4 py-10 text-center text-[13px] text-suave dark:text-suave-dark">
                  {base.length === 0
                    ? esHoy
                      ? esAdmin
                        ? "Hoy no hay mensajes para mandar"
                        : "Hoy no hay clientes para contactar"
                      : "Ese día no hubo mensajes"
                    : "No hay mensajes con este filtro"}
                </div>
              ) : (
                items.map((it) => (
                  <FilaMensaje
                    key={it.id}
                    item={it}
                    esAdmin={esAdmin}
                    verOficina={esAdmin && !oficinaId}
                    marcando={marcandoId === it.id}
                    onAccion={accionar}
                    onNoMandar={setNoMandarItem}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      <ModalNoMandar
        item={noMandarItem}
        guardando={!!noMandarItem && marcandoId === noMandarItem.id}
        onClose={() => setNoMandarItem(null)}
        onConfirmar={(payload) => noMandarItem && accionar(noMandarItem, payload)}
      />
      <ReporteContactosModal open={showReporte} onClose={() => setShowReporte(false)} />
    </div>
  );
}