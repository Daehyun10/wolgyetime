import { useState, useEffect } from 'react'

/**
 * usePWA
 * - Service Worker 등록
 * - beforeinstallprompt 캡처 (Android 설치 배너)
 * - iOS 감지 (수동 안내용)
 * - 새 버전 감지 (업데이트 토스트)
 */
export default function usePWA() {
  const [installPrompt, setInstallPrompt] = useState(null)   // Android 설치 이벤트
  const [isInstalled, setIsInstalled]     = useState(false)  // 이미 설치됨
  const [isIOS, setIsIOS]                 = useState(false)  // iOS 여부
  const [hasUpdate, setHasUpdate]         = useState(false)  // 새 버전 있음
  const [swReg, setSwReg]                 = useState(null)   // SW 등록 객체

  useEffect(() => {
    // ── iOS 감지 ──────────────────────────────────────────────
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const inStandaloneMode = window.navigator.standalone === true
    setIsIOS(ios)

    // 이미 설치된 경우 (standalone 모드)
    if (window.matchMedia('(display-mode: standalone)').matches || inStandaloneMode) {
      setIsInstalled(true)
    }

    // ── Android 설치 프롬프트 캡처 ────────────────────────────
    const handleInstallPrompt = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)

    // 설치 완료 감지
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    })

    // ── Service Worker 등록 ───────────────────────────────────
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          setSwReg(reg)

          // 새 버전 감지
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setHasUpdate(true)
              }
            })
          })
        })
        .catch((err) => console.warn('[SW] 등록 실패:', err))
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
    }
  }, [])

  // Android 설치 실행
  const triggerInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setInstallPrompt(null)
  }

  // 업데이트 적용 (새 SW 활성화 후 새로고침)
  const applyUpdate = () => {
    swReg?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    window.location.reload()
  }

  return {
    installPrompt,   // null이 아니면 Android 설치 가능
    isInstalled,
    isIOS,
    hasUpdate,
    triggerInstall,
    applyUpdate,
  }
}