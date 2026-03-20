import { useAuth } from '../lib/AuthContext'
import { canManageCrew, getProjectUsers, getRegisteredUsers, roleLabel } from '../lib/auth'
import { Users, ShieldCheck, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { snagsApi } from '../lib/api'

export default function CrewPage() {
  const { user } = useAuth()

  const { data: meta } = useQuery({
    queryKey: ['snag-meta-options'],
    queryFn: () => snagsApi.getMetaOptions().then((r) => r.data),
  })

  if (!user || !canManageCrew(user)) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <AlertTriangle className="mx-auto w-12 h-12 text-amber-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-500">
          Crew management is available to Project Managers only.
        </p>
      </div>
    )
  }

  const allUsers = getRegisteredUsers()
  const projectIds = user.projectIds

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 mb-3">
          <Users className="w-3.5 h-3.5" />
          Team management
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Crew</h1>
        <p className="mt-1 text-sm text-slate-500">
          View registered users and project team members
        </p>
      </div>

      {/* All registered users */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              All Registered Users ({allUsers.length})
            </h2>
            <p className="text-xs text-slate-500">
              Users who have created accounts on this device
            </p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {allUsers.length > 0 ? (
            allUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sky-100 to-violet-100 text-sm font-bold text-sky-700">
                  {u.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {u.name}
                    {u.id === user.id && (
                      <span className="ml-2 text-xs text-sky-600 font-medium">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
                <span className="shrink-0 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {roleLabel(u.role)}
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {u.projectIds.length} project{u.projectIds.length !== 1 ? 's' : ''}
                </span>
              </div>
            ))
          ) : (
            <div className="px-6 py-10 text-center text-sm text-slate-400">
              No registered users yet.
            </div>
          )}
        </div>
      </section>

      {/* Per-project breakdown */}
      {projectIds.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Your Projects</h2>
          {projectIds.map((projId) => {
            const projectUsers = getProjectUsers(projId)
            const projectName =
              meta?.projects.find((p) => p.id === projId)?.name || `Project ${projId.slice(0, 8)}`

            return (
              <div
                key={projId}
                className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-800">{projectName}</h3>
                  <p className="text-xs text-slate-500">
                    {projectUsers.length} team member{projectUsers.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {projectUsers.length > 0 ? (
                    projectUsers.map((pu) => (
                      <div key={pu.id} className="flex items-center gap-3 px-6 py-3">
                        <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center text-xs font-bold text-sky-700">
                          {pu.name[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-slate-700">{pu.name}</span>
                        <span className="ml-auto text-xs text-slate-400">
                          {roleLabel(pu.role)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="px-6 py-4 text-sm text-slate-400">No team members yet.</div>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      )}

      <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-emerald-800">Data isolation guaranteed</p>
          <p className="text-xs text-emerald-700 mt-1">
            Each user's snags and instructions are stored in their own isolated namespace. As a
            Project Manager, you can view aggregated project data but cannot modify other users'
            records directly.
          </p>
        </div>
      </div>
    </div>
  )
}
