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
  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 gap-6">
      {/* Control Block Fieldset */}
      <ControlBlock
        scriptId={scriptId}
        scriptName={scriptName}
        isRunning={isRunning}
        onStatusChange={onStatusChange}
      />

      {/* Log Block Fieldset */}
      <LogBlock scriptId={scriptId} scriptName={scriptName} isRunning={isRunning} />
    </div>
  )
}

export default ScriptDetail

