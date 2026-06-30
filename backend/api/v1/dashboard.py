from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_staff
from models.user import User
from schemas.dashboard import DashboardStats, DashboardWidgets, RecentActivity
from services.dashboard_service import get_dashboard_widgets

router = APIRouter()


@router.get("/widgets")
async def get_widgets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    widgets = await get_dashboard_widgets(db)
    return widgets


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    widgets = await get_dashboard_widgets(db)
    return DashboardStats(
        total_repairs=widgets.get("active_repairs", 0) + widgets.get("ready_for_collection", 0),
        active_repairs=widgets.get("active_repairs", 0),
        completed_repairs=0,
        pending_quotes=widgets.get("outstanding_quotes", 0),
        overdue_invoices=widgets.get("outstanding_invoices", 0),
        total_revenue=widgets.get("total_revenue", 0.0),
        outstanding_balance=0.0,
        new_leads=widgets.get("total_leads_new", 0),
        warranty_claims=0,
    )


@router.get("/recent-activity", response_model=list[dict])
async def get_recent_activity(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    widgets = await get_dashboard_widgets(db)
    activity = []

    for repair in widgets.get("recent_repairs", []):
        activity.append({
            "id": str(repair.id),
            "type": "repair",
            "description": f"Repair {repair.ticket_number} - {repair.status.value}",
            "timestamp": repair.created_at,
            "entity_type": "repair",
            "entity_id": repair.id,
        })

    for lead in widgets.get("recent_leads", []):
        activity.append({
            "id": str(lead.id),
            "type": "lead",
            "description": f"New lead: {lead.name}",
            "timestamp": lead.created_at,
            "entity_type": "lead",
            "entity_id": lead.id,
        })

    # Sort by timestamp descending
    activity.sort(key=lambda x: x["timestamp"], reverse=True)
    return activity[:20]
