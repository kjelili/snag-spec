import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  RefreshCw,
  ShieldCheck,
  Upload,
  HardDriveDownload,
  CheckCircle2,
  XCircle,
  Layers,
  AlertTriangle,
  FolderUp,
  Cloud,
} from 'lucide-react'
import {
  exportLocalDbJson,
  importLocalDbJson,
  resetLocalDb,
  snagsApi,
} from '../lib/api'

const defaultFilename = () => {
  const date = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  return `snag-spec-backup-${date}.json`
}

export default function DataOwnership() {
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Project/contract/user/defect type inline creation
  const [newProjectName, setNewProjectName] = useState('')
  const [newContractName, setNewContractName] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newDefectTypeName, setNewDefectTypeName] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')

  const { data: metaOptions } = useQuery({
    queryKey: ['snag-meta-options'],
    queryFn: () => snagsApi.getMetaOptions().then((res) => res.data),
  })

  // Count data for the summary
  const snagCount = useQuery({
    queryKey: ['snags'],
    queryFn: () => snagsApi.getAll().then((r) => r.data),
  }).data?.length ?? 0

  const instructionCount = useQuery({
    queryKey: ['instructions'],
    queryFn: () =>
      import('../lib/api').then((m) => m.instructionsApi.getAll().then((r) => r.data)),
  }).data?.length ?? 0

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

  // ─── Mutations for inline creation ───────────────────────────────

  const createProjectMutation = useMutation({
    mutationFn: (name: string) => snagsApi.createProjectOption(name).then((r) => r.data),
    onSuccess: (project) => {
      setStatusMessage(`Project created: ${project.name}`)
      setErrorMessage('')
      setNewProjectName('')
      setSelectedProjectId(project.id)
      queryClient.invalidateQueries({ queryKey: ['snag-meta-options'] })
    },
    onError: (e) => setErrorMessage(e instanceof Error ? e.message : 'Failed'),
  })

  const createContractMutation = useMutation({
    mutationFn: ({ projectId, label }: { projectId: string; label: string }) =>
      snagsApi.createContractOption(projectId, label).then((r) => r.data),
    onSuccess: (contract) => {
      setStatusMessage(`Contract created: ${contract.label}`)
      setErrorMessage('')
      setNewContractName('')
      queryClient.invalidateQueries({ queryKey: ['snag-meta-options'] })
    },
    onError: (e) => setErrorMessage(e instanceof Error ? e.message : 'Failed'),
  })

  const createUserMutation = useMutation({
    mutationFn: (name: string) => snagsApi.createUserOption(name).then((r) => r.data),
    onSuccess: (user) => {
      setStatusMessage(`User created: ${user.name}`)
      setErrorMessage('')
      setNewUserName('')
      queryClient.invalidateQueries({ queryKey: ['snag-meta-options'] })
    },
    onError: (e) => setErrorMessage(e instanceof Error ? e.message : 'Failed'),
  })

  const createDefectTypeMutation = useMutation({
    mutationFn: (name: string) => snagsApi.createDefectTypeOption(name).then((r) => r.data),
    onSuccess: (defectType) => {
      setStatusMessage(`Defect type created: ${defectType.name}`)
      setErrorMessage('')
      setNewDefectTypeName('')
      queryClient.invalidateQueries({ queryKey: ['snag-meta-options'] })
    },
    onError: (e) => setErrorMessage(e instanceof Error ? e.message : 'Failed'),
  })

  // ─── Backup actions ──────────────────────────────────────────────

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
    queryClient.invalidateQueries()
    setStatusMessage(`Backup imported from ${file.name}. All data restored.`)
  }

  const resetWorkspace = async () => {
    if (!window.confirm('This will delete all your local data. Download a backup first if needed. Continue?')) {
      return
    }
    resetLocalDb()
    setSelectedProjectId('')
    queryClient.invalidateQueries()
    setStatusMessage('Local workspace reset. All data cleared.')
  }

  // ─── Cloud save helpers ──────────────────────────────────────────

  const saveToCloudFile = async (provider: 'google-drive' | 'onedrive') => {
    const json = exportLocalDbJson()
    const blob = new Blob([json], { type: 'application/json' })
    const filename = defaultFilename()

    // Use the native file picker / share API where supported
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'JSON backup', accept: { 'application/json': ['.json'] } }],
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        setStatusMessage(`Backup saved. You can now upload ${filename} to ${provider === 'google-drive' ? 'Google Drive' : 'OneDrive'} manually.`)
        return
      } catch (err: any) {
        if (err?.name === 'AbortError') return // user cancelled
      }
    }

    // Fallback: regular download
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
    setStatusMessage(
      `Backup downloaded as ${filename}. Upload it to ${provider === 'google-drive' ? 'Google Drive' : 'OneDrive'} from your file manager.`
    )
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 transition-shadow'
  const addBtnClass =
    'shrink-0 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-50 transition-all'

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700 mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          Your data, your device
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Data Ownership</h1>
        <p className="mt-2 text-sm text-slate-500">
          Everything is stored in your browser. Nothing leaves your device unless you choose to back it up.
        </p>
      </div>

      {/* Status notices */}
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

      {/* Data Summary */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4">Your Data Summary</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-sky-50 p-4 text-center">
            <p className="text-2xl font-extrabold text-sky-700">{metaOptions?.projects.length ?? 0}</p>
            <p className="text-xs text-sky-600 mt-1">Projects</p>
          </div>
          <div className="rounded-xl bg-rose-50 p-4 text-center">
            <p className="text-2xl font-extrabold text-rose-700">{snagCount}</p>
            <p className="text-xs text-rose-600 mt-1">Snags</p>
          </div>
          <div className="rounded-xl bg-violet-50 p-4 text-center">
            <p className="text-2xl font-extrabold text-violet-700">{instructionCount}</p>
            <p className="text-xs text-violet-600 mt-1">Instructions</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-4 text-center">
            <p className="text-2xl font-extrabold text-amber-700">{metaOptions?.contracts.length ?? 0}</p>
            <p className="text-xs text-amber-600 mt-1">Contracts</p>
          </div>
        </div>
      </section>

      {/* Backup & Restore — Primary */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Backup & Restore</h2>
            <p className="text-xs text-slate-500">Download your data as a file, or restore from a previous backup</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              disabled={busy}
              onClick={() => runAction(downloadBackup)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 disabled:opacity-50 transition-all hover:-translate-y-0.5"
            >
              <HardDriveDownload className="w-4 h-4" />
              Download backup (.json)
            </button>

            <label className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-all">
              <Upload className="w-4 h-4" />
              Restore from file
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void runAction(() => onImportFile(f))
                  e.currentTarget.value = ''
                }}
              />
            </label>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              Back up regularly. Browser data can be lost if you clear your cache, use private browsing, or switch devices.
            </p>
          </div>
        </div>
      </section>

      {/* Cloud Backup — Google Drive & OneDrive */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 shadow-sm">
            <Cloud className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Cloud Backup</h2>
            <p className="text-xs text-slate-500">
              Save a copy to Google Drive or OneDrive for safekeeping
            </p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Download your backup file, then upload it to your preferred cloud storage.
            To restore, download the file from your cloud drive and use "Restore from file" above.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              disabled={busy}
              onClick={() => runAction(() => saveToCloudFile('google-drive'))}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            >
              <FolderUp className="w-4 h-4" />
              Save for Google Drive
            </button>
            <button
              disabled={busy}
              onClick={() => runAction(() => saveToCloudFile('onedrive'))}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            >
              <FolderUp className="w-4 h-4" />
              Save for OneDrive
            </button>
          </div>

          {/* Hidden file input for cloud restore */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void runAction(() => onImportFile(f))
              e.currentTarget.value = ''
            }}
          />
        </div>
      </section>

      {/* Project & Contract Setup */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-violet-50">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 shadow-sm">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Project & Contract Setup</h2>
            <p className="text-xs text-slate-500">Create projects, contracts, users, and defect types</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {/* Projects */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">New project</label>
              <div className="flex gap-2">
                <input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name"
                  className={inputClass}
                  onKeyDown={(e) => e.key === 'Enter' && newProjectName.trim() && createProjectMutation.mutate(newProjectName)}
                />
                <button
                  disabled={busy || createProjectMutation.isPending || !newProjectName.trim()}
                  onClick={() => createProjectMutation.mutate(newProjectName)}
                  className={addBtnClass}
                >
                  {createProjectMutation.isPending ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>

            {/* Contracts */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">New contract</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select project first</option>
                {metaOptions?.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  value={newContractName}
                  onChange={(e) => setNewContractName(e.target.value)}
                  placeholder="Contract name"
                  className={inputClass}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    newContractName.trim() &&
                    selectedProjectId &&
                    createContractMutation.mutate({ projectId: selectedProjectId, label: newContractName })
                  }
                />
                <button
                  disabled={busy || createContractMutation.isPending || !newContractName.trim() || !selectedProjectId}
                  onClick={() =>
                    createContractMutation.mutate({ projectId: selectedProjectId, label: newContractName })
                  }
                  className={addBtnClass}
                >
                  {createContractMutation.isPending ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>

          {/* Users */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">New team member</label>
            <div className="flex gap-2">
              <input
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Name"
                className={inputClass}
                onKeyDown={(e) => e.key === 'Enter' && newUserName.trim() && createUserMutation.mutate(newUserName)}
              />
              <button
                disabled={busy || createUserMutation.isPending || !newUserName.trim()}
                onClick={() => createUserMutation.mutate(newUserName)}
                className={addBtnClass}
              >
                {createUserMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>

          {/* Defect types */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">New defect type</label>
            <div className="flex gap-2">
              <input
                value={newDefectTypeName}
                onChange={(e) => setNewDefectTypeName(e.target.value)}
                placeholder="Defect type name"
                className={inputClass}
                onKeyDown={(e) =>
                  e.key === 'Enter' && newDefectTypeName.trim() && createDefectTypeMutation.mutate(newDefectTypeName)
                }
              />
              <button
                disabled={busy || createDefectTypeMutation.isPending || !newDefectTypeName.trim()}
                onClick={() => createDefectTypeMutation.mutate(newDefectTypeName)}
                className={addBtnClass}
              >
                {createDefectTypeMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>

          {/* Current items summary */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { label: 'Projects', items: metaOptions?.projects, key: 'name' as const },
              { label: 'Contracts', items: metaOptions?.contracts, key: 'label' as const },
              { label: 'Team members', items: metaOptions?.users, key: 'name' as const },
              { label: 'Defect types', items: metaOptions?.defect_types, key: 'name' as const },
            ].map((section) => (
              <div key={section.label}>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  {section.label} ({section.items?.length ?? 0})
                </p>
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

      {/* Reset */}
      <section className="rounded-2xl border border-rose-200/80 bg-white shadow-sm overflow-hidden">
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Reset Workspace</h2>
            <p className="text-xs text-slate-500 mt-1">
              Delete all local data and start fresh. This cannot be undone.
            </p>
          </div>
          <button
            disabled={busy}
            onClick={() => runAction(resetWorkspace)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-all shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            Reset everything
          </button>
        </div>
      </section>

      {/* Privacy footer */}
      <div className="flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-800">Your data never leaves your browser</p>
          <p className="text-xs text-slate-500 mt-1">
            Snag-to-Spec stores everything in your browser's local storage. No servers, no accounts,
            no tracking. Back up to Google Drive or OneDrive by downloading a file and uploading it yourself.
          </p>
        </div>
      </div>
    </div>
  )
}
