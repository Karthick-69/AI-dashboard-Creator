export interface ColumnDetail {
  name: string;
  dtype: string;
  non_null_count: number;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  sample_values: string[];
}

export interface PreviewData {
  session_id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  row_count: number;
  column_count: number;
  columns: ColumnDetail[];
  head_rows: Record<string, any>[];
  sheet_names?: string[];
  active_sheet?: string;
}

export interface NumericDistribution {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  q25?: number;
  q75?: number;
  histogram?: { bin: string; count: number }[];
}

export interface ColumnProfile {
  name: string;
  dtype: string;
  general_type: 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean';
  null_count: number;
  null_percentage: number;
  unique_count: number;
  top_categories?: { category: string; count: number; percentage: number }[];
  numeric_stats?: NumericDistribution;
  outlier_count: number;
  sample_values: any[];
}

export interface ProfileData {
  session_id: string;
  total_rows: number;
  total_columns: number;
  duplicate_rows: number;
  missing_cells: number;
  missing_cells_percentage: number;
  data_quality_score: number;
  columns: ColumnProfile[];
  numeric_columns: string[];
  categorical_columns: string[];
  datetime_columns: string[];
  correlations?: Record<string, Record<string, number>>;
}

export interface DetectedIssue {
  issue_id: string;
  issue_type: 'missing_values' | 'duplicates' | 'whitespace' | 'inconsistent_casing' | 'outliers' | 'empty_column';
  column?: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggested_action: string;
  recommended_params: Record<string, any>;
  affected_count: number;
}

export interface CleaningRule {
  rule_id: string;
  action: string;
  column?: string;
  params: Record<string, any>;
}

export interface CleaningAuditEntry {
  operation: string;
  description: string;
  timestamp: string;
  rows_before: number;
  rows_after: number;
  details: Record<string, any>;
}

export interface CleaningResult {
  success: boolean;
  session_id: string;
  rows_before: number;
  rows_after: number;
  audit_log: CleaningAuditEntry[];
  data_quality_score: number;
  detected_issues: DetectedIssue[];
}

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface WidgetConfig {
  id: string;
  title: string;
  type: 'kpi' | 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'scatter' | 'histogram' | 'table';
  description?: string;
  x_column?: string;
  y_column?: string;
  category_column?: string;
  value_column?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median' | 'distinct_count';
  color?: string;
  top_n?: number;
  sort_order?: 'asc' | 'desc' | 'none';
  format?: 'number' | 'currency' | 'percent';
  data?: any;
  explanation?: string;
}

export interface FilterSlicer {
  column: string;
  type: 'categorical' | 'date_range' | 'numeric_range';
  options?: any[];
  min_value?: number;
  max_value?: number;
  current_value?: any;
}

export interface DashboardConfig {
  session_id: string;
  title: string;
  prompt?: string;
  theme?: string;
  widgets: WidgetConfig[];
  layout: LayoutItem[];
  slicers: FilterSlicer[];
  insights?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  chart?: WidgetConfig;
  suggested_followups?: string[];
}
