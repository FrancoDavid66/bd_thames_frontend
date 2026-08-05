// src/components/balanzes/MovimientoCreateModal.jsx  (diseño Duo — WIZARD 3 PASOS · responsive)
//
// 🚀 Componente ÚNICO para cargar un INGRESO o un EGRESO.
//    Reemplaza a IngresoCreateModal.jsx y EgresoCreateModal.jsx.
//
//    Uso:
//      <MovimientoCreateModal isOpen={...} onClose={...} tipoInicial="INGRESO" />
//      <MovimientoCreateModal isOpen={...} onClose={...} tipoInicial="EGRESO" />
//
//    🆕 WIZARD de 3 PASOS (antes eran 2; el paso 2 quedaba largo y no entraba en
//       celulares chicos). Ahora cada pantalla es cortita:
//      Paso 1 → Tipo (Ingreso / Egreso) + Monto
//      Paso 2 → Forma de pago (Efectivo / Transferencia) + billetera (si transf.)
//      Paso 3 → Motivo (+ Sucursal si admin) + Resumen + Confirmar
//
//    SIMPLIFICACIONES respecto a la versión vieja:
//      - Solo 2 formas de pago: EFECTIVO y TRANSFERENCIA.
//      - Sin selección de categoría: se guarda como "Sin categoría".
//      - La billetera se escribe a mano (texto libre) y solo cuando es transferencia.
//      - La fecha ya no se pide: se usa la de hoy automáticamente.
//
// 📱 RESPONSIVE:
//    - Inputs y cards con tap target ≥ 44-48px; inputs con text-base (sin zoom iOS).
//    - Footer: en pantallas chicas los botones se apilan (principal arriba, Atrás
//      abajo); desde sm van en fila. El alto/scroll del modal lo maneja ModalWrapper.
//
import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");
import toast from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";
import { createIngreso } from "../../store/slices/ingresosSlice";
import { createEgreso } from "../../store/slices/egresosSlice";
import { fetchBalanceDiario } from "../../store/slices/balanceSlice";
import ModalWrapper from "../comunes/ModalWrapper";

const normalizarStr = (raw) => (raw ?? "").toString().trim();
const today = () => dayjs().format("YYYY-MM-DD");

// 🚀 Ruta de sucursales (la misma que usa el resto de la app)
const API_BASE = (import.meta.env.VITE_API_URL || "/api/").toString();
const OFICINAS_URL = (API_BASE.endsWith("/") ? API_BASE : API_BASE + "/") + "usuarios/oficinas/";

// 🚀 Cantidad de pasos del wizard (ahora 3)
const TOTAL_PASOS = 3;

// ⚠️ Tailwind NO soporta clases dinámicas. Definimos las clases COMPLETAS por tipo.
//    Usan los tokens semánticos de index.css (ingreso = verde, egreso = rojo).
const THEME = {
  INGRESO: {
    text: "text-duo-verde",
    formaOn: "bg-duo-verde/20 text-duo-verde dark:text-duo-verde border-duo-verde",
    inputFocus: "focus:border-duo-verde",
    resumenMonto: "text-duo-verde dark:text-duo-verde",
    barra: "bg-duo-verde",
    cardOn: "border-duo-verde bg-duo-verde/10 text-duo-verde dark:text-duo-verde shadow-[0_4px_0_var(--color-duo-verde-sombra)]",
    btnOk: "bg-duo-verde text-white shadow-[0_5px_0_var(--color-duo-verde-sombra)] active:shadow-[0_0_0_var(--color-duo-verde-sombra)] active:translate-y-0.5",
    btnDisabled: "bg-duo-verde/30 text-white/50 cursor-not-allowed",
  },
  EGRESO: {
    text: "text-duo-rojo",
    formaOn: "bg-duo-rojo/20 text-duo-rojo dark:text-duo-rojo border-duo-rojo",
    inputFocus: "focus:border-duo-rojo",
    resumenMonto: "text-duo-rojo dark:text-duo-rojo",
    barra: "bg-duo-rojo",
    cardOn: "border-duo-rojo bg-duo-rojo/10 text-duo-rojo dark:text-duo-rojo shadow-[0_4px_0_var(--color-duo-rojo-sombra)]",
    btnOk: "bg-duo-rojo text-white shadow-[0_5px_0_var(--color-duo-rojo-sombra)] active:shadow-[0_0_0_var(--color-duo-rojo-sombra)] active:translate-y-0.5",
    btnDisabled: "bg-duo-rojo/30 text-white/50 cursor-not-allowed",
  },
};

// 🚀 Sin decimales: $ 40.000 en vez de $ 40.000,00
const fmtMoney = (n) =>
  "$ " + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Solo dos formas de pago en este modal.
const FORMA_LABELS = { EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia" };
const labelFormaPago = (fp) => FORMA_LABELS[fp] || fp;

// Muestra el monto con separador de miles (es-AR): 20000 -> "20.000"
const montoToDisplay = (raw) => {
  if (raw === "" || raw == null) return "";
  const [intPart, decPart] = String(raw).split(".");
  const intFmt = (intPart || "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart != null ? `${intFmt},${decPart}` : intFmt;
};
// Convierte lo tipeado (es-AR) al número crudo: "20.000,50" -> "20000.50"
const montoFromInput = (text) => {
  const cleaned = String(text).replace(/[^\d,]/g, "");
  const [intPart, ...rest] = cleaned.split(",");
  const dec = rest.length ? rest.join("").slice(0, 2) : null;
  return dec != null ? `${intPart}.${dec}` : intPart;
};

// Etiqueta de sección (título chico)
const SectionLabel = ({ children }) => (
  <p className="text-[10px] font-black uppercase tracking-wide text-suave dark:text-suave-dark">
    {children}
  </p>
);

export default function MovimientoCreateModal({ isOpen, onClose, tipoInicial = "INGRESO" }) {
  const dispatch = useDispatch();

  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const userOficina = user?.perfil?.oficina?.id || user?.perfil?.oficina?.codigo || user?.perfil?.oficina || "";

  const { oficinas: oficinasStore } = useSelector((s) => s.balance || {});

  // Sucursales: usamos las del estado global si están, si no las pedimos acá
  const [oficinasLocal, setOficinasLocal] = useState([]);
  const oficinas = oficinasStore && oficinasStore.length ? oficinasStore : oficinasLocal;

  // 🚀 Tipo de movimiento: "INGRESO" | "EGRESO"
  const [tipo, setTipo] = useState(tipoInicial);
  const esIngreso = tipo === "INGRESO";
  const T = THEME[tipo]; // paleta de clases completas según el tipo

  // 🚀 Paso actual del wizard (1..TOTAL_PASOS)
  const [paso, setPaso] = useState(1);

  // Cargamos las sucursales directo de la ruta correcta (solo admin)
  useEffect(() => {
    if (!isOpen || !isWebAdmin) return;
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    axios
      .get(OFICINAS_URL, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => {
        const d = r.data;
        setOficinasLocal(Array.isArray(d) ? d : d?.results || []);
      })
      .catch(() => toast.error("No se pudieron cargar las sucursales."));
  }, [isOpen, isWebAdmin]);

  const [form, setForm] = useState({
    monto: "",
    forma_pago: "EFECTIVO",
    billetera: "",
    descripcion: "", // motivo del ingreso / egreso
    oficina: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const montoRef = useRef(null);

  // Al abrir: reset + arranca en el tipo pedido y en el paso 1
  useEffect(() => {
    if (!isOpen) return;
    setTipo(tipoInicial);
    setPaso(1);
    setErrors({});
    setSubmitting(false);
    setForm({
      monto: "",
      forma_pago: "EFECTIVO",
      billetera: "",
      descripcion: "",
      oficina: "",
    });
  }, [isOpen, tipoInicial]);

  // Al abrir el paso 1, enfocamos el monto
  useEffect(() => {
    if (!isOpen || paso !== 1) return;
    const t = setTimeout(() => montoRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [isOpen, paso]);

  // Si cambia el tipo con los botones, solo limpiamos errores (el motivo/monto se mantienen)
  const cambiarTipo = (nuevo) => {
    if (nuevo === tipo) return;
    setTipo(nuevo);
    setErrors({});
  };

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // Al cambiar la forma de pago: si vuelve a EFECTIVO, se limpia la billetera.
  const setFormaPago = (fp) =>
    setForm((p) => ({ ...p, forma_pago: fp, billetera: fp === "TRANSFERENCIA" ? p.billetera : "" }));

  const isTransferencia = form.forma_pago === "TRANSFERENCIA";

  // 📱 h-12 (48px) + text-base en mobile (sin zoom de iOS).
  const inputBase = `w-full h-12 px-3 border-2 rounded-xl bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark text-base sm:text-sm font-bold placeholder:text-suave dark:placeholder:text-suave-dark focus:outline-none ${T.inputFocus} transition-colors`;
  const selectBase = `w-full h-12 px-3 border-2 rounded-xl bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark text-base sm:text-sm font-bold focus:outline-none ${T.inputFocus} transition-colors cursor-pointer dark:[color-scheme:dark]`;

  // ── Validación por PASO ────────────────────────────────────────
  const validarPaso = (n) => {
    const e = {};
    if (n === 1) {
      if (!form.monto || Number(form.monto) <= 0) e.monto = "Ingresá un monto válido.";
    }
    if (n === 2) {
      if (isTransferencia && !form.billetera?.trim()) e.billetera = "Indicá la billetera / cuenta.";
    }
    if (n === 3) {
      if (!form.descripcion?.trim()) e.descripcion = "El motivo es obligatorio.";
      if (isWebAdmin && !form.oficina) e.oficina = "Seleccioná la sucursal.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Validación COMPLETA (por seguridad, antes de guardar) ──────
  const validateAll = () => {
    const e = {};
    if (!form.monto || Number(form.monto) <= 0) e.monto = "Ingresá un monto válido.";
    if (isTransferencia && !form.billetera?.trim()) e.billetera = "Indicá la billetera / cuenta.";
    if (!form.descripcion?.trim()) e.descripcion = "El motivo es obligatorio.";
    if (isWebAdmin && !form.oficina) e.oficina = "Seleccioná la sucursal.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const irAtras = () => {
    setErrors({});
    setPaso((p) => Math.max(1, p - 1));
  };

  const irSiguiente = () => {
    if (paso === 1) { if (validarPaso(1)) setPaso(2); return; }
    if (paso === 2) { if (validarPaso(2)) setPaso(3); return; }
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    // Si todavía no estamos en el último paso, "Enter" avanza en vez de guardar
    if (paso < TOTAL_PASOS) { irSiguiente(); return; }
    if (!validateAll()) return;

    const montoNum = Number(form.monto || 0);
    // La billetera solo aplica a transferencia; en efectivo va vacía.
    const billeteraDetalle = isTransferencia ? normalizarStr(form.billetera) : "";
    const motivo = normalizarStr(form.descripcion);

    try {
      setSubmitting(true);

      if (esIngreso) {
        // ── INGRESO ──────────────────────────────────────────────
        let descripcionBase = motivo || "Ingreso";
        if (billeteraDetalle) descripcionBase = `${descripcionBase} [Cuenta: ${billeteraDetalle}]`;

        const payload = {
          monto: montoNum,
          fecha: today(),
          forma_pago: form.forma_pago,
          billetera: billeteraDetalle,
          categoria: "Sin categoría",
          descripcion: descripcionBase,
          pagado_por: "No especificado",
          oficina: isWebAdmin ? form.oficina : undefined,
        };
        await dispatch(createIngreso(payload)).unwrap();
      } else {
        // ── EGRESO ───────────────────────────────────────────────
        let descripcionBase = motivo;
        if (billeteraDetalle) descripcionBase = `${descripcionBase} [Cuenta: ${billeteraDetalle}]`;

        const payload = {
          descripcion: descripcionBase,
          monto: montoNum,
          categoria: "Sin categoría",
          fecha: today(),
          forma_pago: form.forma_pago,
          billetera: billeteraDetalle,
          observaciones: "",
          oficina: isWebAdmin ? form.oficina : undefined,
        };
        await dispatch(createEgreso(payload)).unwrap();
      }

      // Refrescar el balance del día en la oficina correspondiente
      const ofiParaBalance = isWebAdmin ? form.oficina : userOficina;
      dispatch(fetchBalanceDiario({ fecha: today(), oficina: ofiParaBalance }));

      toast.success(`${esIngreso ? "Ingreso" : "Egreso"} de $${montoNum.toLocaleString("es-AR")} guardado`);
      onClose?.();
    } catch (err) {
      console.error(`Error al crear ${esIngreso ? "ingreso" : "egreso"}:`, err);
      toast.error(`No se pudo guardar el ${esIngreso ? "ingreso" : "egreso"}. Revisá los datos e intentá de nuevo.`);
    } finally {
      setSubmitting(false);
    }
  };

  // ¿Se puede avanzar / confirmar según el paso actual?
  const pasoUnoOk = form.monto && Number(form.monto) > 0;
  const pasoDosOk = !isTransferencia || !!form.billetera?.trim();
  const finalDisabled =
    submitting ||
    !form.monto ||
    !form.descripcion?.trim() ||
    (isTransferencia && !form.billetera?.trim()) ||
    (isWebAdmin && !form.oficina);

  // ¿El botón "Siguiente" del paso actual está habilitado?
  const siguienteDisabled = paso === 1 ? !pasoUnoOk : paso === 2 ? !pasoDosOk : false;

  const tituloPaso =
    paso === 1
      ? "¿Qué querés cargar?"
      : paso === 2
        ? `${esIngreso ? "Ingreso" : "Egreso"} — forma de pago`
        : `${esIngreso ? "Ingreso" : "Egreso"} — motivo y confirmación`;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={tituloPaso}>
      {/* 🚀 BARRA DE PROGRESO (3 segmentos estilo Duo) */}
      <div className="flex items-center gap-1.5 mb-5">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex-1 h-2 rounded-full bg-linea dark:bg-linea-dark overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${T.barra}`}
              style={{ width: paso >= n ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-titulo dark:text-titulo-dark">

        {/* ============================================================ */}
        {/* PASO 1 · TIPO + MONTO                                         */}
        {/* ============================================================ */}
        {paso === 1 && (
          <div className="space-y-5">
            {/* TIPO */}
            <div className="space-y-3">
              <SectionLabel>Tipo de movimiento</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                {/* INGRESO */}
                <button
                  type="button"
                  onClick={() => cambiarTipo("INGRESO")}
                  className={`flex flex-col items-center justify-center gap-2 py-5 sm:py-6 rounded-2xl border-2 font-black transition-all ${
                    esIngreso
                      ? THEME.INGRESO.cardOn
                      : "border-linea dark:border-linea-dark text-suave dark:text-suave-dark bg-surface dark:bg-surface-dark hover:text-titulo dark:hover:text-titulo-dark"
                  }`}
                >
                  <span className="text-3xl leading-none">↓</span>
                  <span className="text-base">Ingreso</span>
                  <span className="text-[11px] font-bold opacity-70">Entra plata</span>
                </button>

                {/* EGRESO */}
                <button
                  type="button"
                  onClick={() => cambiarTipo("EGRESO")}
                  className={`flex flex-col items-center justify-center gap-2 py-5 sm:py-6 rounded-2xl border-2 font-black transition-all ${
                    !esIngreso
                      ? THEME.EGRESO.cardOn
                      : "border-linea dark:border-linea-dark text-suave dark:text-suave-dark bg-surface dark:bg-surface-dark hover:text-titulo dark:hover:text-titulo-dark"
                  }`}
                >
                  <span className="text-3xl leading-none">↑</span>
                  <span className="text-base">Egreso</span>
                  <span className="text-[11px] font-bold opacity-70">Sale plata</span>
                </button>
              </div>
            </div>

            {/* MONTO */}
            <div>
              <label className="block text-xs font-black mb-1.5 text-suave dark:text-suave-dark">Monto <span className="text-duo-rojo">*</span></label>
              <div className={`flex items-center gap-2 w-full px-3 h-12 border-2 rounded-xl bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark transition-colors ${esIngreso ? "focus-within:border-duo-verde" : "focus-within:border-duo-rojo"}`}>
                <span className="text-suave dark:text-suave-dark font-black shrink-0">$</span>
                <input
                  ref={montoRef}
                  name="monto"
                  type="text"
                  inputMode="decimal"
                  value={montoToDisplay(form.monto)}
                  onChange={(e) => setForm((p) => ({ ...p, monto: montoFromInput(e.target.value) }))}
                  className="flex-1 min-w-0 bg-transparent outline-none text-lg font-mono font-black text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark"
                  placeholder="0"
                />
              </div>
              {errors.monto && <p className="text-[11px] font-bold text-duo-rojo mt-1">{errors.monto}</p>}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PASO 2 · FORMA DE PAGO + BILLETERA                            */}
        {/* ============================================================ */}
        {paso === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-black mb-2 text-suave dark:text-suave-dark">Forma de pago <span className="text-duo-rojo">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {["EFECTIVO", "TRANSFERENCIA"].map((fp) => (
                  <button
                    key={fp}
                    type="button"
                    onClick={() => setFormaPago(fp)}
                    className={`min-h-[48px] px-4 py-2.5 text-sm rounded-xl font-black transition-colors border-2 ${
                      form.forma_pago === fp
                        ? T.formaOn
                        : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark hover:text-titulo dark:hover:text-titulo-dark"
                    }`}
                  >
                    {labelFormaPago(fp)}
                  </button>
                ))}
              </div>

              {/* Billetera: solo en transferencia (texto libre) */}
              {isTransferencia ? (
                <div className="mt-3">
                  <label className="block text-xs font-black mb-1.5 text-suave dark:text-suave-dark">
                    ¿De qué billetera / cuenta? <span className="text-duo-rojo">*</span>
                  </label>
                  <input
                    name="billetera"
                    value={form.billetera}
                    onChange={handleChange}
                    placeholder="Ej: Mercado Pago Franco, Santander…"
                    className={inputBase}
                  />
                  {errors.billetera && <p className="text-[11px] font-bold text-duo-rojo mt-1">{errors.billetera}</p>}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border-2 border-dashed border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-4 py-4 text-center">
                  <p className="text-[13px] font-bold text-suave dark:text-suave-dark italic">
                    Pago en efectivo: no hace falta indicar cuenta. 👍
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PASO 3 · MOTIVO (+ SUCURSAL) + RESUMEN                        */}
        {/* ============================================================ */}
        {paso === 3 && (
          <div className="space-y-5">
            {/* MOTIVO */}
            <div>
              <label className="block text-xs font-black mb-1.5 text-suave dark:text-suave-dark">
                Motivo del {esIngreso ? "ingreso" : "egreso"} <span className="text-duo-rojo">*</span>
              </label>
              <input
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                placeholder={esIngreso ? "Ej: Cobro seña, venta póliza…" : "Ej: Artículos de limpieza, luz…"}
                className={inputBase}
              />
              {errors.descripcion && <p className="text-[11px] font-bold text-duo-rojo mt-1">{errors.descripcion}</p>}
            </div>

            {/* SUCURSAL (solo admin) */}
            {isWebAdmin && (
              <div>
                <label className="block text-xs font-black mb-1.5 text-suave dark:text-suave-dark">Sucursal <span className="text-duo-rojo">*</span></label>
                <select name="oficina" value={form.oficina} onChange={handleChange} className={selectBase}>
                  <option value="">Seleccioná la sucursal…</option>
                  {oficinas.map((o) => (
                    <option key={o.id ?? o.codigo} value={o.id ?? o.codigo}>
                      {o.nombre || o.codigo || `Sucursal ${o.id}`}
                    </option>
                  ))}
                </select>
                {errors.oficina && <p className="text-[11px] font-bold text-duo-rojo mt-1">{errors.oficina}</p>}
              </div>
            )}

            {/* RESUMEN */}
            <div className="bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark rounded-2xl p-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-suave dark:text-suave-dark">
                Resumen · {esIngreso ? "Ingreso" : "Egreso"}
              </p>
              <div className="flex justify-between">
                <span className="font-bold text-suave dark:text-suave-dark">Monto</span>
                <span className={`font-mono font-black ${T.resumenMonto}`}>{esIngreso ? "+" : "−"} {fmtMoney(form.monto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-suave dark:text-suave-dark">Forma de pago</span>
                <span className="font-bold text-titulo dark:text-titulo-dark">{labelFormaPago(form.forma_pago)}</span>
              </div>
              {isTransferencia && (
                <div className="flex justify-between">
                  <span className="font-bold text-suave dark:text-suave-dark">Cuenta</span>
                  <span className="font-bold text-titulo dark:text-titulo-dark truncate ml-3 text-right">{form.billetera || "—"}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-bold text-suave dark:text-suave-dark">Motivo</span>
                <span className="font-bold text-titulo dark:text-titulo-dark truncate ml-3 text-right">{form.descripcion || "—"}</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* FOOTER · navegación                                          */}
        {/* 📱 En mobile se apila (principal arriba, Atrás/Cancelar abajo) */}
        {/* ============================================================ */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t-2 border-linea dark:border-linea-dark">
          {/* Botón izquierdo: Cancelar (paso 1) o Atrás (pasos 2 y 3) */}
          {paso === 1 ? (
            <button type="button" onClick={onClose} className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl text-sm font-black border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark transition-colors">
              Cancelar
            </button>
          ) : (
            <button type="button" onClick={irAtras} className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl text-sm font-black border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark transition-colors">
              ← Atrás
            </button>
          )}

          {/* Botón derecho: Siguiente (pasos 1 y 2) o Confirmar (paso 3) */}
          {paso < TOTAL_PASOS ? (
            <button
              type="button"
              onClick={irSiguiente}
              disabled={siguienteDisabled}
              className={`w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl text-sm font-black text-white transition-all ${siguienteDisabled ? T.btnDisabled : T.btnOk}`}
            >
              Siguiente →
            </button>
          ) : (
            <button type="submit" disabled={finalDisabled} className={`w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl text-sm font-black text-white transition-all ${finalDisabled ? T.btnDisabled : T.btnOk}`}>
              {submitting ? "Guardando…" : `Guardar ${esIngreso ? "ingreso" : "egreso"}`}
            </button>
          )}
        </div>
      </form>
    </ModalWrapper>
  );
}
