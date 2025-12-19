export type Platform = 'robot' | 'adb'

export interface Script {
  id: string
  name: string
  platform: Platform
  description?: string
}

export interface ScriptParameter {
  id: string
  label: string
  type: 'text' | 'select' | 'radio'
  options?: string[]
  defaultValue?: string
}

export interface ScriptConfig {
  scriptId: string
  parameters: ScriptParameter[]
}

export interface LogEntry {
  id: string
  timestamp: Date
  level: 'info' | 'warn' | 'error'
  message: string
}

export interface OpenScriptTab {
  scriptId: string
  scriptName: string
  isRunning: boolean
}

