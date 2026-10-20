import React, { useState } from 'react';
import {
  BarChart3,
  Upload,
  FileDown,
  Sparkles,
  Sun,
  Moon,
  Database,
  ChevronDown,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FileJson
} from 'lucide-react';
import { PreviewData } from '../../types';
import { api } from '../../services/api';

interface NavbarProps {
  currentDataset: PreviewData | null;
  onUploadClick: () => void;
  aiStatus: { gemini_configured: boolean; model: string } | null;
  darkMode: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentDataset,
  onUploadClick,
  aiStatus,
  darkMode,
  onToggleTheme,
}) => {
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <BarChart3 className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg text-white tracking-tight">CognitiveBI</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              AI Analytics
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Automated Data Analysis & Dashboard Generator</p>
        </div>
      </div>

      {/* Dataset & Engine Status */}
      <div className="hidden md:flex items-center space-x-4">
        {currentDataset ? (
          <div className="flex items-center space-x-3 bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700/60 text-xs text-slate-300">
            <Database className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-medium text-white max-w-[150px] truncate">{currentDataset.filename}</span>
            <span className="text-slate-500">•</span>
            <span>{currentDataset.row_count.toLocaleString()} rows</span>
            <span className="text-slate-500">•</span>
            <span>{currentDataset.column_count} cols</span>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">No dataset loaded</div>
        )}

        {/* AI Provider Status */}
        <div className="flex items-center space-x-2 text-xs px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40">
          <Sparkles className={`h-3.5 w-3.5 ${aiStatus?.gemini_configured ? 'text-amber-400' : 'text-emerald-400'}`} />
          <span className="text-slate-300">
            {aiStatus?.gemini_configured ? `Gemini AI (${aiStatus.model})` : 'Hybrid Rule Engine'}
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onUploadClick}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-sm shadow-blue-600/30 cursor-pointer"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>{currentDataset ? 'Replace Data' : 'Upload Data'}</span>
        </button>

        {/* Export Dropdown */}
        {currentDataset && (
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
            >
              <FileDown className="h-3.5 w-3.5 text-slate-400" />
              <span>Export</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {exportOpen && (
              <div
                className="absolute right-0 mt-2 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2"
                onClick={() => setExportOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-700/60">
                  Export Options
                </div>
                <a
                  href={api.getPdfExportUrl(currentDataset.session_id)}
                  download
                  className="flex items-center space-x-2.5 px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-700/60 transition"
                >
                  <FileText className="h-4 w-4 text-rose-400" />
                  <span>Executive PDF Report</span>
                </a>
                <a
                  href={api.getExcelExportUrl(currentDataset.session_id)}
                  download
                  className="flex items-center space-x-2.5 px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-700/60 transition"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  <span>Multi-Sheet Excel (.xlsx)</span>
                </a>
                <a
                  href={api.getCsvExportUrl(currentDataset.session_id)}
                  download
                  className="flex items-center space-x-2.5 px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-700/60 transition"
                >
                  <Database className="h-4 w-4 text-blue-400" />
                  <span>Cleaned Dataset (CSV)</span>
                </a>
                <a
                  href={api.getConfigExportUrl(currentDataset.session_id)}
                  download
                  className="flex items-center space-x-2.5 px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-700/60 transition"
                >
                  <FileJson className="h-4 w-4 text-amber-400" />
                  <span>Dashboard Config (JSON)</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title="Toggle Theme"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
        >
          {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-blue-300" />}
        </button>
      </div>
    </header>
  );
};
