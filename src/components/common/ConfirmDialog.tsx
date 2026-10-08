import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  requireTypingText?: string; // e.g. "ABE & LIA" for album deletion
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  requireTypingText,
  isDestructive = true,
  isLoading = false,
}) => {
  const [typedInput, setTypedInput] = useState('');

  const canConfirm = requireTypingText
    ? typedInput.trim().toUpperCase() === requireTypingText.trim().toUpperCase()
    : true;

  const handleClose = () => {
    setTypedInput('');
    onClose();
  };

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
      setTypedInput('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="md">
      <div className="flex flex-col items-center text-center py-2">
        {isDestructive && (
          <div className="w-12 h-12 rounded-full bg-red-100/80 flex items-center justify-center text-red-700 mb-4 border border-red-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
        )}

        <h4 className="font-serif text-xl sm:text-2xl text-[#171717] mb-2 font-normal">
          {title}
        </h4>
        <p className="text-sm text-[#77736B] mb-6 leading-relaxed">
          {description}
        </p>

        {requireTypingText && (
          <div className="w-full mb-6 text-left">
            <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-2 font-medium">
              Type <span className="font-mono font-bold text-[#171717] select-all">"{requireTypingText}"</span> to confirm:
            </label>
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={requireTypingText}
              className="w-full px-3 py-2 border border-[#E8E0D0] bg-[#F8F6F0] rounded-sm text-sm text-[#171717] focus:outline-none focus:border-[#C8A96B]"
            />
          </div>
        )}

        <div className="flex items-center justify-center gap-3 w-full pt-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            isLoading={isLoading}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
