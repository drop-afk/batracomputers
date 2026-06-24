import React from 'react';
import ServiceTiles from './ServiceTiles';
import { X } from 'lucide-react';

const ServiceModal = ({ open, onClose, services = [], onSelect }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Choose a Service</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div>
          <ServiceTiles services={services} selectedId={null} onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
};

export default ServiceModal;
