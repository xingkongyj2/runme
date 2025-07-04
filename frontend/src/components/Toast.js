import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const Toast = ({ show, onClose, type = 'info', title, message, duration = 3000, index = 0 }) => {
  // 直接使用show初始化isVisible，避免延迟
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    if (show) {
      // 立即设置为可见（如果还没有的话）
      setIsVisible(true);
      
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      // 当show变为false时，立即隐藏
      setIsVisible(false);
    }
  }, [show, duration]);

  const handleClose = () => {
    setIsVisible(false);
    // 等待动画完成后再调用onClose
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-300 dark:bg-green-800 dark:border-green-600';
      case 'error':
        return 'bg-red-100 border-red-300 dark:bg-red-800 dark:border-red-600';
      case 'warning':
        return 'bg-yellow-100 border-yellow-300 dark:bg-yellow-800 dark:border-yellow-600';
      default:
        return 'bg-blue-100 border-blue-300 dark:bg-blue-800 dark:border-blue-600';
    }
  };

  if (!show) return null;

  return (
    <div 
      className="fixed right-4 z-50"
      style={{ top: `${16 + index * 80}px` }}
    >
      <div className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        min-w-80 max-w-md w-auto shadow-lg rounded-lg border p-4
        ${getBackgroundColor()}
      `}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            {title && (
              <p className="text-sm font-medium text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                {title}
              </p>
            )}
            <p className={`text-sm text-foreground-secondary ${title ? 'mt-1' : ''} break-words`}>
              {message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="inline-flex text-foreground-secondary hover:text-foreground focus:outline-none"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toast;