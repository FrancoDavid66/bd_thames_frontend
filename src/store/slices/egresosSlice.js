import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// 🌐 URL base desde env
const BASE_URL = import.meta.env.VITE_API_URL;

// ──────── THUNKS (EGRESOS) ────────

// Obtener egresos paginados
export const fetchEgresos = createAsyncThunk(
  'egresos/fetch',
  // 👇 si se llama sin args, igual funciona y adentro usamos page=1
  async ({ page = 1 } = {}, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${BASE_URL}egresos/`, { params: { page } });
      return res.data; // { results, count, next, previous }
    } catch (error) {
      console.error('Error al obtener los egresos:', error?.response?.data || error?.message);
      return rejectWithValue(error?.response?.data?.message || 'Error al obtener los egresos');
    }
  }
);

// Crear un nuevo egreso
export const createEgreso = createAsyncThunk(
  'egresos/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}egresos/`, data);
      toast.success('Egreso creado correctamente.');
      return res.data;
    } catch (error) {
      console.error('Error al crear el egreso:', error?.response?.data || error?.message);
      return rejectWithValue(error?.response?.data?.message || 'Error al crear el egreso');
    }
  }
);

// Actualizar un egreso
export const updateEgreso = createAsyncThunk(
  'egresos/update',
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.put(`${BASE_URL}egresos/${data.id}/`, data);
      toast.success('Egreso actualizado correctamente.');
      return res.data;
    } catch (error) {
      console.error('Error al actualizar el egreso:', error?.response?.data || error?.message);
      return rejectWithValue(error?.response?.data?.message || 'Error al actualizar el egreso');
    }
  }
);

// Eliminar un egreso
export const deleteEgreso = createAsyncThunk(
  'egresos/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${BASE_URL}egresos/${id}/`);
      toast.success('Egreso eliminado correctamente.');
      return id;
    } catch (error) {
      if (error?.response?.status === 404) {
        return rejectWithValue(`El egreso con ID ${id} no existe.`);
      }
      return rejectWithValue(error?.response?.data?.message || 'Error al eliminar el egreso');
    }
  }
);

// ──────── SLICE ────────
const initialState = {
  list: [],
  status: 'idle',
  error: null,
  next: null,
  previous: null,
  count: 0,
  currentPage: 1,
};

const egresosSlice = createSlice({
  name: 'egresos',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // --- Obtener egresos ---
      .addCase(fetchEgresos.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchEgresos.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const payload = action.payload || {};
        state.list = payload.results ?? [];
        state.next = payload.next ?? null;
        state.previous = payload.previous ?? null;
        state.count = payload.count ?? 0;
        // ✅ meta.arg puede ser undefined si se llamó sin args → usar optional chaining
        const pageArg = action.meta?.arg?.page ?? 1;
        state.currentPage = pageArg;
        state.error = null;
      })
      .addCase(fetchEgresos.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al obtener los egresos';
      })

      // --- Crear egreso ---
      .addCase(createEgreso.fulfilled, (state, action) => {
        // insertamos en la lista actual (página visible)
        state.list = [action.payload, ...state.list];
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(createEgreso.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al crear el egreso';
      })

      // --- Actualizar egreso ---
      .addCase(updateEgreso.fulfilled, (state, action) => {
        const idx = state.list.findIndex((e) => e.id === action.payload?.id);
        if (idx !== -1) state.list[idx] = action.payload;
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(updateEgreso.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al actualizar el egreso';
      })

      // --- Eliminar egreso ---
      .addCase(deleteEgreso.fulfilled, (state, action) => {
        state.list = state.list.filter((e) => e.id !== action.payload);
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(deleteEgreso.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al eliminar el egreso';
      });
  },
});

export default egresosSlice.reducer;
