// src/context/AuthContext.jsx
import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api'; 
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            fetchUserProfile();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUserProfile = async () => {
        try {
            // Gracias al interceptor, esto ya lleva el Token
            const response = await api.get('/usuarios/users/me/');
            setUser(response.data);
        } catch (error) {
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        try {
            const response = await api.post('/token/', { username, password });
            localStorage.setItem('access_token', response.data.access);
            localStorage.setItem('refresh_token', response.data.refresh);
            
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