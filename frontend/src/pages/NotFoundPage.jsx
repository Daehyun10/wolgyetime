import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-gray-50 dark:bg-gray-950">
      <div className="text-6xl mb-5">🔍</div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">페이지를 찾을 수 없어요</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">요청하신 페이지가 존재하지 않습니다.</p>
      <button className="btn-primary" onClick={() => navigate('/')}>홈으로 가기</button>
    </div>
  )
}
