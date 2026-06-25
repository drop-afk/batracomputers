import React from 'react';
import { BellRing, CalendarClock, Check } from 'lucide-react';
import api from '../utils/api';

const formatSlot = (slot) => new Date(slot).toLocaleString('en-IN', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  hour: 'numeric', minute: '2-digit'
});

const PickupNotifications = ({ bookings, onRefresh, onError }) => {
  const notifications = bookings.filter(
    booking => booking.selectedPickupSlot && !booking.pickupSelectionSeenAt
  );

  if (notifications.length === 0) return null;

  const acknowledge = async (bookingId) => {
    try {
      await api.patch(`/bookings/${bookingId}/pickup-selection-seen`);
      await onRefresh();
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to clear pickup notification');
    }
  };

  return (
    <div className="mb-6 space-y-3">
      {notifications.map((booking) => {
        const selectedOption = booking.pickupSlots?.find(
          slot => new Date(slot.date).getTime() === new Date(booking.selectedPickupSlot).getTime()
        );
        return (
          <div key={booking._id} className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
                <BellRing size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-violet-950">Customer accepted a pickup time</p>
                <p className="mt-1 text-sm text-violet-800">
                  <strong>{booking.customerName}</strong> will collect {booking.serviceName} on {formatSlot(booking.selectedPickupSlot)}.
                </p>
                {selectedOption?.note && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-violet-700">
                    <CalendarClock size={13} className="mt-0.5 flex-shrink-0" /> Your note: {selectedOption.note}
                  </p>
                )}
              </div>
              <button onClick={() => acknowledge(booking._id)} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-violet-700 shadow-sm hover:bg-violet-100">
                <Check size={13} /> Seen
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PickupNotifications;
