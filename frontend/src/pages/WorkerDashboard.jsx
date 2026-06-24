import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';
import {
  ClipboardList, CheckCircle, Clock, AlertCircle, Star,
  Loader2, TrendingUp, ArrowRight, Package, RefreshCw
} from 'lucide-react';

const statusConfig = {
  pending:     { label: 'Pending',     cls: 'badge-pending',     icon: Clock },
  accepted:    { label: 'Accepted',    cls: 'badge-accepted',    icon: CheckCircle },
  in_progress: { label: 'In Progress', cls: 'badge-in-progress', icon: AlertCircle },
  completed:   { label: 'Completed',   cls: 'badge-completed',   icon: CheckCircle },
};

const WorkerDashboard = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [stats, setStats] = useState({ completed: 0, pending: 0, rating: 0 });
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [confirmComplete, setConfirmComplete] = useState(null);
  const [confirmAccept, setConfirmAccept] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const [pendingRes, tasksRes, analyticsRes] = await Promise.all([
        api.get('/bookings/pending'),
        api.get(`/bookings/worker/${user._id}`),
        api.get(`/analytics/worker/${user._id}`)
      ]);
      setPending(pendingRes.data.slice(0, 5));
      setMyTasks(tasksRes.data.filter(t => t.status !== 'completed').slice(0, 5));
      setStats({
        completed: analyticsRes.data.completedWeek || 0,
        pending: pendingRes.data.length,
        rating: analyticsRes.data.avgRating || 0
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user?._id]);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const acceptBooking = async (id) => {
    setAccepting(id);
    try { await api.patch(`/bookings/${id}/accept`); fetchDashboard(); }
    catch (err) { alert(err.response?.data?.message || 'Failed to accept'); }
    finally { setAccepting(null); setConfirmAccept(null); }
  };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try { await api.patch(`/bookings/${id}/status`, { status }); fetchDashboard(); if (status === 'completed') setConfirmComplete(null); }
    catch (err) { alert(err.response?.data?.message || 'Failed to update'); }
    finally { setUpdating(null); }
  };

  const statCards = [
    { label: 'This Week', value: stats.completed, suffix: 'done', color: 'from-emerald-500 to-teal-600', icon: CheckCircle },
    { label: 'New Requests', value: stats.pending, suffix: 'pending', color: 'from-amber-500 to-orange-500', icon: ClipboardList },
    { label: 'My Rating', value: stats.rating ? stats.rating.toFixed(1) : '—', suffix: '/5.0', color: 'from-primary-500 to-violet-600', icon: Star },
  ];

  return (
    <div className="section py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-display">
            Hey, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening today</p>
        </div>
        <button onClick={fetchDashboard} className="btn-ghost px-3 py-2 text-gray-400 hover:text-gray-700">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {statCards.map(({ label, value, suffix, color, icon: Icon }) => (
          <div key={label} className={`rounded-2xl bg-gradient-to-br ${color} text-white p-6 shadow-card-md`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-sm font-medium">{label}</p>
                <p className="text-4xl font-extrabold mt-1">{loading ? '—' : value}</p>
                <p className="text-white/60 text-sm">{suffix}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Requests */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900 font-display">New Requests</h2>
            <Link to="/dashboard/pending" className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : pending.length === 0 ? (
            <div className="text-center py-10"><Package className="mx-auto text-gray-200 mb-3" size={40} /><p className="text-gray-400 text-sm">No pending requests</p></div>
          ) : (
            <div className="space-y-3">
              {pending.map(b => (
                <div key={b._id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-100 hover:bg-primary-50/30 transition-all group">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{b.serviceName}</p>
                    <p className="text-xs text-gray-400">{b.customerName} · Qty {b.quantity} · <span className="font-semibold text-primary-600">₹{b.estimatedCost}</span></p>
                  </div>
                  <button onClick={() => setConfirmAccept(b)} className="flex-shrink-0 btn-primary text-xs px-3 py-1.5">
                    Accept
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Active Tasks */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900 font-display">My Active Tasks</h2>
            <Link to="/dashboard/my-tasks" className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : myTasks.length === 0 ? (
            <div className="text-center py-10"><TrendingUp className="mx-auto text-gray-200 mb-3" size={40} /><p className="text-gray-400 text-sm">No active tasks</p></div>
          ) : (
            <div className="space-y-3">
              {myTasks.map(t => {
                const st = statusConfig[t.status];
                const Icon = st?.icon || Clock;
                return (
                  <div key={t._id} className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-all">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="font-semibold text-gray-900 text-sm truncate flex-1">{t.serviceName}</p>
                      <span className={`badge ${st?.cls} flex-shrink-0`}><Icon size={10} />{st?.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{t.customerName}</p>
                    <div className="flex gap-2">
                      {t.status === 'accepted' && (
                        <button onClick={() => updateStatus(t._id, 'in_progress')} disabled={updating === t._id}
                          className="flex-1 text-xs font-semibold bg-orange-100 text-orange-700 py-1.5 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50">
                          {updating === t._id ? 'Updating…' : 'Start Work'}
                        </button>
                      )}
                      {t.status === 'in_progress' && (
                        <button onClick={() => setConfirmComplete(t)}
                          className="flex-1 text-xs font-semibold bg-emerald-100 text-emerald-700 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors">
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Accept Modal */}
      {confirmAccept && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-7 shadow-card-lg animate-slide-up">
            <h3 className="text-xl font-bold text-gray-900 mb-1 font-display">Accept this booking?</h3>
            <p className="text-sm text-gray-500 mb-1">Service: <strong>{confirmAccept.serviceName}</strong></p>
            <p className="text-sm text-gray-500 mb-5">Customer: {confirmAccept.customerName} · Qty: {confirmAccept.quantity}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAccept(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => acceptBooking(confirmAccept._id)} disabled={accepting === confirmAccept._id} className="btn-primary flex-1">
                {accepting === confirmAccept._id ? <Loader2 className="animate-spin" size={18} /> : 'Yes, Assign to Me'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Complete Modal */}
      {confirmComplete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-7 shadow-card-lg animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-emerald-500" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-1 font-display">Mark as Complete?</h3>
            <p className="text-sm text-gray-500 text-center mb-5">Confirm you've finished <strong>{confirmComplete.serviceName}</strong> for {confirmComplete.customerName}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmComplete(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => updateStatus(confirmComplete._id, 'completed')} disabled={updating === confirmComplete._id} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50">
                {updating === confirmComplete._id ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Yes, Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;
