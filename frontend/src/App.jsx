import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import MyBookingsPage from './pages/MyBookingsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import WorkerDashboard from './pages/WorkerDashboard';
import PendingRequestsPage from './pages/PendingRequestsPage';
import MyTasksPage from './pages/MyTasksPage';
import AdminPanel from './pages/AdminPanel';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="pb-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/booking/:serviceId" element={<BookingPage />} />

            {/* Issue #25: owner can also view my-bookings (e.g. to help a customer) */}
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute allowedRoles={['customer', 'owner']}>
                  <MyBookingsPage />
                </ProtectedRoute>
              }
            />

            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['worker', 'owner']}>
                  <WorkerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/pending"
              element={
                <ProtectedRoute allowedRoles={['worker', 'owner']}>
                  <PendingRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/my-tasks"
              element={
                <ProtectedRoute allowedRoles={['worker', 'owner']}>
                  <MyTasksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
