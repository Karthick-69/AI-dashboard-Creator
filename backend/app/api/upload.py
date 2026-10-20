import io
import os
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from app.core.config import settings
from app.core.session import session_manager
from app.schemas.dataset import PreviewResponse, ColumnDetail

router = APIRouter()

def build_preview_response(session) -> PreviewResponse:
    df = session.df
    columns_detail = []
    total_rows = len(df)
    
    for col in df.columns:
        series = df[col]
        null_count = int(series.isna().sum())
        null_pct = round((null_count / total_rows * 100), 1) if total_rows > 0 else 0.0
        sample_vals = series.dropna().head(4).tolist()
        sample_vals = [str(v) for v in sample_vals]

        columns_detail.append(ColumnDetail(
            name=str(col),
            dtype=str(series.dtype),
            non_null_count=total_rows - null_count,
            null_count=null_count,
            null_percentage=null_pct,
            unique_count=int(series.nunique()),
            sample_values=sample_vals
        ))

    # Clean head rows for JSON serialization
    head_rows = df.head(10).to_dict(orient="records")
    clean_head = []
    for r in head_rows:
        clean_r = {}
        for k, v in r.items():
            if pd.isna(v):
                clean_r[str(k)] = None
            elif isinstance(v, (int, float, str, bool)):
                clean_r[str(k)] = v
            else:
                clean_r[str(k)] = str(v)
        clean_head.append(clean_r)

    return PreviewResponse(
        session_id=session.session_id,
        filename=session.filename,
        file_type=session.file_type,
        file_size_bytes=session.file_size,
        row_count=total_rows,
        column_count=len(df.columns),
        columns=columns_detail,
        head_rows=clean_head
    )

@router.post("/upload", response_model=PreviewResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None)
):
    """Accepts CSV, Excel (xlsx/xls), or JSON files with validation."""
    filename = file.filename or "dataset.csv"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file format '{ext}'. Supported: {', '.join(settings.ALLOWED_EXTENSIONS)}")

    content = await file.read()
    file_size = len(content)

    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum size limit of {settings.MAX_UPLOAD_SIZE_MB}MB.")
    if file_size == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    try:
        available_sheets = None
        active_sheet = None

        if ext == ".csv":
            # Try reading with utf-8, fallback to latin-1
            try:
                df = pd.read_csv(io.BytesIO(content), encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(content), encoding="latin-1")
        elif ext in [".xlsx", ".xls"]:
            excel_file = pd.ExcelFile(io.BytesIO(content))
            available_sheets = excel_file.sheet_names
            target_sheet = sheet_name if (sheet_name and sheet_name in available_sheets) else available_sheets[0]
            active_sheet = target_sheet
            df = pd.read_excel(excel_file, sheet_name=target_sheet)
        elif ext == ".json":
            df = pd.read_json(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported format.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="The dataset contains no records.")

    session = session_manager.create_session(filename, ext.replace(".", ""), file_size, df)
    res = build_preview_response(session)
    res.sheet_names = available_sheets
    res.active_sheet = active_sheet
    return res

@router.post("/sample/{sample_name}", response_model=PreviewResponse)
async def load_sample_dataset(sample_name: str):
    """Loads pre-packaged sample dataset for instant demonstration."""
    sample_files = {
        "sales": "sales_data.csv",
        "students": "student_performance.csv",
        "employees": "employee_analytics.csv",
        "inventory": "inventory_management.csv",
        "dirty_retail": "dirty_retail_data.csv"
    }

    if sample_name not in sample_files:
        raise HTTPException(status_code=404, detail=f"Sample '{sample_name}' not found. Available: {list(sample_files.keys())}")

    filepath = settings.SAMPLE_DATA_DIR / sample_files[sample_name]
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Sample dataset file missing on server.")

    df = pd.read_csv(filepath)
    file_size = filepath.stat().st_size
    session = session_manager.create_session(sample_files[sample_name], "csv", file_size, df)
    return build_preview_response(session)
