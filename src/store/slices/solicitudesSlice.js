// src/store/slices/solicitudesSlice.js
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
// 🚀 IMPORTAMOS LA INSTANCIA SEGURA PARA EVITAR EL 401
import api from '../../services/api';

// 🚀 IMPORTAMOS FETCH DE CLIENTES PARA RECARGARLOS AL CREAR
import { fetchClientes } from './clientesSlice';

/**
 * THUNKS BLINDADOS
 * Todos usan la instancia 'api' que inyecta automáticamente el Token JWT.
 *
 * 🧹 LIMPIEZA: se quitaron los thunks que NINGÚN componente usaba y cuyos
 *    endpoints ya no existen en el backend:
 *      emitirConstancia, convertirSolicitud, cancelarSolicitud, fetchResumen
 *      y el crear "simple" (crearSolicitud).
 *    El flujo real es crear-completo + listar + terminar.
 *
 *    Se DEJAN el estado `resumen` y el selector `selectSolicitudesResumen`
 *    (en 0) por compatibilidad, por si algún componente los lee. Si confirmás
 *    que nadie los usa, se pueden borrar también.
 */

export const fetchSolicitudes = createAsyncThunk(
  'solicitudes/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/solicitudes/', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 🚀 CREACIÓN COMPLETA (Cliente + Póliza + Solicitud en una sola llamada)
export const crearSolicitudCompleta = createAsyncThunk(
  'solicitudes/crearCompleta',
  async (body, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.post('/solicitudes/crear-completo/', body);

      // Apenas se crea, recargamos las listas para que aparezca al instante
      dispatch(fetchSolicitudes());
      dispatch(fetchClientes());

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialResumen = {
  por_asegurar: 0,
  vigentes_24h: 0,
  vencidas: 0,
  convertidas: 0,
  total: 0,
};

const solicitudesSlice = createSlice({
  name: 'solicitudes',
  initialState: {
    items: [],
    resumen: initialResumen, // compat: por si un componente lo lee
    status: 'idle',          // carga de lista
    creating: false,         // estado para el modal de creación
    error: null,
  },
  reducers: {
    resetSolicitudesError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 📝 listar
      .addCase(fetchSolicitudes.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSolicitudes.fulfilled, (state, { payload }) => {
        state.status = 'succeeded';
        // Soporta respuesta paginada o array plano
        state.items = payload.results || payload || [];
      })
      .addCase(fetchSolicitudes.rejected, (state, { payload }) => {
        state.status = 'failed';
        state.error = payload;
      })

      // 🚀 crear completa
      .addCase(crearSolicitudCompleta.pending, (state) => {
        state.creating = true;
      })
      .addCase(crearSolicitudCompleta.fulfilled, (state) => {
        state.creating = false;
        // No agregamos el item acá: el thunk ya despachó fetchSolicitudes()
      })
      .addCase(crearSolicitudCompleta.rejected, (state) => {
        state.creating = false;
      });
  },
});

// Selectores
export const selectSolicitudes = (state) => state.solicitudes.items;
export const selectSolicitudesStatus = (state) => state.solicitudes.status;
export const selectSolicitudesResumen = (state) => state.solicitudes.resumen; // compat
export const selectIsCreatingSolicitud = (state) => state.solicitudes.creating;

export const { resetSolicitudesError } = solicitudesSlice.actions;

export default solicitudesSlice.reducer;