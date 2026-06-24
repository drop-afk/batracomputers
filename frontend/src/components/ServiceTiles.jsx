import React from 'react';
import { Clock, IndianRupee } from 'lucide-react';

const ServiceTiles = ({ services = [], selectedId, onSelect }) => {
  if (!services || services.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {services.map(s => {
        const active = s._id === selectedId;
        return (
          <button
            key={s._id}
            type="button"
            onClick={() => onSelect(s._id)}
            className={`text-left p-4 rounded-xl border transition-shadow duration-150 hover:shadow-md focus:shadow-md focus:outline-none ${active ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-100' : 'border-gray-100 bg-white'}`}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">{s.name}</h4>
              <div className="text-sm text-gray-600 inline-flex items-center gap-1"><IndianRupee size={14} />{s.basePrice}</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{s.description || s.estimatedTime || ''}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
                <Clock size={12} /> {s.estimatedTime}
              </span>
              <span className="ml-auto text-xs font-medium text-primary-600">{s.priceUnit}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ServiceTiles;
