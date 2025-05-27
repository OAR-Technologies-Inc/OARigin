import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import Terminal from '../components/ui/Terminal';

const NotFound: React.FC = () => {
  const terminalContent = [
    '> ERROR 404: PATH_NOT_FOUND',
    '> SYSTEM: Unable to locate requested resource',
    '> SYSTEM: Trail has gone cold',
    '> SUGGESTION: Return to main navigation',
    '> ...',
    '> INITIATING RECOVERY SEQUENCE'
  ];

  return (
    <Layout>
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
        <div className="w-full max-w-lg text-center">
          <div className="mb-6 text-amber-500">
            <AlertTriangle size={64} className="mx-auto" />
          </div>
          
          <h1 className="text-4xl font-mono font-bold text-green-500 mb-4">
            404: Trail Lost
          </h1>
          
          <div className="mb-6">
            <Terminal 
              lines={terminalContent} 
              animatedLine=""
              className="text-sm" 
              blinkCursor={true} 
            />
          </div>
          
          <p className="text-gray-400 mb-6">
            The adventure you're seeking cannot be found. Perhaps it was never written,
            or perhaps it exists in another timeline.
          </p>
          
          <Button 
            variant="primary" 
            size="lg"
            icon={<Home size={18} />}
            as={Link} 
            to="/"
          >
            Return Home
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;