// src/context/AuthContext.jsx
import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

// 👤 COPIA DEL USUARIO EN EL NAVEGADOR
//    ⚡ Para qué: al abrir una ventana nueva (ej: "ver póliza") la app arrancaba
//    de cero: esperaba que el servidor dijera "sí, sos vos" y encima mostraba
//    el logo de bienvenida. Ahora arranca al toque con esta copia y la confirma
//    por atrás con el servidor.
//    Es el portero que ya te conoce: te deja pasar y después mira la lista.
const USUARIO_KEY = 'thames.usuario';

// 🎉 MARCA DE "RECIÉN INICIÉ SESIÓN"
//    La pone el login y la consume App.jsx para mostrar el logo de bienvenida
//    UNA sola vez. Una ventana nueva no la tiene → entra directo, sin logo.
export const BIENVENIDA_KEY = 'thames.bienvenida';

const leer = (store, key) => {
    try { return store.getItem(key); } catch { return null; }
};

const leerUsuarioGuardado = () => {
    try {
        const t = localStorage.getItem(USUARIO_KEY);
        return t ? JSON.parse(t) : null;
    } catch {
        return null;
    }
};

const guardarUsuario = (u) => {
    try {
        if (u) localStorage.setItem(USUARIO_KEY, JSON.stringify(u));
        else localStorage.removeItem(USUARIO_KEY);
    } catch { /* modo privado: no pasa nada, solo no hay copia */ }
};

export const AuthProvider = ({ children }) => {
    // Si hay token Y copia del usuario → arrancamos ya con el usuario adentro.
    const [user, setUser] = useState(() =>
        leer(localStorage, 'access_token') ? leerUsuarioGuardado() : null
    );
    // Solo esperamos al servidor si hay token pero NO tenemos copia
    // (la primera vez después de esta actualización, o modo privado).
    const [loading, setLoading] = useState(() =>
        Boolean(leer(localStorage, 'access_token')) && !leerUsuarioGuardado()
    );
    const navigate = useNavigate();

    useEffect(() => {
        const token = leer(localStorage, 'access_token');
        if (token) {
            fetchUserProfile();
        } else {
            guardarUsuario(null);
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchUserProfile = async () => {
        try {
            // Gracias al interceptor, esto ya lleva el Token
            const response = await api.get('/usuarios/users/me/');
            setUser(response.data);
            guardarUsuario(response.data);
        } catch (error) {
            // 🔌 Sin internet o el servidor caído un segundo: si ya teníamos la
            //    copia, seguimos trabajando con ella (no te saca de la app).
            //    Si el servidor dijo "no sos vos" (401/403) → afuera, como siempre.
            const st = error?.response?.status;
            const sinRespuesta = !error?.response || (st && st >= 500);
            if (sinRespuesta && leerUsuarioGuardado()) {
                console.warn('[auth] No se pudo confirmar la sesión; sigo con la copia guardada.');
            } else {
                logout();
            }
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        try {
            const response = await api.post('/token/', { username, password });
            localStorage.setItem('access_token', response.data.access);
            localStorage.setItem('refresh_token', response.data.refresh);

            // 🎉 Recién entró: App.jsx muestra el logo de bienvenida una vez.
            try { sessionStorage.setItem(BIENVENIDA_KEY, '1'); } catch { /* nada */ }

            await fetchUserProfile();
            navigate('/');
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.detail || 'Error de acceso'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        guardarUsuario(null);
        try { sessionStorage.removeItem(BIENVENIDA_KEY); } catch { /* nada */ }
        setUser(null);
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
