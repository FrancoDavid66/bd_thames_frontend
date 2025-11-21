import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL;

// Obtener todos los ingresos con paginación
export const fetchIngresos = createAsyncThunk(
  'ingresos/fetch',
  async (params = {}, { rejectWithValue }) => {
    const page = params.page || 1;
    try {
      const res = await axios.get(`${BASE_URL}ingresos/?page=${page}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error al obtener los ingresos');
    }
  }
);

// Crear un nuevo ingreso
export const createIngreso = createAsyncThunk(
  'ingresos/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}ingresos/`, data);
      toast.success('Ingreso creado correctamente.');
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error al crear el ingreso');
    }
  }
);

// Actualizar un ingreso existente
export const updateIngreso = createAsyncThunk(
  'ingresos/update',
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.put(`${BASE_URL}ingresos/${data.id}/`, data);
      toast.success('Ingreso actualizado correctamente.');
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar el ingreso');
    }
  }
);

// Eliminar un ingreso
export const deleteIngreso = createAsyncThunk(
  'ingresos/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${BASE_URL}ingresos/${id}/`);
      toast.success('Ingreso eliminado correctamente.');
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al eliminar el ingreso');
    }
  }
);

const ingresosSlice = createSlice({
  name: 'ingresos',
  initialState: {
    list: [],
    status: 'idle',
    error: null,
    next: null,
    previous: null,
    count: 0,
    currentPage: 1,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIngresos.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchIngresos.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload.results || action.payload;
        state.next = action.payload.next;
        state.previous = action.payload.previous;
        state.count = action.payload.count;
        state.currentPage = (action.meta?.arg?.page) || 1;
        state.error = null;
      })
      .addCase(fetchIngresos.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al obtener los ingresos';
      })
      // Crear ingreso
      .addCase(createIngreso.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(createIngreso.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al crear el ingreso';
      })
      // Actualizar ingreso
      .addCase(updateIngreso.fulfilled, (state, action) => {
        const index = state.list.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(updateIngreso.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al actualizar el ingreso';
      })
      // Eliminar ingreso
      .addCase(deleteIngreso.fulfilled, (state, action) => {
        state.list = state.list.filter(i => i.id !== action.payload);
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(deleteIngreso.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al eliminar el ingreso';
      });
  },
});

export default ingresosSlice.reducer;
