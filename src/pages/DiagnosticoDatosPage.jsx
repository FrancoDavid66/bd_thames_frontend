// src/pages/admin/DiagnosticoDatosPage.jsx
//
// 🆕 Este archivo usaba colores "slate-*" fijos (pensados para fondo
// oscuro siempre) — en modo claro las tarjetas quedaban oscuras flotando
// sobre una página clara. Se llevó a los tokens reales de la app
// (surface/card/linea/titulo/suave + ingreso/egreso/tarjeta para los
// semáforos de estado), así responde bien a los dos modos.
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
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
  HiArrowLeft,
} from "react-icons/hi";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

// ════════════════════════════════════════════════════
// Configuración de categorías
// ════════════════════════════════════════════════════
const CATEGORIAS_META = {
  clientes_sin_oficina: {
    label: "Clientes sin oficina",
    descripcion: "Clientes que no tienen ninguna sucursal asignada",
    grupo: "huerfanos",
    icon: HiOutlineOfficeBuilding,
  },
  polizas_sin_oficina: {
    label: "Pólizas sin oficina",
    descripcion: "Pólizas que no tienen ninguna sucursal asignada",
    grupo: "huerfanos",
    icon: HiOutlineOfficeBuilding,
  },
  polizas_activas_morosas: {
    label: "Activas con mora",
    descripcion: "Aparecen como 'activas' pero tienen cuotas atrasadas",
    grupo: "estados",
    icon: HiOutlineExclamation,
  },
  polizas_vencidas_al_dia: {
    label: "Vencidas al día",
    descripcion: "Marcadas como 'vencidas' pero no tienen cuotas atrasadas",
    grupo: "estados",
    icon: HiOutlineInformationCircle,
  },
  polizas_canceladas_con_pago: {
    label: "Canceladas con pagos",
    descripcion: "Marcadas como 'canceladas' pero recibieron pagos hace poco",
    grupo: "estados",
    icon: HiOutlineExclamation,
  },
};

// ════════════════════════════════════════════════════
// Helpers de color según cantidad (usa los semáforos reales de la app)
// ════════════════════════════════════════════════════
function getColorByCount(count) {
  if (count === 0) {
    return {
      bg: "bg-ingreso/10",
      border: "border-ingreso/30",
      text: "text-ingreso-fuerte dark:text-ingreso-claro",
      number: "text-titulo dark:text-titulo-dark",
      hint: "text-ingreso-fuerte dark:text-ingreso-claro",
      iconBg: "bg-ingreso/15",
      label: "Sin problemas",
    };
  }
  if (count <= 5) {
    return {
      bg: "bg-tarjeta/10",
      border: "border-tarjeta/30",
      text: "text-[#b45309] dark:text-tarjeta-claro",
      number: "text-titulo dark:text-titulo-dark",
      hint: "text-[#b45309] dark:text-tarjeta-claro",
      iconBg: "bg-tarjeta/15",
      label: "Pocos casos · revisar a mano",
    };
  }
  return {
    bg: "bg-egreso/10",
    border: "border-egreso/30",
    text: "text-egreso-fuerte dark:text-egreso-claro",
    number: "text-titulo dark:text-titulo-dark",
    hint: "text-egreso-fuerte dark:text-egreso-claro",
    iconBg: "bg-egreso/15",
    label: "Muchos casos · necesita corrección masiva",
  };
}

// ════════════════════════════════════════════════════
// Card de categoría individual
// ════════════════════════════════════════════════════
function CategoriaCard({ categoria, data, onExportar, onToggleDetalle, expandido, diasMora }) {
  const meta = CATEGORIAS_META[categoria];
  if (!meta) return null;

  const colors = getColorByCount(data.count);
  const Icon = meta.icon;

  // Adaptar label según categoría dinámica
  const labelMostrado =
    categoria === "polizas_activas_morosas"
      ? `Activas con mora de +${diasMora} días`
      : meta.label;

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div
          className={`${colors.iconBg} rounded-lg p-2 flex-shrink-0`}
          aria-hidden="true"
        >
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="min-w-0">
              <div className={`text-[12px] ${colors.text} truncate`}>
                {labelMostrado}
              </div>
              <div className={`text-[26px] font-semibold ${colors.number} mt-0.5`}>
                {data.count}
              </div>
            </div>
          </div>

          <p className={`text-[12px] ${colors.hint} mt-1`}>{colors.label}</p>
          <p className="text-[12px] text-suave dark:text-suave-dark mt-2">{meta.descripcion}</p>

          {data.count > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => onToggleDetalle(categoria)}
                className="text-[12px] cursor-pointer inline-flex items-center gap-1 rounded-md border border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:bg-surface dark:hover:bg-surface-dark px-2.5 py-1.5 text-titulo dark:text-titulo-dark transition-colors"
                title={expandido ? "Ocultar detalle" : "Ver ejemplos"}
              >
                {expandido ? (
                  <>
                    <HiOutlineChevronUp className="w-3.5 h-3.5" /> Ocultar
                  </>
                ) : (
                  <>
                    <HiOutlineChevronDown className="w-3.5 h-3.5" /> Ver ejemplos
                  </>
                )}
              </button>

              <button
                onClick={() => onExportar(categoria, "csv")}
                className="text-[12px] cursor-pointer inline-flex items-center gap-1 rounded-md border border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:bg-surface dark:hover:bg-surface-dark px-2.5 py-1.5 text-titulo dark:text-titulo-dark transition-colors"
                title="Descargar como CSV"
              >
                <HiOutlineDownload className="w-3.5 h-3.5" /> CSV
              </button>

              <button
                onClick={() => onExportar(categoria, "xlsx")}
                className="text-[12px] cursor-pointer inline-flex items-center gap-1 rounded-md border border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:bg-surface dark:hover:bg-surface-dark px-2.5 py-1.5 text-titulo dark:text-titulo-dark transition-colors"
                title="Descargar como Excel"
              >
                <HiOutlineDownload className="w-3.5 h-3.5" /> Excel
              </button>
            </div>
          )}

          {/* Detalle expandido */}
          {expandido && data.count > 0 && (
            <div className="mt-3 rounded-md border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3">
              <div className="text-[11px] text-suave dark:text-suave-dark mb-2">
                Primeros {data.ejemplos?.length || 0} casos (de {data.count} totales):
              </div>
              <ul className="space-y-1">
                {(data.ejemplos || []).map((item) => (
                  <li
                    key={item.id}
                    className="text-[12px] text-titulo dark:text-titulo-dark font-mono leading-relaxed border-b border-linea dark:border-linea-dark pb-1 last:border-0"
                  >
                    {categoria === "clientes_sin_oficina" ? (
                      <>
                        ID {item.id} · {item.apellido}, {item.nombre} · DNI{" "}
                        {item.dni_cuit_cuil || "—"}
                      </>
                    ) : (
                      <>
                        ID {item.id} · {item.numero_poliza || "SIN N°"} ·{" "}
                        {item.cliente_label} · Patente:{" "}
                        {item.patente || "—"}
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {data.count > (data.ejemplos?.length || 0) && (
                <p className="text-[11px] text-suave dark:text-suave-dark mt-2 italic">
                  Para ver TODOS los casos, exportá a CSV o Excel.
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
// Estado de bienvenida (sin ejecutar)
// ════════════════════════════════════════════════════
function EstadoInicial({ onEjecutar, cargando }) {
  return (
    <div className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-8 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta mb-4">
        <HiOutlineDocumentSearch className="w-7 h-7" />
      </div>
      <h2 className="text-[18px] font-semibold text-titulo dark:text-titulo-dark mb-2">
        Diagnóstico de datos
      </h2>
      <p className="text-[13px] text-suave dark:text-suave-dark max-w-md mx-auto mb-6">
        Esta herramienta analiza la base de datos en busca de inconsistencias.
        <span className="block mt-2 text-[12px] text-suave dark:text-suave-dark">
          Solo lee información — no modifica nada.
        </span>
      </p>
      <button
        onClick={onEjecutar}
        disabled={cargando}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-duo-violeta hover:brightness-110 text-white text-[13px] font-medium transition-colors ${
          cargando ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        {cargando ? (
          <>
            <HiOutlineRefresh className="w-4 h-4 animate-spin" />
            Analizando...
          </>
        ) : (
          <>
            <HiOutlineDocumentSearch className="w-4 h-4" />
            Ejecutar diagnóstico
          </>
        )}
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════
// Página principal
// ════════════════════════════════════════════════════
export default function DiagnosticoDatosPage() {
  const { user } = useAuth();
  const isAdmin =
    user?.is_superuser ||
    user?.perfil?.rol === "ADMIN" ||
    user?.rol === "ADMIN";

  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [detalleAbierto, setDetalleAbierto] = useState({});
  const [diasMora, setDiasMora] = useState(30);

  // ── Escudo: solo admin ──
  if (!isAdmin) {
    return (
      <div className="px-3 sm:px-6 py-6 bg-surface dark:bg-surface-dark min-h-[100dvh]">
        <div className="rounded-xl border border-egreso/30 bg-egreso/10 p-6 text-egreso-fuerte dark:text-egreso-claro">
          <h2 className="font-semibold mb-2">Acceso denegado</h2>
          <p className="text-[13px]">
            Esta sección está reservada para administradores.
          </p>
        </div>
      </div>
    );
  }

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

  // ── Exportar ──
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

        // Descarga del archivo
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        const fecha = new Date().toISOString().slice(0, 10);
        link.setAttribute(
          "download",
          `diagnostico_${categoria}_${fecha}.${formato}`
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

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

  // ── Render ──
  return (
    <div className="px-3 sm:px-6 py-6 max-w-6xl mx-auto bg-surface dark:bg-surface-dark min-h-[100dvh]">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/admin"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:bg-surface dark:hover:bg-surface-dark text-suave dark:text-suave-dark transition-colors"
            title="Volver a Configuración"
          >
            <HiArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[18px] font-semibold text-titulo dark:text-titulo-dark truncate">
              Salud de los datos
            </h1>
            <p className="text-[12px] text-suave dark:text-suave-dark mt-0.5">
              Diagnóstico de inconsistencias en la base de datos
            </p>
          </div>
        </div>

        {resultado && (
          <button
            onClick={ejecutarDiagnostico}
            disabled={cargando}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:bg-surface dark:hover:bg-surface-dark text-[13px] text-titulo dark:text-titulo-dark transition-colors ${
              cargando ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
            }`}
            title="Volver a analizar"
          >
            <HiOutlineRefresh
              className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Volver a analizar</span>
          </button>
        )}
      </div>

      {/* Settings */}
      {!resultado && (
        <div className="rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-[13px] text-suave dark:text-suave-dark">
              Umbral de mora considerado problemático:
            </label>
            <select
              value={diasMora}
              onChange={(e) => setDiasMora(Number(e.target.value))}
              className="bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark rounded-md px-2 py-1.5 text-[13px] text-titulo dark:text-titulo-dark cursor-pointer outline-none focus:border-duo-violeta dark:[color-scheme:dark]"
            >
              <option value={15}>15 días</option>
              <option value={30}>30 días (recomendado)</option>
              <option value={60}>60 días</option>
              <option value={90}>90 días</option>
            </select>
          </div>
        </div>
      )}

      {/* Estado inicial */}
      {!resultado && !error && (
        <EstadoInicial onEjecutar={ejecutarDiagnostico} cargando={cargando} />
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-egreso/30 bg-egreso/10 p-4 text-egreso-fuerte dark:text-egreso-claro mb-4">
          <div className="flex items-start gap-3">
            <HiOutlineExclamation className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold mb-1">Error al ejecutar diagnóstico</p>
              <p className="text-[13px]">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Resumen general */}
          <div className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  {resultado.totales.problemas_detectados === 0 ? (
                    <>
                      <HiOutlineCheckCircle className="w-5 h-5 text-ingreso" />
                      <span className="font-semibold text-ingreso-fuerte dark:text-ingreso-claro">
                        Base de datos limpia
                      </span>
                    </>
                  ) : (
                    <>
                      <HiOutlineClipboardCheck className="w-5 h-5 text-[#d97706] dark:text-tarjeta-claro" />
                      <span className="font-semibold text-titulo dark:text-titulo-dark">
                        {resultado.totales.problemas_detectados} caso
                        {resultado.totales.problemas_detectados !== 1 ? "s" : ""}{" "}
                        detectado
                        {resultado.totales.problemas_detectados !== 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[12px] text-suave dark:text-suave-dark mt-1">
                  Pólizas en base: {resultado.totales.polizas_en_base} ·
                  Clientes: {resultado.totales.clientes_en_base} · Umbral mora:{" "}
                  {resultado.dias_mora} días
                </p>
              </div>
              <div className="text-[12px] text-suave dark:text-suave-dark">
                Ejecutado:{" "}
                {new Date(resultado.ejecutado_en).toLocaleString("es-AR")}
              </div>
            </div>
          </div>

          {/* Grupo: Oficinas huérfanas */}
          <div>
            <h2 className="text-[12px] font-medium text-suave dark:text-suave-dark mb-3 px-1">
              Oficinas huérfanas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <h2 className="text-[12px] font-medium text-suave dark:text-suave-dark mb-3 px-1">
              Estados inconsistentes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

          {/* Distribución de estados */}
          <div className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
            <h2 className="text-[12px] font-medium text-suave dark:text-suave-dark mb-3">
              Distribución actual de pólizas
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {resultado.distribucion_estados.map((row) => (
                <div
                  key={row.estado}
                  className="rounded-md border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-2.5"
                >
                  <div className="text-[11px] text-suave dark:text-suave-dark truncate">
                    {row.estado}
                  </div>
                  <div className="text-[16px] font-semibold text-titulo dark:text-titulo-dark mt-1">
                    {row.total}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Aviso */}
          <div className="rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3">
            <div className="flex items-start gap-2 text-[12px] text-suave dark:text-suave-dark">
              <HiOutlineInformationCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Este reporte es <strong className="text-titulo dark:text-titulo-dark">solo lectura</strong>.
                No modifica la base. Para corregir los casos detectados, hay que hacerlo manualmente desde cada pantalla o solicitar un script de corrección masiva.
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
