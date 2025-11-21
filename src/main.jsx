import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'  // ✅ Cambiado a HashRouter
import { Provider } from 'react-redux'
import { store } from './store'
import App from './App'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <Toaster position="top-right" reverseOrder={false} />
      <HashRouter>  {/* ✅ Usando HashRouter en lugar de BrowserRouter */}
        <App />
      </HashRouter>
    </Provider>
  </React.StrictMode>
)
