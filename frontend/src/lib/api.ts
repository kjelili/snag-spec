/**
 * Snag-to-Spec API Layer (canonical)
 *
 * Routes calls to either:
 * - Per-user scoped localStorage via userStore (local mode, default)
 * - Remote FastAPI backend (remote mode)
 *
 * FIX #15: This is the ONLY api module. The old single-namespace localStorage
 * system (snag-spec-local-db-v1) is removed. All local storage goes through
 * userStore.ts which uses per-user namespaced keys.
 */

import axios from 'axios'
import * as userStore from './userStore'
import type {
  Snag,
  Instruction,
  SnagFormOption,
  ContractOption,
  SnagMetaOptionsResponse,
  ClauseSuggestion,
} from './api.types'

export type {
  Snag,
  Instruction,
  SnagFormOption,
  ContractOption,
  SnagMetaOptionsResponse,
  ClauseSuggestion,
}

type ApiResponse<T> = { data: T }

const STORAGE_MODE = (import.meta.env.VITE_STORAGE_MODE || 'local').toLowerCase()
const isLocalMode = STORAGE_MODE === 'local'

const resolvedBaseUrl =
  import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim().length > 0
    ? import.meta.env.VITE_API_BASE_URL
    : '/api/v1'
const resolvedApiKey =
  import.meta.env.VITE_API_KEY && import.meta.env.VITE_API_KEY.trim().length > 0
    ? import.meta.env.VITE_API_KEY
    : ''

const api = axios.create({
  baseURL: resolvedBaseUrl,
  // FIX #25 LOW: Add request timeout
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    ...(resolvedApiKey ? { 'X-API-Key': resolvedApiKey } : {}),
  },
})

/**
 * Attach JWT token to requests if available in localStorage.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('snag-spec-jwt-token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api

const asResponse = <T>(data: T): Promise<ApiResponse<T>> => Promise.resolve({ data })

export const isLocalStorageMode = (): boolean => isLocalMode

// ─── Data ownership helpers ────────────────────────────────────────

export const exportLocalDbJson = (): string => userStore.exportCurrentUserDb()
export const importLocalDbJson = (jsonText: string): void => userStore.importCurrentUserDb(jsonText)
export const resetLocalDb = (): void => userStore.resetCurrentUserDb()

// ─── Snags API ─────────────────────────────────────────────────────

export const snagsApi = {
  getAll: (projectId?: string, status?: string) =>
    isLocalMode
      ? asResponse(userStore.getSnags(projectId, status))
      : api.get<Snag[]>('/snags', { params: { project_id: projectId, status } }),

  getById: (id: string) => {
    if (!isLocalMode) return api.get<Snag>(`/snags/${id}`)
    const snag = userStore.getSnagById(id)
    if (!snag) return Promise.reject(new Error('Snag not found'))
    return asResponse(snag)
  },

  create: (data: Partial<Snag>) => {
    if (!isLocalMode) return api.post<Snag>('/snags', data)
    return asResponse(userStore.createSnag(data))
  },

  update: (id: string, data: Partial<Snag>) => {
    if (!isLocalMode) return api.patch<Snag>(`/snags/${id}`, data)
    return asResponse(userStore.updateSnag(id, data))
  },

  remove: (id: string) => {
    if (!isLocalMode) return api.delete(`/snags/${id}`)
    userStore.removeSnag(id)
    return asResponse(undefined)
  },

  getClauseSuggestions: (id: string) => {
    if (!isLocalMode) return api.get<ClauseSuggestion[]>(`/snags/${id}/clauses`)
    return asResponse(userStore.getClauseSuggestions(id))
  },

  getMetaOptions: () => {
    if (!isLocalMode) return api.get<SnagMetaOptionsResponse>('/snags/meta/options')
    return asResponse(userStore.getMetaOptions())
  },

  createProjectOption: (name: string) => {
    if (!isLocalMode)
      return Promise.reject(new Error('Project creation from this screen is only available in local mode.'))
    return asResponse(userStore.createProjectOption(name))
  },

  createContractOption: (projectId: string, label: string) => {
    if (!isLocalMode)
      return Promise.reject(new Error('Contract creation from this screen is only available in local mode.'))
    return asResponse(userStore.createContractOption(projectId, label))
  },

  createUserOption: (name: string) => {
    if (!isLocalMode)
      return Promise.reject(new Error('User creation from this screen is only available in local mode.'))
    return asResponse(userStore.createUserOption(name))
  },

  createDefectTypeOption: (name: string) => {
    if (!isLocalMode)
      return Promise.reject(new Error('Defect type creation from this screen is only available in local mode.'))
    return asResponse(userStore.createDefectTypeOption(name))
  },
}

// ─── Instructions API ──────────────────────────────────────────────

export const instructionsApi = {
  getAll: (projectId?: string, status?: string) =>
    isLocalMode
      ? asResponse(userStore.getInstructions(projectId, status))
      : api.get<Instruction[]>('/instructions', { params: { project_id: projectId, status } }),

  getById: (id: string) => {
    if (!isLocalMode) return api.get<Instruction>(`/instructions/${id}`)
    const instruction = userStore.getInstructionById(id)
    if (!instruction) return Promise.reject(new Error('Instruction not found'))
    return asResponse(instruction)
  },

  create: (data: Partial<Instruction>) => {
    if (!isLocalMode) return api.post<Instruction>('/instructions', data)
    return asResponse(userStore.createInstruction(data))
  },

  generate: (snagId: string, instructionType?: string) => {
    if (!isLocalMode)
      return api.post<Instruction>('/instructions/generate', {
        snag_id: snagId,
        instruction_type: instructionType || 'architect_instruction',
      })
    return asResponse(userStore.generateInstruction(snagId, instructionType))
  },

  update: (id: string, data: Partial<Instruction>) => {
    if (!isLocalMode) return api.patch<Instruction>(`/instructions/${id}`, data)
    return asResponse(userStore.updateInstruction(id, data))
  },

  submit: (id: string) => {
    if (!isLocalMode) return api.post<Instruction>(`/instructions/${id}/submit`)
    return asResponse(userStore.updateInstruction(id, { status: 'review' }))
  },

  approve: (id: string) => {
    if (!isLocalMode) return api.post<Instruction>(`/instructions/${id}/approve`)
    return asResponse(userStore.updateInstruction(id, { status: 'approved' }))
  },

  issue: (id: string) => {
    if (!isLocalMode) return api.post<Instruction>(`/instructions/${id}/issue`)
    return asResponse(userStore.updateInstruction(id, { status: 'issued', issued_at: new Date().toISOString() }))
  },
}
