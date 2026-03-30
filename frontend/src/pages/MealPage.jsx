import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, UtensilsCrossed, Calendar } from 'lucide-react'
import { format, addDays, isWeekend } from 'date-fns'
import { ko } from 'date-fns/locale'
import api from '../lib/api'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const MEAL_COLORS = [
  'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800',
  'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800',
  'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800',
  'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800',
  'bg-pink-50 dark:bg-pink-900/20 border-pink-100 dark:border-pink-800',
  'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800',
]

export default function MealPage() {
  const [date, setDate]       = useState(new Date())
  const [meal, setMeal]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const dateStr = format(date, 'yyyy-MM-dd')
  const isWeekendDay = isWeekend(date)

  const fetchMeal = useCallback(async () => {
    setLoading(true); setError(''); setMeal(null)
    try {
      const { data } = await api.get('/meal', { params: { date: dateStr } })
      setMeal(data)
    } catch (err) {
      setError(err.response?.data?.error || '급식 정보를 불러올 수 없습니다.')
    } finally { setLoading(false) }
  }, [dateStr])

  useEffect(() => { fetchMeal() }, [fetchMeal])

  function prevDay() { setDate(d => addDays(d, -1)) }
  function nextDay() { setDate(d => addDays(d, 1)) }
  function goToday() { setDate(new Date()) }

  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')
  const dayLabel = DAY_LABELS[date.getDay()]

  return (
    <div className="max-w-lg mx-auto space-y-4">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          🍱 오늘의 급식
        </h2>
        {!isToday && (
          <button onClick={goToday}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-100 transition-colors">
            오늘로
          </button>
        )}
      </div>

      {/* 날짜 네비게이션 */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <button onClick={prevDay}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft size={20} className="text-gray-500"/>
          </button>

          <div className="text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {format(date, 'M월 d일', { locale: ko })}
              <span className={`ml-2 text-base font-semibold ${
                date.getDay() === 0 ? 'text-red-500' :
                date.getDay() === 6 ? 'text-blue-500' :
                'text-gray-400'
              }`}>({dayLabel})</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {format(date, 'yyyy년', { locale: ko })}
              {isToday && <span className="ml-1.5 text-blue-500 font-medium">• 오늘</span>}
            </p>
          </div>

          <button onClick={nextDay}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronRight size={20} className="text-gray-500"/>
          </button>
        </div>
      </div>

      {/* 급식 내용 */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <RefreshCw size={24} className="animate-spin text-gray-400"/>
        </div>
      )}

      {error && !loading && (
        <div className="card p-6 text-center">
          <p className="text-4xl mb-3">😵</p>
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={fetchMeal} className="btn-ghost mt-3 text-xs">다시 시도</button>
        </div>
      )}

      {!loading && !error && isWeekendDay && (
        <div className="card p-8 text-center">
          <p className="text-5xl mb-4">🏖️</p>
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">주말엔 급식이 없어요</p>
          <p className="text-xs text-gray-400 mt-1">맛있는 거 사먹어요 😄</p>
        </div>
      )}

      {!loading && !error && !isWeekendDay && meal && (
        <>
          {meal.menu && meal.menu.length > 0 ? (
            <div className="card overflow-hidden">
              {/* 상단 바 */}
              <div className="px-5 py-3 bg-orange-500 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">🍽️ {meal.mealType}</span>
                </div>
                {meal.calories && (
                  <span className="text-orange-100 text-xs font-medium">{meal.calories}</span>
                )}
              </div>

              {/* 메뉴 목록 */}
              <div className="p-4 space-y-2">
                {meal.menu.map((item, i) => (
                  <div key={i}
                    className={`rounded-xl px-4 py-2.5 border text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2 ${MEAL_COLORS[i % MEAL_COLORS.length]}`}>
                    <span className="text-gray-300 text-xs font-bold w-4 flex-shrink-0">{i + 1}</span>
                    {item}
                  </div>
                ))}
              </div>

              {/* 캐시 여부 */}
              <div className="px-5 py-2 border-t border-gray-50 dark:border-gray-800 flex items-center gap-1.5">
                <Calendar size={11} className="text-gray-300"/>
                <span className="text-[10px] text-gray-300">
                  {meal.cached ? '캐시된 데이터' : '방금 불러온 데이터'}
                </span>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center">
              <UtensilsCrossed size={40} className="text-gray-300 mx-auto mb-4"/>
              <p className="text-base font-semibold text-gray-600 dark:text-gray-400">급식 정보가 없어요</p>
              <p className="text-xs text-gray-400 mt-1">공휴일이거나 아직 등록되지 않았어요</p>
            </div>
          )}
        </>
      )}

      {/* 안내 */}
      <div className="text-center text-xs text-gray-400 pb-2">
        출처: 나이스 교육정보 개방 포털 · 월계고등학교
      </div>
    </div>
  )
}