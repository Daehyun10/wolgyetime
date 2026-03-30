import { Heart, MessageCircle, AlertTriangle, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { timeAgo } from '../../lib/utils'

export default function PostCard({ post }) {
  const navigate = useNavigate()

  return (
    <article
      onClick={() => navigate(`/post/${post.id}`)}
      className="card p-4 cursor-pointer hover:shadow-md hover:border-gray-200
        dark:hover:border-gray-700 transition-all duration-150 animate-slide-up"
    >
      {/* 상단 메타 */}
      <div className="flex items-center gap-2 mb-2.5">
        {/* 익명 아바타 */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
          style={{ background: post.anon_color }}
        >
          익
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400">익명</span>
            <span className="text-[11px] text-gray-300 dark:text-gray-600">·</span>
            <span className="text-[11px] text-gray-400">{timeAgo(post.created_at)}</span>
            {post.board_name && (
              <>
                <span className="text-[11px] text-gray-300 dark:text-gray-600">·</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {post.board_icon} {post.board_name}
                </span>
              </>
            )}
            {post.is_mine && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-500 font-medium">
                내 글
              </span>
            )}
            {post.is_hidden && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/30 text-red-500 font-medium flex items-center gap-0.5">
                <EyeOff size={10} /> 숨김
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 제목 */}
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-1">
        {post.title}
      </h2>

      {/* 내용 미리보기 */}
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-3">
        {post.content}
      </p>

      {/* 하단 stats */}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Heart size={13} className={post.liked ? 'fill-red-400 text-red-400' : ''} />
          {post.like_count}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle size={13} />
          {post.comment_count}
        </span>
        {post.report_count > 0 && (
          <span className="flex items-center gap-1 text-orange-400 ml-auto">
            <AlertTriangle size={12} />
            {post.report_count}건 신고
          </span>
        )}
      </div>
    </article>
  )
}
