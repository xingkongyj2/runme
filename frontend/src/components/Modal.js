import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 带透明度的黑色背景遮罩 */}
      <div className="fixed inset-0 bg-black bg-opacity-90" onClick={onClose}></div>
      
      {/* 弹窗容器 */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-card shadow-2xl rounded-xl border border-border flex flex-col">
        {/* 弹窗头部 - 固定不滚动 */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <button 
            className="p-2 text-foreground-secondary hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        
        {/* 弹窗内容 - 可滚动 */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;