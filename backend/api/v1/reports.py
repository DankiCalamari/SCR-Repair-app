from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_admin
from models.user import User
from models.repair import Repair, RepairStatus
from models.invoice import Invoice
from models.device import Device

router = APIRouter()


@router.get("", response_model=dict)
async def get_report(
    period: str = "month",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Generate business report for the specified period."""
    now = datetime.utcnow()

    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    elif period == "quarter":
        start_date = now - timedelta(days=90)
    else:  # year
        start_date = now - timedelta(days=365)

    # Total repairs
    repairs_result = await db.execute(
        select(func.count()).select_from(Repair).where(
            Repair.created_at >= start_date.replace(tzinfo=None)
        )
    )
    total_repairs = repairs_result.scalar() or 0
    
    # Completed repairs
    completed_result = await db.execute(
        select(func.count()).select_from(Repair).where(
            Repair.status == RepairStatus.COMPLETED,
            Repair.created_at >= start_date.replace(tzinfo=None)
        )
    )
    completed_repairs = completed_result.scalar() or 0
    
    # Total revenue (from completed invoices)
    revenue_result = await db.execute(
        select(func.sum(Invoice.total_amount)).select_from(Invoice).where(
            Invoice.status == "paid",
            Invoice.created_at >= start_date.replace(tzinfo=None)
        )
    )
    total_revenue = float(revenue_result.scalar() or 0)
    
    # Average turnaround time (days)
    turnaround_result = await db.execute(
        select(func.avg(
            func.extract('epoch', Repair.completed_date - Repair.created_at) / 86400
        )).select_from(Repair).where(
            Repair.status == RepairStatus.COMPLETED,
            Repair.created_at >= start_date.replace(tzinfo=None),
            Repair.completed_date.isnot(None)
        )
    )
    avg_turnaround = round(float(turnaround_result.scalar() or 0), 1)
    
    # Popular devices (using device relationship through repairs)
    devices_result = await db.execute(
        select(
            func.concat(Device.brand, ' ', Device.model).label('device'),
            func.count().label('count')
        )
        .select_from(Repair)
        .join(Device, Repair.device_id == Device.id)
        .where(
            Repair.status == RepairStatus.COMPLETED,
            Repair.created_at >= start_date.replace(tzinfo=None)
        )
        .group_by(Device.brand, Device.model)
        .order_by(func.count().desc())
        .limit(5)
    )
    popular_devices = [
        {"device": str(row.device), "count": row.count}
        for row in devices_result.all()
    ]
    
    return {
        "period": period,
        "total_repairs": total_repairs,
        "completed_repairs": completed_repairs,
        "total_revenue": total_revenue,
        "average_turnaround": avg_turnaround,
        "popular_devices": popular_devices,
    }


@router.get("/download", response_model=dict)
async def download_report(
    period: str = Query("month"),
    format: str = Query("pdf"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Download report as PDF or CSV."""
    # In production, this would generate actual files
    # For now, return a placeholder response
    return {
        "message": f"Report download would be generated here in {format} format for {period} period",
        "download_url": f"/api/v1/reports/download?period={period}&format={format}",
    }