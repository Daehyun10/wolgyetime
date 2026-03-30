import { useState } from 'react'
import { Sun, Moon, Type, MessageSquarePlus, Check, AlertTriangle } from 'lucide-react'
import useThemeStore    from '../store/themeStore'
import useSettingsStore from '../store/settingsStore'
import useAuthStore     from '../store/authStore'
import api from '../lib/api'

export default function SettingsPage() {
  const { dark, toggle }          = useThemeStore()
  const { fontSize, setFontSize } = useSettingsStore()
  const user                      = useAuthStore(s => s.user)

  // 건의하기
  const [suggestion, setSuggestion] = useState('')
  const [sgLoading, setSgL]         = useState(false)
  const [sgDone, setSgDone]         = useState(false)
  const [sgError, setSgError]       = useState('')

  async function submitSuggestion(e) {
    e.preventDefault()
    if (!suggestion.trim()) return
    setSgL(true); setSgError(''); setSgDone(false)
    try {
      await api.post('/suggestions', { content: suggestion.trim() })
      setSgDone(true)
      setSuggestion('')
    } catch (err) {
      setSgError(err.response?.data?.error || '전송 실패')
    } finally { setSgL(false) }
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">⚙️ 설정</h2>

      {/* 차단 사유 표시 */}
      {(user?.is_banned === true || user?.is_banned === 1) && (user?.bannedReason || user?.bannedReason || user?.banned_reason) && (
        <div className="card p-5 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-500"/>
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">계정 이용 제한</h3>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">
            차단 사유: <span className="font-medium">{user.bannedReason || user.bannedReason || user.banned_reason}</span>
          </p>
          {(user.banUntil || user.banUntil || user.ban_until) && (
            <p className="text-xs text-red-500 mt-1">
              해제 예정: {new Date(user.banUntil || user.banUntil || user.ban_until).toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>
      )}

      {/* 테마 */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          {dark ? <Moon size={15}/> : <Sun size={15}/>} 테마
        </h3>
        <div className="flex gap-3">
          <button onClick={() => { if (dark) toggle() }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
              !dark ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            <Sun size={16}/> 라이트 {!dark && '✓'}
          </button>
          <button onClick={() => { if (!dark) toggle() }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
              dark ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            <Moon size={16}/> 다크 {dark && '✓'}
          </button>
        </div>
      </div>

      {/* 글자 크기 */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
          <Type size={15}/> 글자 크기
        </h3>
        <p className="text-xs text-gray-400 mb-4">현재: <span className="font-medium text-gray-600 dark:text-gray-300">{fontSize}px</span></p>
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 mb-5">
          <p style={{ fontSize: `${fontSize}px` }} className="text-gray-700 dark:text-gray-300 leading-relaxed">
            안녕하세요! 글자 크기 미리보기입니다. 🏫
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 flex-shrink-0">작게</span>
          <input type="range" min={11} max={20} value={fontSize} step={1}
            onChange={e => setFontSize(parseInt(e.target.value))}
            className="flex-1 accent-blue-500"/>
          <span className="text-xs text-gray-400 flex-shrink-0">크게</span>
        </div>
        <div className="flex justify-between text-[10px] text-gray-300 mt-1 px-0.5">
          <span>11px</span><span>20px</span>
        </div>
      </div>

      {/* 건의하기 */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <MessageSquarePlus size={15}/> 건의하기
        </h3>
        <p className="text-xs text-gray-400 mb-3">서비스 개선을 위한 건의사항을 남겨주세요. 익명으로 전달됩니다.</p>
        <form onSubmit={submitSuggestion} className="space-y-3">
          <textarea className="input resize-none h-28 text-sm"
            placeholder="건의사항을 입력해주세요... (500자 이내)"
            value={suggestion}
            onChange={e => setSuggestion(e.target.value)}
            maxLength={500}/>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{suggestion.length}/500</span>
            <button type="submit" disabled={sgLoading || !suggestion.trim()}
              className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
              {sgLoading ? '전송 중...' : <><MessageSquarePlus size={13}/> 건의 보내기</>}
            </button>
          </div>
          {sgDone && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-xl">
              <Check size={14}/> 건의가 접수되었습니다. 감사합니다!
            </div>
          )}
          {sgError && <p className="text-xs text-red-500">{sgError}</p>}
        </form>
      </div>

      {/* 서비스 정보 */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">ℹ️ 서비스 정보</h3>
        <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
          <p>🔒 모든 게시글은 완전 익명으로 처리됩니다</p>
          <p>🛡️ 욕설, 저격, 개인정보는 자동 차단됩니다</p>
          <p>📅 매년 3월 학년도 재인증이 필요합니다</p>
          <p>🚨 신고 3회 이상 시 게시글이 자동 숨김 처리됩니다</p>
        </div>
      </div>
    </div>
  )
}