import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, AlertTriangle, Search, Filter } from 'lucide-react'
import { snagsApi } from '../lib/api'
import { formatDate, formatLabel, getSeverityColor } from '../lib/utils'
import { useState } from 'react'

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="page-title">Snags</h1>
          <p className="page-subtitle">Manage construction defects and issues</p>
        </div>
        <Link
          to="/app/snags/new"
          className="btn-primary"
        >
          <Plus className="w-5 h-5" />
          <span>New Snag</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search snags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white"
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

      {/* Snags List */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load snags. Please check the backend service and try again.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredSnags.length > 0 ? (
        <div className="app-card overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredSnags.map((snag) => (
              <Link
                key={snag.id}
                to={`/app/snags/${snag.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{snag.title}</h3>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{snag.description}</p>
                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                          <span>{formatDate(snag.discovered_at)}</span>
                          {snag.compliance_flag && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded">Compliance</span>
                          )}
                          {snag.variation_risk && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded">
                              Variation Risk: {snag.variation_risk}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end space-y-2">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${getSeverityColor(snag.severity)}`}
                    >
                      {snag.severity}
                    </span>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {formatLabel(snag.status)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="app-card p-12 text-center">
          <AlertTriangle className="mx-auto w-12 h-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No snags found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search or filters' : 'Get started by creating a new snag'}
          </p>
          {!searchTerm && (
            <Link
              to="/app/snags/new"
              className="btn-primary mt-6"
            >
              <Plus className="w-5 h-5" />
              <span>Create Snag</span>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
