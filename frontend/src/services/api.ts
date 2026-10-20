import {
  PreviewData,
  ProfileData,
  DetectedIssue,
  CleaningRule,
  CleaningResult,
  DashboardConfig,
  WidgetConfig,
  ChatMessage
} from '../types';

const API_BASE = '/api';

export const api = {
  // Check health and AI status
  async checkHealth(): Promise<{ status: string; gemini_configured: boolean; model: string }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('API server is unreachable.');
    return res.json();
  },

  // Upload file
  async uploadFile(file: File, sheetName?: string): Promise<PreviewData> {
    const formData = new FormData();
    formData.append('file', file);
    if (sheetName) formData.append('sheet_name', sheetName);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to upload dataset.' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  // Load sample dataset
  async loadSample(sampleName: string): Promise<PreviewData> {
    const res = await fetch(`${API_BASE}/sample/${sampleName}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to load sample dataset.' }));
      throw new Error(err.detail || 'Sample load failed');
    }
    return res.json();
  },

  // Get preview
  async getPreview(sessionId: string): Promise<PreviewData> {
    const res = await fetch(`${API_BASE}/datasets/${sessionId}/preview`);
    if (!res.ok) throw new Error('Failed to retrieve preview.');
    return res.json();
  },

  // Get profiling report
  async getProfile(sessionId: string): Promise<ProfileData> {
    const res = await fetch(`${API_BASE}/datasets/${sessionId}/profile`);
    if (!res.ok) throw new Error('Failed to retrieve profile.');
    return res.json();
  },

  // Detect cleaning issues
  async detectIssues(sessionId: string): Promise<DetectedIssue[]> {
    const res = await fetch(`${API_BASE}/datasets/${sessionId}/cleaning/detect`);
    if (!res.ok) throw new Error('Failed to detect issues.');
    return res.json();
  },

  // Apply cleaning rules
  async applyCleaning(sessionId: string, rules: CleaningRule[]): Promise<CleaningResult> {
    const res = await fetch(`${API_BASE}/datasets/${sessionId}/cleaning/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    });
    if (!res.ok) throw new Error('Failed to apply cleaning operations.');
    return res.json();
  },

  // Reset cleaning
  async resetCleaning(sessionId: string): Promise<CleaningResult> {
    const res = await fetch(`${API_BASE}/datasets/${sessionId}/cleaning/reset`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to reset dataset.');
    return res.json();
  },

  // Generate dashboard
  async generateDashboard(sessionId: string, prompt: string, theme: string = 'dark'): Promise<DashboardConfig> {
    const res = await fetch(`${API_BASE}/datasets/${sessionId}/dashboard/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, theme }),
    });
    if (!res.ok) throw new Error('Failed to generate dashboard.');
    return res.json();
  },

  // Get dashboard
  async getDashboard(sessionId: string): Promise<DashboardConfig> {
    const res = await fetch(`${API_BASE}/datasets/${sessionId}/dashboard`);
    if (!res.ok) throw new Error('Failed to load dashboard.');
    return res.json();
  },

  // Save dashboard
  async saveDashboard(sessionId: string, config: DashboardConfig): Promise<DashboardConfig> {
    const res = await fetch(`${API_BASE}/datasets/${sessionId}/dashboard`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Failed to save dashboard.');
    return res.json();
  },

  // Query single widget with filters
  async queryWidget(sessionId: string, widget: WidgetConfig, activeFilters: Record<string, any>): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${sessionId}/dashboard/query-widget`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widget, active_filters: activeFilters }),
    });
    if (!res.ok) throw new Error('Failed to query widget data.');
    const data = await res.json();
    return data.data;
  },

  // Chat message
  async sendChatMessage(sessionId: string, message: string, activeFilters: Record<string, any>): Promise<{
    reply: string;
    chart?: WidgetConfig;
    suggested_followups?: string[];
  }> {
    const res = await fetch(`${API_BASE}/datasets/${sessionId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, active_filters: activeFilters }),
    });
    if (!res.ok) throw new Error('Failed to communicate with AI chat.');
    return res.json();
  },

  // Clear chat
  async clearChat(sessionId: string): Promise<void> {
    await fetch(`${API_BASE}/datasets/${sessionId}/chat/clear`, { method: 'POST' });
  },

  // Download export URLs
  getPdfExportUrl(sessionId: string): string {
    return `${API_BASE}/datasets/${sessionId}/export/pdf`;
  },
  getExcelExportUrl(sessionId: string): string {
    return `${API_BASE}/datasets/${sessionId}/export/excel`;
  },
  getCsvExportUrl(sessionId: string): string {
    return `${API_BASE}/datasets/${sessionId}/export/csv`;
  },
  getConfigExportUrl(sessionId: string): string {
    return `${API_BASE}/datasets/${sessionId}/export/config`;
  },
};
