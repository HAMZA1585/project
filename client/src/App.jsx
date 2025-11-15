import { useState, useRef, useEffect } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpIcon } from "@heroicons/react/24/outline";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/notifications.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store';
import Sidebar from "./Components/Sidebar.jsx";
import Header from "./Components/Header.jsx";
import Dashboard from "./Pages/Dashboard.jsx";
import DataVisualization from "./Pages/DataVisualization.jsx";
import ContentCuration from "./Pages/ContentCuration.jsx";
import AdvancedSearch from "./Pages/AdvancedSearch.jsx";
import Report from "./Pages/Report.jsx";
import Admin from "./Pages/Admin.jsx";
import Archive from "./Pages/Archive.jsx";
import PageNotFound from "./Pages/PageNotFound.jsx";
import Login from "./Pages/Login.jsx";
import Signup from "./Pages/Signup.jsx";
import ProtectedRoute from "./Components/ProtectedRoute.jsx";
import AuthInitializer from "./Components/AuthInitializer.jsx";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [darkMode, setDarkMode] = useState(false);

  // Force light mode - always remove dark class
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []); // Only run once on load

  const theme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#4f46e5', // Indigo 600
      },
      secondary: {
        main: '#10b981', // Emerald 500
      },
      background: {
        default: '#f9fafb', // Gray 50
        paper: '#ffffff', // White
      },
    },
    typography: {
      fontFamily: ['Inter', 'sans-serif'].join(','),
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            textTransform: 'none',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
          },
        },
      },
    },
  });

  const mainRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleScroll = () => {
    if (mainRef.current) {
      setShowScrollButton(mainRef.current.scrollTop > 200);
    }
  };

  const scrollToTop = () => {
    if (mainRef.current) {
      mainRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const mainElement = mainRef.current;
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll);
      return () => {
        mainElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
            <AuthInitializer>
              <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    
                    {/* Protected routes */}
                    <Route path="/" element={
                      <div className="flex h-screen bg-gray-100">
                        <Sidebar />
                        <div className="flex-1 flex flex-col overflow-hidden">
                          <Header darkMode={darkMode} />
                          <main ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4">
                            <Navigate to="/dashboard" replace />
                          </main>
                        </div>
                      </div>
                    } />
                    
                    <Route path="/dashboard" element={
                      <ProtectedRoute>
                        <div className="flex h-screen bg-gray-100">
                          <Sidebar />
                          <div className="flex-1 flex flex-col overflow-hidden">
                            <Header darkMode={darkMode} setDarkMode={setDarkMode} />
                            <main ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4">
                              <Dashboard />
                            </main>
                          </div>
                        </div>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/visualization" element={
                      <ProtectedRoute>
                        <div className="flex h-screen bg-gray-100">
                          <Sidebar />
                          <div className="flex-1 flex flex-col overflow-hidden">
                            <Header darkMode={darkMode} setDarkMode={setDarkMode} />
                            <main ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4">
                              <DataVisualization />
                            </main>
                          </div>
                        </div>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/curation" element={
                      <ProtectedRoute>
                        <div className="flex h-screen bg-gray-100">
                          <Sidebar />
                          <div className="flex-1 flex flex-col overflow-hidden">
                            <Header darkMode={darkMode} setDarkMode={setDarkMode} />
                            <main ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4">
                              <ContentCuration />
                            </main>
                          </div>
                        </div>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/search" element={
                      <ProtectedRoute>
                        <div className="flex h-screen bg-gray-100">
                          <Sidebar />
                          <div className="flex-1 flex flex-col overflow-hidden">
                            <Header darkMode={darkMode} setDarkMode={setDarkMode} />
                            <main ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4">
                              <AdvancedSearch />
                            </main>
                          </div>
                        </div>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/report" element={
                      <ProtectedRoute>
                        <div className="flex h-screen bg-gray-100">
                          <Sidebar />
                          <div className="flex-1 flex flex-col overflow-hidden">
                            <Header darkMode={darkMode} setDarkMode={setDarkMode} />
                            <main ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4">
                              <Report />
                            </main>
                          </div>
                        </div>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/archive" element={
                      <ProtectedRoute>
                        <div className="flex h-screen bg-gray-100">
                          <Sidebar />
                          <div className="flex-1 flex flex-col overflow-hidden">
                            <Header darkMode={darkMode} setDarkMode={setDarkMode} />
                            <main ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4">
                              <Archive />
                            </main>
                          </div>
                        </div>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/admin" element={
                      <ProtectedRoute role="admin">
                        <div className="flex h-screen bg-gray-100">
                          <Sidebar />
                          <div className="flex-1 flex flex-col overflow-hidden">
                            <Header darkMode={darkMode} setDarkMode={setDarkMode} />
                            <main ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4">
                              <Admin />
                            </main>
                          </div>
                        </div>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="*" element={<PageNotFound />} />
              </Routes>
              
              {/* Scroll to Top Button */}
              <AnimatePresence>
                {showScrollButton && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="fixed bottom-4 right-4 z-50"
                  >
                    <button
                      onClick={scrollToTop}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      aria-label="Scroll to top"
                    >
                      <ArrowUpIcon className="w-6 h-6" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Toast Notifications */}
              <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
                enableMultiContainer
                containerId="notification-container"
              />
            </AuthInitializer>
          </Router>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;