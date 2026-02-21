import { memo, useCallback } from 'react';
import { NodeResizer, type NodeProps, useReactFlow } from '@xyflow/react';
import clsx from 'clsx';

export const StickyNoteNode = memo(({ id, data, selected }: NodeProps) => {
    const { setNodes } = useReactFlow();

    const updateLabel = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
        const val = evt.target.value;
        setNodes((nodes) =>
            nodes.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...node.data, label: val } };
                }
                return node;
            })
        );
    }, [id, setNodes]);

    const updateContent = useCallback((evt: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = evt.target.value;
        setNodes((nodes) =>
            nodes.map((node) => {
                if (node.id === id) {
                    // We store content in data.content or data.config.content?
                    // Let's stick to data.content for direct access
                    return { ...node, data: { ...node.data, content: val } };
                }
                return node;
            })
        );
    }, [id, setNodes]);

    return (
        <div
            className={clsx(
                "h-full w-full min-w-[200px] min-h-[150px] bg-[#fff9c4] border border-[#fbc02d] rounded-lg shadow-sm flex flex-col p-4 transition-all group",
                selected ? "ring-2 ring-[#fbc02d] shadow-md" : "hover:shadow-md"
            )}
        >
            <NodeResizer
                minWidth={200}
                minHeight={150}
                isVisible={selected}
                lineClassName="border-[#fbc02d]"
                handleClassName="h-3 w-3 bg-white border-2 border-[#fbc02d] rounded"
            />

            {/* Drag Handle Area (Invisible but draggable) */}
            {/* React Flow nodes are draggable by default, but inputs stop propagation. */}

            {/* Title */}
            <input
                className="bg-transparent font-bold text-lg text-gray-800 placeholder-gray-500/50 mb-2 focus:outline-none w-full nodrag cursor-text"
                placeholder="Title"
                defaultValue={(data.label as string) || ''}
                onChange={updateLabel}
            />

            {/* Content */}
            <textarea
                className="flex-1 bg-transparent resize-none text-sm text-gray-700 placeholder-gray-500/50 focus:outline-none w-full h-full leading-relaxed nodrag cursor-text custom-scrollbar"
                placeholder="Type something..."
                defaultValue={(data.content as string) || ''}
                onChange={updateContent}
            />
        </div>
    );
});
