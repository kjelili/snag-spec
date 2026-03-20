import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, RefreshCw, ShieldCheck, Upload, DatabaseBackup, HardDriveDownload, CheckCircle2, XCircle, Layers } from 'lucide-react'
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
    if (!token) throw new Error('Google access token is required.')
    const result = await uploadToGoogleDrive(token, defaultFilename(), exportLocalDbJson())
    setGoogleFileId(result.fileId)
    setStatusMessage(`Uploaded to Google Drive. File ID: ${result.fileId}`)
  }

  const restoreGoogle = async () => {
    const token = googleToken.trim()
    const fileId = googleFileId.trim()
    if (!token || !fileId) throw new Error('Google token and file ID are required.')
    const content = await downloadFromGoogleDrive(token, fileId)
    importLocalDbJson(content)
    setStatusMessage('Restored local data from Google Drive.')
  }

  const uploadOneDriveAction = async () => {
    const token = oneDriveToken.trim()
    if (!token) throw new Error('OneDrive access token is required.')
    const result = await uploadToOneDrive(token, defaultFilename(), exportLocalDbJson())
    setOneDriveItemId(result.itemId)
    setStatusMessage(`Uploaded to OneDrive. Item ID: ${result.itemId}`)
  }

  const restoreOneDrive = async () => {
    const token = oneDriveToken.trim()
    const itemId = oneDriveItemId.trim()
    if (!token || !itemId) throw new Error('OneDrive token and item ID are required.')
    const content = await downloadFromOneDrive(token, itemId)
    importLocalDbJson(content)
    setStatusMessage('Restored local data from OneDrive.')
  }

  const resetWorkspace = async () => {
    resetLocalDb()
    setSelectedProjectId('')
    setStatusMessage('Local workspace reset complete.')
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 transition-shadow"
  const addBtnClass = "px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-50 transition-all"

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700 mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          Privacy-first
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Data Ownership</h1>
        <p className="mt-2 text-sm text-slate-500">
          Keep data on your device with optional personal cloud backup and restore.
        </p>
      </div>

      {!localModeEnabled && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Local ownership tools are currently disabled because <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">VITE_STORAGE_MODE</code> is not set to <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">local</code>.
        </div>
      )}

      {statusMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          {errorMessage}
        </div>
      )}

      {/* Project and Contract Setup */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-violet-50">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 shadow-sm">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Project and Contract Setup</h2>
            <p className="text-xs text-slate-500">Create your own project and contract options in local mode</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Create project</label>
              <div className="flex gap-2">
                <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Project name" className={inputClass} />
                <button disabled={!localModeEnabled || busy || createProjectMutation.isPending || !newProjectName.trim()} onClick={() => createProjectMutation.mutate(newProjectName)} className={addBtnClass}>
                  {createProjectMutation.isPending ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Create contract</label>
              <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className={inputClass}>
                <option value="">Select project for contract</option>
                {metaOptions?.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input value={newContractName} onChange={(e) => setNewContractName(e.target.value)} placeholder="Contract name" className={inputClass} />
                <button disabled={!localModeEnabled || busy || createContractMutation.isPending || !newContractName.trim() || !selectedProjectId} onClick={() => createContractMutation.mutate({ projectId: selectedProjectId, label: newContractName })} className={addBtnClass}>
                  {createContractMutation.isPending ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Create user</label>
            <div className="flex gap-2">
              <input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="User name" className={inputClass} />
              <button disabled={!localModeEnabled || busy || createUserMutation.isPending || !newUserName.trim()} onClick={() => createUserMutation.mutate(newUserName)} className={addBtnClass}>
                {createUserMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Create defect type</label>
            <div className="flex gap-2">
              <input value={newDefectTypeName} onChange={(e) => setNewDefectTypeName(e.target.value)} placeholder="Defect type name" className={inputClass} />
              <button disabled={!localModeEnabled || busy || createDefectTypeMutation.isPending || !newDefectTypeName.trim()} onClick={() => createDefectTypeMutation.mutate(newDefectTypeName)} className={addBtnClass}>
                {createDefectTypeMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { label: 'Current projects', items: metaOptions?.projects, key: 'name' as const },
              { label: 'Current contracts', items: metaOptions?.contracts, key: 'label' as const },
              { label: 'Current users', items: metaOptions?.users, key: 'name' as const },
              { label: 'Current defect types', items: metaOptions?.defect_types, key: 'name' as const },
            ].map((section) => (
              <div key={section.label}>
                <p className="text-sm font-semibold text-slate-700 mb-2">{section.label}</p>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 max-h-36 overflow-auto">
                  {section.items?.length ? (
                    <ul className="space-y-1 text-sm text-slate-700">
                      {section.items.map((item: any) => (
                        <li key={item.id} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                          {item[section.key]}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400 italic">None yet</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Local Backup Controls */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Local Backup Controls</h2>
            <p className="text-xs text-slate-500">Export, import, or reset your workspace data</p>
          </div>
        </div>
        <div className="p-6 flex flex-col sm:flex-row gap-3">
          <button disabled={!localModeEnabled || busy} onClick={() => runAction(downloadBackup)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 disabled:opacity-50 transition-all hover:-translate-y-0.5">
            <HardDriveDownload className="w-4 h-4" />
            Download backup
          </button>

          <label className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-all">
            <Upload className="w-4 h-4" />
            Import backup
            <input type="file" accept=".json,application/json" className="hidden" disabled={!localModeEnabled || busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void runAction(() => onImportFile(f)); e.currentTarget.value = '' }} />
          </label>

          <button disabled={!localModeEnabled || busy} onClick={() => runAction(resetWorkspace)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-all">
            <RefreshCw className="w-4 h-4" />
            Reset workspace
          </button>
        </div>
      </section>

      {/* Google Drive */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-sky-50">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-sky-500 shadow-sm">
            <DatabaseBackup className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Google Drive <span className="text-xs font-normal text-slate-400">(Optional)</span></h2>
            <p className="text-xs text-slate-500">Upload or restore from your personal Google Drive</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <input value={googleToken} onChange={(e) => setGoogleToken(e.target.value)} placeholder="Google access token" className={inputClass} />
          <input value={googleFileId} onChange={(e) => setGoogleFileId(e.target.value)} placeholder="Google file ID (for restore)" className={inputClass} />
          <div className="flex flex-col sm:flex-row gap-3">
            <button disabled={!localModeEnabled || busy} onClick={() => runAction(uploadGoogle)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-50 transition-all">
              <Upload className="w-4 h-4" /> Upload to Google Drive
            </button>
            <button disabled={!localModeEnabled || busy} onClick={() => runAction(restoreGoogle)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all">
              <Download className="w-4 h-4" /> Restore from Google Drive
            </button>
          </div>
        </div>
      </section>

      {/* OneDrive */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
            <DatabaseBackup className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">OneDrive <span className="text-xs font-normal text-slate-400">(Optional)</span></h2>
            <p className="text-xs text-slate-500">Upload or restore from Microsoft OneDrive</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <input value={oneDriveToken} onChange={(e) => setOneDriveToken(e.target.value)} placeholder="OneDrive access token" className={inputClass} />
          <input value={oneDriveItemId} onChange={(e) => setOneDriveItemId(e.target.value)} placeholder="OneDrive item ID (for restore)" className={inputClass} />
          <div className="flex flex-col sm:flex-row gap-3">
            <button disabled={!localModeEnabled || busy} onClick={() => runAction(uploadOneDriveAction)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-50 transition-all">
              <Upload className="w-4 h-4" /> Upload to OneDrive
            </button>
            <button disabled={!localModeEnabled || busy} onClick={() => runAction(restoreOneDrive)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all">
              <Download className="w-4 h-4" /> Restore from OneDrive
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
