import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MdPlayArrow, MdStop } from 'react-icons/md'
import { ScriptParameter } from '../types'
import { apiService } from '../services/apiService'

interface ControlBlockProps {
  scriptId: string
  scriptName: string
  isRunning: boolean
  onStatusChange: (isRunning: boolean) => void
}

const ControlBlock = ({
  scriptId,
  scriptName,
  isRunning,
  onStatusChange
}: ControlBlockProps) => {
  const { t } = useTranslation()
  const [parameters, setParameters] = useState<ScriptParameter[]>([])
  const [paramValues, setParamValues] = useState<Record<string, string>>({})

  useEffect(() => {
    loadParameters()
  }, [scriptId])

  const loadParameters = async () => {
    try {
      const params = await apiService.getScriptParameters(scriptId)
      setParameters(params)
      
      // 初始化參數預設值
      const defaultValues: Record<string, string> = {}
      params.forEach((param) => {
        defaultValues[param.id] = param.defaultValue || ''
      })
      setParamValues(defaultValues)
    } catch (error) {
      console.error('Failed to load parameters:', error)
    }
  }

  const handleStart = async () => {
    try {
      await apiService.startScript(scriptId, paramValues)
      onStatusChange(true)
    } catch (error) {
      console.error('Failed to start script:', error)
      alert(`Failed to start script: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleStop = async () => {
    try {
      await apiService.stopScript(scriptId)
      onStatusChange(false)
    } catch (error) {
      console.error('Failed to stop script:', error)
      alert(`Failed to stop script: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleParamChange = (paramId: string, value: string) => {
    setParamValues({
      ...paramValues,
      [paramId]: value
    })
  }

  const renderParameterInput = (param: ScriptParameter) => {
    switch (param.type) {
      case 'text':
        return (
          <input
            type="text"
            className="input input-bordered w-full"
            value={paramValues[param.id] || ''}
            onChange={(e) => handleParamChange(param.id, e.target.value)}
            disabled={isRunning}
          />
        )
      
      case 'select':
        return (
          <select
            className="select select-bordered w-full"
            value={paramValues[param.id] || ''}
            onChange={(e) => handleParamChange(param.id, e.target.value)}
            disabled={isRunning}
          >
            {param.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )
      
      case 'radio':
        return (
          <div className="flex gap-4">
            {param.options?.map((option) => (
              <label key={option} className="label cursor-pointer gap-2">
                <input
                  type="radio"
                  name={param.id}
                  className="radio radio-primary"
                  checked={paramValues[param.id] === option}
                  onChange={() => handleParamChange(param.id, option)}
                  disabled={isRunning}
                />
                <span className="label-text">{option}</span>
              </label>
            ))}
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 pt-2">
      {/* Control Buttons */}
      <div className="flex gap-4 items-center">
        <button
          className={`btn btn-success flex-1 ${isRunning ? 'btn-disabled' : ''}`}
          onClick={handleStart}
          disabled={isRunning}
        >
          <MdPlayArrow className="text-xl" />
          {t('ui.execution.start')}
        </button>
        
        <button
          className={`btn btn-error flex-1 ${!isRunning ? 'btn-disabled' : ''}`}
          onClick={handleStop}
          disabled={!isRunning}
        >
          <MdStop className="text-xl" />
          {t('ui.execution.stop')}
        </button>
        
        <div className="badge badge-lg">
          {isRunning ? (
            <>
              <span className="animate-pulse mr-2">●</span>
              {t('ui.execution.running')}
            </>
          ) : (
            t('ui.execution.idle')
          )}
        </div>
      </div>

      {/* Parameters */}
      <div>
        <h3 className="text-md font-semibold mb-4">
          {t('ui.control.parameters')}
        </h3>
        
        {parameters.length > 0 ? (
          <div className="space-y-4">
            {parameters.map((param) => (
              <div key={param.id} className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">{param.label}</span>
                </label>
                {renderParameterInput(param)}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-base-content/50 py-4">
            {t('ui.control.noParameters')}
          </div>
        )}
      </div>
    </div>
  )
}

export default ControlBlock

