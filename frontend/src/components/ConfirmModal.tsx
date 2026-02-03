import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info' | 'warning';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'info'
}) => {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (isOpen) {
            dialogRef.current?.showModal();
        } else {
            dialogRef.current?.close();
        }
    }, [isOpen]);

    // Handle Esc key
    const handleCancel = () => {
        onCancel();
    };

    return (
        <dialog ref={dialogRef} className="modal" onClose={handleCancel}>
            <div className="modal-box">
                <h3 className={clsx("font-bold text-lg flex items-center gap-2",
                    type === 'danger' ? "text-error" :
                        type === 'warning' ? "text-warning" : "text-base-content"
                )}>
                    {type === 'danger' ? <AlertTriangle size={24} /> : <Info size={24} />}
                    {title}
                </h3>
                <p className="py-4">{message}</p>
                <div className="modal-action">
                    <button className="btn" onClick={handleCancel}>{cancelText}</button>
                    <button
                        className={clsx("btn",
                            type === 'danger' ? "btn-error" :
                                type === 'warning' ? "btn-warning" : "btn-primary"
                        )}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={handleCancel}>close</button>
            </form>
        </dialog>
    );
};
