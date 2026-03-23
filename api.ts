/**
 * Snag-to-Spec API Layer — Local-Only Edition
 *
 * ALL data lives in the user's browser localStorage via userStore.ts.
 * No backend server, no database, no network requests for core data.
 *
 * Cloud backup (Google Drive / OneDrive) is optional and user-initiated only.
 */

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

const asResponse = <T>(data: T): Promise<ApiResponse<T>> => Promise.resolve({ data })

/** Always true — this is a local-only build */
export const isLocalStorageMode = (): boolean => true

// ─── Data ownership helpers ────────────────────────────────────────

export const exportLocalDbJson = (): string => userStore.exportCurrentUserDb()
export const importLocalDbJson = (jsonText: string): void => userStore.importCurrentUserDb(jsonText)
export const resetLocalDb = (): void => userStore.resetCurrentUserDb()

// ─── Snags API ─────────────────────────────────────────────────────

export const snagsApi = {
  getAll: (projectId?: string, status?: string) =>
    asResponse(userStore.getSnags(projectId, status)),

  getById: (id: string) => {
    const snag = userStore.getSnagById(id)
    if (!snag) return Promise.reject(new Error('Snag not found'))
    return asResponse(snag)
  },

  create: (data: Partial<Snag>) =>
    asResponse(userStore.createSnag(data)),

  update: (id: string, data: Partial<Snag>) =>
    asResponse(userStore.updateSnag(id, data)),

  remove: (id: string) => {
    userStore.removeSnag(id)
    return asResponse(undefined)
  },

  getClauseSuggestions: (id: string) =>
    asResponse(userStore.getClauseSuggestions(id)),

  getMetaOptions: () =>
    asResponse(userStore.getMetaOptions()),

  createProjectOption: (name: string) =>
    asResponse(userStore.createProjectOption(name)),

  createContractOption: (projectId: string, label: string) =>
    asResponse(userStore.createContractOption(projectId, label)),

  createUserOption: (name: string) =>
    asResponse(userStore.createUserOption(name)),

  createDefectTypeOption: (name: string) =>
    asResponse(userStore.createDefectTypeOption(name)),
}

// ─── Instructions API ──────────────────────────────────────────────

export const instructionsApi = {
  getAll: (projectId?: string, status?: string) =>
    asResponse(userStore.getInstructions(projectId, status)),

  getById: (id: string) => {
    const instruction = userStore.getInstructionById(id)
    if (!instruction) return Promise.reject(new Error('Instruction not found'))
    return asResponse(instruction)
  },

  create: (data: Partial<Instruction>) =>
    asResponse(userStore.createInstruction(data)),

  generate: (snagId: string, instructionType?: string) =>
    asResponse(userStore.generateInstruction(snagId, instructionType)),

  update: (id: string, data: Partial<Instruction>) =>
    asResponse(userStore.updateInstruction(id, data)),

  submit: (id: string) =>
    asResponse(userStore.updateInstruction(id, { status: 'review' })),

  approve: (id: string) =>
    asResponse(userStore.updateInstruction(id, { status: 'approved' })),

  issue: (id: string) =>
    asResponse(
      userStore.updateInstruction(id, {
        status: 'issued',
        issued_at: new Date().toISOString(),
      })
    ),
}
