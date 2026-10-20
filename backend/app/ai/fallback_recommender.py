import re
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple
from app.schemas.dashboard import WidgetConfig, LayoutItem, FilterSlicer, DashboardConfig
from app.data_processing.profiler import detect_column_type
from app.dashboard.query_engine import execute_widget_query

def find_best_matching_column(columns: List[str], keywords: List[str]) -> str | None:
    """Finds column matching one of the target keywords (case-insensitive substring)."""
    for col in columns:
        col_lower = col.lower()
        for kw in keywords:
            if kw in col_lower:
                return col
    return None

def build_rule_based_dashboard(df: pd.DataFrame, session_id: str, prompt: str = "", theme: str = "dark") -> DashboardConfig:
    """Constructs a rich, balanced 1-page BI dashboard with 0 gaps in layout."""
    prompt_lower = (prompt or "").lower()
    columns = list(df.columns)
    total_records = len(df)
    
    # Classify columns with dirty-data resilience
    numeric_cols = []
    categorical_cols = []
    date_cols = []
    id_cols = []
    
    for c in columns:
        c_lower = str(c).lower()
        if any(term in c_lower for term in ['id', 'uuid', 'code', 'roll', 'reg']):
            id_cols.append(c)
            
        ctype = detect_column_type(df[c])
        if ctype == "numeric":
            numeric_cols.append(c)
        elif ctype in ["categorical", "boolean"]:
            categorical_cols.append(c)
        elif ctype == "datetime":
            date_cols.append(c)
        else:
            # Check if text column has <= 35 unique values -> can be treated as category
            if df[c].nunique() <= 35:
                categorical_cols.append(c)

    widgets: List[WidgetConfig] = []
    layouts: List[LayoutItem] = []
    slicers: List[FilterSlicer] = []
    insights: List[str] = []

    # 1. Identify primary and secondary numeric columns
    primary_num = None
    for kw_list in [
        ["sales", "revenue", "amount", "total"],
        ["profit", "margin", "income"],
        ["score", "grade", "mark", "gpa", "percentage"],
        ["salary", "compensation", "wage"],
        ["stock", "quantity", "unit", "inventory"],
        ["age", "years", "duration", "hours", "rate"]
    ]:
        col = find_best_matching_column(numeric_cols, kw_list)
        if col:
            primary_num = col
            break

    if not primary_num and numeric_cols:
        for col in numeric_cols:
            if col not in id_cols:
                primary_num = col
                break
        if not primary_num:
            primary_num = numeric_cols[0]

    secondary_num = None
    for c in numeric_cols:
        if c != primary_num and c not in id_cols:
            secondary_num = c
            break

    # 2. Identify primary and secondary categorical dimensions
    primary_cat = None
    for kw in ["department", "category", "product", "region", "role", "subject", "status", "class", "segment", "blood_group", "city"]:
        matched = find_best_matching_column(categorical_cols, [kw])
        if matched and matched not in id_cols:
            primary_cat = matched
            break

    if not primary_cat and categorical_cols:
        for c in categorical_cols:
            if c not in id_cols and 2 <= df[c].nunique() <= 25:
                primary_cat = c
                break
        if not primary_cat:
            primary_cat = categorical_cols[0]

    secondary_cat = None
    for c in categorical_cols:
        if c != primary_cat and c not in id_cols and 2 <= df[c].nunique() <= 20:
            secondary_cat = c
            break

    # =========================================================================
    # ROW 0: 4 KPI CARDS (x=0, 3, 6, 9, y=0, w=3, h=2) - FULLY BALANCED
    # =========================================================================

    # KPI 1 (x=0, w=3): Total Records / Population Volume
    kpi1_title = f"Total {primary_cat.replace('_', ' ').title() if 'student' in prompt_lower or 'employee' in prompt_lower else 'Records'}"
    if 'student' in prompt_lower or any('student' in str(c).lower() for c in columns):
        kpi1_title = "Total Students"
    elif 'employee' in prompt_lower or any('employee' in str(c).lower() for c in columns):
        kpi1_title = "Total Employees"

    kpi1 = WidgetConfig(
        id="kpi-records",
        title=kpi1_title,
        type="kpi",
        description="Overall record count in active view",
        value_column=None,
        aggregation="count",
        format="number",
        color="#3b82f6"
    )
    kpi1.data = execute_widget_query(df, kpi1)
    widgets.append(kpi1)
    layouts.append(LayoutItem(i="kpi-records", x=0, y=0, w=3, h=2, minW=2, minH=2))

    # KPI 2 (x=3, w=3): Primary Numeric Average (e.g. Average Age, Average Revenue)
    if primary_num:
        clean_num = pd.to_numeric(df[primary_num], errors='coerce').dropna()
        # Filter obvious extreme outliers for student age if present (e.g. >100 or <0)
        if 'age' in primary_num.lower() and len(clean_num) > 0:
            valid_age = clean_num[(clean_num >= 10) & (clean_num <= 80)]
            if len(valid_age) > 0:
                clean_num = valid_age
        avg_val = round(float(clean_num.mean()), 1) if len(clean_num) > 0 else 0.0

        is_curr = any(w in primary_num.lower() for w in ["sales", "revenue", "amount", "profit", "price", "salary", "cost"])
        kpi2 = WidgetConfig(
            id="kpi-primary-metric",
            title=f"Average {primary_num.replace('_', ' ').title()}",
            type="kpi",
            description=f"Mean across valid {primary_num} entries",
            value_column=primary_num,
            aggregation="avg",
            format="currency" if is_curr else "number",
            color="#10b981"
        )
        kpi2.data = avg_val
        widgets.append(kpi2)
        layouts.append(LayoutItem(i="kpi-primary-metric", x=3, y=0, w=3, h=2, minW=2, minH=2))
    elif secondary_cat:
        # Fallback to secondary category unique count
        kpi2 = WidgetConfig(
            id="kpi-primary-metric",
            title=f"Unique {secondary_cat.replace('_', ' ').title()}",
            type="kpi",
            description=f"Distinct count of {secondary_cat}",
            value_column=secondary_cat,
            aggregation="distinct_count",
            format="number",
            color="#10b981"
        )
        kpi2.data = execute_widget_query(df, kpi2)
        widgets.append(kpi2)
        layouts.append(LayoutItem(i="kpi-primary-metric", x=3, y=0, w=3, h=2, minW=2, minH=2))

    # KPI 3 (x=6, w=3): Distinct Count of Primary Dimension (e.g. Total Departments)
    if primary_cat:
        kpi3_title = f"Total {primary_cat.replace('_', ' ').title()}s"
        kpi3 = WidgetConfig(
            id="kpi-dim-count",
            title=kpi3_title,
            type="kpi",
            description=f"Distinct groups identified in dataset",
            value_column=primary_cat,
            aggregation="distinct_count",
            format="number",
            color="#f59e0b"
        )
        kpi3.data = execute_widget_query(df, kpi3)
        widgets.append(kpi3)
        layouts.append(LayoutItem(i="kpi-dim-count", x=6, y=0, w=3, h=2, minW=2, minH=2))
    else:
        kpi3 = WidgetConfig(
            id="kpi-dim-count",
            title="Total Attributes",
            type="kpi",
            description="Total columns tracked",
            value_column=None,
            aggregation="count",
            format="number",
            color="#f59e0b"
        )
        kpi3.data = len(columns)
        widgets.append(kpi3)
        layouts.append(LayoutItem(i="kpi-dim-count", x=6, y=0, w=3, h=2, minW=2, minH=2))

    # KPI 4 (x=9, w=3): Dominant Category or Peak Value
    if secondary_cat and df[secondary_cat].dropna().count() > 0:
        top_sec = df[secondary_cat].dropna().astype(str).str.strip().value_counts()
        top_name = top_sec.index[0] if len(top_sec) > 0 else "N/A"
        top_cnt = top_sec.values[0] if len(top_sec) > 0 else 0
        top_pct = round((top_cnt / total_records * 100), 1) if total_records > 0 else 0

        kpi4 = WidgetConfig(
            id="kpi-top-category",
            title=f"Top {secondary_cat.replace('_', ' ').title()}",
            type="kpi",
            description=f"{top_name} ({top_pct}% of total)",
            value_column=secondary_cat,
            aggregation="distinct_count",
            format="number",
            color="#8b5cf6"
        )
        kpi4.data = f"{top_name} ({top_cnt})"
        widgets.append(kpi4)
        layouts.append(LayoutItem(i="kpi-top-category", x=9, y=0, w=3, h=2, minW=2, minH=2))
    elif primary_num:
        clean_num = pd.to_numeric(df[primary_num], errors='coerce').dropna()
        max_val = clean_num.max() if len(clean_num) > 0 else 0
        kpi4 = WidgetConfig(
            id="kpi-top-category",
            title=f"Max {primary_num.replace('_', ' ').title()}",
            type="kpi",
            description=f"Peak value recorded in dataset",
            value_column=primary_num,
            aggregation="max",
            format="number",
            color="#8b5cf6"
        )
        kpi4.data = round(float(max_val), 1)
        widgets.append(kpi4)
        layouts.append(LayoutItem(i="kpi-top-category", x=9, y=0, w=3, h=2, minW=2, minH=2))

    # =========================================================================
    # ROW 1: 2 MAIN CHARTS (x=0, w=6 & x=6, w=6 at y=2, h=5)
    # =========================================================================
    current_y = 2

    # Chart 1 (Left: x=0, y=2, w=6, h=5): Primary Category Breakdown (Bar Chart)
    if primary_cat:
        bar_chart1 = WidgetConfig(
            id="chart-bar-primary",
            title=f"Distribution by {primary_cat.replace('_', ' ').title()}",
            type="bar",
            description=f"Record volume per {primary_cat.lower()}",
            category_column=primary_cat,
            value_column=None,
            x_column=primary_cat,
            aggregation="count",
            sort_order="desc",
            top_n=10,
            color="#3b82f6"
        )
        bar_chart1.data = execute_widget_query(df, bar_chart1)
        widgets.append(bar_chart1)
        layouts.append(LayoutItem(i="chart-bar-primary", x=0, y=current_y, w=6, h=5, minW=4, minH=3))

    # Chart 2 (Right: x=6, y=2, w=6, h=5): Secondary Category (Donut Chart)
    chart2_cat = secondary_cat if secondary_cat else (categorical_cols[1] if len(categorical_cols) > 1 else primary_cat)
    if chart2_cat:
        donut_chart = WidgetConfig(
            id="chart-donut-secondary",
            title=f"{chart2_cat.replace('_', ' ').title()} Proportion",
            type="donut",
            description=f"Percentage share by {chart2_cat.lower()}",
            category_column=chart2_cat,
            value_column=None,
            aggregation="count",
            sort_order="desc",
            top_n=8,
            color="#ec4899"
        )
        donut_chart.data = execute_widget_query(df, donut_chart)
        widgets.append(donut_chart)
        layouts.append(LayoutItem(i="chart-donut-secondary", x=6, y=current_y, w=6, h=5, minW=3, minH=3))

    current_y += 5

    # =========================================================================
    # ROW 2: 2 SECONDARY CHARTS (x=0, w=6 & x=6, w=6 at y=7, h=5)
    # =========================================================================
    # Chart 3 (Left: x=0, y=7, w=6, h=5): Numeric distribution (e.g. Student Age Breakdown or Time Trend)
    if date_cols and primary_num:
        date_col = date_cols[0]
        line_chart = WidgetConfig(
            id="chart-trend",
            title=f"{primary_num.replace('_', ' ').title()} Trend Over Time",
            type="line",
            description=f"Chronological trend across {date_col}",
            category_column=date_col,
            value_column=primary_num,
            x_column=date_col,
            y_column=primary_num,
            aggregation="sum",
            sort_order="asc",
            top_n=30,
            color="#10b981"
        )
        line_chart.data = execute_widget_query(df, line_chart)
        widgets.append(line_chart)
        layouts.append(LayoutItem(i="chart-trend", x=0, y=current_y, w=6, h=5, minW=4, minH=3))
    elif primary_num:
        # Age or primary metric distribution
        bar_num = WidgetConfig(
            id="chart-num-dist",
            title=f"Volume by {primary_num.replace('_', ' ').title()}",
            type="bar",
            description=f"Frequency distribution across {primary_num}",
            category_column=primary_num,
            value_column=None,
            aggregation="count",
            sort_order="asc",
            top_n=12,
            color="#10b981"
        )
        bar_num.data = execute_widget_query(df, bar_num)
        widgets.append(bar_num)
        layouts.append(LayoutItem(i="chart-num-dist", x=0, y=current_y, w=6, h=5, minW=4, minH=3))

    # Chart 4 (Right: x=6, y=7, w=6, h=5): Cross analysis (e.g. Average Age by Department, or Scatter Plot)
    if primary_cat and primary_num:
        bar_cross = WidgetConfig(
            id="chart-cross-analysis",
            title=f"Average {primary_num.replace('_', ' ').title()} by {primary_cat.replace('_', ' ').title()}",
            type="bar",
            description=f"Comparative metric across {primary_cat}",
            category_column=primary_cat,
            value_column=primary_num,
            x_column=primary_cat,
            y_column=primary_num,
            aggregation="avg",
            sort_order="desc",
            top_n=10,
            color="#f59e0b"
        )
        bar_cross.data = execute_widget_query(df, bar_cross)
        widgets.append(bar_cross)
        layouts.append(LayoutItem(i="chart-cross-analysis", x=6, y=current_y, w=6, h=5, minW=4, minH=3))
    elif secondary_num and primary_num:
        scatter = WidgetConfig(
            id="chart-scatter",
            title=f"{primary_num.replace('_', ' ').title()} vs {secondary_num.replace('_', ' ').title()}",
            type="scatter",
            description="Correlation scatter plot",
            x_column=secondary_num,
            y_column=primary_num,
            color="#f59e0b"
        )
        scatter.data = execute_widget_query(df, scatter)
        widgets.append(scatter)
        layouts.append(LayoutItem(i="chart-scatter", x=6, y=current_y, w=6, h=5, minW=4, minH=3))
    elif len(categorical_cols) > 2:
        third_cat = categorical_cols[2]
        bar_third = WidgetConfig(
            id="chart-third-cat",
            title=f"{third_cat.replace('_', ' ').title()} Breakdown",
            type="bar",
            description=f"Record counts for {third_cat}",
            category_column=third_cat,
            value_column=None,
            aggregation="count",
            top_n=8,
            color="#f59e0b"
        )
        bar_third.data = execute_widget_query(df, bar_third)
        widgets.append(bar_third)
        layouts.append(LayoutItem(i="chart-third-cat", x=6, y=current_y, w=6, h=5, minW=4, minH=3))

    current_y += 5

    # =========================================================================
    # ROW 3: DETAILED TABLE (x=0, y=12, w=12, h=6)
    # =========================================================================
    table_widget = WidgetConfig(
        id="table-records",
        title="Detailed Records Table",
        type="table",
        description="Filterable inspection grid of individual student/entity records",
        top_n=25
    )
    table_widget.data = execute_widget_query(df, table_widget)
    widgets.append(table_widget)
    layouts.append(LayoutItem(i="table-records", x=0, y=current_y, w=12, h=6, minW=6, minH=4))

    # =========================================================================
    # SLICERS
    # =========================================================================
    if primary_cat:
        slicers.append(FilterSlicer(
            column=primary_cat,
            type="categorical",
            options=sorted(df[primary_cat].dropna().astype(str).str.strip().unique().tolist()[:25]),
            current_value=[]
        ))
    if secondary_cat:
        slicers.append(FilterSlicer(
            column=secondary_cat,
            type="categorical",
            options=sorted(df[secondary_cat].dropna().astype(str).str.strip().unique().tolist()[:20]),
            current_value=[]
        ))

    # Insights
    insights.append(f"Analyzed {total_records} records across {len(columns)} attributes.")
    if primary_cat:
        top_cat_name = df[primary_cat].dropna().astype(str).str.strip().value_counts().index[0]
        insights.append(f"Largest group in {primary_cat} is '{top_cat_name}'.")
    if secondary_cat:
        top_sec_name = df[secondary_cat].dropna().astype(str).str.strip().value_counts().index[0]
        insights.append(f"Most frequent {secondary_cat} is '{top_sec_name}'.")

    dash_title = "Automated Analytics Dashboard"
    if prompt:
        words = [w.capitalize() for w in prompt.split() if w.lower() not in ["create", "a", "an", "the", "with", "and", "dashboard", "show"]]
        if words:
            dash_title = f"{' '.join(words[:4])} Dashboard"

    return DashboardConfig(
        session_id=session_id,
        title=dash_title,
        prompt=prompt,
        theme=theme,
        widgets=widgets,
        layout=layouts,
        slicers=slicers,
        insights=insights
    )
