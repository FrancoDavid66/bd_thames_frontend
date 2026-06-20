// src/store/index.js
import { configureStore } from "@reduxjs/toolkit";
import clientesReducer from "./slices/clientesSlice";
import themeReducer from "./slices/themeSlice";
import polizasReducer from "./slices/polizasSlice";
import pagosReducer from "./slices/pagosSlice";
import siniestrosReducer from "./slices/siniestrosSlice";
import geoReducer from "./slices/geoSlice";
import propiedadesReducer from "./slices/propiedadesSlice";
import alquileresReducer from "./slices/alquileresSlice";
import ingresosReducer from "./slices/ingresosSlice";
import egresosReducer from "./slices/egresosSlice";
import balanceReducer from "./slices/balanceSlice";
import gruasReducer from "./slices/gruasSlice";

// Asegurados
import aseguradosReducer from "./slices/aseguradosSlice";
import cuponesRoboReducer from "./slices/cuponesRoboSlice";

// Competencia / Renovaciones
import competenciaReducer from "./slices/competenciaSlice";
import renovacionesReducer from "./slices/renovacionesSlice";

// Vencimientos
import vencimientosReducer from "./slices/vencimientosSlice";

// ✅🆕 Bajas
import bajasReducer from "./slices/bajasSlice";

// ✅🆕 Marketing / Campañas
import marketingReducer from "./slices/marketingSlice";

// ✅🆕 Recaudación / Cierres de caja
import recaudacionReducer from "./slices/recaudacionSlice";

// 🚀 NUEVO: Cotizaciones
import cotizacionesReducer from "./slices/cotizacionesSlice";

// 🚀 NUEVO: Panel de Administración
import adminReducer from "./slices/adminSlice"; 

// Solicitudes
import solicitudesReducer from "./slices/solicitudesSlice";

// 🚀 NUEVO: Servicios y Gastos Fijos
import serviciosReducer from "./slices/serviciosSlice";

// 🆕 NUEVO: Tareas del día
import tareasReducer from "./slices/tareasSlice";

export const store = configureStore({
  reducer: {
    clientes: clientesReducer,
    theme: themeReducer,
    polizas: polizasReducer,
    pagos: pagosReducer,
    siniestros: siniestrosReducer,
    geo: geoReducer,
    propiedades: propiedadesReducer,
    alquileres: alquileresReducer,
    ingresos: ingresosReducer,
    egresos: egresosReducer,
    balance: balanceReducer,
    gruas: gruasReducer,

    asegurados: aseguradosReducer,
    cuponesRobo: cuponesRoboReducer,

    competencia: competenciaReducer,
    renovaciones: renovacionesReducer,

    vencimientos: vencimientosReducer,

    // ✅🆕
    bajas: bajasReducer,

    // ✅🆕
    marketing: marketingReducer,

    // ✅🆕
    recaudacion: recaudacionReducer,

    // 🚀 NUEVO
    cotizaciones: cotizacionesReducer,

    // 🚀 NUEVO: Panel Admin (Usuarios y Oficinas)
    admin: adminReducer,

    // Solicitudes
    solicitudes: solicitudesReducer,

    // 🚀 NUEVO: Servicios y Gastos Fijos
    servicios: serviciosReducer,

    // 🆕 NUEVO: Tareas del día
    tareas: tareasReducer,
  },
});

export default store;