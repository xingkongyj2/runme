import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-black bg-opacity-50" onClick={onClose}></div>
        
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-card shadow-xl rounded-xl border border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <button 
              className="p-2 text-foreground-secondary hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
          <div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;