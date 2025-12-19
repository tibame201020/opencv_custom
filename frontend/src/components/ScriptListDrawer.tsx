import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Script, Platform } from '../types'
import { MdFilterList, MdChevronLeft, MdChevronRight, MdSearch } from 'react-icons/md'
import { SiRobotframework, SiAndroid } from 'react-icons/si'

interface ScriptListDrawerProps {
  scripts: Script[]
  onScriptDoubleClick: (script: Script) => void
  isOpen: boolean
  onToggle: () => void
}

const ScriptListDrawer = ({
  scripts,
  onScriptDoubleClick,
  isOpen,
  onToggle
}: ScriptListDrawerProps) => {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all')

  const filteredScripts = scripts.filter((script) => {
    const matchesSearch = script.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlatform = platformFilter === 'all' || script.platform === platformFilter
    return matchesSearch && matchesPlatform
  })

  const groupedScripts = filteredScripts.reduce((acc, script) => {
    if (!acc[script.platform]) {
      acc[script.platform] = []
    }
    acc[script.platform].push(script)
    return acc
  }, {} as Record<Platform, Script[]>)

  const getPlatformIcon = (platform: Platform) => {
    return platform === 'robot' ? <SiRobotframework /> : <SiAndroid />
  }

  return (
    <div
      className={`
        transition-all duration-300 border-r border-base-300 bg-base-100
        ${isOpen ? 'w-80' : 'w-0'}
      `}
    >
      {isOpen && (
        <div className="flex flex-col h-full p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MdFilterList />
              {t('ui.scriptList.title')}
            </h2>
            <button
              className="btn btn-sm btn-ghost btn-circle"
              onClick={onToggle}
            >
              <MdChevronLeft />
            </button>
          </div>

          {/* Search */}
          <div className="form-control mb-4">
            <div className="input-group">
              <span className="bg-base-200">
                <MdSearch />
              </span>
              <input
                type="text"
                placeholder={t('ui.execution.search')}
                className="input input-bordered w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Platform Filter */}
          <div className="flex gap-2 mb-4">
            <button
              className={`btn btn-sm flex-1 ${platformFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPlatformFilter('all')}
            >
              {t('ui.scriptList.filter.all')}
            </button>
            <button
              className={`btn btn-sm flex-1 ${platformFilter === 'robot' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPlatformFilter('robot')}
            >
              <SiRobotframework />
              {t('ui.scriptList.filter.robot')}
            </button>
            <button
              className={`btn btn-sm flex-1 ${platformFilter === 'adb' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPlatformFilter('adb')}
            >
              <SiAndroid />
              {t('ui.scriptList.filter.adb')}
            </button>
          </div>

          {/* Script List */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {Object.entries(groupedScripts).map(([platform, platformScripts]) => (
              <div key={platform}>
                <h3 className="text-sm font-semibold text-base-content/70 mb-2 flex items-center gap-2">
                  {getPlatformIcon(platform as Platform)}
                  {t(`ui.scriptList.platform.${platform}`)}
                </h3>
                <div className="space-y-2">
                  {platformScripts.map((script) => (
                    <div
                      key={script.id}
                      className="card bg-base-200 hover:bg-base-300 cursor-pointer transition-colors"
                      onDoubleClick={() => onScriptDoubleClick(script)}
                    >
                      <div className="card-body p-3">
                        <h4 className="card-title text-sm">{script.name}</h4>
                        {script.description && (
                          <p className="text-xs text-base-content/70">
                            {script.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredScripts.length === 0 && (
              <div className="text-center text-base-content/50 py-8">
                {t('ui.execution.noScripts')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toggle Button (when closed) */}
      {!isOpen && (
        <button
          className="btn btn-sm btn-ghost btn-circle m-2"
          onClick={onToggle}
        >
          <MdChevronRight />
        </button>
      )}
    </div>
  )
}

export default ScriptListDrawer

