import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MdPlayArrow, MdStop } from 'react-icons/md'
import { ScriptParameter } from '../types'
import { scriptService } from '../services/mockService'

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
    const params = await scriptService.getScriptParameters(scriptId)
    setParameters(params)
    
    // 初始化參數預設值
    const defaultValues: Record<string, string> = {}
    params.forEach((param) => {
      defaultValues[param.id] = param.defaultValue || ''
    })
    setParamValues(defaultValues)
  }

  const handleStart = async () => {
    await scriptService.startScript(scriptId, paramValues)
    onStatusChange(true)
  }

  const handleStop = async () => {
    await scriptService.stopScript(scriptId)
    onStatusChange(false)
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
    <div className="space-y-6">
      {/* Control Buttons */}
      <fieldset className="border border-base-300 rounded-lg p-6">
        <legend className="text-lg font-semibold px-2">
          {t('ui.execution.control')}
        </legend>
        
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
      </fieldset>

      {/* Parameters */}
      <fieldset className="border border-base-300 rounded-lg p-6">
        <legend className="text-lg font-semibold px-2">
          {t('ui.control.parameters')}
        </legend>
        
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
      </fieldset>
    </div>
  )
}

export default ControlBlock

