import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { ROLES } from '../lib/auth'
import type { UserRole } from '../lib/AuthContext'
import { Building2 } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/app/dashboard'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('architect')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Valid email is required')
      return
    }

    const userId = btoa(email.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)

    login({
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role,
    })

    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-400 to-violet-500 rounded-2xl shadow-xl shadow-sky-500/25 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Snag-to-Spec</h1>
          <p className="text-sm text-slate-400 mt-1">Contract Intelligence Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Sign in</h2>
          <p className="text-sm text-slate-500 mb-6">
            Enter your details to access your local workspace.
            All data stays on your device.
          </p>

          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Mitchell"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 transition-shadow"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sarah@practice.co.uk"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 transition-shadow"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1.5">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 transition-shadow"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all hover:-translate-y-0.5"
            >
              Enter workspace
            </button>
          </form>

          <div className="mt-6 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <p className="text-xs text-slate-500">
              No account needed. Your identity is stored locally and used to namespace your data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
