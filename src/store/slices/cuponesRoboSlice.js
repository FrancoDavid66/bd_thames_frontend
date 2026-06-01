// src/store/slices/cuponesRoboSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import toast from "react-hot-toast";
import { sendAdminCuponRoboPagado } from "../../services/notifications/cuponesRobo";

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

// 🚀 FIX: INTERCEPTOR PARA INYECTAR EL TOKEN JWT EN CADA PETICIÓN
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('jwt');
  if (token && token !== "undefined" && token !== "null") {
    config.headers.Authorization = `Bearer ${token.trim()}`;
  }
  return config;
});

/* ============ THUNKS ============ */

// GET /polizas/cupones-robo/?poliza=<id>
export const fetchCuponesRobo = createAsyncThunk(
  "cuponesRobo/fetchByPoliza",
  async (polizaId, { rejectWithValue }) => {
    try {
      const res = await http.get("polizas/cupones-robo/", {
        params: { poliza: polizaId },
      });
      const data = res.data;
      const cupones = Array.isArray(data) ? data : data?.results || [];
      return { polizaId, cupones };
    } catch (err) {
      return rejectWithValue(
        err?.response?.data || "Error al obtener cupones de robo"
      );
    }
  }
);

// 🔹 GET global /polizas/cupones-robo/ (sin poliza o con filtros)
export const fetchAllCuponeras = createAsyncThunk(
  "cuponesRobo/fetchAll",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const res = await http.get("polizas/cupones-robo/", {
        params: filters,
      });
      const data = res.data;
      const cupones = Array.isArray(data) ? data : data?.results || [];
      return cupones;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data || "Error al obtener las cuponeras de robo"
      );
    }
  }
);

// 🔹 GET counters /polizas/cupones-robo/counters/
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

// POST /polizas/cupones-robo/
export const createCuponRobo = createAsyncThunk(
  "cuponesRobo/create",
  async (
    { polizaId, periodo_desde, periodo_hasta, estado = "PENDIENTE" },
    { rejectWithValue }
  ) => {
    try {
      const payload = {
        poliza: polizaId,
        periodo_desde,
        periodo_hasta,
        estado: estado.toUpperCase(), // PENDIENTE/PAGADA/VENCIDA
      };
      const res = await http.post("polizas/cupones-robo/", payload);
      return { polizaId, cupon: res.data };
    } catch (err) {
      return rejectWithValue(
        err?.response?.data || "Error al crear cupón de robo"
      );
    }
  }
);

// PATCH /polizas/cupones-robo/{id}/
export const actualizarEstadoCuponRobo = createAsyncThunk(
  "cuponesRobo/updateEstado",
  async (
    // 🚀 FIX: AGREGAMOS costo_compania (antes el thunk lo descartaba)
    { id, polizaId, estado, foto_url, foto_public_id, monto, costo_compania },
    { rejectWithValue }
  ) => {
    try {
      const payload = { estado: (estado || "").toUpperCase() };
      if (foto_url) payload.foto_url = foto_url;
      if (foto_public_id) payload.foto_public_id = foto_public_id;
      if (monto != null) payload.monto = monto; // 💰 enviamos el monto al backend
      // 🏢 FIX: enviamos el costo real de la compañía para que el egreso descuente
      //         lo correcto y se calcule la comisión del vendedor.
      if (costo_compania != null) payload.costo_compania = costo_compania;

      const res = await http.patch(`polizas/cupones-robo/${id}/`, payload);
      const cupon = res.data;

      let emailSent = false;

      // Si quedó en PAGADA → avisamos por EmailJS
      if ((cupon.estado || "").toUpperCase() === "PAGADA") {
        try {
          // Intentamos traer datos de póliza + cliente para enriquecer el mail
          let clienteNombre = "";
          let clienteDni = "";
          let vehiculoMarca = "";
          let vehiculoModelo = "";
          let vehiculoAnio = "";

          try {
            const polRes = await http.get(`polizas/${polizaId}/`);
            const p = polRes.data || {};

            // Nombre cliente: probamos varios campos posibles
            clienteNombre =
              p.cliente_nombre_apellido ||
              p.cliente_nombre ||
              (p.cliente &&
                [p.cliente.apellido, p.cliente.nombre]
                  .filter(Boolean)
                  .join(", ")) ||
              "";

            // DNI cliente: probamos diferentes convenciones
            clienteDni =
              p.cliente_dni ||
              p.cliente_dni_cuit ||
              (p.cliente && p.cliente.dni_cuit_cuil) ||
              "";

            // Vehículo
            vehiculoMarca = p.marca || p.vehiculo_marca || "";
            vehiculoModelo = p.modelo || p.vehiculo_modelo || "";
            vehiculoAnio = p.anio || p.vehiculo_anio || "";
          } catch (e) {
            console.warn(
              "[CuponesRobo] No se pudieron leer datos de póliza para el mail",
              e
            );
          }

          const periodo = cupon.periodo_desde || cupon.periodo_hasta || "";

          await sendAdminCuponRoboPagado({
            poliza_id: polizaId,
            cupon_id: cupon.id,
            cupon_periodo: periodo,
            cupon_vencimiento: cupon.fecha_vencimiento || "",
            cupon_estado: cupon.estado,
            cupon_foto_url: cupon.foto_url || "",

            cliente_nombre_apellido: clienteNombre,
            cliente_dni: clienteDni,
            vehiculo_marca: vehiculoMarca,
            vehiculo_modelo: vehiculoModelo,
            vehiculo_anio: vehiculoAnio,
          });

          emailSent = true;
        } catch (e) {
          console.warn(
            "[CuponesRobo] Error enviando mail de cupon pagado",
            e
          );
          // No rompas el flujo si el mail falla
        }
      }

      return { polizaId, cupon, emailSent };
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
    byPoliza: {}, // polizaId -> [cupones]
    loadingByPoliza: {}, // polizaId -> bool
    creating: false,
    updatingById: {}, // cuponId -> bool
    error: null,

    // 🌍 global
    itemsAll: [], // lista global de cuponeras
    loadingAll: false,
    loadingCounters: false,
    stats: null, // { total, pendientes, por_vencer_7, vencidas, hoy, hasta }
  },
  reducers: {},
  extraReducers: (builder) => {
    // ---- fetchCuponesRobo (por póliza) ----
    builder
      .addCase(fetchCuponesRobo.pending, (state, action) => {
        const polizaId = action.meta.arg;
        state.loadingByPoliza[polizaId] = true;
        state.error = null;
      })
      .addCase(fetchCuponesRobo.fulfilled, (state, action) => {
        const { polizaId, cupones } = action.payload;
        state.loadingByPoliza[polizaId] = false;
        state.byPoliza[polizaId] = cupones;
      })
      .addCase(fetchCuponesRobo.rejected, (state, action) => {
        const polizaId = action.meta.arg;
        state.loadingByPoliza[polizaId] = false;
        state.error =
          action.payload || "No se pudieron cargar las cuponeras de robo.";
        toast.error("Error al cargar cuponeras de robo.");
      });

    // ---- fetchAllCuponeras (global) ----
    builder
      .addCase(fetchAllCuponeras.pending, (state) => {
        state.loadingAll = true;
        state.error = null;
      })
      .addCase(fetchAllCuponeras.fulfilled, (state, action) => {
        state.loadingAll = false;
        state.itemsAll = action.payload || [];
      })
      .addCase(fetchAllCuponeras.rejected, (state, action) => {
        state.loadingAll = false;
        state.error =
          action.payload || "No se pudo cargar el listado de cuponeras.";
        toast.error("Error al cargar el listado de cuponeras.");
      });

    // ---- fetchCuponerasCounters ----
    builder
      .addCase(fetchCuponerasCounters.pending, (state) => {
        state.loadingCounters = true;
        // no toqueteo error para no ensuciar otras vistas
      })
      .addCase(fetchCuponerasCounters.fulfilled, (state, action) => {
        state.loadingCounters = false;
        state.stats = action.payload || null;
      })
      .addCase(fetchCuponerasCounters.rejected, (state, action) => {
        state.loadingCounters = false;
        // guardo algo por si queremos debuggear
        state.error =
          action.payload || "No se pudieron obtener los contadores de cuponeras.";
        // no muestro toast acá para no molestar en background
        console.warn(
          "[CuponesRobo] Error en fetchCuponerasCounters",
          action.payload
        );
      });

    // ---- createCuponRobo ----
    builder
      .addCase(createCuponRobo.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createCuponRobo.fulfilled, (state, action) => {
        state.creating = false;
        const { polizaId, cupon } = action.payload;
        if (!state.byPoliza[polizaId]) {
          state.byPoliza[polizaId] = [];
        }
        state.byPoliza[polizaId].push(cupon);
        toast.success("Cupón de robo creado.");
      })
      .addCase(createCuponRobo.rejected, (state, action) => {
        state.creating = false;
        state.error =
          action.payload || "No se pudo crear el cupón de robo.";
        toast.error("Error al crear el cupón de robo.");
      });

    // ---- actualizarEstadoCuponRobo ----
    builder
      .addCase(actualizarEstadoCuponRobo.pending, (state, action) => {
        const { id } = action.meta.arg;
        state.updatingById[id] = true;
        state.error = null;
      })
      .addCase(actualizarEstadoCuponRobo.fulfilled, (state, action) => {
        const { polizaId, cupon, emailSent } = action.payload;
        state.updatingById[cupon.id] = false;

        const lista = state.byPoliza[polizaId];
        if (Array.isArray(lista)) {
          const idx = lista.findIndex((c) => c.id === cupon.id);
          if (idx !== -1) {
            lista[idx] = cupon;
          }
        }

        if (emailSent) {
          toast.success(
            "Cupón marcado como pagado y se notificó por email."
          );
        } else {
          toast.success("Estado del cupón actualizado.");
        }
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