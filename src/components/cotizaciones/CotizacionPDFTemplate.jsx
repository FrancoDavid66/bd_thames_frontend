// src/components/cotizaciones/CotizacionPDFTemplate.jsx
import React from "react";
import { FaCar, FaPhoneAlt } from "react-icons/fa"; 
import { HiCheckCircle, HiTag } from "react-icons/hi";
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

  const opcionesCalculadas = [...opciones].map(op => {
      const costo = parseToNumber(op.costo_compania);
      const objetivo = parseToNumber(op.objetivo_ganancia || objetivoGanancia || "35");
      const precioFinal = op.precio_cliente ? Number(op.precio_cliente) : costo + Math.max(0, (costo * objetivo) / 100);
      const sumaAseguradaNum = parseToNumber(op.suma_asegurada);
      
      return { ...op, precioCalculado: Math.ceil(precioFinal / 1000) * 1000, sumaCalculada: sumaAseguradaNum };
  }).sort((a, b) => a.precioCalculado - b.precioCalculado);

  const opRecomendada = opcionesCalculadas.find(o => o.es_recomendada) || opcionesCalculadas[0];

  const getBadgeInfo = (op, index, total) => {
      if (op.es_recomendada) {
          return { 
              label: "★ NUESTRA RECOMENDACIÓN ", 
              bg: "bg-amber-500",
              text: "text-amber-700",
              border: "border-amber-400 shadow-md", 
              priceText: "text-amber-600",
              sumaColors: "text-amber-600 bg-amber-50 border-amber-100",
              desc: "La mejor relación costo-beneficio del mercado. Estás cubierto contra lo importante sin pagar de más." 
          };
      }
      if (index === 0) {
          return { 
              label: "OPCIÓN BÁSICA (ESENCIAL)", 
              bg: "bg-blue-600",
              text: "text-blue-700",
              border: "border-blue-500", 
              priceText: "text-zinc-800",
              sumaColors: "text-blue-600 bg-blue-50 border-blue-100",
              desc: "Cobertura inicial indispensable para cumplir con la ley y poder circular por la calle tranquilo." 
          };
      }
      return { 
          label: "OPCIÓN INTERMEDIA", 
          bg: "bg-emerald-600",
          text: "text-emerald-700",
          border: "border-emerald-500", 
          priceText: "text-zinc-800",
          sumaColors: "text-emerald-600 bg-emerald-50 border-emerald-100",
          desc: "Una excelente alternativa para sumar a tu consideración con protecciones adicionales." 
      };
  };

  return (
    <div 
      id="pdf-quote-content" 
      className="bg-[#faf9f6] w-[794px] min-h-[1123px] mx-auto text-zinc-900 flex flex-col font-sans overflow-hidden shadow-2xl relative"
    >
        <div className="h-4 w-full bg-red-600 absolute top-0 left-0 z-20"></div>

        <div className="px-10 pt-12 pb-24 rounded-b-[40px] shadow-lg relative z-10 shrink-0 bg-zinc-900">
            <div className="flex justify-between items-start">
                <div className="flex items-center">
                    <img src={logoThames} alt="Thames Seguros" className="h-16 object-contain" />
                </div>
                
                <div className="text-right text-xs text-zinc-400">
                    <p className="uppercase tracking-widest font-bold text-[10px]">Fecha de Emisión</p>
                    <p className="text-white font-bold text-base mb-2">{new Date().toLocaleDateString('es-AR')}</p>
                    <p className="uppercase tracking-widest font-bold text-[10px]">Propuesta ID</p>
                    <p className="text-white font-bold text-base">TS-{new Date().getFullYear()}-{(cotizacionEdit?.id || '001').toString().padStart(4, '0')}</p>
                </div>
            </div>

            <div className="mt-8 flex justify-between items-center gap-6 relative z-10">
                <div className="flex-1 max-w-[65%]">
                    <p className="text-red-500 text-xs font-black uppercase tracking-widest mb-1 drop-shadow-md">Propuesta de Seguro Exclusiva Para:</p>
                    <h2 className="text-5xl font-black text-white uppercase leading-tight drop-shadow-lg">{formData.cliente_nombre}</h2>
                </div>
                
                {/* 🚀 BOX FIXEADO CON BACKGROUND-IMAGE */}
                {formData.imagen_auto && (
                    <div 
                        className="w-56 h-36 shrink-0 rounded-2xl border-4 border-zinc-800 shadow-2xl bg-zinc-950 relative z-10"
                        style={{
                            backgroundImage: `url(${formData.imagen_auto})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                        }}
                    />
                )}
            </div>

            <div className="flex gap-4 absolute -bottom-16 left-10 right-10 z-20">
                <div className="flex-1 bg-red-600 rounded-2xl p-5 shadow-2xl border-4 border-zinc-900 flex flex-col justify-center">
                    <p className="text-red-200 text-[10px] font-black uppercase tracking-widest mb-1">Contacto del Titular</p>
                    <p className="font-bold text-white text-xl leading-tight truncate">{formData.cliente_nombre}</p>
                    <p className="text-sm text-red-100 flex items-center gap-2 mt-2 font-medium"><FaPhoneAlt size={12}/> {formData.telefono || 'Sin teléfono registrado'}</p>
                </div>

                <div className="flex-1 bg-zinc-800 rounded-2xl p-5 shadow-2xl border-4 border-zinc-900 flex flex-col justify-center">
                    <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">Especificaciones del Vehículo</p>
                    <p className="font-bold text-white text-xl leading-tight flex items-center gap-2 truncate"><FaCar className="text-red-500"/> {formData.marca_auto} {formData.modelo_auto}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                        <span className="bg-zinc-700 text-zinc-300 text-[10px] px-2.5 py-1 rounded font-bold uppercase">Año {formData.anio_auto}</span>
                        <span className="bg-red-500/20 text-red-400 text-[10px] px-2.5 py-1 rounded font-bold uppercase border border-red-500/30">
                        {formData.tiene_gnc ? '✔ GNC Incluido' : 'Uso Particular'}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div className="px-10 pt-24 pb-10 flex-1 flex flex-col z-0 shrink-0">
            <div className="mb-6">
            
            <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-300 pb-2 mb-4 px-2">
                <div className="col-span-3 pl-2">Aseguradora</div>
                <div className="col-span-2 text-center">Suma Asegurada</div>
                <div className="col-span-4">Plan de Cobertura</div>
                <div className="col-span-3 text-right pr-2">Precio Mensual</div>
            </div>

            <div className="space-y-6">
                {opcionesCalculadas.map((op, idx) => {
                    const compName = companiasBackend.find(c => String(c.id) === String(op.compania_id))?.nombre || "Compañía";
                    const cobName = coberturasBackend.find(c => String(c.id) === String(op.cobertura_id))?.nombre || "Cobertura";
                    const badge = getBadgeInfo(op, idx, opcionesCalculadas.length);

                    const hasDiscount = formData.incluir_oferta && Number(formData.descuento_oferta) > 0;
                    const discountPct = Number(formData.descuento_oferta) || 0;
                    const discountedPrice = hasDiscount 
                        ? Math.ceil((op.precioCalculado * (1 - discountPct / 100)) / 100) * 100 
                        : op.precioCalculado;

                    return (
                        <div key={idx} className={`relative flex flex-col rounded-xl border-2 transition-all bg-white ${badge.border}`}>
                            
                            <div className={`absolute -top-3.5 left-4 ${badge.bg} text-white text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-widest z-10 shadow-sm`}>
                                {badge.label}
                            </div>
                            
                            <div className="grid grid-cols-12 gap-2 items-center px-4 pt-5 pb-3">
                                <div className="col-span-3 font-black text-zinc-900 text-base pr-2 flex items-center">
                                    <span className="break-words">{compName.toUpperCase()}</span>
                                </div>
                                
                                <div className="col-span-2 flex items-center justify-center">
                                    {op.sumaCalculada > 0 ? (
                                        <span className={`text-[11px] font-bold tracking-wider px-2 py-1 rounded border ${badge.sumaColors}`}>
                                            ${op.sumaCalculada.toLocaleString("es-AR")}
                                        </span>
                                    ) : (
                                        <span className="text-[11px] font-bold text-zinc-400">-</span>
                                    )}
                                </div>
                                
                                <div className="col-span-4 flex flex-col py-1 pr-2">
                                    <span className="text-sm font-bold text-zinc-600 leading-tight mb-1">{cobName}</span>
                                    <span className="text-[9px] text-zinc-500 leading-tight">
                                        {op.detalles_cobertura?.length > 0 
                                            ? op.detalles_cobertura.join(" • ") 
                                            : "Consultar beneficios exactos."}
                                    </span>
                                </div>

                                <div className="col-span-3 text-right flex flex-col items-end justify-center">
                                    {hasDiscount ? (
                                        <>
                                            <span className="text-[12px] text-zinc-400 line-through decoration-red-500 decoration-2 font-bold mb-0.5">
                                                ${op.precioCalculado.toLocaleString("es-AR")}
                                            </span>
                                            <span className={`text-3xl font-black leading-none ${badge.priceText}`}>
                                                ${discountedPrice.toLocaleString("es-AR")}
                                            </span>
                                        </>
                                    ) : (
                                        <span className={`text-3xl font-black ${badge.priceText}`}>
                                            ${op.precioCalculado.toLocaleString("es-AR")}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className={`px-4 pb-2 pt-1.5 bg-zinc-50/50 rounded-b-lg border-t border-zinc-100`}>
                                <p className={`text-[10px] font-semibold italic ${badge.text}`}>
                                    {badge.desc}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>
            </div>

            {formData.incluir_oferta && formData.texto_oferta && (
                <div className="mb-6 mx-auto w-full">
                    <div className="bg-emerald-500 text-white rounded-2xl p-4 flex items-center gap-4 shadow-lg border-2 border-emerald-400">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <HiTag size={28}/>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-0.5">Beneficio Exclusivo del Mes</p>
                            <p className="text-lg font-black leading-tight italic uppercase">{formData.texto_oferta}</p>
                        </div>
                    </div>
                </div>
            )}

            {(() => {
            if (!opRecomendada) return null;
            const compNameRec = companiasBackend.find(c => String(c.id) === String(opRecomendada.compania_id))?.nombre || "Compañía";

            return (
                <div className="mt-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-300 pb-2 mb-4">
                        Por qué elegimos a <span className="text-zinc-800">{compNameRec.toUpperCase()}</span> para la opción Ideal:
                    </h3>

                    <div className="grid grid-cols-2 gap-3 mt-2">
                        {opRecomendada.detalles_cobertura.slice(0, 6).map((tag, i) => (
                        <div key={i} className="flex gap-3 items-center bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0 text-red-600">
                                <HiCheckCircle size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-zinc-900 uppercase leading-tight">{tag}</p>
                            </div>
                        </div>
                        ))}
                        {opRecomendada.detalles_cobertura.length === 0 && (
                        <p className="text-sm text-zinc-400 italic">Beneficios estándar de mercado incluidos.</p>
                        )}
                    </div>
                </div>
            )
            })()}
        </div>

        <div className="w-full px-10 pb-8 pt-6 bg-white border-t-2 border-zinc-100 flex justify-between items-end mt-auto relative z-10 shrink-0">
            <div className="flex gap-3">
                <div className="bg-red-600 text-white py-3 px-4 rounded-xl max-w-[150px] shadow-md">
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-red-200">Validez</p>
                    <p className="text-xs leading-tight font-bold">Presupuesto válido por 24 hs hábiles.</p>
                </div>
                <div className="bg-zinc-900 text-white py-3 px-4 rounded-xl max-w-[150px] shadow-md">
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-zinc-400">Inspección</p>
                    <p className="text-xs leading-tight font-bold">La cotización está sujeta a inspección previa.</p>
                </div>
            </div>

            <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 mt-2">Tu Productor Asesor</p>
                <div className="flex flex-col gap-1.5 text-xs font-bold text-zinc-600">
                    <span className="flex items-center gap-2 justify-end"><FaPhoneAlt className="text-red-500"/> +54 9 11 2424-8190</span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default CotizacionPDFTemplate;