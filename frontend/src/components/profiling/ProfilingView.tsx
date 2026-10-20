import React, { useState, useEffect } from 'react';
import {
  Activity,
  BarChart,
  Grid,
  TrendingUp,
  Percent,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ResponsiveContainer, BarChart as RechartsBar, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { PreviewData, ProfileData } from '../../types';
import { api } from '../../services/api';

interface ProfilingViewProps {
  dataset: PreviewData;
  onProceedToDashboard: () => void;
}

export const ProfilingView: React.FC<ProfilingViewProps> = ({
  dataset,
  onProceedToDashboard,
}) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [dataset.session_id]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getProfile(dataset.session_id);
      setProfile(data);
      if (data.numeric_columns.length > 0) {
        setSelectedColumn(data.numeric_columns[0]);
      } else if (data.columns.length > 0) {
        setSelectedColumn(data.columns[0].name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Computing full exploratory data analysis (EDA)...</p>
        </div>
      </div>
    );
  }

  const activeColProfile = profile.columns.find((c) => c.name === selectedColumn);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 mb-1">
            <Activity className="h-4 w-4" />
            <span>Automated Exploratory Data Analysis</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Data Profiling & Statistical Insights</h2>
          <p className="text-xs text-slate-400 mt-1">
            Deep-dive into distributions, statistical parameters, categorical breakdowns, and correlation matrix.
          </p>
        </div>

        <button
          onClick={onProceedToDashboard}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition cursor-pointer self-start sm:self-auto"
        >
          <span>Open Interactive Dashboard</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Numerical Stats Table */}
      {profile.numeric_columns.length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            <span>Descriptive Statistics (Numeric Features)</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Column</th>
                  <th className="py-2.5 px-3">Mean</th>
                  <th className="py-2.5 px-3">Median</th>
                  <th className="py-2.5 px-3">Std Dev</th>
                  <th className="py-2.5 px-3">Min</th>
                  <th className="py-2.5 px-3">Max</th>
                  <th className="py-2.5 px-3">Outliers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
                {profile.columns
                  .filter((c) => c.general_type === 'numeric' && c.numeric_stats)
                  .map((col) => {
                    const st = col.numeric_stats!;
                    return (
                      <tr
                        key={col.name}
                        onClick={() => setSelectedColumn(col.name)}
                        className={`hover:bg-slate-800/40 transition cursor-pointer ${
                          selectedColumn === col.name ? 'bg-blue-600/10 text-blue-400 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-sans font-semibold text-white">{col.name}</td>
                        <td className="py-2 px-3">{st.mean?.toLocaleString()}</td>
                        <td className="py-2 px-3">{st.median?.toLocaleString()}</td>
                        <td className="py-2 px-3">{st.std?.toLocaleString()}</td>
                        <td className="py-2 px-3">{st.min?.toLocaleString()}</td>
                        <td className="py-2 px-3">{st.max?.toLocaleString()}</td>
                        <td className="py-2 px-3">
                          {col.outlier_count > 0 ? (
                            <span className="text-amber-400 font-bold">{col.outlier_count}</span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Feature Distribution Visualizer */}
      {activeColProfile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Histogram or Top Categories */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <BarChart className="h-4 w-4 text-emerald-400" />
                <span>Feature Distribution: {activeColProfile.name}</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {activeColProfile.general_type}
              </span>
            </div>

            {activeColProfile.numeric_stats?.histogram ? (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBar data={activeColProfile.numeric_stats.histogram}>
                    <XAxis dataKey="bin" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </RechartsBar>
                </ResponsiveContainer>
              </div>
            ) : activeColProfile.top_categories ? (
              <div className="space-y-2.5 pt-2">
                {activeColProfile.top_categories.map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium truncate max-w-[200px]">{cat.category}</span>
                      <span className="text-slate-400 font-mono">
                        {cat.count} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-10 text-center">No distribution graph for this data type.</p>
            )}
          </div>

          {/* Correlation Matrix */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Grid className="h-4 w-4 text-amber-400" />
              <span>Feature Correlation Heatmap</span>
            </h3>

            {profile.correlations && Object.keys(profile.correlations).length > 1 ? (
              <div className="overflow-x-auto pt-1">
                <table className="text-[10px] font-mono border-collapse">
                  <thead>
                    <tr>
                      <th className="p-1.5 text-left text-slate-500"></th>
                      {Object.keys(profile.correlations).map((c) => (
                        <th key={c} className="p-1.5 text-slate-400 max-w-[70px] truncate" title={c}>
                          {c.slice(0, 8)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(profile.correlations).map(([rowKey, cols]) => (
                      <tr key={rowKey}>
                        <td className="p-1.5 font-sans font-semibold text-slate-300 max-w-[70px] truncate" title={rowKey}>
                          {rowKey.slice(0, 8)}
                        </td>
                        {Object.entries(cols).map(([colKey, val]) => {
                          const absVal = Math.abs(val);
                          const isPositive = val >= 0;
                          const bgIntensity = Math.floor(absVal * 90);
                          const bgStyle = isPositive
                            ? `rgba(59, 130, 246, ${absVal * 0.7 + 0.1})`
                            : `rgba(239, 68, 68, ${absVal * 0.7 + 0.1})`;

                          return (
                            <td
                              key={colKey}
                              style={{ backgroundColor: bgStyle }}
                              className="p-1.5 text-center text-white font-bold rounded m-0.5"
                            >
                              {val.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-10 text-center">
                Need at least 2 numeric columns to compute correlations.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
