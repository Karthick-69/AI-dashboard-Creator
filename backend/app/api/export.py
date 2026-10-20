import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.core.session import session_manager
from app.exports.pdf_exporter import generate_pdf_report
from app.exports.excel_exporter import generate_excel_workbook

router = APIRouter()

@router.get("/{session_id}/export/pdf")
async def export_pdf(session_id: str):
    """Generates and downloads executive BI analytics PDF report."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found or expired.")

    pdf_bytes = generate_pdf_report(session)
    filename = f"Analytics_Report_{session_id[:8]}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{session_id}/export/excel")
async def export_excel(session_id: str):
    """Generates and downloads multi-sheet Excel file (.xlsx)."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found or expired.")

    excel_bytes = generate_excel_workbook(session)
    filename = f"Data_Workbook_{session_id[:8]}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{session_id}/export/csv")
async def export_csv(session_id: str):
    """Downloads cleaned dataset as CSV."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found or expired.")

    csv_data = session.df.to_csv(index=False)
    filename = f"Cleaned_{session.filename}"
    if not filename.endswith(".csv"):
        filename += ".csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{session_id}/export/config")
async def export_config(session_id: str):
    """Exports dashboard configuration JSON for saving/reloading."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found or expired.")

    config = session.dashboard_config or {}
    config_json = json.dumps(config, indent=2)
    filename = f"Dashboard_Config_{session_id[:8]}.json"

    return Response(
        content=config_json,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
