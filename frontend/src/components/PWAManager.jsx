import { useState } from 'react'
import usePWA from '../hooks/usePWA'
/**
 * PWAManager
 * App.jsx 최상단에 <PWAManager /> 한 줄만 추가하면 됩니다.
 */
export default function PWAManager() {
  const { installPrompt, isInstalled, isIOS, hasUpdate, triggerInstall, applyUpdate } = usePWA()
  const [iosDismissed, setIosDismissed]     = useState(false)
  const [androidDismissed, setAndroidDismissed] = useState(false)

  // 이미 설치됐으면 아무것도 표시 안 함
  if (isInstalled) return null

  return (
    <>
      {/* ── Android 설치 배너 ──────────────────────────────── */}
      {installPrompt && !androidDismissed && (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 px-4 py-4 flex items-center gap-3">
            <span className="text-3xl flex-shrink-0">🏫</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white">홈 화면에 추가</p>
              <p className="text-xs text-gray-500 mt-0.5">앱처럼 빠르게 접속하세요</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setAndroidDismissed(true)}
                className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                나중에
              </button>
              <button
                onClick={triggerInstall}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                설치
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── iOS 수동 설치 안내 ─────────────────────────────── */}
      {isIOS && !iosDismissed && (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 px-4 py-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                🏫 홈 화면에 추가하기
              </p>
              <button
                onClick={() => setIosDismissed(true)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              하단 공유 버튼(
              <span className="inline-block text-blue-500 font-bold mx-0.5">⎙</span>
              )을 탭한 뒤<br/>
              <span className="font-semibold text-gray-700 dark:text-gray-300">"홈 화면에 추가"</span>를 선택하세요.
            </p>
            {/* 화살표 */}
            <div className="flex justify-center mt-2">
              <span className="text-blue-400 text-xl animate-bounce">↓</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 업데이트 토스트 ────────────────────────────────── */}
      {hasUpdate && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-slide-up">
          <div className="bg-blue-600 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-xl">🆕</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">새 버전이 있어요!</p>
              <p className="text-xs text-blue-200 mt-0.5">업데이트 후 더 빠른 속도를 경험하세요</p>
            </div>
            <button
              onClick={applyUpdate}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0">
              업데이트
            </button>
          </div>
        </div>
      )}
    </>
  )
}