import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL; // ej: "https://tu-api/"

// =============== THUNKS ===============

// GET solo datos (opcionalmente por fecha YYYY-MM-DD)
export const fetchBalanceDiario = createAsyncThunk(
  "balance/fetchDiario",
  async ({ fecha } = {}, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${BASE_URL}balance-diario/`, {
        params: fecha ? { fecha } : {},
      });
      return res.data;
    } catch (err) {
      const msg = err?.response?.data?.detail || "Error al obtener el balance diario";
      return rejectWithValue(msg);
    }
  }
);

// POST: enviar por WhatsApp (opcional: { fecha, destinatario })
export const enviarBalanceWhatsapp = createAsyncThunk(
  "balance/enviarWhatsapp",
  async ({ fecha, destinatario } = {}, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}balance-diario/enviar/`, {
        ...(fecha ? { fecha } : {}),
        ...(destinatario ? { destinatario } : {}),
      });
      return res.data; // {detail, info, data}
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        "No se pudo enviar el balance por WhatsApp";
      return rejectWithValue(msg);
    }
  }
);

// =============== SLICE ===============
const initialState = {
  // datos del balance diario (GET)
  data: null,
  status: "idle",
  error: null,

  // envío por WhatsApp (POST)
  envioStatus: "idle",
  envioError: null,
  mensajeEnviado: null,
};

const balanceSlice = createSlice({
  name: "balance",
  initialState,
  reducers: {
    clearEnvioState: (state) => {
      state.envioStatus = "idle";
      state.envioError = null;
      state.mensajeEnviado = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- GET datos ---
      .addCase(fetchBalanceDiario.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchBalanceDiario.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload;
      })
      .addCase(fetchBalanceDiario.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error?.message || "Error desconocido";
      })

      // --- POST enviar ---
      .addCase(enviarBalanceWhatsapp.pending, (state) => {
        state.envioStatus = "loading";
        state.envioError = null;
        state.mensajeEnviado = null;
      })
      .addCase(enviarBalanceWhatsapp.fulfilled, (state, action) => {
        state.envioStatus = "succeeded";
        state.mensajeEnviado = action.payload?.detail || "Balance enviado correctamente";
      })
      .addCase(enviarBalanceWhatsapp.rejected, (state, action) => {
        state.envioStatus = "failed";
        state.envioError = action.payload || action.error?.message || "Error desconocido";
      });
  },
});

export const { clearEnvioState } = balanceSlice.actions;
export default balanceSlice.reducer;
