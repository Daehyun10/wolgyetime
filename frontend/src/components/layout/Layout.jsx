import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header       from './Header'
import Sidebar      from './Sidebar'
import MobileTabBar from './MobileTabBar'
import NoticeBanner from '../ui/NoticeBanner'

export default function Layout() {
  const [sideOpen, setSideOpen] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  useEffect(() => {
    // ✅ 모바일 키보드 감지 - visualViewport API
    if (!window.visualViewport) return

    const handleViewport = () => {
      const ratio = window.visualViewport.height / window.screen.height
      setKeyboardOpen(ratio < 0.75) // 화면의 75% 미만이면 키보드 올라온 것
    }

    window.visualViewport.addEventListener('resize', handleViewport)
    return () => window.visualViewport.removeEventListener('resize', handleViewport)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* PC 사이드바 */}
      <Sidebar open={sideOpen} onClose={() => setSideOpen(false)} />

      {sideOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSideOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSideOpen(true)} />
        <main className="flex-1 overflow-y-auto" id="main-scroll">
          {/* ✅ 키보드 올라오면 하단 패딩 제거 */}
          <div className={`w-full max-w-6xl mx-auto px-4 py-6 ${keyboardOpen ? 'pb-4' : 'pb-24'} lg:pb-6`}>
            <NoticeBanner />
            <Outlet />
          </div>
        </main>
      </div>

      {/* ✅ 키보드 올라오면 탭바 숨김 */}
      {!keyboardOpen && <MobileTabBar />}
    </div>
  )
}