import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import App from './App'
import './index.css'
import { Toaster } from 'react-hot-toast'
// 🚀 IMPORTAMOS EL PROVIDER
import { AuthProvider } from './context/AuthContext'
// 🎨 MOTOR ÚNICO DE TEMA (claro/oscuro)
import { ThemeProvider } from './context/ThemeContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      {/* 🎨 El tema envuelve todo, así cualquier pantalla lo puede leer/cambiar */}
      <ThemeProvider>
        <Toaster position="top-right" reverseOrder={false} />
        <HashRouter>
          {/* 🚀 ENVOLVEMOS LA APP */}
          <AuthProvider>
            <App />
          </AuthProvider>
        </HashRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
)