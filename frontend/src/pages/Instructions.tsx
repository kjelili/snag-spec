import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileText, Search, Filter, ArrowRight } from 'lucide-react'
import { instructionsApi } from '../lib/api'
import { formatDate, getStatusColor } from '../lib/utils'
import { useState } from 'react'

const statusGlow: Record<string, string> = {
  draft: 'border-l-slate-400',
  review: 'border-l-amber-400',
  approved: 'border-l-violet-500',
  issued: 'border-l-emerald-500',
}

export default function Instructions() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data: instructions = [], isLoading, isError } = useQuery({
    queryKey: ['instructions', statusFilter],
    queryFn: () => instructionsApi.getAll(undefined, statusFilter || undefined).then(res => res.data),
  })

  const filteredInstructions = instructions.filter(
    (instruction) =>
      instruction.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instruction.body_markdown.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 mb-3">
            <FileText className="w-3.5 h-3.5" />
            Contract documents
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Instructions</h1>
          <p className="mt-1 text-sm text-slate-500">Architect's Instructions and Contract Documents</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search instructions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 transition-shadow"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 appearance-none transition-shadow"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="approved">Approved</option>
            <option value="issued">Issued</option>
          </select>
        </div>
      </div>

      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Unable to load instructions. Please verify the backend service and retry.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-violet-200 border-t-violet-500" />
        </div>
      ) : filteredInstructions.length > 0 ? (
        <div className="grid gap-3">
          {filteredInstructions.map((instruction) => (
            <Link
              key={instruction.id}
              to={`/app/instructions/${instruction.id}`}
              className={`group relative rounded-2xl border border-slate-200/80 border-l-4 ${statusGlow[instruction.status] || 'border-l-slate-300'} bg-white p-5 shadow-sm hover:shadow-md hover:border-violet-200 transition-all duration-200 hover:-translate-y-0.5`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-sky-100 shrink-0">
                    <FileText className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-violet-700 transition-colors">
                      {instruction.subject}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 line-clamp-1 leading-relaxed">
                      {instruction.body_markdown.substring(0, 200)}
                      {instruction.body_markdown.length > 200 ? '...' : ''}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      {instruction.ai_reference && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-sky-600 font-semibold">
                          {instruction.ai_reference}
                        </span>
                      )}
                      <span>{formatDate(instruction.created_at)}</span>
                      {instruction.issued_at && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          Issued {formatDate(instruction.issued_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${getStatusColor(instruction.status)}`}>
                    {instruction.status}
                  </span>
                  <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 capitalize">
                    {instruction.instruction_type.replace('_', ' ')}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors mt-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-sky-100 mb-4">
            <FileText className="w-7 h-7 text-violet-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No instructions found</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            {searchTerm ? 'Try adjusting your search or filters' : 'Instructions will appear here once generated'}
          </p>
        </div>
      )}
    </div>
  )
}
