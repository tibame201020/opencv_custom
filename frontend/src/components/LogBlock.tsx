import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { MdSearch, MdClear, MdVerticalAlignBottom, MdSettings } from 'react-icons/md'
import { LogEntry } from '../types'
import { webSocketService } from '../services/apiService'

interface LogBlockProps {
  scriptId: string
  scriptName: string
  isRunning: boolean
  onStatusChange?: (isRunning: boolean) => void
}

const LogBlock = ({ scriptId, scriptName, isRunning, onStatusChange }: LogBlockProps) => {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isTailing, setIsTailing] = useState(true) // Tail mode: auto-scroll to bottom
  const logContainerRef = useRef<HTMLDivElement>(null)
  const isUserScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Scroll to bottom function
  const scrollToBottom = useCallback((smooth = false) => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({
        top: logContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      })
    }
  }, [])

  // Check if user is near bottom (within 50px)
  const isNearBottom = useCallback(() => {
    if (!logContainerRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current
    return scrollHeight - scrollTop - clientHeight < 50
  }, [])

  // Handle scroll event - detect user scrolling
  useEffect(() => {
    const container = logContainerRef.current
    if (!container) return

    const handleScroll = () => {
      // If user scrolls up, pause tailing
      if (!isNearBottom()) {
        isUserScrollingRef.current = true
        setIsTailing(false)
        
        // Clear existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        
        // Reset after 2 seconds of no scrolling
        scrollTimeoutRef.current = setTimeout(() => {
          isUserScrollingRef.current = false
        }, 2000)
      } else if (isNearBottom() && !isUserScrollingRef.current) {
        // User scrolled back to bottom, resume tailing
        setIsTailing(true)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [isNearBottom])

  useEffect(() => {
    // 當腳本運行時，連線 WebSocket
    if (isRunning) {
      // Reset tailing when script starts
      setIsTailing(true)
      isUserScrollingRef.current = false
      
      webSocketService.connect(scriptId, (logEntry: any) => {
        // 轉換時間戳記（從字符串轉換為 Date）
        const entry: LogEntry = {
          ...logEntry,
          timestamp: typeof logEntry.timestamp === 'string' 
            ? new Date(logEntry.timestamp) 
            : logEntry.timestamp instanceof Date 
              ? logEntry.timestamp 
              : new Date(),
        }
        
        // 處理狀態消息
        if (entry.type === 'status') {
          // 檢查是否為完成或失敗消息
          const message = entry.message.toLowerCase()
          if (message.includes('腳本執行完成') || message.includes('腳本已停止')) {
            // 腳本已完成或停止
            if (onStatusChange) {
              onStatusChange(false)
            }
          } else if (message.includes('腳本開始執行')) {
            // 腳本開始執行
            if (onStatusChange) {
              onStatusChange(true)
            }
          } else if (message.includes('腳本執行錯誤') || message.includes('錯誤')) {
            // 腳本執行錯誤
            if (onStatusChange) {
              onStatusChange(false)
            }
          }
        }
        
        setLogs((prevLogs) => [...prevLogs, entry])
        
        // Auto-scroll to bottom only if tailing is enabled
        if (isTailing && !isUserScrollingRef.current) {
          // Use setTimeout to ensure DOM is updated
          setTimeout(() => {
            scrollToBottom()
          }, 0)
        }
      })
    } else {
      // 停止時斷開連線
      webSocketService.disconnect()
    }

    // 清理函數
    return () => {
      webSocketService.disconnect()
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [isRunning, scriptId, onStatusChange, isTailing, scrollToBottom])

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

  // Handle tail button - scroll to bottom and enable tailing
  const handleTail = () => {
    setIsTailing(true)
    isUserScrollingRef.current = false
    scrollToBottom(true) // Smooth scroll
  }

  return (
    <div className="flex flex-1 min-h-0 h-full">
      {/* Left Toolbar */}
      <div className="flex flex-col gap-2 p-2 border-r border-base-300 bg-base-100">
        <button
          className="btn btn-ghost btn-sm btn-square"
          onClick={() => setSearchTerm('')}
          title={t('ui.log.search')}
        >
          <MdSearch />
        </button>
        <button
          className="btn btn-ghost btn-sm btn-square"
          onClick={handleClear}
          title={t('ui.log.clear')}
        >
          <MdClear />
        </button>
        <button
          className={`btn btn-ghost btn-sm btn-square ${isTailing ? 'btn-active' : ''}`}
          onClick={handleTail}
          title={isTailing ? "Tailing (Auto-scroll enabled)" : "Scroll to bottom and enable tailing"}
        >
          <MdVerticalAlignBottom />
        </button>
        <div className="divider my-0"></div>
        <button
          className="btn btn-ghost btn-sm btn-square"
          title="Settings"
        >
          <MdSettings />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Search Bar */}
        <div className="p-2 border-b border-base-300 bg-base-100">
          <div className="form-control">
            <div className="input-group input-group-sm">
              <span className="bg-base-200">
                <MdSearch />
              </span>
              <input
                type="text"
                placeholder={t('ui.log.search')}
                className="input input-bordered input-sm w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSearchTerm('')}
                >
                  <MdClear />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Log Entries Container with Scrollbar */}
        <div className="flex-1 overflow-hidden relative min-h-[20rem]">
          <div
            ref={logContainerRef}
            className="absolute inset-0 overflow-y-auto overflow-x-auto bg-base-200 p-4 font-mono text-sm"
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent'
            }}
          >
            <div className="space-y-1">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex gap-3 items-start ${getLevelColor(log.level)} hover:bg-base-300/50 rounded px-2 py-1`}
                  >
                    <span className="text-base-content/50 whitespace-nowrap text-xs">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span className={`badge badge-xs ${getLevelBadge(log.level)} shrink-0`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="flex-1 break-words min-w-0">{log.message}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-base-content/50 py-8">
                  {t('ui.log.noLogs')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LogBlock

