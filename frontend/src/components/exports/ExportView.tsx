import React from 'react';
import {
  FileDown,
  FileText,
  FileSpreadsheet,
  Database,
  FileJson,
  CheckCircle2,
  Download,
  Share2
} from 'lucide-react';
import { PreviewData } from '../../types';
import { api } from '../../services/api';

interface ExportViewProps {
  dataset: PreviewData;
}

export const ExportView: React.FC<ExportViewProps> = ({ dataset }) => {
  const exportCards = [
    {
      title: 'Executive PDF Analytics Report',
      description: 'Publication-ready multi-page executive summary containing KPI cards, data quality findings, cleaning audit trail, and analytical insights.',
      icon: FileText,
      iconColor: 'text-rose-400',
      badge: 'PDF Format',
      url: api.getPdfExportUrl(dataset.session_id),
      filename: `Analytics_Report_${dataset.session_id.slice(0, 8)}.pdf`,
      features: ['Formatted KPI tables', 'Data hygiene audit trail', 'Executive summary narrative', 'Quality score evaluation'],
    },
    {
      title: 'Comprehensive Excel Workbook',
      description: 'Multi-tab spreadsheet with styled headers and automated column widths, split into Cleaned Data, Data Profiling, KPIs, and Cleaning Logs.',
      icon: FileSpreadsheet,
      iconColor: 'text-emerald-400',
      badge: 'XLSX Format',
      url: api.getExcelExportUrl(dataset.session_id),
      filename: `Data_Workbook_${dataset.session_id.slice(0, 8)}.xlsx`,
      features: ['Sheet 1: Cleaned Dataset', 'Sheet 2: Column Profiles & Stats', 'Sheet 3: Key Performance Indicators', 'Sheet 4: Audit Trail'],
    },
    {
      title: 'Cleaned Dataset CSV',
      description: 'Raw tabular export of the cleaned and transformed dataset, with trimmed whitespace, resolved missing entries, and removed duplicates.',
      icon: Database,
      iconColor: 'text-blue-400',
      badge: 'CSV Format',
      url: api.getCsvExportUrl(dataset.session_id),
      filename: `Cleaned_${dataset.filename}.csv`,
      features: ['Direct input for Pandas / R', 'UTF-8 encoded', 'Immediate BI tool compatibility', 'Full record export'],
    },
    {
      title: 'Dashboard Configuration JSON',
      description: 'Portable JSON specification containing all widget configurations, custom aggregations, grid coordinates, and theme settings.',
      icon: FileJson,
      iconColor: 'text-amber-400',
      badge: 'JSON Format',
      url: api.getConfigExportUrl(dataset.session_id),
      filename: `Dashboard_Config_${dataset.session_id.slice(0, 8)}.json`,
      features: ['Widget types & dimensions', 'Selected columns & aggregations', 'Filter slicer definitions', 'Responsive grid positions'],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 mb-1">
          <FileDown className="h-4 w-4" />
          <span>Export & Reporting Center</span>
        </div>
        <h2 className="text-2xl font-bold text-white">Download Analysis & Dashboard Deliverables</h2>
        <p className="text-xs text-slate-400 mt-1">
          Export full business reports, multi-tab workbooks, cleaned raw data, and dashboard configurations.
        </p>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition shadow-lg shadow-black/20"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-slate-800 flex items-center justify-center">
                    <Icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {card.badge}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">{card.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{card.description}</p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <p className="text-[11px] font-semibold text-slate-300">Included In Export:</p>
                  <ul className="space-y-1">
                    {card.features.map((feat, fi) => (
                      <li key={fi} className="text-xs text-slate-400 flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6">
                <a
                  href={card.url}
                  download={card.filename}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Download {card.badge.split(' ')[0]}</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
