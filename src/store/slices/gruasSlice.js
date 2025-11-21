// src/store/slices/gruasSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { GruasAPI } from "../../api/gruas";
import { PolizasAPI } from "../../api/polizas";

// ---------- Thunks (Planes) ----------
export const fetchPlanesGrua = createAsyncThunk(
  "gruas/fetchPlanes",
  async (_, { rejectWithValue }) => {
    try { return await GruasAPI.getPlanes(); }
    catch (e) { return rejectWithValue(e); }
  }
);

export const createPlanGrua = createAsyncThunk(
  "gruas/createPlan",
  async (plan, { rejectWithValue }) => {
    try { return await GruasAPI.createPlan(plan); }
    catch (e) { return rejectWithValue(e); }
  }
);

// ---------- Thunks (Adhesiones) ----------
export const activarAdhesionGrua = createAsyncThunk(
  "gruas/activarAdhesion",
  async (payload, { rejectWithValue }) => {
    try { return await GruasAPI.activarAdhesion(payload); }
    catch (e) { return rejectWithValue(e); }
  }
);

// 🔹 Asociar grúa a una póliza (usa endpoint de /polizas/{id}/asociar-grua/)
export const asociarGrua = createAsyncThunk(
  "gruas/asociarGrua",
  async ({ polizaId, data }, { rejectWithValue }) => {
    try { return await PolizasAPI.asociarGrua(polizaId, data || {}); }
    catch (e) { return rejectWithValue(e); }
  }
);

export const firmarContratoAdhesion = createAsyncThunk(
  "gruas/firmarContratoAdhesion",
  async ({ adhesionId, archivo_url }, { rejectWithValue }) => {
    try { return await GruasAPI.firmarContrato(adhesionId, { archivo_url }); }
    catch (e) { return rejectWithValue(e); }
  }
);

export const fetchAdhesionesByPoliza = createAsyncThunk(
  "gruas/fetchAdhesionesByPoliza",
  async (polizaId, { rejectWithValue }) => {
    try { return await GruasAPI.getAdhesionesByPoliza(polizaId); }
    catch (e) { return rejectWithValue(e); }
  }
);

// ---------- Thunks (KPIs / Series / Resúmenes) ----------
export const fetchKpisSolicitudes = createAsyncThunk(
  "gruas/fetchKpis",
  async (params, { rejectWithValue }) => {
    try { return await GruasAPI.kpis(params || {}); }
    catch (e) { return rejectWithValue(e); }
  }
);

export const fetchSeriePorMes = createAsyncThunk(
  "gruas/fetchSeriePorMes",
  async (params, { rejectWithValue }) => {
    try { return await GruasAPI.porMes(params || {}); }
    catch (e) { return rejectWithValue(e); }
  }
);

export const fetchClienteResumen = createAsyncThunk(
  "gruas/fetchClienteResumen",
  async (clienteId, { rejectWithValue }) => {
    try { return await GruasAPI.getClienteResumen(clienteId); }
    catch (e) { return rejectWithValue(e); }
  }
);

export const fetchPolizaResumen = createAsyncThunk(
  "gruas/fetchPolizaResumen",
  async (polizaId, { rejectWithValue }) => {
    try { return await GruasAPI.getPolizaResumen(polizaId); }
    catch (e) { return rejectWithValue(e); }
  }
);

export const searchPolizasElegibles = createAsyncThunk(
  "gruas/searchPolizasElegibles",
  async ({ q, soloOperables = false }, { rejectWithValue }) => {
    try { return await GruasAPI.searchPolizasElegibles(q, soloOperables); }
    catch (e) { return rejectWithValue(e); }
  }
);

// ---------- Estado ----------
const initialState = {
  planes: { list: [], loading: false, error: null, creating: false, createError: null },

  activacion: { loading: false, success: false, error: null, adhesion: null },
  // 🔹 Estado para la asociación
  asociacion: { loading: false, success: false, error: null, adhesion: null },

  adhesiones: { byPoliza: {}, loading: false, error: null },

  // KPIs / series
  kpis: { data: null, loading: false, error: null },
  seriePorMes: { data: [], loading: false, error: null },

  // Resúmenes
  clienteResumen: { byId: {}, loading: false, error: null },
  polizaResumen: { byId: {}, loading: false, error: null },

  // Búsqueda de pólizas para activar o solicitar
  polizasBusqueda: { list: [], loading: false, error: null },
};

const gruasSlice = createSlice({
  name: "gruas",
  initialState,
  reducers: {
    resetActivacion(state) {
      state.activacion = { loading: false, success: false, error: null, adhesion: null };
    },
    // 🔹 Reset de la asociación
    resetAsociacion(state) {
      state.asociacion = { loading: false, success: false, error: null, adhesion: null };
    },
    resetBusquedaPolizas(state) {
      state.polizasBusqueda = { list: [], loading: false, error: null };
    },
  },
  extraReducers: (builder) => {
    // Planes (listado)
    builder.addCase(fetchPlanesGrua.pending, (state) => {
      state.planes.loading = true; state.planes.error = null;
    });
    builder.addCase(fetchPlanesGrua.fulfilled, (state, action) => {
      state.planes.loading = false;
      state.planes.list = Array.isArray(action.payload) ? action.payload : [];
    });
    builder.addCase(fetchPlanesGrua.rejected, (state, action) => {
      state.planes.loading = false; state.planes.error = action.payload || action.error;
    });

    // Planes (crear)
    builder.addCase(createPlanGrua.pending, (state) => {
      state.planes.creating = true; state.planes.createError = null;
    });
    builder.addCase(createPlanGrua.fulfilled, (state, action) => {
      state.planes.creating = false;
      const nuevo = action.payload;
      state.planes.list = [nuevo, ...(state.planes.list || [])];
    });
    builder.addCase(createPlanGrua.rejected, (state, action) => {
      state.planes.creating = false; state.planes.createError = action.payload || action.error;
    });

    // Activación
    builder.addCase(activarAdhesionGrua.pending, (state) => {
      state.activacion = { loading: true, success: false, error: null, adhesion: null };
    });
    builder.addCase(activarAdhesionGrua.fulfilled, (state, action) => {
      state.activacion = { loading: false, success: true, error: null, adhesion: action.payload };
    });
    builder.addCase(activarAdhesionGrua.rejected, (state, action) => {
      state.activacion = { loading: false, success: false, error: action.payload || action.error, adhesion: null };
    });

    // 🔹 Asociación
    builder.addCase(asociarGrua.pending, (state) => {
      state.asociacion = { loading: true, success: false, error: null, adhesion: null };
    });
    builder.addCase(asociarGrua.fulfilled, (state, action) => {
      state.asociacion = { loading: false, success: true, error: null, adhesion: action.payload };
      // Actualizar cache de adhesiones por póliza
      const adhesion = action.payload || {};
      const polizaId = action.meta?.arg?.polizaId ?? adhesion?.poliza;
      if (polizaId != null) {
        const list = state.adhesiones.byPoliza[polizaId] || [];
        state.adhesiones.byPoliza[polizaId] = [adhesion, ...list];
      }
    });
    builder.addCase(asociarGrua.rejected, (state, action) => {
      state.asociacion = { loading: false, success: false, error: action.payload || action.error, adhesion: null };
    });

    // Firmar contrato
    builder.addCase(firmarContratoAdhesion.pending, (state) => {
      state.activacion.loading = true;
    });
    builder.addCase(firmarContratoAdhesion.fulfilled, (state, action) => {
      state.activacion.loading = false;
      state.activacion.adhesion = action.payload;
    });
    builder.addCase(firmarContratoAdhesion.rejected, (state, action) => {
      state.activacion.loading = false;
      state.activacion.error = action.payload || action.error;
    });

    // Adhesiones por póliza
    builder.addCase(fetchAdhesionesByPoliza.pending, (state) => {
      state.adhesiones.loading = true; state.adhesiones.error = null;
    });
    builder.addCase(fetchAdhesionesByPoliza.fulfilled, (state, action) => {
      state.adhesiones.loading = false;
      const list = Array.isArray(action.payload) ? action.payload : [];
      const polizaId = action.meta?.arg;
      if (polizaId != null) {
        state.adhesiones.byPoliza[polizaId] = list;
      } else if (list.length) {
        const pId = list[0].poliza;
        state.adhesiones.byPoliza[pId] = list;
      }
    });
    builder.addCase(fetchAdhesionesByPoliza.rejected, (state, action) => {
      state.adhesiones.loading = false; state.adhesiones.error = action.payload || action.error;
    });

    // KPIs
    builder.addCase(fetchKpisSolicitudes.pending, (state) => {
      state.kpis.loading = true; state.kpis.error = null;
    });
    builder.addCase(fetchKpisSolicitudes.fulfilled, (state, action) => {
      state.kpis.loading = false; state.kpis.data = action.payload || null;
    });
    builder.addCase(fetchKpisSolicitudes.rejected, (state, action) => {
      state.kpis.loading = false; state.kpis.error = action.payload || action.error;
    });

    // Serie por mes
    builder.addCase(fetchSeriePorMes.pending, (state) => {
      state.seriePorMes.loading = true; state.seriePorMes.error = null;
    });
    builder.addCase(fetchSeriePorMes.fulfilled, (state, action) => {
      state.seriePorMes.loading = false;
      state.seriePorMes.data = Array.isArray(action.payload?.series) ? action.payload.series : [];
    });
    builder.addCase(fetchSeriePorMes.rejected, (state, action) => {
      state.seriePorMes.loading = false; state.seriePorMes.error = action.payload || action.error;
    });

    // Resumen cliente
    builder.addCase(fetchClienteResumen.pending, (state) => {
      state.clienteResumen.loading = true; state.clienteResumen.error = null;
    });
    builder.addCase(fetchClienteResumen.fulfilled, (state, action) => {
      state.clienteResumen.loading = false;
      const d = action.payload || {};
      if (d?.cliente_id != null) state.clienteResumen.byId[d.cliente_id] = d;
    });
    builder.addCase(fetchClienteResumen.rejected, (state, action) => {
      state.clienteResumen.loading = false; state.clienteResumen.error = action.payload || action.error;
    });

    // Resumen póliza
    builder.addCase(fetchPolizaResumen.pending, (state) => {
      state.polizaResumen.loading = true; state.polizaResumen.error = null;
    });
    builder.addCase(fetchPolizaResumen.fulfilled, (state, action) => {
      state.polizaResumen.loading = false;
      const d = action.payload || {};
      if (d?.poliza_id != null) state.polizaResumen.byId[d.poliza_id] = d;
    });
    builder.addCase(fetchPolizaResumen.rejected, (state, action) => {
      state.polizaResumen.loading = false; state.polizaResumen.error = action.payload || action.error;
    });

    // Búsqueda de pólizas
    builder.addCase(searchPolizasElegibles.pending, (state) => {
      state.polizasBusqueda.loading = true; state.polizasBusqueda.error = null;
    });
    builder.addCase(searchPolizasElegibles.fulfilled, (state, action) => {
      state.polizasBusqueda.loading = false;
      state.polizasBusqueda.list = Array.isArray(action.payload) ? action.payload : [];
    });
    builder.addCase(searchPolizasElegibles.rejected, (state, action) => {
      state.polizasBusqueda.loading = false; state.polizasBusqueda.error = action.payload || action.error;
    });
  },
});

export const { resetActivacion, resetAsociacion, resetBusquedaPolizas } = gruasSlice.actions;
export default gruasSlice.reducer;
