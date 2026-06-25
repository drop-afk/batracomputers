import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Plus, Pencil, Trash2, Star, CheckCircle, Clock, TrendingUp, Users, Package,
  Loader2, XCircle, IndianRupee, Save, X, BarChart3, Percent, ArrowUpCircle,
  ArrowDownCircle, FileCheck, AlertTriangle, ChevronRight, Shield, Eye, Search, Filter,
  ChevronDown, ChevronUp, Calendar, Phone, Mail, MapPin, Zap, ArrowLeft, RefreshCw
} from 'lucide-react';
import FrontendMessage from '../components/FrontendMessage';

const AdminPanel = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [services, setServices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [workerReport, setWorkerReport] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', category: 'photocopy', basePrice: '', priceUnit: 'flat rate', estimatedTime: '15 mins', isActive: true });
  const [workerForm, setWorkerForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [searchWorker, setSearchWorker] = useState('');
  const [searchBooking, setSearchBooking] = useState('');
  const [bookingFilter, setBookingFilter] = useState('all');
  const [expandedWorker, setExpandedWorker] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [serviceToDeactivate, setServiceToDeactivate] = useState(null);
  const [pageError, setPageError] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [svcRes, workerRes, analyticsRes, reportRes, bookingsRes] = await Promise.all([
        api.get('/services'),
        api.get('/users/workers'),
        api.get('/analytics/dashboard'),
        api.get('/analytics/workers-report'),
        api.get('/bookings/all')
      ]);
      setServices(svcRes.data);
      setWorkers(workerRes.data);
      setAnalytics(analyticsRes.data);
      setWorkerReport(reportRes.data.report);
      setAllBookings(bookingsRes.data);
    } catch (err) { console.error('Admin fetch error', err); }
    finally { setLoading(false); }
  };

  const saveService = async () => {
    setPageError('');
    try {
      if (editingService) { await api.put(`/services/${editingService._id}`, serviceForm); }
      else { await api.post('/services', serviceForm); }
      setShowServiceForm(false); setEditingService(null); setServiceForm({ name: '', description: '', category: 'photocopy', basePrice: '', priceUnit: 'flat rate', estimatedTime: '15 mins', isActive: true });
      fetchAll();
    } catch (err) { setPageError(err.response?.data?.message || 'Failed to save service'); }
  };

  const deleteService = async (id) => {
    setPageError('');
    try { await api.delete(`/services/${id}`); setServiceToDeactivate(null); fetchAll(); }
    catch (err) { setPageError(err.response?.data?.message || 'Failed to deactivate service'); }
  };

  const addWorker = async () => {
    setPageError('');
    try { await api.post('/users/workers', workerForm); setShowWorkerForm(false); setWorkerForm({ name: '', email: '', phone: '', password: '' }); fetchAll(); }
    catch (err) { setPageError(err.response?.data?.message || 'Failed to add worker'); }
  };

  const toggleWorker = async (id, isActive) => {
    setPageError('');
    try { await api.patch(`/users/${id}`, { isActive: !isActive }); fetchAll(); }
    catch (err) { setPageError(err.response?.data?.message || 'Failed to update worker'); }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'workers', label: 'Workers', icon: Users },
    { id: 'services', label: 'Services', icon: Package },
    { id: 'bookings', label: 'All Bookings', icon: Calendar },
  ];

  const filteredWorkers = workerReport?.filter(w => w.name.toLowerCase().includes(searchWorker.toLowerCase())) || [];

  const filteredBookings = allBookings.filter(b => {
    if (bookingFilter !== 'all' && b.status !== bookingFilter) return false;
    if (!searchBooking) return true;
    const q = searchBooking.toLowerCase();
    return b.customerName?.toLowerCase().includes(q) || b.serviceName?.toLowerCase().includes(q) || b.status?.includes(q);
  }).slice(0, 50);

  const statusBadge = (status) => {
    const config = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      accepted: 'bg-blue-50 text-blue-700 border-blue-200',
      in_progress: 'bg-orange-50 text-orange-700 border-orange-200',
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
    };
    return config[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FrontendMessage message={pageError} onDismiss={() => setPageError('')} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Owner Dashboard</h1>
            <p className="text-xs text-gray-500">Manage your business, workers, and bookings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <span className="text-xs text-gray-400">{user?.name}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-gray-400" size={32} /></div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && analytics && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Today', value: analytics.counts.today, icon: Clock, color: 'bg-blue-50 text-blue-600' },
                  { label: 'This Week', value: analytics.counts.week, icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
                  { label: 'This Month', value: analytics.counts.month, icon: BarChart3, color: 'bg-violet-50 text-violet-600' },
                  { label: 'Total', value: analytics.counts.total, icon: Package, color: 'bg-gray-50 text-gray-600' },
                  { label: 'Completed', value: analytics.counts.completed, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
                  { label: 'Pending', value: analytics.counts.pending, icon: Clock, color: 'bg-amber-50 text-amber-600' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className={`w-9 h-9 ${stat.color.split(' ')[0]} rounded-xl flex items-center justify-center mb-3`}>
                      <stat.icon size={16} className={stat.color.split(' ')[1]} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Popular Services */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Zap size={16} className="text-blue-600" /> Popular Services</h3>
                  {analytics.popularServices.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No completed bookings yet</p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.popularServices.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 bg-gray-900 text-white rounded-lg flex items-center justify-center text-xs font-bold">{i + 1}</span>
                            <span className="text-sm font-medium text-gray-900">{s._id}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{s.count} bookings</p>
                            <p className="text-xs text-gray-400">₹{s.revenue || 0} revenue</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Worker Snapshot */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Users size={16} className="text-blue-600" /> Worker Snapshot</h3>
                  {analytics.workers.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No workers</p> : (
                    <div className="space-y-3">
                      {analytics.workers.slice(0, 5).map(w => (
                        <div key={w._id} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${w.isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{w.name?.charAt(0)}</div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{w.name}</p>
                              <p className="text-xs text-gray-400">{w.isActive ? 'Active' : 'Inactive'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{w.completedTasks} done</p>
                            <div className="flex items-center gap-2 justify-end text-xs text-gray-400 mt-0.5">
                              <span className="text-emerald-600 font-medium">{w.acceptedTasks || 0} accepted</span>
                              <span className="text-red-600 font-medium">{w.rejectedTasks || 0} rejected</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {analytics.workers.length > 5 && (
                        <button onClick={() => setActiveTab('workers')} className="text-xs text-blue-600 font-medium text-center w-full py-2 hover:text-blue-700">View all workers</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* WORKERS TAB */}
          {activeTab === 'workers' && workerReport && (
            <div className="space-y-6">
              {/* Worker Stats Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Workers', value: workerReport.length, icon: Users, color: 'bg-blue-50 text-blue-600' },
                  { label: 'Active', value: workerReport.filter(w => w.isActive).length, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
                  { label: 'Avg Acceptance', value: `${workerReport.length > 0 ? Math.round(workerReport.reduce((s, w) => s + w.rates.acceptanceRate, 0) / workerReport.length) : 0}%`, icon: ArrowUpCircle, color: 'bg-emerald-50 text-emerald-600' },
                  { label: 'Total Revenue', value: `₹${workerReport.reduce((s, w) => s + w.performance.totalRevenue, 0)}`, icon: IndianRupee, color: 'bg-amber-50 text-amber-600' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className={`w-9 h-9 ${stat.color.split(' ')[0]} rounded-xl flex items-center justify-center mb-3`}>
                      <stat.icon size={16} className={stat.color.split(' ')[1]} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Worker List */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="font-semibold text-gray-900">Worker Performance</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" placeholder="Search workers..." value={searchWorker} onChange={e => setSearchWorker(e.target.value)}
                        className="pl-8 pr-3 py-1.5 rounded-lg text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
                    </div>
                    <button onClick={() => setShowWorkerForm(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1">
                      <Plus size={12} /> Add Worker
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {filteredWorkers.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No workers found</p>
                  ) : (
                    filteredWorkers.map(w => (
                      <div key={w._id} className="p-5 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${w.isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{w.name?.charAt(0)}</div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{w.name}</p>
                              <p className="text-xs text-gray-400">{w.phone} · Joined {new Date(w.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${w.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{w.isActive ? 'Active' : 'Inactive'}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">{w.stats.completed}</p>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Completed</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">{w.rates.acceptanceRate}%</p>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Acceptance</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">{w.performance.avgRating || '—'}</p>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Rating</p>
                            </div>
                            <button onClick={() => setExpandedWorker(expandedWorker === w._id ? null : w._id)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                              {expandedWorker === w._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedWorker === w._id && (
                          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400 uppercase tracking-wide">Assigned</p>
                              <p className="text-lg font-bold text-gray-900">{w.stats.totalAssigned}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400 uppercase tracking-wide">Rejected</p>
                              <p className="text-lg font-bold text-red-600">{w.stats.rejected}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400 uppercase tracking-wide">Revenue</p>
                              <p className="text-lg font-bold text-emerald-600">₹{w.performance.totalRevenue}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400 uppercase tracking-wide">Completion</p>
                              <p className="text-lg font-bold text-blue-600">{w.rates.completionRate}%</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400 uppercase tracking-wide">Today</p>
                              <p className="text-lg font-bold text-gray-900">{w.stats.completedToday}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400 uppercase tracking-wide">This Week</p>
                              <p className="text-lg font-bold text-gray-900">{w.stats.completedWeek}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400 uppercase tracking-wide">This Month</p>
                              <p className="text-lg font-bold text-gray-900">{w.stats.completedMonth}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400 uppercase tracking-wide">Rated Jobs</p>
                              <p className="text-lg font-bold text-gray-900">{w.performance.totalRated}</p>
                            </div>
                            <div className="col-span-2 sm:col-span-4 flex gap-2 mt-2">
                              <button onClick={() => toggleWorker(w._id, w.isActive)} className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${w.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                                {w.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SERVICES TAB */}
          {activeTab === 'services' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Services ({services.length})</h2>
                <button onClick={() => { setEditingService(null); setServiceForm({ name: '', description: '', category: 'photocopy', basePrice: '', priceUnit: 'flat rate', estimatedTime: '15 mins', isActive: true }); setShowServiceForm(true); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1">
                  <Plus size={12} /> Add Service
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map(s => (
                  <div key={s._id} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 transition-all hover:shadow-md ${!s.isActive ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{s.name}</h3>
                      <span className="text-sm font-bold text-blue-700">₹{s.basePrice}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{s.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                      <span className="capitalize bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">{s.category}</span>
                      <span>{s.priceUnit}</span>
                      <span>{s.estimatedTime}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingService(s); setServiceForm({ ...s, basePrice: String(s.basePrice) }); setShowServiceForm(true); }}
                        className="flex-1 bg-gray-50 text-gray-700 py-2 rounded-xl text-xs font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-1">
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => setServiceToDeactivate(s)} className="flex-1 bg-red-50 text-red-700 py-2 rounded-xl text-xs font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1">
                        <Trash2 size={12} /> Deactivate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOOKINGS TAB */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 sm:max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search bookings..." value={searchBooking} onChange={e => setSearchBooking(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" />
                </div>
                <select value={bookingFilter} onChange={e => setBookingFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-left">
                        <th className="px-4 py-3 font-medium">Service</th>
                        <th className="px-4 py-3 font-medium">Customer</th>
                        <th className="px-4 py-3 font-medium text-center">Qty</th>
                        <th className="px-4 py-3 font-medium text-right">Cost</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Created</th>
                        <th className="px-4 py-3 font-medium">Assigned To</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredBookings.map(b => (
                        <tr key={b._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{b.serviceName}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-900">{b.customerName}</p>
                            <p className="text-xs text-gray-400">{b.customerPhone}</p>
                          </td>
                          <td className="px-4 py-3 text-center font-medium">{b.quantity}</td>
                          <td className="px-4 py-3 text-right font-medium">₹{b.finalCost || b.estimatedCost}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusBadge(b.status)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'pending' || b.status === 'in_progress' ? 'animate-pulse' : ''}`} />
                              {b.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{formatDate(b.createdAt)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{b.assignedWorkerName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredBookings.length === 0 && (
                  <div className="text-center py-10">
                    <AlertTriangle className="mx-auto text-gray-300 mb-3" size={32} />
                    <p className="text-sm text-gray-400">No bookings match your filters</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {serviceToDeactivate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Deactivate service?</h3>
            <p className="text-sm text-gray-500 mb-5">
              <strong>{serviceToDeactivate.name}</strong> will no longer be available for new bookings.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setServiceToDeactivate(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={() => deleteService(serviceToDeactivate._id)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Deactivate</button>
            </div>
          </div>
        </div>
      )}

      {/* Service Form Modal */}
      {showServiceForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingService ? 'Edit Service' : 'Add Service'}</h3>
              <button onClick={() => setShowServiceForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label><input className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label><input className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <select className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" value={serviceForm.category} onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })}>
                    {['photocopy', 'homework', 'printing', 'tickets', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Base Price (₹)</label><input type="number" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" value={serviceForm.basePrice} onChange={e => setServiceForm({ ...serviceForm, basePrice: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Price Unit</label>
                  <select className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" value={serviceForm.priceUnit} onChange={e => setServiceForm({ ...serviceForm, priceUnit: e.target.value })}>
                    <option>per page</option><option>flat rate</option><option>per hour</option><option>per item</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Time</label><input className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" value={serviceForm.estimatedTime} onChange={e => setServiceForm({ ...serviceForm, estimatedTime: e.target.value })} /></div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowServiceForm(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={saveService} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"><Save size={14} /> Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Worker Form Modal */}
      {showWorkerForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Add Worker</h3>
              <button onClick={() => setShowWorkerForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label><input className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" value={workerForm.name} onChange={e => setWorkerForm({ ...workerForm, name: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label><input type="email" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" value={workerForm.email} onChange={e => setWorkerForm({ ...workerForm, email: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label><input className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" value={workerForm.phone} onChange={e => setWorkerForm({ ...workerForm, phone: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Password (min 8 chars, 1 number)</label><input type="password" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" value={workerForm.password} onChange={e => setWorkerForm({ ...workerForm, password: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowWorkerForm(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={addWorker} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"><Plus size={14} /> Add Worker</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
