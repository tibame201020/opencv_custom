import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import ExecutionTab from './components/ExecutionTab'
import SettingTab from './components/SettingTab'

function App() {
  const { t } = useTranslation()
  const [activeMainTab, setActiveMainTab] = useState<'execution' | 'setting'>('execution')
  
  // 從 localStorage 載入主題
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  return (
    <div className="min-h-screen flex flex-col p-4">
      {/* Main Tabs */}
      <div className="tabs tabs-lifted">
        <input
          type="radio"
          name="main_tabs"
          className="tab"
          aria-label={t('ui.tabs.execution')}
          checked={activeMainTab === 'execution'}
          onChange={() => setActiveMainTab('execution')}
        />
        <div className="tab-content bg-base-100 border-base-300 flex-grow p-0">
          <ExecutionTab />
        </div>

        <input
          type="radio"
          name="main_tabs"
          className="tab"
          aria-label={t('ui.tabs.setting')}
          checked={activeMainTab === 'setting'}
          onChange={() => setActiveMainTab('setting')}
        />
        <div className="tab-content bg-base-100 border-base-300 flex-grow p-6">
          <SettingTab />
        </div>
      </div>
    </div>
  )
}

export default App

