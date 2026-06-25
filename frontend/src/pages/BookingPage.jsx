import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  ArrowLeft, CheckCircle, Clock, IndianRupee, Loader2, Tag, Calendar,
  FileText, ArrowRight, LogIn, Upload, AlertCircle, Shield, ChevronRight, Zap, Star
} from 'lucide-react';
import ServiceTiles from '../components/ServiceTiles';
import FrontendMessage from '../components/FrontendMessage';

const BookingPage = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [pageError, setPageError] = useState('');
  const [step, setStep] = useState(1);
  const fileInputRef = useRef(null);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: { customerName: user?.name || '', customerEmail: user?.email || '', customerPhone: user?.phone || '' }
  });

  useEffect(() => {
    if (user?.role === 'worker') navigate('/dashboard');
    if (user?.role === 'owner') navigate('/admin');
  }, [user, navigate]);

  useEffect(() => {
    api.get('/services').then(r => {
      setServices(r.data);
      const initial = serviceId ? r.data.find(s => s._id === serviceId) : r.data[0];
      if (initial) { setSelectedService(initial); setValue('serviceId', initial._id); }
    }).catch(console.error).finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    if (serviceId && services.length > 0) {
      const svc = services.find(s => s._id === serviceId);
      if (svc) { setSelectedService(svc); setValue('serviceId', svc._id); }
    }
  }, [serviceId, services]);

  const estimatedCost = selectedService ? selectedService.basePrice * quantity : 0;
  const minDate = new Date().toISOString().split('T')[0];
  const requiresPdf = selectedService && ['photocopy', 'printing'].includes(selectedService.category);
  const maxDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFileError('');
    if (selectedFiles.length > 0) {
      if (files.length + selectedFiles.length > 5) {
        setFileError('You can upload up to 5 PDF files');
        e.target.value = '';
        return;
      }

      for (const selectedFile of selectedFiles) {
        const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          setFileError('Only PDF files are allowed'); e.target.value = ''; return;
        }
        if (selectedFile.size > 10 * 1024 * 1024) {
          setFileError('Each file must be under 10MB'); e.target.value = ''; return;
        }
      }
      setFiles(prev => [...prev, ...selectedFiles].slice(0, 5));
      e.target.value = '';
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, fileIndex) => fileIndex !== index));
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (data) => {
    setPageError('');
    if (requiresPdf && files.length === 0) {
      setFileError('A PDF file is required for this service. Please upload the document.');
      setStep(1); return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('customerName', data.customerName);
      formData.append('customerEmail', data.customerEmail);
      formData.append('customerPhone', data.customerPhone);
      formData.append('serviceId', data.serviceId);
      formData.append('quantity', Number(data.quantity));
      if (data.preferredDeadline) formData.append('preferredDeadline', data.preferredDeadline);
      if (data.specialRequirements) formData.append('specialRequirements', data.specialRequirements);
      files.forEach(uploadFile => formData.append('files', uploadFile));
      const res = await api.post('/bookings', formData);
      setBookingId(res.data._id); setShowSuccess(true);
    } catch (err) { setPageError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to create booking'); }
    finally { setLoading(false); }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
              <LogIn className="text-blue-600" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to Book</h2>
            <p className="text-sm text-gray-500 mb-6">Create a free account or sign in to book services and track your orders.</p>
            <div className="space-y-3">
              <Link to="/login" className="block w-full py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">Sign In</Link>
              <Link to="/signup" className="block w-full py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">Create Account</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showSuccess) return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="text-emerald-500" size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-sm text-gray-500 mb-6">Your request has been received. We'll assign a worker shortly and notify you.</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Booking ID</p>
            <p className="font-mono text-sm font-bold text-gray-700 break-all">{bookingId}</p>
          </div>
          <div className="space-y-3">
            <Link to="/my-bookings" className="block w-full py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">View My Bookings</Link>
            <button onClick={() => { setShowSuccess(false); setFiles([]); setFileError(''); setQuantity(1); }} className="block w-full py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">Book Another Service</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FrontendMessage message={pageError} onDismiss={() => setPageError('')} />
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6">
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Book a Service</h1>
          <p className="text-sm text-gray-500 mb-6">Select a service, fill in details, and we'll handle the rest</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Step 1: Service */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</div>
                <h3 className="font-semibold text-gray-900">Select Service</h3>
              </div>
              {!serviceId ? (
                fetching ? <div className="h-12 bg-gray-100 rounded-xl animate-pulse" /> : (
                  <div className="space-y-3">
                    <ServiceTiles services={services} selectedId={selectedService?._id} onSelect={(id) => { const svc = services.find(s => s._id === id); if (svc) { setSelectedService(svc); setValue('serviceId', id); } }} />
                    <input type="hidden" {...register('serviceId', { required: true })} />
                    {selectedService && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                          <Clock size={12} /> {selectedService.estimatedTime}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                          <Tag size={12} /> {selectedService.priceUnit}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                          <IndianRupee size={12} /> {selectedService.basePrice} per unit
                        </span>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  {fetching ? <div className="h-8 bg-blue-100/50 rounded-lg animate-pulse" /> : selectedService ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{selectedService.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{selectedService.estimatedTime} · {selectedService.priceUnit}</p>
                      </div>
                      <p className="text-xl font-bold text-blue-700">₹{selectedService.basePrice}</p>
                    </div>
                  ) : <p className="text-sm text-gray-500">Service not found.</p>}
                  <input type="hidden" {...register('serviceId', { required: true })} />
                </div>
              )}
            </div>

            {/* Step 2: Quantity & Schedule */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</div>
                <h3 className="font-semibold text-gray-900">Quantity & Schedule</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
                  <input type="number" min="1" max="1000" className={`w-full px-4 py-3 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all ${errors.quantity ? 'border-red-400' : 'border-gray-200'}`}
                    {...register('quantity', { required: true, min: 1 })} value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 1)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1"><Calendar size={13} /> Preferred Deadline <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="date" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" min={minDate} max={maxDate} {...register('preferredDeadline')} />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1"><FileText size={13} /> Special Requirements <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea rows={3} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none" placeholder="Double-sided, colour, A3 size, etc." {...register('specialRequirements')} />
              </div>
            </div>

            {/* Step 3: File Upload */}
            <div className={`bg-white rounded-2xl border shadow-sm p-6 ${requiresPdf && files.length === 0 && fileError ? 'border-red-300' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</div>
                <h3 className="font-semibold text-gray-900">Upload Document</h3>
                {requiresPdf ? <span className="text-red-500 text-xs font-semibold bg-red-50 px-2 py-0.5 rounded-full">Required</span> : <span className="text-gray-400 text-xs font-normal">(optional)</span>}
              </div>
              {requiresPdf && files.length === 0 && <p className="text-xs text-red-600 font-medium mb-3 flex items-center gap-1"><AlertCircle size={12} /> This service requires a PDF document</p>}
              <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${requiresPdf && files.length === 0 ? 'border-red-300 bg-red-50/50 hover:border-red-400' : files.length > 0 ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-200 hover:border-blue-300'}`}>
                <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" multiple onChange={handleFileChange} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer block">
                  {files.length > 0 ? (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <FileText size={20} className="text-emerald-600" />
                      <span className="font-medium text-gray-700">{files.length} PDF{files.length !== 1 ? 's' : ''} selected</span>
                      <span className="text-xs text-gray-400">Add more ({5 - files.length} left)</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={24} className={requiresPdf ? 'text-red-400' : 'text-gray-400'} />
                      <span className={`text-sm font-medium ${requiresPdf ? 'text-red-600' : 'text-gray-600'}`}>{requiresPdf ? 'Upload your PDFs (required)' : 'Click to upload PDFs'}</span>
                      <span className="text-xs text-gray-400">PDF only · Max 5 files · 10MB each</span>
                    </div>
                  )}
                </label>
              </div>
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((uploadFile, index) => (
                    <div key={`${uploadFile.name}-${uploadFile.lastModified}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className="text-emerald-600 flex-shrink-0" />
                        <span className="font-medium text-gray-700 truncate">{uploadFile.name}</span>
                        <span className="text-gray-400 flex-shrink-0">({(uploadFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                      </div>
                      <button type="button" onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700 font-medium flex-shrink-0">Remove</button>
                    </div>
                  ))}
                </div>
              )}
              {fileError && <p className="text-red-500 text-xs mt-2 font-medium">{fileError}</p>}
            </div>

            {/* Step 4: Your Details */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-bold">4</div>
                <h3 className="font-semibold text-gray-900">Your Details</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                  <input className={`w-full px-4 py-3 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all ${errors.customerName ? 'border-red-400' : 'border-gray-200'}`} placeholder="Your name" {...register('customerName', { required: 'Name is required' })} />
                  {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                  <input type="email" className={`w-full px-4 py-3 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all ${errors.customerEmail ? 'border-red-400' : 'border-gray-200'}`} placeholder="you@example.com" {...register('customerEmail', { required: 'Email is required' })} />
                  {errors.customerEmail && <p className="text-red-500 text-xs mt-1">{errors.customerEmail.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone *</label>
                  <input type="tel" className={`w-full px-4 py-3 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all ${errors.customerPhone ? 'border-red-400' : 'border-gray-200'}`} placeholder="+91 98765 43210" {...register('customerPhone', { required: 'Phone is required' })} />
                  {errors.customerPhone && <p className="text-red-500 text-xs mt-1">{errors.customerPhone.message}</p>}
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="animate-spin" size={18} /> Processing...</> : <><ArrowRight size={18} /> Confirm Booking</>}
            </button>
          </form>
        </div>

        {/* Sticky Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-5">Order Summary</h3>
              {selectedService ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Service</span>
                    <span className="font-semibold text-gray-900 text-right max-w-[55%]">{selectedService.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Unit Price</span>
                    <span className="font-semibold">₹{selectedService.basePrice}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Quantity</span>
                    <span className="font-semibold">{quantity}</span>
                  </div>
                  <div className="h-px bg-gray-100 my-1" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Estimated Total</span>
                    <span className="text-2xl font-bold text-blue-700">₹{estimatedCost}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">Final amount may vary based on actual work. Payment collected at pickup.</p>
                </div>
              ) : <p className="text-center text-sm text-gray-400 py-4">Select a service to see pricing</p>}
            </div>
            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-xs text-amber-700 font-semibold mb-1 flex items-center gap-1"><Shield size={12} /> Secure & Trusted</p>
              <p className="text-xs text-amber-600">Your data is protected. We serve thousands of customers in Rohtak.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
