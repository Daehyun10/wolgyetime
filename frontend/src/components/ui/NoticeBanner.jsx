import { useState, useEffect } from 'react'
import { X, Megaphone, AlertTriangle } from 'lucide-react'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'

export default function NoticeBanner() {
  const token = useAuthStore(s => s.token)
  const [notices, setNotices] = useState([])
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dismissed_notices') || '[]') } catch { return [] }
  })

  useEffect(() => {
    if (!token) return
    api.get('/notices').then(r => {
      // is_urgent 명시적 Boolean 변환
      const normalized = (r.data.notices || []).map(n => ({
        ...n,
        is_urgent: n.is_urgent === true || n.is_urgent === 1,
      }))
      setNotices(normalized)
    }).catch(() => {})
  }, [token])

  function dismiss(id) {
    const next = [...dismissed, id]
    setDismissed(next)
    sessionStorage.setItem('dismissed_notices', JSON.stringify(next))
  }

  const visible = notices.filter(n => !dismissed.includes(n.id))
  if (!visible.length) return null

  return (
    <div className="space-y-1.5 mb-4">
      {visible.map(n => (
        <div key={n.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm animate-slide-up ${
            n.is_urgent
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          }`}>
          {n.is_urgent
            ? <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5"/>
            : <Megaphone size={16} className="text-blue-500 flex-shrink-0 mt-0.5"/>
          }
          
          <div className="flex-1 min-w-0 overflow-hidden">
              <p className={`font-semibold text-sm break-all whitespace-pre-wrap ${n.is_urgent ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
                {n.is_urgent && '🚨 '}{n.title}
            </p>

              <p className={`text-xs mt-0.5 leading-relaxed truncate ${n.is_urgent ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {n.content}
              </p>
          </div>
          
          <button onClick={() => dismiss(n.id)}
            className="p-0.5 rounded hover:bg-black/5 transition-colors flex-shrink-0">
            <X size={14} className={n.is_urgent ? 'text-red-400' : 'text-blue-400'}/>
          </button>
        </div>
      ))}
    </div>
  )
}