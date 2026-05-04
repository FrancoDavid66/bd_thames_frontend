// src/store/slices/balanceSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL; 

/**
 * 🔐 Función auxiliar para obtener el token del almacenamiento local.
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token") || localStorage.getItem("token"); 
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// =============== THUNKS ===============

// GET datos del balance diario
export const fetchBalanceDiario = createAsyncThunk(
  "balance/fetchDiario",
  async ({ fecha, oficina } = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (fecha) params.fecha = fecha;
      if (oficina !== undefined && oficina !== null && oficina !== 'ALL') {
        params.oficina = oficina;
      }

      const res = await axios.get(`${BASE_URL}balance-diario/`, { 
        params,
        headers: getAuthHeaders() 
      });
      return res.data;
    } catch (err) {
      const msg = err?.response?.data?.detail || "Error al obtener el balance diario";
      return rejectWithValue(msg);
    }
  }
);

// POST: enviar por WhatsApp
export const enviarBalanceWhatsapp = createAsyncThunk(
  "balance/enviarWhatsapp",
  async ({ fecha, destinatario, oficina } = {}, { rejectWithValue }) => {
    try {
      const payload = {};
      if (fecha) payload.fecha = fecha;
      if (destinatario) payload.destinatario = destinatario;
      if (oficina && oficina !== 'ALL') payload.oficina = oficina;

      const res = await axios.post(`${BASE_URL}balance-diario/enviar/`, payload, {
        headers: getAuthHeaders() 
      });
      return res.data; 
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || "No se pudo enviar el balance por WhatsApp";
      return rejectWithValue(msg);
    }
  }
);

// GET Categorías Oficiales
export const fetchCategorias = createAsyncThunk(
  "balance/fetchCategorias",
  async (tipo, { rejectWithValue }) => {
    try {
      const params = tipo ? { tipo } : {};
      const res = await axios.get(`${BASE_URL}categorias/`, {
        params,
        headers: getAuthHeaders(),
      });
      return res.data.results || res.data; 
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al obtener categorías");
    }
  }
);

// POST Crear Categoría Oficial
export const createCategoria = createAsyncThunk(
  "balance/createCategoria",
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}categorias/`, data, {
        headers: getAuthHeaders(),
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al crear categoría");
    }
  }
);

// 🚀 NUEVO: GET Lista de Oficinas (Para el selector de admin)
export const fetchOficinasList = createAsyncThunk(
  "balance/fetchOficinasList",
  async (_, { rejectWithValue }) => {
    try {
      // Ajusta la ruta a 'usuarios/oficinas/' si en tu backend está allí
      const res = await axios.get(`${BASE_URL}oficinas/`, {
        headers: getAuthHeaders(),
      });
      return res.data.results || res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al cargar las oficinas");
    }
  }
);

// 🚀 NUEVO: POST Crear un Ingreso
export const createIngreso = createAsyncThunk(
  "balance/createIngreso",
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}ingresos/`, data, {
        headers: getAuthHeaders(),
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al registrar el ingreso");
    }
  }
);

// 🚀 NUEVO: POST Crear un Egreso
export const createEgreso = createAsyncThunk(
  "balance/createEgreso",
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}egresos/`, data, {
        headers: getAuthHeaders(),
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al registrar el egreso");
    }
  }
);

// =============== SLICE ===============
const initialState = {
  data: null,
  status: "idle",
  error: null,
  
  envioStatus: "idle",
  envioError: null,
  mensajeEnviado: null,
  
  categorias: [],
  categoriasStatus: "idle",

  oficinas: [],
  oficinasStatus: "idle",
};

const balanceSlice = createSlice({
  name: "balance",
  initialState,
  reducers: {
    clearEnvioState: (state) => {
      state.envioStatus = "idle";
      state.envioError = null;
      state.mensajeEnviado = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- Balance Diario ---
      .addCase(fetchBalanceDiario.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchBalanceDiario.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload; 
      })
      .addCase(fetchBalanceDiario.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error?.message || "Error desconocido";
      })

      // --- WhatsApp ---
      .addCase(enviarBalanceWhatsapp.pending, (state) => {
        state.envioStatus = "loading";
        state.envioError = null;
        state.mensajeEnviado = null;
      })
      .addCase(enviarBalanceWhatsapp.fulfilled, (state, action) => {
        state.envioStatus = "succeeded";
        state.mensajeEnviado = action.payload?.detail || "Balance enviado correctamente";
      })
      .addCase(enviarBalanceWhatsapp.rejected, (state, action) => {
        state.envioStatus = "failed";
        state.envioError = action.payload || action.error?.message || "Error desconocido";
      })

      // --- Categorías ---
      .addCase(fetchCategorias.pending, (state) => {
        state.categoriasStatus = "loading";
      })
      .addCase(fetchCategorias.fulfilled, (state, action) => {
        state.categoriasStatus = "succeeded";
        state.categorias = action.payload; 
      })
      .addCase(fetchCategorias.rejected, (state) => {
        state.categoriasStatus = "failed";
      })
      .addCase(createCategoria.fulfilled, (state, action) => {
        state.categorias.push(action.payload);
      })

      // --- Oficinas ---
      .addCase(fetchOficinasList.pending, (state) => {
        state.oficinasStatus = "loading";
      })
      .addCase(fetchOficinasList.fulfilled, (state, action) => {
        state.oficinasStatus = "succeeded";
        state.oficinas = action.payload;
      })
      .addCase(fetchOficinasList.rejected, (state) => {
        state.oficinasStatus = "failed";
      });
  },
});

export const { clearEnvioState } = balanceSlice.actions;
export default balanceSlice.reducer;