import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import { useAuthContext } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isSubscribed, loading } = useAuthContext();
  const navigate = useNavigate();

  // Dev mode check
  const isDevMode = import.meta.env.MODE === 'development' || 
    import.meta.env.VITE_ENABLE_DEV_MODE === 'true';

  const handleSubscribe = () => {
    // Redirect to Stripe checkout
    navigate('/subscribe');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Animated background with subtle CRT scan lines */}
      <div className="fixed inset-0 bg-gray-950 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,0,0.1)_0%,rgba(0,0,0,0)_70%)]"></div>
        <div className="absolute inset-0 bg-grid-green-900/5 bg-[length:50px_50px] opacity-20"></div>
      </div>
      
      <Header />
      
      <main className="relative z-10 pt-16 min-h-[calc(100vh-64px)]">
        {children}

        {/* Subscription Overlay - Only show in production and when not subscribed */}
        {!loading && !isSubscribed && !isDevMode && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-6 text-center">
              <h2 className="text-xl font-mono font-bold text-green-500 mb-4">
                Subscribe to OARigin
              </h2>
              <p className="text-gray-300 mb-6">
                Experience unlimited AI-powered storytelling adventures for just $2.99/month.
              </p>
              <Button
                variant="primary"
                fullWidth
                onClick={handleSubscribe}
                className="mb-4"
              >
                Subscribe Now
              </Button>
              <p className="text-sm text-gray-500">
                Your subscription helps us maintain and improve the AI storytelling experience.
              </p>
            </Card>
          </div>
        )}
      </main>
      
      {/* Version number footer */}
      <footer className="text-gray-600 text-xs text-center py-2 font-mono">
        OARigin v0.1.0 | The AI Storyteller
      </footer>
    </div>
  );
};

export default Layout;