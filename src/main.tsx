import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { TokenizeProvider } from '@/lib/tokenizeStore'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <TokenizeProvider>
          <App />
        </TokenizeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
