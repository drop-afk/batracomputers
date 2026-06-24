import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { ArrowLeft, CheckCircle, Clock, IndianRupee, Loader2, Tag, Calendar, FileText, ArrowRight, LogIn, Upload } from 'lucide-react';
import ServiceTiles from '../components/ServiceTiles';

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
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: { customerName: user?.name || '', customerEmail: user?.email || '', customerPhone: user?.phone || '' }
  });

  // Redirect workers/owners away from booking page
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

  const handleServiceChange = (e) => {
    const svc = services.find(s => s._id === e.target.value);
    setSelectedService(svc); setValue('serviceId', e.target.value);
  };

  const handleServiceSelect = (id) => {
    const svc = services.find(s => s._id === id);
    if (svc) { setSelectedService(svc); setValue('serviceId', id); }
  };

  const estimatedCost = selectedService ? selectedService.basePrice * quantity : 0;
  const minDate = new Date().toISOString().split('T')[0];

  // PDF upload is mandatory for photocopy and printing services
  const requiresPdf = selectedService && ['photocopy', 'printing'].includes(selectedService.category);
  const maxDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFileError('');
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setFileError('Only PDF files are allowed');
        setFile(null);
        e.target.value = '';
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setFileError('File size must be under 10MB');
        setFile(null);
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
    }
  };

  const onSubmit = async (data) => {
    // Enforce mandatory PDF for photocopy/printing
    if (requiresPdf && !file) {
      setFileError('A PDF file is required for this service. Please upload the document you want printed/photocopied.');
      document.getElementById('file-upload-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
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
      if (file) formData.append('file', file);

      const res = await api.post('/bookings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setBookingId(res.data._id);
      setShowSuccess(true);
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to create booking');
    } finally { setLoading(false); }
  };

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center animate-slide-up">
          <div className="card p-10">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-6">
              <LogIn className="text-primary-600" size={44} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 font-display">Sign in to Book</h2>
            <p className="text-gray-500 mb-6">You need to be logged in to book a service. It's free and takes just a minute.</p>
            <div className="space-y-3">
              <Link to="/login" className="btn-primary w-full justify-center py-3">Sign In <ArrowRight size={16} /></Link>
              <Link to="/signup" className="btn-secondary w-full justify-center py-3">Create an Account</Link>
              <Link to="/" className="block text-sm text-gray-400 hover:text-gray-600 mt-2">Back to Home</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showSuccess) return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center animate-slide-up">
        <div className="card p-10">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-emerald-500" size={44} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 font-display">Booking Confirmed!</h2>
          <p className="text-gray-500 mb-6">Your request has been received. A worker will be assigned shortly.</p>
          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5 mb-6 text-left">
            <p className="text-xs text-primary-500 font-semibold uppercase tracking-wider mb-1">Booking ID</p>
            <p className="font-mono text-sm font-bold text-primary-800 break-all">{bookingId}</p>
          </div>
          <div className="space-y-3">
            <Link to="/my-bookings" className="btn-primary w-full justify-center py-3">View My Bookings <ArrowRight size={16} /></Link>
            <button onClick={() => { setShowSuccess(false); navigate('/'); }} className="btn-secondary w-full justify-center py-3">Back to Home</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="section py-8 animate-fade-in">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6">
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 font-display">Book a Service</h1>
            <p className="text-gray-500 mt-1">Fill in the details and we'll get it done</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {!serviceId ? (
              <div className="card">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-bold">1</div>
                  Select Service
                </h3>
                {fetching ? <div className="h-12 bg-gray-100 rounded-xl animate-pulse" /> : (
                  <div className="space-y-3">
                    <ServiceTiles services={services} selectedId={selectedService?._id} onSelect={handleServiceSelect} />
                    <input type="hidden" {...register('serviceId', { required: true })} />
                    {selectedService && (
                      <div className="flex flex-wrap gap-4 mt-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                          <Clock size={12} /> {selectedService.estimatedTime}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                          <Tag size={12} /> {selectedService.priceUnit}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="card bg-primary-50 border-primary-100">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-bold">1</div>
                  Selected Service
                </h3>
                {fetching ? <div className="h-12 bg-gray-100 rounded-xl animate-pulse" /> : selectedService ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{selectedService.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{selectedService.estimatedTime} · {selectedService.priceUnit}</p>
                    </div>
                    <p className="text-xl font-extrabold text-primary-600">₹{selectedService.basePrice}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Service not found.</p>
                )}
                <input type="hidden" {...register('serviceId', { required: true })} />
              </div>
            )}

            <div className="card">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-bold">{serviceId ? '1' : '2'}</div>
                Quantity & Schedule
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Quantity</label>
                  <input type="number" min="1" max="1000" className={`input-field ${errors.quantity ? 'border-red-400' : ''}`}
                    {...register('quantity', { required: true, min: 1 })}
                    value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 1)} />
                </div>
                <div>
                  <label className="input-label flex items-center gap-1"><Calendar size={13} /> Preferred Deadline <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="date" className="input-field" min={minDate} max={maxDate} {...register('preferredDeadline')} />
                </div>
              </div>
              <div>
                <label className="input-label mt-4 flex items-center gap-1"><FileText size={13} /> Special Requirements <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea rows={3} className="input-field resize-none" placeholder="Double-sided, colour, A3 size, etc." {...register('specialRequirements')} />
              </div>
            </div>

            {/* File Upload Section */}
            <div id="file-upload-section" className={`card ${requiresPdf && !file && fileError ? 'border-red-300 bg-red-50' : ''}`}>
              <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-bold">{serviceId ? '2' : '3'}</div>
                Upload Document
                {requiresPdf ? (
                  <span className="text-red-500 text-xs font-semibold bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span>Required</span>
                  </span>
                ) : (
                  <span className="text-gray-400 font-normal text-xs">(optional)</span>
                )}
              </h3>
              {requiresPdf ? (
                <p className="text-xs text-red-600 font-medium mb-3 flex items-center gap-1">
                  ⚠️ This service requires a PDF. Please upload the document you want {selectedService?.category === 'photocopy' ? 'photocopied' : 'printed'}.
                </p>
              ) : (
                <p className="text-xs text-gray-500 mb-3">Upload a PDF file (e.g., document to print/photocopy). Max 10MB.</p>
              )}
              <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                requiresPdf && !file
                  ? 'border-red-300 hover:border-red-400 bg-red-50'
                  : file
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 hover:border-primary-300'
              }`}>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <FileText size={20} className="text-green-600" />
                      <span className="font-medium text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-400">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={24} className={requiresPdf ? 'text-red-400' : 'text-gray-400'} />
                      <span className={`text-sm font-medium ${requiresPdf ? 'text-red-600' : 'text-gray-600'}`}>
                        {requiresPdf ? 'Upload your PDF document (required)' : 'Click to upload a PDF'}
                      </span>
                      <span className="text-xs text-gray-400">PDF only · Max 10MB</span>
                    </div>
                  )}
                </label>
              </div>
              {fileError && <p className="text-red-500 text-xs mt-2 font-medium">{fileError}</p>}
              {file && (
                <button
                  type="button"
                  onClick={() => { setFile(null); setFileError(''); }}
                  className="text-xs text-red-500 hover:text-red-700 mt-2"
                >
                  Remove file
                </button>
              )}
            </div>

            <div className="card">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-bold">{serviceId ? '3' : '4'}</div>
                Your Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Full Name *</label>
                  <input className={`input-field ${errors.customerName ? 'border-red-400' : ''}`} placeholder="Rahul Sharma" {...register('customerName', { required: 'Name is required' })} />
                  {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName.message}</p>}
                </div>
                <div>
                  <label className="input-label">Email *</label>
                  <input type="email" className={`input-field ${errors.customerEmail ? 'border-red-400' : ''}`} placeholder="rahul@example.com" {...register('customerEmail', { required: 'Email is required' })} />
                  {errors.customerEmail && <p className="text-red-500 text-xs mt-1">{errors.customerEmail.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="input-label">Phone *</label>
                  <input type="tel" className={`input-field ${errors.customerPhone ? 'border-red-400' : ''}`} placeholder="+91 94665 30255" {...register('customerPhone', { required: 'Phone is required' })} />
                  {errors.customerPhone && <p className="text-red-500 text-xs mt-1">{errors.customerPhone.message}</p>}
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
              {loading ? <><Loader2 className="animate-spin" size={20} /> Processing...</> : <>Confirm Booking <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>

        {/* Sticky summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="card border-primary-100">
              <h3 className="font-bold text-gray-900 mb-5 font-display">Order Summary</h3>
              {selectedService ? (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service</span>
                    <span className="font-semibold text-gray-900 text-right max-w-[55%]">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Unit Price</span>
                    <span className="font-semibold">₹{selectedService.basePrice}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Quantity</span>
                    <span className="font-semibold">{quantity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Est. Time</span>
                    <span className="font-semibold">{selectedService.estimatedTime}</span>
                  </div>
                  <div className="h-px bg-gray-100 my-1" />
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900">Estimated Total</span>
                    <span className="text-2xl font-extrabold text-primary-600">₹{estimatedCost}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">Final amount may vary based on actual work. Payment collected at pickup.</p>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm">Select a service to see pricing</div>
              )}
            </div>
            <div className="mt-4 card bg-amber-50 border-amber-100">
              <p className="text-xs text-amber-700 font-semibold mb-1">📌 Walk-in also welcome</p>
              <p className="text-xs text-amber-600">You can also visit us at Aryanagar, Rohtak. Open Mon–Sat 9 AM – 9 PM.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
