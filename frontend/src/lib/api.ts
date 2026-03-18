import axios from 'axios'

type ApiResponse<T> = { data: T }

export interface Snag {
  id: string
  project_id: string
  contract_id: string
  created_by: string
  defect_type_id?: string
  title: string
  description: string
  location_id?: string
  status: 'new' | 'triage' | 'needs_info' | 'ready_to_instruct' | 'instructed' | 'in_progress' | 'fixed_pending_verify' | 'closed'
  severity: 'low' | 'med' | 'high' | 'critical'
  compliance_flag: boolean
  variation_risk?: 'low' | 'med' | 'high'
  discovered_at: string
  due_by?: string
  closed_at?: string
}

export interface Instruction {
  id: string
  project_id: string
  contract_id: string
  snag_id?: string
  instruction_type: 'architect_instruction' | 'ca_instruction' | 'ea_instruction' | 'site_notice'
  ai_reference?: string
  subject: string
  body_markdown: string
  status: 'draft' | 'review' | 'approved' | 'issued' | 'withdrawn' | 'superseded'
  issued_to_party_id?: string
  issued_by_user_id?: string
  issued_at?: string
  response_required_by?: string
  delivery_method?: 'email' | 'cde' | 'printed' | 'other'
  pdf_document_id?: string
  created_at: string
}

export interface SnagFormOption {
  id: string
  name: string
}

export interface ContractOption {
  id: string
  project_id: string
  label: string
}

export interface SnagMetaOptionsResponse {
  projects: SnagFormOption[]
  contracts: ContractOption[]
  defect_types: SnagFormOption[]
  users: SnagFormOption[]
}

interface ClauseSuggestion {
  id: string
  clause_number: string
  clause_title: string
}

interface LocalDb {
  projects: SnagFormOption[]
  contracts: ContractOption[]
  defect_types: SnagFormOption[]
  users: SnagFormOption[]
  snags: Snag[]
  instructions: Instruction[]
}

const LOCAL_DB_KEY = 'snag-spec-local-db-v1'
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
  headers: {
    'Content-Type': 'application/json',
    ...(resolvedApiKey ? { 'X-API-Key': resolvedApiKey } : {}),
  },
})

export default api

const asResponse = <T>(data: T): Promise<ApiResponse<T>> => Promise.resolve({ data })
const nowIso = () => new Date().toISOString()
const newId = () => crypto.randomUUID()
const normalizeInstructionType = (
  instructionType?: string
): Instruction['instruction_type'] => {
  if (
    instructionType === 'architect_instruction' ||
    instructionType === 'ca_instruction' ||
    instructionType === 'ea_instruction' ||
    instructionType === 'site_notice'
  ) {
    return instructionType
  }
  return 'architect_instruction'
}

const buildDefaultDb = (): LocalDb => {
  return {
    projects: [],
    contracts: [],
    users: [],
    defect_types: [],
    snags: [],
    instructions: [],
  }
}

const hasLegacyDemoSeed = (db: LocalDb): boolean => {
  const hasDemoProject = db.projects.length === 1 && db.projects[0].name === 'Demo Tower Refurbishment'
  const hasDemoContract = db.contracts.length === 1 && db.contracts[0].label === 'DEMO-CONTRACT-001'
  const hasDemoUser = db.users.length === 1 && db.users[0].name === 'Lead Architect'
  const defectNames = db.defect_types.map((item) => item.name)
  const hasDemoDefects =
    db.defect_types.length === 2 &&
    defectNames.includes('Fire stopping non-compliance') &&
    defectNames.includes('Waterproofing/water ingress')

  return hasDemoProject && hasDemoContract && hasDemoUser && hasDemoDefects
}

const readLocalDb = (): LocalDb => {
  const raw = localStorage.getItem(LOCAL_DB_KEY)
  if (!raw) {
    const db = buildDefaultDb()
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db))
    return db
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocalDb>
    const hydrated: LocalDb = {
      projects: parsed.projects ?? [],
      contracts: parsed.contracts ?? [],
      defect_types: parsed.defect_types ?? [],
      users: parsed.users ?? [],
      snags: parsed.snags ?? [],
      instructions: parsed.instructions ?? [],
    }

    // One-time migration: remove old demo seed defaults for user-owned data mode.
    if (
      hydrated.snags.length === 0 &&
      hydrated.instructions.length === 0 &&
      hasLegacyDemoSeed(hydrated)
    ) {
      const cleared = buildDefaultDb()
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(cleared))
      return cleared
    }

    return hydrated
  } catch {
    const db = buildDefaultDb()
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db))
    return db
  }
}

const writeLocalDb = (db: LocalDb): void => {
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db))
}

const validateLocalDbShape = (candidate: unknown): candidate is LocalDb => {
  if (!candidate || typeof candidate !== 'object') {
    return false
  }
  const db = candidate as Partial<LocalDb>
  return (
    Array.isArray(db.projects) &&
    Array.isArray(db.contracts) &&
    Array.isArray(db.defect_types) &&
    Array.isArray(db.users) &&
    Array.isArray(db.snags) &&
    Array.isArray(db.instructions)
  )
}

export const isLocalStorageMode = (): boolean => isLocalMode

export const exportLocalDbJson = (): string => {
  const db = readLocalDb()
  return JSON.stringify(db, null, 2)
}

export const importLocalDbJson = (jsonText: string): void => {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('Invalid JSON. Please provide a valid backup file.')
  }

  if (!validateLocalDbShape(parsed)) {
    throw new Error('Invalid backup format. Required collections are missing.')
  }

  writeLocalDb(parsed)
}

export const resetLocalDb = (): void => {
  writeLocalDb(buildDefaultDb())
}

const localGetSnags = (projectId?: string, status?: string): Snag[] => {
  const db = readLocalDb()
  return db.snags
    .filter((snag) => (projectId ? snag.project_id === projectId : true))
    .filter((snag) => (status ? snag.status === status : true))
    .sort((a, b) => +new Date(b.discovered_at) - +new Date(a.discovered_at))
}

const localGetInstructions = (projectId?: string, status?: string): Instruction[] => {
  const db = readLocalDb()
  return db.instructions
    .filter((instruction) => (projectId ? instruction.project_id === projectId : true))
    .filter((instruction) => (status ? instruction.status === status : true))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
}

const localClauseSuggestions = (snag: Snag): ClauseSuggestion[] => {
  if (!snag.defect_type_id) {
    return []
  }

  return [
    {
      id: newId(),
      clause_number: '2.30',
      clause_title: 'Defective Work and Rectification',
    },
    {
      id: newId(),
      clause_number: '3.18',
      clause_title: 'Instructions and Contract Compliance',
    },
  ]
}

export const snagsApi = {
  getAll: (projectId?: string, status?: string) =>
    isLocalMode
      ? asResponse(localGetSnags(projectId, status))
      : api.get<Snag[]>('/snags', { params: { project_id: projectId, status } }),

  getById: (id: string) => {
    if (!isLocalMode) {
      return api.get<Snag>(`/snags/${id}`)
    }
    const db = readLocalDb()
    const snag = db.snags.find((item) => item.id === id)
    if (!snag) {
      return Promise.reject(new Error('Snag not found'))
    }
    return asResponse(snag)
  },

  create: (data: Partial<Snag>) => {
    if (!isLocalMode) {
      return api.post<Snag>('/snags', data)
    }

    const db = readLocalDb()
    const created: Snag = {
      id: newId(),
      project_id: data.project_id || db.projects[0]?.id || '',
      contract_id: data.contract_id || db.contracts[0]?.id || '',
      created_by: data.created_by || db.users[0]?.id || '',
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

    db.snags.push(created)
    writeLocalDb(db)
    return asResponse(created)
  },

  update: (id: string, data: Partial<Snag>) => {
    if (!isLocalMode) {
      return api.patch<Snag>(`/snags/${id}`, data)
    }

    const db = readLocalDb()
    const index = db.snags.findIndex((item) => item.id === id)
    if (index < 0) {
      return Promise.reject(new Error('Snag not found'))
    }
    const updated = { ...db.snags[index], ...data }
    db.snags[index] = updated
    writeLocalDb(db)
    return asResponse(updated)
  },

  getClauseSuggestions: (id: string) => {
    if (!isLocalMode) {
      return api.get<ClauseSuggestion[]>(`/snags/${id}/clauses`)
    }
    const db = readLocalDb()
    const snag = db.snags.find((item) => item.id === id)
    if (!snag) {
      return asResponse([])
    }
    return asResponse(localClauseSuggestions(snag))
  },

  getMetaOptions: () => {
    if (!isLocalMode) {
      return api.get<SnagMetaOptionsResponse>('/snags/meta/options')
    }
    const db = readLocalDb()
    return asResponse({
      projects: db.projects,
      contracts: db.contracts,
      defect_types: db.defect_types,
      users: db.users,
    })
  },
}

export const instructionsApi = {
  getAll: (projectId?: string, status?: string) =>
    isLocalMode
      ? asResponse(localGetInstructions(projectId, status))
      : api.get<Instruction[]>('/instructions', { params: { project_id: projectId, status } }),

  getById: (id: string) => {
    if (!isLocalMode) {
      return api.get<Instruction>(`/instructions/${id}`)
    }
    const db = readLocalDb()
    const instruction = db.instructions.find((item) => item.id === id)
    if (!instruction) {
      return Promise.reject(new Error('Instruction not found'))
    }
    return asResponse(instruction)
  },

  create: (data: Partial<Instruction>) => {
    if (!isLocalMode) {
      return api.post<Instruction>('/instructions', data)
    }

    const db = readLocalDb()
    const created: Instruction = {
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
      issued_by_user_id: data.issued_by_user_id,
      issued_at: data.issued_at,
      response_required_by: data.response_required_by,
      delivery_method: data.delivery_method,
      pdf_document_id: data.pdf_document_id,
      created_at: data.created_at || nowIso(),
    }

    db.instructions.push(created)
    writeLocalDb(db)
    return asResponse(created)
  },

  generate: (snagId: string, instructionType?: string) => {
    if (!isLocalMode) {
      return api.post<Instruction>('/instructions/generate', {
        snag_id: snagId,
        instruction_type: instructionType || 'architect_instruction',
      })
    }

    const db = readLocalDb()
    const snag = db.snags.find((item) => item.id === snagId)
    if (!snag) {
      return Promise.reject(new Error('Snag not found'))
    }

    const created: Instruction = {
      id: newId(),
      project_id: snag.project_id,
      contract_id: snag.contract_id,
      snag_id: snag.id,
      instruction_type: normalizeInstructionType(instructionType),
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
      created_at: nowIso(),
    }

    db.instructions.push(created)
    const snagIndex = db.snags.findIndex((item) => item.id === snag.id)
    if (snagIndex >= 0) {
      db.snags[snagIndex] = { ...db.snags[snagIndex], status: 'instructed' }
    }

    writeLocalDb(db)
    return asResponse(created)
  },

  update: (id: string, data: Partial<Instruction>) => {
    if (!isLocalMode) {
      return api.patch<Instruction>(`/instructions/${id}`, data)
    }
    const db = readLocalDb()
    const index = db.instructions.findIndex((item) => item.id === id)
    if (index < 0) {
      return Promise.reject(new Error('Instruction not found'))
    }
    const updated = { ...db.instructions[index], ...data }
    db.instructions[index] = updated
    writeLocalDb(db)
    return asResponse(updated)
  },

  submit: (id: string) => {
    if (!isLocalMode) {
      return api.post<Instruction>(`/instructions/${id}/submit`)
    }
    return instructionsApi.update(id, { status: 'review' })
  },

  approve: (id: string) => {
    if (!isLocalMode) {
      return api.post<Instruction>(`/instructions/${id}/approve`)
    }
    return instructionsApi.update(id, { status: 'approved' })
  },

  issue: (id: string) => {
    if (!isLocalMode) {
      return api.post<Instruction>(`/instructions/${id}/issue`)
    }
    return instructionsApi.update(id, { status: 'issued', issued_at: nowIso() })
  },
}
