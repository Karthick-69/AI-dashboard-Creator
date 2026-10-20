import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  PlusCircle,
  Trash2,
  Minimize2,
  Maximize2,
  ChevronDown
} from 'lucide-react';
import { PreviewData, ChatMessage, WidgetConfig } from '../../types';
import { api } from '../../services/api';
import { WidgetCard } from '../dashboard/WidgetCard';

interface FloatingChatbotProps {
  dataset: PreviewData | null;
  onAddChartToDashboard: (chart: WidgetConfig) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const FloatingChatbot: React.FC<FloatingChatbotProps> = ({
  dataset,
  onAddChartToDashboard,
  isOpen,
  onToggleOpen,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = React.useMemo(() => {
    if (!dataset || !dataset.columns || dataset.columns.length === 0) {
      return [
        'Summarize this dataset',
        'What are the errors and outliers?',
        'Compare top categories',
      ];
    }
    const colNames = dataset.columns.map((c) => c.name.toLowerCase());
    const isStudent = colNames.some((c) => c.includes('student')) || (dataset.filename || '').toLowerCase().includes('student');
    if (isStudent) {
      return [
        'Who is the 120th student in this dataset?',
        'How many students are in CSE?',
        'What are the data errors and outliers?',
        'Compare students by Department',
      ];
    }
    const hasCategory = dataset.columns.find((c) => !c.dtype.includes('int') && !c.dtype.includes('float') && c.unique_count <= 30);
    const hasNumeric = dataset.columns.find((c) => c.dtype.includes('int') || c.dtype.includes('float') || c.name.toLowerCase().includes('age') || c.name.toLowerCase().includes('score'));
    const qList = ['Summarize this dataset', 'What are the data errors and outliers?'];
    if (hasCategory) {
      qList.push(`Compare breakdown by ${hasCategory.name}`);
    }
    if (hasNumeric) {
      qList.push(`What is the average ${hasNumeric.name}?`);
    }
    return qList;
  }, [dataset]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !dataset) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await api.sendChatMessage(dataset.session_id, text, {});
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        chart: response.chart,
        suggested_followups: response.suggested_followups,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message || 'Could not process question.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = async () => {
    if (dataset) {
      await api.clearChat(dataset.session_id);
    }
    setMessages([]);
  };

  return (
    <>
      {/* Floating Action Button in Bottom Right Corner */}
      {!isOpen && (
        <button
          onClick={onToggleOpen}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-2xl shadow-blue-500/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer border border-blue-400/30 group"
          title="Ask AI about Data"
        >
          <Sparkles className="h-6 w-6 text-white group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
        </button>
      )}

      {/* Slide-over / Floating Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full sm:w-[440px] h-[600px] max-h-[85vh] bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-6 duration-200">
          {/* Chat Header */}
          <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span>Data AI Copilot</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </h3>
                <p className="text-[10px] text-slate-400">
                  {dataset ? dataset.filename : 'Ready to analyze'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  title="Clear Chat"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={onToggleOpen}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.length === 0 ? (
              <div className="py-8 text-center space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-white">Ask Anything About Your Data</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                    I calculate real metrics using Python. Ask for trends, top performers, or comparisons!
                  </p>
                </div>

                {/* 1-click suggested questions */}
                <div className="space-y-1.5 pt-2">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Suggested Questions</p>
                  <div className="flex flex-col space-y-1.5 max-w-xs mx-auto">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(q)}
                        className="text-left text-[11px] px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start space-x-2.5 ${
                    m.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${
                      m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-blue-400'
                    }`}
                  >
                    {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>

                  <div className="space-y-2 max-w-[85%]">
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none whitespace-pre-wrap'
                      }`}
                    >
                      {m.content}
                    </div>

                    {/* Chart rendered right inside chat */}
                    {m.chart && (
                      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-2">
                        <div className="h-44 w-full">
                          <WidgetCard
                            widget={m.chart}
                            onEdit={() => {}}
                            onDelete={() => {}}
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (m.chart) onAddChartToDashboard(m.chart);
                          }}
                          className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm shadow-blue-500/20"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          <span>Add to Dashboard Workspace</span>
                        </button>
                      </div>
                    )}

                    {/* Followup suggestion pills */}
                    {m.suggested_followups && m.suggested_followups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {m.suggested_followups.map((f, fi) => (
                          <button
                            key={fi}
                            onClick={() => handleSend(f)}
                            className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition cursor-pointer"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    )}

                    <span className="text-[9px] text-slate-500 px-1 block">
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              ))
            )}

            {isTyping && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs">
                <Bot className="h-4 w-4 text-blue-400 animate-pulse" />
                <span className="text-[11px] italic">Analyzing data points...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/90 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-1.5 focus-within:border-blue-500 transition"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={dataset ? "Ask a question about the data..." : "Upload data first"}
                disabled={!dataset || isTyping}
                className="bg-transparent flex-1 text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || !dataset || isTyping}
                className="p-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
