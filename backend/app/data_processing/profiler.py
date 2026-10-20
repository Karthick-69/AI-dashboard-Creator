import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from app.schemas.dataset import ProfileResponse, ColumnProfile, NumericDistribution

def detect_column_type(series: pd.Series) -> str:
    """Classifies column into general types: numeric, categorical, datetime, boolean, or text."""
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    
    # Try parsing numeric even if currently object dtype (handles dirty data e.g. "twenty", "$100")
    non_null = series.dropna()
    if len(non_null) > 0:
        numeric_parsed = pd.to_numeric(series.astype(str).str.replace('$', '', regex=False).str.replace(',', '', regex=False).str.strip(), errors='coerce')
        valid_numeric_count = int(numeric_parsed.notna().sum())
        if valid_numeric_count >= len(non_null) * 0.5 and valid_numeric_count >= 3:
            return "numeric"

    # Try parsing sample to datetime
    if len(non_null) > 0:
        sample = non_null.head(10).astype(str)
        date_like = 0
        for val in sample:
            if any(char in val for char in ['-', '/', ':']) and any(c.isdigit() for c in val):
                try:
                    pd.to_datetime(val)
                    date_like += 1
                except Exception:
                    pass
        if date_like >= len(sample) * 0.8:
            return "datetime"
            
    # Check if categorical vs free text
    unique_count = series.nunique()
    total_count = len(non_null)
    if total_count > 0 and (unique_count / total_count < 0.5 or unique_count <= 35):
        return "categorical"
        
    return "text"

def calculate_data_quality_score(df: pd.DataFrame, missing_pct: float, duplicate_count: int) -> float:
    """Computes a composite data quality score from 0 to 100."""
    score = 100.0
    
    # Penalty for missing values (up to 40 points)
    score -= min(missing_pct * 0.8, 40.0)
    
    # Penalty for duplicates (up to 25 points)
    if len(df) > 0:
        dup_pct = (duplicate_count / len(df)) * 100
        score -= min(dup_pct * 1.5, 25.0)
        
    # Penalty for constant or empty columns (up to 15 points)
    empty_cols = sum(df[col].nunique() <= 1 for col in df.columns)
    if len(df.columns) > 0:
        score -= (empty_cols / len(df.columns)) * 15.0
        
    return max(0.0, min(100.0, round(score, 1)))

def profile_dataset(df: pd.DataFrame, session_id: str) -> ProfileResponse:
    """Executes thorough profiling of the pandas DataFrame."""
    total_rows = len(df)
    total_cols = len(df.columns)
    
    if total_rows == 0:
        return ProfileResponse(
            session_id=session_id,
            total_rows=0,
            total_columns=total_cols,
            duplicate_rows=0,
            missing_cells=0,
            missing_cells_percentage=0.0,
            data_quality_score=0.0,
            columns=[],
            numeric_columns=[],
            categorical_columns=[],
            datetime_columns=[],
            correlations={}
        )

    duplicate_rows = int(df.duplicated().sum())
    total_cells = total_rows * total_cols
    missing_cells = int(df.isna().sum().sum())
    missing_pct = round((missing_cells / total_cells * 100) if total_cells > 0 else 0.0, 2)
    quality_score = calculate_data_quality_score(df, missing_pct, duplicate_rows)

    column_profiles: List[ColumnProfile] = []
    numeric_cols: List[str] = []
    categorical_cols: List[str] = []
    datetime_cols: List[str] = []

    for col in df.columns:
        series = df[col]
        col_type = detect_column_type(series)
        null_count = int(series.isna().sum())
        null_pct = round((null_count / total_rows * 100), 2)
        unique_cnt = int(series.nunique())
        
        sample_vals = series.dropna().head(5).tolist()
        sample_vals = [None if pd.isna(v) else (v if isinstance(v, (int, float, str, bool)) else str(v)) for v in sample_vals]

        num_stats: Optional[NumericDistribution] = None
        top_cats: Optional[List[Dict[str, Any]]] = None
        outlier_count = 0

        if col_type == "numeric":
            numeric_cols.append(col)
            clean_num = pd.to_numeric(series, errors='coerce').dropna()
            if len(clean_num) > 0:
                q25 = float(clean_num.quantile(0.25))
                q75 = float(clean_num.quantile(0.75))
                iqr = q75 - q25
                lower_bound = q25 - 1.5 * iqr
                upper_bound = q75 + 1.5 * iqr
                outlier_count = int(((clean_num < lower_bound) | (clean_num > upper_bound)).sum())

                # Generate histogram bins
                hist_vals, bin_edges = np.histogram(clean_num, bins=min(8, max(3, unique_cnt)))
                histogram_data = []
                for i in range(len(hist_vals)):
                    histogram_data.append({
                        "bin": f"{bin_edges[i]:.1f} - {bin_edges[i+1]:.1f}",
                        "count": int(hist_vals[i])
                    })

                num_stats = NumericDistribution(
                    min=round(float(clean_num.min()), 2),
                    max=round(float(clean_num.max()), 2),
                    mean=round(float(clean_num.mean()), 2),
                    median=round(float(clean_num.median()), 2),
                    std=round(float(clean_num.std()), 2) if len(clean_num) > 1 else 0.0,
                    q25=round(q25, 2),
                    q75=round(q75, 2),
                    histogram=histogram_data
                )
        elif col_type in ["categorical", "boolean", "text"]:
            categorical_cols.append(col)
            val_counts = series.value_counts().head(8)
            top_cats = [{"category": str(k), "count": int(v), "percentage": round((v / total_rows) * 100, 1)} for k, v in val_counts.items()]
        elif col_type == "datetime":
            datetime_cols.append(col)

        column_profiles.append(ColumnProfile(
            name=str(col),
            dtype=str(series.dtype),
            general_type=col_type,
            null_count=null_count,
            null_percentage=null_pct,
            unique_count=unique_cnt,
            top_categories=top_cats,
            numeric_stats=num_stats,
            outlier_count=outlier_count,
            sample_values=sample_vals
        ))

    # Calculate correlation matrix for numeric columns
    correlations: Dict[str, Dict[str, float]] = {}
    if len(numeric_cols) > 1:
        try:
            num_df = df[numeric_cols].apply(pd.to_numeric, errors='coerce')
            corr_matrix = num_df.corr().fillna(0)
            for c1 in numeric_cols:
                correlations[c1] = {}
                for c2 in numeric_cols:
                    correlations[c1][c2] = round(float(corr_matrix.loc[c1, c2]), 2)
        except Exception:
            correlations = {}

    return ProfileResponse(
        session_id=session_id,
        total_rows=total_rows,
        total_columns=total_cols,
        duplicate_rows=duplicate_rows,
        missing_cells=missing_cells,
        missing_cells_percentage=missing_pct,
        data_quality_score=quality_score,
        columns=column_profiles,
        numeric_columns=numeric_cols,
        categorical_columns=categorical_cols,
        datetime_columns=datetime_cols,
        correlations=correlations
    )
