/* src/store/slices/tareasSlice.js */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = (import.meta.env.VITE_API_URL || "/api/").replace(/\/+$/, "");

const getToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("token") ||
  localStorage.getItem("jwt");

const authHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

export const fetchTareasDia = createAsyncThunk(
  "tareas/fetchDia",
  async (params = {}, { rejectWithValue }) => {
    try {
      const q = new URLSearchParams();
      if (params.dias) q.set("dias", params.dias);
      if (params.oficina) q.set("oficina", params.oficina);
      const qs = q.toString() ? `?${q.toString()}` : "";
      const res = await axios.get(`${BASE_URL}/tareas/dia/${qs}`, authHeaders());
      return res.data;
    } catch (e) {
      return rejectWithValue(e?.response?.data?.detail || "No se pudieron cargar las tareas.");
    }
  }
);

export const marcarPolizaEnviada = createAsyncThunk(
  "tareas/marcarEnviada",
  async (polizaId, { rejectWithValue }) => {
    try {
      await axios.post(`${BASE_URL}/tareas/marcar-enviada/`, { poliza_id: polizaId }, authHeaders());
      return polizaId;
    } catch (e) {
      return rejectWithValue(e?.response?.data?.detail || "No se pudo marcar.");
    }
  }
);

// 🆕 Registra una tarea completada (para el reporte diario). Fire-and-forget.
export const registrarTareaCompletada = createAsyncThunk(
  "tareas/registrarCompletada",
  async ({ tipo, poliza_id = null, cliente_id = null }, { rejectWithValue }) => {
    try {
      await axios.post(
        `${BASE_URL}/tareas/registrar-completada/`,
        { tipo, poliza_id, cliente_id },
        authHeaders()
      );
      return true;
    } catch (e) {
      return rejectWithValue("No se pudo registrar la tarea.");
    }
  }
);

const tareasSlice = createSlice({
  name: "tareas",
  initialState: { data: null, loading: false, error: null, marcando: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTareasDia.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchTareasDia.fulfilled, (s, a) => { s.loading = false; s.data = a.payload; })
      .addCase(fetchTareasDia.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(marcarPolizaEnviada.pending, (s, a) => { s.marcando = a.meta.arg; })
      .addCase(marcarPolizaEnviada.fulfilled, (s, a) => {
        s.marcando = null;
        if (s.data) {
          const pid = a.payload;
          s.data.enviar_poliza = (s.data.enviar_poliza || []).filter((p) => p.poliza_id !== pid);
          s.data.total = Math.max(0, (s.data.total || 0) - 1);
        }
      })
      .addCase(marcarPolizaEnviada.rejected, (s) => { s.marcando = null; });
  },
});

export default tareasSlice.reducer;