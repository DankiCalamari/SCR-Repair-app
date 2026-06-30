import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Dashboard schemas
# ---------------------------------------------------------------------------

class DashboardStats(BaseModel):
    total_repairs: int = 0
    active_repairs: int = 0
    completed_repairs: int = 0
    pending_quotes: int = 0
    overdue_invoices: int = 0
    total_revenue: float = 0.0
    outstanding_balance: float = 0.0
    new_leads: int = 0
    warranty_claims: int = 0


class RecentActivity(BaseModel):
    id: str
    type: str
    description: str
    timestamp: datetime
    entity_type: Optional[str] = None
    entity_id: Optional[uuid.UUID] = None


class DashboardWidgets(BaseModel):
    stats: DashboardStats
    recent_activity: list[RecentActivity] = Field(default_factory=list)
    repairs_by_status: dict[str, int] = Field(default_factory=dict)
    revenue_by_month: dict[str, float] = Field(default_factory=dict)
