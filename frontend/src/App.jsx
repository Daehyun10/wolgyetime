import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore     from './store/authStore'
import useSettingsStore from './store/settingsStore'
import Layout           from './components/layout/Layout'
import LoginPage        from './pages/LoginPage'
import RegisterPage     from './pages/RegisterPage'
import BoardPage        from './pages/BoardPage'
import PostDetailPage   from './pages/PostDetailPage'
import WritePostPage    from './pages/WritePostPage'
import AdminPage        from './pages/AdminPage'
import SettingsPage     from './pages/SettingsPage'
import MealPage         from './pages/MealPage'
import MyPage           from './pages/MyPage'
import NotFoundPage     from './pages/NotFoundPage'
import PWAManager       from './components/PWAManager'

// ────────────────────────────────────────────────
// 🔧 점검 모드 — true 로 바꾸면 관리자 외 전원 차단
// ────────────────────────────────────────────────
const MAINTENANCE_MODE = false

function MaintenancePage() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
      background: '#0f1117', color: '#e2e8f7', textAlign: 'center', fontFamily: 'sans-serif',
    }}>
      <div style={{ fontSize: 64, marginBottom: 24 }}>🔧</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.5px' }}>
        점검 중입니다
      </h1>
      <p style={{ fontSize: 14, color: '#5a6688', lineHeight: 1.7, marginBottom: 32, maxWidth: 320 }}>
        더 나은 서비스를 위해 점검 중입니다.<br/>
        잠시 후 다시 접속해 주세요.
      </p>
      {user?.role === 'admin' && (
        <a href="/admin" style={{
          display: 'inline-block', marginBottom: 12,
          padding: '10px 24px', background: '#4f7bff', color: '#fff',
          borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none',
        }}>관리자 패널로 이동</a>
      )}
      {user && (
        <button onClick={logout} style={{
          background: 'transparent', border: '1px solid #1e2740',
          color: '#5a6688', borderRadius: 10, padding: '8px 20px',
          fontSize: 13, cursor: 'pointer',
        }}>로그아웃</button>
      )}
    </div>
  )
}

function RequireAuth({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace/>
}
function RequireAdmin({ children }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace/>
  if (user.role !== 'admin') return <Navigate to="/" replace/>
  return children
}
function GuestOnly({ children }) {
  const token = useAuthStore(s => s.token)
  return !token ? children : <Navigate to="/" replace/>
}
function RequireMaintenance({ children }) {
  const user = useAuthStore(s => s.user)
  if (MAINTENANCE_MODE && user?.role !== 'admin') return <MaintenancePage/>
  return children
}

export default function App() {
  const init = useSettingsStore(s => s.init)
  useEffect(() => { init() }, [])

  return (
    <>
      <PWAManager/>
      <Routes>
        <Route path="/login"    element={<GuestOnly><LoginPage/></GuestOnly>}/>
        <Route path="/register" element={<GuestOnly><RegisterPage/></GuestOnly>}/>

        <Route path="/" element={<RequireAuth><RequireMaintenance><Layout/></RequireMaintenance></RequireAuth>}>
          <Route index                 element={<BoardPage/>}/>
          <Route path="board/:id"      element={<BoardPage/>}/>
          <Route path="post/:id"       element={<PostDetailPage/>}/>
          <Route path="write"          element={<WritePostPage/>}/>
          <Route path="write/:boardId" element={<WritePostPage/>}/>
          <Route path="settings"       element={<SettingsPage/>}/>
          <Route path="meal"           element={<MealPage/>}/>
          <Route path="mypage"         element={<MyPage/>}/>
          <Route path="admin/*"        element={<RequireAdmin><AdminPage/></RequireAdmin>}/>
        </Route>

        <Route path="*" element={<NotFoundPage/>}/>
      </Routes>
    </>
  )
}