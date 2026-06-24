import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Loader2, MonitorSmartphone, ArrowRight, CheckCircle } from 'lucide-react';

const SignupPage = () => {
  const { signup } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true); setError('');
    try { await signup(data); }
    catch (err) { setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Signup failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      <div className="hidden lg:flex flex-col justify-between w-2/5 bg-hero-gradient p-12 text-white">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <MonitorSmartphone size={22} />
            </div>
            <div>
              <p className="font-bold font-display">Batra Computers</p>
              <p className="text-xs text-primary-300">Rohtak, Haryana</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold font-display leading-snug mb-4">Book services<br />in seconds</h2>
          <p className="text-primary-200 text-sm leading-relaxed">Create your free account and start booking photocopy, printing, homework help, and ticket services.</p>
        </div>
        <div className="space-y-3">
          {['Free to register', 'Track bookings live', 'WhatsApp updates', 'Rate your experience'].map(t => (
            <div key={t} className="flex items-center gap-2 text-sm text-primary-100">
              <CheckCircle size={16} className="text-primary-300 flex-shrink-0" /> {t}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 font-display">Create your account</h1>
            <p className="text-gray-500 mt-1">Join Batra Computers — it's free</p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">{error}</div>}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Role is always 'customer' on signup — enforced server-side (Issue #2) */}
            <div>
              <label className="input-label">Full Name</label>
              <input className={`input-field ${errors.name ? 'border-red-400' : ''}`} placeholder="Rahul Sharma" {...register('name', { required: 'Name is required' })} />
              {errors.name && <p className="text-red-500 text-xs mt-1.5">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Email</label>
                <input type="email" className={`input-field ${errors.email ? 'border-red-400' : ''}`} placeholder="you@example.com" {...register('email', { required: 'Email is required' })} />
                {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
              </div>
              <div>
                <label className="input-label">Phone</label>
                <input type="tel" className={`input-field ${errors.phone ? 'border-red-400' : ''}`} placeholder="+91 98765 43210" {...register('phone', { required: 'Phone is required' })} />
                {errors.phone && <p className="text-red-500 text-xs mt-1.5">{errors.phone.message}</p>}
              </div>
            </div>
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className={`input-field pr-11 ${errors.password ? 'border-red-400' : ''}`} placeholder="Min 8 chars, 1 number"
                  {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Minimum 8 characters' }, validate: v => /\d/.test(v) || 'Must contain one number' })} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
            </div>
            <button type="submit" id="signup-submit" disabled={loading} className="btn-primary w-full py-3.5 text-base mt-2">
              {loading ? <><Loader2 className="animate-spin" size={20} /> Creating...</> : <>Create Account <ArrowRight size={18} /></>}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">Account type: <span className="font-semibold text-emerald-600">Customer</span></p>
          <p className="mt-4 text-center text-sm text-gray-500">Already have an account? <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
