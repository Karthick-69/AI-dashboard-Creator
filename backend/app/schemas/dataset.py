from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ColumnDetail(BaseModel):
    name: str
    dtype: str
    non_null_count: int
    null_count: int
    null_percentage: float
    unique_count: int
    sample_values: List[Any]

class PreviewResponse(BaseModel):
    session_id: str
    filename: str
    file_type: str
    file_size_bytes: int
    row_count: int
    column_count: int
    columns: List[ColumnDetail]
    head_rows: List[Dict[str, Any]]
    sheet_names: Optional[List[str]] = None
    active_sheet: Optional[str] = None

class NumericDistribution(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    std: Optional[float] = None
    q25: Optional[float] = None
    q75: Optional[float] = None
    histogram: Optional[List[Dict[str, Any]]] = None

class ColumnProfile(BaseModel):
    name: str
    dtype: str
    general_type: str  # "numeric", "categorical", "datetime", "text", "boolean"
    null_count: int
    null_percentage: float
    unique_count: int
    top_categories: Optional[List[Dict[str, Any]]] = None
    numeric_stats: Optional[NumericDistribution] = None
    outlier_count: int = 0
    sample_values: List[Any] = []

class ProfileResponse(BaseModel):
    session_id: str
    total_rows: int
    total_columns: int
    duplicate_rows: int
    missing_cells: int
    missing_cells_percentage: float
    data_quality_score: float  # 0 to 100
    columns: List[ColumnProfile]
    numeric_columns: List[str]
    categorical_columns: List[str]
    datetime_columns: List[str]
    correlations: Optional[Dict[str, Dict[str, float]]] = None

class DetectedIssue(BaseModel):
    issue_id: str
    issue_type: str  # "missing_values", "duplicates", "whitespace", "inconsistent_casing", "outliers", "empty_column"
    column: Optional[str] = None
    severity: str  # "low", "medium", "high"
    title: str
    description: str
    suggested_action: str
    recommended_params: Dict[str, Any] = Field(default_factory=dict)
    affected_count: int = 0

class CleaningRule(BaseModel):
    rule_id: str
    action: str  # "drop_duplicates", "fill_missing", "drop_missing_rows", "trim_whitespace", "normalize_casing", "remove_outliers", "drop_column"
    column: Optional[str] = None
    params: Dict[str, Any] = Field(default_factory=dict)

class ApplyCleaningRequest(BaseModel):
    rules: List[CleaningRule]

class CleaningAuditEntry(BaseModel):
    operation: str
    description: str
    timestamp: str
    rows_before: int
    rows_after: int
    details: Dict[str, Any] = Field(default_factory=dict)

class CleaningResultResponse(BaseModel):
    success: bool
    session_id: str
    rows_before: int
    rows_after: int
    audit_log: List[CleaningAuditEntry]
    data_quality_score: float
    detected_issues: List[DetectedIssue]
