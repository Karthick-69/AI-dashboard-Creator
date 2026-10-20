from fastapi import APIRouter, HTTPException
from app.core.session import session_manager
from app.schemas.dataset import ProfileResponse
from app.data_processing.profiler import profile_dataset

router = APIRouter()

@router.get("/{session_id}/profile", response_model=ProfileResponse)
async def get_dataset_profile(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found or expired.")
    return profile_dataset(session.df, session_id)
