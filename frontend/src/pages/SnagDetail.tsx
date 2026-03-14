import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileText, AlertTriangle, Clock, CheckCircle2, Sparkles } from 'lucide-react'
import { snagsApi, instructionsApi } from '../lib/api'
import { formatDate, formatLabel, getSeverityColor, getStatusColor } from '../lib/utils'

export default function SnagDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: snag, isLoading, isError } = useQuery({
    queryKey: ['snag', id],
    queryFn: () => snagsApi.getById(id!).then(res => res.data),
    enabled: !!id,
  })

  const { data: clauseSuggestions = [], isError: clausesError } = useQuery({
    queryKey: ['snag-clauses', id],
    queryFn: () => snagsApi.getClauseSuggestions(id!).then(res => res.data),
    enabled: !!id,
  })

  const generateInstructionMutation = useMutation({
    mutationFn: () => instructionsApi.generate(id!, 'architect_instruction').then(res => res.data),
    onSuccess: (instruction) => {
      queryClient.invalidateQueries({ queryKey: ['instructions'] })
      navigate(`/app/instructions/${instruction.id}`)
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!snag) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Snag not found</p>
        <Link to="/app/snags" className="mt-4 text-primary-600 hover:text-primary-700">
          Back to Snags
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/app/snags"
          className="flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{snag.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Discovered on {formatDate(snag.discovered_at)}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`px-4 py-2 text-sm font-medium rounded-full border ${getSeverityColor(snag.severity)}`}
          >
            {snag.severity}
          </span>
          <span className={`px-4 py-2 text-sm font-medium rounded-full border ${getStatusColor(snag.status)}`}>
            {formatLabel(snag.status)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Unable to refresh snag details right now. Showing last available data.
            </div>
          )}

          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{snag.description}</p>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Severity</p>
                  <p className="text-sm text-gray-600 capitalize">{snag.severity}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Status</p>
                  <p className="text-sm text-gray-600 capitalize">{formatLabel(snag.status)}</p>
                </div>
              </div>
              {snag.compliance_flag && (
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Compliance Issue</p>
                    <p className="text-sm text-red-600">Yes</p>
                  </div>
                </div>
              )}
              {snag.variation_risk && (
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Variation Risk</p>
                    <p className="text-sm text-orange-600 capitalize">{snag.variation_risk}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Clause Suggestions */}
          {clausesError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              Clause suggestions are currently unavailable for this snag.
            </div>
          )}

          {clauseSuggestions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Suggested Contract Clauses</h2>
              <div className="space-y-3">
                {clauseSuggestions.map((clause: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <FileText className="w-5 h-5 text-primary-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Clause {clause.clause_number || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">{clause.clause_title || 'No title'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {/* Generate Instruction */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <button
              onClick={() => generateInstructionMutation.mutate()}
              disabled={generateInstructionMutation.isPending || snag.status === 'instructed'}
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              <Sparkles className="w-5 h-5" />
              <span>
                {generateInstructionMutation.isPending
                  ? 'Generating...'
                  : 'Generate Architect\'s Instruction'}
              </span>
            </button>
            {snag.status === 'instructed' && (
              <p className="mt-3 text-xs text-gray-500 text-center">
                Instruction already generated for this snag
              </p>
            )}
            {generateInstructionMutation.isError && (
              <p className="mt-3 text-xs text-center text-red-600">
                Unable to generate instruction. Confirm the snag has valid contract and defect type details.
              </p>
            )}
          </div>

          {/* Quick Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Discovered</span>
                <span className="font-medium text-gray-900">{formatDate(snag.discovered_at)}</span>
              </div>
              {snag.due_by && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Due By</span>
                  <span className="font-medium text-gray-900">{formatDate(snag.due_by)}</span>
                </div>
              )}
              {snag.closed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Closed</span>
                  <span className="font-medium text-gray-900">{formatDate(snag.closed_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
