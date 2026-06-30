from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# System health schemas
# ---------------------------------------------------------------------------

class ComponentHealth(BaseModel):
    name: str
    status: str = Field(..., pattern="^(healthy|degraded|unhealthy|unknown)$")
    latency_ms: Optional[float] = None
    message: Optional[str] = None
    last_checked: Optional[datetime] = None


class SystemHealthResponse(BaseModel):
    status: str = Field(..., pattern="^(healthy|degraded|unhealthy)$")
    version: Optional[str] = None
    uptime_seconds: Optional[float] = None
    timestamp: datetime
    components: list[ComponentHealth] = Field(default_factory=list)
