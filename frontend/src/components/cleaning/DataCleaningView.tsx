import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Filter,
  FileClock,
  CheckSquare,
  Square,
  Sliders,
  BadgeAlert
} from 'lucide-react';
import { PreviewData, DetectedIssue, CleaningRule, CleaningAuditEntry } from '../../types';
import { api } from '../../services/api';

interface DataCleaningViewProps {
  dataset: PreviewData;
  onProceedToDashboard: () => void;
  onDatasetUpdated: (updated: PreviewData) => void;
}

export const DataCleaningView: React.FC<DataCleaningViewProps> = ({
  dataset,
  onProceedToDashboard,
  onDatasetUpdated,
}) => {
  const [issues, setIssues] = useState<DetectedIssue[]>([]);
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [auditLog, setAuditLog] = useState<CleaningAuditEntry[]>([]);
  const [qualityScore, setQualityScore] = useState<number>(85);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    loadIssues();
  }, [dataset.session_id]);

  const loadIssues = async () => {
    setIsLoading(true);
    try {
      const detected = await api.detectIssues(dataset.session_id);
      setIssues(detected);
      // Select all safe issues by default
      setSelectedIssueIds(detected.map((i) => i.issue_id));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectIssue = (id: string) => {
    setSelectedIssueIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIssueIds.length === issues.length) {
      setSelectedIssueIds([]);
    } else {
      setSelectedIssueIds(issues.map((i) => i.issue_id));
    }
  };

  const handleApplyApprovedCleaning = async () => {
    if (selectedIssueIds.length === 0) return;
    setIsLoading(true);
    setStatusMsg('Applying approved transformations safely with audit logging...');

    const rulesToApply: CleaningRule[] = issues
      .filter((i) => selectedIssueIds.includes(i.issue_id))
      .map((i) => ({
        rule_id: i.issue_id,
        action: i.suggested_action,
        column: i.column,
        params: i.recommended_params,
      }));

    try {
      const res = await api.applyCleaning(dataset.session_id, rulesToApply);
      setIssues(res.detected_issues);
      setSelectedIssueIds(res.detected_issues.map((i) => i.issue_id));
      setAuditLog(res.audit_log);
      setQualityScore(res.data_quality_score);

      // Refresh dataset preview
      const updatedPreview = await api.getPreview(dataset.session_id);
      onDatasetUpdated(updatedPreview);
      setStatusMsg(`Successfully applied ${rulesToApply.length} cleaning operations!`);
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err: any) {
      setStatusMsg(`Cleaning error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    setStatusMsg('Reverting dataset back to raw source state...');
    try {
      const res = await api.resetCleaning(dataset.session_id);
      setIssues(res.detected_issues);
      setSelectedIssueIds(res.detected_issues.map((i) => i.issue_id));
      setAuditLog(res.audit_log);
      setQualityScore(res.data_quality_score);

      const updatedPreview = await api.getPreview(dataset.session_id);
      onDatasetUpdated(updatedPreview);
      setStatusMsg('Dataset reset to original raw state.');
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg(`Reset error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">HIGH</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">LOW</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Automated Data Hygiene & Cleaning Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Data Quality & Cleaning Center</h2>
          <p className="text-xs text-slate-400 mt-1">
            Review and approve safe transformations. The raw dataset is preserved with full audit trail logging and instant reset.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            <span>Reset to Raw Data</span>
          </button>

          <button
            onClick={onProceedToDashboard}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <span>Proceed to Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3.5 text-xs text-blue-300 flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Top Quality Score & Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-center space-x-4">
          <div className="relative flex items-center justify-center">
            <div className="h-14 w-14 rounded-full border-4 border-slate-800 flex items-center justify-center">
              <span className="text-base font-extrabold text-emerald-400">{qualityScore}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-300">Data Quality Score</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Calculated from completeness & uniqueness</p>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <BadgeAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{issues.length}</p>
            <p className="text-xs text-slate-400">Detected Issues</p>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileClock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{auditLog.length}</p>
            <p className="text-xs text-slate-400">Applied Operations</p>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{dataset.row_count.toLocaleString()}</p>
            <p className="text-xs text-slate-400">Current Clean Rows</p>
          </div>
        </div>
      </div>

      {/* Main Cleaning Workspace: Issues List & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Detected Issues (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-semibold text-slate-200">
              <Sliders className="h-4 w-4 text-blue-400" />
              <span>Recommended Cleaning Rules ({issues.length})</span>
            </div>

            {issues.length > 0 && (
              <button
                onClick={selectAll}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
              >
                {selectedIssueIds.length === issues.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {issues.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">No Hygiene Issues Detected</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Your dataset is already high quality! It has no duplicate rows, missing entries, or irregular whitespace.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => {
                const isChecked = selectedIssueIds.includes(issue.issue_id);
                return (
                  <div
                    key={issue.issue_id}
                    onClick={() => toggleSelectIssue(issue.issue_id)}
                    className={`p-4 rounded-xl border transition cursor-pointer ${
                      isChecked
                        ? 'bg-slate-900 border-blue-500/40 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5 text-blue-400">
                          {isChecked ? <CheckSquare className="h-4 w-4 text-blue-400" /> : <Square className="h-4 w-4 text-slate-600" />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-white">{issue.title}</span>
                            {getSeverityBadge(issue.severity)}
                            {issue.column && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {issue.column}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{issue.description}</p>
                          <div className="pt-1 text-[11px] text-blue-400 font-medium">
                            Action: <span className="font-mono bg-blue-500/10 px-1 rounded">{issue.suggested_action}</span> (Affects {issue.affected_count} records)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={handleApplyApprovedCleaning}
                disabled={isLoading || selectedIssueIds.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Apply {selectedIssueIds.length} Approved Cleaning Operations</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Audit Trail Log (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center space-x-2 text-sm font-semibold text-slate-200">
            <FileClock className="h-4 w-4 text-amber-400" />
            <span>Cleaning Audit Trail</span>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 max-h-[460px] overflow-y-auto space-y-3">
            {auditLog.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 italic">
                No cleaning actions performed yet. Approved operations will be logged here with timestamps and row impacts.
              </div>
            ) : (
              auditLog.map((log, idx) => (
                <div key={idx} className="border-l-2 border-emerald-500 pl-3 py-1 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{log.operation}</span>
                    <span className="text-[10px] text-slate-500">{log.timestamp.slice(11, 19)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{log.description}</p>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Rows: {log.rows_before} → {log.rows_after}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
