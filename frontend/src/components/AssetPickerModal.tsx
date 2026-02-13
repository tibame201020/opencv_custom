import React from 'react';
import { AssetExplorer } from './AssetExplorer';
import { X } from 'lucide-react';

interface AssetPickerModalProps {
    isOpen: boolean;
    scriptId: string | null;
    onClose: () => void;
    onSelect: (path: string) => void;
}

export const AssetPickerModal: React.FC<AssetPickerModalProps> = ({ isOpen, scriptId, onClose, onSelect }) => {
    if (!isOpen) return null;

    // We use a simplified wrapper around AssetExplorer logic,
    // or reusing AssetExplorer but styled for a modal.
    // AssetExplorer expects width/collapsed, we can mock them.

    // We need to capture the selection.
    // AssetExplorer doesn't currently expose "onSelect" prop for file selection state,
    // but it has `onFileOpen`. We can use `onFileOpen` to confirm selection?
    // Or we modify AssetExplorer to support selection callback?
    // Looking at AssetExplorer, it has internal `selectedAsset`.
    // It doesn't expose it.
    // For now, we can use `onFileOpen` (double click) to trigger select.

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-base-100 w-[800px] h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-base-300">
                <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 bg-base-200/50">
                    <h3 className="font-bold text-sm uppercase tracking-wider opacity-70">Select Asset</h3>
                    <button onClick={onClose} className="btn btn-sm btn-ghost btn-square"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <AssetExplorer
                        scriptId={scriptId}
                        width={800} // Full width of modal
                        collapsed={false}
                        onToggle={() => {}}
                        onResize={() => {}}
                        onFileOpen={(path) => {
                            // Double click behavior
                            // Strip "images/" prefix if needed?
                            // The backend expects relative path often.
                            // AssetExplorer returns e.g. "images/btn.png".
                            onSelect(path);
                            onClose();
                        }}
                    />
                    <div className="absolute bottom-4 right-4 bg-base-100/90 backdrop-blur p-2 rounded-lg border border-base-300 shadow-xl text-[10px] opacity-60">
                        Double-click to select
                    </div>
                </div>
            </div>
        </div>
    );
};
