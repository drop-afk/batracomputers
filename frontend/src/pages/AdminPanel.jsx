import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Plus, Pencil, Trash2, Star, CheckCircle, Clock, TrendingUp, Users, Package, Loader2, XCircle, IndianRupee, Save, X } from 'lucide-react';

const AdminPanel = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');
  const [services, setServices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', category: 'photocopy', basePrice: '', priceUnit: 'flat rate', estimatedTime: '15 mins', isActive: true });
  const [workerForm, setWorkerForm] = useState({ name: '', email: '', phone: '', password: '' });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [svcRes, workerRes, analyticsRes] = await Promise.all([
        api.get('/services'),
        api.get('/users/workers'),
        api.get('/analytics/dashboard')
      ]);
      setServices(svcRes.data);
      setWorkers(workerRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Admin fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const saveService = async () => {
    try {
      if (editingService) {
        await api.put(`/services/${editingService._id}`, serviceForm);
      } else {
        await api.post('/services', serviceForm);
      }
      setShowServiceForm(false);
      setEditingService(null);
      setServiceForm({ name: '', description: '', category: 'photocopy', basePrice: '', priceUnit: 'flat rate', estimatedTime: '15 mins', isActive: true });
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save service');
    }
  };

  const deleteService = async (id) => {
    if (!confirm('Deactivate this service?')) return;
    try {
      await api.delete(`/services/${id}`);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete service');
    }
  };

  const addWorker = async () => {
    try {
      await api.post('/users/workers', workerForm);
      setShowWorkerForm(false);
      setWorkerForm({ name: '', email: '', phone: '', password: '' });
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add worker');
    }
  };

  const toggleWorker = async (id, isActive) => {
    try {
      await api.patch(`/users/${id}`, { isActive: !isActive });
      fetchAll();
    } catch (err) {
      alert('Failed to update worker');
    }
  };

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'services', label: 'Services', icon: Package },
    { id: 'workers', label: 'Workers', icon: Users }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <span className="text-sm text-gray-500">{user?.name}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary-600" size={32} /></div>
      ) : (
        <>
          {/* Analytics Tab */}
          {activeTab === 'analytics' && analytics && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Today', value: analytics.counts.today, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'This Week', value: analytics.counts.week, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'This Month', value: analytics.counts.month, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Total', value: analytics.counts.total, icon: Package, color: 'text-gray-600', bg: 'bg-gray-50' },
                  { label: 'Completed', value: analytics.counts.completed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Pending', value: analytics.counts.pending, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' }
                ].map(stat => (
                  <div key={stat.label} className="card p-4">
                    <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-2`}>
                      <stat.icon size={18} className={stat.color} />
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="font-semibold mb-4">Popular Services</h3>
                  {analytics.popularServices.length === 0 ? (
                    <p className="text-gray-500 text-sm">No completed bookings yet</p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.popularServices.map((s, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                            <span className="text-sm font-medium">{s._id}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{s.count} bookings</p>
                            <p className="text-xs text-gray-500">₹{s.revenue || 0} revenue</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <h3 className="font-semibold mb-4">Worker Stats</h3>
                  {analytics.workers.length === 0 ? (
                    <p className="text-gray-500 text-sm">No workers</p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.workers.map(w => (
                        <div key={w._id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <Users size={14} className="text-gray-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{w.name}</p>
                              <p className="text-xs text-gray-500">{w.isActive ? 'Active' : 'Inactive'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{w.completedTasks} completed</p>
                            <div className="flex items-center gap-2 justify-end text-xs text-gray-500 my-0.5">
                              <span className="text-green-600 font-medium">{w.acceptedTasks || 0} Acc</span>
                              <span className="text-red-600 font-medium">{w.rejectedTasks || 0} Rej</span>
                            </div>
                            <div className="flex items-center gap-1 justify-end">
                              <Star size={12} className="text-yellow-500 fill-yellow-500" />
                              <span className="text-xs text-gray-500">{w.avgRating ? w.avgRating.toFixed(1) : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Services ({services.length})</h2>
                <button
                  onClick={() => { setEditingService(null); setServiceForm({ name: '', description: '', category: 'photocopy', basePrice: '', priceUnit: 'flat rate', estimatedTime: '15 mins', isActive: true }); setShowServiceForm(true); }}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <Plus size={16} /> Add Service
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map(s => (
                  <div key={s._id} className={`card p-4 ${!s.isActive ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{s.name}</h3>
                      <span className="text-sm font-bold text-primary-700">₹{s.basePrice}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{s.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <span className="capitalize bg-gray-100 px-2 py-0.5 rounded">{s.category}</span>
                      <span>{s.priceUnit}</span>
                      <span>{s.estimatedTime}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingService(s); setServiceForm({ ...s, basePrice: String(s.basePrice) }); setShowServiceForm(true); }}
                        className="flex-1 bg-gray-100 text-gray-700 py-1.5 rounded text-xs font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => deleteService(s._id)}
                        className="flex-1 bg-red-50 text-red-700 py-1.5 rounded text-xs font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <Trash2 size={12} /> Deactivate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workers Tab */}
          {activeTab === 'workers' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Workers ({workers.length})</h2>
                <button
                  onClick={() => setShowWorkerForm(true)}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <Plus size={16} /> Add Worker
                </button>
              </div>
              <div className="grid gap-3">
                {workers.map(w => (
                  <div key={w._id} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <Users size={18} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{w.name}</p>
                        <p className="text-sm text-gray-500">{w.email} • {w.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{w.completedTasks} completed</p>
                        <div className="flex items-center gap-3 justify-end text-xs my-1">
                          <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">{w.acceptedTasks || 0} Accepted</span>
                          <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">{w.rejectedTasks || 0} Rejected</span>
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                          <span className="text-sm text-gray-500">{w.avgRating ? w.avgRating.toFixed(1) : 'N/A'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleWorker(w._id, w.isActive)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          w.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {w.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Service Form Modal */}
      {showServiceForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingService ? 'Edit Service' : 'Add Service'}</h3>
              <button onClick={() => setShowServiceForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input className="input-field" value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input className="input-field" value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select className="input-field" value={serviceForm.category} onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })}>
                    {['photocopy', 'homework', 'printing', 'tickets', 'other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (₹)</label>
                  <input type="number" className="input-field" value={serviceForm.basePrice} onChange={e => setServiceForm({ ...serviceForm, basePrice: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Unit</label>
                  <select className="input-field" value={serviceForm.priceUnit} onChange={e => setServiceForm({ ...serviceForm, priceUnit: e.target.value })}>
                    <option value="per page">per page</option>
                    <option value="flat rate">flat rate</option>
                    <option value="per hour">per hour</option>
                    <option value="per item">per item</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Time</label>
                  <input className="input-field" value={serviceForm.estimatedTime} onChange={e => setServiceForm({ ...serviceForm, estimatedTime: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowServiceForm(false)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={saveService} className="flex-1 btn-primary flex items-center justify-center gap-2">
                <Save size={16} /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Worker Form Modal */}
      {showWorkerForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Add Worker</h3>
              <button onClick={() => setShowWorkerForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input className="input-field" value={workerForm.name} onChange={e => setWorkerForm({ ...workerForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input-field" value={workerForm.email} onChange={e => setWorkerForm({ ...workerForm, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input className="input-field" value={workerForm.phone} onChange={e => setWorkerForm({ ...workerForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" className="input-field" value={workerForm.password} onChange={e => setWorkerForm({ ...workerForm, password: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowWorkerForm(false)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={addWorker} className="flex-1 btn-primary flex items-center justify-center gap-2">
                <Plus size={16} /> Add Worker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;