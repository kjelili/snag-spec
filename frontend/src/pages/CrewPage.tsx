import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, UserCircle } from 'lucide-react'
import { snagsApi } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { roleLabel, canManageCrew } from '../lib/auth'

export default function CrewPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  const { data: metaOptions, isLoading } = useQuery({
    queryKey: ['snag-meta-options'],
    queryFn: () => snagsApi.getMetaOptions().then((r) => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (name: string) => snagsApi.createUserOption(name).then((r) => r.data),
    onSuccess: () => {
      setNewName('')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['snag-meta-options'] })
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed to add member'),
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    addMutation.mutate(newName.trim())
  }

  if (!user || !canManageCrew(user)) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-2">
          Only Project Managers, Contract Administrators, and Employer's Agents can manage the crew.
        </p>
      </div>
    )
  }

  const members = metaOptions?.users ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Crew</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage team members who can be assigned to snags and instructions.
        </p>
      </div>

      {/* Add member */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4">Add team member</h2>
        {error && (
          <div className="mb-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Full name"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 transition-shadow"
          />
          <button
            type="submit"
            disabled={addMutation.isPending || !newName.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 text-white text-sm font-semibold shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 disabled:opacity-50 transition-all"
          >
            <Plus className="w-4 h-4" />
            {addMutation.isPending ? 'Adding...' : 'Add'}
          </button>
        </form>
      </div>

      {/* Members list */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            Team members ({members.length})
          </h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center">
            <UserCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No team members yet. Add someone above.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sky-100 to-violet-100 text-sky-700 text-sm font-bold">
                  {member.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                  <p className="text-xs text-slate-500">Team member</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
