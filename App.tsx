import React, { useState } from 'react';
import { AppMode } from './types';
import { ChatMode } from './components/ChatMode';
import { VisionMode } from './components/VisionMode';
import { LiveMode } from './components/LiveMode';
import { BuilderMode } from './components/BuilderMode';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.CHAT);

  const renderContent = () => {
    switch (activeMode) {
      case AppMode.CHAT:
        return <ChatMode />;
      case AppMode.VISION:
        return <VisionMode />;
      case AppMode.LIVE:
        return <LiveMode />;
      case AppMode.BUILDER:
        return <BuilderMode />;
      default:
        return <ChatMode />;
    }
  };

  const NavItem = ({ mode, label, icon }: { mode: AppMode; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveMode(mode)}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group ${
        activeMode === mode 
          ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' 
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
      }`}
    >
      <span className={`${activeMode === mode ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen w-full bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Nexus
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem 
            mode={AppMode.CHAT} 
            label="Chat" 
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            } 
          />
          <NavItem 
            mode={AppMode.VISION} 
            label="Vision" 
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            } 
          />
          <NavItem 
            mode={AppMode.LIVE} 
            label="Live" 
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            } 
          />
          <NavItem 
            mode={AppMode.BUILDER} 
            label="Builder" 
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            } 
          />
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-500 text-center">
            Powered by Gemini 2.5 Flash
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 h-full overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-gray-950">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white capitalize">{activeMode.toLowerCase()} Lab</h2>
            <p className="text-gray-400 text-sm">
              {activeMode === AppMode.CHAT && "Interactive text generation and reasoning."}
              {activeMode === AppMode.VISION && "Multimodal image analysis and understanding."}
              {activeMode === AppMode.LIVE && "Low-latency real-time voice interaction."}
              {activeMode === AppMode.BUILDER && "Generate full web projects from prompts."}
            </p>
          </div>
        </header>
        <div className="h-[calc(100%-80px)]">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;