import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { fetchCurrentUser, setLoading } from '../store/slices/authSlice';

const AuthInitializer = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();

  useEffect(() => {
    const publicPaths = ['/login', '/signup'];
    
    // Only try to fetch the user if we are NOT on a public path
    if (!publicPaths.includes(location.pathname)) {
      dispatch(fetchCurrentUser());
    } else {
      // If we are on a public path, just set loading to false
      // so the app can render the login/signup page.
      dispatch(setLoading(false));
    }
  }, [dispatch, location.pathname]);

  return children;
};

export default AuthInitializer;
