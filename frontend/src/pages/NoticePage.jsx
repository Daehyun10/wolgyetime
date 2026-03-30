import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import api from '../lib/api'

function formatDate(d) {
  try { return format(new Date(d), 'M월 d일 HH:mm', { locale: ko }) } catch { return '' }
}

export default function NoticePage() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    api.get('/notices')
      .then(r => setNotices((r.data.notices || []).map(n => ({
        ...n, is_urgent: n.is_urgent === true || n.is_urgent === 1,
      }))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone size={18} className="text-blue-500"/>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">공지사항</h2>
      </div>

      {loading && <div className="flex justify-center py-16"><RefreshCw size={20} className="animate-spin text-gray-400"/></div>}

      {!loading && notices.length === 0 && (
        <div className="card p-10 text-center">
          <Megaphone size={36} className="text-gray-300 mx-auto mb-3"/>
          <p className="text-sm text-gray-400">공지사항이 없습니다</p>
        </div>
      )}

      {!loading && notices.map(n => (
        <div key={n.id}
          className={`card overflow-hidden ${n.is_urgent ? 'border-red-200 dark:border-red-800' : ''}`}>
          <div
            className="px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
            onClick={() => setExpanded(expanded === n.id ? null : n.id)}>
            <div className="flex items-start gap-3">
              {n.is_urgent
                ? <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5"/>
                : <Megaphone size={16} className="text-blue-500 flex-shrink-0 mt-0.5"/>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {n.is_urgent && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-500 font-medium">🚨 긴급</span>
                  )}
                  <p className={`text-sm font-semibold ${n.is_urgent ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>
                    {n.title}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <span>관리자</span>
                  <span>·</span>
                  <span>{formatDate(n.created_at)}</span>
                  {(n.start_date || n.end_date) && (
                    <>
                      <span>·</span>
                      <span>{n.end_date ? `${n.end_date}까지` : '상시'}</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight size={15} className={`text-gray-400 transition-transform flex-shrink-0 ${expanded === n.id ? 'rotate-90' : ''}`}/>
            </div>
          </div>

          {expanded === n.id && (
            <div className={`px-5 py-4 border-t text-sm leading-relaxed whitespace-pre-wrap ${
              n.is_urgent
                ? 'border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300'
                : 'border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/40'
            }`}>
              {n.content}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}