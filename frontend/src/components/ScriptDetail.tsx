import { useTranslation } from 'react-i18next'
import ControlBlock from './ControlBlock'
import LogBlock from './LogBlock'

interface ScriptDetailProps {
  scriptId: string
  scriptName: string
  isRunning: boolean
  onStatusChange: (isRunning: boolean) => void
}

const ScriptDetail = ({
  scriptId,
  scriptName,
  isRunning,
  onStatusChange
}: ScriptDetailProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 gap-4">
      {/* Control Block Collapse */}
      <details 
        className="collapse bg-base-100 border-base-300 border collapse-arrow"
        open={!isRunning}
      >
        <summary className="collapse-title font-semibold text-lg">
          {t('ui.execution.control')}
        </summary>
        <div className="collapse-content">
          <ControlBlock
            scriptId={scriptId}
            scriptName={scriptName}
            isRunning={isRunning}
            onStatusChange={onStatusChange}
          />
        </div>
      </details>

      {/* Log Block Collapse */}
      <details 
        className="collapse bg-base-100 border-base-300 border collapse-arrow"
        open={isRunning}
      >
        <summary className="collapse-title font-semibold text-lg">
          {t('ui.log.title')}
        </summary>
        <div className="collapse-content flex flex-col min-h-0">
          <LogBlock 
            scriptId={scriptId} 
            scriptName={scriptName} 
            isRunning={isRunning}
            onStatusChange={onStatusChange}
          />
        </div>
      </details>
    </div>
  )
}

export default ScriptDetail

