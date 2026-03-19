import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileText, Search, Filter } from 'lucide-react'
import { instructionsApi } from '../lib/api'
import { formatDate, getStatusColor } from '../lib/utils'
import { useState } from 'react'

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="page-title">Instructions</h1>
          <p className="page-subtitle">Architect's Instructions and Contract Documents</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search instructions..."
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
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="approved">Approved</option>
            <option value="issued">Issued</option>
          </select>
        </div>
      </div>

      {/* Instructions List */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load instructions. Please verify the backend service and retry.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredInstructions.length > 0 ? (
        <div className="app-card overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredInstructions.map((instruction) => (
              <Link
                key={instruction.id}
                to={`/app/instructions/${instruction.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-primary-100 rounded-lg">
                        <FileText className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{instruction.subject}</h3>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {instruction.body_markdown.substring(0, 200)}
                          {instruction.body_markdown.length > 200 ? '...' : ''}
                        </p>
                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                          <span>{instruction.ai_reference || 'No reference'}</span>
                          <span>{formatDate(instruction.created_at)}</span>
                          {instruction.issued_at && (
                            <span className="text-green-600">Issued {formatDate(instruction.issued_at)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end space-y-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(instruction.status)}`}>
                      {instruction.status}
                    </span>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 capitalize">
                      {instruction.instruction_type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="app-card p-12 text-center">
          <FileText className="mx-auto w-12 h-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No instructions found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search or filters' : 'Instructions will appear here once generated'}
          </p>
        </div>
      )}
    </div>
  )
}
