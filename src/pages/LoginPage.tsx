import React, { useState } from 'react';
import { isAuthenticated, waitForAuthentication, getPublicKey } from '@babbage/sdk-ts';
import { useNavigate } from 'react-router-dom';
import { fetchUserRoleFromBlockchain, addKeyUser, getUserEmail } from '../services/blockchain/blockchain';

const connectWallet = async () => {
  try {
    const authenticated = await isAuthenticated();
    
    if (!authenticated) {
      await waitForAuthentication();
    }

    const publicKey = await getPublicKey({
      reason: 'User login confirmation',
      identityKey: true,
    });

    return publicKey;
  } catch (error) {
    console.error('Error connecting to wallet:', error);
    return null;
  }
};

const LoginPage: React.FC<{ onLoginSuccess: (publicKey: string, email: string) => void }> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [emailPrompt, setEmailPrompt] = useState(false);
  const navigate = useNavigate();

  const handleConnectWallet = async () => {
    setIsLoading(true);
    setErrorMessage(null);
  
    try {
      const publicKey = await connectWallet();
  
      if (publicKey) {
        const role = await fetchUserRoleFromBlockchain(publicKey);
  
        if (role) {
          const userEmail = await getUserEmail(publicKey);
  
          if (role === 'keyPerson') {
            console.log('Key person identified');
            navigate('/onboarding');
          } else if (role === 'limitedUser') {
            console.log('Limited user identified');
            navigate('/dashboard');
          } else {
            setErrorMessage('No valid role found. Please contact the administrator.');
          }
  
          onLoginSuccess(publicKey, userEmail ?? '');
        } else {
          // If role is null, this means the user doesn't exist; prompt for email.
          setEmailPrompt(true);
        }
      } else {
        setErrorMessage('Failed to connect wallet. Please try again.');
      }
    } catch (error) {
      setErrorMessage('Failed to connect wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  

  const handleEmailSubmit = async () => {
    try {
      const publicKey = await connectWallet();
      if (publicKey) {
        await addKeyUser(publicKey, userEmail);
        onLoginSuccess(publicKey, userEmail);
        navigate('/onboarding');
      }
    } catch (error) {
      setErrorMessage('Error creating key user.');
      console.error(error);
    }
  };

  return (
    <div className="login-page">
      <h1>Connect Your Wallet</h1>
      <p>Please connect your MetaNet Client wallet to proceed.</p>

      <button onClick={handleConnectWallet} disabled={isLoading}>
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {emailPrompt && (
        <div>
          <p>Enter your email to register as the primary user:</p>
          <input 
            type="email" 
            value={userEmail} 
            onChange={(e) => setUserEmail(e.target.value)} 
            placeholder="Enter your email" 
          />
          <button onClick={handleEmailSubmit}>Submit</button>
        </div>
      )}

      {errorMessage && <p className="error-message">{errorMessage}</p>}
    </div>
  );
};

export default LoginPage;
