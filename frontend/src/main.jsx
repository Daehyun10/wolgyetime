import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// ✅ 다크모드 초기화 - 새로고침해도 깜빡임 없이 적용
const savedTheme = localStorage.getItem('theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}

// ✅ 글자 크기 초기화
const fontSize = parseInt(localStorage.getItem('fontSize') || '14')
document.documentElement.style.setProperty('--font-size-base', `${fontSize}px`)
const pct = (fontSize / 16) * 100
document.documentElement.style.fontSize = `${pct}%`

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)