// src/store/slices/cuponesRoboSlice.js
//
// 🆕 MODELO NUEVO (simplificado): el cliente paga la cuponera directo a la
// compañía y nosotros solo registramos que pagó (estado PAGADA + comprobante
// opcional). Sin montos, comisiones ni emails.
//
// Este slice quedó reducido a lo que la app usa de verdad:
//   - actualizarEstadoCuponRobo → marca pagado (sección Cuponeras).
//   - fetchCuponerasCounters     → contador para el badge de la campana (Header).
// Los thunks viejos (fetchCuponesRobo, fetchAllCuponeras, createCuponRobo) se
// eliminaron porque ya nadie los llama.
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import toast from "react-hot-toast";

/** Base URL robusta (igual que polizasSlice):
 * - Usa VITE_API_URL o VITE_API_BASE si existen
 * - Si no, cae a '/api/'
 * - Garantiza la barra final
 */
const RAW_BASE = (
  import.meta.env?.VITE_API_URL ||
  import.meta.env?.VITE_API_BASE ||
  "/api/"
)
  .toString()
  .trim();
const BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;

const http = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

// 🚀 Interceptor para inyectar el token JWT en cada petición
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('jwt');
  if (token && token !== "undefined" && token !== "null") {
    config.headers.Authorization = `Bearer ${token.trim()}`;
  }
  return config;
});

/* ============ THUNKS ============ */

// 🔹 GET counters /polizas/cupones-robo/counters/
// Lo usa el Header para el badge de la campana (cuántas cuponeras vencidas hay).
export const fetchCuponerasCounters = createAsyncThunk(
  "cuponesRobo/fetchCounters",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const res = await http.get("polizas/cupones-robo/counters/", {
        params: filters,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data || "Error al obtener los contadores de cuponeras"
      );
    }
  }
);

// PATCH /polizas/cupones-robo/{id}/
// Marca el estado del cupón (PENDIENTE/PAGADA) y, opcionalmente, guarda el
// COMPROBANTE de pago (Pago Fácil / Mercado Pago) en comprobante_url.
// Sin plata: es puro seguimiento de "pagó / no pagó".
export const actualizarEstadoCuponRobo = createAsyncThunk(
  "cuponesRobo/updateEstado",
  async (
    { id, polizaId, estado, comprobante_url, comprobante_public_id },
    { rejectWithValue }
  ) => {
    try {
      const payload = { estado: (estado || "").toUpperCase() };
      if (comprobante_url) payload.comprobante_url = comprobante_url;
      if (comprobante_public_id) payload.comprobante_public_id = comprobante_public_id;

      const res = await http.patch(`polizas/cupones-robo/${id}/`, payload);
      const cupon = res.data;

      return { polizaId, cupon };
    } catch (err) {
      return rejectWithValue(
        err?.response?.data || "Error al actualizar estado del cupón"
      );
    }
  }
);

/* ============ SLICE ============ */

const cuponesRoboSlice = createSlice({
  name: "cuponesRobo",
  initialState: {
    updatingById: {}, // cuponId -> bool
    loadingCounters: false,
    stats: null, // { total, pendientes, por_vencer_7, vencidas, hoy, hasta }
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // ---- fetchCuponerasCounters (badge de la campana) ----
      .addCase(fetchCuponerasCounters.pending, (state) => {
        state.loadingCounters = true;
      })
      .addCase(fetchCuponerasCounters.fulfilled, (state, action) => {
        state.loadingCounters = false;
        state.stats = action.payload || null;
      })
      .addCase(fetchCuponerasCounters.rejected, (state, action) => {
        state.loadingCounters = false;
        state.error =
          action.payload || "No se pudieron obtener los contadores de cuponeras.";
        // sin toast: corre en background (polling), no molestamos al usuario
        console.warn("[CuponesRobo] Error en fetchCuponerasCounters", action.payload);
      })

      // ---- actualizarEstadoCuponRobo ----
      .addCase(actualizarEstadoCuponRobo.pending, (state, action) => {
        const { id } = action.meta.arg;
        state.updatingById[id] = true;
        state.error = null;
      })
      .addCase(actualizarEstadoCuponRobo.fulfilled, (state, action) => {
        const { cupon } = action.payload;
        if (cupon?.id != null) state.updatingById[cupon.id] = false;
        toast.success("Estado del cupón actualizado.");
      })
      .addCase(actualizarEstadoCuponRobo.rejected, (state, action) => {
        const { id } = action.meta.arg;
        state.updatingById[id] = false;
        state.error =
          action.payload || "No se pudo actualizar el estado del cupón.";
        toast.error("Error al actualizar el cupón de robo.");
      });
  },
});

export default cuponesRoboSlice.reducer;