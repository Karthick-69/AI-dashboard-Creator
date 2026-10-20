from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.schemas.dashboard import WidgetConfig

class ChatMessage(BaseModel):
    role: str  # "user", "assistant", "system"
    content: str
    timestamp: Optional[str] = None
    chart: Optional[WidgetConfig] = None
    suggested_actions: Optional[List[str]] = None

class ChatRequest(BaseModel):
    message: str
    active_filters: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ChatResponse(BaseModel):
    reply: str
    chart: Optional[WidgetConfig] = None
    suggested_followups: Optional[List[str]] = None
    computed_facts: Optional[Dict[str, Any]] = None
