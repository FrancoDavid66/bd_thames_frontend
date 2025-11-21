// src/store/aseguradosSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { listAsegurados } from "../../api/aseguradosApi";

export const fetchAsegurados = createAsyncThunk(
  "asegurados/fetch",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { page, pageSize, search, ordering } = getState().asegurados;
      const data = await listAsegurados({ page, pageSize, search, ordering });
      return data;
    } catch (err) {
      return rejectWithValue(err.message || "Error al cargar asegurados");
    }
  }
);

const initialState = {
  items: [],
  count: 0,
  page: 1,
  pageSize: 20,
  search: "",
  ordering: "",
  status: "idle",
  error: null,
};

const aseguradosSlice = createSlice({
  name: "asegurados",
  initialState,
  reducers: {
    setSearch(state, action) {
      state.search = action.payload || "";
      state.page = 1;
    },
    setPage(state, action) {
      state.page = action.payload || 1;
    },
    setPageSize(state, action) {
      state.pageSize = action.payload || 20;
      state.page = 1;
    },
    setOrdering(state, action) {
      state.ordering = action.payload || "";
      state.page = 1;
    },
    resetState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAsegurados.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAsegurados.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.results || action.payload.items || [];
        state.count = action.payload.count ?? action.payload.total ?? 0;
      })
      .addCase(fetchAsegurados.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Error desconocido";
      });
  },
});

export const { setSearch, setPage, setPageSize, setOrdering, resetState } = aseguradosSlice.actions;
export default aseguradosSlice.reducer;
