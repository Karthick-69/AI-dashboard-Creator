import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple
from app.schemas.dataset import DetectedIssue, CleaningRule
from app.core.session import DatasetSession

def detect_cleaning_issues(df: pd.DataFrame) -> List[DetectedIssue]:
    """Inspects DataFrame to detect data hygiene, consistency, and completeness issues."""
    issues: List[DetectedIssue] = []
    total_rows = len(df)
    
    if total_rows == 0:
        return issues

    # 1. Duplicate rows
    duplicate_count = int(df.duplicated().sum())
    if duplicate_count > 0:
        issues.append(DetectedIssue(
            issue_id="duplicates_all",
            issue_type="duplicates",
            column=None,
            severity="high" if duplicate_count > 5 else "medium",
            title=f"{duplicate_count} Duplicate Rows Found",
            description=f"Found {duplicate_count} exact duplicate rows in the dataset, which may bias statistics and KPI calculations.",
            suggested_action="drop_duplicates",
            recommended_params={"keep": "first"},
            affected_count=duplicate_count
        ))

    # 2. Column-by-column issues
    for col in df.columns:
        series = df[col]
        null_count = int(series.isna().sum())
        
        # Missing values
        if null_count > 0:
            null_pct = round((null_count / total_rows) * 100, 1)
            is_numeric = pd.api.types.is_numeric_dtype(series)
            severity = "high" if null_pct > 25 else ("medium" if null_pct > 5 else "low")
            
            if is_numeric:
                issues.append(DetectedIssue(
                    issue_id=f"missing_{col}",
                    issue_type="missing_values",
                    column=str(col),
                    severity=severity,
                    title=f"Missing Values in '{col}'",
                    description=f"Column '{col}' has {null_count} ({null_pct}%) missing entries. Imputing with median or dropping empty rows is recommended.",
                    suggested_action="fill_missing",
                    recommended_params={"method": "median", "value": None},
                    affected_count=null_count
                ))
            else:
                issues.append(DetectedIssue(
                    issue_id=f"missing_{col}",
                    issue_type="missing_values",
                    column=str(col),
                    severity=severity,
                    title=f"Missing Values in '{col}'",
                    description=f"Column '{col}' has {null_count} ({null_pct}%) missing entries. Can replace with 'Unknown' or drop missing rows.",
                    suggested_action="fill_missing",
                    recommended_params={"method": "constant", "value": "Unknown"},
                    affected_count=null_count
                ))

        # String column issues: Whitespace & Casing
        if pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series):
            str_series = series.dropna().astype(str)
            whitespace_count = int(str_series.apply(lambda s: s != s.strip()).sum())
            if whitespace_count > 0:
                issues.append(DetectedIssue(
                    issue_id=f"whitespace_{col}",
                    issue_type="whitespace",
                    column=str(col),
                    severity="low",
                    title=f"Leading/Trailing Whitespace in '{col}'",
                    description=f"{whitespace_count} entries in '{col}' have irregular leading or trailing spaces causing accidental grouping splits.",
                    suggested_action="trim_whitespace",
                    recommended_params={},
                    affected_count=whitespace_count
                ))
            
            # Inconsistent casing check
            cleaned_str = str_series.str.strip()
            unique_original = cleaned_str.nunique()
            unique_lowercased = cleaned_str.str.lower().nunique()
            if unique_original > unique_lowercased and unique_lowercased <= 50:
                issues.append(DetectedIssue(
                    issue_id=f"casing_{col}",
                    issue_type="inconsistent_casing",
                    column=str(col),
                    severity="medium",
                    title=f"Inconsistent Casing in '{col}'",
                    description=f"Found mixed case entries in '{col}' (e.g. 'Electronics' vs 'electronics'). Normalizing to Title Case will unify categories.",
                    suggested_action="normalize_casing",
                    recommended_params={"format": "title"},
                    affected_count=unique_original - unique_lowercased
                ))

        # Check if column is numeric or mostly numeric (e.g. has dirty strings like "twenty")
        clean_num = pd.to_numeric(series.astype(str).str.replace('$', '', regex=False).str.replace(',', '', regex=False).str.strip(), errors='coerce')
        valid_num_count = int(clean_num.notna().sum())
        non_null_total = int(series.notna().sum())
        
        is_primarily_numeric = (pd.api.types.is_numeric_dtype(series) or 
                                (non_null_total > 0 and valid_num_count >= non_null_total * 0.5 and valid_num_count >= 3))

        # Non-numeric text values in a numeric column (e.g. "twenty")
        if is_primarily_numeric and valid_num_count < non_null_total:
            invalid_text_count = non_null_total - valid_num_count
            issues.append(DetectedIssue(
                issue_id=f"invalid_type_{col}",
                issue_type="invalid_type",
                column=str(col),
                severity="medium",
                title=f"Invalid Non-Numeric Entries in '{col}'",
                description=f"Found {invalid_text_count} text/unparseable entries in numeric column '{col}' (e.g. written as words like 'twenty'). Coercing to numeric will clean these records.",
                suggested_action="coerce_numeric",
                recommended_params={"impute": "median"},
                affected_count=invalid_text_count
            ))

        # Numeric outliers
        if is_primarily_numeric:
            clean_series = clean_num.dropna()
            if len(clean_series) > 5:
                q25 = float(clean_series.quantile(0.25))
                q75 = float(clean_series.quantile(0.75))
                iqr = q75 - q25
                lower = q25 - 1.5 * iqr
                upper = q75 + 1.5 * iqr
                
                # Check for extreme biological/domain bounds for Age e.g. < 0 or > 100
                if 'age' in str(col).lower():
                    lower = max(lower, 10.0)
                    upper = min(upper, 80.0)
                
                outliers = int(((clean_series < lower) | (clean_series > upper)).sum())
                if outliers > 0:
                    issues.append(DetectedIssue(
                        issue_id=f"outlier_{col}",
                        issue_type="outliers",
                        column=str(col),
                        severity="medium" if outliers > 3 else "low",
                        title=f"Outliers Detected in '{col}'",
                        description=f"Detected {outliers} outlier values outside [{lower:.1f}, {upper:.1f}] range (e.g. extreme or negative values).",
                        suggested_action="remove_outliers",
                        recommended_params={"method": "cap_iqr"},
                        affected_count=outliers
                    ))

    return issues

def apply_cleaning_rules(session: DatasetSession, rules: List[CleaningRule]) -> Tuple[pd.DataFrame, int, int]:
    """Applies approved cleaning rules to the session DataFrame, updating audit log."""
    df = session.df.copy()
    rows_before = len(df)
    
    for rule in rules:
        action = rule.action
        col = rule.column
        params = rule.params or {}
        
        if action == "drop_duplicates":
            before_len = len(df)
            df = df.drop_duplicates()
            after_len = len(df)
            session.add_audit(
                operation="Drop Duplicates",
                description=f"Removed {before_len - after_len} duplicate rows from dataset.",
                rows_before=before_len,
                rows_after=after_len
            )
            
        elif action == "fill_missing" and col and col in df.columns:
            before_nulls = int(df[col].isna().sum())
            method = params.get("method", "median")
            fill_val = params.get("value")
            
            if pd.api.types.is_numeric_dtype(df[col]):
                if method == "mean":
                    val = float(df[col].mean())
                elif method == "median":
                    val = float(df[col].median())
                elif method == "zero":
                    val = 0.0
                elif fill_val is not None:
                    val = float(fill_val)
                else:
                    val = float(df[col].median())
                df[col] = df[col].fillna(val)
                session.add_audit(
                    operation=f"Fill Missing ({col})",
                    description=f"Imputed {before_nulls} missing values in '{col}' with {method} ({val:.2f}).",
                    rows_before=len(df),
                    rows_after=len(df),
                    details={"column": col, "imputed_value": val}
                )
            else:
                val = str(fill_val) if fill_val is not None else "Unknown"
                df[col] = df[col].fillna(val)
                session.add_audit(
                    operation=f"Fill Missing ({col})",
                    description=f"Replaced {before_nulls} missing entries in '{col}' with '{val}'.",
                    rows_before=len(df),
                    rows_after=len(df),
                    details={"column": col, "imputed_value": val}
                )
                
        elif action == "drop_missing_rows" and col and col in df.columns:
            before_len = len(df)
            df = df.dropna(subset=[col])
            after_len = len(df)
            session.add_audit(
                operation=f"Drop Missing Rows ({col})",
                description=f"Dropped {before_len - after_len} rows containing missing values in '{col}'.",
                rows_before=before_len,
                rows_after=after_len,
                details={"column": col}
            )
            
        elif action == "trim_whitespace" and col and col in df.columns:
            if pd.api.types.is_object_dtype(df[col]) or pd.api.types.is_string_dtype(df[col]):
                df[col] = df[col].astype(str).str.strip()
                session.add_audit(
                    operation=f"Trim Whitespace ({col})",
                    description=f"Trimmed leading and trailing whitespace from '{col}'.",
                    rows_before=len(df),
                    rows_after=len(df),
                    details={"column": col}
                )
                
        elif action == "normalize_casing" and col and col in df.columns:
            casing = params.get("format", "title")
            if pd.api.types.is_object_dtype(df[col]) or pd.api.types.is_string_dtype(df[col]):
                if casing == "lower":
                    df[col] = df[col].astype(str).str.strip().str.lower()
                elif casing == "upper":
                    df[col] = df[col].astype(str).str.strip().str.upper()
                else:
                    df[col] = df[col].astype(str).str.strip().str.title()
                session.add_audit(
                    operation=f"Normalize Casing ({col})",
                    description=f"Normalized text casing in '{col}' to {casing.capitalize()} Case.",
                    rows_before=len(df),
                    rows_after=len(df),
                    details={"column": col, "format": casing}
                )

        elif action == "coerce_numeric" and col and col in df.columns:
            clean_series = pd.to_numeric(df[col].astype(str).str.replace('$', '', regex=False).str.replace(',', '', regex=False).str.strip(), errors='coerce')
            median_val = float(clean_series.dropna().median()) if len(clean_series.dropna()) > 0 else 0.0
            imputed_count = int(df[col].notna().sum() - clean_series.notna().sum())
            df[col] = clean_series.fillna(median_val)
            session.add_audit(
                operation=f"Coerce to Numeric ({col})",
                description=f"Standardized '{col}' to numeric and imputed {imputed_count} non-numeric text values with median ({median_val:.1f}).",
                rows_before=len(df),
                rows_after=len(df),
                details={"column": col, "imputed_count": imputed_count, "impute_value": median_val}
            )

        elif action == "remove_outliers" and col and col in df.columns:
            clean_col = pd.to_numeric(df[col], errors='coerce')
            non_null = clean_col.dropna()
            if len(non_null) > 0:
                q25 = float(non_null.quantile(0.25))
                q75 = float(non_null.quantile(0.75))
                iqr = q75 - q25
                lower = q25 - 1.5 * iqr
                upper = q75 + 1.5 * iqr

                if 'age' in str(col).lower():
                    lower = max(lower, 10.0)
                    upper = min(upper, 80.0)
                
                method = params.get("method", "cap_iqr")
                if method == "drop":
                    before_len = len(df)
                    df = df[(clean_col >= lower) & (clean_col <= upper)]
                    after_len = len(df)
                    session.add_audit(
                        operation=f"Remove Outliers ({col})",
                        description=f"Dropped {before_len - after_len} rows with values outside bounds [{lower:.1f}, {upper:.1f}].",
                        rows_before=before_len,
                        rows_after=after_len
                    )
                else:  # Cap values (Winsorize)
                    clipped = clean_col.clip(lower=lower, upper=upper)
                    count_capped = int((clean_col != clipped).sum())
                    df[col] = clipped
                    session.add_audit(
                        operation=f"Cap Outliers ({col})",
                        description=f"Capped {count_capped} extreme outlier values in '{col}' to domain bounds [{lower:.1f}, {upper:.1f}].",
                        rows_before=len(df),
                        rows_after=len(df),
                        details={"lower_bound": lower, "upper_bound": upper, "capped_count": count_capped}
                    )

        elif action == "drop_column" and col and col in df.columns:
            df = df.drop(columns=[col])
            session.add_audit(
                operation=f"Drop Column ({col})",
                description=f"Removed column '{col}' from dataset.",
                rows_before=len(df),
                rows_after=len(df),
                details={"column": col}
            )

    session.df = df
    rows_after = len(df)
    return df, rows_before, rows_after
