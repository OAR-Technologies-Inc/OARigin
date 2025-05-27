import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGameStore } from '../store';
import { useAuth } from '../hooks/useAuth';
import { verifySubscription } from '../lib/stripe';
import { supabase } from '../lib/supabase';

const Success: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser: user } = useGameStore();
  const { checkSubscription } = useAuth();

  useEffect(() => {
    const handleSuccess = async () => {
      if (!user) {
        navigate('/');
        return;
      }

      const sessionId = searchParams.get('session_id');
      if (!sessionId) {
        navigate('/');
        return;
      }

      try {
        const subscriptionData = await verifySubscription(sessionId);
        if (subscriptionData) {
          await supabase
            .from('game_subscriptions')
            .insert({
              user_id: user.id,
              stripe_subscription_id: subscriptionData.stripe_subscription_id,
              status: subscriptionData.status,
            });

          await checkSubscription(user.id);
        }
      } catch (error) {
        console.error('Error verifying subscription:', error);
      }

      navigate('/');
    };

    handleSuccess();
  }, [searchParams, user, navigate, checkSubscription]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-green-500 font-mono">
        <h1 className="text-2xl mb-4">Processing your subscription...</h1>
        <p>You will be redirected shortly.</p>
      </div>
    </div>
  );
};

export default Success;