// src/components/balanzes/MovimientoCreateModal.jsx  (diseño Duo — WIZARD 3 pasos)
//
// 🚀 Componente ÚNICO para cargar un INGRESO o un EGRESO.
//    Reemplaza a IngresoCreateModal.jsx y EgresoCreateModal.jsx.
//
//    Uso:
//      <MovimientoCreateModal isOpen={...} onClose={...} tipoInicial="INGRESO" />
//      <MovimientoCreateModal isOpen={...} onClose={...} tipoInicial="EGRESO" />
//
//    WIZARD de 3 pasos (hoja desde abajo, estilo Duolingo):
//      Paso 1 → Tipo (Ingreso / Egreso)
//      Paso 2 → Monto + Forma de pago + Categoría
//      Paso 3 → Detalle + Fecha (+ Sucursal) + Resumen + Confirmar
//
//    La lógica de validación, payloads y guardado es EXACTAMENTE la misma de antes.
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
import { fetchBalanceDiario, createCategoria } from "../../store/slices/balanceSlice";
import { fetchMediosCobro } from "../../store/slices/pagosSlice";
import ModalWrapper from "../comunes/ModalWrapper";
import CategoriaSelect from "./CategoriaSelect";

const normalizarStr = (raw) => (raw ?? "").toString().trim();
const today = () => dayjs().format("YYYY-MM-DD");

// 🚀 Ruta de sucursales (la misma que usa el resto de la app)
const API_BASE = (import.meta.env.VITE_API_URL || "/api/").toString();
const OFICINAS_URL = (API_BASE.endsWith("/") ? API_BASE : API_BASE + "/") + "usuarios/oficinas/";

// 🚀 Cantidad de pasos del wizard
const TOTAL_PASOS = 3;

// ⚠️ Tailwind NO soporta clases dinámicas. Definimos las clases COMPLETAS por tipo.
//    Usan los tokens semánticos de index.css (ingreso = verde, egreso = rojo).
//    Los botones "OK" ahora son 3D (sombra Duolingo).
const THEME = {
  INGRESO: {
    text: "text-ingreso",
    selOn: "bg-ingreso/20 text-ingreso dark:text-ingreso-claro",
    formaOn: "bg-ingreso/20 text-ingreso dark:text-ingreso-claro border-ingreso",
    inputFocus: "focus:border-ingreso",
    inputFocusOnly: "focus:border-ingreso",
    resumenMonto: "text-ingreso dark:text-ingreso-claro",
    barra: "bg-ingreso",
    cardOn: "border-ingreso bg-ingreso/10 text-ingreso dark:text-ingreso-claro shadow-[0_4px_0_var(--color-ingreso-fuerte)]",
    btnOk: "bg-ingreso text-white shadow-[0_5px_0_var(--color-ingreso-fuerte)] active:shadow-[0_0_0_var(--color-ingreso-fuerte)] active:translate-y-0.5",
    btnDisabled: "bg-ingreso/30 text-white/50 cursor-not-allowed",
  },
  EGRESO: {
    text: "text-egreso",
    selOn: "bg-egreso/20 text-egreso dark:text-egreso-claro",
    formaOn: "bg-egreso/20 text-egreso dark:text-egreso-claro border-egreso",
    inputFocus: "focus:border-egreso",
    inputFocusOnly: "focus:border-egreso",
    resumenMonto: "text-egreso dark:text-egreso-claro",
    barra: "bg-egreso",
    cardOn: "border-egreso bg-egreso/10 text-egreso dark:text-egreso-claro shadow-[0_4px_0_var(--color-egreso-fuerte)]",
    btnOk: "bg-egreso text-white shadow-[0_5px_0_var(--color-egreso-fuerte)] active:shadow-[0_0_0_var(--color-egreso-fuerte)] active:translate-y-0.5",
    btnDisabled: "bg-egreso/30 text-white/50 cursor-not-allowed",
  },
};

// 🚀 Sin decimales: $ 40.000 en vez de $ 40.000,00
const fmtMoney = (n) =>
  "$ " + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const FORMA_LABELS = {
  EFECTIVO: "Efectivo / Caja",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
  MERCADOPAGO: "Mercado Pago",
  OTRO: "Otro",
};
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

// Etiqueta de sección (título chico con línea)
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

  const { categorias, oficinas: oficinasStore } = useSelector((s) => s.balance || {});
  const mediosCobro = useSelector((s) => (s.pagos?.mediosCobro || []).filter((m) => m.activo !== false));

  // Sucursales: usamos las del estado global si están, si no las pedimos acá
  const [oficinasLocal, setOficinasLocal] = useState([]);
  const oficinas = oficinasStore && oficinasStore.length ? oficinasStore : oficinasLocal;

  // 🚀 Tipo de movimiento: "INGRESO" | "EGRESO"
  const [tipo, setTipo] = useState(tipoInicial);
  const esIngreso = tipo === "INGRESO";
  const T = THEME[tipo]; // paleta de clases completas según el tipo

  // 🚀 Paso actual del wizard (1..TOTAL_PASOS)
  const [paso, setPaso] = useState(1);

  useEffect(() => { dispatch(fetchMediosCobro({ activo: true })); }, [dispatch]);

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
    fecha: today(),
    forma_pago: "EFECTIVO",
    billetera: "",
    categoria: "",
    descripcion: "",
    pagado_por: "",   // ingreso: quién pagó
    destinatario: "", // egreso: a quién se pagó
    oficina: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const montoRef = useRef(null);
  const catRef = useRef(null);

  // Al abrir: reset + arranca en el tipo pedido y en el paso 1
  useEffect(() => {
    if (!isOpen) return;
    setTipo(tipoInicial);
    setPaso(1);
    setErrors({});
    setSubmitting(false);
    setForm({
      monto: "",
      fecha: today(),
      forma_pago: "EFECTIVO",
      billetera: "",
      categoria: "",
      descripcion: "",
      pagado_por: "",
      destinatario: "",
      oficina: "",
    });
  }, [isOpen, tipoInicial]);

  // Cuando el usuario llega al paso 2, enfocamos el monto
  useEffect(() => {
    if (!isOpen || paso !== 2) return;
    const t = setTimeout(() => montoRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [isOpen, paso]);

  // Si cambia el tipo con el selector, limpiamos categoría (es de otro tipo) y errores
  const cambiarTipo = (nuevo) => {
    if (nuevo === tipo) return;
    setTipo(nuevo);
    setErrors({});
    setForm((p) => ({ ...p, categoria: "" }));
  };

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleCategoriaChange = (val) => setForm((p) => ({ ...p, categoria: val }));
  const setFormaPago = (fp) =>
    setForm((p) => ({ ...p, forma_pago: fp, billetera: (fp === "TRANSFERENCIA" || fp === "MERCADOPAGO") ? p.billetera : "" }));

  const isVirtual = form.forma_pago === "TRANSFERENCIA" || form.forma_pago === "MERCADOPAGO";

  const inputBase = `w-full px-3 py-2.5 border-2 rounded-xl bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark text-sm font-bold placeholder:text-suave dark:placeholder:text-suave-dark focus:outline-none ${T.inputFocus} transition-colors`;
  const inputLite = `w-full px-3 py-2.5 border-2 rounded-xl bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark text-sm font-bold placeholder:text-suave dark:placeholder:text-suave-dark focus:outline-none ${T.inputFocusOnly} transition-colors dark:[color-scheme:dark]`;

  // ── Validación por PASO ────────────────────────────────────────
  // Devuelve true si el paso indicado está OK (y setea los errores de ese paso).
  const validarPaso = (n) => {
    const e = {};
    if (n === 2) {
      if (!form.monto || Number(form.monto) <= 0) e.monto = "Ingresá un monto válido.";
      if (isVirtual && !form.billetera?.trim()) e.billetera = "Indicá la cuenta / banco.";
      if (!form.categoria?.trim()) e.categoria = "Indicá la categoría.";
    }
    if (n === 3) {
      // El egreso exige descripción; el ingreso la deja opcional.
      if (!esIngreso && !form.descripcion?.trim()) e.descripcion = "La descripción es obligatoria.";
      if (!form.fecha) e.fecha = "Seleccioná la fecha.";
      if (isWebAdmin && !form.oficina) e.oficina = `Seleccioná la sucursal de este ${esIngreso ? "ingreso" : "egreso"}.`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Validación COMPLETA (por seguridad, antes de guardar) ──────
  //    Es exactamente la validación original, toda junta.
  const validateAll = () => {
    const e = {};
    if (!form.monto || Number(form.monto) <= 0) e.monto = "Ingresá un monto válido.";
    if (isVirtual && !form.billetera?.trim()) e.billetera = "Indicá la cuenta / banco.";
    if (!esIngreso && !form.descripcion?.trim()) e.descripcion = "La descripción es obligatoria.";
    if (!form.categoria?.trim()) e.categoria = "Indicá la categoría.";
    if (!form.fecha) e.fecha = "Seleccioná la fecha.";
    if (isWebAdmin && !form.oficina) e.oficina = `Seleccioná la sucursal de este ${esIngreso ? "ingreso" : "egreso"}.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const irAtras = () => {
    setErrors({});
    setPaso((p) => Math.max(1, p - 1));
  };

  const irSiguiente = () => {
    // Paso 1 no tiene validación (solo se elige tipo)
    if (paso === 1) { setErrors({}); setPaso(2); return; }
    if (paso === 2) { if (validarPaso(2)) setPaso(3); return; }
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    // Si todavía no estamos en el último paso, "Enter" avanza en vez de guardar
    if (paso < TOTAL_PASOS) { irSiguiente(); return; }
    if (!validateAll()) return;

    const montoNum = Number(form.monto || 0);
    const catNorm = normalizarStr(form.categoria);
    const billeteraDetalle = isVirtual ? form.billetera || "Sin especificar" : "";

    try {
      setSubmitting(true);

      if (esIngreso) {
        // ── INGRESO ──────────────────────────────────────────────
        let descripcionBase = normalizarStr(form.descripcion) || `Ingreso ${catNorm}`.trim();
        if (billeteraDetalle) descripcionBase = `${descripcionBase} [Cuenta: ${billeteraDetalle}]`;

        const payload = {
          monto: montoNum,
          fecha: form.fecha,
          forma_pago: form.forma_pago,
          billetera: billeteraDetalle,
          categoria: catNorm || "Sin categoría",
          descripcion: descripcionBase,
          pagado_por: normalizarStr(form.pagado_por) || "No especificado",
          oficina: isWebAdmin ? form.oficina : undefined,
        };
        await dispatch(createIngreso(payload)).unwrap();

        const existeCat = (categorias || []).some((c) => c.nombre.toLowerCase() === catNorm.toLowerCase());
        if (catNorm && !existeCat) dispatch(createCategoria({ nombre: catNorm, tipo: "INGRESO" }));
      } else {
        // ── EGRESO ───────────────────────────────────────────────
        const destinatario = normalizarStr(form.destinatario);
        let descripcionBase = normalizarStr(form.descripcion);
        if (billeteraDetalle) descripcionBase = `${descripcionBase} [Cuenta: ${billeteraDetalle}]`;
        if (destinatario) descripcionBase = `${descripcionBase} → ${destinatario}`;

        const payload = {
          descripcion: descripcionBase,
          monto: montoNum,
          categoria: catNorm,
          fecha: form.fecha,
          forma_pago: form.forma_pago,
          billetera: billeteraDetalle,
          observaciones: "",
          oficina: isWebAdmin ? form.oficina : undefined,
        };
        await dispatch(createEgreso(payload)).unwrap();

        const existeCat = (categorias || []).some((c) => c.nombre.toLowerCase() === catNorm.toLowerCase());
        if (catNorm && !existeCat) dispatch(createCategoria({ nombre: catNorm, tipo: "EGRESO" }));
      }

      // Refrescar el balance del día en la oficina correspondiente
      const ofiParaBalance = isWebAdmin ? form.oficina : userOficina;
      dispatch(fetchBalanceDiario({ fecha: form.fecha, oficina: ofiParaBalance }));

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
  const pasoDosOk = form.monto && Number(form.monto) > 0 && form.categoria && (!isVirtual || form.billetera);
  const finalDisabled =
    submitting || !form.monto || !form.fecha || !form.categoria ||
    (!esIngreso && !form.descripcion) ||
    (isWebAdmin && !form.oficina) || (isVirtual && !form.billetera);

  const tituloPaso =
    paso === 1 ? "¿Qué querés cargar?" :
    paso === 2 ? `${esIngreso ? "Ingreso" : "Egreso"} — monto y categoría` :
    `${esIngreso ? "Ingreso" : "Egreso"} — detalle y confirmación`;

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
        {/* PASO 1 · TIPO                                                 */}
        {/* ============================================================ */}
        {paso === 1 && (
          <div className="space-y-3">
            <SectionLabel>Tipo de movimiento</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              {/* INGRESO */}
              <button
                type="button"
                onClick={() => cambiarTipo("INGRESO")}
                className={`flex flex-col items-center justify-center gap-2 py-6 rounded-2xl border-2 font-black transition-all ${
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
                className={`flex flex-col items-center justify-center gap-2 py-6 rounded-2xl border-2 font-black transition-all ${
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
        )}

        {/* ============================================================ */}
        {/* PASO 2 · MONTO + FORMA DE PAGO + CATEGORÍA                    */}
        {/* ============================================================ */}
        {paso === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black mb-1.5 text-suave dark:text-suave-dark">Monto <span className="text-egreso">*</span></label>
              <div className={`flex items-center gap-2 w-full px-3 h-12 border-2 rounded-xl bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark transition-colors focus-within:border-${esIngreso ? "ingreso" : "egreso"}`}>
                <span className="text-suave dark:text-suave-dark font-black shrink-0">$</span>
                <input ref={montoRef} name="monto" type="text" inputMode="decimal" value={montoToDisplay(form.monto)} onChange={(e) => setForm((p) => ({ ...p, monto: montoFromInput(e.target.value) }))} className="flex-1 min-w-0 bg-transparent outline-none text-lg font-mono font-black text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark" placeholder="0" />
              </div>
              {errors.monto && <p className="text-[11px] font-bold text-egreso mt-1">{errors.monto}</p>}
            </div>

            <div>
              <label className="block text-xs font-black mb-2 text-suave dark:text-suave-dark">Forma de pago <span className="text-egreso">*</span></label>
              <div className="flex flex-wrap gap-2">
                {["EFECTIVO", "TRANSFERENCIA", "TARJETA", "MERCADOPAGO", "OTRO"].map((fp) => (
                  <button key={fp} type="button" onClick={() => setFormaPago(fp)} className={`px-4 py-2 text-xs sm:text-sm rounded-xl font-black transition-colors border-2 ${form.forma_pago === fp ? T.formaOn : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark hover:text-titulo dark:hover:text-titulo-dark"}`}>
                    {labelFormaPago(fp)}
                  </button>
                ))}
              </div>
            </div>

            {isVirtual && (
              <div className="bg-surface dark:bg-surface-dark p-3 rounded-xl border-2 border-linea dark:border-linea-dark space-y-3">
                <div>
                  <label className="block text-xs font-black mb-1.5 text-suave dark:text-suave-dark">
                    {esIngreso ? "Cuenta destino (del estudio)" : "Cuenta origen (del estudio)"} <span className="text-egreso">*</span>
                  </label>
                  {mediosCobro.length > 0 ? (
                    <select name="billetera" value={form.billetera} onChange={handleChange} className={`${inputLite} cursor-pointer`}>
                      <option value="">Seleccionar cuenta…</option>
                      {mediosCobro.map((m) => (
                        <option key={m.id} value={m.valor}>
                          {m.etiqueta || m.titular_nombre} — {m.valor} ({m.proveedor?.replace("_", " ")})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input name="billetera" value={form.billetera} onChange={handleChange} placeholder="Ej: Banco Nación, alias.mp…" className={inputLite} />
                  )}
                  {errors.billetera && <p className="text-[11px] font-bold text-egreso mt-1">{errors.billetera}</p>}
                </div>
                <div>
                  <label className="block text-xs font-black mb-1.5 text-suave dark:text-suave-dark">
                    {esIngreso ? "Enviado por (cliente / remitente)" : "Destinatario / A quién se pagó"}
                  </label>
                  <input
                    name={esIngreso ? "pagado_por" : "destinatario"}
                    value={esIngreso ? form.pagado_por : form.destinatario}
                    onChange={handleChange}
                    placeholder={esIngreso ? "Ej: Juan Pérez, nombre del banco…" : "Ej: Proveedor X, nombre del titular…"}
                    className={inputLite}
                  />
                </div>
              </div>
            )}

            <div className="border-t-2 border-linea dark:border-linea-dark" />

            <CategoriaSelect
              tipo={tipo}
              value={form.categoria}
              onChange={handleCategoriaChange}
              error={errors.categoria}
              refProp={catRef}
            />
          </div>
        )}

        {/* ============================================================ */}
        {/* PASO 3 · DETALLE + FECHA/SUCURSAL + RESUMEN                   */}
        {/* ============================================================ */}
        {paso === 3 && (
          <div className="space-y-5">
            {/* DETALLE */}
            <div className="space-y-4">
              <SectionLabel>Detalle</SectionLabel>

              {/* Egreso: descripción obligatoria */}
              {!esIngreso && (
                <div>
                  <label className="block text-xs font-black mb-1.5 text-suave dark:text-suave-dark">Descripción / Motivo <span className="text-egreso">*</span></label>
                  <input name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Ej: Artículos de limpieza, Luz…" className={inputBase} />
                  {errors.descripcion && <p className="text-[11px] font-bold text-egreso mt-1">{errors.descripcion}</p>}
                </div>
              )}

              {/* Ingreso: descripción opcional + pagado por */}
              {esIngreso && (
                <>
                  <div>
                    <label className="block text-xs font-black mb-1.5 text-suave dark:text-suave-dark">Descripción <span className="text-suave dark:text-suave-dark font-bold">(Opcional)</span></label>
                    <input name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Detalle del ingreso…" className={inputBase} />
                  </div>
                  {!isVirtual && (
                    <div>
                      <label className="block text-xs font-black mb-1.5 text-suave dark:text-suave-dark">Pagado por <span className="text-suave dark:text-suave-dark font-bold">(Opcional)</span></label>
                      <input name="pagado_por" value={form.pagado_por} onChange={handleChange} placeholder="Ej: Juan Pérez" className={inputBase} />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t-2 border-linea dark:border-linea-dark" />

            {/* FECHA Y SUCURSAL */}
            <div className="space-y-4">
              <SectionLabel>Fecha{isWebAdmin ? " y sucursal" : ""}</SectionLabel>

              <div className={isWebAdmin ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : ""}>
                <div>
                  <label className="block text-xs font-black mb-1.5 text-suave dark:text-suave-dark">Fecha <span className="text-egreso">*</span></label>
                  <input name="fecha" type="date" value={form.fecha} onChange={handleChange} className={`${inputBase} dark:[color-scheme:dark]`} />
                  {errors.fecha && <p className="text-[11px] font-bold text-egreso mt-1">{errors.fecha}</p>}
                </div>

                {isWebAdmin && (
                  <div>
                    <label className="block text-xs font-black mb-1.5 text-suave dark:text-suave-dark">Sucursal <span className="text-egreso">*</span></label>
                    <select name="oficina" value={form.oficina} onChange={handleChange} className={`${inputBase} cursor-pointer dark:[color-scheme:dark]`}>
                      <option value="">Seleccione una sucursal...</option>
                      {oficinas?.map((ofi) => (
                        <option key={ofi.id} value={ofi.id}>{ofi.nombre}</option>
                      ))}
                    </select>
                    {errors.oficina && <p className="text-[11px] font-bold text-egreso mt-1">{errors.oficina}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* RESUMEN */}
            <div className="rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3 text-sm space-y-1.5">
              <p className="text-[11px] uppercase tracking-wide font-black text-suave dark:text-suave-dark mb-1">Resumen — {esIngreso ? "Ingreso" : "Egreso"}</p>
              <div className="flex justify-between"><span className="font-bold text-suave dark:text-suave-dark">Monto</span><span className={`font-mono font-black ${T.resumenMonto}`}>{fmtMoney(form.monto)}</span></div>
              <div className="flex justify-between"><span className="font-bold text-suave dark:text-suave-dark">Forma de pago</span><span className="font-bold text-titulo dark:text-titulo-dark">{labelFormaPago(form.forma_pago)}</span></div>
              <div className="flex justify-between"><span className="font-bold text-suave dark:text-suave-dark">Categoría</span><span className="font-bold text-titulo dark:text-titulo-dark">{form.categoria || "—"}</span></div>
              <div className="flex justify-between"><span className="font-bold text-suave dark:text-suave-dark">Descripción</span><span className="font-bold text-titulo dark:text-titulo-dark truncate ml-3 text-right">{form.descripcion || "—"}</span></div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* FOOTER · navegación                                          */}
        {/* ============================================================ */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t-2 border-linea dark:border-linea-dark">
          {/* Botón izquierdo: Cancelar (paso 1) o Atrás (pasos 2-3) */}
          {paso === 1 ? (
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-black border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark transition-colors">
              Cancelar
            </button>
          ) : (
            <button type="button" onClick={irAtras} className="px-5 py-2.5 rounded-xl text-sm font-black border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark transition-colors">
              ← Atrás
            </button>
          )}

          {/* Botón derecho: Siguiente (pasos 1-2) o Confirmar (paso 3) */}
          {paso < TOTAL_PASOS ? (
            <button
              type="button"
              onClick={irSiguiente}
              disabled={paso === 2 && !pasoDosOk}
              className={`px-6 py-2.5 rounded-xl text-sm font-black text-white transition-all ${(paso === 2 && !pasoDosOk) ? T.btnDisabled : T.btnOk}`}
            >
              Siguiente →
            </button>
          ) : (
            <button type="submit" disabled={finalDisabled} className={`px-6 py-2.5 rounded-xl text-sm font-black text-white transition-all ${finalDisabled ? T.btnDisabled : T.btnOk}`}>
              {submitting ? "Guardando…" : `Confirmar ${esIngreso ? "ingreso" : "egreso"}`}
            </button>
          )}
        </div>
      </form>
    </ModalWrapper>
  );
}