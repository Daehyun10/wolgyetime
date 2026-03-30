import { useNavigate, useLocation } from 'react-router-dom'
import { Home, User, PenSquare, UtensilsCrossed, Settings } from 'lucide-react'
import { cn } from '../../lib/utils'

const TABS = [
  { path: '/',        icon: Home,           label: '홈' },
  { path: '/mypage',  icon: User,           label: '마이페이지' },
  { path: '/write',   icon: PenSquare,      label: '글쓰기', fab: true },
  { path: '/meal',    icon: UtensilsCrossed,label: '급식' },
  { path: '/settings',icon: Settings,       label: '설정' },
]

export default function MobileTabBar() {
  const navigate  = useNavigate()
  const location  = useLocation()

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40
      bg-white/90 dark:bg-gray-900/90 backdrop-blur-md
      border-t border-gray-100 dark:border-gray-800
      pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {TABS.map(tab => {
          const isActive = tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path)

          if (tab.fab) {
            return (
              <button key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center justify-center w-14 h-14 -mt-6
                  bg-blue-500 hover:bg-blue-600 active:scale-95
                  rounded-full shadow-lg shadow-blue-500/30
                  text-white transition-all">
                <tab.icon size={22}/>
              </button>
            )
          }

          return (
            <button key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-xl transition-all',
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
              )}>
              <tab.icon size={20} className={isActive ? 'stroke-[2.5px]' : ''}/>
              <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}