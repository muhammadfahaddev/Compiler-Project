// src/components/CustomModal.jsx
import React from 'react';
import { X } from 'lucide-react';

export default function CustomModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity">
      <div className="bg-white rounded-2xl shadow-xl w-11/12 max-w-4xl p-6 relative">
        <header className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>
        <div className="space-y-6 overflow-y-auto max-h-[70vh]">
          {children}
        </div>
      </div>
    </div>
  );
}