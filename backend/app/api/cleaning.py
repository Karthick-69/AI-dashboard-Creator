from fastapi import APIRouter, HTTPException
from typing import List
from app.core.session import session_manager
from app.schemas.dataset import DetectedIssue, ApplyCleaningRequest, CleaningResultResponse, CleaningAuditEntry
from app.data_processing.cleaner import detect_cleaning_issues, apply_cleaning_rules
from app.data_processing.profiler import calculate_data_quality_score

router = APIRouter()

@router.get("/{session_id}/cleaning/detect", response_model=List[DetectedIssue])
async def detect_issues(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found or expired.")
    return detect_cleaning_issues(session.df)

@router.post("/{session_id}/cleaning/apply", response_model=CleaningResultResponse)
async def apply_cleaning(session_id: str, payload: ApplyCleaningRequest):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found or expired.")

    df, rows_before, rows_after = apply_cleaning_rules(session, payload.rules)
    
    # Recalculate issues & quality score
    updated_issues = detect_cleaning_issues(df)
    missing_pct = (df.isna().sum().sum() / (len(df) * len(df.columns)) * 100) if len(df) > 0 and len(df.columns) > 0 else 0.0
    quality_score = calculate_data_quality_score(df, missing_pct, int(df.duplicated().sum()))

    audit_entries = [CleaningAuditEntry(**log) for log in session.audit_log]

    return CleaningResultResponse(
        success=True,
        session_id=session_id,
        rows_before=rows_before,
        rows_after=rows_after,
        audit_log=audit_entries,
        data_quality_score=quality_score,
        detected_issues=updated_issues
    )

@router.post("/{session_id}/cleaning/reset", response_model=CleaningResultResponse)
async def reset_cleaning(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found or expired.")

    rows_before = len(session.df)
    session.reset_to_raw()
    rows_after = len(session.df)

    updated_issues = detect_cleaning_issues(session.df)
    missing_pct = (session.df.isna().sum().sum() / (len(session.df) * len(session.df.columns)) * 100) if len(session.df) > 0 and len(session.df.columns) > 0 else 0.0
    quality_score = calculate_data_quality_score(session.df, missing_pct, int(session.df.duplicated().sum()))

    audit_entries = [CleaningAuditEntry(**log) for log in session.audit_log]

    return CleaningResultResponse(
        success=True,
        session_id=session_id,
        rows_before=rows_before,
        rows_after=rows_after,
        audit_log=audit_entries,
        data_quality_score=quality_score,
        detected_issues=updated_issues
    )
