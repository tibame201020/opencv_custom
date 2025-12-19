import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MdSearch, MdClear } from 'react-icons/md'
import { LogEntry } from '../types'
import { webSocketService } from '../services/apiService'

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
    // 當腳本運行時，連線 WebSocket
    if (isRunning) {
      webSocketService.connect(scriptId, (logEntry: LogEntry) => {
        // 轉換時間戳記
        const entry: LogEntry = {
          ...logEntry,
          timestamp: new Date(logEntry.timestamp),
        }
        setLogs((prevLogs) => [...prevLogs, entry])
        
        // 自動滾動到底部
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
        }
      })
    } else {
      // 停止時斷開連線
      webSocketService.disconnect()
    }

    // 清理函數
    return () => {
      webSocketService.disconnect()
    }
  }, [isRunning, scriptId])

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
    <div className="flex flex-col flex-1 min-h-0 pt-2">
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
        className="flex-1 overflow-y-auto bg-base-200 rounded-lg p-4 font-mono text-sm space-y-2 min-h-[300px]"
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
    </div>
  )
}

export default LogBlock

