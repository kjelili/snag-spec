import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Send, Download, Edit2, Save } from 'lucide-react'
import { instructionsApi } from '../lib/api'
import { formatDate, formatDateTime, formatLabel, getStatusColor } from '../lib/utils'
import { useEffect, useState } from 'react'

export default function InstructionDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [draftSubject, setDraftSubject] = useState('')
  const [draftBody, setDraftBody] = useState('')

  const { data: instruction, isLoading, isError } = useQuery({
    queryKey: ['instruction', id],
    queryFn: () => instructionsApi.getById(id!).then(res => res.data),
    enabled: !!id,
  })

  const submitMutation = useMutation({
    mutationFn: () => instructionsApi.submit(id!).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruction', id] })
      queryClient.invalidateQueries({ queryKey: ['instructions'] })
    },
  })

  const approveMutation = useMutation({
    mutationFn: () => instructionsApi.approve(id!).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruction', id] })
      queryClient.invalidateQueries({ queryKey: ['instructions'] })
    },
  })

  const issueMutation = useMutation({
    mutationFn: () => instructionsApi.issue(id!).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruction', id] })
      queryClient.invalidateQueries({ queryKey: ['instructions'] })
    },
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      instructionsApi
        .update(id!, {
          subject: draftSubject,
          body_markdown: draftBody,
        })
        .then((res) => res.data),
    onSuccess: () => {
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['instruction', id] })
      queryClient.invalidateQueries({ queryKey: ['instructions'] })
    },
  })

  useEffect(() => {
    if (!instruction || isEditing) {
      return
    }
    setDraftSubject(instruction.subject)
    setDraftBody(instruction.body_markdown)
  }, [instruction, isEditing])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!instruction) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Instruction not found</p>
        <Link to="/app/instructions" className="mt-4 text-primary-600 hover:text-primary-700">
          Back to Instructions
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/app/instructions"
            className="flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{instruction.subject}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {instruction.ai_reference || 'Draft Instruction'} • Created {formatDate(instruction.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-4 py-2 text-sm font-medium rounded-full border ${getStatusColor(instruction.status)}`}>
            {instruction.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Unable to refresh this instruction right now. Showing the latest available data.
            </div>
          )}

          {/* Instruction Body */}
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="prose max-w-none">
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">ARCHITECT'S INSTRUCTION</h2>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {instruction.ai_reference && (
                    <div>
                      <span className="font-medium">Reference:</span> {instruction.ai_reference}
                    </div>
                  )}
                  {instruction.issued_at && (
                    <div>
                      <span className="font-medium">Issued:</span> {formatDate(instruction.issued_at)}
                    </div>
                  )}
                </div>
              </div>
              {isEditing ? (
                <div className="space-y-4">
                  <input
                    value={draftSubject}
                    onChange={(event) => setDraftSubject(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                  <textarea
                    value={draftBody}
                    onChange={(event) => setDraftBody(event.target.value)}
                    rows={14}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                </div>
              ) : (
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {instruction.body_markdown}
                </div>
              )}
            </div>
          </div>

          {/* Clause References */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contract Clauses</h2>
            <p className="text-sm text-gray-500">
              Clause references would appear here. In production, this would link to the specific clauses.
            </p>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              {instruction.status === 'draft' && (
                <button
                  onClick={() => {
                    setDraftSubject(instruction.subject)
                    setDraftBody(instruction.body_markdown)
                    setIsEditing(!isEditing)
                  }}
                  className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>{isEditing ? 'Cancel edit' : 'Edit draft'}</span>
                </button>
              )}
              {instruction.status === 'draft' && (
                <button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitMutation.isPending ? 'Submitting...' : 'Send for Review'}</span>
                </button>
              )}
              {instruction.status === 'review' && (
                <button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{approveMutation.isPending ? 'Approving...' : 'Approve instruction'}</span>
                </button>
              )}
              {instruction.status === 'draft' && isEditing && (
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !draftSubject.trim() || !draftBody.trim()}
                  className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{saveMutation.isPending ? 'Saving...' : 'Save draft changes'}</span>
                </button>
              )}
              {instruction.status === 'approved' && (
                <button
                  onClick={() => issueMutation.mutate()}
                  disabled={issueMutation.isPending}
                  className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>{issueMutation.isPending ? 'Issuing...' : 'Issue Instruction'}</span>
                </button>
              )}
              <button
                onClick={() => {
                  const content = [
                    instruction.subject,
                    '',
                    instruction.body_markdown,
                  ].join('\n')
                  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
                  const link = document.createElement('a')
                  link.href = URL.createObjectURL(blob)
                  link.download = `${instruction.subject.toLowerCase().replace(/\s+/g, '-')}.txt`
                  document.body.appendChild(link)
                  link.click()
                  link.remove()
                  URL.revokeObjectURL(link.href)
                }}
                className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download TXT</span>
              </button>
              {(submitMutation.isError || approveMutation.isError || issueMutation.isError || saveMutation.isError) && (
                <p className="text-xs text-red-600">
                  Action failed. Confirm status flow and backend availability, then retry.
                </p>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="font-medium text-gray-900 capitalize">{formatLabel(instruction.status)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type</span>
                <span className="font-medium text-gray-900 capitalize">
                  {formatLabel(instruction.instruction_type)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created</span>
                <span className="font-medium text-gray-900">{formatDateTime(instruction.created_at)}</span>
              </div>
              {instruction.issued_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Issued</span>
                  <span className="font-medium text-gray-900">{formatDateTime(instruction.issued_at)}</span>
                </div>
              )}
              {instruction.response_required_by && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Response Required</span>
                  <span className="font-medium text-gray-900">{formatDate(instruction.response_required_by)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
