import React, { useState } from 'react';
import {
  TableProperties,
  Hash,
  Type,
  Calendar,
  Layers,
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  ArrowRight
} from 'lucide-react';
import { PreviewData } from '../../types';

interface DataPreviewViewProps {
  dataset: PreviewData;
  onProceedToCleaning: () => void;
}

export const DataPreviewView: React.FC<DataPreviewViewProps> = ({
  dataset,
  onProceedToCleaning,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 8;

  // Filter columns by search term
  const filteredColumns = dataset.columns.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(dataset.head_rows.length / rowsPerPage);
  const paginatedRows = dataset.head_rows.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage
  );

  const getDtypeIcon = (dtype: string) => {
    if (dtype.includes('int') || dtype.includes('float')) {
      return <Hash className="h-3.5 w-3.5 text-blue-400" />;
    }
    if (dtype.includes('date') || dtype.includes('time')) {
      return <Calendar className="h-3.5 w-3.5 text-amber-400" />;
    }
    return <Type className="h-3.5 w-3.5 text-emerald-400" />;
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-300">
      {/* Header & Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 mb-1">
            <TableProperties className="h-4 w-4" />
            <span>Dataset Preview & Schema</span>
          </div>
          <h2 className="text-2xl font-bold text-white">{dataset.filename}</h2>
          <p className="text-xs text-slate-400 mt-1">
            Format: <span className="uppercase text-slate-200 font-medium">{dataset.file_type}</span> • Size:{' '}
            <span className="text-slate-200 font-medium">{(dataset.file_size_bytes / 1024).toFixed(1)} KB</span> • Total
            Rows: <span className="text-slate-200 font-medium">{dataset.row_count.toLocaleString()}</span> • Total Columns:{' '}
            <span className="text-slate-200 font-medium">{dataset.column_count}</span>
          </p>
        </div>

        <button
          onClick={onProceedToCleaning}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition cursor-pointer self-start sm:self-auto"
        >
          <span>Data Hygiene & Cleaning</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Column Schema Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            <span>Detected Column Schema & Data Types ({dataset.columns.length})</span>
          </h3>

          <div className="relative w-56">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search column..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredColumns.map((col) => (
            <div
              key={col.name}
              className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 truncate">
                  {getDtypeIcon(col.dtype)}
                  <span className="text-xs font-semibold text-white truncate" title={col.name}>
                    {col.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {col.dtype}
                </span>
              </div>

              <div className="space-y-1 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Unique Values:</span>
                  <span className="text-slate-200 font-medium">{col.unique_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Null Count:</span>
                  <span className={col.null_count > 0 ? 'text-amber-400 font-medium' : 'text-slate-400'}>
                    {col.null_count} ({col.null_percentage}%)
                  </span>
                </div>
              </div>

              {/* Sample values pill */}
              <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-500 truncate">
                Sample: {col.sample_values.slice(0, 2).join(', ') || 'N/A'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Data Table Preview */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden space-y-3">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Records Sample Preview</h3>
            <span className="text-xs text-slate-400">
              (Showing rows {currentPage * rowsPerPage + 1} to{' '}
              {Math.min((currentPage + 1) * rowsPerPage, dataset.head_rows.length)} of {dataset.head_rows.length} previewed)
            </span>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center space-x-2 text-xs">
              <button
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-slate-400">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-4 w-12 text-slate-600">#</th>
                {dataset.columns.map((c) => (
                  <th key={c.name} className="py-2.5 px-4 font-semibold text-slate-300 whitespace-nowrap">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
              {paginatedRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition">
                  <td className="py-2 px-4 text-slate-600 font-sans">{currentPage * rowsPerPage + idx + 1}</td>
                  {dataset.columns.map((c) => {
                    const val = row[c.name];
                    const isNull = val === null || val === undefined || val === '';
                    return (
                      <td key={c.name} className="py-2 px-4 whitespace-nowrap">
                        {isNull ? (
                          <span className="text-amber-500/70 italic font-sans text-[10px]">null</span>
                        ) : (
                          <span>{String(val)}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
