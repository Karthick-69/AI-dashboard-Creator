import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
  Database,
  FileText,
  AlertCircle,
  CheckCircle2,
  Layers,
  Wand2
} from 'lucide-react';
import { api } from '../../services/api';
import { PreviewData } from '../../types';

interface UploadViewProps {
  onDatasetLoaded: (data: PreviewData, initialPrompt: string) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  onDatasetLoaded,
  isLoading,
  setIsLoading,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const examplePrompts = [
    {
      title: 'Sales & Revenue Performance',
      prompt: 'Create a sales dashboard with total revenue, total orders, average order value, monthly revenue trends, top five products, region-wise sales, and category filters. Prioritize revenue trends.',
      sampleKey: 'sales',
    },
    {
      title: 'Student Academic Grades & Pass Rates',
      prompt: 'Analyze student performance and show subject averages, pass percentages, study hours correlation, and top-performing students.',
      sampleKey: 'students',
    },
    {
      title: 'Employee Analytics & Salary Benchmark',
      prompt: 'Create an employee analytics dashboard showing department distribution, salary statistics, experience correlation, and attrition breakdown.',
      sampleKey: 'employees',
    },
    {
      title: 'Inventory Levels & Low-Stock Alerts',
      prompt: 'Create an inventory dashboard showing stock levels, low-stock products, category-wise inventory, and warehouse status.',
      sampleKey: 'inventory',
    },
    {
      title: 'Dirty Retail Data Cleaning Showcase',
      prompt: 'Inspect this retail dataset for duplicate entries, missing amounts, irregular whitespace, and outliers, then generate clean KPI trends.',
      sampleKey: 'dirty_retail',
    },
  ];

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleProcessUpload = async () => {
    if (!selectedFile) {
      setError('Please select or drop a dataset file first.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setLoadingMsg('Uploading and parsing dataset schema...');

    try {
      const preview = await api.uploadFile(selectedFile);
      setLoadingMsg('Profiling columns, hygiene, and statistical distributions...');
      onDatasetLoaded(preview, customPrompt);
    } catch (err: any) {
      setError(err.message || 'Failed to upload dataset.');
    } finally {
      setIsLoading(false);
      setLoadingMsg('');
    }
  };

  const handleLoadSample = async (sampleKey: string, promptText: string) => {
    setError(null);
    setIsLoading(true);
    setLoadingMsg(`Loading pre-packaged sample dataset: ${sampleKey}...`);
    setCustomPrompt(promptText);

    try {
      const preview = await api.loadSample(sampleKey);
      setLoadingMsg('Analyzing data structure & computing metrics...');
      onDatasetLoaded(preview, promptText);
    } catch (err: any) {
      setError(err.message || 'Failed to load sample dataset.');
    } finally {
      setIsLoading(false);
      setLoadingMsg('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span>Next-Generation BI Automation Engine</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Turn Raw Datasets Into <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">Interactive BI Dashboards</span>
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Upload any CSV, Excel, or JSON file. Describe your requirements in natural language. Our Python analytics pipeline cleans data, profiles distributions, computes exact metrics, and renders customizable visualizations.
        </p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Upload Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Drag & Drop Dropzone */}
        <div className="lg:col-span-7 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[260px] ${
              dragOver
                ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                : selectedFile
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-slate-700 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900/70'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv,.xlsx,.xls,.json"
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Click to replace file
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Drag and drop your dataset here, or <span className="text-blue-400 font-semibold underline underline-offset-2">browse</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports CSV (.csv), Excel (.xlsx, .xls), and JSON (.json) up to 50MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Sample Loaders */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
              <Database className="h-3.5 w-3.5 text-indigo-400" />
              <span>Or click to test with a pre-packaged sample dataset:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {examplePrompts.map((ex) => (
                <button
                  key={ex.sampleKey}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleLoadSample(ex.sampleKey, ex.prompt)}
                  className="px-2.5 py-2 text-left rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs text-slate-300 hover:text-white transition cursor-pointer flex flex-col justify-between"
                >
                  <span className="font-medium truncate">{ex.title}</span>
                  <span className="text-[10px] text-blue-400 mt-1 flex items-center">
                    Load & Analyze <ArrowRight className="h-2.5 w-2.5 ml-1" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Custom Dashboard Prompt & Action */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center space-x-2">
                <Wand2 className="h-3.5 w-3.5 text-blue-400" />
                <span>Custom Dashboard Prompt (Natural Language)</span>
              </label>
              <span className="text-[10px] text-slate-500">Optional</span>
            </div>

            <textarea
              rows={4}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. Create a sales dashboard with total revenue, monthly trends, top five products, and region filters..."
              className="w-full bg-slate-950/70 border border-slate-700/70 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition resize-none"
            />

            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-slate-400">Click an example prompt to populate:</p>
              <div className="space-y-1">
                {examplePrompts.slice(0, 3).map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCustomPrompt(p.prompt)}
                    className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 truncate transition cursor-pointer block border border-slate-800"
                  >
                    "{p.prompt}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Prominent Action Button */}
          <button
            type="button"
            disabled={isLoading || !selectedFile}
            onClick={handleProcessUpload}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all flex items-center justify-center space-x-2 shadow-lg cursor-pointer ${
              isLoading || !selectedFile
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-blue-500/25 active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{loadingMsg || 'Processing Data...'}</span>
              </div>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Analyze & Generate Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
