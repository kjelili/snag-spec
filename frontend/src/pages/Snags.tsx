import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, AlertTriangle, Search, Filter, ArrowRight } from 'lucide-react'
import { snagsApi } from '../lib/api'
import { formatDate, formatLabel, getSeverityColor } from '../lib/utils'
import { useState } from 'react'

const severityDot: Record<string, string> = {
  critical: 'bg-rose-500',
  high: 'bg-orange-500',
  med: 'bg-amber-400',
  low: 'bg-sky-400',
}

export default function Snags() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data: snags = [], isLoading, isError } = useQuery({
    queryKey: ['snags', statusFilter],
    queryFn: () => snagsApi.getAll(undefined, statusFilter || undefined).then(res => res.data),
  })

  const filteredSnags = snags.filter(
    (snag) =>
      snag.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      snag.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 mb-3">
            <AlertTriangle className="w-3.5 h-3.5" />
            Defect register
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Snags</h1>
          <p className="mt-1 text-sm text-slate-500">Manage construction defects and issues</p>
        </div>
        <Link
          to="/app/snags/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          New Snag
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search snags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 transition-shadow"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 appearance-none transition-shadow"
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="triage">Triage</option>
            <option value="ready_to_instruct">Ready to Instruct</option>
            <option value="instructed">Instructed</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Unable to load snags. Please check the backend service and try again.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-sky-200 border-t-sky-500" />
        </div>
      ) : filteredSnags.length > 0 ? (
        <div className="grid gap-3">
          {filteredSnags.map((snag) => (
            <Link
              key={snag.id}
              to={`/app/snags/${snag.id}`}
              className="group relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md hover:border-sky-200 transition-all duration-200 hover:-translate-y-0.5"
            >
              {/* Severity accent bar */}
              <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${severityDot[snag.severity] || 'bg-slate-300'}`} />

              <div className="flex items-start justify-between gap-4 pl-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-sky-700 transition-colors">
                      {snag.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{snag.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400">{formatDate(snag.discovered_at)}</span>
                    {snag.compliance_flag && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-rose-700 font-semibold">
                        Compliance
                      </span>
                    )}
                    {snag.variation_risk && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 font-semibold">
                        Variation: {snag.variation_risk}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-lg border ${getSeverityColor(snag.severity)}`}
                  >
                    {snag.severity}
                  </span>
                  <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 capitalize">
                    {formatLabel(snag.status)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 transition-colors mt-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 mb-4">
            <AlertTriangle className="w-7 h-7 text-rose-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No snags found</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            {searchTerm ? 'Try adjusting your search or filters' : 'Get started by creating a new snag'}
          </p>
          {!searchTerm && (
            <Link
              to="/app/snags/new"
              className="inline-flex items-center gap-2 mt-6 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Snag
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
