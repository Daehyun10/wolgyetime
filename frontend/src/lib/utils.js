import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import clsx from 'clsx'

export function cn(...args) {
  return clsx(...args)
}

export function timeAgo(dateStr) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ko })
  } catch {
    return ''
  }
}

export function getErrorMessage(err) {
  return err?.response?.data?.error || err?.message || '오류가 발생했습니다.'
}
