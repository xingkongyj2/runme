import { useState } from 'react';

const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = (type, message, title = '', duration = 3000) => {
    const id = Date.now();
    const newToast = {
      id,
      type,
      message,
      title,
      duration,
      show: true
    };
    
    setToasts(prev => [...prev, newToast]);
    
    return id;
  };

  const hideToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showSuccess = (message, title = '成功') => showToast('success', message, title);
  const showError = (message, title = '错误') => showToast('error', message, title);
  const showWarning = (message, title = '警告') => showToast('warning', message, title);
  const showInfo = (message, title = '提示') => showToast('info', message, title);

  return {
    toasts,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

export default useToast;