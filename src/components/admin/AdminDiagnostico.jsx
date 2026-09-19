// src/components/admin/AdminDiagnostico.jsx
import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  HiOutlineExclamation,
  HiOutlineRefresh,
  HiOutlineDownload,
  HiOutlineCheckCircle,
  HiOutlineDocumentSearch,
  HiOutlineOfficeBuilding,
  HiOutlineClipboardCheck,
  HiOutlineInformationCircle,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineChartBar,
  HiOutlineCalendar,
  HiOutlineDocumentText,
  HiOutlineDuplicate,
  HiOutlineClock,
  HiOutlineSwitchVertical,
} from "react-icons/hi";

import api from "../../services/api";

// ════════════════════════════════════════════════════
// Categorías de FECHAS de cuotas
// Estas admiten descarga en PDF y muestran el "por qué" de cada caso.
// Tienen que coincidir con CATEGORIAS_FECHAS del backend.
// ════════════════════════════════════════════════════
const CATEGORIAS_FECHAS = [
  "cuota_paga_salteada",
  "cuotas_sin_fecha",
  "poliza_sin_cuotas",
  "cuotas_fuera_de_orden",
  "cuotas_duplicadas",
  "salto_raro_entre_cuotas",
  "cobertura_muy_futura",
];

// ════════════════════════════════════════════════════
// Configuración de categorías
// ════════════════════════════════════════════════════
const CATEGORIAS_META = {
  clientes_sin_oficina: {
    label: "Clientes sin oficina",
    descripcion: "Clientes que no tienen ninguna sucursal asignada",
    icon: HiOutlineOfficeBuilding,
  },
  polizas_sin_oficina: {
    label: "Pólizas sin oficina",
    descripcion: "Pólizas que no tienen ninguna sucursal asignada",
    icon: HiOutlineOfficeBuilding,
  },
  polizas_activas_morosas: {
    label: "Activas con mora",
    descripcion: "Aparecen como 'activas' pero tienen cuotas atrasadas",
    icon: HiOutlineExclamation,
  },
  polizas_vencidas_al_dia: {
    label: "Vencidas al día",
    descripcion: "Marcadas como 'vencidas' pero no tienen cuotas atrasadas",
    icon: HiOutlineInformationCircle,
  },
  polizas_canceladas_con_pago: {
    label: "Canceladas con pagos",
    descripcion: "Marcadas como 'canceladas' pero recibieron pagos hace poco",
    icon: HiOutlineExclamation,
  },

  // ── 🗓️ Fechas de cuotas ──
  cuota_paga_salteada: {
    label: "Pagó salteando una cuota",
    descripcion:
      "Pagó una cuota posterior a otra que sigue impaga. La app lo muestra AL DÍA aunque esté debiendo.",
    icon: HiOutlineExclamation,
  },
  cuotas_sin_fecha: {
    label: "Cuotas sin fecha",
    descripcion:
      "Cuotas cargadas sin fecha de vencimiento. Son invisibles para todos los cálculos.",
    icon: HiOutlineDocumentText,
  },
  poliza_sin_cuotas: {
    label: "Sin cuotas cargadas",
    descripcion:
      "La póliza existe pero no tiene ninguna cuota. No aparece en ningún reporte de cobranza.",
    icon: HiOutlineDocumentText,
  },
  cuotas_fuera_de_orden: {
    label: "Cuotas fuera de orden",
    descripcion:
      "El número de cuota sube pero la fecha baja. Una de las dos está mal cargada.",
    icon: HiOutlineSwitchVertical,
  },
  cuotas_duplicadas: {
    label: "Cuotas duplicadas",
    descripcion:
      "Mismo número de cuota repetido, o dos cuotas que vencen el mismo día.",
    icon: HiOutlineDuplicate,
  },
  salto_raro_entre_cuotas: {
    label: "Salto raro entre cuotas",
    descripcion:
      "Una cuota salta mucho más (o mucho menos) que el resto de esa misma póliza. Suele faltar una.",
    icon: HiOutlineClock,
  },
  cobertura_muy_futura: {
    label: "Cobertura muy adelantada",
    descripcion:
      "Pagó más de 4 meses por adelantado. Puede ser real, o una fecha cargada de más.",
    icon: HiOutlineCalendar,
  },
};

// ════════════════════════════════════════════════════
// Helpers de color según cantidad
//   0 casos  -> verde (ingreso)
//   1-5      -> ámbar (tarjeta)
//   6+       -> rojo  (egreso)
// ════════════════════════════════════════════════════
function getColorByCount(count) {
  if (count === 0) {
    return {
      border: "border-[var(--color-ingreso)]/30",
      bg: "bg-[var(--color-ingreso)]/10",
      text: "text-[var(--color-ingreso-fuerte)]",
      number: "text-[var(--color-ingreso-fuerte)]",
      hint: "text-[var(--color-ingreso-fuerte)]",
      iconBg: "bg-[var(--color-ingreso)]/20",
      label: "Sin problemas",
    };
  }
  if (count <= 5) {
    return {
      border: "border-[var(--color-tarjeta)]/30",
      bg: "bg-[var(--color-tarjeta)]/10",
      text: "text-[#d97706]",
      number: "text-[#d97706]",
      hint: "text-[#d97706]",
      iconBg: "bg-[var(--color-tarjeta)]/20",
      label: "Pocos casos · revisar a mano",
    };
  }
  return {
    border: "border-[var(--color-egreso)]/30",
    bg: "bg-[var(--color-egreso)]/10",
    text: "text-[var(--color-egreso-fuerte)]",
    number: "text-[var(--color-egreso-fuerte)]",
    hint: "text-[var(--color-egreso-fuerte)]",
    iconBg: "bg-[var(--color-egreso)]/20",
    label: "Muchos casos · necesita corrección masiva",
  };
}

// ════════════════════════════════════════════════════
// Card de categoría individual
// ════════════════════════════════════════════════════
function CategoriaCard({
  categoria,
  data,
  onExportar,
  onToggleDetalle,
  expandido,
  diasMora,
}) {
  const meta = CATEGORIAS_META[categoria];
  if (!meta || !data) return null;

  const colors = getColorByCount(data.count);
  const Icon = meta.icon;
  const esDeFechas = CATEGORIAS_FECHAS.includes(categoria);

  // Adaptar label según categoría dinámica
  const labelMostrado =
    categoria === "polizas_activas_morosas"
      ? `Activas con mora de +${diasMora} días`
      : meta.label;

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div
          className={`${colors.iconBg} flex-shrink-0 rounded-lg p-2`}
          aria-hidden="true"
        >
          <Icon className={`h-5 w-5 ${colors.text}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className={`truncate text-[12px] font-medium ${colors.text}`}>
                {labelMostrado}
              </div>
              <div className={`mt-0.5 text-2xl font-semibold ${colors.number}`}>
                {data.count}
              </div>
            </div>
          </div>

          <p className={`mt-1 text-[12px] font-medium ${colors.hint}`}>{colors.label}</p>
          <p className="mt-2 text-[12px] text-[var(--color-suave)]">{meta.descripcion}</p>

          {data.count > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => onToggleDetalle(categoria)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--color-linea)] bg-[var(--color-card)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-titulo)] transition-colors hover:bg-[var(--color-surface)]"
                title={expandido ? "Ocultar detalle" : "Ver ejemplos"}
              >
                {expandido ? (
                  <>
                    <HiOutlineChevronUp className="h-3.5 w-3.5" /> Ocultar
                  </>
                ) : (
                  <>
                    <HiOutlineChevronDown className="h-3.5 w-3.5" /> Ver ejemplos
                  </>
                )}
              </button>

              <button
                onClick={() => onExportar(categoria, "csv")}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--color-linea)] bg-[var(--color-card)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-titulo)] transition-colors hover:bg-[var(--color-surface)]"
                title="Descargar como CSV"
              >
                <HiOutlineDownload className="h-3.5 w-3.5" /> CSV
              </button>

              <button
                onClick={() => onExportar(categoria, "xlsx")}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--color-linea)] bg-[var(--color-card)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-titulo)] transition-colors hover:bg-[var(--color-surface)]"
                title="Descargar como Excel"
              >
                <HiOutlineDownload className="h-3.5 w-3.5" /> Excel
              </button>

              {esDeFechas && (
                <button
                  onClick={() => onExportar(categoria, "pdf")}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--color-linea)] bg-[var(--color-card)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-titulo)] transition-colors hover:bg-[var(--color-surface)]"
                  title="Descargar como PDF"
                >
                  <HiOutlineDownload className="h-3.5 w-3.5" /> PDF
                </button>
              )}
            </div>
          )}

          {/* Detalle expandido */}
          {expandido && data.count > 0 && (
            <div className="mt-3 rounded-lg border border-[var(--color-linea)] bg-[var(--color-card)] p-3">
              <div className="mb-2 text-[11px] text-[var(--color-suave)]">
                Primeros {data.ejemplos?.length || 0} casos (de {data.count}{" "}
                totales):
              </div>
              <ul className="space-y-1">
                {(data.ejemplos || []).map((item) => (
                  <li
                    key={item.id}
                    className="border-b border-[var(--color-linea)] pb-1 font-mono text-[12px] leading-relaxed text-[var(--color-titulo)] last:border-0"
                  >
                    {categoria === "clientes_sin_oficina" ? (
                      <>
                        ID {item.id} · {item.apellido}, {item.nombre} · DNI{" "}
                        {item.dni_cuit_cuil || "—"}
                      </>
                    ) : (
                      <>
                        ID {item.id} · {item.numero_poliza || "SIN N°"} ·{" "}
                        {item.cliente_label} · Patente: {item.patente || "—"}
                        {item.detalle && (
                          <span className="mt-0.5 block font-sans text-[11px] text-[var(--color-suave)]">
                            → {item.detalle}
                          </span>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {data.count > (data.ejemplos?.length || 0) && (
                <p className="mt-2 text-[11px] italic text-[var(--color-suave)]">
                  Para ver TODOS los casos, exportá a CSV, Excel o PDF.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// Estado inicial (sin ejecutar)
// ════════════════════════════════════════════════════
function EstadoInicial({ onEjecutar, cargando, diasMora, setDiasMora }) {
  return (
    <div className="rounded-xl border border-[var(--color-linea)] bg-[var(--color-card)] p-8 text-center">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--color-oficina)] text-white">
        <HiOutlineDocumentSearch className="h-7 w-7" />
      </div>
      <h2 className="mb-2 text-[18px] font-semibold text-[var(--color-titulo)]">
        Salud de los datos
      </h2>
      <p className="mx-auto mb-6 max-w-md text-[13px] text-[var(--color-suave)]">
        Esta herramienta analiza la base de datos en busca de inconsistencias:
        oficinas sin asignar, estados que no coinciden con los pagos, y fechas de
        cuotas mal cargadas.
        <span className="mt-2 block text-[12px]">
          Solo lee información — no modifica nada.
        </span>
      </p>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        <label className="text-[12px] text-[var(--color-suave)]">
          Umbral de mora considerado problemático:
        </label>
        <select
          value={diasMora}
          onChange={(e) => setDiasMora(Number(e.target.value))}
          className="cursor-pointer rounded-lg border border-[var(--color-linea)] bg-[var(--color-surface)] px-2 py-1.5 text-[13px] text-[var(--color-titulo)] outline-none focus:border-[var(--color-oficina)] dark:[color-scheme:dark]"
        >
          <option value={15}>15 días</option>
          <option value={30}>30 días (recomendado)</option>
          <option value={60}>60 días</option>
          <option value={90}>90 días</option>
        </select>
      </div>

      <button
        onClick={onEjecutar}
        disabled={cargando}
        className={`inline-flex items-center gap-2 rounded-lg bg-[var(--color-oficina)] px-5 py-2.5 text-[13px] font-medium text-white hover:brightness-110 transition-colors ${
          cargando ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
      >
        {cargando ? (
          <>
            <HiOutlineRefresh className="h-4 w-4 animate-spin" />
            Analizando...
          </>
        ) : (
          <>
            <HiOutlineDocumentSearch className="h-4 w-4" />
            Ejecutar diagnóstico
          </>
        )}
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════
// Componente principal (se renderiza dentro del tab)
// ════════════════════════════════════════════════════
export default function AdminDiagnostico() {
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [detalleAbierto, setDetalleAbierto] = useState({});
  const [diasMora, setDiasMora] = useState(30);

  // ── Ejecutar diagnóstico ──
  const ejecutarDiagnostico = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      const res = await api.get("/polizas/diagnostico-datos/", {
        params: {
          dias_mora: diasMora,
          ejemplos: 10,
        },
      });
      setResultado(res.data);
      toast.success("Diagnóstico completado");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "No se pudo ejecutar el diagnóstico";
      setError(msg);
      toast.error(msg);
    } finally {
      setCargando(false);
    }
  }, [diasMora]);

  // ── Toggle detalle ──
  const toggleDetalle = (categoria) => {
    setDetalleAbierto((prev) => ({
      ...prev,
      [categoria]: !prev[categoria],
    }));
  };

  // ── Bajar un blob como archivo ──
  const bajarBlob = (data, nombre) => {
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", nombre);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // ── Exportar una categoría ──
  const exportar = useCallback(
    async (categoria, formato) => {
      try {
        toast.loading(`Generando ${formato.toUpperCase()}...`, {
          id: "exportar",
        });

        const res = await api.get("/polizas/diagnostico-datos/exportar/", {
          params: {
            categoria,
            formato,
            dias_mora: diasMora,
          },
          responseType: "blob",
        });

        const fecha = new Date().toISOString().slice(0, 10);
        bajarBlob(res.data, `diagnostico_${categoria}_${fecha}.${formato}`);

        toast.success(`Descargado ${formato.toUpperCase()}`, { id: "exportar" });
      } catch (err) {
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          "Error al exportar";
        toast.error(msg, { id: "exportar" });
      }
    },
    [diasMora]
  );

  // ── 📄 PDF completo de la auditoría de fechas ──
  const descargarAuditoriaPDF = useCallback(async () => {
    try {
      toast.loading("Generando PDF...", { id: "auditoria-pdf" });

      const res = await api.get("/polizas/diagnostico-datos/exportar/", {
        params: { categoria: "auditoria_fechas", formato: "pdf" },
        responseType: "blob",
      });

      const fecha = new Date().toISOString().slice(0, 10);
      bajarBlob(res.data, `auditoria_fechas_${fecha}.pdf`);

      toast.success("PDF descargado", { id: "auditoria-pdf" });
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Error al generar el PDF";
      toast.error(msg, { id: "auditoria-pdf" });
    }
  }, []);

  // ── Estado inicial ──
  if (!resultado && !error) {
    return (
      <EstadoInicial
        onEjecutar={ejecutarDiagnostico}
        cargando={cargando}
        diasMora={diasMora}
        setDiasMora={setDiasMora}
      />
    );
  }

  const totalFechas = resultado?.totales?.problemas_fechas ?? 0;

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header con botón refrescar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-linea)] bg-[var(--color-card)] p-4">
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--color-titulo)]">
            Salud de los datos
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--color-suave)]">
            Diagnóstico de inconsistencias · Umbral mora: {diasMora} días
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={diasMora}
            onChange={(e) => setDiasMora(Number(e.target.value))}
            className="cursor-pointer rounded-lg border border-[var(--color-linea)] bg-[var(--color-surface)] px-2 py-1.5 text-[13px] text-[var(--color-titulo)] outline-none focus:border-[var(--color-oficina)] dark:[color-scheme:dark]"
            title="Cambiar umbral de mora"
          >
            <option value={15}>15 días</option>
            <option value={30}>30 días</option>
            <option value={60}>60 días</option>
            <option value={90}>90 días</option>
          </select>

          <button
            onClick={ejecutarDiagnostico}
            disabled={cargando}
            className={`inline-flex items-center gap-2 rounded-lg border border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2 text-[13px] font-medium text-[var(--color-titulo)] transition-colors hover:bg-[var(--color-card)] ${
              cargando ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            }`}
            title="Volver a analizar"
          >
            <HiOutlineRefresh
              className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Volver a analizar</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-[var(--color-egreso)]/30 bg-[var(--color-egreso)]/10 p-4 text-[var(--color-egreso-fuerte)]">
          <div className="flex items-start gap-3">
            <HiOutlineExclamation className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="mb-1 font-medium text-[14px]">Error al ejecutar diagnóstico</p>
              <p className="text-[13px]">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="space-y-6">
          {/* Resumen general */}
          <div className="rounded-xl border border-[var(--color-linea)] bg-[var(--color-card)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {resultado.totales.problemas_detectados === 0 ? (
                    <>
                      <HiOutlineCheckCircle className="h-5 w-5 text-[var(--color-ingreso)]" />
                      <span className="font-medium text-[14px] text-[var(--color-ingreso-fuerte)]">
                        Base de datos limpia
                      </span>
                    </>
                  ) : (
                    <>
                      <HiOutlineClipboardCheck className="h-5 w-5 text-[#d97706]" />
                      <span className="font-medium text-[14px] text-[var(--color-titulo)]">
                        {resultado.totales.problemas_detectados} caso
                        {resultado.totales.problemas_detectados !== 1 ? "s" : ""}{" "}
                        detectado
                        {resultado.totales.problemas_detectados !== 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-[12px] text-[var(--color-suave)]">
                  Pólizas en base: {resultado.totales.polizas_en_base} ·
                  Clientes: {resultado.totales.clientes_en_base}
                </p>
              </div>
              <div className="text-[12px] text-[var(--color-suave)]">
                Ejecutado:{" "}
                {new Date(resultado.ejecutado_en).toLocaleString("es-AR")}
              </div>
            </div>
          </div>

          {/* Grupo: Oficinas huérfanas */}
          <div>
            <h3 className="mb-3 px-1 flex items-center gap-1.5 text-[12px] text-[var(--color-suave)]">
              <HiOutlineOfficeBuilding className="text-[13px]" /> Oficinas huérfanas
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <CategoriaCard
                categoria="clientes_sin_oficina"
                data={resultado.categorias.clientes_sin_oficina}
                onExportar={exportar}
                onToggleDetalle={toggleDetalle}
                expandido={!!detalleAbierto.clientes_sin_oficina}
                diasMora={resultado.dias_mora}
              />
              <CategoriaCard
                categoria="polizas_sin_oficina"
                data={resultado.categorias.polizas_sin_oficina}
                onExportar={exportar}
                onToggleDetalle={toggleDetalle}
                expandido={!!detalleAbierto.polizas_sin_oficina}
                diasMora={resultado.dias_mora}
              />
            </div>
          </div>

          {/* Grupo: Estados inconsistentes */}
          <div>
            <h3 className="mb-3 px-1 flex items-center gap-1.5 text-[12px] text-[var(--color-suave)]">
              <HiOutlineClipboardCheck className="text-[13px]" /> Estados inconsistentes
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <CategoriaCard
                categoria="polizas_activas_morosas"
                data={resultado.categorias.polizas_activas_morosas}
                onExportar={exportar}
                onToggleDetalle={toggleDetalle}
                expandido={!!detalleAbierto.polizas_activas_morosas}
                diasMora={resultado.dias_mora}
              />
              <CategoriaCard
                categoria="polizas_vencidas_al_dia"
                data={resultado.categorias.polizas_vencidas_al_dia}
                onExportar={exportar}
                onToggleDetalle={toggleDetalle}
                expandido={!!detalleAbierto.polizas_vencidas_al_dia}
                diasMora={resultado.dias_mora}
              />
              <CategoriaCard
                categoria="polizas_canceladas_con_pago"
                data={resultado.categorias.polizas_canceladas_con_pago}
                onExportar={exportar}
                onToggleDetalle={toggleDetalle}
                expandido={!!detalleAbierto.polizas_canceladas_con_pago}
                diasMora={resultado.dias_mora}
              />
            </div>
          </div>

          {/* ══════════════════════════════════════════════
              Grupo: 🗓️ Fechas de cuotas
             ══════════════════════════════════════════════ */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <h3 className="flex items-center gap-1.5 text-[12px] text-[var(--color-suave)]">
                <HiOutlineCalendar className="text-[13px]" /> Fechas de cuotas
                {totalFechas > 0 && (
                  <span className="ml-1 rounded-full bg-[var(--color-egreso)]/15 px-2 py-0.5 text-[11px] font-medium text-[var(--color-egreso-fuerte)]">
                    {totalFechas}
                  </span>
                )}
              </h3>

              <button
                onClick={descargarAuditoriaPDF}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--color-oficina)] px-3 py-1.5 text-[12px] font-medium text-white transition-all hover:brightness-110"
                title="Descargar el informe completo de fechas en PDF"
              >
                <HiOutlineDownload className="h-3.5 w-3.5" />
                Descargar informe completo (PDF)
              </button>
            </div>

            <div className="mb-3 rounded-xl border border-[var(--color-linea)] bg-[var(--color-card)] p-3">
              <div className="flex items-start gap-2 text-[12px] text-[var(--color-suave)]">
                <HiOutlineInformationCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  Las cuotas se pagan por adelantado: la cobertura llega hasta el
                  vencimiento de la{" "}
                  <strong className="font-medium text-[var(--color-titulo)]">
                    última cuota pagada
                  </strong>
                  . Si una fecha está mal cargada, ese cálculo miente y no se nota
                  mirando la pantalla.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {CATEGORIAS_FECHAS.map((cat) => (
                <CategoriaCard
                  key={cat}
                  categoria={cat}
                  data={resultado.categorias[cat]}
                  onExportar={exportar}
                  onToggleDetalle={toggleDetalle}
                  expandido={!!detalleAbierto[cat]}
                  diasMora={resultado.dias_mora}
                />
              ))}
            </div>
          </div>

          {/* Distribución de estados */}
          <div className="rounded-xl border border-[var(--color-linea)] bg-[var(--color-card)] p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-[12px] text-[var(--color-suave)]">
              <HiOutlineChartBar className="text-[13px]" /> Distribución actual de pólizas
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {resultado.distribucion_estados.map((row) => (
                <div
                  key={row.estado}
                  className="rounded-lg border border-[var(--color-linea)] bg-[var(--color-surface)] p-2.5"
                >
                  <div className="truncate text-[10px] text-[var(--color-suave)]">
                    {row.estado}
                  </div>
                  <div className="mt-1 text-[16px] font-semibold text-[var(--color-titulo)]">
                    {row.total}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Aviso */}
          <div className="rounded-xl border border-[var(--color-linea)] bg-[var(--color-card)] p-3">
            <div className="flex items-start gap-2 text-[12px] text-[var(--color-suave)]">
              <HiOutlineInformationCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                Este reporte es{" "}
                <strong className="text-[var(--color-titulo)] font-medium">solo lectura</strong>. No
                modifica la base. Para corregir los casos detectados, hay que
                hacerlo manualmente desde cada pantalla.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}