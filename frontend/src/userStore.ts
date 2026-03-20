/**
 * Per-User Scoped Data Store
 *
 * Replaces the single-namespace LOCAL_DB_KEY with user-scoped storage.
 * Each user's data is stored under their own key prefix.
 * PMs can read project-level aggregated data.
 */

import type { AppUser } from './auth'
import {
  getCurrentUser,
  setCurrentUser,
  userScopedKey,
  projectScopedKey,
  canViewAllProjectSnags,
  getProjectUsers,
} from './auth'
import type {
  Snag,
  Instruction,
  SnagFormOption,
  ContractOption,
  SnagMetaOptionsResponse,
} from './api.types'

// ─── Constants ─────────────────────────────────────────────────────

const DB_SUFFIX = 'db-v2'

const STARTER_DEFECT_TYPE_NAMES = [
  'Fire stopping non-compliance',
  'Compartmentation/doors/fire rating non-compliance',
  'Waterproofing/water ingress',
  'Structural cracking/movement',
  'MEP functional failure',
  'Spec/drawing non-conformance',
  'Workmanship finish defects',
  'Incomplete works',
  'Damage to completed work',
  'Access/maintenance non-compliance',
]

// ─── Per-user DB shape ─────────────────────────────────────────────

export interface UserLocalDb {
  projects: SnagFormOption[]
  contracts: ContractOption[]
  defect_types: SnagFormOption[]
  users: SnagFormOption[] // Crew members within projects
  snags: Snag[]
  instructions: Instruction[]
}

// ─── Helpers ───────────────────────────────────────────────────────

const newId = () => crypto.randomUUID()
const nowIso = () => new Date().toISOString()

function requireUser(): AppUser {
  const user = getCurrentUser()
  if (!user) throw new Error('No authenticated user. Please log in.')
  return user
}

function dbKeyForUser(userId: string): string {
  return userScopedKey(userId, DB_SUFFIX)
}

// ─── Project-level index (tracks which users contributed to a project) ─

function projectSnagIndexKey(projectId: string): string {
  return projectScopedKey(projectId, 'snag-contributors')
}

interface ProjectContributors {
  userIds: string[]
}

function readProjectContributors(projectId: string): ProjectContributors {
  try {
    const raw = localStorage.getItem(projectSnagIndexKey(projectId))
    return raw ? (JSON.parse(raw) as ProjectContributors) : { userIds: [] }
  } catch {
    return { userIds: [] }
  }
}

function addProjectContributor(projectId: string, userId: string): void {
  const contributors = readProjectContributors(projectId)
  if (!contributors.userIds.includes(userId)) {
    contributors.userIds.push(userId)
    localStorage.setItem(projectSnagIndexKey(projectId), JSON.stringify(contributors))
  }
}

// ─── Read / Write for specific user ────────────────────────────────

function buildDefaultDb(): UserLocalDb {
  return {
    projects: [],
    contracts: [],
    users: [],
    defect_types: STARTER_DEFECT_TYPE_NAMES.map((name) => ({ id: newId(), name })),
    snags: [],
    instructions: [],
  }
}

export function readUserDb(userId: string): UserLocalDb {
  const key = dbKeyForUser(userId)
  const raw = localStorage.getItem(key)
  if (!raw) {
    const db = buildDefaultDb()
    localStorage.setItem(key, JSON.stringify(db))
    return db
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UserLocalDb>
    const hydrated: UserLocalDb = {
      projects: parsed.projects ?? [],
      contracts: parsed.contracts ?? [],
      defect_types: parsed.defect_types ?? [],
      users: parsed.users ?? [],
      snags: parsed.snags ?? [],
      instructions: parsed.instructions ?? [],
    }

    if (hydrated.defect_types.length === 0) {
      hydrated.defect_types = STARTER_DEFECT_TYPE_NAMES.map((name) => ({ id: newId(), name }))
      localStorage.setItem(key, JSON.stringify(hydrated))
    }

    return hydrated
  } catch {
    const db = buildDefaultDb()
    localStorage.setItem(key, JSON.stringify(db))
    return db
  }
}

export function writeUserDb(userId: string, db: UserLocalDb): void {
  localStorage.setItem(dbKeyForUser(userId), JSON.stringify(db))
}

// ─── Current user convenience ──────────────────────────────────────

function readCurrentUserDb(): UserLocalDb {
  const user = requireUser()
  return readUserDb(user.id)
}

function writeCurrentUserDb(db: UserLocalDb): void {
  const user = requireUser()
  writeUserDb(user.id, db)
}

// ─── Snag CRUD (user-scoped) ───────────────────────────────────────

export function getSnags(projectId?: string, status?: string): Snag[] {
  const user = requireUser()

  let snags: Snag[]

  if (projectId && canViewAllProjectSnags(user)) {
    // PM sees all contributors' snags for this project
    snags = getProjectSnags(projectId)
  } else {
    const db = readCurrentUserDb()
    snags = db.snags
  }

  return snags
    .filter((s) => (projectId ? s.project_id === projectId : true))
    .filter((s) => (status ? s.status === status : true))
    .sort((a, b) => +new Date(b.discovered_at) - +new Date(a.discovered_at))
}

export function getSnagById(id: string): Snag | null {
  const user = requireUser()

  // First check user's own data
  const db = readCurrentUserDb()
  const own = db.snags.find((s) => s.id === id)
  if (own) return own

  // If PM, search across project contributors
  if (canViewAllProjectSnags(user)) {
    for (const projId of user.projectIds) {
      const projectSnags = getProjectSnags(projId)
      const found = projectSnags.find((s) => s.id === id)
      if (found) return found
    }
  }

  return null
}

export function createSnag(data: Partial<Snag>): Snag {
  const user = requireUser()
  const db = readCurrentUserDb()

  const snag: Snag = {
    id: newId(),
    project_id: data.project_id || db.projects[0]?.id || '',
    contract_id: data.contract_id || db.contracts[0]?.id || '',
    created_by: user.id,
    defect_type_id: data.defect_type_id,
    title: data.title || 'Untitled snag',
    description: data.description || '',
    location_id: data.location_id,
    status: data.status || 'new',
    severity: data.severity || 'med',
    compliance_flag: Boolean(data.compliance_flag),
    variation_risk: data.variation_risk,
    discovered_at: data.discovered_at || nowIso(),
    due_by: data.due_by,
    closed_at: data.closed_at,
  }

  db.snags.push(snag)
  writeCurrentUserDb(db)

  // Register this user as contributor to the project
  if (snag.project_id) {
    addProjectContributor(snag.project_id, user.id)
  }

  return snag
}

export function updateSnag(id: string, data: Partial<Snag>): Snag {
  const user = requireUser()
  const db = readCurrentUserDb()
  const index = db.snags.findIndex((s) => s.id === id)

  if (index < 0) {
    // If PM and snag belongs to another user, don't allow direct edit here
    throw new Error('Snag not found in your data')
  }

  const updated = { ...db.snags[index], ...data }
  db.snags[index] = updated
  writeCurrentUserDb(db)
  return updated
}

export function removeSnag(id: string): void {
  const db = readCurrentUserDb()
  db.snags = db.snags.filter((s) => s.id !== id)
  db.instructions = db.instructions.map((instruction) =>
    instruction.snag_id === id ? { ...instruction, snag_id: undefined } : instruction
  )
  writeCurrentUserDb(db)
}

// ─── Project-level aggregation for PMs ─────────────────────────────

function getProjectSnags(projectId: string): Snag[] {
  const contributors = readProjectContributors(projectId)
  const allSnags: Snag[] = []
  const seenIds = new Set<string>()

  for (const userId of contributors.userIds) {
    try {
      const userDb = readUserDb(userId)
      for (const snag of userDb.snags) {
        if (snag.project_id === projectId && !seenIds.has(snag.id)) {
          seenIds.add(snag.id)
          allSnags.push(snag)
        }
      }
    } catch {
      // Skip unreadable user data
    }
  }

  return allSnags
}

export function getProjectInstructions(projectId: string): Instruction[] {
  const contributors = readProjectContributors(projectId)
  const all: Instruction[] = []
  const seenIds = new Set<string>()

  for (const userId of contributors.userIds) {
    try {
      const userDb = readUserDb(userId)
      for (const instr of userDb.instructions) {
        if (instr.project_id === projectId && !seenIds.has(instr.id)) {
          seenIds.add(instr.id)
          all.push(instr)
        }
      }
    } catch {
      // Skip
    }
  }

  return all
}

// ─── Instruction CRUD ──────────────────────────────────────────────

export function getInstructions(projectId?: string, status?: string): Instruction[] {
  const user = requireUser()

  let instructions: Instruction[]

  if (projectId && canViewAllProjectSnags(user)) {
    instructions = getProjectInstructions(projectId)
  } else {
    const db = readCurrentUserDb()
    instructions = db.instructions
  }

  return instructions
    .filter((i) => (projectId ? i.project_id === projectId : true))
    .filter((i) => (status ? i.status === status : true))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
}

export function getInstructionById(id: string): Instruction | null {
  const user = requireUser()
  const db = readCurrentUserDb()
  const own = db.instructions.find((i) => i.id === id)
  if (own) return own

  if (canViewAllProjectSnags(user)) {
    for (const projId of user.projectIds) {
      const projectInstructions = getProjectInstructions(projId)
      const found = projectInstructions.find((i) => i.id === id)
      if (found) return found
    }
  }

  return null
}

export function createInstruction(data: Partial<Instruction>): Instruction {
  const user = requireUser()
  const db = readCurrentUserDb()

  const instruction: Instruction = {
    id: newId(),
    project_id: data.project_id || db.projects[0]?.id || '',
    contract_id: data.contract_id || db.contracts[0]?.id || '',
    snag_id: data.snag_id,
    instruction_type: data.instruction_type || 'architect_instruction',
    ai_reference: data.ai_reference || `AI-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
    subject: data.subject || 'New Instruction',
    body_markdown: data.body_markdown || '',
    status: data.status || 'draft',
    issued_to_party_id: data.issued_to_party_id,
    issued_by_user_id: user.id,
    issued_at: data.issued_at,
    response_required_by: data.response_required_by,
    delivery_method: data.delivery_method,
    pdf_document_id: data.pdf_document_id,
    created_at: data.created_at || nowIso(),
  }

  db.instructions.push(instruction)
  writeCurrentUserDb(db)

  if (instruction.project_id) {
    addProjectContributor(instruction.project_id, user.id)
  }

  return instruction
}

export function generateInstruction(snagId: string, instructionType?: string): Instruction {
  const user = requireUser()
  const snag = getSnagById(snagId)
  if (!snag) throw new Error('Snag not found')

  const db = readCurrentUserDb()

  const normalizedType = (
    ['architect_instruction', 'ca_instruction', 'ea_instruction', 'site_notice'].includes(instructionType || '')
      ? instructionType
      : 'architect_instruction'
  ) as Instruction['instruction_type']

  const instruction: Instruction = {
    id: newId(),
    project_id: snag.project_id,
    contract_id: snag.contract_id,
    snag_id: snag.id,
    instruction_type: normalizedType,
    ai_reference: `AI-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
    subject: `Remedy ${snag.title}`,
    body_markdown: [
      `Please remedy the following snag: ${snag.title}.`,
      '',
      snag.description,
      '',
      'Works to comply with relevant contract requirements and approved documents.',
    ].join('\n'),
    status: 'draft',
    issued_by_user_id: user.id,
    created_at: nowIso(),
  }

  db.instructions.push(instruction)

  // Update the snag status if it's the user's own snag
  const snagIndex = db.snags.findIndex((s) => s.id === snag.id)
  if (snagIndex >= 0) {
    db.snags[snagIndex] = { ...db.snags[snagIndex], status: 'instructed' }
  }

  writeCurrentUserDb(db)

  if (instruction.project_id) {
    addProjectContributor(instruction.project_id, user.id)
  }

  return instruction
}

export function updateInstruction(id: string, data: Partial<Instruction>): Instruction {
  const db = readCurrentUserDb()
  const index = db.instructions.findIndex((i) => i.id === id)
  if (index < 0) throw new Error('Instruction not found in your data')
  const updated = { ...db.instructions[index], ...data }
  db.instructions[index] = updated
  writeCurrentUserDb(db)
  return updated
}

// ─── Clause suggestions (stub) ─────────────────────────────────────

export function getClauseSuggestions(snagId: string): Array<{ id: string; clause_number: string; clause_title: string }> {
  const snag = getSnagById(snagId)
  if (!snag || !snag.defect_type_id) return []

  return [
    { id: newId(), clause_number: '2.30', clause_title: 'Defective Work and Rectification' },
    { id: newId(), clause_number: '3.18', clause_title: 'Instructions and Contract Compliance' },
  ]
}

// ─── Meta options (user-scoped) ────────────────────────────────────

export function getMetaOptions(): SnagMetaOptionsResponse {
  const db = readCurrentUserDb()
  return {
    projects: db.projects,
    contracts: db.contracts,
    defect_types: db.defect_types,
    users: db.users,
  }
}

export function createProjectOption(name: string): SnagFormOption {
  const user = requireUser()
  const db = readCurrentUserDb()
  const normalized = name.trim()
  if (!normalized) throw new Error('Project name is required.')

  const existing = db.projects.find((p) => p.name.toLowerCase() === normalized.toLowerCase())
  if (existing) return existing

  const created: SnagFormOption = { id: newId(), name: normalized }
  db.projects.push(created)
  writeCurrentUserDb(db)

  // Add project to user's project list
  if (!user.projectIds.includes(created.id)) {
    user.projectIds.push(created.id)
    setCurrentUser(user)
  }

  return created
}

export function createContractOption(projectId: string, label: string): ContractOption {
  const db = readCurrentUserDb()
  const normalized = label.trim()
  if (!projectId) throw new Error('Project must be selected.')
  if (!normalized) throw new Error('Contract name is required.')

  const existing = db.contracts.find(
    (c) => c.project_id === projectId && c.label.toLowerCase() === normalized.toLowerCase()
  )
  if (existing) return existing

  const created: ContractOption = { id: newId(), project_id: projectId, label: normalized }
  db.contracts.push(created)
  writeCurrentUserDb(db)
  return created
}

export function createUserOption(name: string): SnagFormOption {
  const db = readCurrentUserDb()
  const normalized = name.trim()
  if (!normalized) throw new Error('User name is required.')

  const existing = db.users.find((u) => u.name.toLowerCase() === normalized.toLowerCase())
  if (existing) return existing

  const created: SnagFormOption = { id: newId(), name: normalized }
  db.users.push(created)
  writeCurrentUserDb(db)
  return created
}

export function createDefectTypeOption(name: string): SnagFormOption {
  const db = readCurrentUserDb()
  const normalized = name.trim()
  if (!normalized) throw new Error('Defect type name is required.')

  const existing = db.defect_types.find((d) => d.name.toLowerCase() === normalized.toLowerCase())
  if (existing) return existing

  const created: SnagFormOption = { id: newId(), name: normalized }
  db.defect_types.push(created)
  writeCurrentUserDb(db)
  return created
}

// ─── Export / Import / Reset (user-scoped) ─────────────────────────

export function exportCurrentUserDb(): string {
  const db = readCurrentUserDb()
  return JSON.stringify(db, null, 2)
}

export function importCurrentUserDb(jsonText: string): void {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('Invalid JSON.')
  }

  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid backup format.')
  const candidate = parsed as Partial<UserLocalDb>
  if (
    !Array.isArray(candidate.projects) ||
    !Array.isArray(candidate.contracts) ||
    !Array.isArray(candidate.defect_types) ||
    !Array.isArray(candidate.users) ||
    !Array.isArray(candidate.snags) ||
    !Array.isArray(candidate.instructions)
  ) {
    throw new Error('Invalid backup format. Required collections are missing.')
  }

  writeCurrentUserDb(candidate as UserLocalDb)
}

export function resetCurrentUserDb(): void {
  writeCurrentUserDb(buildDefaultDb())
}

// ─── PM Dashboard helpers ──────────────────────────────────────────

export interface ProjectDashboardStats {
  totalSnags: number
  openSnags: number
  criticalSnags: number
  issuedInstructions: number
  crewMembers: number
  contributorUserIds: string[]
}

export function getProjectDashboardStats(projectId: string): ProjectDashboardStats {
  const snags = getProjectSnags(projectId)
  const instructions = getProjectInstructions(projectId)
  const contributors = readProjectContributors(projectId)
  const crewUsers = getProjectUsers(projectId)

  return {
    totalSnags: snags.length,
    openSnags: snags.filter((s) => s.status !== 'closed').length,
    criticalSnags: snags.filter((s) => s.severity === 'critical').length,
    issuedInstructions: instructions.filter((i) => i.status === 'issued').length,
    crewMembers: crewUsers.length,
    contributorUserIds: contributors.userIds,
  }
}
