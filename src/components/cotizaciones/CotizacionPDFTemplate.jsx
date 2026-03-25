// src/components/cotizaciones/CotizacionPDFTemplate.jsx
import React from "react";
import { FaCar, FaPhoneAlt, FaEnvelope } from "react-icons/fa";
import { HiCheckCircle } from "react-icons/hi";
import logoThames from "../../assets/logos/logo_thames_horizontal.png";

const parseToNumber = (val) => {
  if (val === "" || val === null || val === undefined) return 0;
  return Number(String(val).replace(/\./g, '').replace(',', '.'));
};

const CotizacionPDFTemplate = ({ 
  formData, 
  opciones, 
  companiasBackend, 
  coberturasBackend, 
  objetivoGanancia, 
  cotizacionEdit 
}) => {

  // 1. CALCULAMOS PRECIOS Y ORDENAMOS DE MENOR A MAYOR (Psicología de ventas)
  const opcionesCalculadas = [...opciones].map(op => {
      const costo = parseToNumber(op.costo_compania);
      const pct = Number(op.porcentaje_comision) || 0;
      // 🚀 ACÁ ESTÁ EL ÚNICO CAMBIO: Toma la ganancia individual para calcular el precio final exacto
      const objetivo = parseToNumber(op.objetivo_ganancia || objetivoGanancia || "30000");
      const precioFinal = op.precio_cliente ? Number(op.precio_cliente) : costo + Math.max(0, objetivo - ((costo * pct) / 100));
      const sumaAseguradaNum = parseToNumber(op.suma_asegurada);
      
      return { ...op, precioCalculado: precioFinal, sumaCalculada: sumaAseguradaNum };
  }).sort((a, b) => a.precioCalculado - b.precioCalculado); // Ordena por precio ascendente

  const opRecomendada = opcionesCalculadas.find(o => o.es_recomendada) || opcionesCalculadas[0];

  // 🚀 2. NUEVA LÓGICA DE ETIQUETAS Y COLORES (AZUL, VERDE, DORADO)
  const getBadgeInfo = (op, index, total) => {
      // 🥇 1. PRIORIDAD: NUESTRA RECOMENDACIÓN (DORADO/AMBER)
      if (op.es_recomendada) {
          return { 
              label: "★ NUESTRA RECOMENDACIÓN (EQUILIBRADA)", 
              bg: "bg-amber-500", // Gold (Tailwind amber es más dorado)
              text: "text-amber-700", // Texto descriptivo en dorado oscuro para legibilidad
              border: "border-amber-400 shadow-md", 
              priceText: "text-amber-600",
              sumaColors: "text-amber-600 bg-amber-50 border-amber-100",
              desc: "La mejor relación costo-beneficio del mercado. Estás cubierto contra lo importante sin pagar de más." 
          };
      }
      // 🥉 2. SEGUNDO: OPCIÓN BÁSICA (AZUL/BLUE)
      if (index === 0) {
          return { 
              label: "OPCIÓN BÁSICA (ESENCIAL)", 
              bg: "bg-blue-600", // Azul
              text: "text-blue-700", // Texto descriptivo en azul oscuro
              border: "border-blue-500", 
              priceText: "text-zinc-800", // Precio en negro estándar
              sumaColors: "text-blue-600 bg-blue-50 border-blue-100",
              desc: "Cobertura inicial indispensable para cumplir con la ley y poder circular por la calle tranquilo." 
          };
      }
      // 🥈 3. RESTO: OPCIONES INTERMEDIAS/VALOR AGREGADO (VERDE/EMERALD)
      // Agrupamos intermediatefallback y el caso Premium anterior, todo se vuelve verde competitivo.
      return { 
          label: "OPCIÓN INTERMEDIA (VALOR ADICIONAL)", // Renombrado de "Alternativa Competitiva" para que el cliente entienda que suma valor.
          bg: "bg-emerald-600", // Verde
          text: "text-emerald-700", // Texto descriptivo en verde oscuro
          border: "border-emerald-500", 
          priceText: "text-zinc-800", // Precio en negro estándar
          sumaColors: "text-emerald-600 bg-emerald-50 border-emerald-100",
          desc: "Una excelente alternativa para sumar a tu consideración con protecciones adicionales." 
      };
  };

  return (
    <div 
      id="pdf-quote-content" 
      className="bg-[#faf9f6] w-[210mm] min-h-[297mm] mx-auto text-zinc-900 relative flex flex-col font-sans overflow-hidden shadow-2xl"
    >
        {/* Thames Red Top Line */}
        <div className="h-4 w-full bg-red-600 absolute top-0 left-0 z-20"></div>

        <div className="bg-zinc-900 text-white px-10 pt-12 pb-20 rounded-b-[40px] shadow-lg relative z-10">
            <div className="flex justify-between items-start">
            <div className="flex items-center">
                <img src={logoThames} alt="Thames Seguros" className="h-16 object-contain" />
            </div>
            
            <div className="text-right text-xs text-zinc-400">
                <p className="uppercase tracking-widest font-bold text-[9px]">Fecha de Emisión</p>
                <p className="text-white font-bold text-sm mb-2">{new Date().toLocaleDateString('es-AR')}</p>
                <p className="uppercase tracking-widest font-bold text-[9px]">Propuesta ID</p>
                <p className="text-white font-bold text-sm">TS-{new Date().getFullYear()}-{(cotizacionEdit?.id || '001').toString().padStart(4, '0')}</p>
            </div>
            </div>

            <div className="mt-8 max-w-md">
            <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-1">Propuesta de Seguro Exclusiva Para:</p>
            <h2 className="text-4xl font-black text-white uppercase leading-tight">{formData.cliente_nombre}</h2>
            </div>

            <div className="flex gap-4 absolute -bottom-16 left-10 right-10">
                <div className="flex-1 bg-red-600 rounded-2xl p-5 shadow-2xl border-4 border-zinc-900 flex flex-col justify-center">
                    <p className="text-red-200 text-[9px] font-black uppercase tracking-widest mb-1">Detalles del Prospecto</p>
                    <p className="font-bold text-white text-xl leading-tight truncate">{formData.cliente_nombre}</p>
                    <p className="text-xs text-red-100 flex items-center gap-2 mt-2 font-medium"><FaPhoneAlt size={10}/> {formData.telefono || 'Sin teléfono registrado'}</p>
                </div>

                <div className="flex-1 bg-zinc-800 rounded-2xl p-5 shadow-2xl border-4 border-zinc-900 flex flex-col justify-center">
                    <p className="text-zinc-400 text-[9px] font-black uppercase tracking-widest mb-1">Especificaciones del Vehículo</p>
                    <p className="font-bold text-white text-lg leading-tight flex items-center gap-2 truncate"><FaCar className="text-red-500"/> {formData.marca_auto} {formData.modelo_auto}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                        <span className="bg-zinc-700 text-zinc-300 text-[9px] px-2 py-1 rounded font-bold uppercase">Año {formData.anio_auto}</span>
                        <span className="bg-red-500/20 text-red-400 text-[9px] px-2 py-1 rounded font-bold uppercase border border-red-500/30">
                        {formData.tiene_gnc ? '✔ GNC Incluido' : 'Uso Particular'}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div className="px-10 pt-24 flex-1 flex flex-col z-0">
            <div className="mb-8">
            
            <div className="grid grid-cols-12 gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-300 pb-2 mb-3 px-2">
                <div className="col-span-3 pl-2">Aseguradora</div>
                <div className="col-span-2 text-center">Suma Aseg.</div>
                <div className="col-span-4">Plan / Cobertura</div>
                <div className="col-span-3 text-right pr-2">Precio Mensual</div>
            </div>

            <div className="space-y-5">
                {opcionesCalculadas.map((op, idx) => {
                    const compName = companiasBackend.find(c => String(c.id) === String(op.compania_id))?.nombre || "Compañía";
                    const cobName = coberturasBackend.find(c => String(c.id) === String(op.cobertura_id))?.nombre || "Cobertura";
                    const badge = getBadgeInfo(op, idx, opcionesCalculadas.length);

                    return (
                        <div key={idx} className={`relative flex flex-col rounded-xl border-2 transition-all bg-white ${badge.border}`}>
                            
                            {/* ETIQUETA SUPERIOR ESTRATÉGICA CON COLOR MAP ADAPTADO */}
                            <div className={`absolute -top-3 left-4 ${badge.bg} text-white text-[8px] font-black uppercase px-3 py-0.5 rounded-full tracking-widest z-10 shadow-sm`}>
                                {badge.label}
                            </div>
                            
                            {/* FILA DE PRECIOS */}
                            <div className="grid grid-cols-12 gap-2 items-center px-4 pt-4 pb-2">
                                <div className="col-span-3 font-black text-zinc-900 text-sm truncate pr-2 flex items-center">
                                    <span>{compName.toUpperCase()}</span>
                                </div>
                                
                                <div className="col-span-2 flex items-center justify-center">
                                    {op.sumaCalculada > 0 ? (
                                        <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border ${badge.sumaColors}`}>
                                            ${op.sumaCalculada.toLocaleString("es-AR")}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-zinc-400">-</span>
                                    )}
                                </div>
                                
                                <div className="col-span-4 flex flex-col py-1 pr-2">
                                    <span className="text-[11px] font-bold text-zinc-600 leading-tight">{cobName}</span>
                                    <span className="text-[8px] text-zinc-400 leading-tight mt-0.5">
                                        {op.detalles_cobertura?.length > 0 
                                            ? op.detalles_cobertura.join(" • ") 
                                            : "Consultar beneficios exactos."}
                                    </span>
                                </div>

                                <div className="col-span-3 text-right flex items-center justify-end">
                                    <span className={`text-2xl font-black ${badge.priceText}`}>
                                        ${op.precioCalculado.toLocaleString("es-AR")}
                                    </span>
                                </div>
                            </div>

                            {/* DISCURSO DE VENTA AUTOMÁTICO CON COLOR MAP ADAPTADO */}
                            <div className={`px-4 pb-2 pt-1 bg-zinc-50/50 rounded-b-lg border-t border-zinc-100`}>
                                <p className={`text-[9px] font-semibold italic ${badge.text}`}>
                                    {badge.desc}
                                </p>
                            </div>

                        </div>
                    )
                })}
            </div>
            </div>

            {(() => {
            if (!opRecomendada) return null;
            const compNameRec = companiasBackend.find(c => String(c.id) === String(opRecomendada.compania_id))?.nombre || "Compañía";

            return (
                <div className="mb-auto">
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-300 pb-2 mb-3">
                        Por qué elegimos a <span className="text-zinc-800">{compNameRec.toUpperCase()}</span> para la opción Ideal:
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                        {opRecomendada.detalles_cobertura.map((tag, i) => (
                        <div key={i} className="flex gap-2.5 items-start bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                            <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center shrink-0 text-red-600 mt-0.5">
                                <HiCheckCircle size={14} />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-zinc-900 uppercase leading-tight">{tag}</p>
                                <p className="text-[8px] text-zinc-500 leading-tight mt-0.5 font-medium">Cobertura detallada según póliza.</p>
                            </div>
                        </div>
                        ))}
                        {opRecomendada.detalles_cobertura.length === 0 && (
                        <p className="text-xs text-zinc-400 italic">Beneficios estándar de mercado.</p>
                        )}
                    </div>
                </div>
            )
            })()}
        </div>

        <div className="px-10 pb-8 pt-6 bg-white border-t-2 border-zinc-100 flex justify-between items-end mt-8 relative z-10">
            <div className="flex gap-2">
            <div className="bg-red-600 text-white py-2.5 px-3 rounded-lg max-w-[130px] shadow-md">
                <p className="text-[8px] font-black uppercase tracking-widest mb-0.5 text-red-200">Validez</p>
                <p className="text-[10px] leading-tight font-bold">Presupuesto válido por 24 hs.</p>
            </div>
            <div className="bg-zinc-900 text-white py-2.5 px-3 rounded-lg max-w-[130px] shadow-md">
                <p className="text-[8px] font-black uppercase tracking-widest mb-0.5 text-zinc-400">Inspección</p>
                <p className="text-[10px] leading-tight font-bold">Sujeto a inspección vehicular.</p>
            </div>
            </div>

            <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2.5 mt-2">Tu Asesor de Confianza</p>
            <div className="flex flex-col gap-1 text-[9px] font-bold text-zinc-600">
                <span className="flex items-center gap-1.5 justify-end"><FaPhoneAlt className="text-red-500"/> +54 9 11 2424-8190</span>
                <span className="flex items-center gap-1.5 justify-end"><FaEnvelope className="text-red-500"/> cotizaciones@thames.com.ar</span>
            </div>
            </div>
        </div>
    </div>
  );
};

export default CotizacionPDFTemplate;