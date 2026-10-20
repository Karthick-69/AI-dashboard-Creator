import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Filter,
  Plus,
  Wand2,
  Save,
  RotateCcw,
  Sparkles,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { Responsive as ResponsiveGridLayout, WidthProvider, Layout } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import { PreviewData, DashboardConfig, WidgetConfig, FilterSlicer, LayoutItem } from '../../types';
import { WidgetCard } from './WidgetCard';
import { WidgetEditorModal } from './WidgetEditorModal';
import { api } from '../../services/api';

const Grid = WidthProvider(ResponsiveGridLayout);

interface DashboardViewProps {
  dataset: PreviewData;
  dashboard: DashboardConfig;
  onDashboardUpdated: (updated: DashboardConfig) => void;
  onOpenChat: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  dataset,
  dashboard,
  onDashboardUpdated,
  onOpenChat,
}) => {
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [widgets, setWidgets] = useState<WidgetConfig[]>(dashboard.widgets);
  const [layouts, setLayouts] = useState<any>({ lg: dashboard.layout });
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [regeneratePrompt, setRegeneratePrompt] = useState(dashboard.prompt || '');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    setWidgets(dashboard.widgets);
    setLayouts({ lg: dashboard.layout });
  }, [dashboard]);

  // When filters change, re-query all widgets
  const handleFilterChange = async (column: string, value: any) => {
    const updatedFilters = { ...activeFilters, [column]: value };
    // Clean empty values
    if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      delete updatedFilters[column];
    }
    setActiveFilters(updatedFilters);

    // Re-query all widgets with updated filters
    const updatedWidgets = await Promise.all(
      widgets.map(async (w) => {
        try {
          const freshData = await api.queryWidget(dataset.session_id, w, updatedFilters);
          return { ...w, data: freshData };
        } catch (err) {
          return w;
        }
      })
    );
    setWidgets(updatedWidgets);
  };

  const handleResetFilters = async () => {
    setActiveFilters({});
    const updatedWidgets = await Promise.all(
      widgets.map(async (w) => {
        try {
          const freshData = await api.queryWidget(dataset.session_id, w, {});
          return { ...w, data: freshData };
        } catch (err) {
          return w;
        }
      })
    );
    setWidgets(updatedWidgets);
  };

  const handleSaveWidget = async (updatedWidget: WidgetConfig) => {
    // Requery data for this updated widget
    try {
      const freshData = await api.queryWidget(dataset.session_id, updatedWidget, activeFilters);
      const widgetWithData = { ...updatedWidget, data: freshData };

      const existingIndex = widgets.findIndex((w) => w.id === updatedWidget.id);
      let newWidgets = [...widgets];

      if (existingIndex >= 0) {
        newWidgets[existingIndex] = widgetWithData;
      } else {
        // New widget added!
        newWidgets.push(widgetWithData);
        // Add layout coordinate
        const currentLg = layouts.lg || [];
        const maxY = currentLg.reduce((max: number, item: any) => Math.max(max, item.y + item.h), 0);
        const newLayoutItem: LayoutItem = {
          i: updatedWidget.id,
          x: 0,
          y: maxY,
          w: updatedWidget.type === 'kpi' ? 3 : 6,
          h: updatedWidget.type === 'kpi' ? 2 : 5,
        };
        setLayouts({ lg: [...currentLg, newLayoutItem] });
      }

      setWidgets(newWidgets);
      const updatedConfig: DashboardConfig = {
        ...dashboard,
        widgets: newWidgets,
        layout: layouts.lg || dashboard.layout,
      };
      await api.saveDashboard(dataset.session_id, updatedConfig);
      onDashboardUpdated(updatedConfig);
    } catch (err) {
      console.error('Failed to update widget', err);
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    const remaining = widgets.filter((w) => w.id !== widgetId);
    setWidgets(remaining);
    const updatedLayout = (layouts.lg || []).filter((l: any) => l.i !== widgetId);
    setLayouts({ lg: updatedLayout });

    const updatedConfig: DashboardConfig = {
      ...dashboard,
      widgets: remaining,
      layout: updatedLayout,
    };
    await api.saveDashboard(dataset.session_id, updatedConfig);
    onDashboardUpdated(updatedConfig);
  };

  const handleAddNewWidget = () => {
    const newId = `custom-widget-${Date.now()}`;
    const firstNum = dataset.columns.find((c) => c.dtype.includes('int') || c.dtype.includes('float'))?.name;
    const firstCat = dataset.columns.find((c) => !c.dtype.includes('int') && !c.dtype.includes('float'))?.name;

    const blankWidget: WidgetConfig = {
      id: newId,
      title: 'New Custom Visualization',
      type: 'bar',
      category_column: firstCat,
      value_column: firstNum,
      x_column: firstCat,
      y_column: firstNum,
      aggregation: 'sum',
      color: '#3b82f6',
      top_n: 8,
      sort_order: 'desc',
    };

    setEditingWidget(blankWidget);
    setIsEditorOpen(true);
  };

  const handleLayoutChange = (currentLayout: any, allLayouts?: any) => {
    if (allLayouts && allLayouts.lg) {
      setLayouts(allLayouts);
    } else {
      setLayouts({ lg: currentLayout });
    }
  };

  const handleSaveDashboardLayout = async () => {
    setSaveStatus('Saving layout configuration...');
    try {
      const updatedConfig: DashboardConfig = {
        ...dashboard,
        widgets,
        layout: layouts.lg || dashboard.layout,
      };
      await api.saveDashboard(dataset.session_id, updatedConfig);
      onDashboardUpdated(updatedConfig);
      setSaveStatus('Dashboard layout saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('Failed to save dashboard.');
    }
  };

  const handleRegenerateFromPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regeneratePrompt.trim()) return;
    setIsRegenerating(true);
    try {
      const regenerated = await api.generateDashboard(dataset.session_id, regeneratePrompt);
      onDashboardUpdated(regenerated);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto py-5 px-4 space-y-5 animate-in fade-in duration-300">
      {/* Top Controls Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-lg shadow-black/20">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <LayoutDashboard className="h-4 w-4 text-blue-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">{dashboard.title}</h2>
          </div>
          <p className="text-xs text-slate-400">
            Interactive, resizable drag-and-drop dashboard powered by Python analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleAddNewWidget}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-blue-400" />
            <span>Add Visualization</span>
          </button>

          <button
            onClick={handleSaveDashboardLayout}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Layout</span>
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-300 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Slicers & Global Filters Bar */}
      {dashboard.slicers && dashboard.slicers.length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 pr-2 border-r border-slate-800">
            <Filter className="h-3.5 w-3.5 text-blue-400" />
            <span>Active Slicers:</span>
          </div>

          {dashboard.slicers.map((slicer) => {
            const currentSelected = activeFilters[slicer.column] || [];
            return (
              <div key={slicer.column} className="flex items-center space-x-2 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 font-medium">{slicer.column}:</span>
                {slicer.type === 'categorical' && slicer.options ? (
                  <select
                    value={currentSelected[0] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleFilterChange(slicer.column, val ? [val] : []);
                    }}
                    className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">All {slicer.column}</option>
                    {slicer.options.map((opt) => (
                      <option key={String(opt)} value={String(opt)} className="bg-slate-900 text-white">
                        {String(opt)}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            );
          })}

          {Object.keys(activeFilters).length > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center space-x-1 ml-auto cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      )}

      {/* Natural Language Prompt Refinement Bar */}
      <form onSubmit={handleRegenerateFromPrompt} className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-3 flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-indigo-400 shrink-0 ml-2" />
        <input
          type="text"
          value={regeneratePrompt}
          onChange={(e) => setRegeneratePrompt(e.target.value)}
          placeholder="Refine dashboard with natural language: e.g. 'Show monthly trends, top 5 categories, and average profit'..."
          className="bg-transparent flex-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none px-2"
        />
        <button
          type="submit"
          disabled={isRegenerating || !regeneratePrompt.trim()}
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          {isRegenerating ? 'Generating...' : 'Regenerate'}
        </button>
      </form>

      {/* Main Grid Workspace */}
      <div className="w-full">
        <Grid
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          isDraggable={true}
          isResizable={true}
          draggableHandle=".drag-handle"
          onLayoutChange={handleLayoutChange}
        >
          {widgets.map((w) => (
            <div key={w.id} className="relative">
              <WidgetCard
                widget={w}
                onEdit={(target) => {
                  setEditingWidget(target);
                  setIsEditorOpen(true);
                }}
                onDelete={handleDeleteWidget}
                onRefresh={async (target) => {
                  const refreshed = await api.queryWidget(dataset.session_id, target, activeFilters);
                  setWidgets((prev) =>
                    prev.map((item) => (item.id === target.id ? { ...item, data: refreshed } : item))
                  );
                }}
              />
            </div>
          ))}
        </Grid>
      </div>

      {/* Edit Component Modal */}
      {editingWidget && (
        <WidgetEditorModal
          widget={editingWidget}
          columns={dataset.columns}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingWidget(null);
          }}
          onSave={handleSaveWidget}
        />
      )}
    </div>
  );
};
