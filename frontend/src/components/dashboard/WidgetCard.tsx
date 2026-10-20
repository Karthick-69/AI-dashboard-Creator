import React from 'react';
import {
  GripHorizontal,
  Settings2,
  Trash2,
  TrendingUp,
  Hash,
  DollarSign,
  Percent,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { WidgetConfig } from '../../types';

interface WidgetCardProps {
  widget: WidgetConfig;
  onEdit: (widget: WidgetConfig) => void;
  onDelete: (id: string) => void;
  onRefresh?: (widget: WidgetConfig) => void;
}

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#6366f1'];

export const WidgetCard: React.FC<WidgetCardProps> = ({
  widget,
  onEdit,
  onDelete,
  onRefresh,
}) => {
  const formatKpiValue = (val: any, fmt?: string) => {
    if (val === undefined || val === null) return '-';
    if (typeof val === 'number') {
      if (fmt === 'currency') return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (fmt === 'percent') return `${val.toFixed(1)}%`;
      return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return String(val);
  };

  const renderContent = () => {
    const data = widget.data;

    // 1. KPI Widget
    if (widget.type === 'kpi') {
      return (
        <div className="flex flex-col justify-between h-full py-1">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {widget.aggregation ? `${widget.aggregation.toUpperCase()} • ` : ''}
              {widget.value_column || 'VOLUME'}
            </span>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {formatKpiValue(data, widget.format)}
            </div>
          </div>
          {widget.description && (
            <p className="text-[11px] text-slate-400 truncate mt-2">{widget.description}</p>
          )}
        </div>
      );
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return (
        <div className="flex items-center justify-center h-full text-xs text-slate-500 italic">
          No data records available for current filters.
        </div>
      );
    }

    // 2. Bar Chart
    if (widget.type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis
              dataKey="category"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              angle={-25}
              textAnchor="end"
              interval={0}
            />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
            />
            <Bar dataKey="value" fill={widget.color || '#3b82f6'} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // 3. Line Chart
    if (widget.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis
              dataKey="category"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              angle={-25}
              textAnchor="end"
              interval="preserveStartEnd"
            />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={widget.color || '#3b82f6'}
              strokeWidth={2.5}
              dot={{ r: 3, fill: widget.color || '#3b82f6' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // 4. Area Chart
    if (widget.type === 'area') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
            <defs>
              <linearGradient id={`color-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={widget.color || '#3b82f6'} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={widget.color || '#3b82f6'} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis dataKey="category" stroke="#64748b" fontSize={10} tickLine={false} angle={-25} textAnchor="end" />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
            <Area type="monotone" dataKey="value" stroke={widget.color || '#3b82f6'} fillOpacity={1} fill={`url(#color-${widget.id})`} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // 5. Pie / Donut Chart
    if (widget.type === 'pie' || widget.type === 'donut') {
      const isDonut = widget.type === 'donut';
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={isDonut ? 40 : 0}
              outerRadius={65}
              paddingAngle={isDonut ? 3 : 1}
            >
              {data.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    // 6. Scatter Plot
    if (widget.type === 'scatter') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 15, left: -15, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis dataKey="x" stroke="#64748b" fontSize={10} name={widget.x_column} tickLine={false} />
            <YAxis dataKey="y" stroke="#64748b" fontSize={10} name={widget.y_column} tickLine={false} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
            />
            <Scatter name={widget.title} data={data} fill={widget.color || '#f59e0b'} />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    // 7. Table Widget
    if (widget.type === 'table') {
      const rows = Array.isArray(data) ? data.slice(0, 8) : [];
      if (rows.length === 0) return null;
      const headers = Object.keys(rows[0]).slice(0, 5);

      return (
        <div className="overflow-x-auto h-full text-[11px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px] font-semibold">
                {headers.map((h) => (
                  <th key={h} className="py-1 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-800/40">
                  {headers.map((h) => (
                    <td key={h} className="py-1 px-2 whitespace-nowrap">{String(r[h])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-full w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg shadow-black/20 hover:border-slate-700/80 transition-all group overflow-hidden">
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-2 mb-1 border-b border-slate-800/60 shrink-0">
        <div className="flex items-center space-x-2 truncate">
          <div className="drag-handle cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-300 transition">
            <GripHorizontal className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-semibold text-white truncate" title={widget.title}>
            {widget.title}
          </h4>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onRefresh && (
            <button
              onClick={() => onRefresh(widget)}
              title="Refresh Data"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => onEdit(widget)}
            title="Edit Component"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition cursor-pointer"
          >
            <Settings2 className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDelete(widget.id)}
            title="Remove Component"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition cursor-pointer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Widget Content Area */}
      <div className="flex-1 w-full min-h-[140px] pt-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
};
