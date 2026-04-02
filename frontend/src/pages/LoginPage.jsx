import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { getErrorMessage } from '../lib/utils'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  // 탭: 'student' | 'alumni'
  const [tab, setTab] = useState('student')

  const [form, setForm] = useState({ grade: '', classNum: '', studentNum: '', name: '', password: '' })
  const [alumniForm, setAlumniForm] = useState({ name: '', password: '' })

  const [showPw, setShowPw]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [bannedReason, setBannedReason] = useState('')

  const set  = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setA = (k) => (e) => setAlumniForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setBannedReason('')
    setLoading(true)
    try {
      const payload = tab === 'alumni'
        ? { grade: 0, classNum: 0, studentNum: 0, name: alumniForm.name, password: alumniForm.password, isAlumni: true }
        : form

      const res = await login(payload)
      if (res?.needsRenewal) {
        navigate('/register', { state: { renewal: true, ...form } })
      } else if (res?.error) {
        setError(res.error)
        if (res.bannedReason) setBannedReason(res.bannedReason)
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏫</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">월계고 에타</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">익명 커뮤니티</p>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4">
          <button onClick={() => { setTab('student'); setError('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'student'
                ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}>
            🎒 재학생
          </button>
          <button onClick={() => { setTab('alumni'); setError('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'alumni'
                ? 'bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}>
            🎓 졸업생
          </button>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── 재학생 폼 ── */}
            {tab === 'student' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">학번</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select className="input" value={form.grade} onChange={set('grade')} required>
                      <option value="">학년</option>
                      <option>1</option><option>2</option><option>3</option>
                    </select>
                    <select className="input" value={form.classNum} onChange={set('classNum')} required>
                      <option value="">반</option>
                      {Array.from({length:10},(_,i)=><option key={i+1}>{i+1}</option>)}
                    </select>
                    <select className="input" value={form.studentNum} onChange={set('studentNum')} required>
                      <option value="">번호</option>
                      {Array.from({length:40},(_,i)=><option key={i+1}>{i+1}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">이름</label>
                  <input className="input" placeholder="실명 입력" value={form.name} onChange={set('name')} required />
                </div>
              </>
            )}

            {/* ── 졸업생 폼 ── */}
            {tab === 'alumni' && (
              <>
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl px-3 py-2.5 text-xs text-purple-700 dark:text-purple-300">
                  🎓 졸업생은 이름과 비밀번호로 로그인합니다
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">이름</label>
                  <input className="input" placeholder="이름 입력" value={alumniForm.name} onChange={setA('name')} required />
                </div>
              </>
            )}

            {/* 비밀번호 (공통) */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">비밀번호</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'}
                  placeholder="비밀번호"
                  value={tab === 'alumni' ? alumniForm.password : form.password}
                  onChange={tab === 'alumni' ? setA('password') : set('password')}
                  required />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {/* ✅ 비밀번호 초기화 안내 */}
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                ⚠️ 데이터베이스 초기화로 인해 기존 가입자들의 비밀번호는 <span className="font-bold">111111</span>로 설정되어 있습니다. 로그인 후 마이페이지 → 비밀번호에서 변경해 주세요.
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
                <p>{error}</p>
                {bannedReason && <p className="text-xs mt-1 text-red-500">차단 사유: {bannedReason}</p>}
              </div>
            )}

            <button type="submit" disabled={loading}
              className={`w-full justify-center py-2.5 text-sm font-semibold rounded-xl text-white transition-colors ${
                tab === 'alumni'
                  ? 'bg-purple-500 hover:bg-purple-600'
                  : 'btn-primary'
              }`}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              계정이 없으신가요?{' '}
              <Link to="/register" className="text-blue-500 hover:text-blue-600 font-medium">회원가입</Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
          🔒 게시글은 완전 익명으로 보호됩니다
        </p>
      </div>
    </div>
  )
}