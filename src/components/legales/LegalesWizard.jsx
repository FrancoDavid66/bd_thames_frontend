// src/components/legales/LegalesWizard.jsx
//
// 🆕 NUEVO EXPEDIENTE — wizard de 6 pasos (mismo patrón que SiniestrosWizard):
//   1. Persona (buscar por DNI o cargar a mano)
//   2. Tema
//   3. Detalle (relato + fecha del hecho + campos propios del tema elegido)
//   4. Abogado (opcional, sugiere por especialidad)
//   5. Fotos y papeles (borrador — se suben al crear)
//   6. Confirmar
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX, HiSearch, HiUser, HiBriefcase, HiUsers, HiTruck,
  HiExclamationCircle, HiHome, HiDotsHorizontal, HiCheck, HiDocumentText,
} from "react-icons/hi";
import toast from "react-hot-toast";

import api from "../../services/api";
import { fetchAbogados } from "../../store/slices/legalesSlice";
import { CAMPOS_POR_TEMA } from "./camposPorTema";

import Boton3D from "../ui/Boton3D";
import CardDuo from "../ui/CardDuo";
import InputDuo from "../ui/InputDuo";

import ExpedienteDocumentosPanel from "./ExpedienteDocumentosPanel";

const TEMAS = [
  { value: "LABORAL", label: "Laboral", desc: "Despidos, ART", icon: HiBriefcase },
  { value: "ACCIDENTE", label: "Accidente", desc: "Choques, lesiones", icon: HiTruck },
  { value: "FAMILIA", label: "Familia", desc: "Divorcios, cuotas", icon: HiUsers },
  { value: "PENAL", label: "Penal", desc: "Denuncias, causas", icon: HiExclamationCircle },
  { value: "PROPIEDAD", label: "Propiedad", desc: "Sucesiones, alquileres", icon: HiHome },
  { value: "OTRO", label: "Otro", desc: "A definir", icon: HiDotsHorizontal },
];

const STEPS = [
  { id: 1, label: "Persona" },
  { id: 2, label: "Tema" },
  { id: 3, label: "Detalle" },
  { id: 4, label: "Abogado" },
  { id: 5, label: "Fotos" },
  { id: 6, label: "Confirmar" },
];

const EMPTY = {
  cliente: null,
  persona_nombre: "",
  persona_apellido: "",
  persona_dni: "",
  persona_telefono: "",
  tema: "",
  relato: "",
  fecha_hecho: "",
  datos_tema: {},
  abogado: "",
};

export default function LegalesWizard({ isOpen, onClose, onSubmit }) {
  const dispatch = useDispatch();
  const abogados = useSelector((s) => s.legales.abogados);

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [draftDocumentos, setDraftDocumentos] = useState([]);

  const [dniInput, setDniInput] = useState("");
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [clienteEncontrado, setClienteEncontrado] = useState(null);

  useEffect(() => {
    dispatch(fetchAbogados());
  }, [dispatch]);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY);
    setStep(1);
    setDirection(1);
    setDraftDocumentos([]);
    setDniInput("");
    setClienteEncontrado(null);
  }, [isOpen]);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const setDatoTema = (key, value) =>
    setForm((prev) => ({ ...prev, datos_tema: { ...prev.datos_tema, [key]: value } }));

  // Campos propios del tema elegido (ej: Laboral → fechas de trabajo).
  // Vacío para temas que todavía no tienen campos propios definidos.
  const camposTema = useMemo(() => CAMPOS_POR_TEMA[form.tema] || [], [form.tema]);

  const goNext = () => { setDirection(1); setStep((s) => s + 1); };
  const goBack = () => { setDirection(-1); setStep((s) => s - 1); };

  const canNext = () => {
    if (step === 1) return !!(form.persona_nombre.trim() && form.persona_apellido.trim());
    if (step === 2) return !!form.tema;
    return true;
  };

  async function buscarPorDni() {
    const dni = dniInput.replace(/\D/g, "");
    if (!dni) { toast.error("Escribí un DNI para buscar."); return; }
    setBuscandoDni(true);
    try {
      const res = await api.get("clientes/", { params: { search: dni } });
      const arr = res?.data?.results || res?.data || [];
      const match = (Array.isArray(arr) ? arr : []).find(
        (c) => String(c.dni_cuit_cuil || "").replace(/\D/g, "") === dni
      );
      if (match) {
        setClienteEncontrado(match);
        setForm((f) => ({
          ...f,
          cliente: match.id,
          persona_nombre: match.nombre || "",
          persona_apellido: match.apellido || "",
          persona_dni: dni,
          persona_telefono: match.telefono || "",
        }));
        toast.success(`Cliente encontrado: ${match.nombre} ${match.apellido}`);
      } else {
        setClienteEncontrado(null);
        setForm((f) => ({ ...f, cliente: null, persona_dni: dni }));
        toast("No está en el sistema — cargalo a mano.");
      }
    } catch {
      setClienteEncontrado(null);
      setForm((f) => ({ ...f, cliente: null, persona_dni: dni }));
      toast.error("No se pudo buscar. Podés cargarlo a mano igual.");
    } finally {
      setBuscandoDni(false);
    }
  }

  function quitarCliente() {
    setClienteEncontrado(null);
    setForm((f) => ({ ...f, cliente: null }));
  }

  // Abogados activos, con los que trabajan el tema elegido primero.
  const abogadosOrdenados = useMemo(() => {
    const activos = (abogados || []).filter((a) => a.activo !== false);
    if (!form.tema) return activos.map((a) => ({ ...a, _sugerido: false }));
    const sugeridos = activos.filter((a) => (a.especialidades || []).includes(form.tema));
    const resto = activos.filter((a) => !(a.especialidades || []).includes(form.tema));
    return [
      ...sugeridos.map((a) => ({ ...a, _sugerido: true })),
      ...resto.map((a) => ({ ...a, _sugerido: false })),
    ];
  }, [abogados, form.tema]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        tema: form.tema,
        relato: form.relato.trim(),
        fecha_hecho: form.fecha_hecho || null,
        datos_tema: form.datos_tema || {},
        persona_nombre: form.persona_nombre.trim(),
        persona_apellido: form.persona_apellido.trim(),
        persona_dni: form.persona_dni.trim(),
        persona_telefono: form.persona_telefono.trim(),
      };
      if (form.cliente) payload.cliente = form.cliente;
      if (form.abogado) payload.abogado = form.abogado;

      await onSubmit(payload, draftDocumentos);
      onClose();
    } catch (err) {
      const detalle = err?.response?.data || err;
      if (detalle && typeof detalle === "object") {
        const entries = Object.entries(detalle).filter(([k]) => k !== "detail");
        if (entries.length > 0) {
          const [campo, msg] = entries[0];
          toast.error(`${campo}: ${Array.isArray(msg) ? msg[0] : msg}`);
        } else if (detalle.detail) {
          toast.error(String(detalle.detail));
        } else {
          toast.error("Error al crear el expediente");
        }
      } else {
        toast.error("Error al crear el expediente");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const slideVariants = {
    enter: (d) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  if (!isOpen) return null;

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.97, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 20 }}
        className="w-full max-w-lg max-h-[92vh] flex flex-col bg-card dark:bg-card-dark border border-linea dark:border-linea-dark rounded-t-2xl sm:rounded-2xl shadow-xl"
      >
        {/* Header: progreso */}
        <div className="shrink-0 px-5 sm:px-6 pt-5 pb-4 border-b border-linea dark:border-linea-dark">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-medium text-suave dark:text-suave-dark">
              Nuevo expediente — paso {step} de {STEPS.length}
            </p>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg text-suave dark:text-suave-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors"
            >
              <HiX className="w-4 h-4" />
            </button>
          </div>

          <div className="h-1.5 bg-surface dark:bg-surface-dark rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-duo-violeta rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>

          <div className="flex items-center justify-center sm:justify-between gap-1.5 sm:gap-0 mt-3">
            {STEPS.map(({ id, label }) => (
              <div key={id} className="flex flex-col items-center gap-1">
                <div className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  id <= step ? "bg-duo-violeta" : "bg-linea dark:bg-linea-dark"
                }`} />
                <span className={`hidden sm:block text-[11px] font-medium ${id === step ? "text-duo-violeta" : "text-suave dark:text-suave-dark"}`}>
                  {label}
                </span>
              </div>
            ))}
            <span className="sm:hidden ml-2 text-[12px] font-medium text-duo-violeta">
              {STEPS[step - 1]?.label}
            </span>
          </div>
        </div>

        {/* Contenido animado (scrollea) */}
        <div className="relative min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="p-6 flex flex-col gap-5"
            >
              {/* ══ PASO 1: Persona ══ */}
              {step === 1 && (
                <>
                  <div className="mb-1">
                    <h2 className="text-[17px] font-semibold text-titulo dark:text-titulo-dark">¿Para quién es el expediente?</h2>
                    <p className="text-[13px] text-suave dark:text-suave-dark mt-1">Buscá por DNI. Si ya es cliente, traemos sus datos.</p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={dniInput}
                      onChange={(e) => setDniInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && buscarPorDni()}
                      placeholder="DNI (sin puntos)"
                      inputMode="numeric"
                      className="flex-1 h-10 px-3.5 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-[14px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-violeta transition-colors"
                    />
                    <Boton3D variant="violeta" onClick={buscarPorDni} disabled={buscandoDni}>
                      <HiSearch className="w-4 h-4" /> {buscandoDni ? "..." : "Buscar"}
                    </Boton3D>
                  </div>

                  {clienteEncontrado && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]">
                      <HiCheck className="w-4 h-4 text-duo-verde-sombra dark:text-duo-verde shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-duo-verde-sombra dark:text-duo-verde truncate">
                          {clienteEncontrado.nombre} {clienteEncontrado.apellido} — cliente de Thames
                        </p>
                        <p className="text-[12px] text-duo-verde-sombra/80 dark:text-duo-verde/80">
                          {clienteEncontrado.telefono || "Sin teléfono cargado"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={quitarCliente}
                        className="shrink-0 text-[12px] font-medium text-duo-verde-sombra dark:text-duo-verde underline"
                      >
                        Quitar
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputDuo label="Nombre" required value={form.persona_nombre} onChange={(e) => set("persona_nombre", e.target.value)} placeholder="Nombre" />
                    <InputDuo label="Apellido" required value={form.persona_apellido} onChange={(e) => set("persona_apellido", e.target.value)} placeholder="Apellido" />
                    <InputDuo label="Teléfono" value={form.persona_telefono} onChange={(e) => set("persona_telefono", e.target.value)} placeholder="11 5555-1234" />
                    <InputDuo label="DNI" value={form.persona_dni} onChange={(e) => set("persona_dni", e.target.value)} placeholder="DNI" />
                  </div>

                  {!clienteEncontrado && (
                    <p className="text-[12px] text-center text-suave dark:text-suave-dark">
                      No está en el sistema — se carga igual, como no-cliente.
                    </p>
                  )}
                </>
              )}

              {/* ══ PASO 2: Tema ══ */}
              {step === 2 && (
                <>
                  <div className="mb-1">
                    <h2 className="text-[17px] font-semibold text-titulo dark:text-titulo-dark">¿De qué tema es?</h2>
                    <p className="text-[13px] text-suave dark:text-suave-dark mt-1">Elegí la categoría del caso</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {TEMAS.map((t) => {
                      const Icon = t.icon;
                      const on = form.tema === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => set("tema", t.value)}
                          className={`rounded-lg border p-3 text-left transition-colors ${
                            on
                              ? "border-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)]"
                              : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark"
                          }`}
                        >
                          <Icon className={`w-4 h-4 mb-1.5 ${on ? "text-duo-violeta" : "text-suave dark:text-suave-dark"}`} />
                          <div className="text-[13px] font-medium text-titulo dark:text-titulo-dark">{t.label}</div>
                          <div className="text-[12px] text-suave dark:text-suave-dark">{t.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ══ PASO 3: Detalle ══ */}
              {step === 3 && (
                <>
                  <div className="mb-1">
                    <h2 className="text-[17px] font-semibold text-titulo dark:text-titulo-dark">Contame qué pasó</h2>
                    <p className="text-[13px] text-suave dark:text-suave-dark mt-1">Es opcional, se puede completar después</p>
                  </div>

                  <InputDuo
                    type="date"
                    label="Fecha del hecho (si aplica)"
                    value={form.fecha_hecho}
                    onChange={(e) => set("fecha_hecho", e.target.value)}
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-suave dark:text-suave-dark">Relato</label>
                    <textarea
                      value={form.relato}
                      onChange={(e) => set("relato", e.target.value)}
                      rows={5}
                      placeholder="Qué pasó, dónde, cuándo..."
                      className="w-full px-3.5 py-3 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-[14px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark resize-none outline-none focus:border-duo-violeta transition-colors"
                    />
                  </div>

                  {/* Campos propios del tema (ej: Laboral → fechas de trabajo).
                      Si el tema elegido no tiene campos propios, esto no
                      muestra nada — el resto del paso queda igual. */}
                  {camposTema.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-linea dark:border-linea-dark">
                      <p className="text-[13px] font-medium text-suave dark:text-suave-dark">
                        Datos de {TEMAS.find((t) => t.value === form.tema)?.label}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {camposTema.map((campo) => (
                          <InputDuo
                            key={campo.key}
                            type={campo.type}
                            label={campo.label}
                            value={form.datos_tema[campo.key] || ""}
                            onChange={(e) => setDatoTema(campo.key, e.target.value)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ══ PASO 4: Abogado ══ */}
              {step === 4 && (
                <>
                  <div className="mb-1">
                    <h2 className="text-[17px] font-semibold text-titulo dark:text-titulo-dark">¿A qué abogado se lo derivás?</h2>
                    <p className="text-[13px] text-suave dark:text-suave-dark mt-1">Podés dejarlo sin asignar por ahora</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {abogadosOrdenados.map((a) => {
                      const on = String(form.abogado) === String(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => set("abogado", on ? "" : a.id)}
                          className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                            on
                              ? "border-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)]"
                              : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark"
                          }`}
                        >
                          <div className="h-8 w-8 rounded-full bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta flex items-center justify-center text-[11px] font-medium shrink-0">
                            {(a.nombre_completo || "??").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-titulo dark:text-titulo-dark truncate">{a.nombre_completo}</div>
                            <div className="text-[12px] text-suave dark:text-suave-dark">{a.expedientes_abiertos || 0} expediente(s) abierto(s)</div>
                          </div>
                          {a._sugerido && (
                            <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded bg-duo-violeta text-white">Sugerido</span>
                          )}
                        </button>
                      );
                    })}

                    {abogadosOrdenados.length === 0 && (
                      <p className="text-center text-[13px] text-suave dark:text-suave-dark py-2">
                        Todavía no hay abogados cargados en el sistema.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => set("abogado", "")}
                      className={`rounded-lg border border-dashed p-3 text-center text-[13px] font-medium transition-colors ${
                        !form.abogado ? "border-duo-violeta text-duo-violeta" : "border-linea dark:border-linea-dark text-suave dark:text-suave-dark"
                      }`}
                    >
                      Dejar sin asignar por ahora
                    </button>
                  </div>
                </>
              )}

              {/* ══ PASO 5: Documentos ══ */}
              {step === 5 && (
                <>
                  <div className="mb-1">
                    <h2 className="text-[17px] font-semibold text-titulo dark:text-titulo-dark">Fotos y papeles (opcional)</h2>
                    <p className="text-[13px] text-suave dark:text-suave-dark mt-1">Sacá una foto o elegí de la galería</p>
                  </div>

                  <ExpedienteDocumentosPanel compact draftDocumentos={draftDocumentos} onDraftChange={setDraftDocumentos} />
                </>
              )}

              {/* ══ PASO 6: Confirmar ══ */}
              {step === 6 && (
                <>
                  <div className="mb-1">
                    <h2 className="text-[17px] font-semibold text-titulo dark:text-titulo-dark">Confirmá los datos</h2>
                  </div>

                  <CardDuo className="p-4 space-y-2.5">
                    <ResumenLinea label="Persona" value={`${form.persona_nombre} ${form.persona_apellido}`.trim() || "—"} />
                    <ResumenLinea label="Tipo" value={form.cliente ? "Cliente de Thames" : "No cliente"} />
                    <ResumenLinea label="Tema" value={TEMAS.find((t) => t.value === form.tema)?.label || "—"} />
                    {camposTema.map((campo) => {
                      const valor = form.datos_tema[campo.key];
                      if (!valor) return null;
                      return <ResumenLinea key={campo.key} label={campo.label} value={valor} />;
                    })}
                    <ResumenLinea
                      label="Abogado"
                      value={abogados.find((a) => String(a.id) === String(form.abogado))?.nombre_completo || "Sin asignar"}
                    />
                    <ResumenLinea label="Fotos/papeles" value={String(draftDocumentos.length)} />
                  </CardDuo>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-linea dark:border-linea-dark bg-card dark:bg-card-dark flex gap-2.5">
          {step > 1 && (
            <Boton3D variant="blanco" onClick={goBack} disabled={submitting}>
              Atrás
            </Boton3D>
          )}
          {step < STEPS.length ? (
            <Boton3D variant="violeta" full onClick={goNext} disabled={!canNext()}>
              Siguiente
            </Boton3D>
          ) : (
            <Boton3D variant="verde" full onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creando…" : <><HiDocumentText className="w-4 h-4" /> Crear expediente</>}
            </Boton3D>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ResumenLinea({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-suave dark:text-suave-dark">{label}</span>
      <span className="text-[13px] font-medium text-titulo dark:text-titulo-dark text-right">{value}</span>
    </div>
  );
}