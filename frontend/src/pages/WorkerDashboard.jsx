import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { areAllBookingFilesDownloaded, getBookingFiles, getFileDownloadKey } from '../utils/bookingFiles';
import {
  ClipboardList, CheckCircle, Clock, AlertCircle, Star, RefreshCw,
  TrendingUp, ArrowRight, Package, Zap, Timer, Download, FileText
} from 'lucide-react';
import FrontendMessage from '../components/FrontendMessage';

const statusConfig = {
  pending:     { label: 'New Request',   cls: 'bg-amber-50 text-amber-700 border-amber-200',     icon: Clock,         dot: 'bg-amber-500' },
  accepted:    { label: 'Assigned',      cls: 'bg-blue-50 text-blue-700 border-blue-200',       icon: CheckCircle,   dot: 'bg-blue-500' },
  in_progress: { label: 'In Progress',   cls: 'bg-orange-50 text-orange-700 border-orange-200', icon: Zap,           dot: 'bg-orange-500' },
  completed:   { label: 'Done',          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, dot: 'bg-emerald-500' },
  rejected:    { label: 'Declined',      cls: 'bg-red-50 text-red-700 border-red-200',           icon: AlertCircle,   dot: 'bg-red-500' },
};

const WorkerDashboard = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [stats, setStats] = useState({ completed: 0, pending: 0, rating: 0, total: 0, week: 0 });
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [confirmComplete, setConfirmComplete] = useState(null);
  const [confirmAccept, setConfirmAccept] = useState(null);
  const [downloadedFiles, setDownloadedFiles] = useState(new Set());
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [pageError, setPageError] = useState('');

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
        completed: analyticsRes.data.totalCompleted || 0,
        pending: pendingRes.data.length,
        rating: analyticsRes.data.avgRating || 0,
        total: analyticsRes.data.completedWeek || 0,
        week: analyticsRes.data.completedWeek || 0
      });
      setLastUpdated(new Date());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user?._id]);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const acceptBooking = async (id) => {
    setPageError('');
    setAccepting(id);
    try { await api.patch(`/bookings/${id}/accept`); fetchDashboard(); }
    catch (err) { setPageError(err.response?.data?.message || 'Failed to accept'); }
    finally { setAccepting(null); setConfirmAccept(null); }
  };

  const updateStatus = async (id, status) => {
    setPageError('');
    setUpdating(id);
    try { await api.patch(`/bookings/${id}/status`, { status }); fetchDashboard(); if (status === 'completed') setConfirmComplete(null); }
    catch (err) { setPageError(err.response?.data?.message || 'Failed to update'); }
    finally { setUpdating(null); }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const downloadTaskFile = (task, fileIndex) => {
    setPageError('');
    const file = getBookingFiles(task)[fileIndex];
    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/bookings/${task._id}/file/${fileIndex}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file?.originalName || 'document.pdf';
        a.click();
        URL.revokeObjectURL(url);
        setDownloadedFiles(prev => new Set(prev).add(getFileDownloadKey(task._id, fileIndex)));
      })
      .catch(() => setPageError('Failed to download file'));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FrontendMessage message={pageError} onDismiss={() => setPageError('')} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Worker Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {user?.name?.split(' ')[0]} · 
            <span className="inline-flex items-center gap-1.5 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live updates
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={fetchDashboard} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'This Week', value: stats.week, suffix: 'done', icon: TrendingUp, color: 'from-emerald-500 to-teal-500' },
          { label: 'Total Done', value: stats.completed, suffix: 'all time', icon: CheckCircle, color: 'from-blue-500 to-indigo-500' },
          { label: 'New Requests', value: stats.pending, suffix: 'pending', icon: ClipboardList, color: 'from-amber-500 to-orange-500' },
          { label: 'My Rating', value: stats.rating ? stats.rating.toFixed(1) : '—', suffix: '/5', icon: Star, color: 'from-violet-500 to-purple-500' },
        ].map(({ label, value, suffix, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label} <span className="text-gray-400">· {suffix}</span></p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Tasks */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Package size={16} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm">My Active Tasks</h2>
                  <p className="text-xs text-gray-400">Tasks assigned to you</p>
                </div>
              </div>
              <Link to="/dashboard/my-tasks" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="p-5">
                    <div className="h-4 bg-gray-100 rounded-lg w-3/4 mb-2 animate-pulse" />
                    <div className="h-3 bg-gray-100 rounded-lg w-1/2 animate-pulse" />
                  </div>
                ))
              ) : myTasks.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                    <Package size={24} className="text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">No active tasks</p>
                  <p className="text-xs text-gray-400 mt-1">Check new requests to pick up work</p>
                </div>
              ) : (
                myTasks.map(t => {
                  const st = statusConfig[t.status];
                  const Icon = st?.icon || Clock;
                  return (
                    <div key={t._id} className="p-5 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${st?.cls}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st?.dot}`} />
                              <Icon size={10} /> {st?.label}
                            </span>
                            <span className="text-xs text-gray-400">{formatTime(t.createdAt)}</span>
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm">{t.serviceName}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{t.customerName} · Qty {t.quantity} · <span className="font-semibold text-blue-600">₹{t.estimatedCost}</span></p>
                          {t.specialRequirements && (
                            <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded mt-2 inline-block">{t.specialRequirements}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {t.status === 'accepted' && (
                            <button
                              onClick={() => updateStatus(t._id, 'in_progress')}
                              disabled={updating === t._id}
                              className="text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50"
                            >
                              {updating === t._id ? 'Starting...' : <><Zap size={10} className="inline mr-1" /> Start Work</>}
                            </button>
                          )}
                          {t.status === 'in_progress' && (
                            <div className="flex flex-col items-end gap-2">
                              {getBookingFiles(t).length > 0 && !areAllBookingFilesDownloaded(t, downloadedFiles) && (
                                <span className="text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 flex items-center gap-1">
                                  <AlertCircle size={9} /> Download PDFs first
                                </span>
                              )}
                              <button
                                onClick={() => setConfirmComplete(t)}
                                disabled={getBookingFiles(t).length > 0 && !areAllBookingFilesDownloaded(t, downloadedFiles)}
                                className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <CheckCircle size={10} className="inline mr-1" /> Mark Done
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {getBookingFiles(t).length > 0 && t.status === 'in_progress' && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {getBookingFiles(t).map((file, index) => (
                            <button
                              key={`${file.url || file.originalName}-${index}`}
                              onClick={() => downloadTaskFile(t, index)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                            >
                              <Download size={12} /><FileText size={12} /> PDF {index + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* New Requests Panel */}
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <ClipboardList size={16} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm">New Requests</h2>
                  <p className="text-xs text-gray-400">Available to pick up</p>
                </div>
              </div>
              <Link to="/dashboard/pending" className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="p-4">
                    <div className="h-3 bg-gray-100 rounded-lg w-2/3 mb-2 animate-pulse" />
                    <div className="h-2.5 bg-gray-100 rounded-lg w-1/2 animate-pulse" />
                  </div>
                ))
              ) : pending.length === 0 ? (
                <div className="p-8 text-center">
                  <ClipboardList size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No new requests right now</p>
                </div>
              ) : (
                pending.map(b => (
                  <div key={b._id} className="p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{b.serviceName}</span>
                      <span className="text-xs font-bold text-blue-600">₹{b.estimatedCost}</span>
                    </div>
                    <p className="text-xs text-gray-500">{b.customerName} · Qty {b.quantity}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-gray-400">{formatTime(b.createdAt)}</span>
                      <button
                        onClick={() => setConfirmAccept(b)}
                        className="text-[10px] font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Accept Confirmation */}
      {confirmAccept && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Accept this request?</h3>
            <p className="text-sm text-gray-500 mb-4">
              <strong>{confirmAccept.serviceName}</strong> for {confirmAccept.customerName} · ₹{confirmAccept.estimatedCost}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAccept(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={() => acceptBooking(confirmAccept._id)} disabled={accepting === confirmAccept._id} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">
                {accepting === confirmAccept._id ? 'Accepting...' : 'Yes, Accept'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Confirmation */}
      {confirmComplete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-emerald-500" size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Mark as Done?</h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              Confirm completion of <strong>{confirmComplete.serviceName}</strong>
            </p>
            {getBookingFiles(confirmComplete).length > 0 && !areAllBookingFilesDownloaded(confirmComplete, downloadedFiles) && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mb-4 border border-red-100 text-center flex items-center justify-center gap-1">
                <AlertCircle size={11} /> Download all PDFs before completing
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setConfirmComplete(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors">Cancel</button>
              <button
                onClick={() => updateStatus(confirmComplete._id, 'completed')}
                disabled={updating === confirmComplete._id || (getBookingFiles(confirmComplete).length > 0 && !areAllBookingFilesDownloaded(confirmComplete, downloadedFiles))}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-40"
              >
                {updating === confirmComplete._id ? 'Completing...' : 'Yes, Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;
