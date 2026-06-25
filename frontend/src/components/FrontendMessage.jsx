import React from 'react';
import { AlertCircle, X } from 'lucide-react';

const FrontendMessage = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div className="fixed top-20 right-4 left-4 sm:left-auto sm:w-full sm:max-w-md z-[70]">
      <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 shadow-lg">
        <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button type="button" onClick={onDismiss} className="rounded-lg p-1 text-red-400 hover:bg-red-100 hover:text-red-700" aria-label="Dismiss error">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default FrontendMessage;
