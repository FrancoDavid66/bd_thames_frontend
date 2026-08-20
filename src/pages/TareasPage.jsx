/* src/pages/TareasPage.jsx
 *
 * Página de "Tareas del día" — DISEÑO DE TARJETAS.
 *
 * Pantalla de inicio: tarjetas grandes con el contador de pendientes.
 *   1) Verificar alta en la compañía  (azul)
 *   2) Enviar póliza al cliente        (verde)
 *   3) Revisar comprobantes            (rojo de marca)
 *   4) Renovar con cuponera            (violeta)  ← solo si hay
 *   5) Configurar coberturas           (amarillo) ← solo si hay
 *
 * Las tres primeras se resuelven acá mismo con un tap. Las dos últimas NO:
 * la de renovación manda a Renovaciones y la de coberturas al Admin. En las
 * dos, la tarea desaparece sola cuando se hizo el trabajo — no hay que
 * tildar nada.
 * El usuario toca una y recién ahí ve la lista de ESA tarea (sin abrumar).
 * Cada póliza se resuelve con 1 tap en el ✓ y desaparece de su lista.
 * Botón ← para volver a elegir la otra tarea.
 *
 * Lógica:
 *  - "enviar" usa el thunk Redux marcarPolizaEnviada (ya existente).
 *  - "verificar alta" pega directo a /tareas/marcar-alta/ con api.
 *  - Paleta Duo (duo-azul / duo-verde) + tokens UI de tareasUI.js.
 */
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  HiRefresh, HiCheck, HiCheckCircle, HiPaperAirplane, HiShieldCheck,
  HiArrowLeft, HiReceiptTax, HiX, HiExternalLink, HiTicket, HiCog, HiUpload,
} from "react-icons/hi";
import { Link } from "react-router-dom";

import { fetchTareasDia, marcarPolizaEnviada } from "../store/slices/tareasSlice";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { UI } from "../components/tareas/tareasUI";

/* 🔗 Base del Admin de Django.
   `api` apunta al backend con /api al final (ej: https://xxx.railway.app/api).
   El Admin vive en la misma casa pero sin ese sufijo: se lo sacamos. Así el
   link anda igual en local y en Railway, sin hardcodear nada. */
const ADMIN_BASE = (() => {
  try {
    return String(api?.defaults?.baseURL || "").replace(/\/api\/?$/, "").replace(/\/+$/, "");
  } catch {
    return "";
  }
})();

/* Definición de las 2 secciones del panel. */
const SECCIONES = [
  {
    key: "verificar_alta",
    titulo: "Verificar alta en la compañía",
    sub: "Confirmá que quedó activa",
    icon: HiShieldCheck,
    color: "azul", // duo-azul
  },
  {
    key: "enviar_poliza",
    titulo: "Enviar póliza al cliente",
    sub: "Mandásela por WhatsApp",
    icon: HiPaperAirplane,
    color: "verde", // duo-verde
  },
  {
    // 📎 Comprobantes que subieron los clientes desde el Portal.
    //    Se diferencia de las otras dos: no se resuelve con un solo tap,
    //    hay que MIRAR la foto antes de confirmar. Por eso la fila tiene
    //    dos botones (ver / confirmar) y no uno.
    key: "revisar_comprobantes",
    titulo: "Revisar comprobantes",
    sub: "Los clientes ya pagaron",
    icon: HiReceiptTax,
    color: "marca", // rojo de Thames
  },
  {
    // 🎟️ AMCA y La Equidad NO se renuevan solas: sus cuotas tienen fechas e
    //    importes irregulares que solo están en el papel. Quedan esperando a
    //    que alguien suba el PDF de la póliza nueva.
    //
    //    Sin esta tarjeta, si nadie entraba a Renovaciones nadie se enteraba:
    //    pasaba el mes y el cliente se quedaba sin cobertura.
    key: "renovar_cuponera",
    titulo: "Renovar con cuponera",
    sub: "Falta subir la póliza nueva",
    icon: HiTicket,
    color: "violeta",
  },
  {
    // 🤖 Coberturas que el sistema dedujo de un PDF y nadie confirmó.
    //    Nunca frena un alta: la póliza ya se creó. Esto es un control.
    key: "configurar_cobertura",
    titulo: "Configurar coberturas",
    sub: "Las armó el sistema desde el PDF",
    icon: HiCog,
    color: "amarillo",
  },
];

/* Clases completas por color (Tailwind no soporta clases dinámicas).
   🦉 Look Duolingo: tarjeta con relieve 3D (borde de color + sombra inferior
   gruesa que se "hunde" al presionar), ícono con fondo de color PLENO y chip
   de contador jugoso. */
const COLOR = {
  azul: {
    // Tarjeta 3D: borde grueso de color + sombra inferior 6px que se hunde.
    card3d:
      "border-duo-azul bg-card dark:bg-card-dark " +
      "shadow-[0_6px_0_var(--color-duo-azul-sombra)] " +
      "active:translate-y-[5px] active:shadow-[0_1px_0_var(--color-duo-azul-sombra)]",
    icoBg: "bg-duo-azul text-white shadow-[0_3px_0_var(--color-duo-azul-sombra)]",
    icoChip: "bg-duo-azul/15 text-duo-azul",
    chip: "bg-duo-azul text-white",
    num: "text-duo-azul",
  },
  verde: {
    card3d:
      "border-duo-verde bg-card dark:bg-card-dark " +
      "shadow-[0_6px_0_var(--color-duo-verde-sombra)] " +
      "active:translate-y-[5px] active:shadow-[0_1px_0_var(--color-duo-verde-sombra)]",
    icoBg: "bg-duo-verde text-white shadow-[0_3px_0_var(--color-duo-verde-sombra)]",
    icoChip: "bg-duo-verde/15 text-duo-verde",
    chip: "bg-duo-verde text-white",
    num: "text-duo-verde",
  },
  // Violeta = documentación de por medio. Es el mismo color que usa
  // Renovaciones para las de cuponera: se reconocen entre pantallas.
  violeta: {
    card3d:
      "border-duo-violeta bg-card dark:bg-card-dark " +
      "shadow-[0_6px_0_var(--color-duo-violeta-sombra)] " +
      "active:translate-y-[5px] active:shadow-[0_1px_0_var(--color-duo-violeta-sombra)]",
    icoBg: "bg-duo-violeta text-white shadow-[0_3px_0_var(--color-duo-violeta-sombra)]",
    icoChip: "bg-duo-violeta/15 text-duo-violeta",
    chip: "bg-duo-violeta text-white",
    num: "text-duo-violeta",
  },
  // Amarillo = "mirá esto". No es urgencia ni error: es algo que el sistema
  // resolvió solo y conviene confirmar.
  // 🎨 Sobre amarillo el blanco no se lee: va el tono oscuro del mismo color.
  amarillo: {
    card3d:
      "border-duo-amarillo bg-card dark:bg-card-dark " +
      "shadow-[0_6px_0_var(--color-duo-amarillo-sombra)] " +
      "active:translate-y-[5px] active:shadow-[0_1px_0_var(--color-duo-amarillo-sombra)]",
    icoBg:
      "bg-duo-amarillo text-duo-amarillo-sombra shadow-[0_3px_0_var(--color-duo-amarillo-sombra)]",
    icoChip: "bg-duo-amarillo/20 text-duo-amarillo-sombra dark:text-duo-amarillo",
    chip: "bg-duo-amarillo text-duo-amarillo-sombra",
    num: "text-duo-amarillo",
  },
  // Rojo de marca para los comprobantes: es plata que entró, merece el color
  // de la casa y no uno más del set.
  marca: {
    card3d:
      "border-marca bg-card dark:bg-card-dark " +
      "shadow-[0_6px_0_#8E0000] " +
      "active:translate-y-[5px] active:shadow-[0_1px_0_#8E0000]",
    icoBg: "bg-marca text-white shadow-[0_3px_0_#8E0000]",
    icoChip: "bg-marca/15 text-marca",
    chip: "bg-marca text-white",
    num: "text-marca",
  },
};

export default function TareasPage() {
  const dispatch = useDispatch();
  const { data, loading, marcando } = useSelector((s) => s.tareas);
  const { user } = useAuth();
  const isAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const [oficinas, setOficinas] = useState([]);
  const [oficinaSel, setOficinaSel] = useState(""); // "" = todas
  const [abierta, setAbierta] = useState(null);     // key de la sección abierta (o null = inicio)
  const [marcandoCupon, setMarcandoCupon] = useState(null); // cupón que se está confirmando
  const [marcandoAlta, setMarcandoAlta] = useState(null); // poliza_id en curso (alta)
  const [hechasHoy, setHechasHoy] = useState(0);    // contador de completadas en la sesión

  // Recargar al cambiar de oficina
  useEffect(() => {
    dispatch(fetchTareasDia(oficinaSel ? { oficina: oficinaSel } : {}));
  }, [dispatch, oficinaSel]);

  // Cargar oficinas (solo admin)
  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    (async () => {
      try {
        const res = await api.get("/usuarios/oficinas/");
        const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
        if (alive) setOficinas(arr);
      } catch { if (alive) setOficinas([]); }
    })();
    return () => { alive = false; };
  }, [isAdmin]);

  const recargar = () => dispatch(fetchTareasDia(oficinaSel ? { oficina: oficinaSel } : {}));

  // Conteos por sección
  const conteos = useMemo(() => {
    const out = {};
    SECCIONES.forEach((s) => { out[s.key] = (data?.[s.key] || []).length; });
    return out;
  }, [data]);
  const totalPend = SECCIONES.reduce((a, s) => a + (conteos[s.key] || 0), 0);

  // Acción enviar (Redux)
  const onEnviar = async (polizaId) => {
    const res = await dispatch(marcarPolizaEnviada(polizaId));
    if (marcarPolizaEnviada.fulfilled.match(res)) {
      toast.success("Marcada como enviada ✅");
      setHechasHoy((n) => n + 1);
    } else toast.error(res.payload || "No se pudo marcar.");
  };

  // Acción verificar alta (api directo)
  const onVerificarAlta = async (polizaId) => {
    setMarcandoAlta(polizaId);
    try {
      await api.post("/tareas/marcar-alta/", { poliza_id: polizaId });
      toast.success("Alta verificada ✅");
      setHechasHoy((n) => n + 1);
      recargar();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo marcar.");
    } finally {
      setMarcandoAlta(null);
    }
  };

  /* 📎 Confirmar o rechazar un comprobante.
     Confirmar → el cupón pasa a PAGADA.
     Rechazar  → vuelve a PENDIENTE y se borra el archivo, así el cliente
                 puede subir otro (foto borrosa, comprobante de otro pago…). */
  const onComprobante = async (cuponId, aprobado) => {
    setMarcandoCupon(cuponId);
    try {
      await api.post("/tareas/confirmar-comprobante/", { cupon_id: cuponId, aprobado });
      toast.success(aprobado ? "Pago confirmado ✅" : "Comprobante rechazado");
      if (aprobado) setHechasHoy((n) => n + 1);
      recargar();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo registrar.");
    } finally {
      setMarcandoCupon(null);
    }
  };

  const secAbierta = SECCIONES.find((s) => s.key === abierta) || null;
  const items = secAbierta ? (data?.[secAbierta.key] || []) : [];

  /* ── fila de un COMPROBANTE ──
     No se resuelve con un solo tap como las otras dos: hay que MIRAR la foto
     antes de decidir. Por eso son tres botones: ver, rechazar, confirmar. */
  const FilaComprobante = ({ item }) => {
    const enCurso = marcandoCupon === item.cupon_id;
    const c = COLOR.marca;

    return (
      <motion.div layout exit={{ opacity: 0, x: 40 }}
        className={`${UI.card} px-4 py-3`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-black truncate ${UI.txtTitulo}`}>{item.cliente}</span>
          {item.patente && item.patente !== "—" && (
            <span className={`shrink-0 rounded-md ${c.icoChip} px-1.5 py-0.5 text-[11px] font-mono font-bold tracking-wide`}>
              {item.patente}
            </span>
          )}
        </div>

        <div className={`text-xs mt-0.5 ${UI.txtSuave}`}>
          {[item.vehiculo, item.compania].filter(Boolean).join(" · ")}
        </div>

        <div className={`text-xs mt-1 ${UI.txtSuave}`}>
          Vence {item.vence}
          {item.monto ? ` · $${Math.round(item.monto).toLocaleString("es-AR")}` : ""}
          {item.reportado_en ? ` · subido ${item.reportado_en}` : ""}
        </div>

        <div className="flex items-center gap-2 mt-3">
          {/* Ver el comprobante: abre en pestaña nueva. Es lo PRIMERO que hay
              que hacer — confirmar sin mirar no tiene sentido. */}
          <a
            href={item.comprobante_url}
            target="_blank"
            rel="noreferrer"
            className="flex-1 h-11 rounded-2xl border-2 border-linea dark:border-linea-dark inline-flex items-center justify-center gap-1.5 text-sm font-black text-titulo dark:text-titulo-dark"
          >
            <HiExternalLink className="w-4 h-4" /> Ver comprobante
          </a>

          <button
            onClick={() => onComprobante(item.cupon_id, false)}
            disabled={enCurso}
            aria-label="Rechazar"
            title="El comprobante no sirve"
            className="w-11 h-11 shrink-0 rounded-2xl border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark inline-flex items-center justify-center disabled:opacity-50"
          >
            <HiX className="w-5 h-5" />
          </button>

          <button
            onClick={() => onComprobante(item.cupon_id, true)}
            disabled={enCurso}
            aria-label="Confirmar pago"
            className="w-11 h-11 shrink-0 rounded-2xl border-none bg-duo-verde text-white shadow-[0_3px_0_var(--color-duo-verde-sombra)] active:translate-y-0.5 active:shadow-[0_1px_0_var(--color-duo-verde-sombra)] inline-flex items-center justify-center transition-all disabled:opacity-50"
          >
            <HiCheck className="w-6 h-6" />
          </button>
        </div>
      </motion.div>
    );
  };

  /* ── fila de una RENOVACIÓN con cuponera ──
     No se tilda: se resuelve en Renovaciones, subiendo el PDF de la póliza
     nueva. Al crearse la renovación (o al marcar "no renueva"), la fila
     desaparece sola de esta lista. */
  const FilaRenovacion = ({ item }) => {
    const c = COLOR.violeta;
    const vencida = !!item.vencida;

    return (
      <motion.div layout exit={{ opacity: 0, x: 40 }}
        className={`${UI.card} px-4 py-3`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-black truncate ${UI.txtTitulo}`}>{item.cliente}</span>
          {item.patente && item.patente !== "—" && (
            <span className={`shrink-0 rounded-md ${c.icoChip} px-1.5 py-0.5 text-[11px] font-mono font-bold tracking-wide`}>
              {item.patente}
            </span>
          )}
        </div>

        <div className={`text-xs mt-0.5 ${UI.txtSuave}`}>
          {[item.vehiculo, item.compania].filter(Boolean).join(" · ")}
        </div>

        {/* El plazo es lo que decide la urgencia: rojo si ya se venció. */}
        <div className={`text-xs mt-1 font-bold ${vencida ? "text-duo-rojo" : UI.txtSuave}`}>
          {vencida
            ? `Venció el ${item.vence} — hace ${Math.abs(item.dias)} ${Math.abs(item.dias) === 1 ? "día" : "días"}`
            : item.dias === 0
            ? `Vence hoy (${item.vence})`
            : `Vence el ${item.vence} — en ${item.dias} ${item.dias === 1 ? "día" : "días"}`}
        </div>

        <Link
          to="/polizas/renovaciones"
          className="mt-3 w-full h-11 rounded-2xl border-none bg-duo-violeta text-white shadow-[0_3px_0_var(--color-duo-violeta-sombra)] active:translate-y-0.5 active:shadow-[0_1px_0_var(--color-duo-violeta-sombra)] inline-flex items-center justify-center gap-1.5 text-sm font-black transition-all"
        >
          <HiUpload className="w-4 h-4" /> Subir la póliza nueva
        </Link>
      </motion.div>
    );
  };

  /* ── fila de una COBERTURA sin revisar ──
     Tampoco tiene ✓: se resuelve editándola en el Admin. Al guardar ahí, la
     marca `autoconfigurada` se apaga sola y la fila desaparece.

     Es el papelito que el sistema dejó pegado en la heladera con la receta
     como la entendió. Alguien pasa, la lee y lo saca. */
  const FilaCobertura = ({ item }) => {
    const c = COLOR.amarillo;

    return (
      <motion.div layout exit={{ opacity: 0, x: 40 }}
        className={`${UI.card} px-4 py-3`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-black truncate ${UI.txtTitulo}`}>{item.nombre}</span>
          <span className={`shrink-0 rounded-md ${c.icoChip} px-1.5 py-0.5 text-[11px] font-bold tracking-wide`}>
            {item.compania}
          </span>
        </div>

        {/* Lo que el sistema dedujo del PDF: es lo que hay que confirmar. */}
        <div className={`text-xs mt-1 flex items-center gap-1.5 ${UI.txtSuave}`}>
          <HiTicket className="w-3.5 h-3.5 shrink-0" />
          <span>
            {item.cuotas} {item.cuotas === 1 ? "cuota" : "cuotas"}
            {" · "}
            {item.genera_cupones ? "con cuponera" : "sin cuponera"}
          </span>
        </div>

        <div className={`text-xs mt-0.5 ${UI.txtSuave}`}>
          {item.polizas} {item.polizas === 1 ? "póliza usa" : "pólizas usan"} esta cobertura
        </div>

        <a
          href={`${ADMIN_BASE}/admin/cotizaciones/tipocobertura/${item.cobertura_id}/change/`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 w-full h-11 rounded-2xl border-none bg-duo-amarillo text-duo-amarillo-sombra shadow-[0_3px_0_var(--color-duo-amarillo-sombra)] active:translate-y-0.5 active:shadow-[0_1px_0_var(--color-duo-amarillo-sombra)] inline-flex items-center justify-center gap-1.5 text-sm font-black transition-all"
        >
          <HiExternalLink className="w-4 h-4" /> Revisar en el Admin
        </a>
      </motion.div>
    );
  };

  /* ── fila de una póliza ── */
  const Fila = ({ sec, item }) => {
    const pat = (item.patente_real || item.patente || "").trim();
    const patente = pat && pat !== "—" ? pat : "";
    const sub = [item.vehiculo, item.compania].filter(Boolean).join(" · ");

    const esEnvio = sec.key === "enviar_poliza";
    const enCurso = esEnvio ? (marcando === item.poliza_id) : (marcandoAlta === item.poliza_id);
    const onClick = () => (esEnvio ? onEnviar(item.poliza_id) : onVerificarAlta(item.poliza_id));
    const c = COLOR[sec.color];

    return (
      <motion.div layout exit={{ opacity: 0, x: 40 }}
        className={`${UI.card} flex items-center gap-3 px-4 py-3`}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-black truncate ${UI.txtTitulo}`}>{item.cliente}</span>
            {patente && (
              <span className={`shrink-0 rounded-md ${c.icoBg} px-1.5 py-0.5 text-[11px] font-mono font-bold tracking-wide`}>{patente}</span>
            )}
          </div>
          {sub && <div className={`text-xs truncate mt-0.5 ${UI.txtSuave}`}>{sub}</div>}
        </div>
        <button onClick={onClick} disabled={enCurso} aria-label="Marcar como hecha"
          className="w-11 h-11 shrink-0 rounded-2xl border-none bg-duo-verde text-white shadow-[0_3px_0_var(--color-duo-verde-sombra)] active:translate-y-0.5 active:shadow-[0_1px_0_var(--color-duo-verde-sombra)] inline-flex items-center justify-center transition-all disabled:opacity-50">
          <HiCheck className="w-6 h-6" />
        </button>
      </motion.div>
    );
  };

  return (
    <div className={`${UI.screen} px-4 py-6 sm:px-6 lg:px-8`}>
      <div className="max-w-2xl mx-auto">

        <AnimatePresence mode="wait">
          {/* ═══════════ PANTALLA DE INICIO (elegir tarea) ═══════════ */}
          {!secAbierta ? (
            <motion.div key="inicio"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Header */}
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="min-w-0">
                  <div className={`text-sm ${UI.txtSuave}`}>
                    Tareas de hoy{data?.oficina && data.oficina !== "Todas" ? ` · Oficina ${data.oficina}` : ""}
                  </div>
                  <div className={`text-lg font-black mt-0.5 ${UI.txtTitulo}`}>¿Qué querés hacer?</div>
                </div>
                <button onClick={recargar} aria-label="Actualizar"
                  className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:bg-titulo/5 dark:hover:bg-white/5 text-suave dark:text-suave-dark transition-colors">
                  <HiRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Selector de oficina (solo admin) */}
              {isAdmin && oficinas.length > 0 && (
                <div className="mb-4">
                  <select value={oficinaSel} onChange={(e) => setOficinaSel(e.target.value)} className={UI.input}>
                    <option value="">Todas las oficinas</option>
                    {oficinas.map((o) => (
                      <option key={o.id} value={o.id}>{o.nombre || o.oficina_nombre || `Oficina ${o.id}`}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 🦉 2 tarjetas grandes estilo Duolingo (relieve 3D) */}
              <div className="flex flex-col gap-4">
                {SECCIONES.map((sec) => {
                  const c = COLOR[sec.color];
                  const n = conteos[sec.key] || 0;
                  // 🙈 Estas dos casi siempre están en 0. Mostrarlas vacías
                  //    llenaría la pantalla de tarjetas muertas y le sacaría
                  //    peso a las tres de todos los días.
                  if (n === 0 && (sec.key === "configurar_cobertura" || sec.key === "renovar_cuponera")) {
                    return null;
                  }
                  return (
                    <button key={sec.key} onClick={() => setAbierta(sec.key)}
                      className={`${c.card3d} border-[3px] rounded-3xl flex items-center gap-4 p-5 text-left transition-all`}>
                      {/* Ícono con fondo de color PLENO + su propio relieve */}
                      <span className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${c.icoBg}`}>
                        <sec.icon className="w-9 h-9" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-base sm:text-lg font-black leading-tight ${UI.txtTitulo}`}>{sec.titulo}</span>
                        <span className={`block text-[13px] font-bold mt-1 ${UI.txtSuave}`}>{sec.sub}</span>
                      </span>
                      {/* Contador en chip jugoso de color */}
                      <span className={`shrink-0 min-w-[54px] px-2 py-2 rounded-2xl flex flex-col items-center justify-center ${c.chip}`}>
                        <span className="text-2xl font-black leading-none">{n}</span>
                        <span className="text-[10px] font-black uppercase tracking-wide opacity-90">pend.</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Pie: completadas */}
              <div className="mt-5 pt-4 border-t-2 border-linea dark:border-linea-dark flex items-center justify-center gap-2">
                <HiCheckCircle className="w-4 h-4 text-duo-verde" />
                <span className={`text-xs font-bold ${UI.txtSuave}`}>
                  {hechasHoy > 0 ? `${hechasHoy} completadas en esta sesión` : "Elegí una tarea para empezar"}
                </span>
              </div>
            </motion.div>
          ) : (
            /* ═══════════ LISTA DE UNA TAREA ═══════════ */
            <motion.div key="lista"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>

              {/* Header de la lista */}
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => setAbierta(null)} aria-label="Volver"
                  className="w-10 h-10 shrink-0 rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:bg-titulo/5 dark:hover:bg-white/5 inline-flex items-center justify-center transition-colors">
                  <HiArrowLeft className={`w-5 h-5 ${UI.txtTitulo}`} />
                </button>
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${COLOR[secAbierta.color].icoBg}`}>
                  <secAbierta.icon className="w-6 h-6" />
                </span>
                <div className="min-w-0">
                  <div className={`text-[15px] font-black truncate ${UI.txtTitulo}`}>{secAbierta.titulo}</div>
                  <div className={`text-xs ${UI.txtSuave}`}>{items.length} pendientes</div>
                </div>
                <button onClick={recargar} aria-label="Actualizar"
                  className="ml-auto shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:bg-titulo/5 dark:hover:bg-white/5 text-suave dark:text-suave-dark transition-colors">
                  <HiRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* 💡 Estas dos tareas no se tildan: se resuelven en otro lado.
                     Sin este renglón el operador busca el ✓ y no lo encuentra. */}
              {secAbierta.key === "renovar_cuponera" && items.length > 0 && (
                <div className={`${UI.card} px-4 py-3 mb-2 text-xs ${UI.txtSuave}`}>
                  Estas compañías no se renuevan solas: las cuotas y los cupones
                  solo están en el papel. Subí la póliza nueva desde Renovaciones
                  y la tarea se va sola.
                </div>
              )}
              {secAbierta.key === "configurar_cobertura" && items.length > 0 && (
                <div className={`${UI.card} px-4 py-3 mb-2 text-xs ${UI.txtSuave}`}>
                  El sistema armó estas coberturas mirando el PDF. Revisá que las
                  cuotas y la cuponera estén bien. Al guardar en el Admin
                  desaparecen solas de esta lista.
                </div>
              )}

              {/* Lista o vacío */}
              {loading && items.length === 0 ? (
                <div className={`${UI.card} px-4 py-10 text-center text-sm ${UI.txtSuave}`}>Cargando…</div>
              ) : items.length === 0 ? (
                <div className={`${UI.card} px-6 py-12 text-center`}>
                  <HiCheckCircle className="w-14 h-14 mx-auto text-duo-verde" />
                  <div className={`mt-3 text-lg font-black ${UI.txtTitulo}`}>¡Todo hecho!</div>
                  <div className={`mt-1 text-sm ${UI.txtSuave}`}>No quedan pendientes en esta tarea 🎉</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      secAbierta.key === "revisar_comprobantes" ? (
                        <FilaComprobante key={`cup-${item.cupon_id}`} item={item} />
                      ) : secAbierta.key === "renovar_cuponera" ? (
                        <FilaRenovacion key={`reno-${item.poliza_id}`} item={item} />
                      ) : secAbierta.key === "configurar_cobertura" ? (
                        <FilaCobertura key={`cob-${item.cobertura_id}`} item={item} />
                      ) : (
                        <Fila key={`${secAbierta.key}-${item.poliza_id}`} sec={secAbierta} item={item} />
                      )
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}