import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Menu,
  X,
  Building2,
  Users,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useAuth } from '../lib/AuthContext'
import { canManageCrew, canManageProject } from '../lib/auth'
import UserBadge from './UserBadge'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { user } = useAuth()

  // Build nav items based on role
  const navItems = [
    { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { path: '/app/snags', label: 'Snags', icon: AlertTriangle, show: true },
    { path: '/app/instructions', label: 'Instructions', icon: FileText, show: true },
    {
      path: '/app/crew',
      label: 'Crew',
      icon: Users,
      show: user ? canManageCrew(user) : false,
    },
    { path: '/app/data-ownership', label: 'Data ownership', icon: ShieldCheck, show: true },
  ].filter((item) => item.show)

  return (
    <div className="min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-5 border-b border-white/10">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-sky-400 to-violet-500 rounded-xl shadow-lg shadow-sky-500/25 transition-transform group-hover:scale-105">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-tight group-hover:text-sky-300 transition-colors">
                  Snag-to-Spec
                </h1>
                <p className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors">
                  Contract Intelligence
                </p>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-sky-500/20 to-violet-500/10 text-white font-semibold shadow-sm shadow-sky-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-colors',
                      isActive ? 'text-sky-400' : 'text-slate-500'
                    )}
                  />
                  <span className="text-sm">{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User info at bottom of sidebar */}
          {user && (
            <div className="px-4 py-3 border-t border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 text-white text-xs font-bold">
                  {user.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 border-t border-white/10">
            <p className="text-[11px] text-slate-500 text-center">© 2026 Snag-to-Spec</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white/80 border-b border-slate-200/80 backdrop-blur-xl lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-4 ml-auto">
            <div className="hidden md:flex items-center space-x-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Local workspace
              </span>
            </div>
            <UserBadge />
          </div>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
