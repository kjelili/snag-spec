import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, RefreshCw, ShieldCheck, Upload, DatabaseBackup, HardDriveDownload } from 'lucide-react'
import {
  exportLocalDbJson,
  importLocalDbJson,
  isLocalStorageMode,
  resetLocalDb,
  snagsApi,
} from '../lib/api'
import {
  downloadFromGoogleDrive,
  downloadFromOneDrive,
  uploadToGoogleDrive,
  uploadToOneDrive,
} from '../lib/cloudSync'

const defaultFilename = () => {
  const date = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  return `snag-spec-backup-${date}.json`
}

export default function DataOwnership() {
  const localModeEnabled = useMemo(() => isLocalStorageMode(), [])
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newContractName, setNewContractName] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newDefectTypeName, setNewDefectTypeName] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')

  const [googleToken, setGoogleToken] = useState('')
  const [googleFileId, setGoogleFileId] = useState('')

  const [oneDriveToken, setOneDriveToken] = useState('')
  const [oneDriveItemId, setOneDriveItemId] = useState('')

  const { data: metaOptions } = useQuery({
    queryKey: ['snag-meta-options'],
    queryFn: () => snagsApi.getMetaOptions().then((res) => res.data),
    enabled: localModeEnabled,
  })

  const createProjectMutation = useMutation({
    mutationFn: (name: string) => snagsApi.createProjectOption(name).then((res) => res.data),
    onSuccess: (project) => {
      setStatusMessage(`Project created: ${project.name}`)
      setErrorMessage('')
      setNewProjectName('')
      setSelectedProjectId(project.id)
      queryClient.invalidateQueries({ queryKey: ['snag-meta-options'] })
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create project.')
    },
  })

  const createContractMutation = useMutation({
    mutationFn: ({ projectId, label }: { projectId: string; label: string }) =>
      snagsApi.createContractOption(projectId, label).then((res) => res.data),
    onSuccess: (contract) => {
      setStatusMessage(`Contract created: ${contract.label}`)
      setErrorMessage('')
      setNewContractName('')
      queryClient.invalidateQueries({ queryKey: ['snag-meta-options'] })
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create contract.')
    },
  })

  const createUserMutation = useMutation({
    mutationFn: (name: string) => snagsApi.createUserOption(name).then((res) => res.data),
    onSuccess: (user) => {
      setStatusMessage(`User created: ${user.name}`)
      setErrorMessage('')
      setNewUserName('')
      queryClient.invalidateQueries({ queryKey: ['snag-meta-options'] })
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create user.')
    },
  })

  const createDefectTypeMutation = useMutation({
    mutationFn: (name: string) => snagsApi.createDefectTypeOption(name).then((res) => res.data),
    onSuccess: (defectType) => {
      setStatusMessage(`Defect type created: ${defectType.name}`)
      setErrorMessage('')
      setNewDefectTypeName('')
      queryClient.invalidateQueries({ queryKey: ['snag-meta-options'] })
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create defect type.')
    },
  })

  const clearNotices = () => {
    setStatusMessage('')
    setErrorMessage('')
  }

  const runAction = async (action: () => Promise<void>) => {
    clearNotices()
    setBusy(true)
    try {
      await action()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Operation failed.')
    } finally {
      setBusy(false)
    }
  }

  const downloadBackup = async () => {
    const json = exportLocalDbJson()
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = defaultFilename()
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
    setStatusMessage('Backup downloaded to your device.')
  }

  const onImportFile = async (file: File) => {
    const text = await file.text()
    importLocalDbJson(text)
    setStatusMessage('Backup imported successfully.')
  }

  const uploadGoogle = async () => {
    const token = googleToken.trim()
    if (!token) {
      throw new Error('Google access token is required.')
    }
    const result = await uploadToGoogleDrive(token, defaultFilename(), exportLocalDbJson())
    setGoogleFileId(result.fileId)
    setStatusMessage(`Uploaded to Google Drive. File ID: ${result.fileId}`)
  }

  const restoreGoogle = async () => {
    const token = googleToken.trim()
    const fileId = googleFileId.trim()
    if (!token || !fileId) {
      throw new Error('Google token and file ID are required.')
    }
    const content = await downloadFromGoogleDrive(token, fileId)
    importLocalDbJson(content)
    setStatusMessage('Restored local data from Google Drive.')
  }

  const uploadOneDriveAction = async () => {
    const token = oneDriveToken.trim()
    if (!token) {
      throw new Error('OneDrive access token is required.')
    }
    const result = await uploadToOneDrive(token, defaultFilename(), exportLocalDbJson())
    setOneDriveItemId(result.itemId)
    setStatusMessage(`Uploaded to OneDrive. Item ID: ${result.itemId}`)
  }

  const restoreOneDrive = async () => {
    const token = oneDriveToken.trim()
    const itemId = oneDriveItemId.trim()
    if (!token || !itemId) {
      throw new Error('OneDrive token and item ID are required.')
    }
    const content = await downloadFromOneDrive(token, itemId)
    importLocalDbJson(content)
    setStatusMessage('Restored local data from OneDrive.')
  }

  const resetWorkspace = async () => {
    resetLocalDb()
    setSelectedProjectId('')
    setStatusMessage('Local workspace reset complete.')
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Data Ownership</h1>
        <p className="mt-2 text-sm text-gray-600">
          Keep data on your device with optional personal cloud backup and restore.
        </p>
      </div>

      {!localModeEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Local ownership tools are currently disabled because `VITE_STORAGE_MODE` is not set to `local`.
        </div>
      )}

      {statusMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="app-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <DatabaseBackup className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Project and Contract Setup</h2>
        </div>
        <p className="text-sm text-gray-600">
          In local mode, you can create your own project and contract options directly here.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Create project</label>
            <div className="flex gap-2">
              <input
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder="Project name"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                disabled={!localModeEnabled || busy || createProjectMutation.isPending || !newProjectName.trim()}
                onClick={() => createProjectMutation.mutate(newProjectName)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {createProjectMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Create contract</label>
            <select
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select project for contract</option>
              {metaOptions?.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                value={newContractName}
                onChange={(event) => setNewContractName(event.target.value)}
                placeholder="Contract name"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                disabled={
                  !localModeEnabled ||
                  busy ||
                  createContractMutation.isPending ||
                  !newContractName.trim() ||
                  !selectedProjectId
                }
                onClick={() =>
                  createContractMutation.mutate({
                    projectId: selectedProjectId,
                    label: newContractName,
                  })
                }
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {createContractMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Create user</label>
          <div className="flex gap-2">
            <input
              value={newUserName}
              onChange={(event) => setNewUserName(event.target.value)}
              placeholder="User name"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              disabled={!localModeEnabled || busy || createUserMutation.isPending || !newUserName.trim()}
              onClick={() => createUserMutation.mutate(newUserName)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {createUserMutation.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Create defect type</label>
          <div className="flex gap-2">
            <input
              value={newDefectTypeName}
              onChange={(event) => setNewDefectTypeName(event.target.value)}
              placeholder="Defect type name"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              disabled={!localModeEnabled || busy || createDefectTypeMutation.isPending || !newDefectTypeName.trim()}
              onClick={() => createDefectTypeMutation.mutate(newDefectTypeName)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {createDefectTypeMutation.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Current projects</p>
            <div className="rounded-lg border border-gray-200 p-3 max-h-36 overflow-auto">
              {metaOptions?.projects.length ? (
                <ul className="space-y-1 text-sm text-gray-700">
                  {metaOptions.projects.map((project) => (
                    <li key={project.id}>{project.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No projects yet.</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Current contracts</p>
            <div className="rounded-lg border border-gray-200 p-3 max-h-36 overflow-auto">
              {metaOptions?.contracts.length ? (
                <ul className="space-y-1 text-sm text-gray-700">
                  {metaOptions.contracts.map((contract) => (
                    <li key={contract.id}>{contract.label}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No contracts yet.</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Current users</p>
            <div className="rounded-lg border border-gray-200 p-3 max-h-36 overflow-auto">
              {metaOptions?.users.length ? (
                <ul className="space-y-1 text-sm text-gray-700">
                  {metaOptions.users.map((user) => (
                    <li key={user.id}>{user.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No users yet.</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Current defect types</p>
            <div className="rounded-lg border border-gray-200 p-3 max-h-36 overflow-auto">
              {metaOptions?.defect_types.length ? (
                <ul className="space-y-1 text-sm text-gray-700">
                  {metaOptions.defect_types.map((defectType) => (
                    <li key={defectType.id}>{defectType.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No defect types yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="app-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Local Backup Controls</h2>
        </div>
        <p className="text-sm text-gray-600">
          Export your workspace to JSON, import from backup, or reset data to a clean default.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            disabled={!localModeEnabled || busy}
            onClick={() => runAction(downloadBackup)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <HardDriveDownload className="w-4 h-4" />
            Download backup
          </button>

          <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer">
            <Upload className="w-4 h-4" />
            Import backup
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              disabled={!localModeEnabled || busy}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  void runAction(() => onImportFile(file))
                }
                event.currentTarget.value = ''
              }}
            />
          </label>

          <button
            disabled={!localModeEnabled || busy}
            onClick={() => runAction(resetWorkspace)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Reset local workspace
          </button>
        </div>
      </section>

      <section className="app-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <DatabaseBackup className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Google Drive (Optional)</h2>
        </div>
        <p className="text-sm text-gray-600">
          Paste a user OAuth access token with Drive file scope, then upload or restore your backup.
        </p>
        <div className="grid grid-cols-1 gap-4">
          <input
            value={googleToken}
            onChange={(event) => setGoogleToken(event.target.value)}
            placeholder="Google access token"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={googleFileId}
            onChange={(event) => setGoogleFileId(event.target.value)}
            placeholder="Google file ID (for restore)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              disabled={!localModeEnabled || busy}
              onClick={() => runAction(uploadGoogle)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              Upload to Google Drive
            </button>
            <button
              disabled={!localModeEnabled || busy}
              onClick={() => runAction(restoreGoogle)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Restore from Google Drive
            </button>
          </div>
        </div>
      </section>

      <section className="app-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <DatabaseBackup className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">OneDrive (Optional)</h2>
        </div>
        <p className="text-sm text-gray-600">
          Paste a Microsoft Graph access token, then upload or restore your backup file.
        </p>
        <div className="grid grid-cols-1 gap-4">
          <input
            value={oneDriveToken}
            onChange={(event) => setOneDriveToken(event.target.value)}
            placeholder="OneDrive access token"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={oneDriveItemId}
            onChange={(event) => setOneDriveItemId(event.target.value)}
            placeholder="OneDrive item ID (for restore)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              disabled={!localModeEnabled || busy}
              onClick={() => runAction(uploadOneDriveAction)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              Upload to OneDrive
            </button>
            <button
              disabled={!localModeEnabled || busy}
              onClick={() => runAction(restoreOneDrive)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Restore from OneDrive
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
