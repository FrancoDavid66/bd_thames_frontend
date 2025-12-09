// src/store/slices/polizasSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

/** Base URL robusta:
 * - Usa VITE_API_URL si existe
 * - Si no, cae a '/api/'
 * - Garantiza la barra final
 */
const RAW_BASE = (import.meta.env?.VITE_API_URL || "/api/").toString().trim();
const BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;

// Instancia axios consistente para todo el slice
const http = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

/* ---------------- Thunks ---------------- */

// Resumen compat (si lo usás en algún dashboard)
export const fetchResumenPolizas = createAsyncThunk(
  "polizas/fetchResumen",
  async (_, { rejectWithValue }) => {
    try {
      const res = await http.get("polizas/resumen-estados/");
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al obtener resumen");
    }
  }
);

// KPIs exactos por backend: /polizas/kpis/
export const fetchPolizasKpis = createAsyncThunk(
  "polizas/fetchKpis",
  async (_, { getState, rejectWithValue }) => {
    try {
      const {
        search,
        compania,
        cliente,
        patente,
        solo_activas,
        estado,
        estado_financiero,
        modo,
        // Filtros de vencimiento:
        fecha_vencimiento_desde,
        fecha_vencimiento_hasta,
        vencidas_ultimos_dias,
        vencidas_mas_de_dias,
      } = getState().polizas;

      const params = {};
      if (search) params.search = search;
      if (compania) params.compania = compania;
      if (cliente) params.cliente = cliente;
      if (patente) params.patente = patente;
      if (solo_activas) params.solo_activas = 1;

      const isPolizas = (modo ?? "polizas") === "polizas";

      // Filtros “operativos” y de vencimiento solo en modo polizas
      if (isPolizas) {
        if (estado && estado !== "todos") {
          params.estado = estado;
        }
        if (estado_financiero && estado_financiero !== "todos") {
          params.estado_financiero = estado_financiero;
        }
        if (fecha_vencimiento_desde) {
          params.fecha_vencimiento_desde = fecha_vencimiento_desde;
        }
        if (fecha_vencimiento_hasta) {
          params.fecha_vencimiento_hasta = fecha_vencimiento_hasta;
        }
        if (vencidas_ultimos_dias) {
          params.vencidas_ultimos_dias = Number(vencidas_ultimos_dias);
        }
        if (vencidas_mas_de_dias) {
          params.vencidas_mas_de_dias = Number(vencidas_mas_de_dias);
        }
      }

      const res = await http.get("polizas/kpis/", { params });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al obtener KPIs");
    }
  }
);

// Listado paginado server-side
export const fetchPolizas = createAsyncThunk(
  "polizas/fetchPolizas",
  async (_, { getState, rejectWithValue }) => {
    try {
      const {
        page,
        pageSize,
        search,
        estado,
        estado_financiero,
        compania,
        cliente,
        patente,
        solo_activas,
        ordering,
        modo,
        // Filtros de vencimiento:
        fecha_vencimiento_desde,
        fecha_vencimiento_hasta,
        vencidas_ultimos_dias,
        vencidas_mas_de_dias,
      } = getState().polizas;

      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (compania) params.compania = compania;
      if (cliente) params.cliente = cliente;
      if (patente) params.patente = patente;
      if (solo_activas) params.solo_activas = 1;
      if (ordering) params.ordering = ordering;

      // Filtros “operativos” sólo en modo polizas (no cuotas)
      if (estado && estado !== "todos" && (modo ?? "polizas") === "polizas") {
        params.estado = estado;
      }
      // Buckets financieros sólo en modo polizas
      if (
        estado_financiero &&
        estado_financiero !== "todos" &&
        (modo ?? "polizas") === "polizas"
      ) {
        params.estado_financiero = estado_financiero;
      }

      // Filtros de vencimiento sólo en modo polizas
      if ((modo ?? "polizas") === "polizas") {
        if (fecha_vencimiento_desde)
          params.fecha_vencimiento_desde = fecha_vencimiento_desde;
        if (fecha_vencimiento_hasta)
          params.fecha_vencimiento_hasta = fecha_vencimiento_hasta;
        if (vencidas_ultimos_dias)
          params.vencidas_ultimos_dias = Number(vencidas_ultimos_dias);
        if (vencidas_mas_de_dias)
          params.vencidas_mas_de_dias = Number(vencidas_mas_de_dias);
      }

      const res = await http.get("polizas/", { params });
      return res.data; // { results, count, next, previous }
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al obtener pólizas");
    }
  }
);

export const fetchPolizaPorId = createAsyncThunk(
  "polizas/fetchPolizaPorId",
  async (id, { rejectWithValue }) => {
    try {
      const res = await http.get(`polizas/${id}/`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al obtener póliza");
    }
  }
);

export const createPoliza = createAsyncThunk(
  "polizas/createPoliza",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await http.post("polizas/", payload);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al crear póliza");
    }
  }
);

export const deletePoliza = createAsyncThunk(
  "polizas/deletePoliza",
  async (id, { rejectWithValue }) => {
    try {
      await http.delete(`polizas/${id}/`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al eliminar póliza");
    }
  }
);

export const updatePoliza = createAsyncThunk(
  "polizas/updatePoliza",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await http.patch(`polizas/${payload.id}/`, payload);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al actualizar póliza");
    }
  }
);

export const renovarPoliza = createAsyncThunk(
  "polizas/renovarPoliza",
  async ({ id, nuevoPrecio, nuevoNumero }, { rejectWithValue }) => {
    try {
      const res = await http.post(`polizas/${id}/renovar/`, {
        nuevo_precio: nuevoPrecio,
        nuevo_numero: nuevoNumero,
      });
      return { id, response: res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al renovar póliza");
    }
  }
);

export const togglePolizaEstado = createAsyncThunk(
  "polizas/togglePolizaEstado",
  async ({ id, estado }, { rejectWithValue }) => {
    try {
      await http.patch(`polizas/${id}/`, { estado });
      return { id, estado };
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al cambiar estado");
    }
  }
);

export const pagarCuota = createAsyncThunk(
  "polizas/pagarCuota",
  async ({ cuotaId, data }, { rejectWithValue }) => {
    try {
      const res = await http.patch(`cuotas/${cuotaId}/pagar/`, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al pagar cuota");
    }
  }
);

// 🔔 ENVÍO MASIVO / REPORTE DIAGNÓSTICO
export const enviarMensajesEstadoCuotas = createAsyncThunk(
  "polizas/enviarMensajesEstadoCuotas",
  async ({ filtros, preview = true }, { rejectWithValue }) => {
    try {
      const { page, page_size, ...clean } = filtros || {};
      const body = {
        filtros: clean,
        incluir_diagnostico: true,
        solo_reporte: !!preview,
      };
      const res = await http.post("polizas/enviar-mensajes-cuotas/", body);
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || "Error al enviar/diagnosticar mensajes"
      );
    }
  }
);

/* -------- Helpers front: estado por CUOTAS (modo "cuotas") -------- */
function estadoPorCuotas(poliza) {
  const cuotas = poliza?.cuotas || [];
  const impagas = cuotas.filter((c) => !c.pagado);
  if (impagas.length === 0) return "al_dia";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechas = impagas
    .filter((c) => c.fecha_vencimiento)
    .map((c) => new Date(c.fecha_vencimiento))
    .sort((a, b) => a - b);

  if (fechas.length === 0) return "vencidas";

  const proxima = fechas[0];
  const diffDays = Math.floor((hoy - proxima) / 86400000);
  if (diffDays === 0) return "vence_hoy";
  if (diffDays > 0) {
    if (diffDays <= 7) return "vencida_7";
    if (diffDays <= 30) return "vencida_30";
    return "vencidas";
  }
  return Math.abs(diffDays) <= 7 ? "por_vencer" : "al_dia";
}

/* ---------------- Slice ---------------- */
const polizasSlice = createSlice({
  name: "polizas",
  initialState: {
    list: [],
    poliza: null,
    status: "idle",
    error: null,

    // Paginación server-side
    page: 1,
    pageSize: 100, // alineado con LargeResultsSetPagination
    total: 0,
    next: null,
    previous: null,

    // Filtros/orden
    search: "",
    estado: "todos", // activa | vencida | cancelada | finalizada | todos
    estado_financiero: "todos", // al_dia | mora_1_30 | mora_31_60 | mora_61_90 | mora_90_mas | todos
    compania: "",
    cliente: "",
    patente: "",
    solo_activas: false,
    ordering: "-id",
    modo: "polizas",

    // Filtros de vencimiento
    fecha_vencimiento_desde: "",
    fecha_vencimiento_hasta: "",
    vencidas_ultimos_dias: "",
    vencidas_mas_de_dias: "",

    // KPIs
    kpis: {
      activas_al_dia: 0,
      activas_mora_1_30: 0,
      activas_mora_31_60: 0,
      activas_mora_61_90: 0,
      activas_mora_90_mas: 0,
      vencidas: 0,
      canceladas: 0,
      finalizadas: 0,
      total: 0,
    },
    kpisPorEstado: {},
    kpisPorCompania: {},
    kpisPorCobertura: null,
    kpisPorTipo: null,
    kpisTotalGlobal: 0,

    kpisStatus: "idle",
    kpisError: null,

    resumenPorEstado: {},

    // 🔔 Envío / diagnóstico
    envioMensajesStatus: "idle",
    envioMensajesError: null,
    envioMensajesResumen: null,
    envioMensajesPayload: null,
    envioMensajesBuckets: null,
    envioMensajesDiagnostico: null,
    envioMensajesSeleccionadas: 0,
    envioMensajesProcesadas: 0,
  },
  reducers: {
    setPage: (state, action) => {
      state.page = Number(action.payload) || 1;
    },
    setPageSize: (state, action) => {
      state.pageSize = Number(action.payload) || 100;
      state.page = 1;
    },
    setSearch: (state, action) => {
      state.search = action.payload || "";
      state.page = 1;
    },
    setEstado: (state, action) => {
      state.estado = action.payload || "todos";
      state.page = 1;
    },
    setEstadoFinanciero: (state, action) => {
      state.estado_financiero = action.payload || "todos";
      state.page = 1;
    },
    setCompania: (state, action) => {
      state.compania = action.payload || "";
      state.page = 1;
    },
    setCliente: (state, action) => {
      state.cliente = action.payload || "";
      state.page = 1;
    },
    setPatente: (state, action) => {
      state.patente = action.payload || "";
      state.page = 1;
    },
    setSoloActivas: (state, action) => {
      state.solo_activas = !!action.payload;
      state.page = 1;
    },
    setOrdering: (state, action) => {
      state.ordering = action.payload || "-id";
      state.page = 1;
    },
    setModo: (state, action) => {
      state.modo = action.payload || "polizas";
      state.page = 1;
    },

    // Filtros de vencimiento
    setFechaVencimientoDesde: (state, action) => {
      state.fecha_vencimiento_desde = action.payload || "";
      state.vencidas_ultimos_dias = "";
      state.vencidas_mas_de_dias = "";
      state.page = 1;
    },
    setFechaVencimientoHasta: (state, action) => {
      state.fecha_vencimiento_hasta = action.payload || "";
      state.vencidas_ultimos_dias = "";
      state.vencidas_mas_de_dias = "";
      state.page = 1;
    },
    setVencidasUltimosDias: (state, action) => {
      state.vencidas_ultimos_dias = action.payload || "";
      state.fecha_vencimiento_desde = "";
      state.fecha_vencimiento_hasta = "";
      state.vencidas_mas_de_dias = "";
      state.page = 1;
    },
    setVencidasMasDeDias: (state, action) => {
      state.vencidas_mas_de_dias = action.payload || "";
      state.fecha_vencimiento_desde = "";
      state.fecha_vencimiento_hasta = "";
      state.vencidas_ultimos_dias = "";
      state.page = 1;
    },
    clearVencimientoFilters: (state) => {
      state.fecha_vencimiento_desde = "";
      state.fecha_vencimiento_hasta = "";
      state.vencidas_ultimos_dias = "";
      state.vencidas_mas_de_dias = "";
      state.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      // Lista
      .addCase(fetchPolizas.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchPolizas.fulfilled, (state, action) => {
        state.status = "succeeded";
        const data = action.payload || {};
        state.list = Array.isArray(data) ? data : data.results || [];
        state.total = Array.isArray(data)
          ? data.length
          : data.count ?? (data.results?.length ?? 0);
        state.next = data.next || null;
        state.previous = data.previous || null;
      })
      .addCase(fetchPolizas.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Detalle
      .addCase(fetchPolizaPorId.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchPolizaPorId.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.poliza = action.payload;
      })
      .addCase(fetchPolizaPorId.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // CRUD
      .addCase(createPoliza.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
        state.total += 1;
      })
      .addCase(deletePoliza.fulfilled, (state, action) => {
        state.list = state.list.filter((p) => p.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(updatePoliza.fulfilled, (state, action) => {
        const i = state.list.findIndex((p) => p.id === action.payload.id);
        if (i !== -1) state.list[i] = action.payload;
        if (state.poliza?.id === action.payload.id) state.poliza = action.payload;
      })
      .addCase(renovarPoliza.fulfilled, (state, action) => {
        const i = state.list.findIndex((p) => p.id === action.payload.id);
        if (i !== -1)
          state.list[i] = { ...state.list[i], ...action.payload.response };
      })
      .addCase(togglePolizaEstado.fulfilled, (state, action) => {
        const i = state.list.findIndex((p) => p.id === action.payload.id);
        if (i !== -1) state.list[i].estado = action.payload.estado;
      })

      // Resumen compat
      .addCase(fetchResumenPolizas.fulfilled, (state, action) => {
        state.resumenPorEstado = action.payload || {};
      })

      // Pago de cuota
      .addCase(pagarCuota.fulfilled, (state, action) => {
        const cuota = action.payload;
        const poliza = state.list.find((p) => p.id === cuota.poliza?.id);
        if (poliza?.cuotas) {
          const i = poliza.cuotas.findIndex((c) => c.id === cuota.id);
          if (i !== -1) poliza.cuotas[i] = cuota;
        }
        if (state.poliza?.id === cuota.poliza?.id && state.poliza.cuotas) {
          const i = state.poliza.cuotas.findIndex((c) => c.id === cuota.id);
          if (i !== -1) state.poliza.cuotas[i] = cuota;
        }
      })

      // KPIs + Desgloses
      .addCase(fetchPolizasKpis.pending, (state) => {
        state.kpisStatus = "loading";
        state.kpisError = null;
      })
      .addCase(fetchPolizasKpis.fulfilled, (state, action) => {
        state.kpisStatus = "succeeded";
        const p = action.payload || {};
        state.kpis = {
          activas_al_dia: p.activas_al_dia ?? 0,
          activas_mora_1_30: p.activas_mora_1_30 ?? 0,
          activas_mora_31_60: p.activas_mora_31_60 ?? 0,
          activas_mora_61_90: p.activas_mora_61_90 ?? 0,
          activas_mora_90_mas: p.activas_mora_90_mas ?? 0,
          vencidas: p.vencidas ?? 0,
          canceladas: p.canceladas ?? 0,
          finalizadas: p.finalizadas ?? 0,
          total: p.total ?? 0,
        };
        state.kpisPorEstado = p.por_estado || {};
        state.kpisPorCompania = p.por_compania || {};
        state.kpisPorCobertura = p.por_cobertura ?? null;
        state.kpisPorTipo = p.por_tipo ?? null;
        state.kpisTotalGlobal = p.total_global ?? 0;
      })
      .addCase(fetchPolizasKpis.rejected, (state, action) => {
        state.kpisStatus = "failed";
        state.kpisError = action.payload;
      })

      // 🔔 Envío masivo / DIAGNÓSTICO
      .addCase(enviarMensajesEstadoCuotas.pending, (state) => {
        state.envioMensajesStatus = "loading";
        state.envioMensajesError = null;
        state.envioMensajesResumen = null;
        state.envioMensajesPayload = null;
        state.envioMensajesBuckets = null;
        state.envioMensajesDiagnostico = null;
        state.envioMensajesSeleccionadas = 0;
        state.envioMensajesProcesadas = 0;
      })
      .addCase(enviarMensajesEstadoCuotas.fulfilled, (state, action) => {
        state.envioMensajesStatus = "succeeded";
        const r = action.payload || {};
        state.envioMensajesResumen = {
          enviados: Number(r.enviados || 0),
          fallidos: Number(r.fallidos || 0),
        };
        state.envioMensajesPayload = r;
        state.envioMensajesBuckets = r.buckets || null;
        state.envioMensajesDiagnostico = r.diagnostico || null;
        state.envioMensajesSeleccionadas = Number(r.seleccionadas || 0);
        state.envioMensajesProcesadas = Number(r.procesadas || 0);
      })
      .addCase(enviarMensajesEstadoCuotas.rejected, (state, action) => {
        state.envioMensajesStatus = "failed";
        state.envioMensajesError = action.payload;
      });
  },
});

export const {
  setPage,
  setPageSize,
  setSearch,
  setEstado,
  setEstadoFinanciero,
  setCompania,
  setCliente,
  setPatente,
  setSoloActivas,
  setOrdering,
  setModo,
  setFechaVencimientoDesde,
  setFechaVencimientoHasta,
  setVencidasUltimosDias,
  setVencidasMasDeDias,
  clearVencimientoFilters,
} = polizasSlice.actions;

export default polizasSlice.reducer;

/* ---------------- Selectores útiles ---------------- */
export const selectPolizas = (s) => s.polizas.list || [];

export const selectPolizasFiltradas = (s) => {
  const { list, search, estado, modo } = s.polizas;
  const q = (search || "").trim().toLowerCase();

  return (list || []).filter((p) => {
    const texto = [
      p?.cliente?.nombre,
      p?.cliente?.apellido,
      p?.cliente?.dni_cuit_cuil,
      p?.patente,
      p?.numero_poliza,
      p?.marca,
      p?.modelo,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (q && !texto.includes(q)) return false;
    if (estado === "todos") return true;

    if (modo === "cuotas") {
      return estadoPorCuotas(p) === estado; // filtro en cliente
    }
    return true; // en modo "polizas" filtra backend
  });
};

// KPIs listos para UI
export const selectPolizasKpis = (s) => s.polizas.kpis;
export const selectKpisStatus = (s) => s.polizas.kpisStatus;
export const selectClientesAlDia = (s) => s.polizas.kpis.activas_al_dia ?? 0;

// Desgloses extra
export const selectKpisPorEstado = (s) => s.polizas.kpisPorEstado || {};
export const selectKpisPorCompania = (s) => s.polizas.kpisPorCompania || {};
export const selectKpisPorCobertura = (s) => s.polizas.kpisPorCobertura || null;
export const selectKpisPorTipo = (s) => s.polizas.kpisPorTipo || null;
export const selectKpisTotalGlobal = (s) => s.polizas.kpisTotalGlobal || 0;

// Resumen por cuotas (sobre la lista cargada)
export const selectResumenCuotas = (s) => {
  const list = s.polizas.list || [];
  const base = {
    todos: list.length,
    al_dia: 0,
    por_vencer: 0,
    vence_hoy: 0,
    vencida_7: 0,
    vencida_30: 0,
    vencidas: 0,
    canceladas: 0,
  };
  list.forEach((p) => {
    const k = estadoPorCuotas(p);
    base[k] = (base[k] || 0) + 1;
  });
  return base;
};

// 🔔 Selectores de diagnóstico/resultado de envío
export const selectEnvioMensajesStatus = (s) =>
  s.polizas.envioMensajesStatus || "idle";

export const selectEnvioMensajesResumen = (s) =>
  s.polizas.envioMensajesResumen || null;
export const selectEnvioMensajesBuckets = (s) =>
  s.polizas.envioMensajesBuckets || null;
export const selectEnvioMensajesDiagnostico = (s) =>
  s.polizas.envioMensajesDiagnostico || null;
export const selectEnvioMensajesPayload = (s) =>
  s.polizas.envioMensajesPayload || null;
export const selectEnvioMensajesSeleccionadas = (s) =>
  s.polizas.envioMensajesSeleccionadas || 0;
export const selectEnvioMensajesProcesadas = (s) =>
  s.polizas.envioMensajesProcesadas || 0;
