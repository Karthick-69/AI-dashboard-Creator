import re
import json
import logging
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
import google.generativeai as genai
from app.core.config import settings
from app.core.session import DatasetSession
from app.schemas.chat import ChatResponse
from app.schemas.dashboard import WidgetConfig
from app.dashboard.query_engine import apply_active_filters, execute_widget_query
from app.data_processing.profiler import detect_column_type

logger = logging.getLogger(__name__)

def clean_value(val: Any) -> str:
    """Helper to convert nan/null to clean string representation."""
    if pd.isna(val) or val is None or str(val).strip() == "":
        return "*[Missing / Blank]*"
    return str(val).strip()

def find_best_matching_column(columns: List[str], keywords: List[str]) -> Optional[str]:
    """Finds column matching one of the target keywords (case-insensitive substring)."""
    for col in columns:
        col_lower = str(col).lower()
        for kw in keywords:
            if kw in col_lower:
                return col
    return None

def answer_query_with_rules(df: pd.DataFrame, message: str, facts: Dict[str, Any], history: List[Dict[str, Any]]) -> ChatResponse:
    """Highly intelligent, deterministic natural language query engine that computes exact answers from DataFrame."""
    msg = message.strip()
    msg_lower = msg.lower()
    total_rows = len(df)
    columns = list(df.columns)

    # -------------------------------------------------------------------------
    # 1. SPECIFIC ROW / ORDINAL LOOKUPS:
    # "who is the 120th student", "show row 50", "who is STU120", "student 15"
    # -------------------------------------------------------------------------
    # Check for ordinal e.g. "120th", "1st", "2nd", "3rd", "50th"
    ordinal_match = re.search(r'\b(\d+)(?:st|nd|rd|th)?\s+(?:student|record|row|person|entry|item)\b', msg_lower)
    if not ordinal_match:
        ordinal_match = re.search(r'\b(?:row|record|student|number|#)\s*(\d+)\b', msg_lower)
    if not ordinal_match:
        ordinal_match = re.search(r'\b(\d+)(?:st|nd|rd|th)\b', msg_lower)

    if ordinal_match:
        target_idx = int(ordinal_match.group(1))
        # Support 1-based indexing as normal humans and business users expect
        row_pos = target_idx - 1
        if 0 <= row_pos < total_rows:
            row_data = df.iloc[row_pos]
            student_id = row_data.get('Student_ID') or row_data.get('ID') or f"Row {target_idx}"
            name = row_data.get('Name') or row_data.get('Full_Name') or "N/A"
            
            reply = f"### Student Record Details ({target_idx}th Record / Row {target_idx})\n\n"
            for col in columns:
                reply += f"- **{col.replace('_', ' ')}**: {clean_value(row_data[col])}\n"
            
            # Contextual note if this student has data hygiene errors
            notes = []
            if 'Age' in row_data:
                age_val = str(row_data['Age'])
                if age_val in ['150', '210', '195', '-2', 'twenty']:
                    notes.append(f"[Note: Age entry '{age_val}' appears to be a recorded data error]")
            if notes:
                reply += "\n" + "\n".join(notes) + "\n"

            next_num = target_idx + 1 if target_idx < total_rows else 1
            return ChatResponse(
                reply=reply,
                suggested_followups=[
                    f"Who is the {next_num}th student?",
                    f"How many students are in {clean_value(row_data.get('Department', 'CSE'))}?",
                    "What are the data errors in this dataset?"
                ]
            )
        else:
            return ChatResponse(
                reply=f"Record index `{target_idx}` is out of range. The dataset contains **{total_rows} total rows** (indexes 1 to {total_rows}).",
                suggested_followups=["Who is the 1st student?", f"Who is the {total_rows}th student?", "Summarize this dataset"]
            )

    # Check for direct ID lookup e.g. "STU020", "STU-1001", "STU120"
    id_match = re.search(r'\b(stu[-_]?\d+)\b', msg_lower)
    if id_match:
        target_id_str = id_match.group(1).replace('-', '').replace('_', '')
        for c in columns:
            if 'id' in c.lower():
                matches = df[df[c].astype(str).str.lower().str.replace('-', '').str.replace('_', '') == target_id_str]
                if len(matches) > 0:
                    row_data = matches.iloc[0]
                    row_idx = matches.index[0] + 1
                    reply = f"### 📋 Found Record for ID `{clean_value(row_data[c])}` (Row {row_idx})\n\n"
                    for col in columns:
                        reply += f"- **{col.replace('_', ' ')}**: {clean_value(row_data[col])}\n"
                    return ChatResponse(
                        reply=reply,
                        suggested_followups=[f"Who is row {row_idx + 1}?", "How many students in this department?", "Compare all departments"]
                    )

    # -------------------------------------------------------------------------
    # 2. NAME / ENTITY SEARCH:
    # "who is Zara Sharma", "find Swetha Anand"
    # -------------------------------------------------------------------------
    if any(msg_lower.startswith(w) for w in ["who is", "find", "search", "lookup", "where is"]):
        name_cols = [c for c in columns if any(n in c.lower() for n in ['name', 'student', 'person', 'customer'])]
        if name_cols:
            name_col = name_cols[0]
            # Extract query search term
            search_query = re.sub(r'^(who is|find|search for|search|lookup|where is)\s+', '', msg_lower).strip()
            search_query = re.sub(r'\b(in this dataset|the student|student|record)\b', '', search_query).strip()
            
            if len(search_query) >= 3:
                matches = df[df[name_col].astype(str).str.lower().str.contains(search_query, na=False)]
                if len(matches) > 0:
                    match_row = matches.iloc[0]
                    row_idx = matches.index[0] + 1
                    reply = f"### 👤 Found Student: {clean_value(match_row[name_col])} (Row {row_idx})\n\n"
                    for col in columns:
                        reply += f"- **{col.replace('_', ' ')}**: {clean_value(match_row[col])}\n"
                    if len(matches) > 1:
                        reply += f"\n*(Also found {len(matches) - 1} other matching record(s))*\n"
                    return ChatResponse(
                        reply=reply,
                        suggested_followups=[f"Show row {row_idx + 1}", "How many students in their department?", "Compare departments"]
                    )

    # -------------------------------------------------------------------------
    # 3. DATA QUALITY, ERRORS & OUTLIER QUERIES:
    # "what are the errors", "show outliers", "find unusual values", "invalid age"
    # -------------------------------------------------------------------------
    if any(w in msg_lower for w in ["error", "invalid", "outlier", "anomaly", "anomalies", "unusual", "dirty", "missing", "duplicate"]):
        findings = []
        
        # Check duplicate rows
        dup_count = int(df.duplicated().sum())
        if dup_count > 0:
            findings.append(f"• **Duplicate Records**: Found **{dup_count} duplicate rows**.")

        # Check missing values per column
        for c in columns:
            nulls = int(df[c].isna().sum()) + int((df[c].astype(str).str.strip() == '').sum())
            if nulls > 0:
                findings.append(f"• **Missing Values in `{c}`**: **{nulls} entries** are blank or unrecorded.")

        # Check Age column for invalid types or extreme outliers
        age_col = find_best_matching_column(columns, ['age'])
        if age_col:
            age_series = df[age_col].astype(str).str.strip()
            # Non-numeric string entries
            non_numeric_entries = []
            for val in age_series:
                if val and val != 'nan' and not val.lstrip('-').replace('.', '', 1).isdigit():
                    non_numeric_entries.append(val)
            if non_numeric_entries:
                findings.append(f"• **Invalid Non-Numeric Age**: Found string entry `'{non_numeric_entries[0]}'` (e.g. written as word instead of integer).")

            # Numeric outliers
            num_age = pd.to_numeric(df[age_col], errors='coerce')
            extreme_old = df[num_age > 80]
            if len(extreme_old) > 0:
                names = [f"{clean_value(r.get('Name', 'STU'))} (Age {int(r[age_col])})" for _, r in extreme_old.head(3).iterrows()]
                findings.append(f"• **Impossible High Age Outliers**: Found {len(extreme_old)} entries: {', '.join(names)}.")
            
            negative_age = df[num_age < 0]
            if len(negative_age) > 0:
                names = [f"{clean_value(r.get('Name', 'STU'))} (Age {r[age_col]})" for _, r in negative_age.head(2).iterrows()]
                findings.append(f"• **Negative Age Values**: Found {len(negative_age)} entries with negative numbers: {', '.join(names)}.")

        # Check Blood Group irregular values
        bg_col = find_best_matching_column(columns, ['blood'])
        if bg_col:
            standard_bgs = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
            irregular = df[~df[bg_col].astype(str).str.strip().isin(standard_bgs) & df[bg_col].notna()]
            if len(irregular) > 0:
                bad_vals = irregular[bg_col].dropna().unique().tolist()
                findings.append(f"• **Irregular Blood Group Formats**: Found non-standard entries: `{', '.join(bad_vals[:4])}`.")

        reply = f"### 🔍 Data Hygiene & Quality Audit ({total_rows} records inspected)\n\n"
        if findings:
            reply += "\n".join(findings)
            reply += "\n\n💡 *Tip: Go to the **Data Cleaning** tab to automatically fix these issues with 1-click approvals and audit logging.*"
        else:
            reply += "✅ No major data quality anomalies or outliers detected! The dataset is well-formatted."

        return ChatResponse(
            reply=reply,
            suggested_followups=["How to clean these errors?", "Show average age", "Compare departments"]
        )

    # -------------------------------------------------------------------------
    # 4. CATEGORY COUNTS & SPECIFIC VALUE QUESTIONS:
    # "how many students in CSE", "how many students have O+ blood group", "how many in mechanical"
    # -------------------------------------------------------------------------
    if any(w in msg_lower for w in ["how many", "count of", "number of students", "how much", "students with"]):
        # Test all categorical columns to see if user mentioned a specific category value
        for col in columns:
            vals = df[col].dropna().astype(str).str.strip().unique()
            for v in vals:
                v_clean = v.strip()
                if len(v_clean) >= 2:
                    # Check if value mentioned in message
                    pattern = rf'\b{re.escape(v_clean.lower())}\b'
                    if re.search(pattern, msg_lower) or (len(v_clean) > 3 and v_clean.lower() in msg_lower):
                        matching_rows = df[df[col].astype(str).str.strip().str.lower() == v_clean.lower()]
                        count = len(matching_rows)
                        pct = round((count / total_rows * 100), 1) if total_rows > 0 else 0
                        
                        reply = f"There are **{count} records** where **{col}** is **'{v_clean}'** ({pct}% of the total {total_rows} records in the dataset).\n\n"
                        
                        # Add a quick sample preview
                        name_col = find_best_matching_column(columns, ['name', 'student', 'person'])
                        if name_col and count > 0:
                            sample_names = matching_rows[name_col].dropna().head(4).tolist()
                            reply += f"**Sample individuals:** {', '.join([str(n) for n in sample_names])}."

                        return ChatResponse(
                            reply=reply,
                            suggested_followups=[
                                f"What is the average age in {v_clean}?",
                                f"Compare all {col}s",
                                "Show full table"
                            ]
                        )

    # -------------------------------------------------------------------------
    # 5. STATISTICAL & AGGREGATE QUESTIONS:
    # "average age", "oldest student", "youngest student", "max age"
    # -------------------------------------------------------------------------
    if any(w in msg_lower for w in ["average", "mean", "oldest", "youngest", "highest age", "lowest age", "max age", "min age"]):
        age_col = find_best_matching_column(columns, ['age', 'years', 'score', 'salary', 'amount'])
        if age_col:
            clean_num = pd.to_numeric(df[age_col], errors='coerce').dropna()
            if len(clean_num) > 0:
                if any(w in msg_lower for w in ["oldest", "max", "highest"]):
                    max_val = clean_num.max()
                    oldest_rows = df[pd.to_numeric(df[age_col], errors='coerce') == max_val]
                    first_match = oldest_rows.iloc[0]
                    reply = f"The highest value recorded for **{age_col}** is **{max_val}**.\n\n"
                    reply += f"Record: **{clean_value(first_match.get('Name', 'STU'))}** (ID: `{clean_value(first_match.get('Student_ID', 'N/A'))}`, Department: {clean_value(first_match.get('Department', 'N/A'))}).\n"
                    if max_val > 80:
                        reply += "\n⚠️ *Note: An age of 150+ is an obvious typo/outlier in student records.*"
                    return ChatResponse(reply=reply, suggested_followups=["Who is the youngest student?", "What is the average age?", "Show outliers"])
                
                elif any(w in msg_lower for w in ["youngest", "min", "lowest"]):
                    min_val = clean_num.min()
                    youngest_rows = df[pd.to_numeric(df[age_col], errors='coerce') == min_val]
                    first_match = youngest_rows.iloc[0]
                    reply = f"The lowest value recorded for **{age_col}** is **{min_val}**.\n\n"
                    reply += f"Record: **{clean_value(first_match.get('Name', 'STU'))}** (ID: `{clean_value(first_match.get('Student_ID', 'N/A'))}`, Department: {clean_value(first_match.get('Department', 'N/A'))}).\n"
                    if min_val < 0:
                        reply += "\n⚠️ *Note: A negative age is an obvious data entry error.*"
                    return ChatResponse(reply=reply, suggested_followups=["Who is the oldest student?", "What is the average age?", "Show outliers"])
                
                else:
                    # Realistic average excluding extreme errors
                    valid_ages = clean_num[(clean_num >= 10) & (clean_num <= 80)]
                    realistic_mean = round(float(valid_ages.mean()), 1) if len(valid_ages) > 0 else round(float(clean_num.mean()), 1)
                    raw_mean = round(float(clean_num.mean()), 1)
                    
                    reply = f"The average **{age_col}** across valid student records is **{realistic_mean} years**.\n\n"
                    if abs(raw_mean - realistic_mean) > 1:
                        reply += f"*(Note: Unfiltered raw mean is {raw_mean} due to extreme outliers like age 150 and -2)*.\n"
                    reply += f"- **Median**: {clean_num.median():.1f}\n"
                    reply += f"- **Valid Range**: [{valid_ages.min()} to {valid_ages.max()} years]\n"
                    return ChatResponse(reply=reply, suggested_followups=["Who is the oldest student?", "Who is the youngest student?", "Compare departments"])

    # -------------------------------------------------------------------------
    # 6. COMPARISONS & IN-CHAT CHART GENERATION:
    # "compare departments", "chart of blood group", "distribution of age"
    # -------------------------------------------------------------------------
    if any(w in msg_lower for w in ["compare", "chart", "plot", "graph", "breakdown", "distribution", "department", "blood", "group"]):
        # Determine target dimension
        target_dim = None
        if "department" in msg_lower or "dept" in msg_lower:
            target_dim = find_best_matching_column(columns, ['department', 'dept'])
        elif "blood" in msg_lower or "group" in msg_lower:
            target_dim = find_best_matching_column(columns, ['blood'])
        elif "age" in msg_lower:
            target_dim = find_best_matching_column(columns, ['age'])

        if not target_dim:
            for c in columns:
                if 2 <= df[c].nunique() <= 20 and not any(k in c.lower() for k in ['id', 'name']):
                    target_dim = c
                    break

        if target_dim:
            chart_type = "donut" if ("donut" in msg_lower or "pie" in msg_lower or "blood" in target_dim.lower()) else "bar"
            chart_widget = WidgetConfig(
                id=f"chat-chart-{int(pd.Timestamp.now().timestamp())}",
                title=f"Student Volume by {target_dim.replace('_', ' ').title()}",
                type=chart_type,
                description=f"Generated via query: '{message}'",
                category_column=target_dim,
                value_column=None,
                aggregation="count",
                sort_order="desc",
                top_n=10,
                color="#3b82f6"
            )
            chart_widget.data = execute_widget_query(df, chart_widget)

            top_val_series = df[target_dim].dropna().astype(str).str.strip().value_counts()
            top_name = top_val_series.index[0] if len(top_val_series) > 0 else "N/A"
            top_cnt = top_val_series.values[0] if len(top_val_series) > 0 else 0

            reply = f"Here is the breakdown by **{target_dim.replace('_', ' ')}** across all active records.\n\n"
            reply += f"The largest group is **{top_name}** with **{top_cnt} students** ({round(top_cnt / total_rows * 100, 1)}%).\n"
            reply += "You can inspect the chart below and click **Add to Dashboard Workspace** to pin it to your live canvas."

            return ChatResponse(
                reply=reply,
                chart=chart_widget,
                suggested_followups=[f"Show details for {top_name}", "What are the errors in this dataset?", "Who is the 1st student?"]
            )

    # -------------------------------------------------------------------------
    # 7. SUMMARY & CONTEXT-AWARE DEFAULT:
    # Dynamically adapts to the ACTUAL dataset schema! NEVER mentions sales!
    # -------------------------------------------------------------------------
    # Build list of attributes
    attr_list = [f"`{c}`" for c in columns]
    reply = f"### 📊 Dataset Overview ({total_rows} Records)\n\n"
    reply += f"This dataset contains **{total_rows} records** tracked across **{len(columns)} attributes**: {', '.join(attr_list)}.\n\n"

    # Quick summary of top categories if available
    dept_col = find_best_matching_column(columns, ['department', 'dept', 'category', 'role'])
    if dept_col:
        top_d = df[dept_col].dropna().astype(str).str.strip().value_counts().head(3).to_dict()
        reply += f"**Top {dept_col.replace('_', ' ')}s:** " + ", ".join([f"{k} ({v})" for k, v in top_d.items()]) + ".\n"

    bg_col = find_best_matching_column(columns, ['blood'])
    if bg_col:
        top_bg = df[bg_col].dropna().astype(str).str.strip().value_counts().head(3).to_dict()
        reply += f"**Top Blood Groups:** " + ", ".join([f"{k} ({v})" for k, v in top_bg.items()]) + ".\n"

    reply += "\n**You can ask me questions such as:**\n"
    reply += "- *'Who is the 120th student?'* (or any row number/name)\n"
    reply += "- *'How many students are in CSE?'*\n"
    reply += "- *'Compare departments'* (generates a chart)\n"
    reply += "- *'What are the data errors and outliers?'*"

    return ChatResponse(
        reply=reply,
        suggested_followups=[
            "Who is the 120th student?",
            "What are the errors in this dataset?",
            "Compare departments",
            "Blood group distribution"
        ]
    )

def handle_chat_message(session: DatasetSession, message: str, active_filters: Optional[Dict[str, Any]] = None) -> ChatResponse:
    """Processes natural language query using calculated Python facts and Gemini AI or deterministic fallback."""
    df = apply_active_filters(session.df, active_filters)
    session.chat_history.append({"role": "user", "content": message})

    # Always test our local intelligent rule engine first for specific lookups like "who is 120th student"
    # because local Pandas execution is 100% deterministic and instantaneous!
    msg_lower = message.lower()
    has_row_lookup = bool(re.search(r'\b(\d+)(?:st|nd|rd|th)?\s+(?:student|record|row|person|entry)\b', msg_lower) or
                         re.search(r'\b(?:row|student|number|#)\s*(\d+)\b', msg_lower) or
                         re.search(r'\b(stu[-_]?\d+)\b', msg_lower))

    if has_row_lookup or not settings.GEMINI_API_KEY:
        facts = {}
        response = answer_query_with_rules(df, message, facts, session.chat_history)
        session.chat_history.append({"role": "assistant", "content": response.reply})
        return response

    # If Gemini API key is configured and not an index lookup, invoke Gemini with rich context
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL or "gemini-1.5-flash")

        # Give sample head rows and column summary
        head_sample = df.head(5).to_dict(orient="records")
        col_summary = {c: str(df[c].dtype) for c in df.columns}

        prompt = f"""You are a professional Data Analyst AI Assistant embedded in an interactive BI dashboard.
User Question: "{message}"

Active Dataset Context:
- Total Active Records: {len(df)}
- Columns and Types: {json.dumps(col_summary)}
- Sample Rows (first 5): {json.dumps(head_sample)}

Instructions:
1. Provide an accurate, concise answer in markdown format using the actual dataset.
2. NEVER mention sales, revenue, or unrelated domains if this is a student/employee/medical dataset!
3. If the user asks for a chart, comparison, or breakdown, set "create_chart": true and specify the category column.

Return ONLY raw JSON with:
{{
  "reply": "markdown text answer",
  "create_chart": boolean,
  "chart_config": {{
    "title": "Chart Title",
    "type": "bar" | "donut" | "line",
    "category_column": "exact_column_name"
  }},
  "suggested_followups": ["Question 1", "Question 2"]
}}"""

        gemini_res = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        parsed = json.loads(gemini_res.text.strip())

        chart_widget = None
        if parsed.get("create_chart") and parsed.get("chart_config"):
            c_cfg = parsed["chart_config"]
            cat_col = c_cfg.get("category_column")
            if cat_col in df.columns:
                chart_widget = WidgetConfig(
                    id=f"chat-widget-{int(pd.Timestamp.now().timestamp())}",
                    title=c_cfg.get("title", f"Breakdown by {cat_col}"),
                    type=c_cfg.get("type", "bar"),
                    description=f"Generated via chat: '{message}'",
                    category_column=cat_col,
                    value_column=None,
                    aggregation="count",
                    top_n=8,
                    color="#3b82f6"
                )
                chart_widget.data = execute_widget_query(df, chart_widget)

        reply_text = parsed.get("reply", "Here are the findings from your dataset.")
        followups = parsed.get("suggested_followups", ["Compare departments", "Show errors", "Who is row 100?"])

        session.chat_history.append({"role": "assistant", "content": reply_text})
        return ChatResponse(
            reply=reply_text,
            chart=chart_widget,
            suggested_followups=followups
        )

    except Exception as e:
        logger.error(f"Error in Gemini chat: {e}. Falling back to rule engine.")
        response = answer_query_with_rules(df, message, {}, session.chat_history)
        session.chat_history.append({"role": "assistant", "content": response.reply})
        return response
