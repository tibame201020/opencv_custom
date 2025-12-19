import { Script, ScriptParameter, LogEntry } from '../types'

// Mock 腳本清單
export const mockScripts: Script[] = [
  {
    id: 'gear-script',
    name: 'GearScript',
    platform: 'adb',
    description: '裝備升級腳本'
  },
  {
    id: 'evil-hunter-script',
    name: 'EvilHunterScript',
    platform: 'adb',
    description: '遊戲自動化腳本'
  },
  {
    id: 'robot-script',
    name: 'RobotScript',
    platform: 'robot',
    description: 'Robot 測試腳本'
  }
]

// Mock 腳本參數配置
export const mockScriptParameters: Record<string, ScriptParameter[]> = {
  'gear-script': [
    {
      id: 'target-level',
      label: '目標等級',
      type: 'select',
      options: ['6', '9', '12', '15'],
      defaultValue: '15'
    },
    {
      id: 'rarity',
      label: '稀有度',
      type: 'radio',
      options: ['HERO', 'LEGEND'],
      defaultValue: 'HERO'
    }
  ],
  'evil-hunter-script': [
    {
      id: 'mode',
      label: '模式',
      type: 'select',
      options: ['普通', '困難', '地獄'],
      defaultValue: '普通'
    },
    {
      id: 'loop-count',
      label: '循環次數',
      type: 'text',
      defaultValue: '10'
    }
  ],
  'robot-script': [
    {
      id: 'interval',
      label: '間隔時間 (秒)',
      type: 'text',
      defaultValue: '5'
    }
  ]
}

// Mock 日誌資料
export const generateMockLogs = (scriptName: string): LogEntry[] => {
  const now = new Date()
  return [
    {
      id: '1',
      timestamp: new Date(now.getTime() - 5000),
      level: 'info',
      message: `[${scriptName}] 腳本開始執行`
    },
    {
      id: '2',
      timestamp: new Date(now.getTime() - 4000),
      level: 'info',
      message: `[${scriptName}] 正在初始化參數...`
    },
    {
      id: '3',
      timestamp: new Date(now.getTime() - 3000),
      level: 'info',
      message: `[${scriptName}] 連線至設備成功`
    },
    {
      id: '4',
      timestamp: new Date(now.getTime() - 2000),
      level: 'warn',
      message: `[${scriptName}] 偵測到圖片辨識閾值較低，建議調整`
    },
    {
      id: '5',
      timestamp: new Date(now.getTime() - 1000),
      level: 'info',
      message: `[${scriptName}] 執行中，進度: 25%`
    }
  ]
}

// API 模擬函數
export const scriptService = {
  // 取得所有腳本
  getAllScripts: async (): Promise<Script[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockScripts), 300)
    })
  },

  // 取得腳本參數配置
  getScriptParameters: async (scriptId: string): Promise<ScriptParameter[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockScriptParameters[scriptId] || []), 200)
    })
  },

  // 開始執行腳本
  startScript: async (scriptId: string, parameters: Record<string, string>): Promise<void> => {
    return new Promise((resolve) => {
      console.log(`Starting script: ${scriptId}`, parameters)
      setTimeout(() => resolve(), 500)
    })
  },

  // 停止執行腳本
  stopScript: async (scriptId: string): Promise<void> => {
    return new Promise((resolve) => {
      console.log(`Stopping script: ${scriptId}`)
      setTimeout(() => resolve(), 300)
    })
  }
}

