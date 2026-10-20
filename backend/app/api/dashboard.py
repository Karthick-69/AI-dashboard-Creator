from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.core.session import session_manager
from app.schemas.dashboard import (
    DashboardConfig,
    DashboardGenerateRequest,
    WidgetDataQuery,
    WidgetConfig
)
from app.ai.gemini_service import gemini_service
from app.dashboard.query_engine import execute_widget_query

router = APIRouter()

@router.post("/{session_id}/dashboard/generate", response_model=DashboardConfig)
async def generate_dashboard(session_id: str, payload: DashboardGenerateRequest):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found or expired.")

    session.custom_prompt = payload.prompt or ""
    dashboard = gemini_service.generate_dashboard_from_prompt(
        df=session.df,
        session_id=session_id,
        prompt=payload.prompt or "",
        theme=payload.theme or "dark"
    )
    
    session.dashboard_config = dashboard.model_dump()
    return dashboard

@router.get("/{session_id}/dashboard", response_model=DashboardConfig)
async def get_dashboard(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found or expired.")

    if not session.dashboard_config:
        # Generate default dashboard if none exists
        dashboard = gemini_service.generate_dashboard_from_prompt(
            df=session.df,
            session_id=session_id,
            prompt="",
            theme="dark"
        )
        session.dashboard_config = dashboard.model_dump()
        return dashboard

    return DashboardConfig(**session.dashboard_config)

@router.put("/{session_id}/dashboard", response_model=DashboardConfig)
async def save_dashboard(session_id: str, payload: DashboardConfig):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found or expired.")

    session.dashboard_config = payload.model_dump()
    return payload

@router.post("/{session_id}/dashboard/query-widget")
async def query_widget_data(session_id: str, payload: WidgetDataQuery):
    """Recomputes widget series/data based on updated filters or modified axes/aggregations."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found or expired.")

    data = execute_widget_query(
        df=session.df,
        widget=payload.widget,
        active_filters=payload.active_filters
    )
    return {"widget_id": payload.widget.id, "data": data}
