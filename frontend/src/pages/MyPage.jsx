import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, MessageCircle, Bookmark, Lock, RefreshCw, Eye, Heart, ChevronRight, Check, X, Send } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

const TABS = [
  { id: 'posts',       label: '게시글',   icon: FileText },
  { id: 'comments',    label: '댓글',     icon: MessageCircle },
  { id: 'bookmarks',   label: '스크랩',   icon: Bookmark },
  { id: 'suggestions', label: '건의하기', icon: MessageCircle },
  { id: 'password',    label: '비밀번호', icon: Lock },
]

function formatDate(d) {
  try { return format(new Date(d), 'MM월 dd일 HH:mm', { locale: ko }) } catch { return '' }
}

export default function MyPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [tab, setTab] = useState('posts')

  const isAlumni = user?.role === 'alumni'

  const [posts, setPosts]             = useState([])
  const [postsLoading, setPL]         = useState(false)
  const [comments, setComments]       = useState([])
  const [cmtLoading, setCL]           = useState(false)
  const [bookmarks, setBookmarks]     = useState([])
  const [bmLoading, setBL]            = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [sgLoading, setSgLoading]     = useState(false)
  const [sgSubmitting, setSgSubmitting] = useState(false)
  const [sgInput, setSgInput]         = useState('')
  const [sgError, setSgError]         = useState('')
  const [pwForm, setPwForm]           = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwL]           = useState(false)
  const [pwMsg, setPwMsg]             = useState({ type: '', text: '' })

  useEffect(() => {
    if (tab === 'posts')       fetchPosts()
    if (tab === 'comments')    fetchComments()
    if (tab === 'bookmarks')   fetchBookmarks()
    if (tab === 'suggestions') fetchSuggestions()
  }, [tab])

  async function fetchPosts() {
    setPL(true)
    try { const { data } = await api.get('/mypage/posts'); setPosts(data.posts) } catch {}
    finally { setPL(false) }
  }
  async function fetchComments() {
    setCL(true)
    try { const { data } = await api.get('/mypage/comments'); setComments(data.comments) } catch {}
    finally { setCL(false) }
  }
  async function fetchBookmarks() {
    setBL(true)
    try { const { data } = await api.get('/bookmarks'); setBookmarks(data.posts) } catch {}
    finally { setBL(false) }
  }
  async function fetchSuggestions() {
    setSgLoading(true)
    try { const { data } = await api.get('/suggestions/mine'); setSuggestions(data.suggestions || []) } catch {}
    finally { setSgLoading(false) }
  }

  async function submitSuggestion(e) {
    e.preventDefault()
    if (!sgInput.trim() || sgInput.length > 500) return
    setSgSubmitting(true); setSgError('')
    try {
      await api.post('/suggestions', { content: sgInput.trim() })
      setSgInput(''); fetchSuggestions()
    } catch (err) {
      setSgError(err.response?.data?.error || '건의 등록 실패')
    } finally { setSgSubmitting(false) }
  }

  async function handlePwChange(e) {
    e.preventDefault()
    if (pwForm.next.length < 6) { setPwMsg({ type: 'error', text: '비밀번호는 6자 이상이어야 합니다.' }); return }
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ type: 'error', text: '비밀번호가 일치하지 않습니다.' }); return }
    setPwL(true); setPwMsg({ type: '', text: '' })
    try {
      await api.patch('/mypage/password', { currentPassword: pwForm.current, newPassword: pwForm.next })
      setPwMsg({ type: 'success', text: '비밀번호가 변경되었습니다!' })
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.error || '변경 실패' })
    } finally { setPwL(false) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* 프로필 */}
      <div className="card p-5 flex items-center gap-4">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl ${
          isAlumni
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
        }`}>
          {isAlumni ? '🎓' : user?.name?.[0]}
        </div>
        <div>
          <p className="font-bold text-gray-900 dark:text-white text-base">{user?.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {isAlumni
              ? `졸업생 · ${user?.schoolYear}학년도`
              : `${user?.grade}학년 ${user?.classNum}반 ${user?.studentNum}번 · ${user?.schoolYear}학년도`
            }
          </p>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
            isAlumni
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
              : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          }`}>
            {isAlumni ? '🎓 졸업생' : '익명 보호 중'}
          </span>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === t.id
                ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}>
            <t.icon size={13}/> {t.label}
          </button>
        ))}
      </div>

      {/* 게시글 */}
      {tab === 'posts' && (
        <div className="space-y-2">
          {postsLoading ? <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-gray-400"/></div>
           : posts.length === 0 ? <div className="text-center py-16 text-gray-400"><FileText size={32} className="mx-auto mb-3 opacity-30"/><p className="text-sm">작성한 게시글이 없습니다</p></div>
           : posts.map(p => (
            <div key={p.id} onClick={e => { if (e.target.closest('button')) return; navigate(`/post/${p.id}`) }}
              className="card px-4 py-3 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">{p.board_icon} {p.board_name}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{p.title}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                <span className="flex items-center gap-0.5"><Heart size={10}/> {p.like_count}</span>
                <span className="flex items-center gap-0.5"><MessageCircle size={10}/> {p.comment_count}</span>
                <span className="flex items-center gap-0.5"><Eye size={10}/> {p.view_count}</span>
                <span className="ml-auto">{formatDate(p.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 댓글 */}
      {tab === 'comments' && (
        <div className="space-y-2">
          {cmtLoading ? <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-gray-400"/></div>
           : comments.length === 0 ? <div className="text-center py-16 text-gray-400"><MessageCircle size={32} className="mx-auto mb-3 opacity-30"/><p className="text-sm">작성한 댓글이 없습니다</p></div>
           : comments.map(c => (
            <div key={c.id} onClick={() => navigate(`/post/${c.post_id}`)}
              className="card px-4 py-3 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">{c.board_icon} {c.board_name}</span>
                <ChevronRight size={11} className="text-gray-300"/>
                <span className="text-[11px] text-gray-500 truncate">{c.post_title}</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{c.content}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                {c.is_edited && <span className="text-blue-400">수정됨</span>}
                <span className="ml-auto">{formatDate(c.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 스크랩 */}
      {tab === 'bookmarks' && (
        <div className="space-y-2">
          {bmLoading ? <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-gray-400"/></div>
           : bookmarks.length === 0 ? <div className="text-center py-16 text-gray-400"><Bookmark size={32} className="mx-auto mb-3 opacity-30"/><p className="text-sm">스크랩한 게시글이 없습니다</p></div>
           : bookmarks.map(p => (
            <div key={p.id} onClick={e => { if (e.target.closest('button')) return; navigate(`/post/${p.id}`) }}
              className="card px-4 py-3 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">{p.board_icon} {p.board_name}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{p.title}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                <span className="flex items-center gap-0.5"><Heart size={10}/> {p.like_count}</span>
                <span className="flex items-center gap-0.5"><MessageCircle size={10}/> {p.comment_count}</span>
                <span className="ml-auto">스크랩 {formatDate(p.bookmarked_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 건의하기 */}
      {tab === 'suggestions' && (
        <div className="space-y-3">
          <div className="card p-5 space-y-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle size={15}/> 건의하기
            </h3>
            <form onSubmit={submitSuggestion} className="space-y-2">
              <textarea className="input resize-none h-28 text-sm"
                placeholder="건의 내용을 입력하세요 (최대 500자)"
                value={sgInput} maxLength={500} onChange={e => setSgInput(e.target.value)}/>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{sgInput.length}/500</span>
                <button type="submit" disabled={sgSubmitting || !sgInput.trim()} className="btn-primary text-xs">
                  <Send size={12}/> {sgSubmitting ? '등록 중...' : '건의 등록'}
                </button>
              </div>
              {sgError && <p className="text-xs text-red-500">{sgError}</p>}
            </form>
          </div>
          <div className="space-y-2">
            {sgLoading ? <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-gray-400"/></div>
             : suggestions.length === 0 ? <div className="text-center py-12 text-sm text-gray-400">등록한 건의가 없습니다</div>
             : suggestions.map(s => (
              <div key={s.id} className="card px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatDate(s.created_at)}</span>
                  {s.is_replied ? <span className="text-green-500">답변 완료</span> : <span className="text-amber-500">대기중</span>}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{s.content}</p>
                {!!s.admin_reply && (
                  <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2">
                    <p className="font-semibold mb-1">관리자 답변</p>
                    <p className="whitespace-pre-wrap">{s.admin_reply}</p>
                    {s.replied_at && <p className="mt-1 text-[11px] text-blue-400">{formatDate(s.replied_at)}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 비밀번호 변경 */}
      {tab === 'password' && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Lock size={15}/> 비밀번호 변경
          </h3>
          <form onSubmit={handlePwChange} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">현재 비밀번호</label>
              <input type="password" className="input" placeholder="현재 비밀번호"
                value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} required/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">새 비밀번호</label>
              <input type="password" className="input" placeholder="6자 이상"
                value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} required/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">새 비밀번호 확인</label>
              <input type="password" className="input" placeholder="다시 입력"
                value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required/>
            </div>
            {pwMsg.text && (
              <div className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl ${
                pwMsg.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-red-50 dark:bg-red-900/20 text-red-500'
              }`}>
                {pwMsg.type === 'success' ? <Check size={14}/> : <X size={14}/>}
                {pwMsg.text}
              </div>
            )}
            <button type="submit" disabled={pwLoading} className="btn-primary w-full justify-center">
              {pwLoading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}