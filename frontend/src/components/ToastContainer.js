import React from 'react';
import Toast from './Toast';

const ToastContainer = ({ toasts, onClose }) => {
  return (
    <>
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          show={toast.show}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          index={index}
          onClose={() => onClose(toast.id)}
        />
      ))}
    </>
  );
};

export default ToastContainer;