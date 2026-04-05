import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Heart, Flag, Trash2, Send, MessageCircle, Eye,
  Pencil, Check, X, CornerDownRight, AlertTriangle,
  Bookmark, Share2,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import api from '../lib/api'
import useAuthStore from '../store/authStore'
import ReportModal from '../components/ui/ReportModal'
import { getErrorMessage } from '../lib/utils'

function AnonAvatar({ color = '#3B82F6', size = 32 }) {
  return (
    <div style={{
      background: color, width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.35, fontWeight: 600,
    }}>익</div>
  )
}

function formatDate(dateStr) {
  try { return format(new Date(dateStr), 'M월 d일 HH:mm', { locale: ko }) }
  catch { return '' }
}

function ReplyItem({ reply, isAdmin, onDelete, onReport, displayName }) {
  const [liked, setLiked]         = useState(!!reply.liked)
  const [likes, setLikes]         = useState(Number(reply.like_count) || 0)
  const [editing, setEditing]     = useState(false)
  const [editText, setEditText]   = useState(reply.content)
  const [editLoading, setEL]      = useState(false)
  const [displayContent, setDC]   = useState(reply.content)
  const [isEdited, setIsEdited]   = useState(!!reply.is_edited)

  const toggleLike = async () => {
    try {
      const { data } = await api.post(`/comments/${reply.id}/like`)
      setLiked(data.liked); setLikes(data.likeCount)
    } catch {}
  }
  const submitEdit = async () => {
    if (!editText.trim()) return
    setEL(true)
    try {
      const { data } = await api.patch(`/comments/${reply.id}`, { content: editText.trim() })
      setDC(data.comment?.content ?? editText.trim())
      setIsEdited(true)
      setEditing(false)
    } catch (e) { alert(getErrorMessage(e)) }
    finally { setEL(false) }
  }

  return (
    <div className="flex gap-2">
      <CornerDownRight size={13} className="text-gray-300 flex-shrink-0 mt-2"/>
      <div className="flex gap-2 flex-1">
        <AnonAvatar color={reply.anon_color} size={24}/>
        <div className="flex-1 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[11px] font-medium ${reply.is_post_author ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
              {displayName(reply)}
            </span>
            <span className="text-[11px] text-gray-400">{formatDate(reply.created_at)}</span>
            {isEdited && <span className="text-[10px] text-gray-400">(수정됨)</span>}
            {!!reply.is_reported_locked && isAdmin && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-500">신고됨</span>}
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={toggleLike} className={`flex items-center gap-0.5 text-[10px] transition-colors ${liked ? 'text-red-400' : 'text-gray-300 hover:text-red-400'}`}>
                <Heart size={10} className={liked ? 'fill-red-400' : ''}/>{likes > 0 && <span>{likes}</span>}
              </button>
              {!reply.is_mine && <button onClick={() => onReport({ type: 'comment', id: reply.id })} className="text-gray-300 hover:text-red-400 transition-colors"><Flag size={10}/></button>}
              {!!reply.is_mine && !reply.is_reported_locked && !editing && (
                <button onClick={() => { setEditing(true); setEditText(displayContent) }} className="text-gray-300 hover:text-blue-400 transition-colors"><Pencil size={10}/></button>
              )}
              {(!!reply.is_mine || isAdmin) && !reply.is_reported_locked && <button onClick={() => onDelete(reply.id)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={10}/></button>}
            </div>
          </div>
          {editing ? (
            <div className="space-y-1.5 mt-1">
              <textarea className="input w-full text-xs resize-none" rows={2}
                value={editText} onChange={e => setEditText(e.target.value)} maxLength={300}/>
              <div className="flex gap-1">
                <button onClick={submitEdit} disabled={editLoading} className="btn-primary text-[10px] py-1 px-2 flex items-center gap-0.5">
                  <Check size={10}/>{editLoading ? '...' : '저장'}
                </button>
                <button onClick={() => { setEditing(false); setEditText(displayContent) }} className="btn-ghost text-[10px] py-1 px-2 flex items-center gap-0.5">
                  <X size={10}/>취소
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed break-all whitespace-pre-wrap">{displayContent}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function CommentItem({ comment, replies, postId, isAdmin, onDelete, onReport, onReplyAdded }) {
  const [likedCmt, setLikedCmt]     = useState(!!comment.liked)
  const [likesCmt, setLikesCmt]     = useState(Number(comment.like_count) || 0)
  const [showReply, setShowReply]   = useState(false)
  const [replyText, setReplyText]   = useState('')
  const [replyLoading, setRL]       = useState(false)
  const [replyErr, setReplyErr]     = useState('')
  const [editing, setEditing]       = useState(false)
  const [editText, setEditText]     = useState(comment.content)
  const [editLoading, setEL]        = useState(false)
  const [displayContent, setDC]     = useState(comment.content)
  const [isEdited, setIsEdited]     = useState(!!comment.is_edited)

  const myReplies = replies.filter(r => r.parent_id === comment.id)
  const displayName = (c) => c.is_post_author ? `${c.anon_name} (글쓴이)` : c.anon_name

  const toggleLike = async () => {
    try {
      const { data } = await api.post(`/comments/${comment.id}/like`)
      setLikedCmt(data.liked); setLikesCmt(data.likeCount)
    } catch {}
  }

  const submitReply = async () => {
    if (!replyText.trim()) return
    setRL(true); setReplyErr('')
    try {
      const { data } = await api.post('/comments', { postId, content: replyText.trim(), parentId: comment.id })
      onReplyAdded(data.comment)
      setReplyText(''); setShowReply(false)
    } catch (e) { setReplyErr(getErrorMessage(e)) }
    finally { setRL(false) }
  }

  const submitEdit = async () => {
    if (!editText.trim()) return
    setEL(true)
    try {
      const { data } = await api.patch(`/comments/${comment.id}`, { content: editText.trim() })
      setDC(data.comment?.content ?? editText.trim())
      setIsEdited(true)
      setEditing(false)
    } catch (e) { alert(getErrorMessage(e)) }
    finally { setEL(false) }
  }

  return (
    <div>
      <div className="flex gap-2.5">
        <AnonAvatar color={comment.anon_color} size={28}/>
        <div className="flex-1 bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3.5 py-2.5">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-xs font-medium ${comment.is_post_author ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
              {displayName(comment)}
            </span>
            <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
            {isEdited && <span className="text-[10px] text-gray-400">(수정됨)</span>}
            {!!comment.is_reported_locked && isAdmin && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-500">신고됨</span>}
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={toggleLike} className={`flex items-center gap-0.5 text-[11px] transition-colors ${likedCmt ? 'text-red-400' : 'text-gray-300 hover:text-red-400'}`}>
                <Heart size={11} className={likedCmt ? 'fill-red-400' : ''}/>{likesCmt > 0 && <span>{likesCmt}</span>}
              </button>
              <button onClick={() => setShowReply(v => !v)}
                className={`flex items-center gap-0.5 text-[11px] transition-colors ${showReply ? 'text-blue-400' : 'text-gray-300 hover:text-blue-400'}`}
                title="답글">
                <MessageCircle size={11}/>
              </button>
              {!comment.is_mine && <button onClick={() => onReport({ type: 'comment', id: comment.id })} className="text-gray-300 hover:text-red-400 transition-colors p-0.5"><Flag size={11}/></button>}
              {!!comment.is_mine && !comment.is_reported_locked && !editing && (
                <button onClick={() => { setEditing(true); setEditText(displayContent) }} className="text-gray-300 hover:text-blue-400 transition-colors p-0.5"><Pencil size={11}/></button>
              )}
              {(!!comment.is_mine || isAdmin) && !comment.is_reported_locked && (
                <button onClick={() => onDelete(comment.id)} className="text-gray-300 hover:text-red-400 transition-colors p-0.5"><Trash2 size={11}/></button>
              )}
            </div>
          </div>
          {editing ? (
            <div className="space-y-1.5">
              <textarea className="input w-full text-sm resize-none" rows={3}
                value={editText} onChange={e => setEditText(e.target.value)} maxLength={500}/>
              <div className="flex gap-1.5">
                <button onClick={submitEdit} disabled={editLoading} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                  <Check size={12}/>{editLoading ? '저장 중...' : '저장'}
                </button>
                <button onClick={() => { setEditing(false); setEditText(displayContent) }} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1">
                  <X size={12}/>취소
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-all whitespace-pre-wrap">{displayContent}</p>
          )}
        </div>
      </div>

      {myReplies.length > 0 && (
        <div className="ml-9 mt-2 space-y-2">
          {myReplies.map(r => (
            <ReplyItem key={r.id} reply={r} isAdmin={isAdmin}
              onDelete={onDelete} onReport={onReport} displayName={displayName}/>
          ))}
        </div>
      )}

      {showReply && (
        <div className="ml-9 mt-2">
          <div className="flex gap-2">
            <input className="input flex-1 text-xs" placeholder="익명으로 답글 달기..."
              value={replyText} onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitReply()} maxLength={300}/>
            <button onClick={submitReply} disabled={replyLoading || !replyText.trim()} className="btn-primary px-3 text-xs">
              {replyLoading ? '...' : <Send size={13}/>}
            </button>
            <button onClick={() => setShowReply(false)} className="btn-ghost px-3 text-xs"><X size={13}/></button>
          </div>
          {replyErr && <p className="text-xs text-red-500 mt-1">{replyErr}</p>}
        </div>
      )}
    </div>
  )
}

function PollSection({ postId }) {
  const [poll, setPoll] = useState(null)
  useEffect(() => {
    api.get(`/polls/${postId}`).then(r => setPoll(r.data.poll)).catch(() => {})
  }, [postId])

  const handleVote = async (optionId) => {
    try {
      await api.post(`/polls/${postId}/vote`, { optionId })
      const { data } = await api.get(`/polls/${postId}`)
      setPoll(data.poll)
    } catch {}
  }

  if (!poll) return null
  return (
    <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700">
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">📊 {poll.question}</p>
      <div className="space-y-2">
        {poll.options.map(opt => (
          <button key={opt.id} onClick={() => handleVote(opt.id)}
            className={`w-full text-left rounded-xl overflow-hidden border transition-all ${opt.voted ? 'border-blue-400 dark:border-blue-600' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}>
            <div className="relative px-3 py-2.5">
              <div className="absolute inset-0 rounded-xl transition-all"
                style={{ width: `${opt.percent}%`, background: opt.voted ? 'rgba(59,130,246,0.15)' : 'rgba(156,163,175,0.1)' }}/>
              <div className="relative flex items-center justify-between">
                <span className={`text-sm font-medium ${opt.voted ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {opt.voted && '✓ '}{opt.label}
                </span>
                <span className="text-xs text-gray-400">{opt.percent}% ({opt.vote_count}표)</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-2 text-right">총 {poll.totalVotes}표</p>
    </div>
  )
}

export default function PostDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user    = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'

  const [post, setPost]         = useState(null)
  const [comments, setComments] = useState([])
  const [replies, setReplies]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [commentText, setCT]    = useState('')
  const [cmtLoading, setCL]     = useState(false)
  const [cmtError, setCE]       = useState('')
  const [liked, setLiked]       = useState(false)
  const [likeCount, setLC]      = useState(0)
  const [bookmarked, setBM]     = useState(false)
  const [copyDone, setCD]       = useState(false)
  const [reportTarget, setRT]   = useState(null)
  const [editing, setEditing]   = useState(false)
  const [editTitle, setET]      = useState('')
  const [editContent, setEC]    = useState('')
  const [editErr, setEE]        = useState('')
  const [editLoading, setEL]    = useState(false)

  useEffect(() => {
    fetchPost()
    setCT('')   // ✅ 댓글 입력창 초기화
    setCE('')   // ✅ 댓글 에러 초기화
    setEditing(false) // ✅ 수정 모드 초기화
    setEE('')   // ✅ 수정 에러 초기화
  }, [id])

  async function fetchPost() {
    setLoading(true); setError('')
    try {
      const { data } = await api.get(`/posts/${id}`)
      setPost(data.post); setComments(data.comments ?? []); setReplies(data.replies ?? [])
      setLiked(!!data.post.liked); setLC(data.post.like_count); setBM(!!data.post.bookmarked)
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  async function handleLike() {
    try {
      const { data } = await api.post(`/posts/${id}/like`)
      setLiked(data.liked); setLC(c => data.liked ? c + 1 : c - 1)
    } catch {}
  }

  async function handleBookmark() {
    try { const { data } = await api.post(`/bookmarks/${id}`); setBM(data.bookmarked) } catch {}
  }

  async function handleShare() {
    const url = window.location.href
    try { await navigator.clipboard.writeText(url); setCD(true); setTimeout(() => setCD(false), 2000) }
    catch { window.prompt('URL을 복사하세요:', url) }
  }

  async function handleDeletePost() {
    if (!confirm('이 게시글을 삭제할까요?')) return
    try { await api.delete(`/posts/${id}`); navigate(-1) }
    catch (err) { alert(getErrorMessage(err)) }
  }

  async function handleSaveEdit() {
    if (!editTitle.trim() || !editContent.trim()) { setEE('제목과 내용을 입력해주세요.'); return }
    setEL(true); setEE('')
    try {
      const { data } = await api.patch(`/posts/${id}`, { title: editTitle, content: editContent })
      // ✅ data.post가 없을 경우 editTitle/editContent로 직접 업데이트
      setPost(p => ({
        ...p,
        title:   data.post?.title   ?? editTitle,
        content: data.post?.content ?? editContent,
      }))
      setEditing(false)
    } catch (err) { setEE(getErrorMessage(err)) }
    finally { setEL(false) }
  }

  async function handleComment(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    setCL(true); setCE('')
    try {
      const { data } = await api.post('/comments', { postId: parseInt(id), content: commentText.trim() })
      setComments(c => [...c, { ...data.comment, is_mine: true, is_post_author: !!post?.is_mine, liked: false, like_count: 0 }])
      setCT('')
    } catch (err) { setCE(getErrorMessage(err)) }
    finally { setCL(false) }
  }

  async function handleDeleteComment(cmtId) {
    if (!confirm('댓글을 삭제할까요?')) return
    try {
      await api.delete(`/comments/${cmtId}`)
      setComments(c => c.filter(x => x.id !== cmtId))
      setReplies(r => r.filter(x => x.id !== cmtId))
    } catch (err) { alert(getErrorMessage(err)) }
  }

  if (loading) return <div className="flex justify-center items-center py-20"><div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"/></div>
  if (error)   return <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">{error}</div>
  if (!post)   return null

  const isOwner   = !!post.is_mine
  const canEdit   = isOwner && !post.is_reported_locked
  const canDelete = (isOwner && !post.is_reported_locked) || isAdmin

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <article className="card p-5">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">
            {post.board_icon} {post.board_name}
          </span>
          {!!post.is_mine && <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">내 글</span>}
          {!!post.is_reported_locked && isAdmin && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/30 text-red-500 font-medium">
              <AlertTriangle size={11}/> 신고됨
            </span>
          )}
        </div>

        {editing
          ? <input className="input w-full text-lg font-bold mb-4" value={editTitle} onChange={e => setET(e.target.value)} maxLength={100}/>
          : <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4 leading-snug">{post.title}</h1>
        }

        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100 dark:border-gray-800">
          <AnonAvatar color={post.anon_color}/>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">익명</p>
            <p className="text-xs text-gray-400">{formatDate(post.created_at)}</p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
            <Eye size={13}/> {post.view_count || 0}
          </div>
        </div>

        {editing
          ? <textarea
              className="input w-full resize-y min-h-[160px] mb-4"
              value={editContent}
              onChange={e => setEC(e.target.value)}
            />
          : (
            <div className="w-full overflow-hidden">
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-all mb-6">
                {post.content}
              </p>
            </div>
          )
        }

        {editErr && <p className="text-xs text-red-500 mb-3">{editErr}</p>}
        {!editing && <PollSection postId={id}/>}

        <div className="flex items-center gap-2 flex-wrap">
          {!editing && (
            <button onClick={handleLike}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                liked ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-500'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              <Heart size={15} className={liked ? 'fill-red-400' : ''}/> {likeCount}
            </button>
          )}
          {!editing && (
            <span className="flex items-center gap-1.5 px-3.5 py-2 text-sm text-gray-500">
              <MessageCircle size={15}/> {comments.length + replies.length}
            </span>
          )}
          <div className="ml-auto flex gap-1.5 flex-wrap">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <X size={14}/> 취소
                </button>
                <button onClick={handleSaveEdit} disabled={editLoading} className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <Check size={14}/> {editLoading ? '저장 중...' : '저장'}
                </button>
              </>
            ) : (
              <>
                <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-transparent">
                  {copyDone ? <><Check size={14} className="text-green-500"/> 복사됨</> : <><Share2 size={14}/> 공유</>}
                </button>
                <button onClick={handleBookmark}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors border ${
                    bookmarked ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-500'
                               : 'border-transparent text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'}`}>
                  <Bookmark size={14} className={bookmarked ? 'fill-yellow-400' : ''}/> {bookmarked ? '스크랩됨' : '스크랩'}
                </button>
                {!isOwner && (
                  <button onClick={() => setRT({ type: 'post', id: post.id })}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-transparent">
                    <Flag size={14}/> 신고
                  </button>
                )}
                {canEdit && (
                  <button onClick={() => { setEditing(true); setET(post.title); setEC(post.content) }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-transparent">
                    <Pencil size={14}/> 수정
                  </button>
                )}
                {canDelete && (
                  <button onClick={handleDeletePost}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-transparent">
                    <Trash2 size={14}/> 삭제
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </article>

      <section className="card p-5">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-5">
          댓글 <span className="text-blue-500">{comments.length + replies.length}</span>
        </h3>
        <div className="space-y-4 mb-5">
          {comments.length === 0 && replies.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">첫 번째 댓글을 남겨보세요!</p>
          )}
          {comments.map(c => (
            <CommentItem key={c.id} comment={c} replies={replies}
              postId={parseInt(id)} isAdmin={isAdmin}
              onDelete={handleDeleteComment} onReport={setRT}
              onReplyAdded={r => setReplies(prev => [...prev, {
                ...r, is_mine: true, is_post_author: !!post?.is_mine, liked: false, like_count: 0,
              }])}
            />
          ))}
        </div>
        <form onSubmit={handleComment} className="flex gap-2">
          <input className="input flex-1" placeholder="익명으로 댓글 달기..."
            value={commentText} onChange={e => setCT(e.target.value)} maxLength={500}/>
          <button type="submit" disabled={cmtLoading || !commentText.trim()} className="btn-primary px-4">
            {cmtLoading ? '...' : <Send size={15}/>}
          </button>
        </form>
        {cmtError && (
          <div className="flex items-start gap-2 mt-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-3 py-2.5">
            <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5"/>
            <p className="text-xs text-red-600 dark:text-red-400">{cmtError}</p>
          </div>
        )}
      </section>

      {reportTarget && (
        <ReportModal targetType={reportTarget.type} targetId={reportTarget.id} onClose={() => setRT(null)}/>
      )}
    </div>
  )
}