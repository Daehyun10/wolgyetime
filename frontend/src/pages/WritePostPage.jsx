import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ShieldAlert, Send } from 'lucide-react'
import api from '../lib/api'
import useAuthStore from '../store/authStore'
import { getErrorMessage } from '../lib/utils'

export default function WritePostPage() {
  const navigate = useNavigate()
  const { boardId: paramBoardId } = useParams()

  const user = useAuthStore(s => s.user)
  const [boards, setBoards]           = useState([])
  const [form, setForm]               = useState({ boardId: paramBoardId || '', title: '', content: '' })
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [filterError, setFilterError] = useState('')

  useEffect(() => {
    api.get('/boards')
      .then(r => {
        const isAdmin = user?.role === 'admin'
        const writable = r.data.boards.filter(b => !b.is_locked && b.name !== '전체 게시판' && (b.name !== '공지사항' || isAdmin))
        setBoards(writable)
        if (!form.boardId && writable.length) {
          setForm(f => ({ ...f, boardId: String(writable[0].id) }))
        }
      })
      .catch(() => {})
  }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.boardId || !form.title.trim() || !form.content.trim()) {
      setError('모든 항목을 입력해주세요.'); return
    }
    setLoading(true); setError(''); setFilterError('')
    try {
      const { data } = await api.post('/posts', {
        boardId: parseInt(form.boardId),
        title:   form.title.trim(),
        content: form.content.trim(),
      })
      navigate(`/post/${data.post.id}`)
    } catch (err) {
      const msg = getErrorMessage(err)
      if (err.response?.data?.rule) setFilterError(msg)
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        <ArrowLeft size={15} /> 돌아가기
      </button>

      <div className="card p-6">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-5">✏️ 익명 글쓰기</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 게시판 선택 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              게시판
            </label>
            <select
              className="input"
              value={form.boardId}
              onChange={set('boardId')}
              required
            >
              <option value="">게시판 선택</option>
              {boards.map(b => (
                <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
              ))}
            </select>
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              제목
            </label>
            <input
              className="input"
              placeholder="제목을 입력하세요"
              value={form.title}
              onChange={set('title')}
              maxLength={100}
              required
            />
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              내용
            </label>
            <textarea
              className="input min-h-[200px] resize-y"
              placeholder="내용을 자유롭게 작성하세요..."
              value={form.content}
              onChange={set('content')}
              onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
              required
            />
          </div>

          {/* 검열 안내 */}
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
            <ShieldAlert size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              특정 학생 저격, 교사 비방, 개인정보, 욕설, 음란물이 포함된 글은 자동으로 차단됩니다.
            </p>
          </div>

          {/* 일반 에러 */}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* 필터 에러 */}
          {filterError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              <ShieldAlert size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">게시글이 차단되었습니다</p>
                <p className="text-xs text-red-500 mt-0.5">{filterError}</p>
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>취소</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><Send size={14} /> 익명으로 등록</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}