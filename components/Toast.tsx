'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  show: boolean;
  onClose: () => void;
}

export default function Toast({ message, type, show, onClose }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        padding: '12px 24px',
        backgroundColor: type === 'success' ? '#28a745' : '#dc3545',
        color: 'white',
        borderRadius: 4,
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        zIndex: 1000
      }}
    >
      {message}
      <button 
        onClick={onClose}
        style={{
          marginLeft: 12,
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: 16
        }}
      >
        ×
      </button>
    </div>
  );
}