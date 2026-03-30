import { create } from 'zustand'

function applyFontSize(size) {
  // px 값을 직접 CSS 변수로 적용
  document.documentElement.style.setProperty('--font-size-base', `${size}px`)
  // html font-size도 함께 변경 (rem 기반 클래스에 영향)
  const pct = (size / 16) * 100
  document.documentElement.style.fontSize = `${pct}%`
}

const useSettingsStore = create((set) => ({
  fontSize: parseInt(localStorage.getItem('fontSize') || '14'),

  setFontSize: (size) => {
    localStorage.setItem('fontSize', String(size))
    applyFontSize(size)
    set({ fontSize: size })
  },

  init: () => {
    const size = parseInt(localStorage.getItem('fontSize') || '14')
    applyFontSize(size)
  },
}))

export default useSettingsStore
