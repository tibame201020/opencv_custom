import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from './store';
import { ExecutionView } from './views/ExecutionView';
import { SettingsView } from './views/SettingsView';
import { ManagementView } from './views/ManagementView';
import { EditorView } from './views/EditorView';
import { DebugView } from './views/DebugView';
import { Play, Settings as SettingsIcon, Database, ChevronLeft, ChevronRight, FileCode, Terminal } from 'lucide-react';
import clsx from 'clsx';

function App() {
  const { theme, activeMainTab, setActiveMainTab } = useAppStore();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Sync activeMainTab with route
  useEffect(() => {
    const path = location.pathname.split('/')[1];
    const validTabs = ['execution', 'editor', 'management', 'setting', 'debug'];
    if (path && validTabs.includes(path)) {
      setActiveMainTab(path as 'execution' | 'editor' | 'management' | 'setting');
    }
  }, [location, setActiveMainTab]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const navItems = [
    { id: 'execution', label: t('ui.execution.title'), icon: Play, path: '/execution' },
    { id: 'editor', label: t('ui.editor.title'), icon: FileCode, path: '/editor' },
    { id: 'management', label: t('ui.management.title'), icon: Database, path: '/management' },
    { id: 'setting', label: t('ui.setting.title'), icon: SettingsIcon, path: '/setting' },
    { id: 'debug', label: t('ui.debug.title'), icon: Terminal, path: '/debug' },
  ] as const;

  return (
    <div className="flex h-screen w-full bg-base-100 text-base-content overflow-hidden">
      {/* Left Sidebar Navigation */}
      <div
        className={clsx(
          "bg-base-200 border-r border-base-300 flex flex-col shrink-0 transition-all duration-300 relative",
          isSidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo Area */}
        <div className={clsx("h-16 flex items-center gap-3 border-b border-base-300 overflow-hidden", isSidebarCollapsed ? "justify-center px-0" : "px-6")}>
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-content flex items-center justify-center shadow-md shrink-0">
            <span className="font-bold text-lg">P</span>
          </div>
          <div className={clsx("font-bold text-lg tracking-tight truncate transition-opacity duration-200", isSidebarCollapsed ? "opacity-0 w-0" : "opacity-100 flex-1")}>
            {t('ui.common.appTitle')}
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden">
          {!isSidebarCollapsed && (
            <div className="text-xs font-bold text-base-content/40 uppercase tracking-widest px-3 mb-2 font-mono truncate">
              {t('ui.common.menu')}
            </div>
          )}
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                activeMainTab === item.id
                  ? "bg-base-100 text-primary shadow-sm" // Cleaner active state: Card-like bg instead of colored fill
                  : "text-base-content/60 hover:bg-base-300/50 hover:text-base-content",
                isSidebarCollapsed ? "justify-center" : ""
              )}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <item.icon
                size={20}
                className={clsx(
                  "shrink-0 transition-transform duration-200",
                  activeMainTab === item.id ? "scale-110" : "group-hover:scale-110"
                )}
              />
              <span className={clsx(
                "text-sm font-medium transition-all duration-200 whitespace-nowrap",
                isSidebarCollapsed ? "opacity-0 w-0 hidden" : "opacity-100 flex-1 text-left"
              )}>
                {item.label}
              </span>

              {/* Active Indicator Strip (Optional, maybe specific to theme) */}
              {activeMainTab === item.id && !isSidebarCollapsed && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Collapse Toggle (Bottom) - FULL WIDTH CLICKABLE */}
        <div className="border-t border-base-300">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full h-10 flex items-center justify-center opacity-50 hover:opacity-100 hover:bg-base-300/50 transition-all cursor-pointer"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Bottom Profile Section */}
        <div className={clsx("p-4 border-t border-base-300", isSidebarCollapsed ? "items-center" : "")}>
          <div className={clsx(
            "bg-base-100 rounded-lg p-3 flex items-center gap-3 shadow-sm border border-base-200 overflow-hidden",
            isSidebarCollapsed ? "justify-center p-2 w-10 h-10" : ""
          )}>
            <div className="w-6 h-6 rounded-full bg-neutral text-neutral-content flex items-center justify-center text-[10px] font-bold shrink-0">
              A
            </div>
            <div className={clsx("flex-1 min-w-0 transition-opacity duration-200", isSidebarCollapsed ? "hidden" : "block")}>
              <div className="text-xs font-bold truncate">Admin</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-base-100 relative">
        <div className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/execution" element={<ExecutionView />} />
            <Route path="/editor" element={<EditorView />} />
            <Route path="/management" element={<ManagementView />} />
            <Route path="/setting" element={<SettingsView />} />
            <Route path="/debug" element={<DebugView />} />
            <Route path="/" element={<Navigate to="/execution" replace />} />
          </Routes>

        </div>
      </div>
    </div>
  );
}

export default App;
