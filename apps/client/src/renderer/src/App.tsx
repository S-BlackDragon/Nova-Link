import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import EmailVerification from './components/Auth/EmailVerification';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import Dashboard from './components/Dashboard';
import UpdateModal from './components/UpdateModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LogProvider } from './contexts/LogContext';
import { ToastProvider } from './contexts/ToastContext';
import { API_BASE_URL } from './config/api';
import './assets/main.css';

const queryClient = new QueryClient();

type AuthView = 'login' | 'register' | 'verify' | 'forgot-password' | 'reset-password';

function App(): React.JSX.Element {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<AuthView>('login');
  const [tempEmail, setTempEmail] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Track if auth has been restored from localStorage to avoid premature logout on 401
  const authRestoredRef = useRef(false);

  useEffect(() => {
    // Response interceptor for session expiry
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Only trigger logout on 401 if auth has been restored (not during initialization)
        // This prevents the "Fetch Failed" error on startup when token hasn't loaded yet
        if (error.response?.status === 401 && authRestoredRef.current) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );

    // Request interceptor to attach token to local API calls
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return config;

          // Robust check for local API calls
          const url = config.url || '';
          const isLocalApi =
            url.startsWith(API_BASE_URL) ||
            url.startsWith('/') ||
            url.includes('163.192.96.105:3000');

          if (isLocalApi) {
            // Ensure headers object exists
            if (!config.headers) {
              config.headers = {} as any;
            }
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (err) {
          console.error('Error in axios request interceptor:', err);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
      axios.interceptors.request.eject(requestInterceptor);
    };
  }, []);

  useEffect(() => {
    // Startup initialization
    const initApp = async () => {
      // 1. Check for updates immediately (unless preference is manual)
      try {
        const updatePref = localStorage.getItem('update_preference');
        if (updatePref !== 'manual') {
          await (window as any).api.checkForUpdates();
        }
      } catch (err) {
        console.error('Failed to check updates on startup:', err);
      }

      // 2. Artificial delay (minimum 3s) as requested for UX
      setTimeout(() => {
        setIsInitializing(false);
      }, 4000); // 4 seconds fixed delay
    };

    initApp();

    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    // Mark auth as restored - now 401 interceptor can trigger logout
    authRestoredRef.current = true;
  }, []);

  const handleAuthSuccess = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setView('login');
  };

  const handleRegistrationSuccess = (email: string) => {
    setTempEmail(email);
    setView('verify');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setView('login');
  };

  const renderAuthView = () => {
    switch (view) {
      case 'login':
        return (
          <Login
            onLoginSuccess={handleAuthSuccess}
            onSwitchToRegister={() => setView('register')}
            onForgotPassword={() => setView('forgot-password')}
          />
        );
      case 'register':
        return (
          <Register
            onRegisterSuccess={handleRegistrationSuccess}
            onSwitchToLogin={() => setView('login')}
          />
        );
      case 'verify':
        return (
          <EmailVerification
            email={tempEmail}
            onVerificationSuccess={handleAuthSuccess}
            onBackToLogin={() => setView('login')}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPassword
            onBackToLogin={() => setView('login')}
            onResetRequested={() => setView('login')}
          />
        );
      case 'reset-password':
        return (
          <ResetPassword
            onSuccess={() => setView('login')}
          />
        );
      default:
        return <Login onLoginSuccess={handleAuthSuccess} onSwitchToRegister={() => setView('register')} onForgotPassword={() => setView('forgot-password')} />;
    }
  };

  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-[10001] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Logo container with glow effect */}
          <div className="relative mb-10">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur-2xl opacity-50 animate-pulse" />
            <div className="relative w-28 h-28 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/30 animate-[pulse_2s_ease-in-out_infinite]">
              <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white drop-shadow-lg">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
            </div>
          </div>

          {/* Title with gradient */}
          <h1 className="text-5xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent mb-3 tracking-tighter">
            Nova Link
          </h1>

          {/* Subtitle */}
          <p className="text-slate-400 font-medium text-lg mb-10">Minecraft Modpack Launcher</p>

          {/* Loading spinner with progress ring */}
          <div className="relative w-16 h-16 mb-8">
            <div className="absolute inset-0 border-4 border-slate-800 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin" />
            <div className="absolute inset-2 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>

          {/* Status text */}
          <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
            Initializing System
          </p>

          {/* Version badge */}
          <div className="absolute bottom-0 translate-y-32">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Version {__APP_VERSION__}</span>
          </div>
        </div>
      </div>
    );
  }

  const content = token && user ? (
    <Dashboard
      user={user}
      onLogout={handleLogout}
      onUserUpdate={(updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }}
    />
  ) : (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-6">
      <div className="w-full flex justify-center animate-in fade-in zoom-in duration-500">
        {renderAuthView()}
      </div>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <LogProvider>
          <ToastProvider>
            {content}
            <UpdateModal />
          </ToastProvider>
        </LogProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
