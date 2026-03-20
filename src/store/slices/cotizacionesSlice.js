import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token"); 
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchCotizaciones = createAsyncThunk(
  'cotizaciones/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${BASE_URL}cotizaciones/`, {
        headers: getAuthHeaders()
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error al obtener cotizaciones');
    }
  }
);

export const createCotizacion = createAsyncThunk(
  'cotizaciones/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}cotizaciones/`, data, {
        headers: getAuthHeaders()
      });
      toast.success('Cotización creada correctamente.');
      return res.data;
    } catch (error) {
      toast.error('Error al crear cotización.');
      return rejectWithValue(error.response?.data);
    }
  }
);

export const updateCotizacion = createAsyncThunk(
  'cotizaciones/update',
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.put(`${BASE_URL}cotizaciones/${data.id}/`, data, {
        headers: getAuthHeaders()
      });
      toast.success('Cotización actualizada correctamente.');
      return res.data;
    } catch (error) {
      toast.error('Error al actualizar cotización.');
      return rejectWithValue(error.response?.data);
    }
  }
);

export const deleteCotizacion = createAsyncThunk(
  'cotizaciones/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${BASE_URL}cotizaciones/${id}/`, {
        headers: getAuthHeaders()
      });
      toast.success('Cotización eliminada.');
      return id;
    } catch (error) {
      toast.error('Error al eliminar cotización.');
      return rejectWithValue(error.response?.data);
    }
  }
);

const cotizacionesSlice = createSlice({
  name: 'cotizaciones',
  initialState: {
    list: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCotizaciones.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchCotizaciones.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload.results || action.payload;
      })
      .addCase(fetchCotizaciones.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createCotizacion.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      .addCase(updateCotizacion.fulfilled, (state, action) => {
        const index = state.list.findIndex(c => c.id === action.payload.id);
        if (index !== -1) state.list[index] = action.payload;
      })
      .addCase(deleteCotizacion.fulfilled, (state, action) => {
        state.list = state.list.filter(c => c.id !== action.payload);
      });
  },
});

export default cotizacionesSlice.reducer;