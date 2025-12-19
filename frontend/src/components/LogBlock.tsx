import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MdSearch, MdClear } from 'react-icons/md'
import { LogEntry } from '../types'
import { generateMockLogs } from '../services/mockService'

interface LogBlockProps {
  scriptId: string
  scriptName: string
  isRunning: boolean
}

const LogBlock = ({ scriptId, scriptName, isRunning }: LogBlockProps) => {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 載入初始日誌
    const initialLogs = generateMockLogs(scriptName)
    setLogs(initialLogs)
  }, [scriptId, scriptName])

  useEffect(() => {
    // 模擬即時日誌更新（當腳本運行時）
    if (!isRunning) return

    const interval = setInterval(() => {
      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date(),
        level: Math.random() > 0.8 ? 'warn' : 'info',
        message: `[${scriptName}] 執行中... 處理項目 #${Math.floor(Math.random() * 100)}`
      }
      setLogs((prevLogs) => [...prevLogs, newLog])
      
      // 自動滾動到底部
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [isRunning, scriptName])

  const filteredLogs = logs.filter((log) =>
    log.message.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleClear = () => {
    setLogs([])
  }

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'text-info'
      case 'warn':
        return 'text-warning'
      case 'error':
        return 'text-error'
      default:
        return 'text-base-content'
    }
  }

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'badge-info'
      case 'warn':
        return 'badge-warning'
      case 'error':
        return 'badge-error'
      default:
        return 'badge-ghost'
    }
  }

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date)
  }

  return (
    <fieldset className="border border-base-300 rounded-lg p-6 flex flex-col flex-1 min-h-0">
        <legend className="text-lg font-semibold px-2">
          {t('ui.log.title')}
        </legend>

        {/* Log Controls */}
        <div className="flex gap-2 mb-4">
          <div className="form-control flex-1">
            <div className="input-group">
              <span className="bg-base-200">
                <MdSearch />
              </span>
              <input
                type="text"
                placeholder={t('ui.log.search')}
                className="input input-bordered w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={handleClear}
          >
            <MdClear />
            {t('ui.log.clear')}
          </button>
        </div>

        {/* Log Entries */}
        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto bg-base-200 rounded-lg p-4 font-mono text-sm space-y-2"
        >
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`flex gap-3 items-start ${getLevelColor(log.level)}`}
              >
                <span className="text-base-content/50 whitespace-nowrap">
                  {formatTimestamp(log.timestamp)}
                </span>
                <span className={`badge badge-sm ${getLevelBadge(log.level)}`}>
                  {log.level.toUpperCase()}
                </span>
                <span className="flex-1 break-words">{log.message}</span>
              </div>
            ))
          ) : (
            <div className="text-center text-base-content/50 py-8">
              {t('ui.log.noLogs')}
            </div>
          )}
        </div>
    </fieldset>
  )
}

export default LogBlock

