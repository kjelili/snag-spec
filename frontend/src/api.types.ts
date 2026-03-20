/**
 * Shared type definitions for Snag-to-Spec frontend.
 */

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

export interface ClauseSuggestion {
  id: string
  clause_number: string
  clause_title: string
}
