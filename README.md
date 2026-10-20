# AI-Powered Automated Data Analysis & Customizable Dashboard Generator

A full-stack Business Intelligence (BI) and automated analytics platform inspired by Power BI and modern data platforms. The application automatically ingests raw datasets (CSV, Excel, JSON), performs Python-based data profiling and hygiene cleaning, computes descriptive and comparative statistics, generates a customizable drag-and-drop dashboard based on natural-language prompts, and features an integrated AI data chatbot that computes exact answers and embeds custom charts on demand.

---

## 🌟 Key Features

1. **Dataset Ingestion & Multi-Format Parsing**:
   - Drag-and-drop or file browser upload for `.csv`, `.xlsx`, `.xls`, and `.json`.
   - Multi-sheet Excel workbook inspection and individual sheet selection.
   - Configurable file-size and memory limits (up to 50MB) with schema type detection.
   - 1-click sample dataset loaders (`Sales`, `Students`, `Employees`, `Inventory`, `Dirty Retail`).

2. **Automated Data Profiling & Exploratory Data Analysis (EDA)**:
   - Automated detection of column data types (numeric, categorical, datetime, text, boolean).
   - Statistical distribution analysis: min, max, mean, median, standard deviation, Q25, Q75.
   - Dynamic frequency distribution histograms and top category proportions.
   - Outlier identification using the Interquartile Range (IQR) method.
   - Full Pearson correlation matrix heatmap for numeric features.
   - Composite Data Quality Score (0–100) assessing completeness, uniqueness, and consistency.

3. **Data Hygiene & Cleaning Center (With Audit Trail)**:
   - Automated issue detection: duplicate rows, missing entries, irregular leading/trailing whitespace, mixed casing, and extreme outliers.
   - Configurable cleaning actions: drop duplicates, impute missing values (mean, median, mode, constant), trim whitespace, normalize text casing (Title/Lower/Upper), and cap/drop outliers.
   - Strict source preservation: original uploaded raw data is never mutated; all operations are logged in an immutable audit trail.
   - 1-click Reset / Undo function to revert to pristine source state at any time.

4. **Natural Language Dashboard Generation**:
   - Users can describe desired KPIs, trends, and breakdowns in plain English (e.g. *"Create a sales dashboard with total revenue, monthly revenue trends, top five products, and region filters"*).
   - Hybrid AI Architecture: Google Gemini Generative AI generates validated dashboard specifications. If an API key is not configured or rate-limited, the deterministic rule-based engine automatically analyzes column relationships and builds the optimal dashboard.
   - All numerical aggregates (SUM, AVG, COUNT, MIN, MAX, MEDIAN, DISTINCT COUNT) are computed exclusively by Python Pandas and NumPy on the backend.

5. **Power BI-Style Dashboard Customization**:
   - **Resizable & Draggable Grid**: Drag, drop, rearrange, and resize widgets seamlessly using `react-grid-layout`.
   - **Interactive Global Slicers**: Filter widgets across categories, regions, and date ranges with synchronized re-querying.
   - **Component Customizer Modal**: Edit any widget to change title, chart type (KPI, Bar, Line, Area, Donut, Pie, Scatter, Histogram, Table), X/Y columns, aggregations, sort orders, and color palettes.
   - **Add New Visualizations**: Add custom widgets to the live canvas on the fly.
   - **Save & Export Configurations**: Save layout states and export portable JSON definitions.

6. **Floating AI Data Chatbot (Bottom-Right)**:
   - Resides persistently in the bottom-right corner as a slide-over panel.
   - Answers questions strictly using verified facts and Pandas calculations on the active dataset (never hallucinates numbers).
   - Multi-turn conversation memory with follow-up question suggestions.
   - **In-Chat Chart Generation**: If asked to compare categories or plot trends, the bot displays a live interactive chart in the chat and provides an **"Add to Dashboard"** button to pin the widget to the live workspace!

7. **Multi-Format Export Hub**:
   - **Executive PDF Report**: Multi-page report containing KPIs, data profiling summaries, cleaning audit logs, and strategic findings generated via ReportLab.
   - **Multi-Sheet Excel Workbook**: Formatted `.xlsx` file generated via OpenPyXL containing *Cleaned Dataset*, *Data Quality & Profiling*, *KPI Metrics*, and *Cleaning Audit Trail*.
   - **Cleaned Dataset CSV**: Immediate CSV download of the transformed dataset.
   - **Dashboard JSON**: Full configuration file for layout and widget specifications.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, React Grid Layout, Lucide Icons |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, Pandas, NumPy, OpenPyXL, Scipy, Scikit-Learn |
| **AI Integration** | Google Gemini API (`gemini-1.5-flash`), official Google GenAI SDK, Hybrid Rule-Based Recommender |
| **Reporting & Export** | ReportLab (PDF generation), OpenPyXL (Excel workbooks) |
| **Testing** | Pytest, FastAPI TestClient, HTTPX |

---

## 📁 Project Directory Structure

```
d:/Ai Dashboard maker/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application entry point & CORS
│   │   ├── api/                        # REST API endpoints
│   │   │   ├── upload.py               # File uploads & sample datasets
│   │   │   ├── preview.py              # Schema inspection & head rows
│   │   │   ├── profile.py              # Statistical profiling & EDA
│   │   │   ├── cleaning.py             # Hygiene issue detection & audit trail
│   │   │   ├── dashboard.py            # Dashboard generation & widget queries
│   │   │   ├── chat.py                 # Chatbot endpoint & memory
│   │   │   └── export.py               # PDF, Excel, CSV, JSON exporters
│   │   ├── ai/
│   │   │   ├── gemini_service.py       # Google Gemini integration & fallback
│   │   │   └── fallback_recommender.py # Deterministic BI recommender engine
│   │   ├── chatbot/
│   │   │   └── agent.py                # Fact precomputation & in-chat chart builder
│   │   ├── core/
│   │   │   ├── config.py               # Environment configuration & limits
│   │   │   └── session.py              # Session manager, audit logs & dataset store
│   │   ├── dashboard/
│   │   │   └── query_engine.py         # Filtering, aggregations, and series calculations
│   │   ├── data_processing/
│   │   │   ├── profiler.py             # Dataset profiler, histograms, IQR outliers
│   │   │   └── cleaner.py              # Data cleaning operations & transformers
│   │   └── exports/
│   │       ├── pdf_exporter.py         # ReportLab executive PDF builder
│   │       └── excel_exporter.py       # OpenPyXL multi-sheet Excel generator
│   ├── tests/
│   │   └── test_api.py                 # Automated integration & unit tests
│   ├── requirements.txt                # Python backend dependencies
│   ├── pytest.ini                      # Pytest configuration
│   └── .env                            # Backend environment configuration
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/                 # Navbar & Sidebar components
│   │   │   ├── upload/                 # Drag-and-drop & prompt landing view
│   │   │   ├── preview/                # Interactive data preview table
│   │   │   ├── cleaning/               # Issue cards, quality score & audit trail
│   │   │   ├── profiling/              # Descriptive statistics, charts & heatmap
│   │   │   ├── dashboard/              # Grid layout, widget cards & editor modal
│   │   │   ├── chatbot/                # Floating AI assistant with chat-to-chart
│   │   │   └── exports/                # Export cards & download links
│   │   ├── services/
│   │   │   └── api.ts                  # Typed API client
│   │   ├── types/
│   │   │   └── index.ts                # TypeScript data models
│   │   ├── App.tsx                     # Main application coordinator
│   │   ├── main.tsx                    # React DOM root entry
│   │   └── index.css                   # Global styles & grid styling
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── sample_data/
│   ├── sales_data.csv                  # Sales, revenue, profit, customer segment
│   ├── student_performance.csv         # Marks, attendance, study hours, pass/fail
│   ├── employee_analytics.csv          # Departments, roles, salaries, attrition
│   ├── inventory_management.csv        # Stock levels, reorder points, suppliers
│   └── dirty_retail_data.csv           # Missing values, duplicates, whitespace
│
├── .env.example                        # Template for environment variables
└── README.md                           # Documentation & presentation guide
```

---

## 🚀 Installation & Setup Instructions

### Prerequisites
- Python 3.10+ installed
- Node.js v18+ and npm installed

### 1. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Create a Python virtual environment
python -m venv venv

# Activate the virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Configure Gemini API Key
# Copy .env.example to .env and insert your free Gemini API key:
# GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Frontend Setup
```bash
# Navigate to the frontend directory
cd ../frontend

# Install dependencies
npm install
```

---

## ▶️ Running the Application

### Start Backend API Server
```bash
cd backend
.\venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API documentation (Swagger UI) is available at: `http://127.0.0.1:8000/docs`*

### Start Frontend Dev Server
```bash
cd frontend
npm run dev
```
*Open your browser and navigate to: `http://127.0.0.1:5173/`*

---

## 🧪 Running Automated Tests

Run the comprehensive automated test suite testing file uploads, dirty data cleaning, dashboard generation, AI chatbot queries, and exports:

```bash
cd backend
.\venv\Scripts\pytest
```

---

## 🔑 AI API Key Configuration & Graceful Fallback

1. Obtain a free Google Gemini API key from [Google AI Studio](https://aistudio.google.com/).
2. In `backend/.env`, set:
   ```env
   GEMINI_API_KEY=your_actual_key_here
   GEMINI_MODEL=gemini-1.5-flash
   ```
3. **Graceful Fallback Mode**: If `GEMINI_API_KEY` is not provided or quota limits are reached, **the system continues operating seamlessly**. The built-in deterministic Python recommender automatically identifies dimension/metric pairs, trends, and KPI targets based on prompt keywords and statistical variance.

---

## 🎓 College Final-Year Project & Internship Presentation Guide

When presenting this project to evaluators, professors, or internship mentors, follow this recommended 5-minute live demonstration flow:

1. **Upload & Schema Ingestion**:
   - Click the pre-packaged **"Dirty Retail Data Cleaning Showcase"** button.
   - Explain how the application validates file limits, handles encoding, and automatically detects columns and data types.

2. **Data Cleaning & Quality Audit**:
   - Navigate to the **Data Cleaning** tab.
   - Point out the detected **duplicate rows**, **missing amounts**, and **irregular whitespace**.
   - Show the initial **Data Quality Score** (e.g. 74/100).
   - Click **"Apply Approved Cleaning Operations"**; observe the instant before-and-after row comparison and the populated **Audit Trail Log**.
   - Demonstrate the **"Reset to Raw Data"** button to prove non-destructive data handling.

3. **Interactive BI Dashboard Generation**:
   - Enter a prompt like: *"Create a sales dashboard with total revenue, monthly trends, top five products, and region filters."*
   - Show the generated KPI cards, chronological line trends, and categorical bar charts.
   - Demonstrate **interactive slicers**: select a category (e.g. *Electronics*) and observe all connected charts re-query and animate in real-time.

4. **Power BI-Style Customization**:
   - Drag a widget to a new position on the canvas.
   - Resize a card from 6 columns to 12 columns.
   - Click the **Edit** icon on a chart: change the chart from a Bar chart to a Donut chart or change aggregation from SUM to AVERAGE.
   - Click **"Save Layout"**.

5. **AI Data Chatbot with In-Chat Chart Generation**:
   - Click the floating chatbot in the bottom-right corner.
   - Ask: *"Summarize this dataset."* (Highlight that the bot cites computed figures: rows, mean values, and ranges).
   - Ask: *"Compare sales by region."*
   - Show the bot rendering an interactive chart inside the chat bubble.
   - Click **"Add to Dashboard Workspace"** and show the chart instantly appended to the active dashboard grid!

6. **Deliverable Exports**:
   - Navigate to the **Export Hub**.
   - Download the **Executive PDF Report** and open it to show the formatted KPI tables, data quality score, and audit log.
   - Download the **Multi-Sheet Excel Workbook** and show the separated tabs: *Cleaned Dataset*, *Data Quality & Profiling*, *KPI Metrics*, and *Audit Trail*.

---

## 📸 Recommended Screenshots for the Project Report

1. **Landing & Prompt Ingestion Workspace**: The hero banner, dropzone, prompt input box, and 1-click sample loaders.
2. **Data Schema & Records Preview**: The detected data types, sample values, nullity statistics, and paginated records table.
3. **Data Hygiene & Cleaning Center**: The detected issue cards with severity badges, data quality score gauge, and audit log.
4. **Statistical Profiling & Correlation Heatmap**: Descriptive statistical table, distribution histogram, and the color-coded Pearson correlation matrix.
5. **Interactive Drag-and-Drop Dashboard**: The responsive BI grid showcasing KPI cards, trend line charts, bar charts, and active slicers.
6. **Component Customizer Modal**: The live widget editor showing axes selection, aggregations (SUM/AVG/COUNT), and color palette.
7. **AI Chatbot with In-Chat Chart**: The floating assistant displaying computed metrics and the "Add to Dashboard" button.
8. **Exported Executive PDF & Excel Reports**: Renderings of the generated PDF report and multi-tab spreadsheet.

---

## 🛡️ Security, Privacy & Limitations

- **Session Isolation**: Each uploaded dataset is assigned an isolated session UUID. No data leaks between different user sessions.
- **Untrusted Input Handling**: Uploaded files and prompts are treated strictly as untrusted data. No arbitrary code, macros, shell commands, or raw SQL queries are evaluated.
- **Privacy First**: Raw records are never sent en masse to third-party AI APIs; only anonymized column schemas and aggregate statistical summaries are shared.
- **Future Enhancements**: Integration with relational databases (PostgreSQL/DuckDB) for persistent user accounts and real-time streaming data ingestion.
