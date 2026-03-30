import clsx from 'clsx'

/* ── Spinner ── */
export function Spinner({ size = 'md', className }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size]
  return (
    <div className={clsx('animate-spin rounded-full border-2 border-gray-200 border-t-blue-500', s, className)} />
  )
}

/* ── Badge ── */
export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    blue:   'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    red:    'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    green:  'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    amber:  'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  }
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', colors[color])}>
      {children}
    </span>
  )
}

/* ── Alert ── */
export function Alert({ type = 'error', children }) {
  const styles = {
    error:   'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    info:    'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  }
  return (
    <div className={clsx('px-4 py-3 rounded-lg border text-sm animate-fade-in', styles[type])}>
      {children}
    </div>
  )
}

/* ── Modal ── */
export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative card w-full max-w-md p-6 animate-slide-up">
        {title && <h2 className="text-base font-semibold mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  )
}

/* ── Empty State ── */
export function EmptyState({ icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
      {desc && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{desc}</p>}
    </div>
  )
}

/* ── Avatar (익명) ── */
export function AnonAvatar({ color = '#3B82F6', size = 'md' }) {
  const s = { sm: 'w-7 h-7 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' }[size]
  return (
    <div
      className={clsx('rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0', s)}
      style={{ backgroundColor: color }}
    >
      익
    </div>
  )
}

/* ── Select ── */
export function Select({ className, ...props }) {
  return (
    <select
      className={clsx(
        'px-3 py-2.5 rounded-lg text-sm bg-gray-50 dark:bg-gray-800/60',
        'border border-gray-200 dark:border-gray-700',
        'text-gray-900 dark:text-gray-100',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500',
        'transition-colors duration-150',
        className
      )}
      {...props}
    />
  )
}
