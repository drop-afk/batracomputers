import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, ClipboardList, LayoutDashboard, Shield, LogIn, LogOut, User, Menu, X, MonitorSmartphone } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isActive = (path) => location.pathname === path;

  const navLinks = [];
  if (isAuthenticated) {
    // Home is visible to everyone
    navLinks.push({ to: '/', icon: Home, label: 'Home' });

    if (user?.role === 'customer') {
      navLinks.push({ to: '/my-bookings', icon: ClipboardList, label: 'My Bookings' });
    }
    if (user?.role === 'worker') {
      navLinks.push({ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' });
      navLinks.push({ to: '/dashboard/pending', icon: ClipboardList, label: 'Pending' });
      navLinks.push({ to: '/dashboard/my-tasks', icon: ClipboardList, label: 'My Tasks' });
    }
    if (user?.role === 'owner') {
      navLinks.push({ to: '/admin', icon: Shield, label: 'Admin' });
      navLinks.push({ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' });
      navLinks.push({ to: '/my-bookings', icon: ClipboardList, label: 'Bookings' });
    }
  } else {
    navLinks.push({ to: '/', icon: Home, label: 'Home' });
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-hero-gradient rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <MonitorSmartphone size={18} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="font-bold text-gray-900 text-sm leading-tight font-display">Batra Computers</p>
              <p className="text-[10px] text-gray-400 leading-tight tracking-wide uppercase">Rohtak, Haryana</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive(link.to)
                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <link.icon size={16} />
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* User pill */}
                <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                  <div className="w-6 h-6 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{user?.name?.split(' ')[0]}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wider ${
                    user?.role === 'owner'
                      ? 'bg-purple-100 text-purple-700'
                      : user?.role === 'worker'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>{user?.role}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-150"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all duration-150"
                >
                  <LogIn size={16} />
                  <span className="hidden sm:inline">Login</span>
                </Link>
                <Link
                  to="/signup"
                  className="btn-primary text-sm px-4 py-2"
                >
                  Sign Up
                </Link>
              </div>
            )}
            <button
              className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive(link.to) ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <link.icon size={18} />
                {link.label}
              </Link>
            ))}
            {isAuthenticated && (
              <button
                onClick={() => { setMobileOpen(false); logout(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut size={18} /> Logout
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
