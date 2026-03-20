import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, AlertTriangle, FileText, TrendingUp, Clock, ArrowRight, Sparkles, Users } from 'lucide-react'
import { snagsApi, instructionsApi } from '../lib/api'
import { formatDate, getSeverityColor } from '../lib/utils'
import { useAuth } from '../lib/AuthContext'
import { canManageProject, canCreateSnag, roleLabel } from '../lib/auth'

export default function Dashboard() {
  const { user } = useAuth()

  const { data: snags = [], isError: snagsError } = useQuery({
    queryKey: ['snags'],
    queryFn: () => snagsApi.getAll().then(res => res.data),
  })

  const { data: instructions = [], isError: instructionsError } = useQuery({
    queryKey: ['instructions'],
    queryFn: () => instructionsApi.getAll().then(res => res.data),
  })

  const recentSnags = snags.slice(0, 5)
  const recentInstructions = instructions.slice(0, 5)

  const stats = {
    totalSnags: snags.length,
    openSnags: snags.filter(s => !['closed'].includes(s.status)).length,
    criticalSnags: snags.filter(s => s.severity === 'critical').length,
    issuedInstructions: instructions.filter(i => i.status === 'issued').length,
  }

  const isPM = user ? canManageProject(user) : false

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            {isPM ? 'Project Overview' : 'My Workspace'}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {isPM ? 'Project Dashboard' : 'Delivery dashboard'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isPM
              ? 'Aggregated view across all project contributors'
              : 'Track your defects, instructions, and delivery progress'}
          </p>
          {user && (
            <p className="mt-2 text-xs text-slate-400">
              Signed in as <span className="font-medium text-slate-600">{user.name}</span>{' '}
              <span className="text-slate-400">({roleLabel(user.role)})</span>
            </p>
          )}
        </div>
        {user && canCreateSnag(user) && (
          <Link
            to="/app/snags/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            New Snag
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 p-6 text-white shadow-lg shadow-sky-500/20">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-sky-100">
                {isPM ? 'Project Snags' : 'My Snags'}
              </p>
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-3 text-4xl font-extrabold">{stats.totalSnags}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-6 text-white shadow-lg shadow-amber-500/20">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-amber-100">Open Snags</p>
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-3 text-4xl font-extrabold">{stats.openSnags}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-6 text-white shadow-lg shadow-rose-500/20">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-rose-100">Critical Snags</p>
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-3 text-4xl font-extrabold">{stats.criticalSnags}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-lg shadow-emerald-500/20">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-emerald-100">Issued Instructions</p>
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-3 text-4xl font-extrabold">{stats.issuedInstructions}</p>
          </div>
        </div>
      </div>

      {isPM && (
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <Users className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-800">Project Manager View</p>
            <p className="text-xs text-indigo-600">
              You see aggregated data from all contributors on your projects.{' '}
              <Link to="/app/crew" className="underline hover:text-indigo-800">Manage crew</Link>
            </p>
          </div>
        </div>
      )}

      {(snagsError || instructionsError) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Unable to load all dashboard data right now. Please verify API connectivity and try again.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Snags */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-rose-100">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Recent Snags</h2>
            </div>
            <Link
              to="/app/snags"
              className="inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSnags.length > 0 ? (
              recentSnags.map((snag) => (
                <Link
                  key={snag.id}
                  to={`/app/snags/${snag.id}`}
                  className="block px-6 py-4 hover:bg-sky-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{snag.title}</h3>
                      <p className="mt-1 text-sm text-slate-500 line-clamp-1">{snag.description}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs text-slate-400">{formatDate(snag.discovered_at)}</span>
                        {isPM && snag.created_by !== user?.id && (
                          <span className="text-xs text-indigo-500 font-medium">by other user</span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-1 text-xs font-bold rounded-lg border ${getSeverityColor(snag.severity)}`}
                    >
                      {snag.severity}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-10 text-center">
                <AlertTriangle className="mx-auto w-8 h-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-400">No snags yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Instructions */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-100">
                <FileText className="w-4 h-4 text-violet-600" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Recent Instructions</h2>
            </div>
            <Link
              to="/app/instructions"
              className="inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentInstructions.length > 0 ? (
              recentInstructions.map((instruction) => (
                <Link
                  key={instruction.id}
                  to={`/app/instructions/${instruction.id}`}
                  className="block px-6 py-4 hover:bg-violet-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{instruction.subject}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {instruction.ai_reference || 'No reference'}
                      </p>
                      <p className="mt-1.5 text-xs text-slate-400">
                        {formatDate(instruction.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 capitalize">
                      {instruction.status}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-10 text-center">
                <FileText className="mx-auto w-8 h-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-400">No instructions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
