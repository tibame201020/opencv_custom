import { useState, Fragment } from 'react'
import { OpenScriptTab } from '../types'
import ScriptDetail from './ScriptDetail'

interface ScriptDetailTabsProps {
  openTabs: OpenScriptTab[]
  activeScriptId: string | null
  onTabChange: (scriptId: string) => void
  onCloseTab: (scriptId: string) => void
  onScriptStatusChange: (scriptId: string, isRunning: boolean) => void
}

const ScriptDetailTabs = ({
  openTabs,
  activeScriptId,
  onTabChange,
  onCloseTab,
  onScriptStatusChange
}: ScriptDetailTabsProps) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    scriptId: string
  } | null>(null)

  if (openTabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-base-content/50">
        Double click a script to open
      </div>
    )
  }

  const handleContextMenu = (e: React.MouseEvent, scriptId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, scriptId })
  }

  const handleCloseTab = (scriptId: string) => {
    onCloseTab(scriptId)
    setContextMenu(null)
  }

  return (
    <div className="flex flex-col h-full p-2">
      <div className="tabs tabs-lifted tabs-sm">
        {openTabs.map((tab) => (
          <Fragment key={tab.scriptId}>
            {/* ===== TAB ===== */}
            <input
              type="radio"
              name="script_tabs"
              className="tab"
              aria-label={tab.scriptName}
              checked={activeScriptId === tab.scriptId}
              onChange={() => onTabChange(tab.scriptId)}
              onContextMenu={(e) => handleContextMenu(e, tab.scriptId)}
            />

            {/* ===== CONTENT ===== */}
            <div className="tab-content bg-base-100 border-base-300">
              <ScriptDetail
                scriptId={tab.scriptId}
                scriptName={tab.scriptName}
                isRunning={tab.isRunning}
                onStatusChange={(isRunning) =>
                  onScriptStatusChange(tab.scriptId, isRunning)
                }
              />
            </div>
          </Fragment>
        ))}
      </div>

      {/* ===== Context Menu ===== */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-base-100 border border-base-300 rounded-lg shadow-lg py-2 min-w-[120px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y
            }}
          >
            <button
              className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm"
              onClick={() => handleCloseTab(contextMenu.scriptId)}
            >
              關閉頁籤
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default ScriptDetailTabs
