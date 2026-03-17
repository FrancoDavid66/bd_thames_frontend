// src/services/api.js
import axios from 'axios';

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

// 🚀 INTERCEPTOR DE RESPUESTA: Maneja errores globales como el 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Si el servidor responde 401 (No autorizado)
        if (error.response?.status === 401) {
            console.warn("Sesión expirada o token inválido. Redirigiendo al login...");
            
            // Limpiamos los tokens para evitar bucles de error
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');

            // Solo redirigimos si no estamos ya en la página de login
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;