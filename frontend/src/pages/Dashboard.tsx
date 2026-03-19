import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, AlertTriangle, FileText, TrendingUp, Clock } from 'lucide-react'
import { snagsApi, instructionsApi } from '../lib/api'
import { formatDate, getSeverityColor } from '../lib/utils'

export default function Dashboard() {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Delivery dashboard</h1>
          <p className="page-subtitle">Track active defects, instruction flow, and delivery momentum</p>
        </div>
        <Link
          to="/app/snags/new"
          className="btn-primary"
        >
          <Plus className="w-5 h-5" />
          <span>New Snag</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="app-card app-card-hover p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Snags</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalSnags}</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="app-card app-card-hover p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Open Snags</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.openSnags}</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="app-card app-card-hover p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Snags</p>
              <p className="mt-2 text-3xl font-bold text-red-600">{stats.criticalSnags}</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="app-card app-card-hover p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Issued Instructions</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.issuedInstructions}</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {(snagsError || instructionsError) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load all dashboard data right now. Please verify API connectivity and try again.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Snags */}
        <div className="app-card overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Snags</h2>
            <Link
              to="/app/snags"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentSnags.length > 0 ? (
              recentSnags.map((snag) => (
                <Link
                  key={snag.id}
                  to={`/app/snags/${snag.id}`}
                  className="block p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{snag.title}</h3>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{snag.description}</p>
                      <p className="mt-2 text-xs text-gray-400">{formatDate(snag.discovered_at)}</p>
                    </div>
                    <span
                      className={`ml-4 px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(snag.severity)}`}
                    >
                      {snag.severity}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                <p className="text-sm">No snags yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Instructions */}
        <div className="app-card overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Instructions</h2>
            <Link
              to="/app/instructions"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentInstructions.length > 0 ? (
              recentInstructions.map((instruction) => (
                <Link
                  key={instruction.id}
                  to={`/app/instructions/${instruction.id}`}
                  className="block p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{instruction.subject}</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {instruction.ai_reference || 'No reference'}
                      </p>
                      <p className="mt-2 text-xs text-gray-400">
                        {formatDate(instruction.created_at)}
                      </p>
                    </div>
                    <span className="ml-4 px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                      {instruction.status}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                <p className="text-sm">No instructions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
