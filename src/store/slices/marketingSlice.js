import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { MarketingAPI } from "../../api/marketing";

/**
 * Genera una llave única para los filtros de previsualización.
 */
const stableStringify = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
};

/**
 * Normalizador de errores para thunks.
 */
const toError = (err, fallback = "Error inesperado") =>
  err?.message || err?.detail || err?.error || fallback;

const DEFAULT_FILTER_OPTIONS = {
  marcas: [],
  anios: [],
  modelos: [],
  companias: [],
  oficinas: [],
  tipos: [],      // 🚀 NUEVO: Para filtrar por Auto, Moto, Camión, etc.
  coberturas: [], // 🚀 NUEVO: Para filtrar por B1, Todo Riesgo, etc.
};

const initialState = {
  audiencia: null,
  audienciaStatus: "idle",
  audienciaError: null,

  filterOptions: DEFAULT_FILTER_OPTIONS,
  filterOptionsStatus: "idle",

  historial: [],
  historialStatus: "idle",
  
  historialDetalleById: {}, 
  logsById: {},
  logsStatusById: {},
  logsErrorById: {},

  sendStatus: "idle",
  sendResult: null,
  sendError: null,
};

// --- Thunks (Llamadas a API) ---

export const fetchAudienciaResumen = createAsyncThunk(
  "marketing/fetchAudienciaResumen",
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await MarketingAPI.audienciaResumen(params);
      return { key: stableStringify(params), data };
    } catch (err) { return rejectWithValue(toError(err)); }
  }
);

export const fetchMarketingFilterOptions = createAsyncThunk(
  "marketing/fetchFilterOptions",
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await MarketingAPI.filtrosOpciones(params);
      return {
        marcas: Array.isArray(data?.marcas) ? data.marcas : [],
        anios: Array.isArray(data?.anios) ? data.anios : [],
        modelos: Array.isArray(data?.modelos) ? data.modelos : [],
        companias: Array.isArray(data?.companias) ? data.companias : [],
        oficinas: Array.isArray(data?.oficinas) ? data.oficinas : [],
        tipos: Array.isArray(data?.tipos) ? data.tipos : [],           // 🚀 CAPTURADO: Tipos de vehículo
        coberturas: Array.isArray(data?.coberturas) ? data.coberturas : [], // 🚀 CAPTURADO: Coberturas
      };
    } catch (err) { return rejectWithValue(toError(err)); }
  }
);

export const sendMensajeMarketingThunk = createAsyncThunk(
  "marketing/send",
  async (payload, { rejectWithValue }) => {
    try { 
      return await MarketingAPI.enviarMensaje(payload); 
    } catch (err) { 
      return rejectWithValue(toError(err)); 
    }
  }
);

export const fetchHistorialMarketing = createAsyncThunk(
  "marketing/fetchHistorial",
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await MarketingAPI.listarHistorial(params);
      return Array.isArray(data) ? data : (data?.results || []);
    } catch (err) { return rejectWithValue(toError(err)); }
  }
);

export const fetchLogsHistorial = createAsyncThunk(
  "marketing/fetchLogs",
  async ({ id }, { rejectWithValue }) => {
    try {
      const data = await MarketingAPI.logsHistorial(id);
      return { id, data: { items: data?.items || [], count: data?.count || 0 } };
    } catch (err) { return rejectWithValue({ id, error: toError(err) }); }
  }
);

// --- Slice ---

const marketingSlice = createSlice({
  name: "marketing",
  initialState,
  reducers: {
    clearMarketingErrors(state) {
      state.audienciaError = null;
      state.sendError = null;
    },
    clearMarketingSendResult(state) {
      state.sendResult = null;
      state.sendStatus = "idle";
    },
    clearLogsHistorial(state, action) {
      const id = action.payload;
      if (id) { 
        delete state.logsById[id]; 
        delete state.logsStatusById[id]; 
        delete state.logsErrorById[id]; 
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAudienciaResumen.pending, (state) => { 
        state.audienciaStatus = "loading"; 
        state.audienciaError = null; 
      })
      .addCase(fetchAudienciaResumen.fulfilled, (state, action) => {
        state.audienciaStatus = "succeeded";
        state.audiencia = action.payload.data;
      })
      .addCase(fetchAudienciaResumen.rejected, (state, action) => {
        state.audienciaStatus = "failed";
        state.audienciaError = action.payload;
      })
      .addCase(fetchMarketingFilterOptions.fulfilled, (state, action) => {
        state.filterOptions = action.payload;
        state.filterOptionsStatus = "succeeded";
      })
      .addCase(sendMensajeMarketingThunk.pending, (state) => { 
        state.sendStatus = "loading"; 
        state.sendError = null; 
      })
      .addCase(sendMensajeMarketingThunk.fulfilled, (state, action) => {
        state.sendStatus = "succeeded";
        state.sendResult = action.payload;
      })
      .addCase(sendMensajeMarketingThunk.rejected, (state, action) => {
        state.sendStatus = "failed";
        state.sendError = action.payload;
      })
      .addCase(fetchHistorialMarketing.pending, (state) => {
        state.historialStatus = "loading";
      })
      .addCase(fetchHistorialMarketing.fulfilled, (state, action) => {
        state.historialStatus = "succeeded";
        state.historial = action.payload;
      })
      .addCase(fetchLogsHistorial.pending, (state, action) => {
        const id = action.meta.arg.id;
        state.logsStatusById[id] = "loading";
      })
      .addCase(fetchLogsHistorial.fulfilled, (state, action) => {
        state.logsById[action.payload.id] = action.payload.data;
        state.logsStatusById[action.payload.id] = "succeeded";
      })
      .addCase(fetchLogsHistorial.rejected, (state, action) => {
        const id = action.payload?.id;
        if (id) {
          state.logsStatusById[id] = "failed";
          state.logsErrorById[id] = action.payload?.error;
        }
      });
  }
});

export const { clearMarketingErrors, clearMarketingSendResult, clearLogsHistorial } = marketingSlice.actions;

// --- Selectors ---

export const selectMarketingAudiencia = (state) => state.marketing.audiencia;
export const selectMarketingAudienciaStatus = (state) => state.marketing.audienciaStatus;
export const selectMarketingFilterOptions = (state) => state.marketing.filterOptions;
export const selectMarketingHistorial = (state) => state.marketing.historial;
export const selectMarketingHistorialStatus = (state) => state.marketing.historialStatus;
export const selectMarketingSendStatus = (state) => state.marketing.sendStatus;

export const selectMarketingLogsById = (state, id) => state.marketing.logsById[id] || { items: [] };

export default marketingSlice.reducer;