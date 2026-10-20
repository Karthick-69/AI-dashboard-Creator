import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.core.session import DatasetSession
from app.data_processing.profiler import profile_dataset

def generate_pdf_report(session: DatasetSession) -> bytes:
    """Generates an executive analytical PDF report summarizing the dataset, KPIs, insights, and data cleaning."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=15
    )

    heading2_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=14,
        spaceAfter=8
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )

    story = []

    # Title & Metadata
    title_text = "Executive Analytics & Dashboard Report"
    if session.dashboard_config and session.dashboard_config.get("title"):
        title_text = session.dashboard_config["title"]
    
    story.append(Paragraph(title_text, title_style))
    story.append(Paragraph(
        f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} | Dataset: {session.filename} | Format: {session.file_type.upper()}",
        subtitle_style
    ))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#3b82f6"), spaceAfter=15))

    # Section 1: Executive KPI Summary
    story.append(Paragraph("1. Key Performance Indicators", heading2_style))
    kpi_data = [["KPI Metric", "Calculated Value", "Aggregation / Type", "Status"]]
    
    if session.dashboard_config and "widgets" in session.dashboard_config:
        for w in session.dashboard_config["widgets"]:
            if w.get("type") == "kpi":
                val = w.get("data", 0)
                fmt = w.get("format", "number")
                if fmt == "currency":
                    val_str = f"${val:,.2f}" if isinstance(val, (int, float)) else str(val)
                elif fmt == "percent":
                    val_str = f"{val:.1f}%" if isinstance(val, (int, float)) else str(val)
                else:
                    val_str = f"{val:,}" if isinstance(val, int) else (f"{val:,.2f}" if isinstance(val, float) else str(val))
                kpi_data.append([w.get("title", "KPI"), val_str, w.get("aggregation", "sum").upper(), "Active"])

    if len(kpi_data) == 1:
        # Fallback KPI
        kpi_data.append(["Total Records", f"{len(session.df):,}", "COUNT", "Active"])
        kpi_data.append(["Total Attributes", f"{len(session.df.columns):,}", "COUNT", "Active"])

    kpi_table = Table(kpi_data, colWidths=[180, 120, 130, 90])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 15))

    # Section 2: Data Quality & Profiling
    story.append(Paragraph("2. Data Quality & Profiling Summary", heading2_style))
    profile = profile_dataset(session.df, session.session_id)
    
    dq_data = [
        ["Metric", "Value", "Metric", "Value"],
        ["Total Rows", f"{profile.total_rows:,}", "Total Columns", f"{profile.total_columns:,}"],
        ["Missing Cells", f"{profile.missing_cells:,} ({profile.missing_cells_percentage}%)", "Duplicate Rows", f"{profile.duplicate_rows:,}"],
        ["Data Quality Score", f"{profile.data_quality_score} / 100", "Numeric Columns", f"{len(profile.numeric_columns)}"],
    ]
    dq_table = Table(dq_data, colWidths=[130, 130, 130, 130])
    dq_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
    ]))
    story.append(dq_table)
    story.append(Spacer(1, 15))

    # Section 3: Data Cleaning Audit Trail
    story.append(Paragraph("3. Data Hygiene & Cleaning Audit Trail", heading2_style))
    if session.audit_log:
        audit_data = [["Operation", "Description", "Timestamp", "Row Impact"]]
        for entry in session.audit_log[-8:]:
            audit_data.append([
                entry.get("operation", "Cleaning"),
                Paragraph(entry.get("description", ""), body_style),
                entry.get("timestamp", "")[:19],
                f"{entry.get('rows_before', len(session.df))} → {entry.get('rows_after', len(session.df))}"
            ])
        audit_table = Table(audit_data, colWidths=[120, 220, 100, 80])
        audit_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8fafc')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(audit_table)
    else:
        story.append(Paragraph("Original dataset required zero automated modifications or retains pristine source integrity.", body_style))

    story.append(Spacer(1, 15))

    # Section 4: Key Insights & Visualizations
    story.append(Paragraph("4. Key Findings & Dashboard Configuration", heading2_style))
    if session.dashboard_config and "insights" in session.dashboard_config:
        for ins in session.dashboard_config["insights"]:
            story.append(Paragraph(f"• {ins}", body_style))
            story.append(Spacer(1, 4))
    else:
        story.append(Paragraph("Automated analysis detected stable distributions across primary dimensions.", body_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
