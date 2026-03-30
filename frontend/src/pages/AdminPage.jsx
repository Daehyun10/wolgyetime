import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import {
  BarChart2, Flag, Users, Layout, Shield,
  Trash2, X, Check, Lock, Unlock, Ban, Plus,
  AlertTriangle, Eye, RotateCcw, UserX, MessageCircle,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import api from '../lib/api'
import { cn } from '../lib/utils'

function Spinner() {
  return <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"/>
}
function Badge({ children, color = 'gray' }) {
  const map = {
    gray:   'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    blue:   'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    amber:  'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    red:    'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    green:  'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  }
  return <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${map[color]}`}>{children}</span>
}
function TabLink({ to, icon: Icon, label, end }) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) => cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap',
        isActive ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium'
                 : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60'
      )}>
      <Icon size={15}/> {label}
    </NavLink>
  )
}

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [maintenance, setMaintenance] = useState(false)
  const [mtLoading, setMtLoading] = useState(false)
  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {})
    api.get('/admin/maintenance').then(r => setMaintenance(r.data.maintenance)).catch(() => {})
  }, [])
  const toggleMaintenance = async () => {
    if (maintenance) { if (!confirm('점검 모드를 해제할까요?')) return }
    else { if (!confirm('점검 모드를 활성화할까요? 관리자 외 접속이 차단됩니다.')) return }
    setMtLoading(true)
    try { const { data } = await api.post('/admin/maintenance', { on: !maintenance }); setMaintenance(data.maintenance) }
    catch (e) { alert(e.response?.data?.error || '점검 모드 변경 실패') }
    finally { setMtLoading(false) }
  }
  if (!stats) return <div className="flex justify-center py-12"><Spinner/></div>
  const cards = [
    { label: '가입 학생',   value: stats.users,          color: 'blue' },
    { label: '총 게시글',   value: stats.posts,          color: 'green' },
    { label: '총 댓글',     value: stats.comments,       color: 'purple' },
    { label: '🟢 온라인',   value: stats.online ?? 0,    color: 'green' },
    { label: '미검토 신고', value: stats.pendingReports, color: 'amber' },
    { label: '차단 유저',   value: stats.banned,         color: 'red' },
  ]
  const colorMap = { blue:'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400', green:'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400', purple:'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400', amber:'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400', red:'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' }
  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${maintenance ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700'}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{maintenance ? '🔧' : '✅'}</span>
          <div>
            <p className={`text-sm font-bold ${maintenance ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{maintenance ? '점검 중 — 서비스 중단' : '서비스 정상 운영 중'}</p>
            <p className="text-xs text-gray-400 mt-0.5">{maintenance ? '관리자 외 모든 접속이 차단됩니다' : '점검 모드를 켜면 관리자만 접속 가능합니다'}</p>
          </div>
        </div>
        <button onClick={toggleMaintenance} disabled={mtLoading} className={`relative inline-flex h-7 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ${maintenance ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'} ${mtLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} style={{ width: 52 }}>
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${maintenance ? 'translate-x-6' : 'translate-x-1'}`}/>
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map(c => <div key={c.label} className={`rounded-xl p-4 text-center ${colorMap[c.color]}`}><p className="text-2xl font-bold">{c.value}</p><p className="text-xs mt-1 opacity-75">{c.label}</p></div>)}
      </div>
    </div>
  )
}

function ContentModal({ reportId, targetType, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.get(`/admin/reports/${reportId}/content`).then(r => setData(r.data)).catch(() => setData(null)).finally(() => setLoading(false)) }, [reportId])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-lg max-h-[80vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Eye size={15} className="text-blue-500"/>{targetType === 'post' ? '신고된 게시글' : '신고된 댓글'} 원문</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && <div className="flex justify-center py-8"><Spinner/></div>}
          {!loading && !data && <p className="text-center text-sm text-gray-400 py-8">해당 게시물을 불러올 수 없습니다.</p>}
          {!loading && data && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1"><UserX size={12}/> 작성자 정보 (관리자 전용)</p>
              {(() => { const info = data.type === 'post' ? data.post : data.comment; if (!info) return <p className="text-xs text-gray-400">정보 없음</p>; return <div className="text-xs space-y-1"><p className="text-gray-700 dark:text-gray-300"><span className="font-medium">학번:</span> {info.grade}학년 {info.class_num}반 {info.student_num}번</p><p className="text-gray-700 dark:text-gray-300"><span className="font-medium">이름:</span> {info.author_name}</p><p className="text-gray-700 dark:text-gray-300"><span className="font-medium">IP:</span> <code className="bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">{info.last_ip || info.author_ip || 'IP 없음'}</code></p></div> })()}
            </div>
          )}
          {!loading && data?.type === 'post' && data.post && <div className="space-y-3"><div className="flex items-center gap-2"><Badge color="blue">{data.post.board_icon} {data.post.board_name}</Badge></div><div><p className="text-xs text-gray-400 mb-1">제목</p><p className="text-sm font-semibold text-gray-900 dark:text-white">{data.post.title}</p></div><div><p className="text-xs text-gray-400 mb-1">내용</p><p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3">{data.post.content}</p></div></div>}
          {!loading && data?.type === 'comment' && data.comment && <div className="space-y-3"><div><p className="text-xs text-gray-400 mb-1">원본 게시글</p><p className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2">{data.comment.post_title}</p></div><div><p className="text-xs text-gray-400 mb-1">신고된 댓글</p><p className="text-sm text-gray-800 dark:text-gray-200 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2.5">{data.comment.content}</p></div></div>}
        </div>
      </div>
    </div>
  )
}

function ReportsTab() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewed, setReviewed] = useState(false)
  const [viewModal, setViewModal] = useState(null)
  const fetchReports = useCallback(async () => { setLoading(true); try { const { data } = await api.get('/admin/reports', { params: { reviewed } }); setReports(data.reports) } catch {} finally { setLoading(false) } }, [reviewed])
  useEffect(() => { fetchReports() }, [fetchReports])
  const review = async (id, action) => { try { await api.patch(`/admin/reports/${id}/review`, { action }); fetchReports() } catch (e) { alert(e.response?.data?.error || '처리 실패') } }
  const clearReviewed = async () => { if (!confirm('검토 완료된 신고 기록을 전체 삭제할까요?')) return; try { await api.delete('/admin/reports/reviewed'); fetchReports() } catch { alert('초기화 실패') } }
  const REASON_LABEL = { hate:'혐오/차별', privacy:'개인정보', spam:'스팸', sexual:'성적 콘텐츠', other:'기타' }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {[false, true].map(v => <button key={String(v)} onClick={() => setReviewed(v)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', reviewed === v ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200')}>{v ? `검토 완료 (${reports.length})` : `미검토 (${reports.length})`}</button>)}
        {reviewed && reports.length > 0 && <button onClick={clearReviewed} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors"><Trash2 size={12}/> 전체 초기화</button>}
      </div>
      {loading ? <div className="flex justify-center py-10"><Spinner/></div>
       : reports.length === 0 ? <div className="text-center py-12 text-gray-400 text-sm">신고가 없습니다</div>
       : reports.map(r => {
          let preview = r.target_preview || '(원문 없음)', previewTitle = ''
          if (r.target_type === 'post' && r.target_preview?.includes('||')) { const p = r.target_preview.split('||'); previewTitle = p[0]; preview = p[1] }
          return (
            <div key={r.id} className="card px-4 py-3 space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge color={r.target_type === 'post' ? 'blue' : 'purple'}>{r.target_type === 'post' ? '게시글' : '댓글'}</Badge>
                <Badge color="amber">{REASON_LABEL[r.reason] || r.reason}</Badge>
                <span className="text-xs text-gray-400 ml-auto">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ko })}</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2.5">
                {previewTitle && <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">{previewTitle}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{preview}</p>
              </div>
              {r.author_info && <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 text-xs space-y-0.5"><p className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1 mb-1"><UserX size={11}/> 작성자 인적사항</p><p className="text-gray-600 dark:text-gray-400">{r.author_info.grade}학년 {r.author_info.class_num}반 {r.author_info.student_num}번 {r.author_info.name}</p></div>}
              <p className="text-xs text-gray-400">신고자: {r.grade}학년 {r.class_num}반 {r.student_num}번</p>
              {!r.is_reviewed && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button onClick={() => setViewModal({ reportId: r.id, targetType: r.target_type })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition-colors"><Eye size={12}/> 원문 보기</button>
                  <button onClick={() => { if (confirm('콘텐츠를 삭제할까요?')) review(r.id, 'delete') }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors"><Check size={12}/> 삭제 확정</button>
                  <button onClick={() => review(r.id, 'restore')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 transition-colors"><RotateCcw size={12}/> 복원</button>
                  <button onClick={() => review(r.id, 'dismiss')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 transition-colors"><X size={12}/> 신고 취소</button>
                </div>
              )}
              {!!r.is_reviewed && <div className="flex items-center gap-1.5 text-xs text-green-500"><Check size={12}/> 검토 완료</div>}
            </div>
          )
        })}
      {viewModal && <ContentModal reportId={viewModal.reportId} targetType={viewModal.targetType} onClose={() => setViewModal(null)}/>}
    </div>
  )
}

function BoardsTab() {
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', icon: '📌' })
  const [err, setErr] = useState('')
  const [dragId, setDragId] = useState(null)
  const ICONS = ['📌','📚','📢','🎮','🎵','🎬','💬','🧩','🔔','🧠','📝','🧪','🏀','🍔','🎨','📷']
  const fetchBoards = useCallback(async () => { setLoading(true); try { const { data } = await api.get('/boards'); setBoards(data.boards) } catch {} finally { setLoading(false) } }, [])
  useEffect(() => { fetchBoards() }, [fetchBoards])
  const createBoard = async () => { if (!form.name.trim()) { setErr('이름을 입력해주세요.'); return }; try { await api.post('/boards', form); setModal(false); setForm({ name:'', description:'', icon:'📌' }); setErr(''); fetchBoards() } catch (e) { setErr(e.response?.data?.error || '생성 실패') } }
  const toggleLock = async id => { await api.patch(`/boards/${id}/lock`); fetchBoards() }
  const del = async id => { if (!confirm('게시판과 모든 게시글을 삭제할까요?')) return; await api.delete(`/boards/${id}`); fetchBoards() }
  const onDragStart = (e, id) => { setDragId(id); e.dataTransfer.effectAllowed = 'move' }
  const onDragOver = (e, id) => { e.preventDefault(); if (dragId === id) return; const dragged = boards.find(b => b.id === dragId); const nb = boards.filter(b => b.id !== dragId); nb.splice(nb.findIndex(b => b.id === id), 0, dragged); setBoards(nb) }
  const onDrop = async () => { setDragId(null); try { await api.patch('/boards/reorder', { orders: boards.map((b, i) => ({ id: b.id, sort_order: i })) }) } catch { fetchBoards() } }
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center"><p className="text-xs text-gray-400">드래그 앤 드롭으로 순서 변경</p><button className="btn-primary text-xs py-1.5" onClick={() => setModal(true)}><Plus size={13}/> 게시판 추가</button></div>
      {loading ? <div className="flex justify-center py-10"><Spinner/></div>
       : boards.map(b => (
          <div key={b.id} className={cn('card px-4 py-3 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-opacity', dragId === b.id && 'opacity-50')} draggable onDragStart={e => onDragStart(e, b.id)} onDragOver={e => onDragOver(e, b.id)} onDrop={onDrop} onDragEnd={() => setDragId(null)}>
            <span className="text-gray-300 text-sm select-none">≡</span><span className="text-xl">{b.icon}</span>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5">{b.name}{!!b.is_locked && <Lock size={12} className="text-amber-500"/>}</p><p className="text-xs text-gray-400 truncate">{b.description}</p></div>
            <span className="text-xs text-gray-400 flex-shrink-0">{b.post_count}개</span>
            <button onClick={() => toggleLock(b.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">{!!b.is_locked ? <Unlock size={14}/> : <Lock size={14}/>}</button>
            <button onClick={() => del(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors"><Trash2 size={14}/></button>
          </div>
        ))}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-5 animate-slide-up space-y-3">
            <h3 className="font-semibold text-sm">새 게시판 만들기</h3>
            <div className="flex flex-wrap gap-1.5">{ICONS.map(ic => <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))} className={cn('text-xl p-1.5 rounded-lg border-2 transition-all', form.icon === ic ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800')}>{ic}</button>)}</div>
            <input className="input" placeholder="게시판 이름 *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/>
            <input className="input" placeholder="설명 (선택)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/>
            {err && <p className="text-xs text-red-500">{err}</p>}
            <div className="flex gap-2"><button className="btn-ghost flex-1 text-sm py-2" onClick={() => { setModal(false); setErr('') }}>취소</button><button className="btn-primary flex-1 text-sm py-2" onClick={createBoard}>만들기</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

function UserDetailModal({ user, onClose }) {
  const [showPw, setShowPw] = useState(false)
  const isBanned = user.is_banned === true || user.is_banned === 1
  const isAlumni = user.role === 'alumni'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-sm">{isAlumni ? '졸업생' : '학생'} 상세 정보</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${isAlumni ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-500' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>{isAlumni ? '🎓' : user.name?.[0]}</div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {user.role === 'admin' && <Badge color="amber">관리자</Badge>}
                {user.role === 'alumni' && <Badge color="purple">졸업생</Badge>}
                {isBanned ? <Badge color="red">차단중</Badge> : user.online ? <Badge color="green">● 접속중</Badge> : <Badge color="gray">○ 오프라인</Badge>}
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {!isAlumni && <div className="flex justify-between"><span className="text-gray-500">학번</span><span className="font-medium">{user.grade}학년 {user.class_num}반 {user.student_num}번</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">학년도</span><span className="font-medium">{user.school_year}년</span></div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">비밀번호</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{showPw ? (user.plain_password || '없음') : '••••••••'}</span>
                <button onClick={() => setShowPw(v => !v)} className="text-xs text-blue-500 hover:underline">{showPw ? '숨기기' : '보기'}</button>
              </div>
            </div>
            <div className="flex justify-between"><span className="text-gray-500">최근 IP</span><code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{user.last_ip || '없음'}</code></div>
            <div className="flex justify-between"><span className="text-gray-500">마지막 접속</span><span className="text-xs text-gray-500">{user.last_seen ? format(new Date(user.last_seen), 'MM.dd HH:mm', { locale: ko }) : '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">가입일</span><span className="text-xs text-gray-500">{user.created_at ? format(new Date(user.created_at), 'yyyy.MM.dd', { locale: ko }) : '-'}</span></div>
            {isBanned && user.banned_reason && <div className="flex justify-between"><span className="text-gray-500">차단 사유</span><span className="text-xs text-red-500">{user.banned_reason}</span></div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function UsersTab() {
  const [users, setUsers]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [detailUser, setDetailUser]   = useState(null)
  const [banModal, setBanModal]       = useState(null)
  const [warnModal, setWarnModal]     = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = { search }
      if (filterGrade === 'alumni') { params.role = 'alumni' }
      else { if (filterGrade) params.grade = filterGrade; if (filterClass) params.class_num = filterClass }
      const { data } = await api.get('/admin/users', { params })
      setUsers(data.users)
    } catch {} finally { setLoading(false) }
  }, [search, filterGrade, filterClass])
  useEffect(() => { fetchUsers() }, [fetchUsers])

  const deleteUser = async (id, name) => { if (!confirm(`${name}의 계정을 삭제할까요?`)) return; try { await api.delete(`/admin/users/${id}`); fetchUsers() } catch (e) { alert(e.response?.data?.error || '삭제 실패') } }
  const unban = async (id) => { try { await api.patch(`/admin/users/${id}/ban`, { ban: false }); fetchUsers() } catch (e) { alert(e.response?.data?.error || '처리 실패') } }

  const alumni   = users.filter(u => u.role === 'alumni')
  const students = users.filter(u => u.role !== 'alumni')
  const grouped = students.slice()
    .sort((a, b) => (Number(a.grade)||0)-(Number(b.grade)||0) || (Number(a.class_num)||0)-(Number(b.class_num)||0) || (Number(a.student_num)||0)-(Number(b.student_num)||0))
    .reduce((acc, u) => { const g = String(u.grade??0), c = String(u.class_num??0); if (!acc[g]) acc[g]={}; if (!acc[g][c]) acc[g][c]=[]; acc[g][c].push(u); return acc }, {})
  const gradeKeys = Object.keys(grouped).filter(g => g !== '0').sort((a, b) => Number(a) - Number(b))

  const renderCard = (u) => (
    <div key={u.id} className={cn('card px-4 py-3', !!u.is_banned && 'opacity-70')}>
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setDetailUser(u)}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5 flex-wrap">
            {u.role === 'alumni' ? u.name : `${u.grade}학년 ${u.class_num}반 ${u.student_num}번 ${u.name}`}
            {u.role === 'admin'  && <Badge color="amber">관리자</Badge>}
            {u.role === 'alumni' && <Badge color="purple">졸업생</Badge>}
            {(u.is_banned===true||u.is_banned===1) ? <Badge color="red">차단중</Badge> : u.online ? <Badge color="green">● 접속중</Badge> : <Badge color="gray">○ 오프라인</Badge>}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{u.school_year}년</p>
        </div>
      </div>
      {u.role !== 'admin' && (
        <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex-wrap" onClick={e => e.stopPropagation()}>
          {(u.is_banned===true||u.is_banned===1)
            ? <button onClick={() => unban(u.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 transition-colors"><Ban size={12}/> 차단 해제</button>
            : <button onClick={() => setBanModal({ user: u })} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 transition-colors"><Ban size={12}/> 차단</button>}
          <button onClick={() => setWarnModal({ user: u })} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-orange-50 dark:bg-orange-900/20 text-orange-600 hover:bg-orange-100 transition-colors"><AlertTriangle size={12}/> 경고</button>
          <button onClick={() => deleteUser(u.id, u.name)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors"><Trash2 size={12}/> 계정 삭제</button>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-3">
      <input className="input" placeholder="이름으로 검색..." value={search} onChange={e => setSearch(e.target.value)}/>
      <div className="flex gap-1.5 flex-wrap">
        {[{value:'',label:'전체'},{value:'1',label:'1학년'},{value:'2',label:'2학년'},{value:'3',label:'3학년'},{value:'alumni',label:'🎓 졸업생'}].map(g => (
          <button key={g.value} onClick={() => { setFilterGrade(g.value); setFilterClass('') }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterGrade === g.value ? (g.value === 'alumni' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white') : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            {g.label}
          </button>
        ))}
      </div>
      {filterGrade && filterGrade !== 'alumni' && (
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilterClass('')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filterClass === '' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>전체 반</button>
          {[1,2,3,4,5,6,7,8,9,10].map(n => <button key={n} onClick={() => setFilterClass(String(n))} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filterClass === String(n) ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{n}반</button>)}
        </div>
      )}
      {loading ? <div className="flex justify-center py-10"><Spinner/></div>
       : users.length === 0 ? <div className="text-center py-12 text-sm text-gray-400">검색 결과가 없습니다</div>
       : <>
          {gradeKeys.map(g => (
            <div key={g} className="space-y-2">
              <div className="px-1 text-sm font-bold text-gray-700 dark:text-gray-200">{g}학년</div>
              {Object.keys(grouped[g]).sort((a,b) => Number(a)-Number(b)).map(c => (
                <div key={`${g}-${c}`} className="space-y-2">
                  <div className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400">{c}반</div>
                  {grouped[g][c].map(u => renderCard(u))}
                </div>
              ))}
            </div>
          ))}
          {alumni.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 px-1 pt-3 border-t border-gray-100 dark:border-gray-800">
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">🎓 졸업생</span>
                <span className="text-xs text-gray-400">({alumni.length}명)</span>
              </div>
              {alumni.sort((a,b) => a.name.localeCompare(b.name,'ko')).map(u => renderCard(u))}
            </div>
          )}
        </>
      }
      {detailUser && <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)}/>}
      {banModal   && <BanDurationModal user={banModal.user} onClose={() => { setBanModal(null); fetchUsers() }}/>}
      {warnModal  && <WarnModal user={warnModal.user} onClose={() => setWarnModal(null)}/>}
    </div>
  )
}

function BanDurationModal({ user, onClose }) {
  const [days, setDays] = useState(1)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async () => { if (!reason.trim()) { alert('차단 사유를 입력해주세요.'); return }; setLoading(true); try { await api.patch(`/admin/users/${user.id}/ban-duration`, { days, reason }); alert(`${user.name}을(를) ${days === 0 ? '영구' : days + '일'} 차단했습니다.`); onClose() } catch (e) { alert(e.response?.data?.error || '차단 실패') } finally { setLoading(false) } }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-5 space-y-4 animate-slide-up">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Ban size={15} className="text-amber-500"/> {user.name} 차단 설정</h3>
        <div><p className="text-xs text-gray-500 mb-2">차단 기간</p><div className="flex gap-2">{[1,7,0].map(d => <button key={d} onClick={() => setDays(d)} className={`flex-1 py-2 rounded-xl text-xs font-medium border-2 transition-all ${days===d ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>{d===0?'영구':d+'일'}</button>)}</div></div>
        <div><p className="text-xs text-gray-500 mb-1">차단 사유</p><input className="input" placeholder="사유를 입력하세요" value={reason} onChange={e => setReason(e.target.value)}/></div>
        <div className="flex gap-2"><button onClick={onClose} className="btn-ghost flex-1 text-sm">취소</button><button onClick={submit} disabled={loading} className="btn-danger flex-1 text-sm">{loading ? '처리 중...' : '차단 적용'}</button></div>
      </div>
    </div>
  )
}

function WarnModal({ user, onClose }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [warnings, setWarnings] = useState([])
  useEffect(() => { api.get(`/admin/users/${user.id}/warnings`).then(r => setWarnings(r.data.warnings)).catch(() => {}) }, [user.id])
  const submit = async () => { if (!reason.trim()) { alert('경고 사유를 입력해주세요.'); return }; setLoading(true); try { const { data } = await api.post(`/admin/users/${user.id}/warn`, { reason }); alert(`경고 ${data.warningCount}회 누적${data.warningCount >= 3 ? ' · 자동 차단' : ''}`); setReason(''); api.get(`/admin/users/${user.id}/warnings`).then(r => setWarnings(r.data.warnings)).catch(() => {}) } catch (e) { alert(e.response?.data?.error || '경고 실패') } finally { setLoading(false) } }
  const removeWarn = async (warnId) => { if (!confirm('이 경고를 취소할까요?')) return; try { await api.delete(`/admin/users/${user.id}/warnings/${warnId}`); api.get(`/admin/users/${user.id}/warnings`).then(r => setWarnings(r.data.warnings)).catch(() => {}) } catch (e) { alert(e.response?.data?.error || '삭제 실패') } }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-5 space-y-4 animate-slide-up">
        <h3 className="font-semibold text-sm flex items-center gap-2"><AlertTriangle size={15} className="text-orange-500"/> {user.name} 경고</h3>
        {warnings.length > 0 && <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl px-3 py-2 space-y-1"><p className="text-xs font-semibold text-orange-600 mb-1.5">누적 경고 {warnings.length}회</p>{warnings.map(w => <div key={w.id} className="flex items-center gap-2"><p className="text-[11px] text-orange-500 flex-1">- {w.reason}</p><button onClick={() => removeWarn(w.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/40 text-orange-600 hover:bg-orange-200 transition-colors">취소</button></div>)}</div>}
        <div><p className="text-xs text-gray-500 mb-1">경고 사유</p><input className="input" placeholder="경고 사유 입력" value={reason} onChange={e => setReason(e.target.value)}/><p className="text-[11px] text-gray-400 mt-1">누적 경고 3회 이상 시 자동 차단됩니다.</p></div>
        <div className="flex gap-2"><button onClick={onClose} className="btn-ghost flex-1 text-sm">취소</button><button onClick={submit} disabled={loading} className="flex-1 py-2 rounded-xl text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors">{loading ? '처리 중...' : '경고 부여'}</button></div>
      </div>
    </div>
  )
}

function BackupTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dlLoading, setDlLoading] = useState(false)
  useEffect(() => { api.get('/backup/stats').then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false)) }, [])
  const download = async () => { setDlLoading(true); try { const res = await api.get('/backup/download', { responseType: 'blob' }); const url = URL.createObjectURL(res.data); const a = document.createElement('a'); a.href=url; a.download=`backup_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url) } catch { alert('백업 다운로드 실패') } finally { setDlLoading(false) } }
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2"><RotateCcw size={15}/> DB 백업</h4>
        {loading ? <div className="flex justify-center py-6"><Spinner/></div> : stats && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[{label:'학생',value:stats.users,color:'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'},{label:'게시글',value:stats.posts,color:'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'},{label:'댓글',value:stats.comments,color:'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'},{label:'금칙어',value:stats.banned_words,color:'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}].map(s => <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}><p className="text-xl font-bold">{s.value}</p><p className="text-xs opacity-75 mt-0.5">{s.label}</p></div>)}
          </div>
        )}
        <div className="space-y-3">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-300 space-y-1"><p className="font-semibold">백업 포함 데이터</p><p>학생 정보(비밀번호 제외), 게시글, 댓글, 공지, 금칙어</p><p>JSON 형식으로 다운로드됩니다. 개인정보가 포함되어 있으니 안전하게 보관하세요.</p></div>
          <button onClick={download} disabled={dlLoading} className="btn-primary w-full justify-center flex items-center gap-2"><RotateCcw size={15} className={dlLoading ? 'animate-spin' : ''}/>{dlLoading ? '다운로드 중...' : 'DB 백업 다운로드'}</button>
        </div>
      </div>
    </div>
  )
}

function SuggestionsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyDrafts, setReplyDrafts] = useState({})
  const [savingId, setSavingId] = useState(null)
  const fetchItems = useCallback(async () => { setLoading(true); try { const { data } = await api.get('/admin/suggestions'); setItems(data.suggestions || []) } catch { setItems([]) } finally { setLoading(false) } }, [])
  useEffect(() => { fetchItems() }, [fetchItems])
  const submitReply = async (id) => { const text = replyDrafts[id] || ''; if (!text.trim()) return alert('답변 내용을 입력하세요.'); setSavingId(id); try { await api.post(`/admin/suggestions/${id}/reply`, { reply: text }); alert('답변이 등록되었습니다.'); setReplyDrafts(p => ({ ...p, [id]: '' })); fetchItems() } catch { alert('등록 실패') } finally { setSavingId(null) } }
  if (loading) return <div className="flex justify-center py-10"><Spinner/></div>
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">총 {items.length}건</p>
      {items.length === 0 ? <div className="text-center py-12 text-sm text-gray-400">건의사항이 없습니다</div>
       : items.map(s => (
        <div key={String(s.id)} className="card px-4 py-3">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs text-gray-500">{s.role === 'alumni' ? `졸업생 ${s.user_name||s.name}` : `${s.grade}학년 ${s.class_num}반 ${s.student_num}번 ${s.user_name||s.name}`}</span>
            {s.is_replied ? <Badge color="green">답변 완료</Badge> : <Badge color="amber">미답변</Badge>}
            <span className="text-[11px] text-gray-400 ml-auto">{s.created_at ? format(new Date(s.created_at), 'M.d HH:mm', { locale: ko }) : ''}</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{s.content}</p>
          {!!s.admin_reply && <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2"><p className="font-semibold mb-1">관리자 답변</p><p className="whitespace-pre-wrap">{s.admin_reply}</p>{s.replied_at && <p className="mt-1 text-[11px] text-blue-400">{format(new Date(s.replied_at), 'M.d HH:mm', { locale: ko })}</p>}</div>}
          {!s.is_replied && <div className="mt-2 space-y-2"><textarea className="input resize-none h-20 text-sm" placeholder="답변을 입력하세요" value={replyDrafts[s.id]||''} onChange={e => setReplyDrafts(p => ({ ...p, [s.id]: e.target.value }))}/><button onClick={() => submitReply(s.id)} disabled={savingId===s.id} className="btn-primary text-xs">{savingId===s.id ? '등록 중...' : '답변 등록'}</button></div>}
        </div>
      ))}
    </div>
  )
}

function BannedWordsTab() {
  const [words, setWords] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const fetchData = () => { setLoading(true); api.get('/admin/banned-words').then(r => setWords(r.data.words)).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(() => { fetchData() }, [])
  const add = async () => { if (!input.trim()) return; try { await api.post('/admin/banned-words', { word: input.trim() }); setInput(''); fetchData() } catch (e) { setErr(e.response?.data?.error || '추가 실패') } }
  const del = async (id) => { await api.delete(`/admin/banned-words/${id}`); fetchData() }
  return (
    <div className="space-y-3">
      <div className="flex gap-2"><input className="input flex-1" placeholder="금칙어 입력..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && add()}/><button className="btn-primary text-xs px-4" onClick={add}><Plus size={13}/> 추가</button></div>
      {err && <p className="text-xs text-red-500">{err}</p>}
      {loading ? <div className="flex justify-center py-8"><Spinner/></div>
       : words.length === 0 ? <div className="text-center py-10 text-sm text-gray-400">등록된 금칙어가 없습니다</div>
       : <div className="flex flex-wrap gap-2">{words.map(w => <div key={w.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-full text-sm text-red-600 dark:text-red-400">{w.word}<button onClick={() => del(w.id)} className="hover:text-red-800 transition-colors"><X size={12}/></button></div>)}</div>}
    </div>
  )
}

function NoticesTab() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', isUrgent: false, startDate: '', endDate: '' })
  const [err, setErr] = useState('')
  const fetchData = () => { setLoading(true); api.get('/notices').then(r => setNotices(r.data.notices)).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(() => { fetchData() }, [])
  const submit = async () => { if (!form.title || !form.content) { setErr('제목과 내용을 입력해주세요.'); return }; try { await api.post('/notices', form); setModal(false); setForm({ title:'', content:'', isUrgent:false, startDate:'', endDate:'' }); setErr(''); fetchData() } catch (e) { setErr(e.response?.data?.error || '등록 실패') } }
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button className="btn-primary text-xs py-1.5" onClick={() => setModal(true)}><Plus size={13}/> 공지 작성</button></div>
      {loading ? <div className="flex justify-center py-8"><Spinner/></div>
       : notices.length === 0 ? <div className="text-center py-10 text-sm text-gray-400">공지사항이 없습니다</div>
       : notices.map(n => (
          <div key={n.id} className={`card px-4 py-3 ${!!n.is_urgent ? 'border-red-200 dark:border-red-800' : ''}`}>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 flex-wrap mb-1">{!!n.is_urgent && <Badge color="red">긴급</Badge>}<p className="text-sm font-semibold text-gray-900 dark:text-white break-all">{n.title}</p></div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 break-all whitespace-pre-wrap">{n.content}</p>
                {(n.start_date||n.end_date) && <p className="text-[11px] text-gray-400 mt-1">{n.start_date} ~ {n.end_date||'종료일 없음'}</p>}
              </div>
              <button onClick={async () => { await api.delete(`/notices/${n.id}`); fetchData() }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"><Trash2 size={14}/></button>
            </div>
          </div>
        ))}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-5 space-y-3 animate-slide-up">
            <h3 className="font-semibold text-sm">공지 작성</h3>
            <input className="input" placeholder="제목" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}/>
            <textarea className="input resize-none h-28 text-sm" placeholder="내용" value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))}/>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-gray-500">시작일</label><input type="date" className="input text-sm mt-1" value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))}/></div>
              <div><label className="text-xs text-gray-500">종료일</label><input type="date" className="input text-sm mt-1" value={form.endDate} onChange={e => setForm(f => ({...f, endDate: e.target.value}))}/></div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.isUrgent} onChange={e => setForm(f => ({...f, isUrgent: e.target.checked}))}/><span className="text-red-500 font-medium">긴급 공지</span></label>
            {err && <p className="text-xs text-red-500">{err}</p>}
            <div className="flex gap-2"><button className="btn-ghost flex-1 text-sm" onClick={() => { setModal(false); setErr('') }}>취소</button><button className="btn-primary flex-1 text-sm" onClick={submit}>등록</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterLogsTab() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const fetchLogs = () => { setLoading(true); api.get('/admin/filter-logs').then(r => setLogs(r.data.logs)).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(() => { fetchLogs() }, [])
  const clearLogs = async () => { if (!confirm('필터 로그를 전체 초기화할까요?')) return; try { await api.delete('/admin/filter-logs'); fetchLogs() } catch { alert('초기화 실패') } }
  if (loading) return <div className="flex justify-center py-10"><Spinner/></div>
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">총 {logs.length}건</p>
        {logs.length > 0 && <button onClick={clearLogs} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors"><Trash2 size={12}/> 전체 초기화</button>}
      </div>
      {logs.length === 0 ? <div className="text-center py-12 text-sm text-gray-400">차단 시도가 없습니다</div>
       : logs.map(l => (
          <div key={l.id} className="card px-4 py-3">
            <div className="flex items-center gap-2 flex-wrap mb-1"><Badge color="red"><AlertTriangle size={10} className="inline mr-0.5"/>{l.matched_rule}</Badge><span className="text-xs text-gray-400">{l.grade}학년 {l.class_num}반 {l.student_num}번 {l.name} · {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ko })}</span></div>
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">{l.content}</p>
          </div>
        ))}
    </div>
  )
}

export default function AdminPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Shield size={18} className="text-amber-500"/>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">관리자 대시보드</h2>
        <Badge color="amber">Admin</Badge>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <nav className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 sm:w-40 flex-shrink-0">
          <TabLink to="/admin"             icon={BarChart2}     label="대시보드"  end/>
          <TabLink to="/admin/reports"     icon={Flag}          label="신고 관리"/>
          <TabLink to="/admin/boards"      icon={Layout}        label="게시판 관리"/>
          <TabLink to="/admin/users"       icon={Users}         label="학생 관리"/>
          <TabLink to="/admin/filters"     icon={Shield}        label="필터 로그"/>
          <TabLink to="/admin/words"       icon={AlertTriangle} label="금칙어"/>
          <TabLink to="/admin/notices"     icon={Flag}          label="공지 관리"/>
          <TabLink to="/admin/suggestions" icon={MessageCircle} label="건의함"/>
          <TabLink to="/admin/backup"      icon={RotateCcw}     label="백업"/>
        </nav>
        <div className="flex-1 min-w-0">
          <Routes>
            <Route index              element={<Dashboard/>}/>
            <Route path="reports"     element={<ReportsTab/>}/>
            <Route path="boards"      element={<BoardsTab/>}/>
            <Route path="users"       element={<UsersTab/>}/>
            <Route path="filters"     element={<FilterLogsTab/>}/>
            <Route path="words"       element={<BannedWordsTab/>}/>
            <Route path="notices"     element={<NoticesTab/>}/>
            <Route path="suggestions" element={<SuggestionsTab/>}/>
            <Route path="backup"      element={<BackupTab/>}/>
          </Routes>
        </div>
      </div>
    </div>
  )
}