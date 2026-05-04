// src/store/slices/siniestrosSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL;

// ──────── SINIESTROS ────────

export const getSiniestros = createAsyncThunk('siniestros/getSiniestros', async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const response = await axios.get(`${BASE_URL}siniestros/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.results || response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al obtener los siniestros');
  }
});

export const addSiniestro = createAsyncThunk('siniestros/addSiniestro', async (siniestro, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const response = await axios.post(`${BASE_URL}siniestros/`, siniestro, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.results || response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al crear el siniestro');
  }
});

export const editSiniestro = createAsyncThunk('siniestros/editSiniestro', async ({ id, siniestro }, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const response = await axios.put(`${BASE_URL}siniestros/${id}/`, siniestro, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.results || response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al actualizar el siniestro');
  }
});

export const removeSiniestro = createAsyncThunk('siniestros/removeSiniestro', async (id, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    await axios.delete(`${BASE_URL}siniestros/${id}/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return id;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al eliminar el siniestro');
  }
});

// 🚀 RUTA CORREGIDA PARA EVENTOS
export const addEvento = createAsyncThunk('siniestros/addEvento', async (evento, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    // El backend ahora usa /eventos/ gracias al router
    const response = await axios.post(`${BASE_URL}eventos/`, evento, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.results || response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al crear el evento del siniestro');
  }
});

export const getEventosBySiniestro = createAsyncThunk('siniestros/getEventosBySiniestro', async (siniestroId, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const response = await axios.get(`${BASE_URL}siniestros/${siniestroId}/eventos/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
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