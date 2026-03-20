import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, LogIn, UserPlus, ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { roleLabel, type UserRole } from '../lib/auth'

const ROLES: UserRole[] = ['project_manager', 'architect', 'site_manager', 'contractor', 'viewer']

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('architect')
  const [error, setError] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) {
      setError('Email is required.')
      return
    }
    const user = login(email.trim())
    if (!user) {
      setError('No account found with that email. Please register first.')
      return
    }
    navigate('/app/dashboard')
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    if (!email.trim()) {
      setError('Email is required.')
      return
    }
    register(name.trim(), email.trim(), role)
    navigate('/app/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.2),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.15),transparent_50%)]" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 shadow-lg shadow-sky-500/30">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Snag-to-Spec</h1>
            <p className="text-xs text-slate-400">Contract Intelligence Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
          {/* Tab toggle */}
          <div className="flex gap-1 rounded-xl bg-white/5 p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:outline-none transition-all"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all hover:-translate-y-0.5"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:outline-none transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:outline-none transition-all"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all hover:-translate-y-0.5"
              >
                <UserPlus className="w-4 h-4" />
                Create Account
              </button>
            </form>
          )}

          {/* Privacy notice */}
          <div className="mt-6 flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-300 leading-relaxed">
              Your data stays on your device. Nothing is sent to external servers. Each user has their own isolated workspace.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
