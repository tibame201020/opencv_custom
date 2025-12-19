import { useState, useEffect } from 'react'
import { OpenScriptTab, Script } from '../types'
import { scriptService } from '../services/mockService'
import ScriptListDrawer from './ScriptListDrawer'
import ScriptDetailTabs from './ScriptDetailTabs'

const ExecutionTab = () => {
  const [scripts, setScripts] = useState<Script[]>([])
  const [openTabs, setOpenTabs] = useState<OpenScriptTab[]>([])
  const [activeScriptId, setActiveScriptId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(true)

  useEffect(() => {
    loadScripts()
  }, [])

  const loadScripts = async () => {
    const data = await scriptService.getAllScripts()
    setScripts(data)
  }

  const handleScriptDoubleClick = (script: Script) => {
    // 檢查是否已經打開
    const existingTab = openTabs.find((tab) => tab.scriptId === script.id)
    if (existingTab) {
      setActiveScriptId(script.id)
      return
    }

    // 新增 Tab
    const newTab: OpenScriptTab = {
      scriptId: script.id,
      scriptName: script.name,
      isRunning: false
    }
    setOpenTabs([...openTabs, newTab])
    setActiveScriptId(script.id)
  }

  const handleCloseTab = (scriptId: string) => {
    setOpenTabs(openTabs.filter((tab) => tab.scriptId !== scriptId))
    if (activeScriptId === scriptId) {
      const remainingTabs = openTabs.filter((tab) => tab.scriptId !== scriptId)
      setActiveScriptId(remainingTabs.length > 0 ? remainingTabs[0].scriptId : null)
    }
  }

  const handleScriptStatusChange = (scriptId: string, isRunning: boolean) => {
    setOpenTabs(
      openTabs.map((tab) =>
        tab.scriptId === scriptId ? { ...tab, isRunning } : tab
      )
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Script List Drawer */}
      <ScriptListDrawer
        scripts={scripts}
        onScriptDoubleClick={handleScriptDoubleClick}
        isOpen={drawerOpen}
        onToggle={() => setDrawerOpen(!drawerOpen)}
      />

      {/* Script Detail Area */}
      <div className="flex-1 overflow-hidden">
        <ScriptDetailTabs
          openTabs={openTabs}
          activeScriptId={activeScriptId}
          onTabChange={setActiveScriptId}
          onCloseTab={handleCloseTab}
          onScriptStatusChange={handleScriptStatusChange}
        />
      </div>
    </div>
  )
}

export default ExecutionTab

