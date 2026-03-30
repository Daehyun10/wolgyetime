import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Search, PenSquare, RefreshCw, Lock, Heart, MessageCircle, Eye, ChevronDown, ChevronRight, Flame, Clock } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import api from '../lib/api'
import useAuthStore from '../store/authStore'
import { cn } from '../lib/utils'

function AnonAvatar({ color = '#3B82F6' }) {
  return (
    <div style={{ background: color, width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600 }}>익</div>
  )
}

/* ── 인기글/최신글 TOP5 ── */
function TopPosts() {
  const [data, setData]     = useState(null)
  const [tab, setTab]       = useState('popular') // 'popular' | 'latest'
  const [open, setOpen]     = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/posts/top').then(r => setData({ popular: r.data.popular || [], latest: r.data.latest || [] })).catch(() => setData({ popular: [], latest: [] }))
  }, [])

  const list = data ? ((tab === 'popular' ? data.popular : data.latest) || []) : []

  return (
    <div className="card mb-4 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1.5 font-semibold text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">
            {open ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
            {tab === 'popular' ? '🔥인기글TOP5' : '⏰최신글TOP5'}
          </button>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setTab('popular')}
            className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
              tab === 'popular' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
            <Flame size={11}/> 실시간
          </button>
          <button onClick={() => setTab('latest')}
            className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
              tab === 'latest' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
            <Clock size={11}/> 최신
          </button>
        </div>
      </div>

      {/* 목록 */}
      {open && (
        <div>
          {!data && <div className="flex justify-center py-6"><RefreshCw size={16} className="animate-spin text-gray-400"/></div>}
          {data && list.length === 0 && <p className="text-center text-xs text-gray-400 py-6">게시글이 없어요</p>}
          {data && list.map((p, i) => (
            <div key={p.id} onClick={() => navigate(`/post/${p.id}`)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-800/60 last:border-0">
              {/* 순위 */}
              <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                i === 0 ? 'bg-yellow-400 text-white' :
                i === 1 ? 'bg-gray-300 text-white' :
                i === 2 ? 'bg-amber-600 text-white' :
                'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400')}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{p.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-400">{p.board_icon} {p.board_name}</span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Heart size={9}/>{p.like_count}</span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Eye size={9}/>{p.view_count || 0}</span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><MessageCircle size={9}/>{p.comment_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── 게시글 카드 (제목만 보기 토글) ── */
function PostCard({ post }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const timeAgo = format(new Date(post.created_at), 'M월 d일 HH:mm')

  return (
    <article className="card overflow-hidden animate-fade-in">
      {/* 제목 행 (항상 표시) */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
        onClick={() => navigate(`/post/${post.id}`)}
      >
        <AnonAvatar color={post.anon_color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">
              {post.board_icon} {post.board_name}
            </span>
            {!!post.is_mine && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">내 글</span>}
            {!!post.is_reported_locked && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-500 font-medium">신고됨</span>}
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{post.title}</h3>
        </div>
        {/* 펼치기 버튼 */}
        <button
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
        >
          <ChevronDown size={14} className={cn('text-gray-400 transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>

      {/* 내용 미리보기 (펼침 시) */}
      {expanded && (
        <div className="px-4 pb-3 pt-0 border-t border-gray-50 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3 mt-2">{post.content}</p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
            <span className="flex items-center gap-0.5"><Heart size={10}/> {post.like_count}</span>
            <span className="flex items-center gap-0.5"><MessageCircle size={10}/> {post.comment_count}</span>
            <span className="flex items-center gap-0.5"><Eye size={10}/> {post.view_count || 0}</span>
            <span className="ml-auto">{timeAgo}</span>
          </div>
        </div>
      )}

      {/* 하단 통계 (접힘 시) */}
      {!expanded && (
        <div className="flex items-center gap-3 px-4 pb-2.5 text-[11px] text-gray-400">
          <span className="flex items-center gap-0.5"><Heart size={10} className={post.liked ? 'fill-red-400 text-red-400' : ''}/> {post.like_count}</span>
          <span className="flex items-center gap-0.5"><MessageCircle size={10}/> {post.comment_count}</span>
          <span className="flex items-center gap-0.5"><Eye size={10}/> {post.view_count || 0}</span>
          <span className="ml-auto">{timeAgo}</span>
        </div>
      )}
    </article>
  )
}

/* ── 메인 ── */
export default function BoardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const boardId = id || null
  const user = useAuthStore(s => s.user)

  const [board, setBoard]     = useState(null)
  const [posts, setPosts]     = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]   = useState('')

  useEffect(() => {
    if (!boardId) { setBoard(null); return }
    api.get('/boards').then(r => {
      setBoard(r.data.boards.find(x => x.id === parseInt(boardId)) || null)
    }).catch(() => {})
  }, [boardId])

  const fetchPosts = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = { page, limit: 20 }
      if (boardId) params.boardId = boardId
      if (search)  params.search  = search
      const { data } = await api.get('/posts', { params })
      setPosts(data.posts); setTotal(data.total)
    } catch (err) {
      setError(err.response?.data?.error || '불러올 수 없습니다.')
    } finally { setLoading(false) }
  }, [boardId, page, search])

  useEffect(() => { setPage(1) }, [boardId, search])
  useEffect(() => { fetchPosts() }, [fetchPosts])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:items-start">

      {/* ── 가운데: 게시글 목록 ── */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* 게시판 헤더 */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {board ? `${board.icon} ${board.name}` : '🏫 전체 게시판'}
              {!!board?.is_locked && <Lock size={14} className="text-amber-500"/>}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {board ? board.description : '모든 게시글이 모이는 공간'}
            </p>
          </div>
          {!board?.is_locked && (board?.name !== '공지사항' || user?.role === 'admin') && (
            <button onClick={() => navigate(boardId ? `/write/${boardId}` : '/write')} className="btn-primary flex-shrink-0 text-xs py-2">
              <PenSquare size={13}/> 글쓰기
            </button>
          )}
        </div>

        {!!board?.is_locked && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            <Lock size={13}/> 잠긴 게시판입니다.
          </div>
        )}

        {/* 검색 */}
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput) }} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input className="input pl-9 w-full text-sm" placeholder="게시글 검색..."
              value={searchInput} onChange={e => setSearchInput(e.target.value)}/>
          </div>
          {search && (
            <button type="button" className="btn-ghost text-xs px-3"
              onClick={() => { setSearch(''); setSearchInput('') }}>초기화</button>
          )}
        </form>

        {loading && <div className="flex justify-center py-12"><RefreshCw size={20} className="animate-spin text-gray-400"/></div>}
        {error && !loading && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">{error}</div>}

        {!loading && !error && (
          <>
            {posts.length === 0
              ? <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">📭</div><p className="text-sm">게시글이 없어요</p></div>
              : <div className="space-y-2">{posts.map(p => <PostCard key={p.id} post={p}/>)}</div>
            }
            {totalPages > 1 && (
              <div className="flex justify-center gap-1 pt-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={cn('w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                      page === p ? 'bg-blue-500 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700')}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 오른쪽: 인기글/최신글 TOP5 ── */}
      {/* PC: 오른쪽 고정 패널 / 모바일: 게시글 위에 표시 */}
      <div className="lg:hidden w-full order-first">
        <TopPosts />
      </div>
      <div className="hidden lg:block w-72 flex-shrink-0 sticky top-6">
        <TopPosts />
      </div>

    </div>
  )
}