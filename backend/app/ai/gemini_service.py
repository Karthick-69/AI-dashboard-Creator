import json
import logging
from typing import Dict, Any, List, Optional
import google.generativeai as genai
import pandas as pd
from app.core.config import settings
from app.schemas.dashboard import DashboardConfig, WidgetConfig, LayoutItem, FilterSlicer
from app.ai.fallback_recommender import build_rule_based_dashboard
from app.dashboard.query_engine import execute_widget_query

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL or "gemini-1.5-flash"
        self._is_configured = False
        
        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self._is_configured = True
            except Exception as e:
                logger.warning(f"Failed to configure Gemini API: {e}")
                self._is_configured = False

    @property
    def is_available(self) -> bool:
        return bool(self.api_key and self._is_configured)

    def generate_dashboard_from_prompt(self, df: pd.DataFrame, session_id: str, prompt: str, theme: str = "dark") -> DashboardConfig:
        """Generates dashboard using Gemini API with structured JSON output, falling back gracefully to rule-based engine."""
        if not self.is_available or not prompt:
            return build_rule_based_dashboard(df, session_id, prompt, theme)

        # Build schema summary to send to Gemini (never send full raw data)
        columns_info = []
        for c in df.columns:
            columns_info.append({
                "name": str(c),
                "dtype": str(df[c].dtype),
                "unique_count": int(df[c].nunique()),
                "sample_values": df[c].dropna().head(3).astype(str).tolist()
            })

        system_instruction = f"""You are an expert BI Dashboard Architect and Data Analyst.
A user wants a custom interactive dashboard for their dataset based on this user prompt:
"{prompt}"

Dataset Columns & Types:
{json.dumps(columns_info, indent=2)}
Total Rows: {len(df)}

Generate a valid JSON object matching this structure:
{{
  "title": "A short, relevant dashboard title",
  "widgets": [
    {{
      "id": "unique-id-1",
      "title": "Widget Title",
      "type": "kpi" | "bar" | "line" | "area" | "pie" | "donut" | "scatter" | "histogram" | "table",
      "description": "Short explanation of why this component is useful",
      "x_column": "exact_column_name_from_dataset_or_null",
      "y_column": "exact_column_name_from_dataset_or_null",
      "category_column": "exact_column_name_for_grouping_or_null",
      "value_column": "exact_column_name_for_metric_or_null",
      "aggregation": "sum" | "avg" | "count" | "min" | "max" | "median" | "distinct_count",
      "color": "#hex_code",
      "top_n": 10,
      "sort_order": "desc" | "asc",
      "format": "number" | "currency" | "percent"
    }}
  ],
  "slicers": [
    {{
      "column": "column_name_for_filtering",
      "type": "categorical" | "date_range"
    }}
  ],
  "insights": [
    "Key analytical observation 1",
    "Key analytical observation 2"
  ]
}}

STRICT RULES:
1. ONLY reference column names that exist in the provided dataset. Do NOT invent columns!
2. Include 3-4 KPI widgets and 4-6 chart widgets matching the user's intent.
3. For KPIs, set "type": "kpi" and specify "value_column" and "aggregation".
4. For charts, provide valid category and value columns from the dataset.
5. Return ONLY raw JSON, with no markdown code blocks or additional text."""

        try:
            model = genai.GenerativeModel(self.model_name)
            response = model.generate_content(
                system_instruction,
                generation_config={"response_mime_type": "application/json"}
            )
            raw_text = response.text.strip()
            # Clean possible markdown wrapping if returned
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()

            parsed = json.loads(raw_text)
            
            # Validate and calculate actual series data for each widget
            valid_widgets: List[WidgetConfig] = []
            layouts: List[LayoutItem] = []
            
            current_kpi_x = 0
            current_chart_y = 2
            current_chart_x = 0

            for idx, w_dict in enumerate(parsed.get("widgets", [])):
                w_id = w_dict.get("id") or f"widget-{idx+1}"
                w_type = w_dict.get("type", "bar")
                
                # Check valid columns
                val_col = w_dict.get("value_column")
                cat_col = w_dict.get("category_column") or w_dict.get("x_column")
                
                if val_col and val_col not in df.columns:
                    val_col = None
                if cat_col and cat_col not in df.columns:
                    cat_col = None

                widget = WidgetConfig(
                    id=w_id,
                    title=w_dict.get("title", f"Widget {idx+1}"),
                    type=w_type,
                    description=w_dict.get("description", ""),
                    x_column=w_dict.get("x_column") if w_dict.get("x_column") in df.columns else cat_col,
                    y_column=w_dict.get("y_column") if w_dict.get("y_column") in df.columns else val_col,
                    category_column=cat_col,
                    value_column=val_col,
                    aggregation=w_dict.get("aggregation", "sum"),
                    color=w_dict.get("color", "#3b82f6"),
                    top_n=w_dict.get("top_n", 10),
                    sort_order=w_dict.get("sort_order", "desc"),
                    format=w_dict.get("format", "number"),
                    explanation=w_dict.get("description")
                )
                
                # Compute actual data series with query engine
                widget.data = execute_widget_query(df, widget)
                valid_widgets.append(widget)

                # Assign grid layout
                if w_type == "kpi":
                    layouts.append(LayoutItem(i=w_id, x=current_kpi_x, y=0, w=3, h=2, minW=2, minH=2))
                    current_kpi_x = (current_kpi_x + 3) % 12
                else:
                    w = 6 if current_chart_x == 0 or current_chart_x == 6 else 12
                    h = 5
                    layouts.append(LayoutItem(i=w_id, x=current_chart_x, y=current_chart_y, w=6, h=5, minW=3, minH=3))
                    current_chart_x = (current_chart_x + 6) % 12
                    if current_chart_x == 0:
                        current_chart_y += 5

            # Process slicers
            slicers: List[FilterSlicer] = []
            for s_dict in parsed.get("slicers", []):
                col = s_dict.get("column")
                if col in df.columns:
                    s_type = s_dict.get("type", "categorical")
                    opts = None
                    if s_type == "categorical":
                        opts = sorted(df[col].dropna().astype(str).unique().tolist()[:20])
                    slicers.append(FilterSlicer(
                        column=col,
                        type=s_type,
                        options=opts,
                        current_value=[]
                    ))

            # If AI didn't recommend slicers, provide sensible defaults
            if not slicers:
                for col in df.columns:
                    if df[col].nunique() <= 15 and not pd.api.types.is_numeric_dtype(df[col]):
                        slicers.append(FilterSlicer(
                            column=col,
                            type="categorical",
                            options=sorted(df[col].dropna().astype(str).unique().tolist()[:20]),
                            current_value=[]
                        ))
                        if len(slicers) >= 2:
                            break

            return DashboardConfig(
                session_id=session_id,
                title=parsed.get("title", f"AI Generated Dashboard: {prompt[:30]}"),
                prompt=prompt,
                theme=theme,
                widgets=valid_widgets,
                layout=layouts,
                slicers=slicers,
                insights=parsed.get("insights", ["Automated AI Dashboard successfully assembled from verified dataset calculations."])
            )

        except Exception as e:
            logger.error(f"Error calling Gemini API for dashboard generation: {e}. Falling back to rule-based engine.")
            return build_rule_based_dashboard(df, session_id, prompt, theme)

# Singleton instance
gemini_service = GeminiService()
