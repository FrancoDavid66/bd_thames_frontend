import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL; 

/**
 * 🔐 Función auxiliar para obtener el token del almacenamiento local.
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token"); 
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
      
      // Enviamos la oficina seleccionada
      if (oficina !== undefined && oficina !== null) {
        params.oficina = oficina;
      }

      const res = await axios.get(`${BASE_URL}balance-diario/`, { 
        params,
        headers: getAuthHeaders() // 🔑 Seguridad agregada
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
      if (oficina) payload.oficina = oficina;

      const res = await axios.post(`${BASE_URL}balance-diario/enviar/`, payload, {
        headers: getAuthHeaders() // 🔑 Seguridad agregada
      });
      return res.data; 
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        "No se pudo enviar el balance por WhatsApp";
      return rejectWithValue(msg);
    }
  }
);

// 🚀 NUEVO: GET Categorías Oficiales
export const fetchCategorias = createAsyncThunk(
  "balance/fetchCategorias",
  async (tipo, { rejectWithValue }) => {
    try {
      // Si pasamos tipo="INGRESO" o "EGRESO", el backend filtra. Si no, trae todas.
      const params = tipo ? { tipo } : {};
      const res = await axios.get(`${BASE_URL}categorias/`, {
        params,
        headers: getAuthHeaders(),
      });
      return res.data; 
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al obtener categorías");
    }
  }
);

// 🚀 NUEVO: POST Crear Categoría Oficial
export const createCategoria = createAsyncThunk(
  "balance/createCategoria",
  async (data, { rejectWithValue }) => {
    try {
      // data debe ser un objeto: { nombre: "Limpieza", tipo: "EGRESO" }
      const res = await axios.post(`${BASE_URL}categorias/`, data, {
        headers: getAuthHeaders(),
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al crear categoría");
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
  
  // 🚀 NUEVOS ESTADOS PARA CATEGORÍAS
  categorias: [],
  categoriasStatus: "idle",
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
      // --- GET datos del balance ---
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

      // --- POST enviar por WhatsApp ---
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

      // --- GET Categorías ---
      .addCase(fetchCategorias.pending, (state) => {
        state.categoriasStatus = "loading";
      })
      .addCase(fetchCategorias.fulfilled, (state, action) => {
        state.categoriasStatus = "succeeded";
        // Si el backend usa paginación vendrá en .results, sino es directo el array
        state.categorias = action.payload.results || action.payload; 
      })
      .addCase(fetchCategorias.rejected, (state) => {
        state.categoriasStatus = "failed";
      })

      // --- POST Categoría ---
      .addCase(createCategoria.fulfilled, (state, action) => {
        // Agregamos la nueva categoría al estado automáticamente
        state.categorias.push(action.payload);
      });
  },
});

export const { clearEnvioState } = balanceSlice.actions;
export default balanceSlice.reducer;