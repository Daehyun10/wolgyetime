import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Hash, Lock, X, Settings, Shield } from 'lucide-react'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import { cn } from '../../lib/utils'

export default function Sidebar({ open, onClose }) {
  const [boards, setBoards] = useState([])
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore(s => ({ user: s.user, logout: s.logout }))

  useEffect(() => {
    api.get('/boards').then(r => {
  const data = r.data
  setBoards(Array.isArray(data) ? data : (data?.boards ?? []))
}).catch(() => {})
  }, [])

  function goTo(path) { navigate(path); onClose() }
  function handleLogout() {
    if (window.confirm('로그아웃하시겠습니까?')) { logout(); navigate('/login') }
  }
  const isActive = (path) => location.pathname === path

  return (
    <aside className={cn(
      'fixed lg:static inset-y-0 left-0 z-30',
      'w-64 flex flex-col',
      'bg-white dark:bg-gray-900',
      'border-r border-gray-100 dark:border-gray-800',
      'transition-transform duration-250 ease-in-out',
      open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    )}>
      {/* 상단 */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <p className="text-xs font-bold text-gray-900 dark:text-gray-100">🏫 월계고등학교</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {user?.grade}학년 {user?.classNum}반 {user?.studentNum}번
          </p>
        </div>
        <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <X size={16}/>
        </button>
      </div>

      {/* 뱃지 */}
      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">🔒 익명</span>
        {user?.role === 'admin' && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium">👑 관리자</span>
        )}
      </div>

      {/* 게시판 목록 */}
      <nav className="flex-1 overflow-y-auto py-2">
        <p className="px-4 pt-2 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">게시판</p>

        <button onClick={() => goTo('/')}
          className={cn('w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
            isActive('/') ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')}>
          <Hash size={14}/> <span className="flex-1 text-left">전체 게시판</span>
        </button>

        {boards.filter(b => b.name !== '전체 게시판' && b.name !== '급식 게시판').map(b => {
          const active = location.pathname === `/board/${b.id}`
          const locked = !!b.is_locked && user?.role !== 'admin'
          return (
            <button key={b.id}
              onClick={() => !locked && goTo(`/board/${b.id}`)}
              className={cn('w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
                active ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                       : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                locked && 'opacity-40 cursor-not-allowed')}>
              <span className="text-base leading-none">{b.icon}</span>
              <span className="flex-1 text-left truncate">{b.name}</span>
              {!!b.is_locked
                ? <Lock size={12} className="text-gray-400 flex-shrink-0"/>
                : b.post_count > 0
                  ? <span className="text-[11px] text-gray-400 flex-shrink-0">{b.post_count}</span>
                  : null
              }
            </button>
          )
        })}

        {/* 관리자 메뉴 */}
        {user?.role === 'admin' && (
          <>
            <p className="px-4 pt-4 pb-1 text-[11px] font-semibold text-amber-500 uppercase tracking-wider">관리자</p>
            <button onClick={() => goTo('/admin')}
              className={cn('w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
                location.pathname.startsWith('/admin')
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')}>
              <Shield size={14}/> <span className="flex-1 text-left">관리자 패널</span>
            </button>
          </>
        )}

        {/* 마이페이지 */}
        <button onClick={() => goTo('/mypage')}
          className={cn('w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
            isActive('/mypage')
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')}>
          <span className="text-base leading-none">👤</span>
          <span className="flex-1 text-left">마이페이지</span>
        </button>

        {/* 급식 */}
        <button onClick={() => goTo('/meal')}
          className={cn('w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
            isActive('/meal')
              ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')}>
          <span className="text-base leading-none">🍱</span>
          <span className="flex-1 text-left">오늘의 급식</span>
        </button>

        {/* 설정 */}
        <p className="px-4 pt-4 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">기타</p>
        <button onClick={() => goTo('/settings')}
          className={cn('w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
            isActive('/settings')
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')}>
          <Settings size={14}/> <span className="flex-1 text-left">설정</span>
        </button>
      </nav>

      {/* 하단 로그아웃 */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          로그아웃
        </button>
      </div>
    </aside>
  )
}