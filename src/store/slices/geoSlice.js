// src/store/slices/geoSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// 🌐 Gestión dinámica de la URL desde la variable de entorno
const BASE_URL = import.meta.env.VITE_API_URL;

// ──────── OBTENER TODOS LOS GEOITEMS ────────
export const fetchGeoItems = createAsyncThunk(
  'geo/fetchGeoItems',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${BASE_URL}geoitems/`);
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || 'Error al obtener los geoitems'
      );
    }
  }
);

// ──────── CREAR UN GEOITEM ────────
export const createGeoItem = createAsyncThunk(
  'geo/createGeoItem',
  async (item, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}geoitems/`, item);
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || 'Error al crear el geoitem'
      );
    }
  }
);

const initialState = {
  list: [],
  status: 'idle',
  error: null,
};

const geoSlice = createSlice({
  name: 'geo',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Obtener geoitems
      .addCase(fetchGeoItems.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchGeoItems.fulfilled, (state, action) => {
        state.status = 'succeeded';

        const payload = action.payload;
        let data = [];

        // Si viene paginado: { results: [...] }
        if (Array.isArray(payload)) {
          data = payload;
        } else if (payload && Array.isArray(payload.results)) {
          data = payload.results;
        } else if (payload && typeof payload === 'object') {
          // Último recurso: convertir objeto en array
          data = Object.values(payload);
        }

        state.list = data;
      })
      .addCase(fetchGeoItems.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al obtener los geoitems';
      })

      // Crear geoitem
      .addCase(createGeoItem.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createGeoItem.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (!Array.isArray(state.list)) {
          state.list = [];
        }
        state.list.push(action.payload);
      })
      .addCase(createGeoItem.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al crear el geoitem';
      });
  },
});

export default geoSlice.reducer;
