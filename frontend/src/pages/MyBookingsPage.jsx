import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  CheckCircle, Clock, AlertCircle, Star, Loader2, XCircle, Package,
  RefreshCw, Calendar, User, ArrowRight, MessageSquare, Phone, Search, Filter
} from 'lucide-react';
import { formatWhatsAppUrl } from '../utils/phone';
import FrontendMessage from '../components/FrontendMessage';

const statusConfig = {
  pending:     { label: 'Pending',     cls: 'bg-amber-50 text-amber-700 border-amber-200',     icon: Clock,         dot: 'bg-amber-500', desc: 'Waiting for a worker to pick up' },
  accepted:    { label: 'Accepted',    cls: 'bg-blue-50 text-blue-700 border-blue-200',       icon: CheckCircle,   dot: 'bg-blue-500', desc: 'A worker has been assigned' },
  in_progress: { label: 'Working',     cls: 'bg-orange-50 text-orange-700 border-orange-200', icon: AlertCircle,   dot: 'bg-orange-500', desc: 'Your request is being worked on' },
  completed:   { label: 'Done',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, dot: 'bg-emerald-500', desc: 'Completed successfully' },
  rejected:    { label: 'Rejected',    cls: 'bg-red-50 text-red-700 border-red-200',           icon: XCircle,       dot: 'bg-red-500', desc: 'No worker was available' },
};

const MyBookingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [ratingBooking, setRatingBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [pageError, setPageError] = useState('');

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get(`/bookings/customer/${user._id}`);
      setBookings(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user?._id]);

  useEffect(() => { fetchBookings(); const interval = setInterval(fetchBookings, 10000); return () => clearInterval(interval); }, [fetchBookings]);

  const submitRating = async () => {
    setPageError('');
    setSubmitting(true);
    try { await api.patch(`/bookings/${ratingBooking._id}/rating`, { rating, feedback }); setRatingBooking(null); setRating(5); setFeedback(''); fetchBookings(); }
    catch (err) { setPageError(err.response?.data?.message || 'Failed to submit rating'); }
    finally { setSubmitting(false); }
  };

  const filtered = bookings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending', 'accepted', 'in_progress'].includes(b.status);
    return b.status === filter;
  }).filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return b.serviceName.toLowerCase().includes(q) || b.status.includes(q);
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const stats = {
    all: bookings.length,
    active: bookings.filter(b => ['pending', 'accepted', 'in_progress'].includes(b.status)).length,
    completed: bookings.filter(b => b.status === 'completed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FrontendMessage message={pageError} onDismiss={() => setPageError('')} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">Track all your service requests in one place</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchBookings} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link to="/booking" className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1.5">
            <ArrowRight size={14} /> Book New Service
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { key: 'all', label: 'Total', value: stats.all, color: 'bg-gray-50 text-gray-700', icon: Package },
          { key: 'active', label: 'Active', value: stats.active, color: 'bg-blue-50 text-blue-700', icon: Clock },
          { key: 'completed', label: 'Completed', value: stats.completed, color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
          { key: 'pending', label: 'Pending', value: stats.pending, color: 'bg-amber-50 text-amber-700', icon: AlertCircle },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key === filter ? 'all' : s.key)}
            className={`rounded-xl ${s.color} px-4 py-3 flex items-center gap-3 transition-all ${filter === s.key ? 'ring-2 ring-offset-2 ring-gray-300' : 'hover:opacity-80'}`}>
            <s.icon size={16} />
            <div className="text-left">
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] opacity-70 font-medium uppercase tracking-wide">{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'pending', 'accepted', 'in_progress', 'completed', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${filter === f ? 'bg-gray-900 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
              {f === 'all' ? 'All' : statusConfig[f]?.label || f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search bookings..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all" />
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-gray-400" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="mx-auto text-gray-200 mb-4" size={48} />
          <p className="text-gray-500 font-medium">No bookings found</p>
          <p className="text-sm text-gray-400 mt-1">Book your first service to get started</p>
          <button onClick={() => navigate('/booking')} className="mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">Book a Service</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(b => {
            const st = statusConfig[b.status];
            const Icon = st?.icon || Clock;
            return (
              <div key={b._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                <div className={`h-1 w-full ${b.status === 'completed' ? 'bg-emerald-400' : b.status === 'in_progress' ? 'bg-orange-400' : b.status === 'accepted' ? 'bg-blue-400' : b.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'}`} />
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${st?.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st?.dot} ${b.status === 'pending' || b.status === 'in_progress' ? 'animate-pulse' : ''}`} />
                          <Icon size={10} /> {st?.label}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {b.status === 'pending' && <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">Waiting for worker</span>}
                      </div>
                      <h3 className="font-semibold text-gray-900">{b.serviceName}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">Quantity: {b.quantity}</p>
                      {b.specialRequirements && <p className="text-xs text-gray-400 mt-1 italic">"{b.specialRequirements}"</p>}
                      {b.status === 'completed' && b.rating && (
                        <div className="flex items-center gap-1 mt-2">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} className={i < b.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                          ))}
                          <span className="text-xs text-gray-500 ml-1">{b.rating}/5</span>
                          {b.customerFeedback && <span className="text-xs text-gray-400 ml-2">"{b.customerFeedback}"</span>}
                        </div>
                      )}
                      {b.status === 'completed' && !b.rating && (
                        <button onClick={() => setRatingBooking(b)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">
                          <Star size={12} /> Rate this service
                        </button>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-bold text-gray-900">₹{b.finalCost || b.estimatedCost}</p>
                      {b.finalCost && b.finalCost !== b.estimatedCost && <p className="text-xs text-gray-400 line-through">₹{b.estimatedCost}</p>}
                      <button onClick={() => setSelectedBooking(b)} className="text-xs text-blue-600 font-medium hover:text-blue-700 mt-1 flex items-center gap-1 justify-end">
                        <Calendar size={10} /> View Details
                      </button>
                    </div>
                  </div>

                  {b.assignedWorkerName && (
                    <div className="mt-4 flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">{b.assignedWorkerName.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700">Assigned to {b.assignedWorkerName}</p>
                      </div>
                      {b.assignedWorkerPhone && (
                        <a href={formatWhatsAppUrl(b.assignedWorkerPhone)} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-emerald-600 font-medium flex items-center gap-1 hover:text-emerald-700">
                          <MessageSquare size={10} /> WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Booking Details</h3>
              <button onClick={() => setSelectedBooking(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><XCircle size={18} /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-400 mb-1">Booking ID</p><p className="font-mono text-xs text-gray-600">{selectedBooking._id}</p></div>
                <div><p className="text-xs text-gray-400 mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusConfig[selectedBooking.status].cls}`}>
                    {React.createElement(statusConfig[selectedBooking.status].icon, { size: 10 })} {statusConfig[selectedBooking.status].label}
                  </span>
                </div>
                <div><p className="text-xs text-gray-400 mb-1">Service</p><p className="font-semibold text-gray-900">{selectedBooking.serviceName}</p></div>
                <div><p className="text-xs text-gray-400 mb-1">Quantity</p><p className="font-semibold text-gray-900">{selectedBooking.quantity}</p></div>
                <div><p className="text-xs text-gray-400 mb-1">Estimated Cost</p><p className="font-semibold text-gray-900">₹{selectedBooking.estimatedCost}</p></div>
                {selectedBooking.finalCost && <div><p className="text-xs text-gray-400 mb-1">Final Cost</p><p className="font-semibold text-gray-900">₹{selectedBooking.finalCost}</p></div>}
                <div><p className="text-xs text-gray-400 mb-1">Created</p><p className="font-semibold text-gray-900">{new Date(selectedBooking.createdAt).toLocaleString('en-IN')}</p></div>
              </div>
              {selectedBooking.specialRequirements && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-medium mb-1">Special Requirements</p>
                  <p className="text-sm text-gray-700">{selectedBooking.specialRequirements}</p>
                </div>
              )}
              {selectedBooking.assignedWorkerName && (
                <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Assigned Worker</p>
                  <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">{selectedBooking.assignedWorkerName.charAt(0)}</div><p className="font-semibold text-gray-900">{selectedBooking.assignedWorkerName}</p></div>
                  <p className="text-sm text-gray-600 flex items-center gap-1"><Phone size={12} />{selectedBooking.assignedWorkerPhone}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingBooking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">How was your experience?</h3>
            <p className="text-sm text-gray-500 mb-6">{ratingBooking.serviceName}</p>
            <div className="flex justify-center gap-3 mb-6">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)} className="transition-transform hover:scale-110">
                  <Star size={36} className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                </button>
              ))}
            </div>
            <textarea rows={3} className="w-full px-3 py-2 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 resize-none mb-4" placeholder="Share your experience (optional)..." value={feedback} onChange={e => setFeedback(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setRatingBooking(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={submitRating} disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">
                {submitting ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;
