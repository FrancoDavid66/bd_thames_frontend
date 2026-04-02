// src/components/cotizaciones/CotizacionModal.jsx
import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { createCotizacion, updateCotizacion } from "../../store/slices/cotizacionesSlice";
import { HiX, HiPlus, HiTrash, HiStar, HiChevronRight, HiChevronLeft, HiCheckCircle, HiDocumentDownload, HiPrinter, HiPhotograph } from "react-icons/hi";
import { FaUserAlt, FaCar, FaCalculator, FaBuilding } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { toPng } from 'html-to-image';
import { jsPDF } from "jspdf";
import { motion, AnimatePresence } from "framer-motion";
import CotizacionPDFTemplate from "./CotizacionPDFTemplate";

const BASE_URL = import.meta.env.VITE_API_URL;
const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatMoneyInput = (val) => {
  if (val === "" || val === null || val === undefined) return "";
  let cleanValue = String(val).replace(/[^0-9,]/g, '');
  let [entera, decimal] = cleanValue.split(',');
  if (entera) entera = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimal !== undefined ? `${entera},${decimal.slice(0, 2)}` : entera;
};

const parseToNumber = (val) => {
  if (val === "" || val === null || val === undefined) return 0;
  return Number(String(val).replace(/\./g, '').replace(',', '.'));
};

const formatFromBackend = (val) => {
  if (val === null || val === undefined || val === '') return "";
  return formatMoneyInput(String(val).replace('.', ','));
};

const redondearPrecio = (valor) => {
    if (!valor) return 0;
    return Math.ceil(valor / 1000) * 1000; 
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25, delayChildren: 0.1, staggerChildren: 0.05 } 
  },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } }
};

const stepVariants = {
  initial: (direction) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
    scale: 0.98
  }),
  animate: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.3 } }
  },
  exit: (direction) => ({
    x: direction < 0 ? 50 : -50,
    opacity: 0,
    scale: 0.98,
    transition: { x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.3 } }
  })
};

const listItemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 25 } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.2 } }
};

const CotizacionModal = ({ isOpen, onClose, cotizacionEdit = null, isPdfMode = false }) => {
  const dispatch = useDispatch();
  
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0); 
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const [globalMargin, setGlobalMargin] = useState("35");

  const [companiasBackend, setCompaniasBackend] = useState([]);
  const [coberturasBackend, setCoberturasBackend] = useState([]);

  // 🚀 AÑADIMOS imagen_auto AL ESTADO
  const [formData, setFormData] = useState({
    cliente_nombre: "", telefono: "", marca_auto: "", modelo_auto: "",
    anio_auto: new Date().getFullYear(), tiene_gnc: false, estado: "PENDIENTE",
    imagen_auto: null // 🚀 ACÁ GUARDAMOS EL BASE64
  });

  const [opciones, setOpciones] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setStep(isPdfMode ? 4 : 1);
      setDirection(0);
      
      axios.get(`${BASE_URL}cotizaciones/companias/`, { headers: getAuthHeaders() })
        .then(res => setCompaniasBackend(res.data.results || res.data))
        .catch(err => console.error("Error companias:", err));

      axios.get(`${BASE_URL}cotizaciones/coberturas/`, { headers: getAuthHeaders() })
        .then(res => setCoberturasBackend(res.data.results || res.data))
        .catch(err => console.error("Error coberturas:", err));

      axios.get(`${BASE_URL}cotizaciones/configuracion/`, { headers: getAuthHeaders() })
        .then(res => setGlobalMargin(String(Math.round(Number(res.data.margen_ganancia_default) || 35))))
        .catch(err => console.error("Error cargando configuración global:", err));
    }
  }, [isOpen, isPdfMode]);

  useEffect(() => {
    if (cotizacionEdit) {
      setFormData({
        cliente_nombre: cotizacionEdit.cliente_nombre, telefono: cotizacionEdit.telefono || "",
        marca_auto: cotizacionEdit.marca_auto, modelo_auto: cotizacionEdit.modelo_auto,
        anio_auto: cotizacionEdit.anio_auto, tiene_gnc: cotizacionEdit.tiene_gnc, estado: cotizacionEdit.estado,
        imagen_auto: cotizacionEdit.imagen_auto || null // 🚀 SI VIENE DEL BACKEND, LA CARGAMOS
      });
      const opsAcomodadas = (cotizacionEdit.opciones || []).map(op => ({
        ...op, 
        compania_id: op.compania, 
        cobertura_id: op.cobertura,
        detalles_cobertura: Array.isArray(op.detalles_cobertura) ? op.detalles_cobertura : [],
        suma_asegurada: formatFromBackend(op.suma_asegurada),
        costo_compania: formatFromBackend(op.costo_compania),
        objetivo_ganancia: op.objetivo_ganancia ? String(Math.round(Number(op.objetivo_ganancia))) : globalMargin
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
      imagen_auto: null
    });
    setOpciones([]);
  };

  const toggleCompaniaCard = (cia) => {
    const tieneCompania = opciones.some(o => String(o.compania_id) === String(cia.id));
    if (tieneCompania) {
      setOpciones(opciones.filter(o => String(o.compania_id) !== String(cia.id)));
    } else {
      setOpciones([...opciones, { 
        compania_id: cia.id, 
        cobertura_id: "", 
        costo_compania: "", 
        porcentaje_comision: cia.comision_default || 0, 
        suma_asegurada: "", 
        detalles_cobertura: [], 
        es_recomendada: opciones.length === 0, 
        objetivo_ganancia: globalMargin, 
        tempId: Date.now() 
      }]);
    }
  };

  const handleAddBlankOption = () => {
    setOpciones([...opciones, { compania_id: "", cobertura_id: "", costo_compania: "", porcentaje_comision: 0, suma_asegurada: "", detalles_cobertura: [], es_recomendada: opciones.length === 0, objetivo_ganancia: globalMargin, tempId: Date.now() }]);
  };

  const handleCompaniaChange = (index, newCompaniaId) => {
    const newOptions = [...opciones];
    const ciaSeleccionada = companiasBackend.find(c => String(c.id) === String(newCompaniaId));
    
    newOptions[index].compania_id = newCompaniaId;
    newOptions[index].cobertura_id = ""; 
    newOptions[index].detalles_cobertura = [];
    newOptions[index].porcentaje_comision = ciaSeleccionada?.comision_default || 0;
    
    setOpciones(newOptions);
  };

  const handleRemoveOption = (index) => setOpciones(opciones.filter((_, i) => i !== index));
  
  const handleOptionChange = (index, field, value) => {
    const newOptions = [...opciones];
    if (field === "es_recomendada" && value === true) {
        newOptions.forEach(o => o.es_recomendada = false); 
    }
    
    if (field === "objetivo_ganancia") {
      newOptions[index][field] = value ? String(Math.round(Number(value))) : "";
    } else {
      newOptions[index][field] = value;
    }
    
    setOpciones(newOptions);
  };

  const handleCoberturaChange = (index, coberturaId) => {
    handleOptionChange(index, "cobertura_id", coberturaId);
    const coberturaSeleccionada = coberturasBackend.find(c => String(c.id) === String(coberturaId));
    if (coberturaSeleccionada && Array.isArray(coberturaSeleccionada.beneficios_default)) {
      handleOptionChange(index, "detalles_cobertura", coberturaSeleccionada.beneficios_default);
    }
  };

  // 🚀 MANEJADOR PARA CARGAR LA IMAGEN Y CONVERTIRLA A BASE64
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Limite de 2MB para no trabar todo
        toast.error("La imagen es muy pesada. Elegí una que pese menos de 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, imagen_auto: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const paginate = (newStep) => {
    if (newStep > step) setDirection(1);
    else setDirection(-1);
    setStep(newStep);
  };

  const handleNextStep = () => {
    if (step === 1) {
        if (!formData.cliente_nombre) return toast.error("Falta el nombre del cliente");
        paginate(2);
    } else if (step === 2) {
        if (!formData.marca_auto || !formData.modelo_auto || !formData.anio_auto) return toast.error("Completá los datos del vehículo");
        paginate(3);
    } else if (step === 3) {
        if (opciones.length === 0) return toast.error("Seleccioná al menos una compañía para cotizar");
        if (opciones.some(op => !op.compania_id || !op.cobertura_id || !op.costo_compania)) {
            return toast.error("Completá Compañía, Cobertura y Costo en todas las opciones");
        }

        let opcionesModificadas = [...opciones];
        let mejorOpcionIndex = 0;
        let maxScore = -Infinity; 

        opcionesModificadas.forEach((op, index) => {
            const costo = parseToNumber(op.costo_compania);
            const recargoPct = parseToNumber(op.objetivo_ganancia || "0");
            const recargoPlata = (costo * recargoPct) / 100;
            const precioFinal = redondearPrecio(costo + recargoPlata);

            const coberturaSeleccionada = coberturasBackend.find(c => String(c.id) === String(op.cobertura_id));
            const cobName = coberturaSeleccionada?.nombre.toLowerCase() || "";
            const detalles = (op.detalles_cobertura || []).join(" ").toLowerCase();
            const textoEvaluacion = cobName + " " + detalles;

            let puntosCobertura = 0;
            
            if (textoEvaluacion.includes("todo riesgo") || textoEvaluacion.includes("franquicia") || textoEvaluacion.includes("tr")) {
                puntosCobertura += 1000000; 
            } else if (textoEvaluacion.includes("terceros completo") || textoEvaluacion.includes("full") || textoEvaluacion.includes("c ") || textoEvaluacion.includes("robo") || textoEvaluacion.includes("incendio")) {
                puntosCobertura += 500000;  
            } else if (textoEvaluacion.includes("b1") || textoEvaluacion.includes("terceros") || textoEvaluacion.includes("b ")) {
                puntosCobertura += 200000;  
            }

            puntosCobertura += ((op.detalles_cobertura || []).length * 10000);
            const score = puntosCobertura - precioFinal;

            if (score > maxScore) {
                maxScore = score;
                mejorOpcionIndex = index;
            }
        });

        opcionesModificadas = opcionesModificadas.map((op, index) => ({
            ...op,
            es_recomendada: index === mejorOpcionIndex
        }));

        setOpciones(opcionesModificadas);
        paginate(4);
    }
  };

  const handleSubmit = async () => {
    const opcionesConPrecio = opciones.map(op => {
      const costo = parseToNumber(op.costo_compania);
      const recargoPct = parseToNumber(op.objetivo_ganancia || "0");
      const recargoPlata = (costo * recargoPct) / 100;
      const precioFinal = redondearPrecio(costo + recargoPlata);
      
      return { 
          ...op, 
          compania: op.compania_id, 
          cobertura: op.cobertura_id, 
          precio_cliente: precioFinal,
          suma_asegurada: parseToNumber(op.suma_asegurada),
          costo_compania: costo,
          objetivo_ganancia: recargoPct
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

  const generatePDFDocument = async () => {
    const input = document.getElementById("pdf-quote-content");
    if (!input) {
        toast.error("No se encontró el contenedor del PDF.");
        return null;
    }

    try {
      const dataUrl = await toPng(input, {
        quality: 1,
        backgroundColor: '#faf9f6', 
        pixelRatio: 2, 
        width: 794, 
        height: input.scrollHeight, 
        style: {
          transform: 'none', 
          margin: '0',
          position: 'static'
        }
      });
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const ratio = imgProps.height / imgProps.width;
      
      let finalWidth = pdfWidth;
      let finalHeight = finalWidth * ratio;
      
      if (finalHeight > pdfHeight) {
          finalHeight = pdfHeight;
          finalWidth = finalHeight / ratio;
      }
      
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
    const loadingToastId = toast.loading("Generando documento...");

    try {
      const pdf = await generatePDFDocument();
      if (pdf) {
        const safeName = formData.cliente_nombre ? formData.cliente_nombre.replace(/[^a-zA-Z0-9]/g, '_') : 'Cliente';
        const fileName = `Propuesta_${safeName}_ThamesSeguros.pdf`;
        pdf.save(fileName);
        toast.success("¡PDF descargado con éxito!", { id: loadingToastId });
      } else {
        toast.error("Ocurrió un error al crear el archivo.", { id: loadingToastId });
      }
    } catch (error) {
      toast.error("Ocurrió un error al crear el archivo.", { id: loadingToastId });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrintPDF = async () => {
    setIsGeneratingPDF(true);
    const loadingToastId = toast.loading("Preparando para imprimir...");

    try {
      const pdf = await generatePDFDocument();
      if (pdf) {
        pdf.autoPrint();
        window.open(pdf.output('bloburl'), '_blank');
        toast.success("¡Documento listo para imprimir!", { id: loadingToastId });
      } else {
        toast.error("Ocurrió un error al preparar la impresión.", { id: loadingToastId });
      }
    } catch (error) {
      toast.error("Ocurrió un error al preparar la impresión.", { id: loadingToastId });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const autoAntiguedad = currentYear - Number(formData.anio_auto);

  const stepsConfig = [
      { num: 1, label: "Cliente", icon: FaUserAlt },
      { num: 2, label: "Vehículo", icon: FaCar },
      { num: 3, label: "Calculadora", icon: FaCalculator },
      { num: 4, label: "Resumen", icon: HiDocumentDownload }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div 
            className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden"
            variants={modalVariants}
          >
            
            {/* HEADER MODAL */}
            <div className="flex justify-between items-center p-5 border-b border-zinc-800/80 bg-zinc-900/60 rounded-t-3xl backdrop-blur-sm relative z-10">
              <h2 className="text-xl font-black text-white tracking-tight">
                {isPdfMode ? "Vista Previa de Propuesta" : (cotizacionEdit ? "Editar Cotización" : "Asistente de Cotización")}
              </h2>
              <motion.button 
                onClick={onClose} 
                className="text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-rose-500 rounded-full p-2 transition-colors cursor-pointer"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <HiX size={20} />
              </motion.button>
            </div>

            {/* PROGRESS BAR */}
            {!isPdfMode && (
            <div className="px-6 py-5 bg-zinc-900/30 border-b border-zinc-800/80 relative z-10">
                <div className="flex items-center justify-between relative max-w-3xl mx-auto">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-zinc-800 rounded-full z-0"></div>
                    <motion.div 
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 rounded-full z-0"
                        initial={{ width: "0%" }}
                        animate={{ width: `${((step - 1) / 3) * 100}%` }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    />
                    
                    {stepsConfig.map((s) => {
                        const isCompleted = step > s.num;
                        const isActive = step === s.num;
                        return (
                            <div key={s.num} className="relative z-10 flex flex-col items-center gap-2">
                                <motion.div 
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-colors duration-300 ${isActive ? "bg-indigo-600 border-zinc-950 text-white" : isCompleted ? "bg-indigo-500 border-zinc-950 text-white" : "bg-zinc-800 border-zinc-950 text-zinc-500"}`}
                                    animate={isActive ? { scale: 1.1, shadow: "0px 0px 15px rgba(99,102,241,0.4)" } : { scale: 1, shadow: "none" }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                >
                                    {isCompleted ? <HiCheckCircle size={20} /> : <s.icon size={14} />}
                                </motion.div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? "text-indigo-400" : isCompleted ? "text-indigo-500" : "text-zinc-600"}`}>
                                    {s.label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
            )}

            {/* BODY WIZARD SCROLLABLE */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={step} 
                  custom={direction}
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="p-6 w-full"
                >
                  
                  {step === 1 && (
                      <div className="space-y-6">
                          <div className="text-center mb-8 mt-4">
                              <h3 className="text-2xl font-black text-white">Datos del Prospecto</h3>
                              <p className="text-zinc-400 text-sm mt-1">Ingresá los datos de contacto para armar la cotización.</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                              <motion.div variants={listItemVariants}>
                                <label className="block text-[11px] text-zinc-400 mb-1.5 uppercase font-bold tracking-widest">Nombre Completo *</label>
                                <input type="text" autoFocus required value={formData.cliente_nombre} onChange={e => setFormData({...formData, cliente_nombre: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="Ej: Juan Pérez" />
                              </motion.div>
                              <motion.div variants={listItemVariants}>
                                <label className="block text-[11px] text-zinc-400 mb-1.5 uppercase font-bold tracking-widest">WhatsApp / Teléfono</label>
                                <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="Ej: 1122334455" />
                              </motion.div>
                          </div>
                      </div>
                  )}

                  {step === 2 && (
                      <div className="space-y-6">
                          <div className="text-center mb-8 mt-4">
                              <h3 className="text-2xl font-black text-white">Vehículo a Asegurar</h3>
                              <p className="text-zinc-400 text-sm mt-1">¿Qué nave estamos cotizando hoy?</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                              <motion.div variants={listItemVariants}>
                                <label className="block text-[11px] text-zinc-400 mb-1.5 uppercase font-bold tracking-widest">Marca *</label>
                                <input autoFocus type="text" value={formData.marca_auto} onChange={e => setFormData({...formData, marca_auto: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all" placeholder="Ej: Volkswagen" />
                              </motion.div>
                              <motion.div variants={listItemVariants}>
                                <label className="block text-[11px] text-zinc-400 mb-1.5 uppercase font-bold tracking-widest">Modelo *</label>
                                <input type="text" value={formData.modelo_auto} onChange={e => setFormData({...formData, modelo_auto: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all" placeholder="Ej: Gol Trend 1.6" />
                              </motion.div>
                              <motion.div variants={listItemVariants}>
                                <label className="block text-[11px] text-zinc-400 mb-1.5 uppercase font-bold tracking-widest">Año *</label>
                                <input type="number" value={formData.anio_auto} onChange={e => setFormData({...formData, anio_auto: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all font-mono text-lg" />
                              </motion.div>

                              {/* 🚀 BOTÓN PARA SUBIR LA FOTO DEL AUTO */}
                              <motion.div variants={listItemVariants} className="col-span-full mt-2">
                                <label className="block text-[11px] text-zinc-400 mb-1.5 uppercase font-bold tracking-widest">Foto del Vehículo (Opcional)</label>
                                <div className="relative flex items-center justify-center w-full h-32 bg-zinc-900/30 border-2 border-dashed border-zinc-700 hover:border-indigo-500 hover:bg-zinc-900/50 transition-colors rounded-2xl cursor-pointer overflow-hidden">
                                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                  {formData.imagen_auto ? (
                                    <div className="relative w-full h-full">
                                      <img src={formData.imagen_auto} alt="Vehículo" className="w-full h-full object-cover opacity-80" />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <span className="text-white font-bold text-sm flex items-center gap-2 drop-shadow-md"><HiPhotograph size={20}/> Tocar para cambiar foto</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center text-zinc-500">
                                      <HiPhotograph size={32} className="mb-2" />
                                      <span className="text-sm font-semibold">Hacé clic o arrastrá la imagen acá</span>
                                      <span className="text-xs mt-1">(Ideal para personalizar el PDF)</span>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                              
                              <motion.div variants={listItemVariants} className="col-span-full mt-2" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                                <div className="flex items-center justify-center gap-3 bg-zinc-900/30 border border-zinc-800 p-4 rounded-2xl hover:bg-zinc-900/50 transition-colors cursor-pointer">
                                  <input type="checkbox" id="gnc" checked={formData.tiene_gnc} onChange={e => setFormData({...formData, tiene_gnc: e.target.checked})} className="w-5 h-5 bg-zinc-900 border-zinc-700 rounded accent-indigo-500 cursor-pointer" />
                                  <label htmlFor="gnc" className="text-sm text-zinc-300 cursor-pointer font-bold tracking-wide">El vehículo tiene equipo de GNC instalado</label>
                                </div>
                              </motion.div>
                          </div>
                      </div>
                  )}

                  {step === 3 && (
                      <div className="space-y-6">
                          <div>
                            <h4 className="text-[11px] text-zinc-400 mb-3 uppercase font-bold tracking-widest text-center">Seleccioná las compañías base para comparar</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
                                {companiasBackend.map((cia, idx) => {
                                    const isSelected = opciones.some(o => String(o.compania_id) === String(cia.id));
                                    const isDisabled = autoAntiguedad > (cia.antiguedad_maxima || 25);
                                    return (
                                        <motion.button 
                                          key={cia.id} 
                                          type="button" 
                                          disabled={isDisabled} 
                                          onClick={() => toggleCompaniaCard(cia)} 
                                          className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col items-center justify-center gap-2 ${isDisabled ? 'border-zinc-800 bg-zinc-900/20 opacity-50 cursor-not-allowed' : isSelected ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10 scale-[1.02] cursor-pointer' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-800 cursor-pointer'}`}
                                          variants={listItemVariants}
                                          custom={idx}
                                          whileHover={isDisabled ? {} : { translateY: -5, scale: 1.03 }}
                                          whileTap={isDisabled ? {} : { scale: 0.97 }}
                                        >
                                            {isSelected && <div className="absolute top-2 right-2 text-indigo-400"><HiCheckCircle size={18}/></div>}
                                            <FaBuilding className={`text-2xl ${isDisabled ? 'text-zinc-700' : isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                                            <span className={`font-black text-sm tracking-wide ${isDisabled ? 'text-zinc-600' : isSelected ? 'text-white' : 'text-zinc-300'}`}>{cia.nombre}</span>
                                        </motion.button>
                                    )
                                })}
                            </div>
                          </div>

                          {opciones.length > 0 && <hr className="border-zinc-800/50 max-w-4xl mx-auto" />}

                          <div className="space-y-4 max-w-4xl mx-auto">
                            <AnimatePresence mode="popLayout">
                              {opciones.map((opcion, index) => {
                                const tempKey = opcion.id || opcion.tempId || index; 
                                
                                const costo = parseToNumber(opcion.costo_compania);
                                const comisionPct = Number(opcion.porcentaje_comision) || 0;
                                const recargoPct = parseToNumber(opcion.objetivo_ganancia || "0");
                                
                                const recargoPlata = (costo * recargoPct) / 100;
                                const precioClienteCalculado = opcion.precio_cliente ? Number(opcion.precio_cliente) : redondearPrecio(costo + recargoPlata);
                                
                                const gananciaComision = (costo * comisionPct) / 100;
                                const gananciaExtraRedondeada = precioClienteCalculado - costo;
                                const gananciaTotalBroker = gananciaComision + gananciaExtraRedondeada;

                                const coberturasFiltradas = coberturasBackend.filter(cob => String(cob.compania) === String(opcion.compania_id));

                                return (
                                  <motion.div 
                                    key={tempKey} 
                                    className={`bg-zinc-900/40 border p-5 rounded-2xl relative transition-colors duration-300 ${opcion.es_recomendada ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'border-zinc-800'}`}
                                    variants={listItemVariants}
                                    layout 
                                  >
                                    
                                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                                      <motion.button type="button" onClick={() => handleOptionChange(index, "es_recomendada", !opcion.es_recomendada)} className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider cursor-pointer ${opcion.es_recomendada ? "bg-amber-500 text-amber-950 shadow-md shadow-amber-500/20" : "bg-zinc-800 text-zinc-400 hover:text-amber-500 hover:bg-zinc-700"}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><HiStar size={14} /> {opcion.es_recomendada ? "Opción Recomendada" : "Recomendar"}</motion.button>
                                      <motion.button type="button" onClick={() => handleRemoveOption(index)} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-500 hover:text-white hover:bg-rose-600 transition cursor-pointer" title="Quitar opción" whileHover={{ scale: 1.1, rotate: 15 }} whileTap={{ scale: 0.9 }}><HiTrash size={16} /></motion.button>
                                    </div>
                                    
                                    <h4 className="text-sm font-black text-white mb-5 mt-1 flex items-center gap-2">
                                      <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md text-xs">Opción {index + 1}</span>
                                    </h4>

                                    <div className="mb-5">
                                        <label className="block text-[10px] text-zinc-400 mb-2 uppercase font-bold tracking-widest">1. Compañía Aseguradora</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {companiasBackend.map(c => {
                                                const isSelected = String(opcion.compania_id) === String(c.id);
                                                const isDisabled = autoAntiguedad > (c.antiguedad_maxima || 25);
                                                return (
                                                    <motion.button 
                                                      key={c.id} 
                                                      type="button" 
                                                      disabled={isDisabled} 
                                                      onClick={() => handleCompaniaChange(index, c.id)} 
                                                      className={`p-3 rounded-xl border-2 text-left transition-all duration-200 flex flex-col gap-1 relative overflow-hidden ${isDisabled ? 'border-zinc-800 bg-zinc-900/20 opacity-50 cursor-not-allowed' : isSelected ? 'border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/10 cursor-pointer' : 'border-zinc-800 bg-zinc-95 hover:border-zinc-600 hover:bg-zinc-900 cursor-pointer'}`}
                                                      whileHover={isDisabled ? {} : { translateY: -3, scale: 1.02 }}
                                                      whileTap={isDisabled ? {} : { scale: 0.98 }}
                                                    >
                                                        {isSelected && <div className="absolute top-2 right-2 text-indigo-400"><HiCheckCircle size={16}/></div>}
                                                        <span className={`font-black text-xs leading-tight pr-5 ${isDisabled ? 'text-zinc-600' : isSelected ? 'text-white' : 'text-zinc-300'}`}>{c.nombre}</span>
                                                    </motion.button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div className="mb-5">
                                        <label className="block text-[10px] text-zinc-400 mb-2 uppercase font-bold tracking-widest">2. Cobertura a Ofrecer</label>
                                        <AnimatePresence mode="wait">
                                          {!opcion.compania_id ? (
                                              <motion.div key="empty" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex items-center gap-2">⚠️ Seleccioná una compañía arriba para ver sus coberturas.</motion.div>
                                          ) : coberturasFiltradas.length === 0 ? (
                                              <motion.div key="none" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center gap-2">⚠️ Esta compañía no tiene coberturas cargadas en el sistema.</motion.div>
                                          ) : (
                                              <motion.div key="list" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                  {coberturasFiltradas.map(c => {
                                                      const isSelected = String(opcion.cobertura_id) === String(c.id);
                                                      return (
                                                          <motion.button 
                                                            key={c.id} 
                                                            type="button" 
                                                            onClick={() => handleCoberturaChange(index, c.id)} 
                                                            className={`p-3 rounded-xl border-2 text-left transition-all duration-200 flex flex-col gap-1 relative overflow-hidden cursor-pointer ${isSelected ? 'border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/10' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-900'}`}
                                                            whileHover={{ translateY: -3, scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                          >
                                                              {isSelected && <div className="absolute top-2 right-2 text-indigo-400"><HiCheckCircle size={16}/></div>}
                                                              <span className={`font-black text-xs leading-tight pr-5 ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{c.nombre}</span>
                                                              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-auto pt-2">{c.beneficios_default?.length || 0} Benefs.</span>
                                                          </motion.button>
                                                      )
                                                  })}
                                              </motion.div>
                                          )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 shadow-inner shadow-black/50">
                                      <div>
                                        <label className="block text-[10px] text-zinc-500 mb-1 uppercase font-bold tracking-widest">Suma Asegurada</label>
                                        <div className="relative">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                                          <input type="text" value={opcion.suma_asegurada || ''} onChange={e => handleOptionChange(index, "suma_asegurada", formatMoneyInput(e.target.value))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white font-bold outline-none focus:border-indigo-500 transition-colors" placeholder="0" />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-zinc-500 mb-1 uppercase font-bold tracking-widest">Comis. Oficial</label>
                                        <div className="relative">
                                          <input type="number" value={opcion.porcentaje_comision} onChange={e => handleOptionChange(index, "porcentaje_comision", e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-bold outline-none focus:border-indigo-500 transition-colors" />
                                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">%</span>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-zinc-500 mb-1 uppercase font-bold tracking-widest">Costo Cía</label>
                                        <div className="relative">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                                          <input type="text" value={opcion.costo_compania} onChange={e => handleOptionChange(index, "costo_compania", formatMoneyInput(e.target.value))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white font-bold outline-none focus:border-indigo-500 transition-colors" placeholder="0,00" />
                                        </div>
                                      </div>
                                      <div className="flex flex-col gap-3">
                                        <div>
                                          <label className="block text-[10px] text-emerald-500 mb-1 uppercase font-black tracking-widest">Recargo / Ganancia</label>
                                          <div className="relative">
                                            <input type="number" step="1" value={opcion.objetivo_ganancia || ''} onChange={e => handleOptionChange(index, "objetivo_ganancia", e.target.value)} className="w-full bg-zinc-900 border border-emerald-900/50 rounded-lg pl-3 pr-7 py-2 text-sm text-emerald-400 font-black outline-none focus:border-emerald-500 focus:bg-emerald-950/30 transition-colors" placeholder="0" />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">%</span>
                                          </div>
                                        </div>
                                        <motion.div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5 flex flex-col justify-center items-end flex-1 shadow-inner relative" layout>
                                          <span className="text-[9px] text-emerald-500 uppercase font-black tracking-widest">Precio Final</span>
                                          <motion.span 
                                            key={precioClienteCalculado} 
                                            initial={{ scale: 1.1, color: "#a7f3d0" }} 
                                            animate={{ scale: 1, color: "#34d399" }} 
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            className="text-2xl font-black leading-none drop-shadow-sm"
                                          >
                                            ${precioClienteCalculado.toLocaleString("es-AR")}
                                          </motion.span>
                                          
                                          {gananciaTotalBroker > 0 && (
                                            <div className="w-full flex justify-between items-center mt-2 pt-1.5 border-t border-emerald-500/20">
                                              <span className="text-[8px] uppercase text-emerald-600/80 font-bold tracking-wider">Tu Ganancia</span>
                                              <span className="text-[11px] text-emerald-400 font-black">
                                                +${gananciaTotalBroker.toLocaleString("es-AR")}
                                              </span>
                                            </div>
                                          )}
                                        </motion.div>
                                      </div>
                                    </div>

                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>

                            <AnimatePresence>
                            {opciones.length > 0 && (
                                <motion.div 
                                  className="mt-6 flex justify-center pb-4"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  transition={{ delay: 0.1 }}
                                  layout
                                >
                                    <motion.button 
                                      type="button" 
                                      onClick={handleAddBlankOption} 
                                      className="text-[12px] font-black uppercase tracking-widest bg-zinc-900 border-2 border-dashed border-zinc-700 hover:border-indigo-500 hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400 px-8 py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer w-full shadow-md"
                                      whileHover={{ scale: 1.01, borderStyle: "solid", borderColor: "#6366f1" }}
                                      whileTap={{ scale: 0.99 }}
                                    >
                                        <HiPlus size={18}/> Agregar Nueva Cotización
                                    </motion.button>
                                </motion.div>
                            )}
                            </AnimatePresence>
                          </div>
                      </div>
                  )}

                  {step === 4 && (
                      <div className="space-y-6 w-full mx-auto pb-4 overflow-x-auto custom-scrollbar">
                          {!isPdfMode && (
                          <div className="text-center mb-6 mt-2">
                              <h3 className="text-2xl font-black text-emerald-500 flex justify-center items-center gap-2"><HiCheckCircle/> ¡Propuesta Épica Lista!</h3>
                              <p className="text-zinc-400 text-sm mt-1">Este es el diseño premium que se descargará para tu cliente.</p>
                          </div>
                          )}

                          <div className="flex justify-center w-full min-w-[210mm] bg-black/20 p-4 rounded-3xl">
                            <CotizacionPDFTemplate 
                              formData={formData}
                              opciones={opciones}
                              companiasBackend={companiasBackend}
                              coberturasBackend={coberturasBackend}
                              cotizacionEdit={cotizacionEdit}
                              objetivoGanancia={globalMargin}
                            />
                          </div>
                      </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

            {/* FOOTER WIZARD ANIMADO */}
            <div className="p-5 border-t border-zinc-800/80 bg-zinc-900/60 rounded-b-3xl flex justify-between items-center backdrop-blur-sm relative z-10">
                {isPdfMode ? (
                    <div className="flex justify-between w-full">
                        <motion.button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            Cerrar Vista Previa
                        </motion.button>
                        <div className="flex items-center gap-3">
                            <motion.button 
                                type="button" 
                                onClick={handlePrintPDF} 
                                disabled={isGeneratingPDF}
                                className={`px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest bg-zinc-800 text-white hover:bg-zinc-700 transition-all active:scale-95 flex items-center gap-2 cursor-pointer ${isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : ''}`}
                                whileHover={isGeneratingPDF ? {} : { translateY: -3 }}
                                whileTap={isGeneratingPDF ? {} : { scale: 0.95 }}
                            >
                                <HiPrinter size={18}/> Imprimir
                            </motion.button>
                            <motion.button 
                                type="button" 
                                onClick={handleDownloadPDF} 
                                disabled={isGeneratingPDF}
                                className={`px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer ${isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : ''}`}
                                whileHover={isGeneratingPDF ? {} : { translateY: -3, shadow: "0px 5px 15px rgba(99,102,241,0.4)" }}
                                whileTap={isGeneratingPDF ? {} : { scale: 0.95 }}
                            >
                                <HiDocumentDownload size={18}/> Descargar PDF
                            </motion.button>
                        </div>
                    </div>
                ) : (
                    <>
                        <motion.button type="button" onClick={() => step > 1 ? paginate(step - 1) : onClose()} className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2 cursor-pointer" whileHover={{ scale: 1.03, x: -3 }} whileTap={{ scale: 0.97 }}>
                            {step > 1 ? <><HiChevronLeft size={18}/> Atrás</> : "Cancelar"}
                        </motion.button>
                        
                        <AnimatePresence mode="wait">
                          {step < 4 ? (
                              <motion.button 
                                key="next"
                                type="button" 
                                onClick={handleNextStep} 
                                className="px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest bg-white text-zinc-950 hover:bg-zinc-200 shadow-lg shadow-white/10 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                whileHover={{ scale: 1.03, x: 3 }}
                                whileTap={{ scale: 0.97 }}
                              >
                                  Siguiente <HiChevronRight size={18}/>
                              </motion.button>
                          ) : (
                              <motion.div 
                                key="final"
                                className="flex items-center gap-3"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                              >
                                  <motion.button type="button" onClick={handlePrintPDF} disabled={isGeneratingPDF} className={`px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest bg-zinc-800 text-white hover:bg-zinc-700 transition-all active:scale-95 flex items-center gap-2 cursor-pointer ${isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : ''}`} title="Imprimir documento" whileHover={isGeneratingPDF ? {} : { scale: 1.05 }} whileTap={isGeneratingPDF ? {} : { scale: 0.95 }}><HiPrinter size={18}/></motion.button>
                                  <motion.button type="button" onClick={handleDownloadPDF} disabled={isGeneratingPDF} className={`px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest bg-zinc-800 text-white hover:bg-zinc-700 transition-all active:scale-95 flex items-center gap-2 cursor-pointer ${isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : ''}`} whileHover={isGeneratingPDF ? {} : { scale: 1.03 }} whileTap={isGeneratingPDF ? {} : { scale: 0.97 }}>Descargar PDF</motion.button>
                                  <motion.button type="button" onClick={handleSubmit} className="px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer" whileHover={{ scale: 1.03, translateY: -3 }} whileTap={{ scale: 0.97 }}>Guardar <HiCheckCircle size={18}/></motion.button>
                              </motion.div>
                          )}
                        </AnimatePresence>
                    </>
                )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CotizacionModal;