import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL;

/**
 * 🔐 Función auxiliar para obtener el token del almacenamiento local.
 */
const getAuthHeaders = () => {
  // 🚀 ¡CORREGIDO! Ahora busca el nombre exacto que está en tu consola
  const token = localStorage.getItem("access_token"); 
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// 🚀 PARCHE: Obtener ingresos soportando filtro de oficina y paginación
export const fetchIngresos = createAsyncThunk(
  'ingresos/fetch',
  async (params = {}, { rejectWithValue }) => {
    const page      = params.page || 1;
    const oficina   = (params.oficina !== undefined && params.oficina !== null) ? params.oficina : '';
    const page_size = params.page_size || 500;
    try {
      const queryParams = { page, page_size };
      if (oficina)       queryParams.oficina    = oficina;
      if (params.desde)  queryParams.fecha__gte = params.desde;
      if (params.hasta)  queryParams.fecha__lte = params.hasta;
      const res = await axios.get(`${BASE_URL}ingresos/`, {
        params: queryParams,
        headers: getAuthHeaders()
      });
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
      const res = await axios.post(`${BASE_URL}ingresos/`, data, {
        headers: getAuthHeaders() // 🔑 Agregamos seguridad
      });
      toast.success('Ingreso creado correctamente.');
      return res.data;
    } catch (error) {
      const status = error.response?.status;
      const backendData = error.response?.data;

      // 🔍 Log detallado para ver EXACTAMENTE qué se queja el backend
      console.error('Error al crear el ingreso /api/ingresos/:', {
        status,
        data: backendData,
      });

      let message = 'Error al crear el ingreso';
      if (backendData && typeof backendData === 'object') {
        const detalles = Object.entries(backendData)
          .map(([field, msgs]) => {
            if (Array.isArray(msgs)) {
              return `${field}: ${msgs.join(' | ')}`;
            }
            return `${field}: ${msgs}`;
          })
          .join(' — ');
        if (detalles) {
          message = `Error al crear el ingreso: ${detalles}`;
        }
      }

      toast.error(message);
      return rejectWithValue(backendData || message);
    }
  }
);

// Actualizar un ingreso existente
export const updateIngreso = createAsyncThunk(
  'ingresos/update',
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.put(`${BASE_URL}ingresos/${data.id}/`, data, {
        headers: getAuthHeaders() // 🔑 Agregamos seguridad
      });
      toast.success('Ingreso actualizado correctamente.');
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Error al actualizar el ingreso'
      );
    }
  }
);

// Eliminar un ingreso
export const deleteIngreso = createAsyncThunk(
  'ingresos/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${BASE_URL}ingresos/${id}/`, {
        headers: getAuthHeaders() // 🔑 Agregamos seguridad
      });
      toast.success('Ingreso eliminado correctamente.');
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Error al eliminar el ingreso'
      );
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
        state.currentPage = action.meta?.arg?.page || 1;
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
        const index = state.list.findIndex(
          (i) => i.id === action.payload.id
        );
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
        state.list = state.list.filter((i) => i.id !== action.payload);
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(deleteIngreso.rejected, (state, action) => {
        state.status = 'failed';
        state.error =
          action.payload || 'Error al eliminar el ingreso';
      });
  },
});

export default ingresosSlice.reducer;