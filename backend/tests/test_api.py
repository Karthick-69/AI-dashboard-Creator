import pytest
import pandas as pd
from fastapi.testclient import TestClient
from app.main import app
from app.core.session import session_manager
from app.data_processing.profiler import profile_dataset, detect_column_type
from app.data_processing.cleaner import detect_cleaning_issues, apply_cleaning_rules
from app.schemas.dataset import CleaningRule
from app.ai.fallback_recommender import build_rule_based_dashboard

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_load_sample_sales_dataset():
    response = client.post("/api/sample/sales")
    assert response.status_code == 200
    data = response.json()
    assert data["row_count"] > 0
    assert "session_id" in data
    assert any(c["name"] == "Sales_Amount" for c in data["columns"])

def test_load_sample_dirty_dataset_and_clean():
    # 1. Load dirty dataset
    response = client.post("/api/sample/dirty_retail")
    assert response.status_code == 200
    data = response.json()
    session_id = data["session_id"]
    initial_rows = data["row_count"]

    # 2. Detect issues
    issues_res = client.get(f"/api/datasets/{session_id}/cleaning/detect")
    assert issues_res.status_code == 200
    issues = issues_res.json()
    assert len(issues) > 0

    # Verify duplicate detection
    has_dup = any(i["issue_type"] == "duplicates" for i in issues)
    assert has_dup

    # 3. Apply cleaning: Drop duplicates and trim whitespace
    rules = [
        CleaningRule(rule_id="r1", action="drop_duplicates", column=None, params={}),
        CleaningRule(rule_id="r2", action="trim_whitespace", column="Category", params={})
    ]
    clean_res = client.post(
        f"/api/datasets/{session_id}/cleaning/apply",
        json={"rules": [r.model_dump() for r in rules]}
    )
    assert clean_res.status_code == 200
    clean_data = clean_res.json()
    assert clean_data["rows_after"] < initial_rows
    assert len(clean_data["audit_log"]) >= 2

    # 4. Test Reset
    reset_res = client.post(f"/api/datasets/{session_id}/cleaning/reset")
    assert reset_res.status_code == 200
    reset_data = reset_res.json()
    assert reset_data["rows_after"] == initial_rows

def test_dashboard_generation_and_widget_query():
    # 1. Load students sample
    res = client.post("/api/sample/students")
    assert res.status_code == 200
    session_id = res.json()["session_id"]

    # 2. Generate dashboard with prompt
    dash_res = client.post(
        f"/api/datasets/{session_id}/dashboard/generate",
        json={"prompt": "Analyze student performance and show average scores and pass rates"}
    )
    assert dash_res.status_code == 200
    dashboard = dash_res.json()
    assert len(dashboard["widgets"]) >= 4
    assert len(dashboard["layout"]) >= 4

    # 3. Query widget with filter
    first_widget = dashboard["widgets"][0]
    q_res = client.post(
        f"/api/datasets/{session_id}/dashboard/query-widget",
        json={
            "widget": first_widget,
            "active_filters": {}
        }
    )
    assert q_res.status_code == 200
    assert "data" in q_res.json()

def test_chat_interaction():
    res = client.post("/api/sample/employees")
    assert res.status_code == 200
    session_id = res.json()["session_id"]

    # Chat summary question
    chat_res = client.post(
        f"/api/datasets/{session_id}/chat",
        json={"message": "Summarize this dataset", "active_filters": {}}
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert len(chat_data["reply"]) > 20

    # Chat comparison question requesting a chart
    chart_chat_res = client.post(
        f"/api/datasets/{session_id}/chat",
        json={"message": "Compare salary by department", "active_filters": {}}
    )
    assert chart_chat_res.status_code == 200
    c_data = chart_chat_res.json()
    assert c_data["chart"] is not None
    assert c_data["chart"]["type"] in ["bar", "donut", "pie"]

def test_exports_endpoints():
    res = client.post("/api/sample/inventory")
    session_id = res.json()["session_id"]

    # Initialize dashboard config
    client.post(f"/api/datasets/{session_id}/dashboard/generate", json={"prompt": "Inventory status"})

    # Test PDF export
    pdf_res = client.get(f"/api/datasets/{session_id}/export/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000

    # Test Excel export
    excel_res = client.get(f"/api/datasets/{session_id}/export/excel")
    assert excel_res.status_code == 200
    assert "sheet" in excel_res.headers["content-type"] or "excel" in excel_res.headers["content-type"]
    assert len(excel_res.content) > 1000

    # Test CSV export
    csv_res = client.get(f"/api/datasets/{session_id}/export/csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]

    # Test Config export
    cfg_res = client.get(f"/api/datasets/{session_id}/export/config")
    assert cfg_res.status_code == 200
    assert "application/json" in cfg_res.headers["content-type"]

def test_student_dataset_full_flow():
    import os
    csv_path = os.path.join(os.path.dirname(__file__), "..", "..", "sample_data", "student_detail.csv")
    with open(csv_path, "rb") as f:
        upload_res = client.post("/api/upload", files={"file": ("student_detail.csv", f, "text/csv")})
    assert upload_res.status_code == 200
    session_id = upload_res.json()["session_id"]

    # 1. Generate Dashboard
    dash_res = client.post(f"/api/datasets/{session_id}/dashboard/generate", json={"prompt": "Student department analysis"})
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert len(dash_data["widgets"]) == 9
    assert len(dash_data["layout"]) == 9

    # Verify no empty gap: 4 KPIs (w=3 each -> sum 12), 2 main charts (w=6 each -> sum 12), 2 secondary charts (w=6 each -> sum 12), 1 table (w=12)
    kpis = [w for w in dash_data["widgets"] if w["type"] == "kpi"]
    assert len(kpis) == 4

    # 2. Test Chatbot: "who is the 120th student in this dataset"
    chat_res = client.post(
        f"/api/datasets/{session_id}/chat",
        json={"message": "who is the 120th student in this dataset", "active_filters": {}}
    )
    assert chat_res.status_code == 200
    reply = chat_res.json()["reply"]
    assert "Swetha Anand" in reply
    assert "STU120" in reply
    assert "CSE" in reply

    # 3. Test Chatbot: "how many students in CSE"
    chat_cse = client.post(
        f"/api/datasets/{session_id}/chat",
        json={"message": "how many students in CSE", "active_filters": {}}
    )
    assert chat_cse.status_code == 200
    assert "32" in chat_cse.json()["reply"]
