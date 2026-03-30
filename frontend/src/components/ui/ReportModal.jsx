import { useState } from 'react'
import { X, Flag } from 'lucide-react'
import api from '../../lib/api'
import { getErrorMessage } from '../../lib/utils'

const REASONS = [
  { value: 'hate',    label: '혐오·차별 (저격, 비방)' },
  { value: 'privacy', label: '개인정보 노출' },
  { value: 'sexual',  label: '음란물·성적 내용' },
  { value: 'spam',    label: '스팸·광고' },
  { value: 'other',   label: '기타' },
]

export default function ReportModal({ targetType, targetId, onClose }) {
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!reason) { setError('신고 사유를 선택해주세요.'); return }
    setLoading(true); setError('')
    try {
      await api.post('/reports', { targetType, targetId, reason, detail })
      setDone(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-5 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-red-500">
            <Flag size={17} />
            <h3 className="font-semibold text-sm">신고하기</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-3">✅</div>
            <p className="text-sm font-medium">신고가 접수되었습니다</p>
            <p className="text-xs text-gray-400 mt-1">검토 후 적절한 조치를 취하겠습니다</p>
            <button onClick={onClose} className="btn-ghost mt-4 mx-auto">닫기</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              {REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="radio" name="reason" value={r.value}
                    checked={reason === r.value} onChange={() => setReason(r.value)}
                    className="text-blue-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                    {r.label}
                  </span>
                </label>
              ))}
            </div>

            <textarea
              className="input resize-none h-20 text-xs"
              placeholder="추가 설명 (선택)"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={300}
            />

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="btn-ghost text-xs py-1.5 px-3">취소</button>
              <button onClick={submit} disabled={loading} className="btn-danger text-xs py-1.5 px-3">
                {loading ? '신고 중...' : '신고 접수'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
