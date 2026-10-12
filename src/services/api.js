// src/services/api.js
import axios from 'axios';
import { instalarSesion } from './sesion';

/**
 * Determinamos la URL base de forma robusta buscando en las 
 * variables de entorno que declaraste en tu .env.development
 */
const getBaseURL = () => {
  const envURL = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL;
  if (envURL) {
    return envURL.endsWith('/') ? envURL : `${envURL}/`;
  }
  return 'http://127.0.0.1:8000/api/';
};

const api = axios.create({
    baseURL: getBaseURL(),
    withCredentials: true, // Permite el envío de cookies y cabeceras seguras
});

// 🚀 INTERCEPTOR DE PETICIÓN: Se ejecuta antes de cada envío al servidor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            // Inyectamos el token automáticamente en los headers de TODAS las peticiones
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 🔐 SESIÓN: renueva el permiso sola y solo te saca si de verdad venció
//    (ver services/sesion.js). Antes: cualquier 401 → afuera, y el permiso
//    largo (refresh) nunca se usaba → al día siguiente te sacaba siempre.
//    También se instala en el axios "suelto" que usan otras pantallas.
instalarSesion(api, { siempreConToken: true });
instalarSesion(axios);

export default api;