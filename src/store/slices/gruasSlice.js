// src/store/slices/gruasSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { GruasAPI } from "../../api/gruas";

// ---------- Helpers ----------
const normalizeError = (e) => {
  try {
    if (!e) return "Error";
    if (typeof e === "string") return e;

    if (e?.payload) {
      const detail = e.payload?.detail || e.payload?.message || e.payload?.error || null;
      if (detail) return String(detail);
      try {
        return JSON.stringify(e.payload);
      } catch {}
    }

    if (e?.response?.data?.detail) return String(e.response.data.detail);
    if (e?.response?.data) {
      try {
        return JSON.stringify(e.response.data);
      } catch {
        return "Error";
      }
    }

    if (e?.message) return String(e.message);

    try {
      return JSON.stringify(e);
    } catch {
      return "Error";
    }
  } catch {
    return "Error";
  }
};

const rejectErr = (rejectWithValue, e) => rejectWithValue(normalizeError(e));

// ---------- Thunks (Planes) ----------
export const fetchPlanesGrua = createAsyncThunk("gruas/fetchPlanes", async (_, { rejectWithValue }) => {
  try {
    return await GruasAPI.getPlanes();
  } catch (e) {
    return rejectErr(rejectWithValue, e);
  }
});

export const createPlanGrua = createAsyncThunk("gruas/createPlan", async (plan, { rejectWithValue }) => {
  try {
    return await GruasAPI.createPlan(plan);
  } catch (e) {
    return rejectErr(rejectWithValue, e);
  }
});

// ---------- Thunks (Proveedores) ----------
export const fetchProveedoresGrua = createAsyncThunk("gruas/fetchProveedores", async (_, { rejectWithValue }) => {
  try {
    return await GruasAPI.getProveedores();
  } catch (e) {
    return rejectErr(rejectWithValue, e);
  }
});

export const fetchProveedorPerfil = createAsyncThunk(
  "gruas/fetchProveedorPerfil",
  async ({ proveedorId, params }, { rejectWithValue }) => {
    try {
      return await GruasAPI.getProveedorPerfil(proveedorId, params || {});
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

// ---------- Thunks (Flota real) ----------
export const fetchProveedorVehiculos = createAsyncThunk(
  "gruas/fetchProveedorVehiculos",
  async ({ proveedorId, params }, { rejectWithValue }) => {
    try {
      return await GruasAPI.listProveedorVehiculos(proveedorId, params || {});
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

export const createProveedorVehiculo = createAsyncThunk(
  "gruas/createProveedorVehiculo",
  async ({ proveedorId, data }, { rejectWithValue }) => {
    try {
      return await GruasAPI.createProveedorVehiculo(proveedorId, data || {});
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

export const updateProveedorVehiculo = createAsyncThunk(
  "gruas/updateProveedorVehiculo",
  async ({ proveedorId, vehiculoId, data }, { rejectWithValue }) => {
    try {
      return await GruasAPI.updateProveedorVehiculo(proveedorId, vehiculoId, data || {});
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

export const deleteProveedorVehiculo = createAsyncThunk(
  "gruas/deleteProveedorVehiculo",
  async ({ proveedorId, vehiculoId }, { rejectWithValue }) => {
    try {
      await GruasAPI.deleteProveedorVehiculo(proveedorId, vehiculoId);
      return { proveedorId, vehiculoId };
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

// ---------- Thunks (Adhesiones) ----------
export const activarAdhesionGrua = createAsyncThunk(
  "gruas/activarAdhesion",
  async (payload, { rejectWithValue }) => {
    try {
      return await GruasAPI.activarAdhesion(payload);
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

// ✅ Asociar grúa a póliza (usa fallback: /polizas/{id}/asociar-grua/ o /gruas/adhesiones/activar/)
export const asociarGrua = createAsyncThunk(
  "gruas/asociarGrua",
  async ({ polizaId, data }, { rejectWithValue }) => {
    try {
      return await GruasAPI.asociarGrua(polizaId, data || {});
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

export const firmarContratoAdhesion = createAsyncThunk(
  "gruas/firmarContratoAdhesion",
  async ({ adhesionId, archivo_url }, { rejectWithValue }) => {
    try {
      return await GruasAPI.firmarContrato(adhesionId, { archivo_url });
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

export const firmarContratoAdhesionUpload = createAsyncThunk(
  "gruas/firmarContratoAdhesionUpload",
  async ({ adhesionId, file }, { rejectWithValue }) => {
    try {
      return await GruasAPI.firmarContratoUpload(adhesionId, file);
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

export const fetchAdhesionesByPoliza = createAsyncThunk(
  "gruas/fetchAdhesionesByPoliza",
  async (polizaId, { rejectWithValue }) => {
    try {
      return await GruasAPI.getAdhesionesByPoliza(polizaId);
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

// ---------- Thunks (Solicitudes) ----------
export const fetchSolicitudes = createAsyncThunk(
  "gruas/fetchSolicitudes",
  async (params, { rejectWithValue }) => {
    try {
      return await GruasAPI.getSolicitudes(params || {});
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

export const createSolicitud = createAsyncThunk(
  "gruas/createSolicitud",
  async (payload, { rejectWithValue }) => {
    try {
      return await GruasAPI.crearSolicitud(payload || {});
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

export const asignarProveedorSolicitud = createAsyncThunk(
  "gruas/asignarProveedorSolicitud",
  async ({ solicitudId, proveedorId, costo_estimado, vehiculo_id }, { rejectWithValue }) => {
    try {
      return await GruasAPI.asignarProveedor(solicitudId, proveedorId, costo_estimado, vehiculo_id);
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

export const cambiarEstadoSolicitud = createAsyncThunk(
  "gruas/cambiarEstadoSolicitud",
  async ({ solicitudId, estado, notas }, { rejectWithValue }) => {
    try {
      return await GruasAPI.cambiarEstado(solicitudId, estado, notas || "");
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

export const cerrarSolicitud = createAsyncThunk(
  "gruas/cerrarSolicitud",
  async ({ solicitudId, km_totales, registrar_copago_en_balances, vehiculo_id }, { rejectWithValue }) => {
    try {
      return await GruasAPI.cerrar(
        solicitudId,
        km_totales,
        !!registrar_copago_en_balances,
        vehiculo_id
      );
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

// ---------- Thunks (KPIs / Series / Resúmenes) ----------
export const fetchKpisSolicitudes = createAsyncThunk(
  "gruas/fetchKpis",
  async (params, { rejectWithValue }) => {
    try {
      return await GruasAPI.kpis(params || {});
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

export const fetchSeriePorMes = createAsyncThunk(
  "gruas/fetchSeriePorMes",
  async (params, { rejectWithValue }) => {
    try {
      return await GruasAPI.porMes(params || {});
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

export const fetchClienteResumen = createAsyncThunk(
  "gruas/fetchClienteResumen",
  async (clienteId, { rejectWithValue }) => {
    try {
      return await GruasAPI.getClienteResumen(clienteId);
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

export const fetchPolizaResumen = createAsyncThunk(
  "gruas/fetchPolizaResumen",
  async (polizaId, { rejectWithValue }) => {
    try {
      return await GruasAPI.getPolizaResumen(polizaId);
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

export const searchPolizasElegibles = createAsyncThunk(
  "gruas/searchPolizasElegibles",
  async ({ q, soloOperables = false }, { rejectWithValue }) => {
    try {
      return await GruasAPI.searchPolizasElegibles(q, soloOperables);
    } catch (e) {
      return rejectErr(rejectWithValue, e);
    }
  }
);

// ---------- Estado ----------
const initialState = {
  planes: {
    list: [],
    loading: false,
    error: null,
    creating: false,
    createError: null,
  },

  proveedores: {
    list: [],
    loading: false,
    error: null,
  },

  proveedorPerfil: {
    byId: {},
    loading: false,
    error: null,
  },

  flota: {
    // { [proveedorId]: { mes, items, total_vehiculos, total_viajes_mes } }
    byProveedor: {},
    loading: false,
    error: null,
  },

  activacion: { loading: false, success: false, error: null, adhesion: null },

  asociacion: { loading: false, success: false, error: null, adhesion: null },

  adhesiones: { byPoliza: {}, loading: false, error: null },

  solicitudes: {
    list: [],
    loading: false,
    error: null,
    updating: false,
    updateError: null,
  },

  // ✅ Root shape para GruasPage (simple)
  kpis: {},
  series: {
    por_mes: [],
  },

  kpisMeta: { loading: false, error: null },
  seriesMeta: { loading: false, error: null },

  clienteResumen: { byId: {}, loading: false, error: null },
  polizaResumen: { byId: {}, loading: false, error: null },

  polizasBusqueda: { list: [], loading: false, error: null },
};

const gruasSlice = createSlice({
  name: "gruas",
  initialState,
  reducers: {
    resetActivacion(state) {
      state.activacion = { loading: false, success: false, error: null, adhesion: null };
    },
    resetAsociacion(state) {
      state.asociacion = { loading: false, success: false, error: null, adhesion: null };
    },
    resetBusquedaPolizas(state) {
      state.polizasBusqueda = { list: [], loading: false, error: null };
    },
  },
  extraReducers: (builder) => {
    // Planes (listado)
    builder.addCase(fetchPlanesGrua.pending, (state) => {
      state.planes.loading = true;
      state.planes.error = null;
    });
    builder.addCase(fetchPlanesGrua.fulfilled, (state, action) => {
      state.planes.loading = false;
      state.planes.list = Array.isArray(action.payload) ? action.payload : [];
    });
    builder.addCase(fetchPlanesGrua.rejected, (state, action) => {
      state.planes.loading = false;
      state.planes.error = normalizeError(action.payload || action.error);
    });

    // Planes (crear)
    builder.addCase(createPlanGrua.pending, (state) => {
      state.planes.creating = true;
      state.planes.createError = null;
    });
    builder.addCase(createPlanGrua.fulfilled, (state, action) => {
      state.planes.creating = false;
      const nuevo = action.payload;
      if (nuevo) state.planes.list = [nuevo, ...(state.planes.list || [])];
    });
    builder.addCase(createPlanGrua.rejected, (state, action) => {
      state.planes.creating = false;
      state.planes.createError = normalizeError(action.payload || action.error);
    });

    // Proveedores (listado)
    builder.addCase(fetchProveedoresGrua.pending, (state) => {
      state.proveedores.loading = true;
      state.proveedores.error = null;
    });
    builder.addCase(fetchProveedoresGrua.fulfilled, (state, action) => {
      state.proveedores.loading = false;
      state.proveedores.list = Array.isArray(action.payload) ? action.payload : [];
    });
    builder.addCase(fetchProveedoresGrua.rejected, (state, action) => {
      state.proveedores.loading = false;
      state.proveedores.error = normalizeError(action.payload || action.error);
    });

    // Proveedor perfil
    builder.addCase(fetchProveedorPerfil.pending, (state) => {
      state.proveedorPerfil.loading = true;
      state.proveedorPerfil.error = null;
    });
    builder.addCase(fetchProveedorPerfil.fulfilled, (state, action) => {
      state.proveedorPerfil.loading = false;
      const d = action.payload || {};
      const prov = d?.proveedor;
      const provId = prov?.id ?? action.meta?.arg?.proveedorId;
      if (provId != null) state.proveedorPerfil.byId[provId] = d;
    });
    builder.addCase(fetchProveedorPerfil.rejected, (state, action) => {
      state.proveedorPerfil.loading = false;
      state.proveedorPerfil.error = normalizeError(action.payload || action.error);
    });

    // Flota real (listar)
    builder.addCase(fetchProveedorVehiculos.pending, (state) => {
      state.flota.loading = true;
      state.flota.error = null;
    });
    builder.addCase(fetchProveedorVehiculos.fulfilled, (state, action) => {
      state.flota.loading = false;
      const proveedorId = action.meta?.arg?.proveedorId;
      const resp = action.payload || {};
      if (proveedorId != null) state.flota.byProveedor[proveedorId] = resp;
    });
    builder.addCase(fetchProveedorVehiculos.rejected, (state, action) => {
      state.flota.loading = false;
      state.flota.error = normalizeError(action.payload || action.error);
    });

    // Flota real (crear/update/delete)
    builder.addCase(createProveedorVehiculo.fulfilled, (state, action) => {
      const proveedorId = action.meta?.arg?.proveedorId;
      if (proveedorId == null) return;
      const cur = state.flota.byProveedor[proveedorId];
      if (!cur || !Array.isArray(cur.items)) return;
      cur.items = [action.payload, ...cur.items];
      cur.total_vehiculos = (cur.total_vehiculos || 0) + 1;
    });

    builder.addCase(updateProveedorVehiculo.fulfilled, (state, action) => {
      const proveedorId = action.meta?.arg?.proveedorId;
      if (proveedorId == null) return;
      const cur = state.flota.byProveedor[proveedorId];
      if (!cur || !Array.isArray(cur.items)) return;
      const updated = action.payload;
      const idx = cur.items.findIndex((x) => String(x?.id) === String(updated?.id));
      if (idx >= 0) cur.items[idx] = updated;
    });

    builder.addCase(deleteProveedorVehiculo.fulfilled, (state, action) => {
      const { proveedorId, vehiculoId } = action.payload || {};
      const cur = state.flota.byProveedor[proveedorId];
      if (!cur || !Array.isArray(cur.items)) return;
      cur.items = cur.items.filter((x) => String(x?.id) !== String(vehiculoId));
      cur.total_vehiculos = Math.max((cur.total_vehiculos || 1) - 1, 0);
    });

    // Activación
    builder.addCase(activarAdhesionGrua.pending, (state) => {
      state.activacion = { loading: true, success: false, error: null, adhesion: null };
    });
    builder.addCase(activarAdhesionGrua.fulfilled, (state, action) => {
      state.activacion = { loading: false, success: true, error: null, adhesion: action.payload };
    });
    builder.addCase(activarAdhesionGrua.rejected, (state, action) => {
      state.activacion = { loading: false, success: false, error: normalizeError(action.payload || action.error), adhesion: null };
    });

    // Asociación
    builder.addCase(asociarGrua.pending, (state) => {
      state.asociacion = { loading: true, success: false, error: null, adhesion: null };
    });
    builder.addCase(asociarGrua.fulfilled, (state, action) => {
      state.asociacion = { loading: false, success: true, error: null, adhesion: action.payload };

      const adhesion = action.payload || {};
      const polizaId = action.meta?.arg?.polizaId ?? adhesion?.poliza;
      if (polizaId != null) {
        const list = state.adhesiones.byPoliza[polizaId] || [];
        state.adhesiones.byPoliza[polizaId] = [adhesion, ...list];
      }
    });
    builder.addCase(asociarGrua.rejected, (state, action) => {
      state.asociacion = { loading: false, success: false, error: normalizeError(action.payload || action.error), adhesion: null };
    });

    // Firmar contrato
    builder.addCase(firmarContratoAdhesion.pending, (state) => {
      state.activacion.loading = true;
      state.activacion.error = null;
    });
    builder.addCase(firmarContratoAdhesion.fulfilled, (state, action) => {
      state.activacion.loading = false;
      state.activacion.adhesion = action.payload;
    });
    builder.addCase(firmarContratoAdhesion.rejected, (state, action) => {
      state.activacion.loading = false;
      state.activacion.error = normalizeError(action.payload || action.error);
    });

    builder.addCase(firmarContratoAdhesionUpload.pending, (state) => {
      state.activacion.loading = true;
      state.activacion.error = null;
    });
    builder.addCase(firmarContratoAdhesionUpload.fulfilled, (state, action) => {
      state.activacion.loading = false;
      state.activacion.adhesion = action.payload;
    });
    builder.addCase(firmarContratoAdhesionUpload.rejected, (state, action) => {
      state.activacion.loading = false;
      state.activacion.error = normalizeError(action.payload || action.error);
    });

    // Adhesiones por póliza
    builder.addCase(fetchAdhesionesByPoliza.pending, (state) => {
      state.adhesiones.loading = true;
      state.adhesiones.error = null;
    });
    builder.addCase(fetchAdhesionesByPoliza.fulfilled, (state, action) => {
      state.adhesiones.loading = false;
      const list = Array.isArray(action.payload) ? action.payload : [];
      const polizaId = action.meta?.arg;
      if (polizaId != null) {
        state.adhesiones.byPoliza[polizaId] = list;
      } else if (list.length) {
        const pId = list[0].poliza;
        state.adhesiones.byPoliza[pId] = list;
      }
    });
    builder.addCase(fetchAdhesionesByPoliza.rejected, (state, action) => {
      state.adhesiones.loading = false;
      state.adhesiones.error = normalizeError(action.payload || action.error);
    });

    // Solicitudes (listado)
    builder.addCase(fetchSolicitudes.pending, (state) => {
      state.solicitudes.loading = true;
      state.solicitudes.error = null;
    });
    builder.addCase(fetchSolicitudes.fulfilled, (state, action) => {
      state.solicitudes.loading = false;
      // backend devuelve list (ModelViewSet) -> normalmente array
      state.solicitudes.list = Array.isArray(action.payload) ? action.payload : [];
    });
    builder.addCase(fetchSolicitudes.rejected, (state, action) => {
      state.solicitudes.loading = false;
      state.solicitudes.error = normalizeError(action.payload || action.error);
      state.solicitudes.list = [];
    });

    // Solicitudes (acciones que “updatean” una solicitud)
    const onSolicitudUpdatePending = (state) => {
      state.solicitudes.updating = true;
      state.solicitudes.updateError = null;
    };
    const onSolicitudUpdateRejected = (state, action) => {
      state.solicitudes.updating = false;
      state.solicitudes.updateError = normalizeError(action.payload || action.error);
    };
    const onSolicitudUpdateFulfilled = (state, action) => {
      state.solicitudes.updating = false;
      const upd = action.payload;
      if (!upd?.id) return;
      const idx = (state.solicitudes.list || []).findIndex((x) => String(x?.id) === String(upd.id));
      if (idx >= 0) state.solicitudes.list[idx] = upd;
      else state.solicitudes.list = [upd, ...(state.solicitudes.list || [])];
    };

    builder.addCase(createSolicitud.pending, onSolicitudUpdatePending);
    builder.addCase(createSolicitud.fulfilled, onSolicitudUpdateFulfilled);
    builder.addCase(createSolicitud.rejected, onSolicitudUpdateRejected);

    builder.addCase(asignarProveedorSolicitud.pending, onSolicitudUpdatePending);
    builder.addCase(asignarProveedorSolicitud.fulfilled, onSolicitudUpdateFulfilled);
    builder.addCase(asignarProveedorSolicitud.rejected, onSolicitudUpdateRejected);

    builder.addCase(cambiarEstadoSolicitud.pending, onSolicitudUpdatePending);
    builder.addCase(cambiarEstadoSolicitud.fulfilled, onSolicitudUpdateFulfilled);
    builder.addCase(cambiarEstadoSolicitud.rejected, onSolicitudUpdateRejected);

    builder.addCase(cerrarSolicitud.pending, onSolicitudUpdatePending);
    builder.addCase(cerrarSolicitud.fulfilled, onSolicitudUpdateFulfilled);
    builder.addCase(cerrarSolicitud.rejected, onSolicitudUpdateRejected);

    // KPIs
    builder.addCase(fetchKpisSolicitudes.pending, (state) => {
      state.kpisMeta.loading = true;
      state.kpisMeta.error = null;
    });
    builder.addCase(fetchKpisSolicitudes.fulfilled, (state, action) => {
      state.kpisMeta.loading = false;
      state.kpis = action.payload || {};
    });
    builder.addCase(fetchKpisSolicitudes.rejected, (state, action) => {
      state.kpisMeta.loading = false;
      state.kpisMeta.error = normalizeError(action.payload || action.error);
      state.kpis = {};
    });

    // Series por mes
    builder.addCase(fetchSeriePorMes.pending, (state) => {
      state.seriesMeta.loading = true;
      state.seriesMeta.error = null;
    });
    builder.addCase(fetchSeriePorMes.fulfilled, (state, action) => {
      state.seriesMeta.loading = false;
      const arr = Array.isArray(action.payload?.series) ? action.payload.series : [];
      state.series.por_mes = arr;
    });
    builder.addCase(fetchSeriePorMes.rejected, (state, action) => {
      state.seriesMeta.loading = false;
      state.seriesMeta.error = normalizeError(action.payload || action.error);
      state.series.por_mes = [];
    });

    // Resumen cliente
    builder.addCase(fetchClienteResumen.pending, (state) => {
      state.clienteResumen.loading = true;
      state.clienteResumen.error = null;
    });
    builder.addCase(fetchClienteResumen.fulfilled, (state, action) => {
      state.clienteResumen.loading = false;
      const d = action.payload || {};
      if (d?.cliente_id != null) state.clienteResumen.byId[d.cliente_id] = d;
    });
    builder.addCase(fetchClienteResumen.rejected, (state, action) => {
      state.clienteResumen.loading = false;
      state.clienteResumen.error = normalizeError(action.payload || action.error);
    });

    // Resumen póliza
    builder.addCase(fetchPolizaResumen.pending, (state) => {
      state.polizaResumen.loading = true;
      state.polizaResumen.error = null;
    });
    builder.addCase(fetchPolizaResumen.fulfilled, (state, action) => {
      state.polizaResumen.loading = false;
      const d = action.payload || {};
      if (d?.poliza_id != null) state.polizaResumen.byId[d.poliza_id] = d;
    });
    builder.addCase(fetchPolizaResumen.rejected, (state, action) => {
      state.polizaResumen.loading = false;
      state.polizaResumen.error = normalizeError(action.payload || action.error);
    });

    // Búsqueda de pólizas
    builder.addCase(searchPolizasElegibles.pending, (state) => {
      state.polizasBusqueda.loading = true;
      state.polizasBusqueda.error = null;
    });
    builder.addCase(searchPolizasElegibles.fulfilled, (state, action) => {
      state.polizasBusqueda.loading = false;
      state.polizasBusqueda.list = Array.isArray(action.payload) ? action.payload : [];
    });
    builder.addCase(searchPolizasElegibles.rejected, (state, action) => {
      state.polizasBusqueda.loading = false;
      state.polizasBusqueda.error = normalizeError(action.payload || action.error);
    });
  },
});

export const { resetActivacion, resetAsociacion, resetBusquedaPolizas } = gruasSlice.actions;

export default gruasSlice.reducer;
