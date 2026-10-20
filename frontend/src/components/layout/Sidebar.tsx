import React from 'react';
import {
  UploadCloud,
  TableProperties,
  Sparkles,
  PieChart,
  LayoutDashboard,
  FileDown,
  ShieldCheck,
  Activity
} from 'lucide-react';

export type TabType = 'upload' | 'preview' | 'cleaning' | 'profiling' | 'dashboard' | 'export';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  hasDataset: boolean;
  issuesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  hasDataset,
  issuesCount = 0,
}) => {
  const navItems = [
    {
      id: 'upload' as TabType,
      label: 'Upload & Setup',
      icon: UploadCloud,
      alwaysEnabled: true,
      badge: null,
    },
    {
      id: 'preview' as TabType,
      label: 'Data Preview',
      icon: TableProperties,
      alwaysEnabled: false,
      badge: null,
    },
    {
      id: 'cleaning' as TabType,
      label: 'Data Cleaning',
      icon: ShieldCheck,
      alwaysEnabled: false,
      badge: issuesCount > 0 ? issuesCount : null,
    },
    {
      id: 'profiling' as TabType,
      label: 'Profiling & EDA',
      icon: Activity,
      alwaysEnabled: false,
      badge: null,
    },
    {
      id: 'dashboard' as TabType,
      label: 'Live Dashboard',
      icon: LayoutDashboard,
      alwaysEnabled: false,
      badge: null,
    },
    {
      id: 'export' as TabType,
      label: 'Export Hub',
      icon: FileDown,
      alwaysEnabled: false,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
            Analysis Workflow
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isEnabled = item.alwaysEnabled || hasDataset;

              return (
                <button
                  key={item.id}
                  disabled={!isEnabled}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                      : isEnabled
                      ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      : 'text-slate-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== null && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* College Project / Internship Presentation Tag */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 mb-1">
            <PieChart className="h-3.5 w-3.5 text-blue-400" />
            <span>Power BI Style Engine</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Drag, resize, reconfigure aggregations, inspect outliers, and prompt AI in real-time.
          </p>
        </div>
      </div>
    </aside>
  );
};
