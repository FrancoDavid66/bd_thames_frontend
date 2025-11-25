// src/store/solicitudesSlice.js
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { solicitudesApi } from '../../services/solicitudes';

export const fetchSolicitudes = createAsyncThunk('solicitudes/fetchAll', async () => {
  return await solicitudesApi.listar();
});

export const fetchResumen = createAsyncThunk('solicitudes/fetchResumen', async () => {
  return await solicitudesApi.resumen();
});

export const crearSolicitud = createAsyncThunk('solicitudes/crear', async (body) => {
  return await solicitudesApi.crear(body);
});

export const emitirConstancia = createAsyncThunk('solicitudes/emitirConstancia', async (id) => {
  return await solicitudesApi.emitirConstancia(id);
});

export const convertirSolicitud = createAsyncThunk('solicitudes/convertir', async ({ id, poliza_id }) => {
  return await solicitudesApi.convertir(id, poliza_id);
});

export const cancelarSolicitud = createAsyncThunk('solicitudes/cancelar', async (id) => {
  return await solicitudesApi.cancelar(id);
});

const initialResumen = { por_asegurar: 0, vigentes_24h: 0, vencidas: 0, convertidas: 0, total: 0 };

const solicitudesSlice = createSlice({
  name: 'solicitudes',
  initialState: {
    items: [],
    resumen: initialResumen,
    status: 'idle',       // carga de lista
    resumenStatus: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // listar
      .addCase(fetchSolicitudes.pending, (st) => { st.status = 'loading'; st.error = null; })
      .addCase(fetchSolicitudes.fulfilled, (st, { payload }) => { st.status = 'succeeded'; st.items = payload || []; })
      .addCase(fetchSolicitudes.rejected, (st, { error }) => { st.status = 'failed'; st.error = error.message; })

      // resumen
      .addCase(fetchResumen.pending, (st) => { st.resumenStatus = 'loading'; })
      .addCase(fetchResumen.fulfilled, (st, { payload }) => { st.resumenStatus = 'succeeded'; st.resumen = payload || initialResumen; })
      .addCase(fetchResumen.rejected, (st) => { st.resumenStatus = 'failed'; })

      // crear
      .addCase(crearSolicitud.fulfilled, (st, { payload }) => {
        if (payload) st.items = [payload, ...st.items];
      })

      // emitir (reemplaza item)
      .addCase(emitirConstancia.fulfilled, (st, { payload }) => {
        if (!payload) return;
        st.items = st.items.map((x) => (x.id === payload.id ? payload : x));
      })

      // convertir
      .addCase(convertirSolicitud.fulfilled, (st, { payload }) => {
        if (!payload) return;
        st.items = st.items.map((x) => (x.id === payload.id ? payload : x));
      })

      // cancelar
      .addCase(cancelarSolicitud.fulfilled, (st, { payload }) => {
        if (!payload) return;
        st.items = st.items.map((x) => (x.id === payload.id ? payload : x));
      });
  },
});

export const selectSolicitudes = (st) => st.solicitudes.items;
export const selectSolicitudesStatus = (st) => st.solicitudes.status;
export const selectSolicitudesResumen = (st) => st.solicitudes.resumen;

export default solicitudesSlice.reducer;
