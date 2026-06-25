import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { getBookingFiles } from '../utils/bookingFiles';
import {
  ArrowLeft, Search, Filter, CheckCircle, Clock, AlertCircle, Loader2, XCircle,
  FileText, Download, Phone, Mail, MapPin, RefreshCw
} from 'lucide-react';
import FrontendMessage from '../components/FrontendMessage';

const statusConfig = {
  pending: { label: 'Pending', class: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, dot: 'bg-amber-500' },
  accepted: { label: 'Accepted', class: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle, dot: 'bg-blue-500' },
  in_progress: { label: 'In Progress', class: 'bg-orange-50 text-orange-700 border-orange-200', icon: AlertCircle, dot: 'bg-orange-500' },
  completed: { label: 'Completed', class: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', class: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, dot: 'bg-red-500' },
};

const PendingRequestsPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accepting, setAccepting] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [rejectConfirmation, setRejectConfirmation] = useState(null);
  const [pageError, setPageError] = useState('');

  const categoryKeywords = {
    photocopy: ['photocopy', 'xerox', 'copy', 'copies'],
    printing: ['print', 'printing', 'poster', 'banner'],
    homework: ['homework', 'assignment', 'project', 'notes'],
    tickets: ['ticket', 'booking', 'reservation', 'rail', 'bus', 'flight']
  };

  useEffect(() => {
    let result = [...bookings];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(b => b.customerName.toLowerCase().includes(q) || b.serviceName.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'all') {
      const keywords = categoryKeywords[categoryFilter] || [categoryFilter];
      result = result.filter(b => keywords.some(kw => b.serviceName.toLowerCase().includes(kw)));
    }
    setFiltered(result);
  }, [bookings, search, categoryFilter]);

  const fetchPending = useCallback(async () => {
    try { const res = await api.get('/bookings/pending'); setBookings(res.data); setFiltered(res.data); setLastUpdated(new Date()); }
    catch (err) { console.error('Failed to fetch pending', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPending(); const interval = setInterval(fetchPending, 10000); return () => clearInterval(interval); }, [fetchPending]);

  const acceptBooking = async (id) => {
    setPageError('');
    setAccepting(id);
    try { await api.patch(`/bookings/${id}/accept`); fetchPending(); }
    catch (err) { setPageError(err.response?.data?.message || 'Failed to accept'); }
    finally { setAccepting(null); }
  };

  const rejectBooking = async (id) => {
    setPageError('');
    setRejecting(id);
    try { await api.patch(`/bookings/${id}/reject`); setRejectConfirmation(null); fetchPending(); }
    catch (err) { setPageError(err.response?.data?.message || 'Failed to reject'); }
    finally { setRejecting(null); }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date); const now = new Date(); const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return 'Just now'; if (diff < 60) return `${diff}m ago`; if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const downloadBookingFile = (booking, fileIndex) => {
    setPageError('');
    const file = getBookingFiles(booking)[fileIndex];
    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/bookings/${booking._id}/file/${fileIndex}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file?.originalName || 'document.pdf';
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => setPageError('Failed to download'));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FrontendMessage message={pageError} onDismiss={() => setPageError('')} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Requests</h1>
            <p className="text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {bookings.length} pending request{bookings.length !== 1 ? 's' : ''}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          <button onClick={fetchPending} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by customer or service..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all" />
        </div>
        <select className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-gray-200" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="all">All Services</option>
          <option value="photocopy">Photocopy</option>
          <option value="printing">Printing</option>
          <option value="homework">Homework</option>
          <option value="tickets">Tickets</option>
        </select>
      </div>

      {/* Requests Grid */}
      {loading ? (
        <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-gray-400" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="mx-auto text-gray-200 mb-4" size={48} />
          <p className="text-gray-500 font-medium">No pending requests</p>
          <p className="text-sm text-gray-400 mt-1">All caught up! Check back later.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(booking => (
            <div key={booking._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <Clock size={10} /> Pending
                    </span>
                    <span className="text-xs text-gray-400">{formatTime(booking.createdAt)}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{booking.serviceName}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{booking.customerName} · Qty {booking.quantity}</p>
                  {booking.specialRequirements && (
                    <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded mt-2 inline-block">{booking.specialRequirements}</p>
                  )}
                  {getBookingFiles(booking).length > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                      <FileText size={10} /> {getBookingFiles(booking).length} PDF{getBookingFiles(booking).length !== 1 ? 's' : ''} attached
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-gray-900">₹{booking.estimatedCost}</p>
                  <button onClick={() => setSelectedBooking(booking)} className="text-xs text-blue-600 font-medium hover:text-blue-700 mt-1 flex items-center gap-1 justify-end">
                    <Phone size={10} /> View Details
                  </button>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setSelectedBooking(booking)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">View Details</button>
                <button onClick={() => setRejectConfirmation(booking)} disabled={rejecting === booking._id || accepting === booking._id}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50">
                  {rejecting === booking._id ? 'Rejecting...' : 'Reject'}
                </button>
                <button onClick={() => acceptBooking(booking._id)} disabled={accepting === booking._id || rejecting === booking._id}
                  className="flex-1 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                  <CheckCircle size={12} /> {accepting === booking._id ? 'Accepting...' : 'Accept & Assign'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Request Details</h3>
              <button onClick={() => setSelectedBooking(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><XCircle size={18} /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-400 mb-1">Service</p><p className="font-semibold text-gray-900">{selectedBooking.serviceName}</p></div>
                <div><p className="text-xs text-gray-400 mb-1">Quantity</p><p className="font-semibold text-gray-900">{selectedBooking.quantity}</p></div>
                <div><p className="text-xs text-gray-400 mb-1">Cost</p><p className="font-semibold text-gray-900">₹{selectedBooking.estimatedCost}</p></div>
                <div><p className="text-xs text-gray-400 mb-1">Created</p><p className="font-semibold text-gray-900">{formatTime(selectedBooking.createdAt)}</p></div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Customer Info</p>
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{selectedBooking.customerName?.charAt(0)}</div><p className="font-semibold text-gray-900">{selectedBooking.customerName}</p></div>
                <div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-gray-400" />{selectedBooking.customerPhone}</div>
                <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-gray-400" />{selectedBooking.customerEmail}</div>
              </div>
              {selectedBooking.specialRequirements && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-xs text-amber-700 font-medium mb-1">Special Requirements</p>
                  <p className="text-sm text-amber-800">{selectedBooking.specialRequirements}</p>
                </div>
              )}
              {getBookingFiles(selectedBooking).length > 0 && (
                <div className="space-y-2">
                  {getBookingFiles(selectedBooking).map((file, index) => (
                    <button key={`${file.url || file.originalName}-${index}`} onClick={() => downloadBookingFile(selectedBooking, index)} className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                      <Download size={14} /><FileText size={14} /> Download {file.originalName || `PDF ${index + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-50 flex gap-3">
              <button onClick={() => setSelectedBooking(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors">Close</button>
              <button onClick={() => { setRejectConfirmation(selectedBooking); setSelectedBooking(null); }} disabled={rejecting === selectedBooking._id}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50">Reject</button>
              <button onClick={() => { acceptBooking(selectedBooking._id); setSelectedBooking(null); }} disabled={accepting === selectedBooking._id}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">Accept</button>
            </div>
          </div>
        </div>
      )}

      {rejectConfirmation && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Reject this request?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Reject <strong>{rejectConfirmation.serviceName}</strong> for {rejectConfirmation.customerName}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRejectConfirmation(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={() => rejectBooking(rejectConfirmation._id)} disabled={rejecting === rejectConfirmation._id} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50">
                {rejecting === rejectConfirmation._id ? 'Rejecting...' : 'Yes, Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingRequestsPage;
