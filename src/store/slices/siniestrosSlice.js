// src/store/slices/siniestrosSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/';

const getToken = () =>
  localStorage.getItem('access_token') || localStorage.getItem('token') || '';

const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

// ──────── SINIESTROS CRUD ────────

export const getSiniestros = createAsyncThunk('siniestros/getSiniestros', async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${BASE_URL}siniestros/`, { headers: authHeader() });
    return response.data.results || response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al obtener los siniestros');
  }
});

export const addSiniestro = createAsyncThunk('siniestros/addSiniestro', async (siniestro, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${BASE_URL}siniestros/`, siniestro, { headers: authHeader() });
    return response.data.results || response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al crear el siniestro');
  }
});

export const editSiniestro = createAsyncThunk('siniestros/editSiniestro', async ({ id, siniestro }, { rejectWithValue }) => {
  try {
    const response = await axios.put(`${BASE_URL}siniestros/${id}/`, siniestro, { headers: authHeader() });
    return response.data.results || response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al actualizar el siniestro');
  }
});

export const removeSiniestro = createAsyncThunk('siniestros/removeSiniestro', async (id, { rejectWithValue }) => {
  try {
    await axios.delete(`${BASE_URL}siniestros/${id}/`, { headers: authHeader() });
    return id;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al eliminar el siniestro');
  }
});

// ──────── EVENTOS ────────

export const addEvento = createAsyncThunk('siniestros/addEvento', async (evento, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${BASE_URL}eventos/`, evento, { headers: authHeader() });
    return response.data.results || response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al crear el evento del siniestro');
  }
});

export const getEventosBySiniestro = createAsyncThunk('siniestros/getEventosBySiniestro', async (siniestroId, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${BASE_URL}siniestros/${siniestroId}/eventos/`, { headers: authHeader() });
    return response.data.results || response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al obtener los eventos del siniestro');
  }
});

// ──────── ANTI-FRAUDE: siniestros recientes por póliza o cliente ────────

/**
 * Consulta siniestros recientes para una póliza o cliente.
 * Usado en PagosList para detectar riesgo de fraude antes de cobrar.
 * @param {{ poliza_id?: number, cliente_id?: number, dias?: number }} params
 */
export const fetchSiniestrosRecientes = createAsyncThunk(
  'siniestros/fetchSiniestrosRecientes',
  async ({ poliza_id, cliente_id, dias = 60 }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ dias });
      if (poliza_id)   params.append('poliza_id',  poliza_id);
      if (cliente_id)  params.append('cliente_id', cliente_id);
      const response = await axios.get(
        `${BASE_URL}siniestros/recientes/?${params.toString()}`,
        { headers: authHeader() }
      );
      return response.data.results || response.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error al consultar siniestros recientes');
    }
  }
);

const siniestrosSlice = createSlice({
  name: 'siniestros',
  initialState: {
    siniestros: [],
    eventos: {},
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getSiniestros.pending, (state) => { state.loading = true; })
      .addCase(getSiniestros.fulfilled, (state, action) => {
        state.loading = false;
        state.siniestros = action.payload;
      })
      .addCase(getSiniestros.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Error';
      })
      .addCase(addSiniestro.fulfilled, (state, action) => { state.siniestros.unshift(action.payload); })
      .addCase(editSiniestro.fulfilled, (state, action) => {
        const index = state.siniestros.findIndex(s => s.id === action.payload.id);
        if (index !== -1) state.siniestros[index] = action.payload;
      })
      .addCase(removeSiniestro.fulfilled, (state, action) => {
        state.siniestros = state.siniestros.filter(s => s.id !== action.payload);
      })
      .addCase(addEvento.fulfilled, (state, action) => {
        const siniestroId = action.payload.siniestro_id;
        if (!state.eventos[siniestroId]) state.eventos[siniestroId] = [];
        state.eventos[siniestroId].unshift(action.payload); // Lo agregamos al principio
      })
      .addCase(getEventosBySiniestro.fulfilled, (state, action) => {
        state.eventos[action.meta.arg] = action.payload;
      });
  },
});

export default siniestrosSlice.reducer;