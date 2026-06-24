import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';
import { formatWhatsAppUrl } from '../utils/phone';
import {
  CheckCircle, Clock, AlertCircle, Star,
  Loader2, XCircle, Package, MessageSquare, ChevronRight, RefreshCw
} from 'lucide-react';

const statusConfig = {
  pending:     { label: 'Pending',     cls: 'badge-pending',     icon: Clock },
  accepted:    { label: 'Accepted',    cls: 'badge-accepted',    icon: CheckCircle },
  in_progress: { label: 'In Progress', cls: 'badge-in-progress', icon: AlertCircle },
  completed:   { label: 'Completed',   cls: 'badge-completed',   icon: CheckCircle },
  rejected:    { label: 'Rejected',    cls: 'badge-rejected',    icon: XCircle },
};

const FILTERS = ['all', 'pending', 'accepted', 'in_progress', 'completed', 'rejected'];

const MyBookingsPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [ratingBooking, setRatingBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get(`/bookings/customer/${user._id}`);
      setBookings(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user?._id]);

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 10000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  const submitRating = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/bookings/${ratingBooking._id}/rating`, { rating, feedback });
      setRatingBooking(null); setRating(5); setFeedback('');
      fetchBookings();
    } catch (err) { alert(err.response?.data?.message || 'Failed to submit rating'); }
    finally { setSubmitting(false); }
  };

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  return (
    <div className="section py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">My Bookings</h1>
          <p className="text-sm text-gray-500">{bookings.length} total request{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={fetchBookings} className="ml-auto btn-ghost text-sm px-3 py-2 text-gray-400 hover:text-gray-700">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FILTERS.map(f => (
          <button key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-150 capitalize ${
              filter === f
                ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {f === 'all' ? 'All' : statusConfig[f]?.label}
            {f !== 'all' && <span className="ml-1.5 text-xs opacity-70">{bookings.filter(b => b.status === f).length}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="card animate-pulse h-28" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <Package className="mx-auto text-gray-200 mb-4" size={56} />
          <p className="text-gray-400 font-medium">No bookings found</p>
          {user?.role === 'customer' && (
            <Link to="/booking" className="btn-primary mt-4 text-sm">Book a Service</Link>
          )}
          {user?.role === 'owner' && (
            <p className="text-sm text-gray-400 mt-2">All customer bookings will appear here.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(b => {
            const st = statusConfig[b.status];
            const Icon = st?.icon || Clock;
            return (
              <div key={b._id} className="card-hover p-0 overflow-hidden">
                {/* Top accent bar */}
                <div className={`h-1 w-full ${
                  b.status === 'completed' ? 'bg-emerald-400' :
                  b.status === 'in_progress' ? 'bg-orange-400' :
                  b.status === 'accepted' ? 'bg-blue-400' :
                  b.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'
                }`} />
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`badge ${st?.cls}`}><Icon size={11} />{st?.label}</span>
                        <span className="text-xs text-gray-400">{format(new Date(b.createdAt), 'MMM d, yyyy · h:mm a')}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg">{b.serviceName}</h3>
                      <p className="text-sm text-gray-500">Qty: {b.quantity}</p>
                      {b.specialRequirements && (
                        <p className="text-xs text-gray-400 mt-1 italic">"{b.specialRequirements}"</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-extrabold text-primary-700">₹{b.finalCost || b.estimatedCost}</p>
                      {b.finalCost && b.finalCost !== b.estimatedCost && (
                        <p className="text-xs text-gray-400 line-through">₹{b.estimatedCost}</p>
                      )}
                    </div>
                  </div>

                  {b.assignedWorkerName && (
                    <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                      <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">
                        {b.assignedWorkerName.charAt(0)}
                      </div>
                      <span className="text-xs text-blue-700 font-medium">Worker: {b.assignedWorkerName}</span>
                      {b.assignedWorkerPhone && (
                        <a href={formatWhatsAppUrl(b.assignedWorkerPhone)}
                          target="_blank" rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold">
                          <MessageSquare size={12} /> WhatsApp
                        </a>
                      )}
                    </div>
                  )}

                  {/* Rating */}
                  {b.status === 'completed' && (
                    <div className="mt-3">
                      {b.rating ? (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} className={i < b.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                          ))}
                          <span className="ml-1 font-semibold text-gray-700">{b.rating}/5</span>
                          {b.customerFeedback && <span className="text-xs text-gray-400 ml-2">"{b.customerFeedback}"</span>}
                        </div>
                      ) : (
                        <button onClick={() => setRatingBooking(b)}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 hover:bg-amber-100 transition-colors">
                          <Star size={14} /> Rate this service
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rating Modal */}
      {ratingBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-7 shadow-card-lg animate-slide-up">
            <h3 className="text-xl font-bold text-gray-900 mb-1 font-display">How was your experience?</h3>
            <p className="text-sm text-gray-500 mb-6">{ratingBooking.serviceName}</p>
            <div className="flex justify-center gap-3 mb-6">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)} className="transition-transform hover:scale-110">
                  <Star size={36} className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                </button>
              ))}
            </div>
            <textarea rows={3} className="input-field mb-4 resize-none" placeholder="Tell us more (optional)..."
              value={feedback} onChange={e => setFeedback(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setRatingBooking(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={submitRating} disabled={submitting} className="btn-primary flex-1">
                {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;
