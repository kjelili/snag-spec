import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { isLocalStorageMode, snagsApi } from '../lib/api'
import { useForm } from 'react-hook-form'
import { useEffect, useMemo, useState } from 'react'

interface SnagFormData {
  title: string
  description: string
  severity: 'low' | 'med' | 'high' | 'critical'
  compliance_flag: boolean
  project_id: string
  contract_id: string
  defect_type_id: string
  created_by: string
}

export default function CreateSnag() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [newProjectName, setNewProjectName] = useState('')
  const [newContractName, setNewContractName] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newDefectTypeName, setNewDefectTypeName] = useState('')
  const [metaActionError, setMetaActionError] = useState('')
  const localModeEnabled = useMemo(() => isLocalStorageMode(), [])
  const { register, handleSubmit, watch, getValues, setValue, formState: { errors } } = useForm<SnagFormData>({
    defaultValues: {
      severity: 'med',
      compliance_flag: false,
    },
  })

  const selectedProjectId = watch('project_id')

  const { data: metaOptions, isLoading: isMetaLoading, isError: isMetaError } = useQuery({
    queryKey: ['snag-meta-options'],
    queryFn: () => snagsApi.getMetaOptions().then((res) => res.data),
  })

  const projectContracts = useMemo(
    () =>
      metaOptions?.contracts.filter(
        (contract) => contract.project_id === selectedProjectId
      ) ?? [],
    [metaOptions?.contracts, selectedProjectId]
  )

  const hasProjects = (metaOptions?.projects.length ?? 0) > 0
  const hasContracts = (metaOptions?.contracts.length ?? 0) > 0
  const hasUsers = (metaOptions?.users.length ?? 0) > 0

  const createMutation = useMutation({
    mutationFn: (data: SnagFormData) => snagsApi.create(data).then(res => res.data),
    onSuccess: (snag) => {
      queryClient.invalidateQueries({ queryKey: ['snags'] })
      navigate(`/app/snags/${snag.id}`)
    },
  })

  const createProjectMutation = useMutation({
    mutationFn: (name: string) => snagsApi.createProjectOption(name).then((res) => res.data),
    onSuccess: (project) => {
      setMetaActionError('')
      setNewProjectName('')
      queryClient.invalidateQueries({ queryKey: ['snag-meta-options'] })
      setValue('project_id', project.id)
    },
    onError: (error) => {
      setMetaActionError(error instanceof Error ? error.message : 'Unable to add project.')
    },
  })

  const createContractMutation = useMutation({
    mutationFn: ({ projectId, label }: { projectId: string; label: string }) =>
      snagsApi.createContractOption(projectId, label).then((res) => res.data),
    onSuccess: (contract) => {
      setMetaActionError('')
      setNewContractName('')
      queryClient.invalidateQueries({ queryKey: ['snag-meta-options'] })
      setValue('contract_id', contract.id)
    },
    onError: (error) => {
      setMetaActionError(error instanceof Error ? error.message : 'Unable to add contract.')
    },
  })

  const createUserMutation = useMutation({
    mutationFn: (name: string) => snagsApi.createUserOption(name).then((res) => res.data),
    onSuccess: (user) => {
      setMetaActionError('')
      setNewUserName('')
      queryClient.invalidateQueries({ queryKey: ['snag-meta-options'] })
      setValue('created_by', user.id)
    },
    onError: (error) => {
      setMetaActionError(error instanceof Error ? error.message : 'Unable to add user.')
    },
  })

  const createDefectTypeMutation = useMutation({
    mutationFn: (name: string) => snagsApi.createDefectTypeOption(name).then((res) => res.data),
    onSuccess: (defectType) => {
      setMetaActionError('')
      setNewDefectTypeName('')
      queryClient.invalidateQueries({ queryKey: ['snag-meta-options'] })
      setValue('defect_type_id', defectType.id)
    },
    onError: (error) => {
      setMetaActionError(error instanceof Error ? error.message : 'Unable to add defect type.')
    },
  })

  const onSubmit = (data: SnagFormData) => {
    createMutation.mutate(data)
  }

  useEffect(() => {
    if (!metaOptions) {
      return
    }
    if (!getValues('project_id') && metaOptions.projects.length > 0) {
      setValue('project_id', metaOptions.projects[0].id)
    }
    if (!getValues('created_by') && metaOptions.users.length > 0) {
      setValue('created_by', metaOptions.users[0].id)
    }
    if (!getValues('defect_type_id') && metaOptions.defect_types.length > 0) {
      setValue('defect_type_id', metaOptions.defect_types[0].id)
    }
  }, [getValues, metaOptions, setValue])

  useEffect(() => {
    if (projectContracts.length === 0) {
      setValue('contract_id', '')
      return
    }
    const currentContract = getValues('contract_id')
    const existsInProject = projectContracts.some((contract) => contract.id === currentContract)
    if (!existsInProject) {
      setValue('contract_id', projectContracts[0].id)
    }
  }, [getValues, projectContracts, setValue])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/app/snags"
          className="flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Snag</h1>
          <p className="mt-1 text-sm text-gray-500">Log a construction defect with full contract context</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">
        <div className="flex items-start space-x-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-800">Input quality matters</h3>
            <p className="mt-1 text-sm text-blue-700">
              Rich, precise snag detail improves AI clause mapping and instruction quality.
            </p>
          </div>
        </div>

        {isMetaError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Unable to load project metadata. Please check backend data and retry.
          </div>
        )}

        {!isMetaLoading && (!hasProjects || !hasContracts || !hasUsers) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Required setup data is missing. Add at least one project, contract, and user before creating a snag.
          </div>
        )}

        {metaActionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {metaActionError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-2">
              Project <span className="text-red-500">*</span>
            </label>
            <select
              id="project_id"
              {...register('project_id', { required: 'Project is required' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select project</option>
              {metaOptions?.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {errors.project_id && (
              <p className="mt-1 text-sm text-red-600">{errors.project_id.message}</p>
            )}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder="New project name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                type="button"
                disabled={!localModeEnabled || createProjectMutation.isPending || !newProjectName.trim()}
                onClick={() => createProjectMutation.mutate(newProjectName)}
                className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                {createProjectMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
            {!localModeEnabled && (
              <p className="mt-1 text-xs text-gray-500">
                Add project is available in local mode. For remote mode, create project in backend.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="contract_id" className="block text-sm font-medium text-gray-700 mb-2">
              Contract <span className="text-red-500">*</span>
            </label>
            <select
              id="contract_id"
              {...register('contract_id', { required: 'Contract is required' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select contract</option>
              {projectContracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.label}
                </option>
              ))}
            </select>
            {errors.contract_id && (
              <p className="mt-1 text-sm text-red-600">{errors.contract_id.message}</p>
            )}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newContractName}
                onChange={(event) => setNewContractName(event.target.value)}
                placeholder="New contract name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                type="button"
                disabled={
                  !localModeEnabled ||
                  createContractMutation.isPending ||
                  !newContractName.trim() ||
                  !watch('project_id')
                }
                onClick={() =>
                  createContractMutation.mutate({
                    projectId: watch('project_id'),
                    label: newContractName,
                  })
                }
                className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                {createContractMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
            {!watch('project_id') && (
              <p className="mt-1 text-xs text-gray-500">Select a project first to add a contract.</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            {...register('title', { required: 'Title is required' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., Poorly installed fire stopping at riser - Level 3"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            rows={6}
            {...register('description', { required: 'Description is required' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            placeholder="Provide detailed description of the defect..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="defect_type_id" className="block text-sm font-medium text-gray-700 mb-2">
              Defect Type <span className="text-red-500">*</span>
            </label>
            <select
              id="defect_type_id"
              {...register('defect_type_id', { required: 'Defect type is required' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select defect type</option>
              {metaOptions?.defect_types.map((defectType) => (
                <option key={defectType.id} value={defectType.id}>
                  {defectType.name}
                </option>
              ))}
            </select>
            {errors.defect_type_id && (
              <p className="mt-1 text-sm text-red-600">{errors.defect_type_id.message}</p>
            )}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newDefectTypeName}
                onChange={(event) => setNewDefectTypeName(event.target.value)}
                placeholder="New defect type"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                type="button"
                disabled={!localModeEnabled || createDefectTypeMutation.isPending || !newDefectTypeName.trim()}
                onClick={() => createDefectTypeMutation.mutate(newDefectTypeName)}
                className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                {createDefectTypeMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
            {!localModeEnabled && (
              <p className="mt-1 text-xs text-gray-500">
                Add defect type is available in local mode. For remote mode, manage defect types in backend.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-2">
              Severity <span className="text-red-500">*</span>
            </label>
            <select
              id="severity"
              {...register('severity', { required: 'Severity is required' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="med">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label htmlFor="compliance_flag" className="flex items-center space-x-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                id="compliance_flag"
                type="checkbox"
                {...register('compliance_flag')}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Compliance Issue</span>
                <p className="text-xs text-gray-500">This snag involves statutory compliance</p>
              </div>
            </label>
          </div>
        </div>
        <div>
          <label htmlFor="created_by" className="block text-sm font-medium text-gray-700 mb-2">
            Created By <span className="text-red-500">*</span>
          </label>
          <select
            id="created_by"
            {...register('created_by', { required: 'Creator is required' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Select user</option>
            {metaOptions?.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          {errors.created_by && (
            <p className="mt-1 text-sm text-red-600">{errors.created_by.message}</p>
          )}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newUserName}
                onChange={(event) => setNewUserName(event.target.value)}
                placeholder="New user name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                type="button"
                disabled={!localModeEnabled || createUserMutation.isPending || !newUserName.trim()}
                onClick={() => createUserMutation.mutate(newUserName)}
                className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                {createUserMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
            {!localModeEnabled && (
              <p className="mt-1 text-xs text-gray-500">
                Add user is available in local mode. For remote mode, create users in backend.
              </p>
            )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <Link
            to="/app/snags"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending || !hasProjects || !hasContracts || !hasUsers}
            className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{createMutation.isPending ? 'Creating...' : 'Create Snag'}</span>
          </button>
        </div>
        {createMutation.isError && (
          <p className="text-sm text-red-600">
            Failed to create snag. Please verify your inputs and backend configuration.
          </p>
        )}
      </form>
    </div>
  )
}
