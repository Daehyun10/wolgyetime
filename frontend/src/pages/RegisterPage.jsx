import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { getErrorMessage } from '../lib/utils'

export default function RegisterPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const renewal   = location.state?.renewal
  const register  = useAuthStore((s) => s.register)

  // 탭: 'student' | 'alumni'
  const [tab, setTab] = useState('student')

  const [form, setForm] = useState({
    grade:      location.state?.grade      || '',
    classNum:   location.state?.classNum   || '',
    studentNum: location.state?.studentNum || '',
    name:       location.state?.name       || '',
    password: '', confirmPw: '', adminCode: '',
  })

  const [alumniForm, setAlumniForm] = useState({
    name: '', password: '', confirmPw: '',
  })

  const [showPw, setShowPw]       = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const set  = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setA = (k) => (e) => setAlumniForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (tab === 'alumni') {
      if (!alumniForm.name.trim()) { setError('이름을 입력해주세요.'); return }
      if (alumniForm.password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }
      if (alumniForm.password !== alumniForm.confirmPw) { setError('비밀번호가 일치하지 않습니다.'); return }
      setLoading(true)
      try {
        const res = await register({
          grade: 0, classNum: 0, studentNum: 0,
          name: alumniForm.name,
          password: alumniForm.password,
          isAlumni: true,
        })
        if (res?.error) setError(res.error)
        else navigate('/')
      } catch (err) {
        setError(getErrorMessage(err))
      } finally { setLoading(false) }
      return
    }

    // 재학생 가입
    if (form.password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }
    if (form.password !== form.confirmPw) { setError('비밀번호가 일치하지 않습니다.'); return }
    setLoading(true)
    try {
      const res = await register({
        grade: form.grade, classNum: form.classNum,
        studentNum: form.studentNum, name: form.name,
        password: form.password,
        adminCode: form.adminCode || undefined,
      })
      if (res?.error) setError(res.error)
      else navigate('/')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{renewal ? '🔄' : '📝'}</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {renewal ? '학년도 재인증' : '회원가입'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
            {renewal ? '새 학년도 정보를 다시 입력해주세요' : '월계고 커뮤니티에 오신 걸 환영합니다'}
          </p>
        </div>

        {renewal && (
          <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            📅 새 학년도가 시작되었습니다. 정보를 다시 입력해주세요.
          </div>
        )}

        {/* 탭 — 재인증 중엔 숨김 */}
        {!renewal && (
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
        )}

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── 재학생 폼 ── */}
            {(tab === 'student' || renewal) && (
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
                  <input className="input" placeholder="실명 (커뮤니티엔 익명으로 표시)"
                    value={form.name} onChange={set('name')} required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">비밀번호</label>
                    <div className="relative">
                      <input className="input pr-9" type={showPw ? 'text' : 'password'}
                        placeholder="6자 이상" value={form.password} onChange={set('password')} required />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">확인</label>
                    <input className="input" type="password" placeholder="재입력"
                      value={form.confirmPw} onChange={set('confirmPw')} required />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed space-y-1">
                  <p>📌 이름·학번은 암호화 저장되며 게시글에 공개되지 않습니다</p>
                  <p>📅 매년 3월 이후 학년도 재인증이 필요합니다</p>
                  <p>✨ 관리진에게도 모든 작성물이 익명으로 보입니다</p>
                  <p>🚨기존 가입 회원들의 비밀번호는 데이터삭제로인해 111111로 변경된점 양해부탁드립니다</p>
                </div>

                <div>
                  <button type="button" onClick={() => setShowAdmin(v => !v)}
                    className="text-xs text-gray-400 hover:text-blue-500 transition-colors underline">
                    관리자 코드가 있으신가요?
                  </button>
                  {showAdmin && (
                    <input className="input mt-2" type="password" placeholder="관리자 초대 코드"
                      value={form.adminCode} onChange={set('adminCode')} />
                  )}
                </div>
              </>
            )}

            {/* ── 졸업생 폼 ── */}
            {tab === 'alumni' && !renewal && (
              <>
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl px-3 py-2.5 text-xs text-purple-700 dark:text-purple-300 space-y-1">
                  <p>🎓 졸업생은 이름과 비밀번호만으로 가입합니다</p>
                  <p>📌 이름이 같은 졸업생이 있을 경우 비밀번호로 구분됩니다</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">이름</label>
                  <input className="input" placeholder="이름 입력"
                    value={alumniForm.name} onChange={setA('name')} required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">비밀번호</label>
                    <div className="relative">
                      <input className="input pr-9" type={showPw ? 'text' : 'password'}
                        placeholder="6자 이상" value={alumniForm.password} onChange={setA('password')} required />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">확인</label>
                    <input className="input" type="password" placeholder="재입력"
                      value={alumniForm.confirmPw} onChange={setA('confirmPw')} required />
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className={`w-full justify-center py-2.5 text-sm font-semibold rounded-xl text-white transition-colors ${
                tab === 'alumni' && !renewal
                  ? 'bg-purple-500 hover:bg-purple-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}>
              {loading ? '처리 중...' : renewal ? '재인증 완료' : tab === 'alumni' ? '졸업생 가입' : '가입하기'}
            </button>
          </form>

          {!renewal && (
            <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                이미 계정이 있으신가요?{' '}
                <Link to="/login" className="text-blue-500 hover:text-blue-600 font-medium">로그인</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}