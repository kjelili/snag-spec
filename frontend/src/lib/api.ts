import axios from 'axios'

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

export const snagsApi = {
  getAll: (projectId?: string, status?: string) =>
    api.get<Snag[]>('/snags', { params: { project_id: projectId, status } }),
  getById: (id: string) => api.get<Snag>(`/snags/${id}`),
  create: (data: Partial<Snag>) => api.post<Snag>('/snags', data),
  update: (id: string, data: Partial<Snag>) => api.patch<Snag>(`/snags/${id}`, data),
  getClauseSuggestions: (id: string) => api.get(`/snags/${id}/clauses`),
  getMetaOptions: () => api.get<SnagMetaOptionsResponse>('/snags/meta/options'),
}

export const instructionsApi = {
  getAll: (projectId?: string, status?: string) =>
    api.get<Instruction[]>('/instructions', { params: { project_id: projectId, status } }),
  getById: (id: string) => api.get<Instruction>(`/instructions/${id}`),
  create: (data: Partial<Instruction>) => api.post<Instruction>('/instructions', data),
  generate: (snagId: string, instructionType?: string) =>
    api.post<Instruction>('/instructions/generate', {
      snag_id: snagId,
      instruction_type: instructionType || 'architect_instruction',
    }),
  update: (id: string, data: Partial<Instruction>) => api.patch<Instruction>(`/instructions/${id}`, data),
  submit: (id: string) => api.post<Instruction>(`/instructions/${id}/submit`),
  approve: (id: string) => api.post<Instruction>(`/instructions/${id}/approve`),
  issue: (id: string) => api.post<Instruction>(`/instructions/${id}/issue`),
}
