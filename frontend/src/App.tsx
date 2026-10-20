import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { UploadView } from './components/upload/UploadView';
import { DataPreviewView } from './components/preview/DataPreviewView';
import { DataCleaningView } from './components/cleaning/DataCleaningView';
import { ProfilingView } from './components/profiling/ProfilingView';
import { DashboardView } from './components/dashboard/DashboardView';
import { ExportView } from './components/exports/ExportView';
import { FloatingChatbot } from './components/chatbot/FloatingChatbot';
import { PreviewData, DashboardConfig, WidgetConfig, LayoutItem } from './types';
import { api } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [currentDataset, setCurrentDataset] = useState<PreviewData | null>(null);
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig | null>(null);
  const [aiStatus, setAiStatus] = useState<{ gemini_configured: boolean; model: string } | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Check backend health & AI status on mount
    api.checkHealth()
      .then((status) => setAiStatus(status))
      .catch((err) => console.warn('Backend not yet reachable:', err));
  }, []);

  const handleDatasetLoaded = async (preview: PreviewData, initialPrompt: string) => {
    setCurrentDataset(preview);
    setIsLoading(true);

    try {
      // Automatically generate initial dashboard using prompt
      const dashboard = await api.generateDashboard(
        preview.session_id,
        initialPrompt || '',
        darkMode ? 'dark' : 'light'
      );
      setDashboardConfig(dashboard);
      // Navigate to Dashboard
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Failed to generate initial dashboard', err);
      setActiveTab('preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddChartToDashboard = async (newChart: WidgetConfig) => {
    if (!currentDataset || !dashboardConfig) return;

    const updatedWidgets = [...dashboardConfig.widgets, newChart];
    const currentLayout = dashboardConfig.layout || [];
    const maxY = currentLayout.reduce((max, item) => Math.max(max, item.y + item.h), 0);

    const newLayoutItem: LayoutItem = {
      i: newChart.id,
      x: 0,
      y: maxY,
      w: newChart.type === 'kpi' ? 3 : 6,
      h: newChart.type === 'kpi' ? 2 : 5,
    };

    const updatedConfig: DashboardConfig = {
      ...dashboardConfig,
      widgets: updatedWidgets,
      layout: [...currentLayout, newLayoutItem],
    };

    setDashboardConfig(updatedConfig);
    await api.saveDashboard(currentDataset.session_id, updatedConfig);
    setActiveTab('dashboard');
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Navbar */}
      <Navbar
        currentDataset={currentDataset}
        onUploadClick={() => setActiveTab('upload')}
        aiStatus={aiStatus}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
      />

      {/* Main App Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasDataset={Boolean(currentDataset)}
        />

        {/* Dynamic Main Workspace */}
        <main className="flex-1 overflow-y-auto bg-slate-950/20 p-2 sm:p-6">
          {activeTab === 'upload' && (
            <UploadView
              onDatasetLoaded={handleDatasetLoaded}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          )}

          {activeTab === 'preview' && currentDataset && (
            <DataPreviewView
              dataset={currentDataset}
              onProceedToCleaning={() => setActiveTab('cleaning')}
            />
          )}

          {activeTab === 'cleaning' && currentDataset && (
            <DataCleaningView
              dataset={currentDataset}
              onProceedToDashboard={() => setActiveTab('dashboard')}
              onDatasetUpdated={(updated) => setCurrentDataset(updated)}
            />
          )}

          {activeTab === 'profiling' && currentDataset && (
            <ProfilingView
              dataset={currentDataset}
              onProceedToDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'dashboard' && currentDataset && dashboardConfig && (
            <DashboardView
              dataset={currentDataset}
              dashboard={dashboardConfig}
              onDashboardUpdated={setDashboardConfig}
              onOpenChat={() => setIsChatOpen(true)}
            />
          )}

          {activeTab === 'export' && currentDataset && (
            <ExportView dataset={currentDataset} />
          )}
        </main>
      </div>

      {/* Floating AI Chatbot in Bottom Right Corner */}
      <FloatingChatbot
        dataset={currentDataset}
        onAddChartToDashboard={handleAddChartToDashboard}
        isOpen={isChatOpen}
        onToggleOpen={() => setIsChatOpen(!isChatOpen)}
      />
    </div>
  );
}

export default App;
