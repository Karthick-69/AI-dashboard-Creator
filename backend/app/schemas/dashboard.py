from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class LayoutItem(BaseModel):
    i: str
    x: int
    y: int
    w: int
    h: int
    minW: Optional[int] = 2
    minH: Optional[int] = 2

class WidgetConfig(BaseModel):
    id: str
    title: str
    type: str  # "kpi", "bar", "line", "area", "pie", "donut", "scatter", "histogram", "table"
    description: Optional[str] = ""
    x_column: Optional[str] = None
    y_column: Optional[str] = None
    category_column: Optional[str] = None
    value_column: Optional[str] = None
    aggregation: Optional[str] = "sum"  # "sum", "avg", "count", "min", "max", "median", "distinct_count"
    color: Optional[str] = "#3b82f6"
    top_n: Optional[int] = 10
    sort_order: Optional[str] = "desc"  # "asc", "desc", "none"
    format: Optional[str] = "number"  # "number", "currency", "percent"
    data: Optional[Any] = None  # Processed chart data array or KPI single value
    explanation: Optional[str] = None

class FilterSlicer(BaseModel):
    column: str
    type: str  # "categorical", "date_range", "numeric_range"
    options: Optional[List[Any]] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    current_value: Optional[Any] = None

class DashboardConfig(BaseModel):
    session_id: str
    title: str
    prompt: Optional[str] = ""
    theme: Optional[str] = "dark"
    widgets: List[WidgetConfig]
    layout: List[LayoutItem]
    slicers: List[FilterSlicer]
    insights: Optional[List[str]] = None

class DashboardGenerateRequest(BaseModel):
    prompt: Optional[str] = ""
    theme: Optional[str] = "dark"

class WidgetDataQuery(BaseModel):
    widget: WidgetConfig
    active_filters: Optional[Dict[str, Any]] = Field(default_factory=dict)
