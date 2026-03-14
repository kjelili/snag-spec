"""
AI service for clause mapping and instruction generation
"""

from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from openai import OpenAI
from app.core.config import settings
from app.models.contract import ClauseNode, ClauseVersion
from app.models.snag import Snag
from app.models.instruction import Instruction


class AIService:
    """Service for AI-powered clause mapping and instruction generation"""
    
    def __init__(self, db: Session):
        self.db = db
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
    
    def analyze_snag_for_clauses(
        self,
        snag: Snag,
        candidate_clauses: List[ClauseNode]
    ) -> Dict:
        """
        Analyze a snag and determine relevant clauses with AI
        """
        if not self.client:
            # Fallback: return top clauses with basic scoring
            return {
                "relevant_clauses": candidate_clauses[:3],
                "variation_risk": "low",
                "confidence": 0.7
            }
        
        # Get clause texts for context
        clause_texts = []
        for clause in candidate_clauses:
            version = self.db.query(ClauseVersion).filter(
                ClauseVersion.clause_node_id == clause.id
            ).first()
            if version:
                clause_texts.append(f"Clause {clause.clause_number}: {version.plain_english_summary or version.clause_text[:200]}")
        
        prompt = f"""
        Analyze this construction snag and determine which JCT contract clauses are most relevant.
        
        Snag Description: {snag.description}
        Snag Title: {snag.title}
        Severity: {snag.severity.value}
        
        Candidate Clauses:
        {chr(10).join(clause_texts[:10])}
        
        Please provide:
        1. List of most relevant clause numbers (top 3)
        2. Variation risk assessment (low/med/high)
        3. Brief reasoning
        
        Return as JSON:
        {{
            "relevant_clause_numbers": ["2.1", "3.18"],
            "variation_risk": "low",
            "reasoning": "Brief explanation"
        }}
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a construction contract expert specializing in JCT contracts."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            # Parse response (simplified - would need proper JSON parsing)
            result = response.choices[0].message.content
            
            # For now, return basic structure
            return {
                "relevant_clauses": candidate_clauses[:3],
                "variation_risk": "low",
                "confidence": 0.8,
                "ai_reasoning": result
            }
        except Exception as e:
            # Fallback on error
            return {
                "relevant_clauses": candidate_clauses[:3],
                "variation_risk": "low",
                "confidence": 0.6,
                "error": str(e)
            }
    
    def generate_instruction_draft(
        self,
        snag: Snag,
        clauses: List[ClauseNode],
        project_name: str,
        contract_form: str
    ) -> str:
        """
        Generate an Architect's Instruction draft from a snag
        """
        if not self.client:
            # Return template-based draft
            return self._generate_template_instruction(snag, clauses, project_name, contract_form)
        
        # Get clause details
        clause_refs = [f"Clause {clause.clause_number}" for clause in clauses]
        clause_summaries = []
        for clause in clauses:
            version = self.db.query(ClauseVersion).filter(
                ClauseVersion.clause_node_id == clause.id
            ).first()
            if version:
                clause_summaries.append(f"Clause {clause.clause_number}: {version.plain_english_summary or 'General obligation'}")
        
        prompt = f"""
        Generate a professional Architect's Instruction for the following construction defect.
        The instruction must be contractually compliant and reference the correct JCT clauses.
        
        Project: {project_name}
        Contract: JCT {contract_form}
        Snag: {snag.title}
        Description: {snag.description}
        Severity: {snag.severity.value}
        
        Relevant Clauses:
        {chr(10).join(clause_summaries)}
        
        Generate an Architect's Instruction with:
        1. Clear subject line
        2. Instruction body referencing the clauses
        3. Required actions
        4. Timescale (based on severity)
        5. Note about variation risk if applicable
        
        Format as professional letter/directive suitable for formal issue.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert in drafting Architect's Instructions for JCT contracts. You write clear, legally precise, and professionally formatted instructions."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4,
                max_tokens=1500
            )
            
            return response.choices[0].message.content
        except Exception as e:
            # Fallback to template
            return self._generate_template_instruction(snag, clauses, project_name, contract_form)
    
    def _generate_template_instruction(
        self,
        snag: Snag,
        clauses: List[ClauseNode],
        project_name: str,
        contract_form: str
    ) -> str:
        """Generate instruction from template (fallback)"""
        clause_refs = ", ".join([f"Clause {clause.clause_number}" for clause in clauses])
        
        days_map = {
            "low": 14,
            "med": 7,
            "high": 3,
            "critical": 1
        }
        days = days_map.get(snag.severity.value, 7)
        
        template = f"""ARCHITECT'S INSTRUCTION

Project: {project_name}
Contract: JCT {contract_form}
AI Ref: [Auto-generated]

SUBJECT: Remedy {snag.title}

You are instructed, pursuant to {clause_refs} of the JCT Standard Building Contract, to remedy the following defect:

{snag.description}

Required Action:
1. Investigate and identify the cause of the defect
2. Propose remediation method for review (if required)
3. Execute remedial works in accordance with the Contract Documents
4. Provide evidence of completion and access for inspection

Timescale: Complete within {days} working days of this instruction.

Inspection: Notify the Architect/Contract Administrator at least 24 hours before completion for inspection.

Contract Basis: {clause_refs}

Note: If you consider any part of this instruction constitutes a Variation, notify in accordance with the Contract procedures before execution.

[This is a draft instruction requiring review and approval before issue.]
"""
        return template
