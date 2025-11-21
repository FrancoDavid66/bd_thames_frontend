// src/store/slices/siniestrosSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// 🌐 Gestión dinámica de la URL desde la variable de entorno
const BASE_URL = import.meta.env.VITE_API_URL;

// ──────── SINIESTROS ────────

// Obtener todos los siniestros
export const getSiniestros = createAsyncThunk('siniestros/getSiniestros', async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${BASE_URL}siniestros/`);
    return response.data.results || response.data;

  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al obtener los siniestros');
  }
});

// Crear un nuevo siniestro
export const addSiniestro = createAsyncThunk('siniestros/addSiniestro', async (siniestro, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${BASE_URL}siniestros/`, siniestro);
    return response.data.results || response.data;

  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al crear el siniestro');
  }
});

// Editar un siniestro
export const editSiniestro = createAsyncThunk('siniestros/editSiniestro', async ({ id, siniestro }, { rejectWithValue }) => {
  try {
    const response = await axios.put(`${BASE_URL}siniestros/${id}/`, siniestro);
    return response.data.results || response.data;

  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al actualizar el siniestro');
  }
});

// Eliminar un siniestro
export const removeSiniestro = createAsyncThunk('siniestros/removeSiniestro', async (id, { rejectWithValue }) => {
  try {
    await axios.delete(`${BASE_URL}siniestros/${id}/`);
    return id;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al eliminar el siniestro');
  }
});

// Crear un nuevo evento relacionado a un siniestro
export const addEvento = createAsyncThunk('siniestros/addEvento', async (evento, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${BASE_URL}siniestros/eventos/`, evento);
    return response.data.results || response.data;

  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al crear el evento del siniestro');
  }
});

// Obtener eventos por siniestro
export const getEventosBySiniestro = createAsyncThunk('siniestros/getEventosBySiniestro', async (siniestroId, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${BASE_URL}siniestros/${siniestroId}/eventos/`);
    return response.data.results || response.data;

  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al obtener los eventos del siniestro');
  }
});

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
      // Obtener siniestros
      .addCase(getSiniestros.pending, (state) => {
        state.loading = true;
      })
      .addCase(getSiniestros.fulfilled, (state, action) => {
        state.loading = false;
        state.siniestros = action.payload;
      })
      .addCase(getSiniestros.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Error al obtener los siniestros';
      })

      // Crear siniestro
      .addCase(addSiniestro.fulfilled, (state, action) => {
        state.siniestros.push(action.payload);
      })
      .addCase(addSiniestro.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Error al crear el siniestro';
      })

      // Editar siniestro
      .addCase(editSiniestro.fulfilled, (state, action) => {
        const index = state.siniestros.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.siniestros[index] = action.payload;
        }
      })
      .addCase(editSiniestro.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Error al actualizar el siniestro';
      })

      // Eliminar siniestro
      .addCase(removeSiniestro.fulfilled, (state, action) => {
        state.siniestros = state.siniestros.filter(s => s.id !== action.payload);
      })
      .addCase(removeSiniestro.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Error al eliminar el siniestro';
      })

      // Crear evento
      .addCase(addEvento.fulfilled, (state, action) => {
        const siniestroId = action.payload.siniestro_id;
        if (!state.eventos[siniestroId]) state.eventos[siniestroId] = [];
        state.eventos[siniestroId].push(action.payload);
      })
      .addCase(addEvento.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Error al crear el evento';
      })

      // Obtener eventos por siniestro
      .addCase(getEventosBySiniestro.fulfilled, (state, action) => {
        state.eventos[action.meta.arg] = action.payload;
      })
      .addCase(getEventosBySiniestro.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Error al obtener los eventos del siniestro';
      });
  },
});

export default siniestrosSlice.reducer;
