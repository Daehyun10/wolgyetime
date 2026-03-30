import { create } from 'zustand'
import api from '../lib/api'

const useAuthStore = create((set, get) => ({
  user:    JSON.parse(localStorage.getItem('user') || 'null'),
  token:   localStorage.getItem('token') || null,
  loading: false,
  error:   null,

  setAuth: (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token, user, error: null })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null })
  },

  login: async (payload) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/login', {
        grade:      Number(payload.grade),
        classNum:   Number(payload.classNum),
        studentNum: Number(payload.studentNum),
        name:       String(payload.name || '').trim(),
        password:   payload.password,
        isAlumni:   !!payload.isAlumni,  // ✅ 졸업생 여부 전달
      })

      if (data.needsRenewal) {
        set({ loading: false })
        return { needsRenewal: true }
      }

      get().setAuth(data.token, data.user)
      set({ loading: false })
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.error || '로그인에 실패했습니다.'
      const bannedReason = err.response?.data?.banned_reason || null
      set({ loading: false, error: msg })
      return { error: msg, bannedReason }
    }
  },

  register: async (payload) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/register', {
        grade:      Number(payload.grade),
        classNum:   Number(payload.classNum),
        studentNum: Number(payload.studentNum),
        name:       String(payload.name || '').trim(),
        password:   payload.password,
        adminCode:  payload.adminCode || undefined,
        isAlumni:   !!payload.isAlumni,  // ✅ 졸업생 여부 전달
      })

      get().setAuth(data.token, data.user)
      set({ loading: false })
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.error || '가입에 실패했습니다.'
      set({ loading: false, error: msg })
      return { error: msg }
    }
  },

  isAdmin:    () => get().user?.role === 'admin',
  isLoggedIn: () => !!get().token,
}))

export default useAuthStore