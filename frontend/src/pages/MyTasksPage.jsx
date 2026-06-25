import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { areAllBookingFilesDownloaded, getBookingFiles, getFileDownloadKey } from '../utils/bookingFiles';
import {
  ArrowLeft, CheckCircle, Clock, AlertCircle, Star, Loader2, XCircle,
  Filter, Package, Search, Download, FileText, IndianRupee, Eye, Zap
} from 'lucide-react';
import FrontendMessage from '../components/FrontendMessage';
import PickupSlotFields from '../components/PickupSlotFields';
import PickupNotifications from '../components/PickupNotifications';

const statusConfig = {
  pending:     { label: 'Pending',     class: 'bg-amber-50 text-amber-700 border-amber-200',     icon: Clock,         dot: 'bg-amber-500' },
  accepted:    { label: 'Accepted',    class: 'bg-blue-50 text-blue-700 border-blue-200',       icon: CheckCircle,   dot: 'bg-blue-500' },
  in_progress: { label: 'Working',     class: 'bg-orange-50 text-orange-700 border-orange-200', icon: Zap,           dot: 'bg-orange-500' },
  completed:   { label: 'Completed',   class: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, dot: 'bg-emerald-500' },
  rejected:    { label: 'Rejected',    class: 'bg-red-50 text-red-700 border-red-200',           icon: XCircle,       dot: 'bg-red-500' },
};

const MyTasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState(null);
  const [confirmComplete, setConfirmComplete] = useState(null);
  const [costEdit, setCostEdit] = useState(null);
  const [newCost, setNewCost] = useState('');
  const [downloadedFiles, setDownloadedFiles] = useState(new Set());
  const [selectedTask, setSelectedTask] = useState(null);
  const [pageError, setPageError] = useState('');
  const [pickupSlots, setPickupSlots] = useState([]);

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try { const res = await api.get(`/bookings/worker/${user._id}`); setTasks(res.data); }
    catch (err) { console.error('Failed to fetch tasks', err); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    setPageError('');
    setUpdating(id);
    try {
      const payload = { status };
      if (status === 'completed') {
        payload.pickupSlots = pickupSlots
          .filter(slot => slot.date)
          .map(slot => ({ date: new Date(slot.date).toISOString(), note: slot.note }));
      }
      await api.patch(`/bookings/${id}/status`, payload);
      fetchTasks();
      if (status === 'completed') { setConfirmComplete(null); setPickupSlots([]); }
    }
    catch (err) { setPageError(err.response?.data?.message || 'Failed to update'); }
    finally { setUpdating(null); }
  };

  const saveFinalCost = async (id) => {
    setPageError('');
    try { await api.patch(`/bookings/${id}/final-cost`, { finalCost: Number(newCost) }); setCostEdit(null); fetchTasks(); }
    catch (err) { setPageError(err.response?.data?.message || 'Failed to update cost'); }
  };

  const downloadTaskFile = (task, fileIndex) => {
    setPageError('');
    const file = getBookingFiles(task)[fileIndex];
    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/bookings/${task._id}/file/${fileIndex}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob()).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = file?.originalName || 'document.pdf'; a.click(); URL.revokeObjectURL(url);
        setDownloadedFiles(prev => new Set(prev).add(getFileDownloadKey(task._id, fileIndex)));
      }).catch(() => setPageError('Failed to download'));
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const filtered = tasks.filter(t => {
    if (statusFilter === 'active') return ['accepted', 'in_progress'].includes(t.status);
    if (statusFilter === 'completed_today') return t.status === 'completed' && new Date(t.completedAt) >= today;
    if (statusFilter === 'completed') return t.status === 'completed';
    if (statusFilter === 'all') return true;
    return true;
  }).filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.serviceName.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q);
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const stats = {
    active: tasks.filter(t => ['accepted', 'in_progress'].includes(t.status)).length,
    completed: tasks.filter(t => t.status === 'completed').length,
    rejected: tasks.filter(t => t.status === 'rejected').length,
    pending: tasks.filter(t => t.status === 'pending').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FrontendMessage message={pageError} onDismiss={() => setPageError('')} />
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard" className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-sm text-gray-500">All your assigned work in one place</p>
        </div>
      </div>

      <PickupNotifications bookings={tasks} onRefresh={fetchTasks} onError={setPageError} />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active', value: stats.active, color: 'bg-blue-50 text-blue-700', icon: Zap },
          { label: 'Completed', value: stats.completed, color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
          { label: 'Rejected', value: stats.rejected, color: 'bg-red-50 text-red-700', icon: XCircle },
          { label: 'Pending', value: stats.pending, color: 'bg-amber-50 text-amber-700', icon: Clock },
        ].map(s => (
          <div key={s.label} className={`rounded-xl ${s.color} px-4 py-3 flex items-center gap-3`}>
            <s.icon size={16} />
            <div>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] opacity-70 font-medium uppercase tracking-wide">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'active', label: 'Active' },
            { key: 'completed_today', label: 'Done Today' },
            { key: 'completed', label: 'All Done' },
            { key: 'all', label: 'All Tasks' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${statusFilter === tab.key ? 'bg-gray-900 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all" />
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-gray-400" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="mx-auto text-gray-200 mb-4" size={48} />
          <p className="text-gray-500 font-medium">No tasks found</p>
          <p className="text-sm text-gray-400 mt-1">Try a different filter or search</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(task => {
            const status = statusConfig[task.status];
            const StatusIcon = status.icon;
            return (
              <div key={task._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.class}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        <StatusIcon size={10} /> {status.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(task.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {task.status === 'completed' && task.completedAt && (
                        <span className="text-xs text-emerald-600 font-medium">
                          Done {new Date(task.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">{task.serviceName}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{task.customerName} · Qty {task.quantity}</p>
                    {task.specialRequirements && (
                      <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded mt-2 inline-block">{task.specialRequirements}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {costEdit === task._id ? (
                      <div className="flex items-center gap-2">
                        <input type="number" className="w-24 px-2 py-1 text-sm rounded-lg border border-gray-200" value={newCost} onChange={e => setNewCost(e.target.value)} autoFocus />
                        <button onClick={() => saveFinalCost(task._id)} className="text-xs text-emerald-600 font-semibold">Save</button>
                        <button onClick={() => setCostEdit(null)} className="text-xs text-gray-500">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-lg">₹{task.finalCost || task.estimatedCost}</span>
                        {['accepted', 'in_progress'].includes(task.status) && (
                          <button onClick={() => { setCostEdit(task._id); setNewCost(task.finalCost || task.estimatedCost); }}
                            className="text-xs text-gray-400 hover:text-blue-600 transition-colors">Edit</button>
                        )}
                      </div>
                    )}
                    <button onClick={() => setSelectedTask(task)} className="text-xs text-blue-600 font-medium hover:text-blue-700 mt-1 flex items-center gap-1 justify-end">
                      <Eye size={11} /> View Details
                    </button>
                  </div>
                </div>

                {/* PDF Download */}
                {getBookingFiles(task).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {getBookingFiles(task).map((file, index) => (
                      <button
                        key={`${file.url || file.originalName}-${index}`}
                        onClick={() => downloadTaskFile(task, index)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                      >
                        <Download size={12} /><FileText size={12} /> PDF {index + 1}
                      </button>
                    ))}
                  </div>
                )}
                {getBookingFiles(task).length > 0 && task.status === 'in_progress' && !areAllBookingFilesDownloaded(task, downloadedFiles) && (
                  <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded mt-2 inline-flex items-center gap-1 border border-red-100">
                    <AlertCircle size={10} /> Download all PDFs before completing
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {task.status === 'accepted' && (
                    <button onClick={() => updateStatus(task._id, 'in_progress')} disabled={updating === task._id}
                      className="flex-1 text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 py-2 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                      <Zap size={12} /> {updating === task._id ? 'Starting...' : 'Start Work'}
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <button onClick={() => { setConfirmComplete(task); setPickupSlots([]); }}
                      disabled={getBookingFiles(task).length > 0 && !areAllBookingFilesDownloaded(task, downloadedFiles)}
                      className="flex-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 py-2 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
                      <CheckCircle size={12} /> Mark Complete
                    </button>
                  )}
                  {task.status === 'completed' && task.rating && (
                    <div className="flex items-center gap-1 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                      <Star size={13} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium text-emerald-800">{task.rating}/5</span>
                      {task.customerFeedback && <span className="text-xs text-gray-500 ml-1">"{task.customerFeedback}"</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Task Details</h3>
              <button onClick={() => setSelectedTask(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><XCircle size={18} /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-400 mb-1">Service</p><p className="font-semibold text-gray-900">{selectedTask.serviceName}</p></div>
                <div><p className="text-xs text-gray-400 mb-1">Quantity</p><p className="font-semibold text-gray-900">{selectedTask.quantity}</p></div>
                <div><p className="text-xs text-gray-400 mb-1">Customer</p><p className="font-semibold text-gray-900">{selectedTask.customerName}</p></div>
                <div><p className="text-xs text-gray-400 mb-1">Phone</p><p className="font-semibold text-gray-900">{selectedTask.customerPhone}</p></div>
                <div><p className="text-xs text-gray-400 mb-1">Cost</p><p className="font-semibold text-gray-900">₹{selectedTask.finalCost || selectedTask.estimatedCost}</p></div>
                <div><p className="text-xs text-gray-400 mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusConfig[selectedTask.status].class}`}>
                    {React.createElement(statusConfig[selectedTask.status].icon, { size: 10 })} {statusConfig[selectedTask.status].label}
                  </span>
                </div>
              </div>
              {selectedTask.specialRequirements && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <p className="text-xs text-amber-700 font-medium mb-1">Special Requirements</p>
                  <p className="text-sm text-amber-800">{selectedTask.specialRequirements}</p>
                </div>
              )}
              {getBookingFiles(selectedTask).length > 0 && (
                <div className="space-y-2">
                  {getBookingFiles(selectedTask).map((file, index) => (
                    <button
                      key={`${file.url || file.originalName}-${index}`}
                      onClick={() => downloadTaskFile(selectedTask, index)}
                      className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      <Download size={14} /><FileText size={14} /> Download {file.originalName || `PDF ${index + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Complete Confirmation */}
      {confirmComplete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Mark as Complete?</h3>
            <p className="text-sm text-gray-500 mb-4">Confirm completion of <strong>{confirmComplete.serviceName}</strong> for {confirmComplete.customerName}</p>
            {getBookingFiles(confirmComplete).length > 0 && !areAllBookingFilesDownloaded(confirmComplete, downloadedFiles) && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mb-4 border border-red-100 flex items-center gap-1">
                <AlertCircle size={11} /> Download all PDFs before completing
              </p>
            )}
            <PickupSlotFields slots={pickupSlots} onChange={setPickupSlots} />
            <div className="flex gap-3">
              <button onClick={() => setConfirmComplete(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={() => updateStatus(confirmComplete._id, 'completed')}
                disabled={updating === confirmComplete._id || (getBookingFiles(confirmComplete).length > 0 && !areAllBookingFilesDownloaded(confirmComplete, downloadedFiles))}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-40">
                {updating === confirmComplete._id ? 'Completing...' : 'Yes, Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTasksPage;
