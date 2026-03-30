import { Menu, PenSquare, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function Header({ onMenuClick }) {
  const { logout } = useAuthStore()
  const navigate   = useNavigate()

  function handleLogout() {
    if (!window.confirm('로그아웃하시겠습니까?')) return
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-10 h-14 flex items-center justify-between px-4
      bg-white/80 dark:bg-gray-900/80 backdrop-blur-md
      border-b border-gray-100 dark:border-gray-800">

      {/* 왼쪽 - 모바일 햄버거만 */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Menu size={20}/>
        </button>
        <span className="font-bold text-base tracking-tight cursor-pointer select-none"
          onClick={() => navigate('/')}>
          🏫 월계고 커뮤니티
        </span>
      </div>

      {/* 오른쪽 - 글쓰기 + 로그아웃 */}
      <div className="flex items-center gap-1">
        <button onClick={() => navigate('/write')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="글쓰기">
          <PenSquare size={19}/>
        </button>
        <button onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400"
          title="로그아웃">
          <LogOut size={19}/>
        </button>
      </div>
    </header>
  )
}
