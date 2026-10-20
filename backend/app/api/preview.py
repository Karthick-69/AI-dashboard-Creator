from fastapi import APIRouter, HTTPException
from app.core.session import session_manager
from app.schemas.dataset import PreviewResponse
from app.api.upload import build_preview_response

router = APIRouter()

@router.get("/{session_id}/preview", response_model=PreviewResponse)
async def get_preview(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found or expired.")
    return build_preview_response(session)
