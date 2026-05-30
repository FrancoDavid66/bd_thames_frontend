// src/store/slices/competenciaSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import CompetenciaAPI from "../../api/competencia";
import toast from "react-hot-toast";

/* ============================ STATS ============================ */
function computeStats(ubicaciones) {
  const rows = Array.isArray(ubicaciones) ? ubicaciones : [];
  const totalRegistros = rows.length;

  const nombresSet = new Set();
  let sumaPrecio = 0;
  let countPrecio = 0;
  let minPrecio = null;
  let maxPrecio = null;

  const porCobertura = {};
  const porCompania = {};
  const porCiudad = {};
  const preciosCobertura = {};
  const preciosCompania = {};

  for (const row of rows) {
    if (row.nombre) nombresSet.add(row.nombre);

    const precio =
      row.precio !== null && row.precio !== undefined ? Number(row.precio) : null;
    const cobertura = row.cobertura || "";
    const compania = row.compania || "";
    const ciudad = row.ciudad || "";

    if (precio != null && !isNaN(precio)) {
      sumaPrecio += precio;
      countPrecio += 1;
      if (minPrecio === null || precio < minPrecio) minPrecio = precio;
      if (maxPrecio === null || precio > maxPrecio) maxPrecio = precio;

      if (cobertura) {
        if (!preciosCobertura[cobertura]) preciosCobertura[cobertura] = { sum: 0, count: 0 };
        preciosCobertura[cobertura].sum += precio;
        preciosCobertura[cobertura].count += 1;
      }
      if (compania) {
        if (!preciosCompania[compania]) preciosCompania[compania] = { sum: 0, count: 0 };
        preciosCompania[compania].sum += precio;
        preciosCompania[compania].count += 1;
      }
    }

    if (cobertura) porCobertura[cobertura] = (porCobertura[cobertura] || 0) + 1;
    if (compania) porCompania[compania] = (porCompania[compania] || 0) + 1;
    if (ciudad) porCiudad[ciudad] = (porCiudad[ciudad] || 0) + 1;
  }

  const promedioPrecio = countPrecio > 0 ? sumaPrecio / countPrecio : null;

  const promedioPorCobertura = {};
  for (const key of Object.keys(preciosCobertura)) {
    const info = preciosCobertura[key];
    if (info.count > 0) promedioPorCobertura[key] = info.sum / info.count;
  }
  const promedioPorCompania = {};
  for (const key of Object.keys(preciosCompania)) {
    const info = preciosCompania[key];
    if (info.count > 0) promedioPorCompania[key] = info.sum / info.count;
  }

  return {
    totalRegistros,
    totalCompetidores: nombresSet.size,
    promedioPrecio,
    minPrecio,
    maxPrecio,
    porCobertura,
    porCompania,
    porCiudad,
    promedioPorCobertura,
    promedioPorCompania,
  };
}

const safeNum = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

const asArray = (res) =>
  Array.isArray(res?.data) ? res.data : res?.data?.results || [];

/* ====================== DATOS PRINCIPALES ====================== */
export const fetchCompetenciaData = createAsyncThunk(
  "competencia/fetchCompetenciaData",
  async (_, { rejectWithValue }) => {
    try {
      const [ubicRes, compRes] = await Promise.all([
        CompetenciaAPI.fetchUbicaciones(),
        CompetenciaAPI.fetchCompetidores(),
      ]);
      return { ubicaciones: asArray(ubicRes), competidores: asArray(compRes) };
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: "Error cargando datos" });
    }
  }
);

/* Crear un registro = (asegura competidor) + crea ubicación */
export const createRegistro = createAsyncThunk(
  "competencia/createRegistro",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const { nombre, redes, precio, compania, cobertura, direccion, ciudad, url_maps } =
        payload;

      const nombreTrim = (nombre || "").trim();
      if (!nombreTrim) throw new Error("El nombre es obligatorio");

      const lista = getState().competencia?.competidores || [];
      let competidor = lista.find(
        (c) => (c.nombre || "").toLowerCase() === nombreTrim.toLowerCase()
      );

      if (!competidor) {
        const res = await CompetenciaAPI.crearCompetidor({
          nombre: nombreTrim,
          redes: redes || "",
          activo: true,
        });
        competidor = res.data;
      } else if (redes != null && redes !== competidor.redes) {
        await CompetenciaAPI.actualizarCompetidor(competidor.id, {
          ...competidor,
          redes,
        });
      }

      const res = await CompetenciaAPI.crearUbicacion({
        competidor: competidor.id,
        precio: safeNum(precio),
        compania: compania || "",
        cobertura: cobertura || "",
        direccion: direccion || "",
        ciudad: ciudad || "",
        url_maps: url_maps || "",
      });
      return { ubicacion: res.data, competidor };
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { detail: err.message || "Error al crear" }
      );
    }
  }
);

/* Actualizar un registro (una fila de la tabla) */
export const updateRegistro = createAsyncThunk(
  "competencia/updateRegistro",
  async ({ id, original, data }, { rejectWithValue }) => {
    try {
      const { nombre, redes, precio, compania, cobertura, direccion, ciudad, url_maps } =
        data;

      const nombreTrim = (nombre || "").trim();
      if (!nombreTrim) throw new Error("El nombre es obligatorio");

      // 🛠️ FIX: antes intentaba leer original.competidor_obj / competidor_detalle
      // (que el backend NUNCA manda), por eso editar redes/nombre no guardaba nada.
      // El id del competidor SÍ viene en la fila como `original.competidor`.
      const competidorId = original?.competidor;
      const nombreCambio = nombreTrim !== (original?.nombre || "");
      const redesCambio = (redes || "") !== (original?.redes || "");

      if (competidorId && (nombreCambio || redesCambio)) {
        await CompetenciaAPI.actualizarCompetidor(competidorId, {
          nombre: nombreTrim,
          redes: redes || "",
          activo: true,
        });
      }

      const res = await CompetenciaAPI.actualizarUbicacion(id, {
        competidor: competidorId,
        precio: safeNum(precio),
        compania: compania || "",
        cobertura: cobertura || "",
        direccion: direccion || "",
        ciudad: ciudad || "",
        url_maps: url_maps || "",
      });

      // El backend re-aplana nombre/redes en la respuesta de la ubicación,
      // pero por las dudas los forzamos para que la tabla se vea al instante.
      return { ...res.data, nombre: nombreTrim, redes: redes || "" };
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { detail: err.message || "Error al actualizar" }
      );
    }
  }
);

export const deleteRegistro = createAsyncThunk(
  "competencia/deleteRegistro",
  async (id, { rejectWithValue }) => {
    try {
      await CompetenciaAPI.eliminarUbicacion(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: "Error al eliminar" });
    }
  }
);

/* ================= MIS PRECIOS (ahora vía backend) ================= */
export const fetchMisPrecios = createAsyncThunk(
  "competencia/fetchMisPrecios",
  async (_, { rejectWithValue }) => {
    try {
      const res = await CompetenciaAPI.fetchMisPrecios();
      return asArray(res);
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: "Error cargando precios" });
    }
  }
);

export const crearMiPrecio = createAsyncThunk(
  "competencia/crearMiPrecio",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await CompetenciaAPI.crearMiPrecio({
        cobertura: (payload.cobertura || "").trim(),
        compania: (payload.compania || "").trim(),
        ciudad: (payload.ciudad || "").trim(),
        precio: safeNum(payload.precio),
        notas: (payload.notas || "").trim(),
        activo: payload.activo !== false,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: "Error al crear precio" });
    }
  }
);

export const actualizarMiPrecio = createAsyncThunk(
  "competencia/actualizarMiPrecio",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await CompetenciaAPI.actualizarMiPrecio(id, {
        cobertura: (data.cobertura || "").trim(),
        compania: (data.compania || "").trim(),
        ciudad: (data.ciudad || "").trim(),
        precio: safeNum(data.precio),
        notas: (data.notas || "").trim(),
        activo: data.activo !== false,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: "Error al actualizar precio" });
    }
  }
);

export const eliminarMiPrecio = createAsyncThunk(
  "competencia/eliminarMiPrecio",
  async (id, { rejectWithValue }) => {
    try {
      await CompetenciaAPI.eliminarMiPrecio(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: "Error al eliminar precio" });
    }
  }
);

/* ============================ SLICE ============================ */
const competenciaSlice = createSlice({
  name: "competencia",
  initialState: {
    ubicaciones: [],
    competidores: [],
    misPrecios: [],
    loading: false,
    saving: false,
    error: null,
    stats: computeStats([]),
  },
  reducers: {},
  extraReducers: (builder) => {
    // Fetch principal
    builder
      .addCase(fetchCompetenciaData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompetenciaData.fulfilled, (state, action) => {
        state.loading = false;
        state.ubicaciones = action.payload.ubicaciones || [];
        state.competidores = action.payload.competidores || [];
        state.stats = computeStats(state.ubicaciones);
      })
      .addCase(fetchCompetenciaData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.error(action.payload?.detail || "Error cargando competencia");
      });

    // Crear
    builder
      .addCase(createRegistro.pending, (state) => {
        state.saving = true;
      })
      .addCase(createRegistro.fulfilled, (state, action) => {
        state.saving = false;
        const { ubicacion, competidor } = action.payload;
        if (ubicacion) state.ubicaciones.unshift(ubicacion);
        if (competidor && !state.competidores.some((c) => c.id === competidor.id)) {
          state.competidores.push(competidor);
        }
        state.stats = computeStats(state.ubicaciones);
      })
      .addCase(createRegistro.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
        toast.error(action.payload?.detail || "Error al crear registro");
      });

    // Actualizar
    builder
      .addCase(updateRegistro.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateRegistro.fulfilled, (state, action) => {
        state.saving = false;
        const idx = state.ubicaciones.findIndex((u) => u.id === action.payload.id);
        if (idx >= 0) state.ubicaciones[idx] = { ...state.ubicaciones[idx], ...action.payload };
        state.stats = computeStats(state.ubicaciones);
      })
      .addCase(updateRegistro.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
        toast.error(action.payload?.detail || "Error al actualizar registro");
      });

    // Eliminar
    builder
      .addCase(deleteRegistro.pending, (state) => {
        state.saving = true;
      })
      .addCase(deleteRegistro.fulfilled, (state, action) => {
        state.saving = false;
        state.ubicaciones = state.ubicaciones.filter((u) => u.id !== action.payload);
        state.stats = computeStats(state.ubicaciones);
        toast.success("Registro eliminado");
      })
      .addCase(deleteRegistro.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
        toast.error(action.payload?.detail || "Error al eliminar registro");
      });

    // Mis precios
    builder
      .addCase(fetchMisPrecios.fulfilled, (state, action) => {
        state.misPrecios = action.payload || [];
      })
      .addCase(crearMiPrecio.fulfilled, (state, action) => {
        state.misPrecios.unshift(action.payload);
        toast.success("Precio guardado");
      })
      .addCase(crearMiPrecio.rejected, (state, action) => {
        toast.error(action.payload?.detail || "Error al guardar precio");
      })
      .addCase(actualizarMiPrecio.fulfilled, (state, action) => {
        const idx = state.misPrecios.findIndex((p) => p.id === action.payload.id);
        if (idx >= 0) state.misPrecios[idx] = action.payload;
        toast.success("Precio actualizado");
      })
      .addCase(actualizarMiPrecio.rejected, (state, action) => {
        toast.error(action.payload?.detail || "Error al actualizar precio");
      })
      .addCase(eliminarMiPrecio.fulfilled, (state, action) => {
        state.misPrecios = state.misPrecios.filter((p) => p.id !== action.payload);
      })
      .addCase(eliminarMiPrecio.rejected, (state, action) => {
        toast.error(action.payload?.detail || "Error al eliminar precio");
      });
  },
});

export default competenciaSlice.reducer;