// src/store/slices/propiedadesSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// 🌐 Gestión dinámica de la URL desde la variable de entorno
const BASE_URL = import.meta.env.VITE_API_URL;

// ──────── PROPIEDADES ────────

// Obtener todas las propiedades
export const fetchPropiedades = createAsyncThunk('propiedades/fetchPropiedades', async (_, { rejectWithValue }) => {
  try {
    const res = await axios.get(`${BASE_URL}propiedades/`);
    return res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al obtener las propiedades');
  }
});

// Crear una nueva propiedad
export const createPropiedad = createAsyncThunk('propiedades/createPropiedad', async (data, { rejectWithValue }) => {
  try {
    const res = await axios.post(`${BASE_URL}propiedades/`, data);
    return res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al crear la propiedad');
  }
});

// Actualizar una propiedad existente
export const updatePropiedad = createAsyncThunk('propiedades/updatePropiedad', async (data, { rejectWithValue }) => {
  try {
    const res = await axios.put(`${BASE_URL}propiedades/${data.id}/`, data);
    return res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al actualizar la propiedad');
  }
});

// Eliminar una propiedad
export const deletePropiedad = createAsyncThunk('propiedades/deletePropiedad', async (id, { rejectWithValue }) => {
  try {
    await axios.delete(`${BASE_URL}propiedades/${id}/`);
    return id;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Error al eliminar la propiedad');
  }
});

const propiedadesSlice = createSlice({
  name: 'propiedades',
  initialState: {
    list: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Obtener propiedades
      .addCase(fetchPropiedades.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPropiedades.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchPropiedades.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al obtener las propiedades';
      })

      // Crear propiedad
      .addCase(createPropiedad.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      .addCase(createPropiedad.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al crear la propiedad';
      })

      // Actualizar propiedad
      .addCase(updatePropiedad.fulfilled, (state, action) => {
        const index = state.list.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      .addCase(updatePropiedad.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al actualizar la propiedad';
      })

      // Eliminar propiedad
      .addCase(deletePropiedad.fulfilled, (state, action) => {
        state.list = state.list.filter(p => p.id !== action.payload);
      })
      .addCase(deletePropiedad.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al eliminar la propiedad';
      });
  },
});

export default propiedadesSlice.reducer;
