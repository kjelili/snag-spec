"""
Clause retrieval and mapping service
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.contract import ClauseNode, ClauseVersion, ClauseTag, ClauseNodeTag
from app.models.snag import DefectType


class ClauseService:
    """Service for clause retrieval and mapping"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_clauses_by_tags(
        self,
        tags: List[str],
        contract_edition_id: Optional[str] = None,
        limit: int = 10
    ) -> List[ClauseNode]:
        """
        Retrieve clauses by tags
        """
        query = self.db.query(ClauseNode).join(
            ClauseNodeTag
        ).join(
            ClauseTag
        ).filter(
            ClauseTag.name.in_(tags)
        )
        
        if contract_edition_id:
            query = query.filter(ClauseNode.contract_edition_id == contract_edition_id)
        
        return query.limit(limit).all()
    
    def map_defect_to_clauses(
        self,
        defect_type_id: str,
        contract_edition_id: str
    ) -> List[ClauseNode]:
        """
        Map a defect type to relevant clauses
        """
        # Get defect type
        defect_type = self.db.query(DefectType).filter(
            DefectType.id == defect_type_id
        ).first()
        
        if not defect_type:
            return []
        
        # Map defect category to clause tags (simplified mapping)
        tag_mapping = {
            "compliance": ["statutory_compliance", "quality", "inspection_testing"],
            "safety": ["statutory_compliance", "quality", "defective_work"],
            "quality": ["workmanship", "materials", "quality", "defective_work"],
            "incomplete": ["completion", "practical_completion_support"],
            "damage": ["protection_of_works", "make_good_damage"],
        }
        
        tags = tag_mapping.get(defect_type.category, ["defective_work", "quality"])
        
        return self.get_clauses_by_tags(tags, contract_edition_id)
