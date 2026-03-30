import { create } from 'zustand'

const useThemeStore = create((set) => ({
  dark: document.documentElement.classList.contains('dark'),
  toggle() {
    set((s) => {
      const next = !s.dark
      if (next) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
      return { dark: next }
    })
  },
}))

export default useThemeStore
