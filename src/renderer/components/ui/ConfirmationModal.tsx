import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import styles from './ConfirmationModal.module.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDangerous = false
}: ConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div 
        className={styles.modal} 
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <AlertTriangle 
              size={18} 
              className={isDangerous ? styles.warningIconDangerous : styles.warningIcon} 
            />
            <span>{title}</span>
          </div>
          <button onClick={onCancel} className={styles.closeBtn}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          <p className={styles.message}>{message}</p>
        </div>

        {/* Footer actions */}
        <div className={styles.footer}>
          <button onClick={onCancel} className={styles.cancelBtn}>
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
            }} 
            className={`${styles.confirmBtn} ${isDangerous ? styles.danger : ''}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
