export interface SnagFormOption {
  id: string
  name: string
}

export interface ContractOption {
  id: string
  label: string
  project_id: string
}

export interface SnagMetaOptionsResponse {
  projects: SnagFormOption[]
  contracts: ContractOption[]
  users: SnagFormOption[]
  defect_types: SnagFormOption[]
}

export interface ClauseSuggestion {
  clause_number: string
  clause_title: string
  relevance_score: number
  explanation: string
}

export interface Snag {
  id: string
  project_id: string
  contract_id: string
  created_by: string
  defect_type_id?: string
  title: string
  description: string
  status: string
  severity: string
  compliance_flag: boolean
  variation_risk?: string
  discovered_at?: string
  due_by?: string
  closed_at?: string
  created_at?: string
  updated_at?: string
}

export interface Instruction {
  id: string
  project_id: string
  contract_id: string
  snag_id?: string
  instruction_type: string
  ai_reference?: string
  subject: string
  body_markdown: string
  status: string
  issued_at?: string
  created_at?: string
  updated_at?: string
}
