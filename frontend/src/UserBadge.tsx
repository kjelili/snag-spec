import { LogOut, User } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { roleLabel } from '../lib/auth'
import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'

export default function UserBadge() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition-all hover:bg-slate-50 hover:border-slate-300"
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 text-white text-xs font-bold">
          {initials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</p>
          <p className="text-[10px] text-slate-500 leading-tight">{roleLabel(user.role)}</p>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl z-50 py-2">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
            <span className="inline-flex mt-1.5 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
              {roleLabel(user.role)}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
