// src/components/polizas/PolizaFilter.jsx
import React, { useEffect, useRef, useState } from "react";
import { HiSearch, HiCalendar, HiOfficeBuilding } from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { PolizasAPI } from "../../api/polizas";
import InputDuo from "../ui/InputDuo";
import SelectDuo from "../ui/SelectDuo";
import Boton3D from "../ui/Boton3D";

const LEGACY_COMPANIAS = [
  "Agrosalta", "ATM", "Equidad", "Federacion Patronal", "La Equidad", "NRE", "Providencia",
];

// ⚠️ Valores EXACTOS del backend (polizas/models.py → ESTADO_CHOICES), en minúscula.
//    "todos" = sin filtro: el slice no lo manda al backend.
const ESTADOS_POLIZA = [
  { value: "todos", label: "Todos los estados" },
  { value: "activa", label: "Activa" },
  { value: "vencida", label: "Vencida" },
  { value: "cancelada", label: "Cancelada" },
  { value: "finalizada", label: "Finalizada" },
];

const MAX_DIAS = 365;
const ESPERA_MS = 300; // pausa antes de buscar mientras se escribe la fecha o los días

/* =====================================================================
 * 📅 Helpers de fechas — todo en UTC a propósito.
 * new Date("2026-09-26") en Argentina (UTC-3) cae el 25 a la noche.
 * Trabajando en UTC, sumar y restar días es exacto.
 * ===================================================================== */
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Fecha completa y razonable. Mientras se escribe el año, el input de fecha
// larga "0002-09-26", "0020-09-26"... y con eso no queremos buscar.
const esFechaCompleta = (v) => /^(19|20)\d{2}-\d{2}-\d{2}$/.test(v || "");

// "2026-09-26" → "26/09/2026"
const fmtISO = (iso) => {
  const m = ISO_RE.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || "";
};

const isoAMs = (iso) => {
  const m = ISO_RE.exec(iso || "");
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
};

// sumarDias("2026-09-26", -3) → "2026-09-23"
const sumarDias = (iso, n) => {
  const ms = isoAMs(iso);
  if (Number.isNaN(ms)) return "";
  return new Date(ms + n * 86400000).toISOString().slice(0, 10);
};

const diasEntre = (a, b) => {
  const ma = isoAMs(a);
  const mb = isoAMs(b);
  if (Number.isNaN(ma) || Number.isNaN(mb)) return 0;
  return Math.round((mb - ma) / 86400000);
};

// "3" → 3 · "" / "-2" / "abc" → 0 · "999" → 365
const aDias = (v) => {
  const n = parseInt(String(v ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_DIAS);
};

// Fecha elegida + días antes/después → { desde, hasta }. null si la fecha está incompleta.
const calcularRango = (fecha, antes, despues) => {
  if (!esFechaCompleta(fecha)) return null;
  return {
    desde: sumarDias(fecha, -aDias(antes)),
    hasta: sumarDias(fecha, aDias(despues)),
  };
};

// Rango guardado en Redux → lo que muestran los campos.
//   - Rango completo: fecha = desde + "N días después" (es el mismo rango).
//   - Rango abierto (solo desde o solo hasta, ej. un link de otra pantalla):
//     campos vacíos; el rango igual se ve en el aviso azul.
const camposDesdeRango = (desde, hasta) => {
  if (esFechaCompleta(desde) && esFechaCompleta(hasta)) {
    return { fecha: desde, antes: "0", despues: String(Math.max(0, diasEntre(desde, hasta))) };
  }
  return { fecha: "", antes: "0", despues: "0" };
};

const mismosCampos = (a, b) => a.fecha === b.fecha && a.antes === b.antes && a.despues === b.despues;

const textoRango = (desde, hasta) => {
  if (desde && hasta && desde === hasta) return `Vencen el ${fmtISO(desde)}`;
  if (desde && hasta) return `Vencen del ${fmtISO(desde)} al ${fmtISO(hasta)}`;
  if (desde) return `Vencen desde el ${fmtISO(desde)}`;
  if (hasta) return `Vencen hasta el ${fmtISO(hasta)}`;
  return "";
};

// Cajita con borde: misma altura y borde que InputDuo / SelectDuo.
const CAJA_CLS =
  "flex h-10 items-center gap-2 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark transition-colors focus-within:border-duo-violeta";
const NUMERO_CLS =
  "h-7 w-14 rounded-md border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-1 text-center text-[14px] text-titulo dark:text-titulo-dark outline-none focus:border-duo-violeta dark:[color-scheme:dark]";

/**
 * 🔎 Filtro de pólizas.
 *
 * - TODOS los usuarios: buscador + estado de la póliza + "Vence el" (con días antes/después).
 * - Solo ADMIN: además sucursal y aseguradora.
 *
 * 📅 "Vence el" = fecha de vencimiento de la PÓLIZA (fin de vigencia), NO de las cuotas.
 *    Fecha + días antes/después se mandan como rango al backend:
 *    fecha_vencimiento_desde / fecha_vencimiento_hasta (inclusivo, ver
 *    polizas/utils/viewtools.py → apply_vencimiento_filters). El backend no se toca.
 *      Ej: 26/09 con 3 días antes  → del 23/09 al 26/09.
 *          hoy con 7 días después  → lo que vence en la próxima semana.
 *
 * 🏢 Usuario de OFICINA: cuando usa fecha o estado ve SOLO las pólizas de su sucursal
 *    (se manda ?oficina=<su oficina>, que el backend respeta: usuarios/mixins.py, caso OFICINA).
 *    Sin esos filtros, el buscador sigue siendo global como siempre (los clientes circulan
 *    entre sucursales). El ADMIN ve todas y elige sucursal con su select.
 *
 * Nota: se mantienen todas las props en la firma para no romper la conexión con PolizasPage.
 */
export default function PolizaFilter({
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
  onClearSearchApplied,
  searchApplied = "",
  totalFiltradas,
  oficinaActual = "ALL",
  onOficinaChange,
  companiaActual = "",
  onCompaniaChange,
  modoActual = "polizas",
  estadoActual = "todos",
  onEstadoChange,
  fechaVencimientoDesde = "",
  fechaVencimientoHasta = "",
  onFechaVencimientoDesdeChange,
  onFechaVencimientoHastaChange,
  onClearVencimientoFilters,
  status = "idle",
}) {
  const { user } = useAuth();
  const rol = user?.perfil?.rol || "";
  const isWebAdmin = rol === "ADMIN";
  const esOficina = !isWebAdmin && rol !== "VENDEDOR"; // el vendedor ya ve solo lo suyo
  const miOficinaId =
    user?.perfil?.oficina?.id ??
    user?.perfil?.oficina_id ??
    (typeof user?.perfil?.oficina === "number" ? user.perfil.oficina : null);
  const miOficinaNombre = user?.perfil?.oficina_nombre || "tu sucursal";

  const [oficinasList, setOficinasList] = useState([]);
  const [companiasList, setCompaniasList] = useState([]);

  const [localValue, setLocalValue] = useState(searchValue || "");
  useEffect(() => { setLocalValue(searchValue || ""); }, [searchValue]);
  useEffect(() => { onSearchChange?.(localValue); }, [localValue, onSearchChange]);

  useEffect(() => {
    api.get("companias/").then((res) => {
      const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
      const dinamicas = arr.filter((c) => c.activa).map((c) => c.nombre);
      const unificadas = Array.from(new Set([...LEGACY_COMPANIAS, ...dinamicas])).sort();
      setCompaniasList(unificadas);
    }).catch((e) => console.warn("Error cargando aseguradoras", e));

    if (isWebAdmin) {
      PolizasAPI.listOficinas().then((res) => {
        setOficinasList(Array.isArray(res) ? res : res.results || []);
      }).catch((e) => console.warn("Error cargando sucursales", e));
    }
  }, [isWebAdmin]);

  const isLoading = status === "loading";
  const clearSearch = () => setLocalValue("");

  // En modo "cuotas" el slice NO manda fecha ni estado al backend (y ahí "estado"
  // significa otra cosa). En ese modo no mostramos estos filtros para que no engañen.
  const enModoPolizas = modoActual !== "cuotas";
  const fechaDisponible =
    enModoPolizas && !!onFechaVencimientoDesdeChange && !!onFechaVencimientoHastaChange;
  const estadoDisponible = enModoPolizas && !!onEstadoChange;

  // ===== Estado de la póliza =====
  const estadoValor = ESTADOS_POLIZA.some((e) => e.value === estadoActual) ? estadoActual : "todos";
  const estadoActivo = estadoDisponible && estadoValor !== "todos";

  // ===== Vencimiento aplicado (Redux) =====
  const desde = fechaVencimientoDesde || "";
  const hasta = fechaVencimientoHasta || "";
  const hayFiltroFecha = enModoPolizas && !!(desde || hasta);
  const hayFiltros = hayFiltroFecha || estadoActivo;

  // ===== 🏢 Oficina: con fecha o estado elegidos, solo su sucursal =====
  const oficinaFiltrada =
    oficinaActual && String(oficinaActual).toUpperCase() !== "ALL" ? String(oficinaActual) : "";
  const puedeRestringir = esOficina && miOficinaId != null && !!onOficinaChange;
  const soloMiOficina = puedeRestringir && hayFiltros;

  const sincronizarOficina = (conFiltro) => {
    if (!puedeRestringir) return;
    const deseada = conFiltro ? String(miOficinaId) : "";
    if (deseada !== oficinaFiltrada) onOficinaChange(deseada || "ALL");
  };

  // Red de seguridad: link con fechas, volver a la página, cambios desde otro lado.
  useEffect(() => {
    sincronizarOficina(hayFiltros);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeRestringir, hayFiltros, oficinaFiltrada]);

  // ===== Vencimiento que se está escribiendo (campos) =====
  const [campos, setCampos] = useState(() => camposDesdeRango(desde, hasta));
  const { fecha: fechaDia, antes: diasAntes, despues: diasDespues } = campos;
  const tocadoRef = useRef(false); // true cuando el usuario tocó la fecha o los días
  const mostrarDias = fechaDisponible && esFechaCompleta(fechaDia);

  // Redux → campos: si el rango cambió "desde afuera" (link, Quitar filtros, volver a la
  // página), los campos lo acompañan. Si ya lo representan, no se tocan.
  useEffect(() => {
    setCampos((c) => {
      const r = calcularRango(c.fecha, c.antes, c.despues);
      if (r && r.desde === desde && r.hasta === hasta) return c;
      const nuevos = camposDesdeRango(desde, hasta);
      return mismosCampos(nuevos, c) ? c : nuevos;
    });
  }, [desde, hasta]);

  // Campos → Redux: se aplica solo cuando el usuario deja de escribir un momento.
  useEffect(() => {
    if (!tocadoRef.current || !fechaDisponible) return undefined;
    const t = setTimeout(() => {
      if (!fechaDia) {
        // Borró la fecha → se quita el filtro de vencimiento
        if (desde || hasta) {
          sincronizarOficina(estadoActivo);
          onClearVencimientoFilters?.();
        }
        return;
      }
      const r = calcularRango(fechaDia, diasAntes, diasDespues);
      if (!r) return; // fecha a medio escribir
      if (r.desde === desde && r.hasta === hasta) return; // ya está aplicado
      sincronizarOficina(true);
      onFechaVencimientoDesdeChange(r.desde);
      onFechaVencimientoHastaChange(r.hasta);
    }, ESPERA_MS);
    return () => clearTimeout(t);
    // Solo reacciona a lo que escribe el usuario; lo demás se lee al momento de aplicar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaDia, diasAntes, diasDespues]);

  const cambiarCampo = (clave) => (e) => {
    tocadoRef.current = true;
    const valor = e.target.value ?? "";
    setCampos((c) => ({ ...c, [clave]: valor }));
  };

  // Al salir del campo de días: "" → 0, "-3" → 0, "999" → 365
  const normalizarDias = (clave) => () => {
    setCampos((c) => {
      const limpio = String(aDias(c[clave]));
      return limpio === c[clave] ? c : { ...c, [clave]: limpio };
    });
  };

  const onEstadoSelect = (e) => {
    const valor = e.target.value || "todos";
    sincronizarOficina(valor !== "todos" || hayFiltroFecha);
    onEstadoChange?.(valor);
  };

  const quitarFiltros = () => {
    setCampos({ fecha: "", antes: "0", despues: "0" });
    sincronizarOficina(false);
    if (hayFiltroFecha) onClearVencimientoFilters?.();
    if (estadoActivo) onEstadoChange?.("todos");
  };

  const mostrarFilaFiltros = isWebAdmin || estadoDisponible || fechaDisponible;

  return (
    <div className="space-y-3 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3 md:p-4">
      {/* ===== Buscador ===== */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <InputDuo
            type="search"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSearchSubmit?.(); } }}
            placeholder="Buscar póliza por patente, nombre o DNI..."
            icon={<HiSearch />}
          />
        </div>
        <Boton3D variant="azul" onClick={() => onSearchSubmit?.()} disabled={isLoading}>
          <HiSearch className="h-5 w-5" /> {isLoading ? "Buscando…" : "Buscar"}
        </Boton3D>
      </div>

      {/* ===== Filtros: sucursal + aseguradora (admin) · estado + vencimiento (todos) ===== */}
      {mostrarFilaFiltros && (
        <div className="flex flex-wrap items-center gap-2">
          {isWebAdmin && onOficinaChange && (
            <SelectDuo
              value={oficinaActual}
              onChange={(e) => onOficinaChange(e.target.value)}
              className="min-w-[180px]"
              aria-label="Sucursal"
            >
              <option value="ALL">Todas las sucursales</option>
              {oficinasList.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </SelectDuo>
          )}

          {isWebAdmin && onCompaniaChange !== undefined && (
            <SelectDuo
              value={companiaActual}
              onChange={(e) => onCompaniaChange(e.target.value)}
              className="min-w-[180px]"
              aria-label="Aseguradora"
            >
              <option value="">Todas las aseguradoras</option>
              {companiasList.map((c) => <option key={c} value={c}>{c}</option>)}
            </SelectDuo>
          )}

          {/* Estado de la póliza (todos los usuarios) */}
          {estadoDisponible && (
            <SelectDuo
              value={estadoValor}
              onChange={onEstadoSelect}
              className="min-w-[170px]"
              aria-label="Estado de la póliza"
            >
              {ESTADOS_POLIZA.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </SelectDuo>
          )}

          {/* 📅 Vence el — vencimiento de la PÓLIZA (todos los usuarios) */}
          {fechaDisponible && (
            <label
              title="Muestra las pólizas cuya vigencia vence ese día"
              className={`${CAJA_CLS} cursor-pointer pl-3 pr-2`}
            >
              <HiCalendar className="h-4 w-4 shrink-0 text-suave dark:text-suave-dark" />
              <span className="whitespace-nowrap text-[13px] text-suave dark:text-suave-dark">Vence el</span>
              <input
                type="date"
                value={fechaDia}
                onChange={cambiarCampo("fecha")}
                className="h-full min-w-0 cursor-pointer bg-transparent text-[14px] text-titulo dark:text-titulo-dark outline-none dark:[color-scheme:dark]"
              />
            </label>
          )}

          {/* Con una fecha elegida: ampliar días antes / después */}
          {mostrarDias && (
            <>
              <label
                title="Incluye los días anteriores a la fecha elegida"
                className={`${CAJA_CLS} pl-1.5 pr-3`}
              >
                <input
                  type="number"
                  min="0"
                  max={MAX_DIAS}
                  step="1"
                  inputMode="numeric"
                  aria-label="Días antes"
                  value={diasAntes}
                  onChange={cambiarCampo("antes")}
                  onBlur={normalizarDias("antes")}
                  className={NUMERO_CLS}
                />
                <span className="whitespace-nowrap text-[13px] text-suave dark:text-suave-dark">días antes</span>
              </label>
              <label
                title="Incluye los días posteriores a la fecha elegida"
                className={`${CAJA_CLS} pl-1.5 pr-3`}
              >
                <input
                  type="number"
                  min="0"
                  max={MAX_DIAS}
                  step="1"
                  inputMode="numeric"
                  aria-label="Días después"
                  value={diasDespues}
                  onChange={cambiarCampo("despues")}
                  onBlur={normalizarDias("despues")}
                  className={NUMERO_CLS}
                />
                <span className="whitespace-nowrap text-[13px] text-suave dark:text-suave-dark">días después</span>
              </label>
            </>
          )}
        </div>
      )}

      {/* ===== Fila de estado (resultados + filtros activos) ===== */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-suave dark:text-suave-dark md:text-xs">
        <span className="flex flex-wrap items-center gap-2">
          <span>Sucursal: <strong className="font-medium text-duo-verde-sombra dark:text-duo-verde">{user?.perfil?.oficina_nombre || "Local"}</strong></span>
          {typeof totalFiltradas === "number" && (
            <>
              <span className="opacity-40">|</span>
              <span>{totalFiltradas} resultados</span>
            </>
          )}
          {hayFiltroFecha && (
            <>
              <span className="opacity-40">|</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-duo-azul/25 bg-duo-azul/10 px-2 py-0.5 font-medium text-duo-azul">
                <HiCalendar className="h-3.5 w-3.5" /> {textoRango(desde, hasta)}
              </span>
            </>
          )}
          {soloMiOficina && (
            <span className="inline-flex items-center gap-1 rounded-full border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-2 py-0.5 font-medium">
              <HiOfficeBuilding className="h-3.5 w-3.5" /> Solo {miOficinaNombre}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {hayFiltros && (
            <Boton3D variant="blanco" size="sm" onClick={quitarFiltros} disabled={isLoading}>Quitar filtros</Boton3D>
          )}
          {localValue && (
            <Boton3D variant="blanco" size="sm" onClick={clearSearch} disabled={isLoading}>Limpiar</Boton3D>
          )}
          {!!searchApplied && (
            <Boton3D variant="blanco" size="sm" onClick={() => onClearSearchApplied?.()} disabled={isLoading}>Quitar búsqueda</Boton3D>
          )}
        </span>
      </div>
    </div>
  );
}