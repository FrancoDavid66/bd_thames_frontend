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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <Toaster position="top-right" reverseOrder={false} />
      <HashRouter>
        {/* 🚀 ENVOLVEMOS LA APP */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    </Provider>
  </React.StrictMode>
)