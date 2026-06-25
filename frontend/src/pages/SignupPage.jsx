import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import {
  Eye, EyeOff, Loader2, MonitorSmartphone, ArrowRight, CheckCircle,
  MailCheck, MessageCircle, RotateCcw
} from 'lucide-react';

const SignupPage = () => {
  const { requestSignupOtp, signup } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('details');
  const [challenge, setChallenge] = useState(null);
  const [signupData, setSignupData] = useState(null);
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  const getApiError = (err, fallback) =>
    err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || fallback;

  const requestCodes = async (data) => {
    setLoading(true);
    setError('');
    try {
      const result = await requestSignupOtp(data);
      setSignupData(data);
      setChallenge(result);
      setStep('verify');
    } catch (err) {
      setError(getApiError(err, 'Could not send verification codes.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyAndCreateAccount = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signup(signupData, {
        challengeId: challenge.challengeId,
        emailOtp,
        phoneOtp
      });
    } catch (err) {
      setError(getApiError(err, 'Verification failed.'));
    } finally {
      setLoading(false);
    }
  };

  const resendCodes = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await requestSignupOtp(signupData);
      setChallenge(result);
      setEmailOtp('');
      setPhoneOtp('');
    } catch (err) {
      setError(getApiError(err, 'Could not resend verification codes.'));
    } finally {
      setLoading(false);
    }
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
          {['Free to register', 'Verified email & phone', 'Track bookings live', 'WhatsApp updates'].map((text) => (
            <div key={text} className="flex items-center gap-2 text-sm text-primary-100">
              <CheckCircle size={16} className="text-primary-300 flex-shrink-0" /> {text}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 font-display">
              {step === 'details' ? 'Create your account' : 'Verify your details'}
            </h1>
            <p className="text-gray-500 mt-1">
              {step === 'details' ? "Join Batra Computers — it's free" : 'Enter both security codes to continue'}
            </p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">{error}</div>}

          {step === 'details' ? (
            <form onSubmit={handleSubmit(requestCodes)} className="space-y-4">
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
                  <input type="tel" className={`input-field ${errors.phone ? 'border-red-400' : ''}`} placeholder="+91 94665 30255" {...register('phone', { required: 'Phone is required' })} />
                  {errors.phone && <p className="text-red-500 text-xs mt-1.5">{errors.phone.message}</p>}
                </div>
              </div>
              <div>
                <label className="input-label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={`input-field pr-11 ${errors.password ? 'border-red-400' : ''}`}
                    placeholder="Min 8 chars, 1 number"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 8, message: 'Minimum 8 characters' },
                      validate: (value) => /\d/.test(value) || 'Must contain one number'
                    })}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
              </div>
              <button type="submit" id="signup-submit" disabled={loading} className="btn-primary w-full py-3.5 text-base mt-2">
                {loading ? <><Loader2 className="animate-spin" size={20} /> Sending codes...</> : <>Send verification codes <ArrowRight size={18} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyAndCreateAccount} className="space-y-5">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                We sent separate codes to <strong>{signupData.email}</strong> and WhatsApp at <strong>{signupData.phone}</strong>. They expire in 10 minutes.
              </div>

              {challenge?.devOtps && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Local codes — email: <strong>{challenge.devOtps.email}</strong>, WhatsApp: <strong>{challenge.devOtps.phone}</strong>
                </div>
              )}

              <div>
                <label className="input-label flex items-center gap-2"><MailCheck size={16} /> Email OTP</label>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="input-field tracking-[0.35em] text-center text-lg"
                  placeholder="000000"
                  value={emailOtp}
                  onChange={(event) => setEmailOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
              </div>

              <div>
                <label className="input-label flex items-center gap-2"><MessageCircle size={16} /> WhatsApp OTP</label>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="input-field tracking-[0.35em] text-center text-lg"
                  placeholder="000000"
                  value={phoneOtp}
                  onChange={(event) => setPhoneOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
              </div>

              <button type="submit" disabled={loading || emailOtp.length !== 6 || phoneOtp.length !== 6} className="btn-primary w-full py-3.5 text-base">
                {loading ? <><Loader2 className="animate-spin" size={20} /> Verifying...</> : <>Verify & create account <ArrowRight size={18} /></>}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => { setStep('details'); setError(''); }} className="text-gray-500 hover:text-gray-700">
                  Change details
                </button>
                <button type="button" onClick={resendCodes} disabled={loading} className="inline-flex items-center gap-1.5 font-semibold text-primary-600 hover:text-primary-700">
                  <RotateCcw size={14} /> Resend codes
                </button>
              </div>
            </form>
          )}

          <p className="text-xs text-gray-400 text-center mt-4">Account type: <span className="font-semibold text-emerald-600">Customer</span></p>
          <p className="mt-4 text-center text-sm text-gray-500">Already have an account? <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
