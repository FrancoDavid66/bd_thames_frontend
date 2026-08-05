/* src/pages/ControlDiarioPage.jsx
 *
 * Control diario (tareas recurrentes con foto) — REDISEÑO simple y claro.
 *
 * Ideas del rediseño:
 *   1) Tarjetas mínimas: ícono de estado + nombre + 1 línea chica. Sin saturar.
 *   2) Se ve qué falta: círculo + barra de progreso arriba, y las tareas
 *      separadas en "⏳ Falta hacer" (arriba) y "✅ Ya hechas" (abajo).
 *   3) Foto simple: un solo botón por tarea. El paso de responsable solo
 *      aparece en la 1ª foto. Botón bloqueado mientras sube (anti doble-envío).
 *   4) Una oficina a la vez: si hay varias (admin), selector de chips arriba.
 *
 * Paleta semántica real (surface/card/titulo/marca) con modo claro + oscuro.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  HiCheckCircle, HiCamera, HiX, HiCalendar, HiRefresh, HiArrowRight, HiPlus,
} from "react-icons/hi";
import api from "../services/api";
import { uploadToCloudinary } from "../utils/cloudinary";
import { UI } from "../components/tareas/tareasUI";
import WizardShell from "../components/tareas/WizardShell";

/* ── Visor de foto a pantalla grande (Duo claro/oscuro) ── */
function FotoModal({ foto, onClose }) {
  return (
    <AnimatePresence>
      {foto && (
        <motion.div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="relative max-h-[85vh] max-w-lg overflow-hidden rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark"
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}>
            <button onClick={onClose} className="absolute right-2 top-2 rounded-lg bg-card/90 dark:bg-card-dark/90 border-2 border-linea dark:border-linea-dark p-2 text-titulo dark:text-titulo-dark"><HiX className="text-xl" /></button>
            <img src={foto} alt="Foto de la tarea" className="max-h-[85vh] w-full object-contain" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Wizard: elegir quién hizo la tarea (usa WizardShell compartido) ── */
function WizardResponsable({ open, tarea, oficina, empleados, onClose, onElegido }) {
  const emps = empleados || [];
  return (
    <WizardShell open={open} titulo="¿Quién hizo esta tarea?"
      subtitulo={`${tarea?.nombre || ""} · ${oficina?.oficina_nombre || ""}`}
      pasoActual={0} totalPasos={2} onClose={onClose} maxW="max-w-md">
      <div className="p-6">
        {emps.length === 0 ? (
          <div className={`rounded-xl border-2 border-linea dark:border-linea-dark p-4 text-center text-[13px] ${UI.txtSuave}`}>
            No hay empleados cargados en esta oficina.
            <button onClick={() => onElegido(null)} className={`mt-3 w-full rounded-lg py-2.5 text-[13px] ${UI.btnPrimary}`}>Subir igual sin responsable</button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {emps.map((e) => (
              <button key={e.id} onClick={() => onElegido(e.id)}
                className="flex items-center gap-3 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3 text-left transition hover:border-marca hover:bg-marca/10">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marca/15 text-[12px] font-bold text-marca">
                  {String(e.nombre || "").slice(0, 2).toUpperCase()}
                </span>
                <span className={`flex-1 text-[14px] font-semibold ${UI.txtTitulo}`}>{e.nombre}</span>
                <HiArrowRight className={UI.txtSuave} />
              </button>
            ))}
          </div>
        )}
        <div className={`mt-3 text-center text-[11px] ${UI.txtSuave}`}>Después de elegir se abre la cámara 📸</div>
      </div>
    </WizardShell>
  );
}

/* ── Tarjeta de tarea (mínima) ── */
function TareaFila({ tarea, oficina, empleados, onCumplida, subiendo, setSubiendo, setFoto }) {
  const ref = useRef(null);
  const respRef = useRef(null);
  const key = `${tarea.tarea_id}-${oficina.oficina_id}`;
  const cargando = subiendo === key;
  const [wizard, setWizard] = useState(false);

  const fotos = tarea.fotos || [];
  const fmin = tarea.fotos_min || 1;
  const fmax = tarea.fotos_max || 1;
  const subidas = tarea.fotos_subidas != null ? tarea.fotos_subidas : (tarea.cumplida ? 1 : 0);
  const done = tarea.cumplida;
  const puedeSumar = tarea.puede_sumar != null ? tarea.puede_sumar : (subidas < fmax);
  const yaEligioResp = subidas > 0;
  const variasFotos = fmin > 1 || fmax > 1;
  const faltan = Math.max(0, fmin - subidas);
  const quienHizo = tarea.responsable_real || tarea.cumplido_por || "";

  const onSubirClick = () => {
    if (cargando) return;
    if (!yaEligioResp) setWizard(true);
    else setTimeout(() => ref.current?.click(), 0);
  };
  const onElegido = (empId) => {
    respRef.current = empId;
    setWizard(false);
    setTimeout(() => ref.current?.click(), 80);
  };
  const pick = async (file) => {
    if (!file || cargando) return;                 // 🔒 anti doble-envío
    if (!(file.type || "").startsWith("image/")) { toast.error("Tiene que ser una foto"); return; }
    setSubiendo(key);
    try {
      const { secure_url, public_id } = await uploadToCloudinary(file, "de-thames/tareas-fijas");
      if (!secure_url) throw new Error("Sin URL");
      const res = await api.post("tareas-fijas/cumplir/", {
        tarea_id: tarea.tarea_id, oficina_id: oficina.oficina_id,
        foto_url: secure_url, foto_public_id: public_id || "",
        responsable_empleado_id: respRef.current || "",
      });
      const d = res?.data || {};
      if (d.cumplida) toast.success(d.puntos ? `¡Completa! +${d.puntos} pts` : "¡Tarea completa! ✅");
      else toast.success(`Foto subida (${d.fotos_subidas}/${d.fotos_min})`);
      onCumplida();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo subir");
    } finally {
      setSubiendo(null);
    }
  };

  // Meta de la línea chica (solo responsable/hora; el progreso de fotos va aparte)
  const meta = done
    ? `${quienHizo ? `por ${quienHizo}` : "hecha"}${tarea.cargado_por_admin ? " (admin)" : ""}${tarea.hora_esperada ? ` · ${tarea.hora_esperada}` : ""}`
    : `${tarea.responsable || "Sin responsable"}${tarea.hora_esperada ? ` · ${tarea.hora_esperada}` : ""}`;

  return (
    <>
      <motion.div layout
        className={`rounded-2xl border-2 p-3.5 transition ${
          done ? "border-ingreso/35 bg-ingreso/[0.06]" : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark"
        }`}>
        <div className="flex items-center gap-3.5">
          {/* Ícono de estado */}
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
            done ? "bg-ingreso text-white" : "bg-marca/15 text-marca"
          }`}>
            {done ? <HiCheckCircle /> : <HiCamera />}
          </div>

          {/* Nombre + meta */}
          <div className="min-w-0 flex-1" onClick={() => fotos[0] && setFoto(fotos[0].url)}>
            <div className={`text-[15px] font-bold leading-tight ${done ? "text-ingreso" : UI.txtTitulo}`}>{tarea.nombre}</div>
            <div className={`text-[12px] mt-0.5 ${UI.txtSuave}`}>{meta}</div>
          </div>

          {/* Acción a la derecha */}
          <div className="shrink-0">
            {done ? (
              <HiCheckCircle className="text-ingreso text-2xl" />
            ) : puedeSumar ? (
              <button onClick={onSubirClick} disabled={cargando}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] ${UI.btnPrimary}`}>
                {cargando
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  : subidas === 0
                    ? <><HiCamera className="text-sm" /> Subir</>
                    : <><HiPlus className="text-sm" /> {faltan > 0 ? `Falta ${faltan}` : "Foto"}</>}
              </button>
            ) : null}
          </div>
        </div>

        {/* 🆕 Instrucción de foto DESTACADA (qué tiene que mostrar la foto) */}
        {tarea.instruccion_foto && !done ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border-2 border-oficina/25 bg-oficina/[0.08] px-3 py-2">
            <HiCamera className="mt-0.5 shrink-0 text-oficina text-base" />
            <span className="text-[13px] font-semibold leading-snug text-oficina-fuerte dark:text-oficina-claro">{tarea.instruccion_foto}</span>
          </div>
        ) : null}

        {/* 🆕 Progreso de fotos VISTOSO: casilleros que se van llenando */}
        {variasFotos && !done ? (
          <div className="mt-3 flex items-center gap-2.5">
            <div className="flex gap-1.5">
              {Array.from({ length: fmin }).map((_, i) => (
                <span key={i}
                  className={`h-3 w-3 rounded-[5px] transition-colors ${
                    i < subidas ? "bg-marca" : "border-2 border-marca/30 bg-transparent"
                  }`} />
              ))}
            </div>
            <span className="text-[12px] font-bold text-marca">
              {subidas} de {fmin} fotos{fmax > fmin ? " (o más)" : ""}
            </span>
          </div>
        ) : null}
      </motion.div>

      <WizardResponsable open={wizard} tarea={tarea} oficina={oficina} empleados={empleados}
        onClose={() => setWizard(false)} onElegido={onElegido} />
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; pick(f); e.target.value = ""; }} />
    </>
  );
}

/* ── Anillo de progreso (SVG) ── */
function Anillo({ pct }) {
  const dash = `${Math.round(pct)} 100`;
  return (
    <svg viewBox="0 0 36 36" className="h-16 w-16 shrink-0">
      <path d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31" fill="none"
        className="stroke-titulo/10 dark:stroke-white/10" strokeWidth="4" />
      <path d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31" fill="none"
        stroke="var(--color-marca)" strokeWidth="4" strokeDasharray={dash} strokeLinecap="round" />
      <text x="18" y="21" textAnchor="middle" fontSize="9" fontWeight="800"
        className="fill-titulo dark:fill-titulo-dark">{Math.round(pct)}%</text>
    </svg>
  );
}

function mensaje(pct, faltan) {
  if (faltan === 0) return "¡Todo hecho por hoy! 🎉";
  if (pct >= 60) return `¡Ya casi! Faltan ${faltan} 💪`;
  if (pct >= 30) return `¡Buen ritmo! Faltan ${faltan}`;
  return `¡A darle! Faltan ${faltan} tareas`;
}

export default function ControlDiarioPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(null);
  const [foto, setFoto] = useState(null);
  const [ofiSel, setOfiSel] = useState(null); // oficina_id elegida (o null = primera)

  const cargar = async () => {
    try {
      const res = await api.get("tareas-fijas/dia/");
      setData(res.data);
    } catch {
      toast.error("No se pudieron cargar las tareas");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const oficinas = data?.oficinas || [];
  const variasOfis = oficinas.length > 1;

  // Oficina activa: la elegida, o la primera
  const ofiActiva = useMemo(() => {
    if (!oficinas.length) return null;
    return oficinas.find((o) => o.oficina_id === ofiSel) || oficinas[0];
  }, [oficinas, ofiSel]);

  // Separar tareas en pendientes / hechas
  const tareas = ofiActiva?.tareas || [];
  const pendientes = tareas.filter((t) => !t.cumplida);
  const hechas = tareas.filter((t) => t.cumplida);
  const total = tareas.length;
  const nHechas = hechas.length;
  const pct = total > 0 ? (nHechas / total) * 100 : 0;

  return (
    <div className={`${UI.screen} px-4 py-5`}>
      <div className="mx-auto max-w-lg lg:max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className={`text-2xl font-extrabold ${UI.txtTitulo}`}>Control diario</h1>
          <button onClick={() => { setLoading(true); cargar(); }}
            className="rounded-full border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-2 text-suave dark:text-suave-dark hover:opacity-70">
            <HiRefresh className={`text-lg ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {data?.fecha && <div className={`text-[13px] mt-0.5 flex items-center gap-1.5 ${UI.txtSuave}`}><HiCalendar className="text-sm" /> {data.fecha}</div>}

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-linea dark:border-linea-dark border-t-marca" />
          </div>
        ) : data?.feriado ? (
          <div className="mt-5 rounded-2xl border-2 border-tarjeta/25 bg-tarjeta/[0.07] p-5 text-center">
            <div className="text-base font-bold text-[#d97706] dark:text-tarjeta-claro">🎌 Feriado — {data.feriado_nombre}</div>
            <p className={`mt-1 text-[13px] ${UI.txtSuave}`}>Hoy no se esperan tareas fijas.</p>
          </div>
        ) : oficinas.length === 0 ? (
          <div className={`mt-5 rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-6 text-center ${UI.txtSuave}`}>
            No hay tareas fijas cargadas todavía.
          </div>
        ) : (
          <>
            {/* Selector de oficina (solo si hay varias) */}
            {variasOfis && (
              <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
                {oficinas.map((o) => {
                  const on = o.oficina_id === ofiActiva.oficina_id;
                  const okOfi = o.total > 0 && o.cumplidas === o.total;
                  return (
                    <button key={o.oficina_id} onClick={() => setOfiSel(o.oficina_id)}
                      className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold border-2 transition-colors ${
                        on ? "bg-marca border-marca text-white" : `border-linea dark:border-linea-dark ${UI.txtSuave}`
                      }`}>
                      {okOfi ? "✓ " : ""}{o.oficina_nombre}
                    </button>
                  );
                })}
              </div>
            )}

            {/* HERO: progreso grande */}
            <div className={`mt-3 mb-5 rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className={`text-[34px] font-extrabold leading-none ${UI.txtTitulo}`}>
                    {nHechas}<span className={`text-base font-semibold ${UI.txtSuave}`}> / {total} hechas</span>
                  </div>
                  <div className={`text-[13px] mt-1 ${UI.txtSuave}`}>{mensaje(pct, pendientes.length)}</div>
                </div>
                <Anillo pct={pct} />
              </div>
              <div className="h-3 rounded-full bg-titulo/10 dark:bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-marca transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* PENDIENTES */}
            {pendientes.length > 0 && (
              <>
                <div className={`flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-widest ${UI.txtSuave} mb-2.5 mx-1`}>
                  ⏳ Falta hacer <span className="rounded-full bg-marca/15 text-marca px-2 py-0.5 text-[11px]">{pendientes.length}</span>
                </div>
                <div className="flex flex-col gap-2.5 mb-6">
                  <AnimatePresence initial={false}>
                    {pendientes.map((t) => (
                      <TareaFila key={`${t.tarea_id}-${ofiActiva.oficina_id}`} tarea={t} oficina={ofiActiva}
                        empleados={ofiActiva.empleados} onCumplida={cargar}
                        subiendo={subiendo} setSubiendo={setSubiendo} setFoto={setFoto} />
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}

            {/* YA HECHAS */}
            {hechas.length > 0 && (
              <>
                <div className={`flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-widest ${UI.txtSuave} mb-2.5 mx-1`}>
                  ✅ Ya hechas <span className="rounded-full bg-ingreso/15 text-ingreso px-2 py-0.5 text-[11px]">{hechas.length}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  <AnimatePresence initial={false}>
                    {hechas.map((t) => (
                      <TareaFila key={`${t.tarea_id}-${ofiActiva.oficina_id}`} tarea={t} oficina={ofiActiva}
                        empleados={ofiActiva.empleados} onCumplida={cargar}
                        subiendo={subiendo} setSubiendo={setSubiendo} setFoto={setFoto} />
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}

            {/* Todo hecho */}
            {total > 0 && pendientes.length === 0 && (
              <div className="mt-6 text-center py-6">
                <HiCheckCircle className="w-14 h-14 mx-auto text-ingreso mb-2" />
                <div className={`text-lg font-bold ${UI.txtTitulo}`}>¡{ofiActiva.oficina_nombre} completó todo! 🎉</div>
              </div>
            )}
          </>
        )}
      </div>

      <FotoModal foto={foto} onClose={() => setFoto(null)} />
    </div>
  );
}
