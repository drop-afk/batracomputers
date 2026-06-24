import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, MessageSquare, Phone, Loader2, Star, IndianRupee, XCircle, Filter, Package, Download, FileText } from 'lucide-react';
import { formatWhatsAppUrl } from '../utils/phone';

const statusConfig = {
  pending: { label: 'Pending', class: 'badge-pending', icon: Clock },
  accepted: { label: 'Accepted', class: 'badge-accepted', icon: CheckCircle },
  in_progress: { label: 'In Progress', class: 'badge-in-progress', icon: AlertCircle },
  completed: { label: 'Completed', class: 'badge-completed', icon: CheckCircle },
  rejected: { label: 'Rejected', class: 'badge-rejected', icon: XCircle }
};

const MyTasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [updating, setUpdating] = useState(null);
  const [confirmComplete, setConfirmComplete] = useState(null);
  const [costEdit, setCostEdit] = useState(null);
  const [newCost, setNewCost] = useState('');

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get(`/bookings/worker/${user._id}`);
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      fetchTasks();
      if (status === 'completed') setConfirmComplete(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const saveFinalCost = async (id) => {
    try {
      await api.patch(`/bookings/${id}/final-cost`, { finalCost: Number(newCost) });
      setCostEdit(null);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update cost');
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = tasks.filter(t => {
    if (statusFilter === 'active') return ['accepted', 'in_progress'].includes(t.status);
    if (statusFilter === 'completed_today') return t.status === 'completed' && new Date(t.completedAt) >= today;
    if (statusFilter === 'all') return true;
    return true;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard" className="text-gray-600 hover:text-gray-900"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'active', label: 'Active' },
          { key: 'completed_today', label: 'Completed Today' },
          { key: 'all', label: 'All Time' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab.key ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary-600" size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 text-lg">No tasks found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(task => {
            const status = statusConfig[task.status];
            const StatusIcon = status.icon;
            return (
              <div key={task._id} className="card hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`badge ${status.class} flex items-center gap-1`}>
                      <StatusIcon size={12} /> {status.label}
                    </span>
                    <span className="text-sm text-gray-500">{format(new Date(task.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {costEdit === task._id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="input-field py-1 w-24 text-sm"
                          value={newCost}
                          onChange={(e) => setNewCost(e.target.value)}
                          autoFocus
                        />
                        <button onClick={() => saveFinalCost(task._id)} className="text-green-600 text-sm font-medium">Save</button>
                        <button onClick={() => setCostEdit(null)} className="text-gray-500 text-sm">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary-700">₹{task.finalCost || task.estimatedCost}</span>
                        {['accepted', 'in_progress'].includes(task.status) && (
                          <button
                            onClick={() => { setCostEdit(task._id); setNewCost(task.finalCost || task.estimatedCost); }}
                            className="text-xs text-gray-400 hover:text-primary-600"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Service</p>
                    <p className="font-semibold">{task.serviceName}</p>
                    <p className="text-sm text-gray-500">Qty: {task.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="font-semibold">{task.customerName}</p>
                      <a
                        href={formatWhatsAppUrl(task.customerPhone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                    >
                      <MessageSquare size={12} /> {task.customerPhone}
                    </a>
                  </div>
                </div>

                {task.specialRequirements && (
                  <p className="text-sm bg-yellow-50 p-2 rounded mb-3 text-yellow-800">
                    <strong>Note:</strong> {task.specialRequirements}
                  </p>
                )}

                {/* PDF Download for printing/photocopy tasks */}
                {task.fileUrl && (
                  <a
                    href={`${import.meta.env.VITE_API_URL || '/api'}/bookings/${task._id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    onClick={(e) => {
                      e.preventDefault();
                      const token = localStorage.getItem('token');
                      fetch(`${import.meta.env.VITE_API_URL || '/api'}/bookings/${task._id}/file`, {
                        headers: { Authorization: `Bearer ${token}` }
                      })
                        .then(r => r.blob())
                        .then(blob => {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = task.fileOriginalName || 'document.pdf';
                          a.click();
                          URL.revokeObjectURL(url);
                        })
                        .catch(() => alert('Failed to download file'));
                    }}
                    className="inline-flex items-center gap-2 w-full justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-sm py-2 px-4 rounded-lg transition-colors mb-3 border border-blue-200"
                  >
                    <Download size={15} />
                    <FileText size={14} />
                    Download Document to Print
                    {task.fileOriginalName && <span className="text-xs text-blue-500 truncate max-w-[160px]">({task.fileOriginalName})</span>}
                  </a>
                )}

                {/* Status Actions */}
                <div className="flex gap-2">
                  {task.status === 'accepted' && (
                    <button
                      onClick={() => updateStatus(task._id, 'in_progress')}
                      disabled={updating === task._id}
                      className="flex-1 bg-orange-100 text-orange-800 py-2 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <AlertCircle size={14} />
                      {updating === task._id ? 'Updating...' : 'Start Work'}
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <button
                      onClick={() => setConfirmComplete(task)}
                      className="flex-1 bg-green-100 text-green-800 py-2 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={14} /> Mark Complete
                    </button>
                  )}
                  {task.status === 'completed' && task.rating && (
                    <div className="flex items-center gap-1 bg-green-50 px-3 py-2 rounded-lg">
                      <Star size={14} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium text-green-800">{task.rating}/5</span>
                      {task.customerFeedback && <span className="text-xs text-gray-500 ml-2">"{task.customerFeedback}"</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Complete Modal */}
      {confirmComplete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-2">Mark as Complete?</h3>
            <p className="text-sm text-gray-500 mb-4">Confirm completion of <strong>{confirmComplete.serviceName}</strong> for {confirmComplete.customerName}?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmComplete(null)} className="flex-1 btn-secondary">Cancel</button>
              <button
                onClick={() => updateStatus(confirmComplete._id, 'completed')}
                disabled={updating === confirmComplete._id}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
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
