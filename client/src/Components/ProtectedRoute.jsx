import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useSelector(state => state.auth);
  const location = useLocation();

  console.log("DEBUG: ProtectedRoute - user:", user, "loading:", loading, "role:", role);

  React.useEffect(() => {
    if (!loading && !user) {
      toast.error("You must be logged in to access this page");
    }
  }, [loading, user]);

  React.useEffect(() => {
    if (!loading && user && role && user.role !== role) {
      toast.error("Access denied: insufficient permissions");
    }
  }, [loading, user, role]);

  // Show loading spinner while authentication is in progress
  if (loading) {
    console.log("DEBUG: ProtectedRoute - showing loading spinner");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Only redirect if we're sure the user is not authenticated
  if (!user) {
    console.log("DEBUG: ProtectedRoute - no user, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (role && user.role !== role) {
    console.log("DEBUG: ProtectedRoute - role mismatch, user role:", user.role, "required role:", role);
    return <Navigate to="/" replace />;
  }

  console.log("DEBUG: ProtectedRoute - access granted");
  return children;
};

export default ProtectedRoute;
