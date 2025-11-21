import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// 🌐 Gestión dinámica de la URL según el entorno
const BASE_URL = import.meta.env.MODE === 'production'
  ? 'https://web-production-a2f85.up.railway.app/api/alquileres/'
  : 'http://localhost:8000/api/alquileres/';

// ──────── ALQUILERES ────────
export const fetchAlquileres = createAsyncThunk('alquileres/fetchAlquileres', async () => {
  const res = await axios.get(`${BASE_URL}`);
  return res.data;
});

export const createAlquiler = createAsyncThunk('alquileres/createAlquiler', async (data) => {
  const res = await axios.post(`${BASE_URL}`, data);
  return res.data;
});

export const updateAlquiler = createAsyncThunk('alquileres/updateAlquiler', async (data) => {
  const res = await axios.put(`${BASE_URL}${data.id}/`, data);
  return res.data;
});

export const deleteAlquiler = createAsyncThunk('alquileres/deleteAlquiler', async (id) => {
  await axios.delete(`${BASE_URL}${id}/`);
  return id;
});

// ──────── PROPIETARIOS ────────
export const fetchPropietarios = createAsyncThunk('alquileres/fetchPropietarios', async () => {
  const res = await axios.get(`${BASE_URL}propietarios/`);
  return res.data;
});

export const createPropietario = createAsyncThunk('alquileres/createPropietario', async (data) => {
  const res = await axios.post(`${BASE_URL}propietarios/`, data);
  return res.data;
});

// ──────── INQUILINOS ────────
export const fetchInquilinos = createAsyncThunk('alquileres/fetchInquilinos', async () => {
  const res = await axios.get(`${BASE_URL}inquilinos/`);
  return res.data;
});

export const createInquilino = createAsyncThunk('alquileres/createInquilino', async (data) => {
  const res = await axios.post(`${BASE_URL}inquilinos/`, data);
  return res.data;
});

// ──────── GARANTES ────────
export const fetchGarantes = createAsyncThunk('alquileres/fetchGarantes', async () => {
  const res = await axios.get(`${BASE_URL}garantes/`);
  return res.data;
});

export const createGarante = createAsyncThunk('alquileres/createGarante', async (data) => {
  const res = await axios.post(`${BASE_URL}garantes/`, data);
  return res.data;
});

const alquileresSlice = createSlice({
  name: 'alquileres',
  initialState: {
    list: [],
    status: 'idle',
    error: null,

    propietarios: [],
    propietariosStatus: 'idle',

    inquilinos: [],
    inquilinosStatus: 'idle',

    garantes: [],
    garantesStatus: 'idle',
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // ─── ALQUILERES ───
      .addCase(fetchAlquileres.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAlquileres.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchAlquileres.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(createAlquiler.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(updateAlquiler.fulfilled, (state, action) => {
        const index = state.list.findIndex((a) => a.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      .addCase(deleteAlquiler.fulfilled, (state, action) => {
        state.list = state.list.filter((a) => a.id !== action.payload);
      })

      // ─── PROPIETARIOS ───
      .addCase(fetchPropietarios.pending, (state) => {
        state.propietariosStatus = 'loading';
      })
      .addCase(fetchPropietarios.fulfilled, (state, action) => {
        state.propietariosStatus = 'succeeded';
        state.propietarios = action.payload;
      })
      .addCase(fetchPropietarios.rejected, (state) => {
        state.propietariosStatus = 'failed';
      })
      .addCase(createPropietario.fulfilled, (state, action) => {
        state.propietarios.push(action.payload);
      })

      // ─── INQUILINOS ───
      .addCase(fetchInquilinos.pending, (state) => {
        state.inquilinosStatus = 'loading';
      })
      .addCase(fetchInquilinos.fulfilled, (state, action) => {
        state.inquilinosStatus = 'succeeded';
        state.inquilinos = action.payload;
      })
      .addCase(fetchInquilinos.rejected, (state) => {
        state.inquilinosStatus = 'failed';
      })
      .addCase(createInquilino.fulfilled, (state, action) => {
        state.inquilinos.push(action.payload);
      })

      // ─── GARANTES ───
      .addCase(fetchGarantes.pending, (state) => {
        state.garantesStatus = 'loading';
      })
      .addCase(fetchGarantes.fulfilled, (state, action) => {
        state.garantesStatus = 'succeeded';
        state.garantes = action.payload;
      })
      .addCase(fetchGarantes.rejected, (state) => {
        state.garantesStatus = 'failed';
      })
      .addCase(createGarante.fulfilled, (state, action) => {
        state.garantes.push(action.payload);
      });
  },
});

export default alquileresSlice.reducer;
