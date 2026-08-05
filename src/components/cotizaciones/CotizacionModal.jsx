// src/components/cotizaciones/CotizacionModal.jsx  (diseño Duo · 3 pasos · simplificado)
import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { createCotizacion, updateCotizacion } from "../../store/slices/cotizacionesSlice";
import { HiX, HiPlus, HiTrash, HiStar, HiChevronRight, HiChevronLeft, HiCheckCircle, HiDocumentDownload, HiPrinter } from "react-icons/hi";
import { FaUserAlt, FaCar, FaCalculator } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import CotizacionPDFTemplate from "./CotizacionPDFTemplate";

const BASE_URL = import.meta.env.VITE_API_URL;
const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Miles es-AR: 20000 -> "20.000"
const formatMoneyInput = (val) => {
  if (val === "" || val === null || val === undefined) return "";
  let cleanValue = String(val).replace(/[^0-9,]/g, "");
  let [entera, decimal] = cleanValue.split(",");
  if (entera) entera = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimal !== undefined ? `${entera},${decimal.slice(0, 2)}` : entera;
};
const parseToNumber = (val) => {
  if (val === "" || val === null || val === undefined) return 0;
  return Number(String(val).replace(/\./g, "").replace(",", "."));
};
const formatFromBackend = (val) => {
  if (val === null || val === undefined || val === "") return "";
  return formatMoneyInput(String(val).replace(".", ","));
};

const STEPS = [
  { num: 1, label: "Datos", icon: FaUserAlt },
  { num: 2, label: "Cotizar", icon: FaCalculator },
  { num: 3, label: "Propuesta", icon: HiDocumentDownload },
];

const CotizacionModal = ({ isOpen, onClose, cotizacionEdit = null, isPdfMode = false }) => {
  const dispatch = useDispatch();

  const [step, setStep] = useState(1);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [errores, setErrores] = useState({});

  const [companiasBackend, setCompaniasBackend] = useState([]);
  const [coberturasBackend, setCoberturasBackend] = useState([]);

  const [formData, setFormData] = useState({
    cliente_nombre: "", telefono: "", marca_auto: "", modelo_auto: "",
    anio_auto: new Date().getFullYear(), tiene_gnc: false, estado: "PENDIENTE",
  });

  const [opciones, setOpciones] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setStep(isPdfMode ? 3 : 1);
      setErrores({});

      axios.get(`${BASE_URL}cotizaciones/companias/`, { headers: getAuthHeaders() })
        .then(res => setCompaniasBackend(res.data.results || res.data))
        .catch(err => console.error("Error companias:", err));

      axios.get(`${BASE_URL}cotizaciones/coberturas/`, { headers: getAuthHeaders() })
        .then(res => setCoberturasBackend(res.data.results || res.data))
        .catch(err => console.error("Error coberturas:", err));
    }
  }, [isOpen, isPdfMode]);

  useEffect(() => {
    if (cotizacionEdit) {
      setFormData({
        cliente_nombre: cotizacionEdit.cliente_nombre, telefono: cotizacionEdit.telefono || "",
        marca_auto: cotizacionEdit.marca_auto, modelo_auto: cotizacionEdit.modelo_auto,
        anio_auto: cotizacionEdit.anio_auto, tiene_gnc: cotizacionEdit.tiene_gnc, estado: cotizacionEdit.estado,
      });
      const opsAcomodadas = (cotizacionEdit.opciones || []).map(op => ({
        ...op,
        compania_id: op.compania,
        cobertura_id: op.cobertura,
        detalles_cobertura: Array.isArray(op.detalles_cobertura) ? op.detalles_cobertura : [],
        // el "monto" que ve el usuario = precio al cliente
        monto: formatFromBackend(op.precio_cliente),
        suma_asegurada: formatFromBackend(op.suma_asegurada),
      }));
      setOpciones(opsAcomodadas);
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cotizacionEdit, isOpen]);

  const resetForm = () => {
    setFormData({
      cliente_nombre: "", telefono: "", marca_auto: "", modelo_auto: "",
      anio_auto: new Date().getFullYear(), tiene_gnc: false, estado: "PENDIENTE",
    });
    setOpciones([]);
  };

  const setField = (field, value) => {
    setFormData(f => ({ ...f, [field]: value }));
    if (errores[field]) setErrores(e => ({ ...e, [field]: false }));
  };

  // ── Compañías (paso 2) ──
  const toggleCompaniaCard = (cia) => {
    const tiene = opciones.some(o => String(o.compania_id) === String(cia.id));
    if (tiene) {
      setOpciones(opciones.filter(o => String(o.compania_id) !== String(cia.id)));
    } else {
      setOpciones([...opciones, {
        compania_id: cia.id, cobertura_id: "", monto: "", suma_asegurada: "",
        detalles_cobertura: [], es_recomendada: opciones.length === 0, tempId: Date.now(),
      }]);
    }
  };

  const handleAddBlankOption = () => {
    setOpciones([...opciones, { compania_id: "", cobertura_id: "", monto: "", suma_asegurada: "", detalles_cobertura: [], es_recomendada: opciones.length === 0, tempId: Date.now() }]);
  };

  const handleCompaniaChange = (index, newCompaniaId) => {
    const newOptions = [...opciones];
    newOptions[index].compania_id = newCompaniaId;
    newOptions[index].cobertura_id = "";
    newOptions[index].detalles_cobertura = [];
    setOpciones(newOptions);
  };

  const handleRemoveOption = (index) => setOpciones(opciones.filter((_, i) => i !== index));

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...opciones];
    if (field === "es_recomendada" && value === true) {
      newOptions.forEach(o => o.es_recomendada = false);
    }
    newOptions[index][field] = value;
    setOpciones(newOptions);
  };

  const handleCoberturaChange = (index, coberturaId) => {
    handleOptionChange(index, "cobertura_id", coberturaId);
    const cob = coberturasBackend.find(c => String(c.id) === String(coberturaId));
    if (cob && Array.isArray(cob.beneficios_default)) {
      handleOptionChange(index, "detalles_cobertura", cob.beneficios_default);
    }
  };

  // ── Navegación + validación ──
  const validarPaso1 = () => {
    const errs = {};
    if (!formData.cliente_nombre.trim()) errs.cliente_nombre = true;
    if (!formData.marca_auto.trim()) errs.marca_auto = true;
    if (!formData.modelo_auto.trim()) errs.modelo_auto = true;
    if (!formData.anio_auto) errs.anio_auto = true;
    setErrores(errs);
    if (Object.keys(errs).length) { toast.error("Completá los campos marcados en rojo"); return false; }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!validarPaso1()) return;
      setStep(2);
    } else if (step === 2) {
      if (opciones.length === 0) return toast.error("Agregá al menos una compañía para cotizar");
      if (opciones.some(op => !op.compania_id || !op.cobertura_id || !op.monto)) {
        return toast.error("Completá Compañía, Cobertura y Monto en todas las opciones");
      }
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    // Payload compatible con el backend: precio_cliente = monto (lo que paga el cliente).
    // costo_compania es NOT NULL en el modelo → mandamos el mismo monto de placeholder.
    // Comisión y ganancia ya no se usan → 0.
    const opcionesConPrecio = opciones.map(op => {
      const monto = parseToNumber(op.monto);
      return {
        ...op,
        compania: op.compania_id,
        cobertura: op.cobertura_id,
        precio_cliente: monto,
        costo_compania: monto,
        porcentaje_comision: 0,
        objetivo_ganancia: 0,
        suma_asegurada: parseToNumber(op.suma_asegurada),
      };
    });

    const dataToSend = { ...formData, opciones: opcionesConPrecio };

    try {
      if (cotizacionEdit) {
        await dispatch(updateCotizacion({ id: cotizacionEdit.id, ...dataToSend })).unwrap();
        toast.success("Cotización actualizada");
      } else {
        await dispatch(createCotizacion(dataToSend)).unwrap();
        toast.success("Cotización creada con éxito");
      }
      onClose();
    } catch (error) {
      toast.error("Hubo un error al guardar");
    }
  };

  // ── PDF ──
  const generatePDFDocument = async () => {
    const input = document.getElementById("pdf-quote-content");
    if (!input) { toast.error("No se encontró el contenedor del PDF."); return null; }
    try {
      const dataUrl = await toPng(input, {
        quality: 1, backgroundColor: "#ffffff", pixelRatio: 2,
        width: 794, height: input.scrollHeight,
        style: { transform: "none", margin: "0", position: "static" },
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(dataUrl);
      const ratio = imgProps.height / imgProps.width;
      let finalWidth = pdfWidth;
      let finalHeight = finalWidth * ratio;
      if (finalHeight > pdfHeight) { finalHeight = pdfHeight; finalWidth = finalHeight / ratio; }
      const xOffset = (pdfWidth - finalWidth) / 2;
      pdf.addImage(dataUrl, "PNG", xOffset, 0, finalWidth, finalHeight);
      return pdf;
    } catch (error) {
      console.error("Error generando imagen para PDF:", error);
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    const t = toast.loading("Generando documento...");
    try {
      const pdf = await generatePDFDocument();
      if (pdf) {
        const safeName = formData.cliente_nombre ? formData.cliente_nombre.replace(/[^a-zA-Z0-9]/g, "_") : "Cliente";
        pdf.save(`Propuesta_${safeName}_ThamesSeguros.pdf`);
        toast.success("¡PDF descargado!", { id: t });
      } else { toast.error("Error al crear el archivo.", { id: t }); }
    } catch { toast.error("Error al crear el archivo.", { id: t }); }
    finally { setIsGeneratingPDF(false); }
  };

  const handlePrintPDF = async () => {
    setIsGeneratingPDF(true);
    const t = toast.loading("Preparando para imprimir...");
    try {
      const pdf = await generatePDFDocument();
      if (pdf) {
        pdf.autoPrint();
        window.open(pdf.output("bloburl"), "_blank");
        toast.success("¡Listo para imprimir!", { id: t });
      } else { toast.error("Error al preparar la impresión.", { id: t }); }
    } catch { toast.error("Error al preparar la impresión.", { id: t }); }
    finally { setIsGeneratingPDF(false); }
  };

  const currentYear = new Date().getFullYear();
  const autoAntiguedad = currentYear - Number(formData.anio_auto);

  if (!isOpen) return null;

  const inputCls = (err) =>
    `w-full h-12 rounded-2xl bg-surface dark:bg-surface-dark border-2 px-4 text-titulo dark:text-titulo-dark font-bold outline-none transition-colors ${
      err ? "border-egreso" : "border-linea dark:border-linea-dark focus:border-oficina"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">

        {/* HEADER */}
        <div className="flex justify-between items-center px-5 py-4 border-b-2 border-linea dark:border-linea-dark shrink-0">
          <h2 className="text-lg font-black text-titulo dark:text-titulo-dark">
            {isPdfMode ? "Vista previa de la propuesta" : (cotizacionEdit ? "Editar cotización" : "Nueva cotización")}
          </h2>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark hover:border-egreso hover:text-egreso text-suave dark:text-suave-dark flex items-center justify-center transition-colors cursor-pointer">
            <HiX size={20} />
          </button>
        </div>

        {/* STEPPER */}
        {!isPdfMode && (
          <div className="px-6 py-4 bg-surface dark:bg-surface-dark border-b-2 border-linea dark:border-linea-dark shrink-0">
            <div className="flex items-center gap-2 max-w-lg mx-auto">
              {STEPS.map((s, i) => {
                const done = step > s.num, active = step === s.num;
                return (
                  <React.Fragment key={s.num}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2 transition-colors ${
                        active ? "bg-oficina text-white border-oficina" : done ? "bg-oficina text-white border-oficina" : "bg-card dark:bg-card-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark"
                      }`}>
                        {done ? <HiCheckCircle size={20} /> : <s.icon size={14} />}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${active ? "text-oficina" : "text-suave dark:text-suave-dark"}`}>{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-1 rounded-full -mt-5 ${step > s.num ? "bg-oficina" : "bg-linea dark:bg-linea-dark"}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ===== PASO 1: DATOS ===== */}
          {step === 1 && !isPdfMode && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-titulo dark:text-titulo-dark">Datos de la cotización</h3>
                <p className="text-sm font-bold text-suave dark:text-suave-dark mt-1">Cliente y vehículo en una sola pantalla.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-suave dark:text-suave-dark mb-1.5">Nombre del cliente <span className="text-egreso">*</span></label>
                  <input type="text" autoFocus value={formData.cliente_nombre} onChange={e => setField("cliente_nombre", e.target.value)} className={inputCls(errores.cliente_nombre)} placeholder="Ej: Juan Pérez" />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-suave dark:text-suave-dark mb-1.5">WhatsApp / Teléfono</label>
                  <input type="text" value={formData.telefono} onChange={e => setField("telefono", e.target.value)} className={inputCls(false)} placeholder="Ej: 11 2233-4455" />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-suave dark:text-suave-dark mb-1.5">Marca <span className="text-egreso">*</span></label>
                  <input type="text" value={formData.marca_auto} onChange={e => setField("marca_auto", e.target.value)} className={inputCls(errores.marca_auto)} placeholder="Ej: Volkswagen" />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-suave dark:text-suave-dark mb-1.5">Modelo <span className="text-egreso">*</span></label>
                  <input type="text" value={formData.modelo_auto} onChange={e => setField("modelo_auto", e.target.value)} className={inputCls(errores.modelo_auto)} placeholder="Ej: Gol Trend 1.6" />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-suave dark:text-suave-dark mb-1.5">Año <span className="text-egreso">*</span></label>
                  <input type="number" value={formData.anio_auto} onChange={e => setField("anio_auto", e.target.value)} className={`${inputCls(errores.anio_auto)} font-mono`} />
                </div>
                <label className="flex items-center justify-center gap-3 bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark rounded-2xl px-4 cursor-pointer hover:border-oficina transition-colors self-end h-12">
                  <input type="checkbox" checked={formData.tiene_gnc} onChange={e => setField("tiene_gnc", e.target.checked)} className="w-5 h-5 accent-[var(--color-oficina)]" />
                  <span className="text-sm font-black text-titulo dark:text-titulo-dark">Tiene GNC instalado</span>
                </label>
              </div>
            </div>
          )}

          {/* ===== PASO 2: COTIZAR ===== */}
          {step === 2 && !isPdfMode && (
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="text-center">
                <h3 className="text-xl font-black text-titulo dark:text-titulo-dark">Armá las opciones</h3>
                <p className="text-sm font-bold text-suave dark:text-suave-dark mt-1">Elegí compañía, cobertura y poné el monto que paga el cliente.</p>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-suave dark:text-suave-dark mb-3 text-center">Compañías para comparar</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {companiasBackend.map(cia => {
                    const isSelected = opciones.some(o => String(o.compania_id) === String(cia.id));
                    const isDisabled = autoAntiguedad > (cia.antiguedad_maxima || 25);
                    return (
                      <button key={cia.id} type="button" disabled={isDisabled} onClick={() => toggleCompaniaCard(cia)}
                        className={`relative p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          isDisabled ? "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark opacity-50 cursor-not-allowed" :
                          isSelected ? "border-oficina bg-oficina/10 text-titulo dark:text-titulo-dark cursor-pointer" :
                          "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-oficina/50 text-suave dark:text-suave-dark cursor-pointer"
                        }`}>
                        {isSelected && <div className="absolute top-2 right-2 text-oficina"><HiCheckCircle size={18} /></div>}
                        <span className="font-black text-sm">{cia.nombre}</span>
                        {isDisabled && <span className="text-[8px] font-bold text-suave dark:text-suave-dark">año no admitido</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                {opciones.map((opcion, index) => {
                  const coberturasFiltradas = coberturasBackend.filter(cob => String(cob.compania) === String(opcion.compania_id));
                  const selectCls = "w-full h-12 rounded-xl bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark px-3 text-titulo dark:text-titulo-dark font-bold outline-none focus:border-oficina cursor-pointer dark:[color-scheme:dark]";
                  return (
                    <div key={opcion.id || opcion.tempId || index}
                      className={`bg-surface dark:bg-surface-dark border-2 rounded-2xl p-5 ${opcion.es_recomendada ? "border-tarjeta" : "border-linea dark:border-linea-dark"}`}>
                      <div className="flex items-center justify-between mb-4">
                        <span className="bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark px-2.5 py-1 rounded-lg text-xs font-black border-2 border-linea dark:border-linea-dark">Opción {index + 1}</span>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleOptionChange(index, "es_recomendada", !opcion.es_recomendada)}
                            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider border-2 cursor-pointer transition-colors ${
                              opcion.es_recomendada ? "bg-tarjeta text-white border-tarjeta" : "bg-card dark:bg-card-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark hover:border-tarjeta"
                            }`}>
                            <HiStar size={14} /> {opcion.es_recomendada ? "Recomendada" : "Recomendar"}
                          </button>
                          <button type="button" onClick={() => handleRemoveOption(index)} className="w-8 h-8 rounded-xl bg-card dark:bg-card-dark text-suave dark:text-suave-dark border-2 border-linea dark:border-linea-dark hover:border-egreso hover:text-egreso transition-colors cursor-pointer flex items-center justify-center" title="Quitar">
                            <HiTrash size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark mb-1.5">1 · Compañía</label>
                          <select value={opcion.compania_id} onChange={e => handleCompaniaChange(index, e.target.value)} className={selectCls}>
                            <option value="">Elegir…</option>
                            {companiasBackend.map(c => {
                              const dis = autoAntiguedad > (c.antiguedad_maxima || 25);
                              return <option key={c.id} value={c.id} disabled={dis}>{c.nombre}{dis ? " (año no admitido)" : ""}</option>;
                            })}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark mb-1.5">2 · Cobertura</label>
                          <select value={opcion.cobertura_id} onChange={e => handleCoberturaChange(index, e.target.value)} disabled={!opcion.compania_id} className={`${selectCls} disabled:opacity-50`}>
                            <option value="">{!opcion.compania_id ? "Elegí compañía primero" : coberturasFiltradas.length === 0 ? "Sin coberturas cargadas" : "Elegir…"}</option>
                            {coberturasFiltradas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-ingreso mb-1.5">3 · Monto que paga el cliente</label>
                          <div className="flex items-center gap-2 h-14 rounded-xl bg-card dark:bg-card-dark border-2 border-ingreso/40 px-4 focus-within:border-ingreso transition-colors">
                            <span className="text-xl font-black text-ingreso">$</span>
                            <input type="text" inputMode="decimal" value={opcion.monto || ""} onChange={e => handleOptionChange(index, "monto", formatMoneyInput(e.target.value))} placeholder="0" className="flex-1 min-w-0 bg-transparent outline-none text-2xl font-mono font-black text-ingreso" />
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark mb-1.5">Suma asegurada <span className="normal-case font-bold">(opcional — dejala vacía si es R.C.)</span></label>
                          <div className="flex items-center gap-2 h-12 rounded-xl bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark px-4 focus-within:border-oficina transition-colors">
                            <span className="font-black text-suave dark:text-suave-dark">$</span>
                            <input type="text" inputMode="decimal" value={opcion.suma_asegurada || ""} onChange={e => handleOptionChange(index, "suma_asegurada", formatMoneyInput(e.target.value))} placeholder="0" className="flex-1 min-w-0 bg-transparent outline-none text-base font-mono font-bold text-titulo dark:text-titulo-dark" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {opciones.length > 0 && (
                  <button type="button" onClick={handleAddBlankOption}
                    className="w-full text-xs font-black uppercase tracking-widest bg-surface dark:bg-surface-dark border-2 border-dashed border-linea dark:border-linea-dark hover:border-oficina text-suave dark:text-suave-dark hover:text-oficina px-8 py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    <HiPlus size={18} /> Agregar otra opción
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ===== PASO 3: PROPUESTA / PDF ===== */}
          {step === 3 && (
            <div className="space-y-6 w-full mx-auto overflow-x-auto">
              {!isPdfMode && (
                <div className="text-center">
                  <h3 className="text-xl font-black text-ingreso flex justify-center items-center gap-2"><HiCheckCircle /> ¡Propuesta lista!</h3>
                  <p className="text-sm font-bold text-suave dark:text-suave-dark mt-1">Así se descarga para tu cliente.</p>
                </div>
              )}
              <div className="flex justify-center w-full min-w-[210mm] bg-slate-950/10 dark:bg-black/20 p-4 rounded-3xl">
                <CotizacionPDFTemplate
                  formData={formData}
                  opciones={opciones}
                  companiasBackend={companiasBackend}
                  coberturasBackend={coberturasBackend}
                  cotizacionEdit={cotizacionEdit}
                />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-4 border-t-2 border-linea dark:border-linea-dark shrink-0 flex justify-between items-center">
          {isPdfMode ? (
            <>
              <button type="button" onClick={onClose} className="px-5 h-11 rounded-2xl text-sm font-black text-titulo dark:text-titulo-dark bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark hover:border-egreso transition-colors cursor-pointer">Cerrar</button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handlePrintPDF} disabled={isGeneratingPDF} className="px-4 h-11 rounded-2xl text-sm font-black bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark border-2 border-linea dark:border-linea-dark hover:border-oficina transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"><HiPrinter size={18} /> Imprimir</button>
                <button type="button" onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="px-5 h-11 rounded-2xl text-sm font-black bg-oficina text-white border-2 border-oficina shadow-[0_5px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"><HiDocumentDownload size={18} /> Descargar PDF</button>
              </div>
            </>
          ) : (
            <>
              <button type="button" onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="px-5 h-11 rounded-2xl text-sm font-black text-titulo dark:text-titulo-dark bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark hover:border-egreso transition-colors flex items-center gap-2 cursor-pointer">
                {step > 1 ? <><HiChevronLeft size={18} /> Atrás</> : "Cancelar"}
              </button>
              {step < 3 ? (
                <button type="button" onClick={handleNextStep} className="px-6 h-11 rounded-2xl text-sm font-black bg-oficina text-white border-2 border-oficina shadow-[0_5px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer">
                  Siguiente <HiChevronRight size={18} />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handlePrintPDF} disabled={isGeneratingPDF} className="px-4 h-11 rounded-2xl text-sm font-black bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark border-2 border-linea dark:border-linea-dark hover:border-oficina transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50" title="Imprimir"><HiPrinter size={18} /></button>
                  <button type="button" onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="px-4 h-11 rounded-2xl text-sm font-black bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark border-2 border-linea dark:border-linea-dark hover:border-oficina transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"><HiDocumentDownload size={18} /> PDF</button>
                  <button type="button" onClick={handleSubmit} className="px-6 h-11 rounded-2xl text-sm font-black bg-ingreso text-white border-2 border-ingreso shadow-[0_5px_0_var(--color-ingreso-fuerte)] active:shadow-[0_0_0_var(--color-ingreso-fuerte)] active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer">Guardar <HiCheckCircle size={18} /></button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default CotizacionModal;
