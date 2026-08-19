import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SuperAdminSidebar from '../Components/SuperAdminSidebar';
import Navbar from '../Components/Navbar';
import '../styles/admin.css';

const SuperAdminLayout = ({ children }) => {
  const location = useLocation();
  const mainRef = React.useRef(null);

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return (
    <div className="admin-layout">
      <SuperAdminSidebar />
      <div className="admin-main">
        <Navbar />
        <main ref={mainRef} className="admin-content">
          {/* Render nested routes */}
          <Outlet />
          {children}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
