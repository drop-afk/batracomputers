import React from 'react';
import { CalendarClock, Plus, X } from 'lucide-react';

const PickupSlotFields = ({ slots, onChange }) => {
  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  const updateSlot = (index, field, value) => {
    const next = [...slots];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  return (
    <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-blue-900">
        <CalendarClock size={16} /> Pickup times
      </p>
      <p className="mt-1 text-xs text-blue-700">Optional: offer dates and hours when the customer can collect the work.</p>
      <div className="mt-3 space-y-2">
        {slots.map((slot, index) => (
          <div key={index} className="rounded-xl border border-blue-100 bg-white p-3">
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                min={minDateTime}
                value={slot.date}
                onChange={(event) => updateSlot(index, 'date', event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button type="button" onClick={() => onChange(slots.filter((_, slotIndex) => slotIndex !== index))} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Remove pickup time">
                <X size={16} />
              </button>
            </div>
            <textarea
              rows={2}
              maxLength={300}
              value={slot.note}
              onChange={(event) => updateSlot(index, 'note', event.target.value)}
              placeholder="Optional note, e.g. Call when you arrive or collect from counter 2"
              className="mt-2 w-full resize-none rounded-lg border border-blue-100 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        ))}
      </div>
      {slots.length < 6 && (
        <button type="button" onClick={() => onChange([...slots, { date: '', note: '' }])} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900">
          <Plus size={14} /> Add pickup time
        </button>
      )}
    </div>
  );
};

export default PickupSlotFields;
