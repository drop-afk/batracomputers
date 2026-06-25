import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Clock, Phone, MapPin, Calendar, ArrowRight,
  Printer, FileText, BookOpen, Ticket, MoreHorizontal,
  ClipboardList, Star, Shield, Zap, CheckCircle, LayoutDashboard
} from 'lucide-react';

const categoryMeta = {
  photocopy:  { icon: FileText,  gradient: 'from-blue-500 to-cyan-500',    bg: 'bg-blue-50',   border: 'border-blue-100',  text: 'text-blue-700',  label: 'Photocopy' },
  printing:   { icon: Printer,   gradient: 'from-purple-500 to-violet-500', bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', label: 'Printing' },
  homework:   { icon: BookOpen,  gradient: 'from-emerald-500 to-teal-500',  bg: 'bg-emerald-50',border: 'border-emerald-100',text: 'text-emerald-700',label: 'Homework Help' },
  tickets:    { icon: Ticket,    gradient: 'from-orange-500 to-amber-500',  bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700', label: 'Tickets' },
  other:      { icon: MoreHorizontal, gradient: 'from-gray-400 to-gray-500', bg: 'bg-gray-50', border: 'border-gray-100',  text: 'text-gray-700',  label: 'Other' },
};

const features = [
  { icon: Zap,         label: 'Fast Turnaround',    desc: 'Most services done within hours' },
  { icon: Shield,      label: 'Secure Booking',      desc: 'Your data is always protected' },
  { icon: Star,        label: 'Rated 4.9/5',         desc: 'Trusted by thousands of customers' },
  { icon: CheckCircle, label: 'Dedicated Workers',   desc: '2 expert staff members on call' },
];

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/services')
      .then(r => setServices(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const groupedServices = services.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-hero-gradient text-white">
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-1/2 -left-24 w-72 h-72 rounded-full bg-primary-400/20 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-accent-500/10 blur-3xl" />
        </div>

        <div className="section relative py-20 sm:py-28">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6 text-sm font-medium backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Open Now · Rohtak, Haryana
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-5 font-display">
              Book Cyber Cafe<br />
              <span className="text-primary-200">Services Online</span>
            </h1>
            <p className="text-primary-100 text-lg sm:text-xl mb-8 leading-relaxed">
              Photocopying, printing, homework help, and ticket booking — all in one place. Book now, pick up later.
            </p>

            <div className="flex flex-wrap gap-3">
              {(!isAuthenticated || user?.role === 'customer') ? (
                <button
                  onClick={() => navigate('/booking')}
                  className="inline-flex items-center gap-2 bg-white text-primary-700 px-7 py-3.5 rounded-2xl font-bold hover:bg-primary-50 transition-all duration-150 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
                >
                  Book a Service <ArrowRight size={18} />
                </button>
              ) : user?.role === 'worker' ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 bg-white text-primary-700 px-7 py-3.5 rounded-2xl font-bold hover:bg-primary-50 transition-all duration-150 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
                >
                  <LayoutDashboard size={18} /> Worker Dashboard
                </Link>
              ) : user?.role === 'owner' ? (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 bg-white text-primary-700 px-7 py-3.5 rounded-2xl font-bold hover:bg-primary-50 transition-all duration-150 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
                >
                  <Shield size={18} /> Admin Panel
                </Link>
              ) : null}
              {isAuthenticated && user?.role === 'customer' && (
                <Link
                  to="/my-bookings"
                  className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white px-7 py-3.5 rounded-2xl font-bold hover:bg-white/20 transition-all duration-150 backdrop-blur-sm"
                >
                  <ClipboardList size={18} /> My Bookings
                </Link>
              )}
              {!isAuthenticated && (
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white px-7 py-3.5 rounded-2xl font-bold hover:bg-white/20 transition-all duration-150 backdrop-blur-sm"
                >
                  Create Account
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Feature chips row */}
        <div className="section pb-8 relative">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {features.map((f) => (
              <div key={f.label} className="card-glass flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <f.icon size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">{f.label}</p>
                  <p className="text-primary-200 text-xs leading-tight mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="section py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-primary-600 text-sm font-semibold uppercase tracking-widest mb-1">What We Offer</p>
            <h2 className="text-3xl font-bold text-gray-900 font-display">Our Services</h2>
          </div>
          {(!isAuthenticated || user?.role === 'customer') && (
            <Link to="/booking" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
              View all <ArrowRight size={16} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-gray-100 rounded-lg w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 rounded-lg w-full mb-2" />
                <div className="h-3 bg-gray-100 rounded-lg w-2/3 mb-5" />
                <div className="h-10 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          Object.entries(groupedServices).map(([category, items]) => {
            const meta = categoryMeta[category] || categoryMeta.other;
            const Icon = meta.icon;
            return (
              <div key={category} className="mb-12">
                {/* Category header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-md`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 font-display">{meta.label}</h3>
                    <p className="text-xs text-gray-400">{items.length} service{items.length > 1 ? 's' : ''} available</p>
                  </div>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {items.map((service) => (
                    <div key={service._id} className="card-hover group">
                      {/* Category pip */}
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${meta.bg} ${meta.text} text-xs font-semibold mb-3`}>
                        <Icon size={11} />
                        {meta.label}
                      </div>

                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-gray-900 text-base leading-snug">{service.name}</h4>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-xl font-extrabold text-primary-600">₹{service.basePrice}</p>
                          <p className="text-[10px] text-gray-400 whitespace-nowrap">{service.priceUnit}</p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-500 mb-4 leading-relaxed">{service.description}</p>

                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                        <Clock size={12} />
                        <span>{service.estimatedTime}</span>
                      </div>

                      {(!isAuthenticated || user?.role === 'customer') && (
                        <Link
                          to={`/booking/${service._id}`}
                          className="btn-primary w-full text-sm group-hover:shadow-card-md"
                        >
                          Book Now <ArrowRight size={14} />
                        </Link>
                      )}
                      {isAuthenticated && user?.role === 'worker' && (
                        <div className="text-xs text-gray-400 text-center py-2 bg-gray-50 rounded-lg">
                          Worker account — booking disabled
                        </div>
                      )}
                      {isAuthenticated && user?.role === 'owner' && (
                        <div className="text-xs text-gray-400 text-center py-2 bg-gray-50 rounded-lg">
                          Owner account — booking disabled
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* ── Business Info ── */}
      <section className="bg-white border-t border-gray-100">
        <div className="section py-16">
          <div className="text-center mb-10">
            <p className="text-primary-600 text-sm font-semibold uppercase tracking-widest mb-1">Find Us</p>
            <h2 className="text-3xl font-bold text-gray-900 font-display">Visit or Call Us</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: MapPin,   title: 'Location', content: 'Aryanagar, Rohtak,\nHaryana 124001, India', href: null },
              { icon: Phone,    title: 'Phone',    content: '+91 94665 30255', href: 'tel:+919466530255' },
              { icon: Calendar, title: 'Hours',    content: 'Mon–Sat: 9 AM – 9 PM\nSun: 10 AM – 6 PM', href: null },
            ].map(({ icon: Icon, title, content, href }) => (
              <div key={title} className="card-hover text-center p-8">
                <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
                  <Icon size={24} className="text-primary-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 font-display">{title}</h3>
                {href ? (
                  <a href={href} className="text-sm text-primary-600 hover:underline whitespace-pre-line">{content}</a>
                ) : (
                  <p className="text-sm text-gray-500 whitespace-pre-line leading-relaxed">{content}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="section py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm">© 2025 Batra Computers, Rohtak. All rights reserved.</p>
          <p className="text-xs text-gray-600">Built with ♥ for Rohtak's digital needs</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
