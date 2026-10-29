import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppProvider, AuthProvider, useAuth } from './context';
import { ToastProvider } from './components/ui';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import BookingDetail from './pages/BookingDetail';
import Calendar from './pages/Calendar';
import Vehicles from './pages/Vehicles';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import Profitability from './pages/Profitability';
import Fuel from './pages/Fuel';
import Maintenance from './pages/Maintenance';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';

function Protected() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App({ testUser }) {
  return (
    <ToastProvider>
      <AuthProvider initialUser={testUser}>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Protected />}>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="bookings/:id" element={<BookingDetail />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="vehicles" element={<Vehicles />} />
                <Route path="payments" element={<Payments />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="profitability" element={<Profitability />} />
                <Route path="fuel" element={<Fuel />} />
                <Route path="maintenance" element={<Maintenance />} />
                <Route path="customers" element={<Customers />} />
                <Route path="reports" element={<Reports />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
