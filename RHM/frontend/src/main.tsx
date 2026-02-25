import React from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'
import { App } from './App'

const rootElement = document.getElementById('app')
if (!rootElement) {
  throw new Error('Élément #app introuvable dans le DOM')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

