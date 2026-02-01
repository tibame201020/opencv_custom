import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from './store';
import { ExecutionView } from './views/ExecutionView';
import { SettingsView } from './views/SettingsView';
import { ManagementView } from './views/ManagementView';
import { Play, Settings as SettingsIcon, Database } from 'lucide-react';
import clsx from 'clsx';

function App() {
  const { theme, activeMainTab, setActiveMainTab } = useAppStore();
  const { t } = useTranslation();

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const navItems = [
    { id: 'execution', label: t('ui.execution.title'), icon: Play },
    { id: 'management', label: t('ui.management.title'), icon: Database },
    { id: 'setting', label: t('ui.setting.title'), icon: SettingsIcon },
  ] as const;

  return (
    <div className="flex flex-col h-screen w-full bg-base-100 text-base-content font-sans overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="navbar bg-base-200 min-h-12 h-12 border-b border-base-300 px-4 shadow-sm z-20">
        <div className="flex-1">
          <div className="flex items-center gap-2 font-bold text-lg text-primary mr-8">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-content flex items-center justify-center shadow-md">
              P
            </div>
            Platform
          </div>

          <div className="join">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveMainTab(item.id)}
                className={clsx(
                  "btn btn-sm join-item border-none font-normal",
                  activeMainTab === item.id ? "btn-active btn-primary" : "btn-ghost"
                )}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-none">
          {/* Right side status or user profile could go here */}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeMainTab === 'execution' && <ExecutionView />}
        {activeMainTab === 'management' && <ManagementView />}
        {activeMainTab === 'setting' && <SettingsView />}
      </div>
    </div>
  );
}

export default App;
