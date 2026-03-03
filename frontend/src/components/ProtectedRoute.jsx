import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute - Protects routes based on authentication and role
 * 
 * @param {ReactNode} children - Child components to render if authorized
 * @param {string|string[]} role - Single role string or array of allowed roles
 */
const ProtectedRoute = ({ children, role }) => {
  const { token, user, isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated || !token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Support both single role and array of roles
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

