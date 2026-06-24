import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';
import { ArrowLeft, Search, Filter, CheckCircle, Clock, MessageSquare, Phone, Loader2, XCircle, User, Download, FileText } from 'lucide-react';
import { formatWhatsAppUrl } from '../utils/phone';

const statusConfig = {
  pending: { label: 'Pending', class: 'badge-pending', icon: Clock },
  accepted: { label: 'Accepted', class: 'badge-accepted', icon: CheckCircle },
  in_progress: { label: 'In Progress', class: 'badge-in-progress', icon: Clock },
  completed: { label: 'Completed', class: 'badge-completed', icon: CheckCircle },
  rejected: { label: 'Rejected', class: 'badge-rejected', icon: XCircle }
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




  // Issue #20: More precise keyword-to-category mapping instead of raw substring matching
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
      result = result.filter(b =>
        b.customerName.toLowerCase().includes(q) ||
        b.serviceName.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'all') {
      const keywords = categoryKeywords[categoryFilter] || [categoryFilter];
      result = result.filter(b =>
        keywords.some(kw => b.serviceName.toLowerCase().includes(kw))
      );
    }
    setFiltered(result);
  }, [bookings, search, categoryFilter]);

  // Issue #15: useCallback with user as dependency prevents stale closure
  const fetchPending = useCallback(async () => {
    try {
      const res = await api.get('/bookings/pending');
      setBookings(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error('Failed to fetch pending', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  const acceptBooking = async (id) => {
    setAccepting(id);
    try {
      await api.patch(`/bookings/${id}/accept`);
      fetchPending();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept');
    } finally {
      setAccepting(null);
    }
  };

  const rejectBooking = async (id) => {
    if (!window.confirm('Are you sure you want to reject this request? It will be cancelled.')) return;
    setRejecting(id);
    try {
      await api.patch(`/bookings/${id}/reject`);
      fetchPending();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject');
    } finally {
      setRejecting(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard" className="text-gray-600 hover:text-gray-900"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-gray-900">Pending Requests</h1>
        <span className="badge badge-pending">{bookings.length}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer or service..."
            className="input-field pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field w-40" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Services</option>
          <option value="photocopy">Photocopy</option>
          <option value="printing">Printing</option>
          <option value="homework">Homework</option>
          <option value="tickets">Tickets</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary-600" size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 text-lg">No pending requests</p>
          <p className="text-sm text-gray-400 mt-1">All caught up!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(booking => (
            <div key={booking._id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <span className="badge badge-pending">Pending</span>
                  <span className="text-sm text-gray-500">{format(new Date(booking.createdAt), 'MMM d, h:mm a')}</span>
                </div>
                <span className="font-bold text-primary-700">₹{booking.estimatedCost}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Service</p>
                  <p className="font-semibold">{booking.serviceName}</p>
                  <p className="text-sm text-gray-500">Qty: {booking.quantity}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-semibold">{booking.customerName}</p>
                  <p className="text-sm text-gray-500">{booking.customerPhone}</p>
                </div>
              </div>
              {booking.specialRequirements && (
                <p className="text-sm bg-yellow-50 p-2 rounded mb-3 text-yellow-800">
                  <strong>Note:</strong> {booking.specialRequirements}
                </p>
              )}

              {/* PDF Download badge on card */}
              {booking.fileUrl && (
                <div className="flex items-center gap-2 mb-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <FileText size={13} className="shrink-0" />
                  <span className="font-medium">PDF attached</span>
                  <span className="text-blue-500">{booking.fileOriginalName || 'document.pdf'}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedBooking(booking)}
                  className="btn-secondary text-sm py-1.5 px-3"
                >
                  View Details
                </button>
                <button
                  onClick={() => rejectBooking(booking._id)}
                  disabled={rejecting === booking._id || accepting === booking._id}
                  className="bg-red-50 text-red-700 hover:bg-red-100 font-semibold py-1.5 px-3 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {rejecting === booking._id ? 'Rejecting...' : 'Reject'}
                </button>
                <button
                  onClick={() => acceptBooking(booking._id)}
                  disabled={accepting === booking._id || rejecting === booking._id}
                  className="btn-primary text-sm py-1.5 px-3 disabled:opacity-50 flex-1"
                >
                  {accepting === booking._id ? 'Accepting...' : 'Accept & Assign to Me'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Booking Details</h2>
              <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Booking ID:</span> <span className="font-mono">{selectedBooking._id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Service:</span> <span className="font-medium">{selectedBooking.serviceName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Quantity:</span> <span>{selectedBooking.quantity}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Estimated Cost:</span> <span>₹{selectedBooking.estimatedCost}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Customer:</span> <span className="font-medium">{selectedBooking.customerName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Phone:</span> <a href={formatWhatsAppUrl(selectedBooking.customerPhone)} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{selectedBooking.customerPhone}</a></div>
              <div className="flex justify-between"><span className="text-gray-500">Email:</span> <span>{selectedBooking.customerEmail}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Created:</span> <span>{format(new Date(selectedBooking.createdAt), 'PPpp')}</span></div>
              {selectedBooking.specialRequirements && <div><span className="text-gray-500">Requirements:</span> <p className="mt-1 bg-gray-50 p-2 rounded">{selectedBooking.specialRequirements}</p></div>}

              {/* PDF Download in detail modal */}
              {selectedBooking.fileUrl && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-gray-500 mb-2 font-medium">Attached Document:</p>
                  <button
                    onClick={() => {
                      const token = localStorage.getItem('token');
                      fetch(`${import.meta.env.VITE_API_URL || '/api'}/bookings/${selectedBooking._id}/file`, {
                        headers: { Authorization: `Bearer ${token}` }
                      })
                        .then(r => r.blob())
                        .then(blob => {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = selectedBooking.fileOriginalName || 'document.pdf';
                          a.click();
                          URL.revokeObjectURL(url);
                        })
                        .catch(() => alert('Failed to download file'));
                    }}
                    className="inline-flex items-center gap-2 w-full justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-sm py-2.5 px-4 rounded-lg transition-colors border border-blue-200"
                  >
                    <Download size={15} />
                    <FileText size={14} />
                    Download PDF to Print
                    {selectedBooking.fileOriginalName && (
                      <span className="text-xs text-blue-500 font-normal truncate max-w-[180px]">({selectedBooking.fileOriginalName})</span>
                    )}
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setSelectedBooking(null)} className="flex-1 btn-secondary">Close</button>
              <button
                onClick={() => { rejectBooking(selectedBooking._id); setSelectedBooking(null); }}
                disabled={rejecting === selectedBooking._id || accepting === selectedBooking._id}
                className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {rejecting === selectedBooking._id ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                onClick={() => { acceptBooking(selectedBooking._id); setSelectedBooking(null); }}
                disabled={accepting === selectedBooking._id || rejecting === selectedBooking._id}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {accepting === selectedBooking._id ? 'Accepting...' : 'Accept & Assign to Me'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingRequestsPage;
