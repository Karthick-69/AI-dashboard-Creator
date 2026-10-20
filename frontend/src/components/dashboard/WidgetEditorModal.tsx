import React, { useState } from 'react';
import {
  X,
  Settings2,
  Check,
  Palette,
  BarChart2,
  Hash,
  Filter,
  DollarSign,
  Percent
} from 'lucide-react';
import { WidgetConfig, ColumnDetail } from '../../types';

interface WidgetEditorModalProps {
  widget: WidgetConfig;
  columns: ColumnDetail[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedWidget: WidgetConfig) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#6366f1'];

export const WidgetEditorModal: React.FC<WidgetEditorModalProps> = ({
  widget,
  columns,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<WidgetConfig>({ ...widget });

  if (!isOpen) return null;

  const numericColumns = columns.filter(
    (c) => c.dtype.includes('int') || c.dtype.includes('float')
  );
  const categoricalColumns = columns.filter(
    (c) => !c.dtype.includes('int') && !c.dtype.includes('float')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings2 className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Customize Component</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Component Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Subtitle / Description</label>
            <input
              type="text"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              placeholder="e.g. Total revenue across all regions"
            />
          </div>

          {/* Component Type */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Visualization Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="kpi">KPI Metric Card</option>
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart (Time Series / Trend)</option>
              <option value="area">Area Chart</option>
              <option value="donut">Donut Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="scatter">Scatter Plot</option>
              <option value="histogram">Histogram</option>
              <option value="table">Table Grid</option>
            </select>
          </div>

          {/* Configuration based on type */}
          {formData.type === 'kpi' ? (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Metric Column</label>
                <select
                  value={formData.value_column || ''}
                  onChange={(e) => setFormData({ ...formData, value_column: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">(Row Count / Volume)</option>
                  {numericColumns.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Aggregation</label>
                  <select
                    value={formData.aggregation || 'sum'}
                    onChange={(e) => setFormData({ ...formData, aggregation: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="sum">Sum</option>
                    <option value="avg">Average / Mean</option>
                    <option value="count">Count</option>
                    <option value="min">Minimum</option>
                    <option value="max">Maximum</option>
                    <option value="median">Median</option>
                    <option value="distinct_count">Distinct Count</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Format</label>
                  <select
                    value={formData.format || 'number'}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="number">Plain Number</option>
                    <option value="currency">Currency ($)</option>
                    <option value="percent">Percentage (%)</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              {/* Category / X Axis */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Dimension / X-Axis Column</label>
                <select
                  value={formData.category_column || formData.x_column || ''}
                  onChange={(e) => setFormData({ ...formData, category_column: e.target.value, x_column: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select column...</option>
                  {columns.map((c) => (
                    <option key={c.name} value={c.name}>{c.name} ({c.dtype})</option>
                  ))}
                </select>
              </div>

              {/* Value / Y Axis */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Metric / Y-Axis Column</label>
                <select
                  value={formData.value_column || formData.y_column || ''}
                  onChange={(e) => setFormData({ ...formData, value_column: e.target.value, y_column: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">(Row Count)</option>
                  {numericColumns.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Aggregation</label>
                  <select
                    value={formData.aggregation || 'sum'}
                    onChange={(e) => setFormData({ ...formData, aggregation: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="sum">Sum</option>
                    <option value="avg">Avg</option>
                    <option value="count">Count</option>
                    <option value="min">Min</option>
                    <option value="max">Max</option>
                    <option value="median">Median</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Top N Items</label>
                  <select
                    value={formData.top_n || 10}
                    onChange={(e) => setFormData({ ...formData, top_n: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="5">Top 5</option>
                    <option value="8">Top 8</option>
                    <option value="10">Top 10</option>
                    <option value="15">Top 15</option>
                    <option value="25">Top 25</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Sort Order</label>
                  <select
                    value={formData.sort_order || 'desc'}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="desc">Highest First</option>
                    <option value="asc">Lowest First</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Color Picker */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="font-semibold text-slate-300 flex items-center space-x-1.5">
              <Palette className="h-3.5 w-3.5 text-slate-400" />
              <span>Theme Accent Color</span>
            </label>
            <div className="flex items-center space-x-2 pt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c })}
                  style={{ backgroundColor: c }}
                  className={`h-6 w-6 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                    formData.color === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {formData.color === c && <Check className="h-3 w-3 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              Apply Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
