import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Eye, EyeOff, Loader2, MonitorSmartphone, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      const user = await login(data.email, data.password);
      if (user.role === 'customer') navigate('/');
      else if (user.role === 'worker') navigate('/dashboard');
      else navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 bg-hero-gradient p-12 text-white">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <MonitorSmartphone size={22} className="text-white" />
            </div>
            <div>
              <p className="font-bold font-display">Batra Computers</p>
              <p className="text-xs text-primary-300">Rohtak, Haryana</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold font-display leading-snug mb-4">
            Manage your bookings<br />all in one place
          </h2>
          <p className="text-primary-200 text-sm leading-relaxed">
            From photocopies to ticket booking — track every service request in real time.
          </p>
        </div>
        <div className="space-y-3">
          {['Instant booking confirmation', 'Real-time status tracking', 'Secure & private'].map(t => (
            <div key={t} className="flex items-center gap-2 text-sm text-primary-100">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs">✓</span>
              </div>
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 font-display">Welcome back</h1>
            <p className="text-gray-500 mt-1">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-red-200 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="input-label">Email address</label>
              <input
                type="email"
                className={`input-field ${errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-500/30' : ''}`}
                placeholder="you@example.com"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`input-field pr-11 ${errors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-500/30' : ''}`}
                  placeholder="••••••••"
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-base mt-2"
            >
              {loading ? <><Loader2 className="animate-spin" size={20} /> Signing in...</> : <>Sign In <ArrowRight size={18} /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
              Create one free
            </Link>
          </p>

          {/* Dev-only demo accounts */}
          {import.meta.env.DEV && (
            <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Dev Accounts</p>
              <p className="text-xs text-amber-600 font-mono">owner@batracomputers.com / admin123</p>
              <p className="text-xs text-amber-600 font-mono">amit@batracomputers.com / worker123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
