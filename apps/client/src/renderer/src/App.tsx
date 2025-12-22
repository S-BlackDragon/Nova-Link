import { useState, useEffect } from 'react';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import EmailVerification from './components/Auth/EmailVerification';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import Dashboard from './components/Dashboard';
import UpdateModal from './components/UpdateModal';
import { LogProvider } from './contexts/LogContext';
import './assets/main.css';

type AuthView = 'login' | 'register' | 'verify' | 'forgot-password' | 'reset-password';

function App(): React.JSX.Element {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<AuthView>('login');
  const [tempEmail, setTempEmail] = useState<string>('');

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
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
            onResetRequested={() => setView('login')} // Or just show success
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

  const content = token && user ? (
    <Dashboard user={user} onLogout={handleLogout} />
  ) : (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-6">
      <div className="w-full flex justify-center animate-in fade-in zoom-in duration-500">
        {renderAuthView()}
      </div>
    </div>
  );

  return (
    <LogProvider>
      {content}
      <UpdateModal />
    </LogProvider>
  );
}

export default App;
