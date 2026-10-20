import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from app.schemas.dashboard import WidgetConfig

def apply_active_filters(df: pd.DataFrame, filters: Optional[Dict[str, Any]]) -> pd.DataFrame:
    """Applies global dashboard slicers and widget-level filters to the DataFrame."""
    if not filters or df.empty:
        return df

    filtered_df = df.copy()
    for col, filter_val in filters.items():
        if col not in filtered_df.columns or filter_val is None:
            continue

        # Handle list of selected categories
        if isinstance(filter_val, list):
            if len(filter_val) > 0:
                filtered_df = filtered_df[filtered_df[col].astype(str).isin([str(v) for v in filter_val])]
        # Handle dict range {min, max} or {start, end}
        elif isinstance(filter_val, dict):
            if "min" in filter_val and filter_val["min"] is not None:
                filtered_df = filtered_df[pd.to_numeric(filtered_df[col], errors='coerce') >= float(filter_val["min"])]
            if "max" in filter_val and filter_val["max"] is not None:
                filtered_df = filtered_df[pd.to_numeric(filtered_df[col], errors='coerce') <= float(filter_val["max"])]
            if "start" in filter_val and filter_val["start"]:
                try:
                    start_dt = pd.to_datetime(filter_val["start"])
                    dt_series = pd.to_datetime(filtered_df[col], errors='coerce')
                    filtered_df = filtered_df[dt_series >= start_dt]
                except Exception:
                    pass
            if "end" in filter_val and filter_val["end"]:
                try:
                    end_dt = pd.to_datetime(filter_val["end"])
                    dt_series = pd.to_datetime(filtered_df[col], errors='coerce')
                    filtered_df = filtered_df[dt_series <= end_dt]
                except Exception:
                    pass
        elif isinstance(filter_val, (str, int, float, bool)):
            filtered_df = filtered_df[filtered_df[col].astype(str) == str(filter_val)]

    return filtered_df

def compute_aggregate(series: pd.Series, agg_func: str) -> float:
    """Computes specific aggregate safely for both numeric and categorical columns."""
    agg = (agg_func or "sum").lower()
    
    if agg == "distinct_count":
        cleaned = series.dropna().astype(str).str.strip()
        cleaned = cleaned[(cleaned != '') & (cleaned != 'nan')]
        return float(cleaned.nunique())

    if agg == "count":
        cleaned = series.dropna().astype(str).str.strip()
        cleaned = cleaned[(cleaned != '') & (cleaned != 'nan')]
        return float(len(cleaned))

    clean_series = pd.to_numeric(series, errors='coerce').dropna()
    if clean_series.empty:
        return 0.0

    if agg == "sum":
        return float(clean_series.sum())
    elif agg in ["avg", "mean"]:
        return float(clean_series.mean())
    elif agg == "min":
        return float(clean_series.min())
    elif agg == "max":
        return float(clean_series.max())
    elif agg == "median":
        return float(clean_series.median())
    return float(clean_series.sum())

def execute_widget_query(df: pd.DataFrame, widget: WidgetConfig, active_filters: Optional[Dict[str, Any]] = None) -> Any:
    """Executes aggregation and grouping queries for a specific widget against the DataFrame."""
    filtered_df = apply_active_filters(df, active_filters)
    
    w_type = widget.type.lower()
    
    # 1. KPI Widget
    if w_type == "kpi":
        val_col = widget.value_column or widget.y_column
        if not val_col or val_col not in filtered_df.columns:
            # Fall back to row count
            return len(filtered_df)
        val = compute_aggregate(filtered_df[val_col], widget.aggregation or "sum")
        return round(val, 2)

    # 2. Bar, Pie, Donut, Line, Area Charts
    if w_type in ["bar", "pie", "donut", "line", "area"]:
        group_col = widget.category_column or widget.x_column
        val_col = widget.value_column or widget.y_column
        agg = (widget.aggregation or "sum").lower()

        if not group_col or group_col not in filtered_df.columns:
            return []

        # Remove blank category entries
        calc_df = filtered_df.copy()
        str_cat = calc_df[group_col].astype(str).str.strip()
        calc_df = calc_df[calc_df[group_col].notna() & (str_cat != '') & (str_cat.str.lower() != 'nan')]

        # If no numeric val_col, fallback to count
        if not val_col or val_col not in calc_df.columns or agg == "count":
            grouped = calc_df.groupby(group_col).size().reset_index(name="value")
        else:
            calc_df[val_col] = pd.to_numeric(calc_df[val_col], errors='coerce')
            
            if agg == "sum":
                grouped = calc_df.groupby(group_col)[val_col].sum().reset_index(name="value")
            elif agg in ["avg", "mean"]:
                grouped = calc_df.groupby(group_col)[val_col].mean().reset_index(name="value")
            elif agg == "min":
                grouped = calc_df.groupby(group_col)[val_col].min().reset_index(name="value")
            elif agg == "max":
                grouped = calc_df.groupby(group_col)[val_col].max().reset_index(name="value")
            elif agg == "median":
                grouped = calc_df.groupby(group_col)[val_col].median().reset_index(name="value")
            elif agg == "distinct_count":
                grouped = calc_df.groupby(group_col)[val_col].nunique().reset_index(name="value")
            else:
                grouped = calc_df.groupby(group_col)[val_col].sum().reset_index(name="value")

        # Sorting
        sort_order = widget.sort_order or "desc"
        # If group_col is numeric and sorted by category order
        num_cat = pd.to_numeric(grouped[group_col], errors='coerce')
        if num_cat.notna().sum() > len(grouped) * 0.5 and sort_order in ["asc", "desc"]:
            grouped["_num_cat"] = num_cat
            grouped = grouped.sort_values(by="_num_cat", ascending=(sort_order == "asc")).drop(columns=["_num_cat"])
        elif sort_order == "desc":
            grouped = grouped.sort_values(by="value", ascending=False)
        elif sort_order == "asc":
            grouped = grouped.sort_values(by="value", ascending=True)

        # Top N
        top_n = widget.top_n or 10
        if top_n > 0:
            grouped = grouped.head(top_n)

        # Format output records
        result = []
        for _, row in grouped.iterrows():
            result.append({
                "category": str(row[group_col]).strip(),
                "value": round(float(row["value"]), 2) if isinstance(row["value"], (int, float, np.number)) else 0.0
            })
        return result

    # 3. Scatter Plot
    if w_type == "scatter":
        x_col = widget.x_column
        y_col = widget.y_column
        if not x_col or not y_col or x_col not in filtered_df.columns or y_col not in filtered_df.columns:
            return []
        scatter_sub = filtered_df[[x_col, y_col]].dropna().head(150)
        result = []
        for _, row in scatter_sub.iterrows():
            try:
                x_val = float(row[x_col])
                y_val = float(row[y_col])
                result.append({"x": round(x_val, 2), "y": round(y_val, 2)})
            except Exception:
                continue
        return result

    # 4. Histogram
    if w_type == "histogram":
        col = widget.x_column or widget.value_column
        if not col or col not in filtered_df.columns:
            return []
        num_series = pd.to_numeric(filtered_df[col], errors='coerce').dropna()
        if len(num_series) == 0:
            return []
        bins = min(widget.top_n or 8, max(4, num_series.nunique()))
        hist_vals, bin_edges = np.histogram(num_series, bins=bins)
        result = []
        for i in range(len(hist_vals)):
            result.append({
                "bin": f"{bin_edges[i]:.1f} - {bin_edges[i+1]:.1f}",
                "count": int(hist_vals[i])
            })
        return result

    # 5. Table Widget
    if w_type == "table":
        preview_rows = filtered_df.head(widget.top_n or 20).to_dict(orient="records")
        # Ensure json serializable
        clean_rows = []
        for r in preview_rows:
            clean_r = {}
            for k, v in r.items():
                if pd.isna(v):
                    clean_r[k] = "-"
                elif isinstance(v, (int, float, str, bool)):
                    clean_r[k] = v
                else:
                    clean_r[k] = str(v)
            clean_rows.append(clean_r)
        return clean_rows

    return []
