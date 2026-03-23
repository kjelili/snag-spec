/**
 * Per-user namespaced localStorage store.
 *
 * All data is keyed under: snag-spec-u:{userId}:db-v2
 * Each user gets their own isolated data namespace.
 */

import type {
  Snag,
  Instruction,
  SnagFormOption,
  ContractOption,
  SnagMetaOptionsResponse,
  ClauseSuggestion,
} from './api.types'

const AUTH_KEY = 'snag-spec-auth-user'

function getCurrentUserId(): string {
  try {
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) {
      const user = JSON.parse(stored)
      return user.id || 'default'
    }
  } catch {}
  return 'default'
}

function dbKey(): string {
  return `snag-spec-u:${getCurrentUserId()}:db-v2`
}

interface LocalDb {
  snags: Snag[]
  instructions: Instruction[]
  projects: SnagFormOption[]
  contracts: ContractOption[]
  users: SnagFormOption[]
  defect_types: SnagFormOption[]
}

function emptyDb(): LocalDb {
  return {
    snags: [],
    instructions: [],
    projects: [],
    contracts: [],
    users: [],
    defect_types: [],
  }
}

function loadDb(): LocalDb {
  try {
    const raw = localStorage.getItem(dbKey())
    if (raw) return { ...emptyDb(), ...JSON.parse(raw) }
  } catch {}
  return emptyDb()
}

function saveDb(db: LocalDb): void {
  localStorage.setItem(dbKey(), JSON.stringify(db))
}

function genId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Export / Import / Reset ──────────────────────────────────────

export function exportCurrentUserDb(): string {
  return JSON.stringify(loadDb(), null, 2)
}

export function importCurrentUserDb(jsonText: string): void {
  const parsed = JSON.parse(jsonText)
  const db = { ...emptyDb(), ...parsed }
  saveDb(db)
}

export function resetCurrentUserDb(): void {
  localStorage.removeItem(dbKey())
}

// ─── Snags ────────────────────────────────────────────────────────

export function getSnags(projectId?: string, status?: string): Snag[] {
  let snags = loadDb().snags
  if (projectId) snags = snags.filter((s) => s.project_id === projectId)
  if (status) snags = snags.filter((s) => s.status === status)
  return snags
}

export function getSnagById(id: string): Snag | undefined {
  return loadDb().snags.find((s) => s.id === id)
}

export function createSnag(data: Partial<Snag>): Snag {
  const db = loadDb()
  const snag: Snag = {
    id: genId(),
    project_id: data.project_id ?? '',
    contract_id: data.contract_id ?? '',
    created_by: data.created_by ?? getCurrentUserId(),
    defect_type_id: data.defect_type_id,
    title: data.title ?? 'Untitled Snag',
    description: data.description ?? '',
    status: data.status ?? 'new',
    severity: data.severity ?? 'med',
    compliance_flag: data.compliance_flag ?? false,
    variation_risk: data.variation_risk,
    discovered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }
  db.snags.push(snag)
  saveDb(db)
  return snag
}

export function updateSnag(id: string, data: Partial<Snag>): Snag {
  const db = loadDb()
  const idx = db.snags.findIndex((s) => s.id === id)
  if (idx === -1) throw new Error('Snag not found')
  db.snags[idx] = { ...db.snags[idx], ...data, updated_at: new Date().toISOString() }
  saveDb(db)
  return db.snags[idx]
}

export function removeSnag(id: string): void {
  const db = loadDb()
  db.snags = db.snags.filter((s) => s.id !== id)
  saveDb(db)
}

// ─── Clause Suggestions (stub) ───────────────────────────────────

export function getClauseSuggestions(_snagId: string): ClauseSuggestion[] {
  return [
    {
      clause_number: '2.3',
      clause_title: 'Contractor Obligations',
      relevance_score: 0.85,
      explanation: 'Relates to contractor workmanship standards.',
    },
    {
      clause_number: '3.14',
      clause_title: 'Defects',
      relevance_score: 0.78,
      explanation: 'Covers defects discovered during or after construction.',
    },
  ]
}

// ─── Instructions ─────────────────────────────────────────────────

export function getInstructions(projectId?: string, status?: string): Instruction[] {
  let instructions = loadDb().instructions
  if (projectId) instructions = instructions.filter((i) => i.project_id === projectId)
  if (status) instructions = instructions.filter((i) => i.status === status)
  return instructions
}

export function getInstructionById(id: string): Instruction | undefined {
  return loadDb().instructions.find((i) => i.id === id)
}

export function createInstruction(data: Partial<Instruction>): Instruction {
  const db = loadDb()
  const instruction: Instruction = {
    id: genId(),
    project_id: data.project_id ?? '',
    contract_id: data.contract_id ?? '',
    snag_id: data.snag_id,
    instruction_type: data.instruction_type ?? 'architect_instruction',
    ai_reference: data.ai_reference ?? `AI-${Date.now().toString(36).toUpperCase()}`,
    subject: data.subject ?? 'Untitled Instruction',
    body_markdown: data.body_markdown ?? '',
    status: data.status ?? 'draft',
    created_at: new Date().toISOString(),
  }
  db.instructions.push(instruction)
  saveDb(db)
  return instruction
}

export function generateInstruction(snagId: string, _instructionType?: string): Instruction {
  const db = loadDb()
  const snag = db.snags.find((s) => s.id === snagId)
  if (!snag) throw new Error('Snag not found')

  const project = db.projects.find((p) => p.id === snag.project_id)
  const defectType = db.defect_types.find((d) => d.id === snag.defect_type_id)

  const body = [
    `## Architect's Instruction`,
    ``,
    `**Ref:** AI-${Date.now().toString(36).toUpperCase()}`,
    `**Project:** ${project?.name ?? 'Unknown'}`,
    `**Defect:** ${snag.title}`,
    `**Severity:** ${snag.severity.toUpperCase()}`,
    defectType ? `**Defect Type:** ${defectType.name}` : '',
    ``,
    `### Description`,
    snag.description,
    ``,
    `### Required Action`,
    `The Contractor is instructed to rectify the above defect in accordance with the Contract requirements.`,
    ``,
    `### Relevant Contract Clauses`,
    `- Clause 2.3: Contractor's obligations regarding workmanship`,
    `- Clause 3.14: Making good defects`,
    snag.compliance_flag ? `- **Compliance issue flagged** — statutory requirements apply` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return createInstruction({
    project_id: snag.project_id,
    contract_id: snag.contract_id,
    snag_id: snag.id,
    instruction_type: 'architect_instruction',
    subject: `Instruction: ${snag.title}`,
    body_markdown: body,
    status: 'draft',
  })
}

export function updateInstruction(id: string, data: Partial<Instruction>): Instruction {
  const db = loadDb()
  const idx = db.instructions.findIndex((i) => i.id === id)
  if (idx === -1) throw new Error('Instruction not found')
  db.instructions[idx] = { ...db.instructions[idx], ...data, updated_at: new Date().toISOString() }
  saveDb(db)
  return db.instructions[idx]
}

// ─── Meta Options ─────────────────────────────────────────────────

export function getMetaOptions(): SnagMetaOptionsResponse {
  const db = loadDb()
  return {
    projects: db.projects,
    contracts: db.contracts,
    users: db.users,
    defect_types: db.defect_types,
  }
}

export function createProjectOption(name: string): SnagFormOption {
  const db = loadDb()
  const project: SnagFormOption = { id: genId(), name: name.trim() }
  db.projects.push(project)
  saveDb(db)
  return project
}

export function createContractOption(projectId: string, label: string): ContractOption {
  const db = loadDb()
  const contract: ContractOption = { id: genId(), label: label.trim(), project_id: projectId }
  db.contracts.push(contract)
  saveDb(db)
  return contract
}

export function createUserOption(name: string): SnagFormOption {
  const db = loadDb()
  const user: SnagFormOption = { id: genId(), name: name.trim() }
  db.users.push(user)
  saveDb(db)
  return user
}

export function createDefectTypeOption(name: string): SnagFormOption {
  const db = loadDb()
  const defectType: SnagFormOption = { id: genId(), name: name.trim() }
  db.defect_types.push(defectType)
  saveDb(db)
  return defectType
}
