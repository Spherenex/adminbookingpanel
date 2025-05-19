import React, { useState } from 'react';
import AdminLogin from './AdminLogin';
import AdminLayout from './AdminLayout';
import AdminDashboard from './AdminDashboard';
import AdminBookings from './AdminBookings';
import AdminUsers from './AdminUsers';
import '../styles/Admin.css';

const Admin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  const handleLoginSuccess = (user) => {
    setIsLoggedIn(true);
    setCurrentPage('dashboard');
  };
  
  const handleLogout = () => {
    setIsLoggedIn(false);
  };
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  // Render the appropriate content based on current page
  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'bookings':
        return <AdminBookings />;
      case 'users':
        return <AdminUsers />;
      default:
        return <AdminDashboard />;
    }
  };
  
  // If not logged in, show login screen
  if (!isLoggedIn) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }
  
  // If logged in, show admin layout with appropriate content
  return (
    <AdminLayout 
      currentPage={currentPage}
      onPageChange={handlePageChange}
      onLogout={handleLogout}
    >
      {renderContent()}
    </AdminLayout>
  );
};

export default Admin;