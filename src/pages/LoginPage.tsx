import React, { useState } from 'react';
import { isAuthenticated, waitForAuthentication, getPublicKey } from '@babbage/sdk-ts';
import { useNavigate } from 'react-router-dom';
import { fetchUserRoleFromBlockchain } from '../services/blockchain/blockchain';

// Function to simulate fetching email placeholder
const getUserEmail = async (): Promise<string> => {
  // TODO: Replace with actual user email fetching logic
  return 'user@example.com'; // Replace with actual user email
};

const connectWallet = async () => {
  try {
    // Check if user is already authenticated
    const authenticated = await isAuthenticated();
    
    if (!authenticated) {
      // Wait for user to authenticate with the MetaNet Client
      await waitForAuthentication();
    }

    // Fetch and return the user's public key (for identification)
    const publicKey = await getPublicKey({
      reason: 'User login confirmation',
      identityKey: true, // Retrieve the identity key of the user
    });

    console.log('User Wallet Connected. Public Key:', publicKey);
    return publicKey; // Return public key for further identification
    
  } catch (error) {
    console.error('Error connecting to wallet:', error);
    return null;
  }
};

const LoginPage: React.FC<{ onLoginSuccess: (publicKey: string, email: string) => void }> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleConnectWallet = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const publicKey = await connectWallet(); // Connect to MetaNet Client

      if (publicKey) {
        // Fetch the user's role from blockchain using their public key
        const userRole = await fetchUserRoleFromBlockchain(publicKey);
        const userEmail = await getUserEmail(); // Simulate fetching user's email

        if (userRole === 'keyPerson') {
          console.log('Key person identified');
          navigate('/onboarding'); // Redirect to onboarding for key person
        } else if (userRole === 'limitedUser') {
          console.log('Limited user identified');
          navigate('/dashboard'); // Redirect limited users to the dashboard
        } else {
          setErrorMessage('No valid role found. Please contact the administrator.');
        }

        // Pass the public key and email to the onLoginSuccess callback
        onLoginSuccess(publicKey, userEmail);

      } else {
        setErrorMessage('Failed to connect wallet. Please try again.');
      }
      
    } catch (error) {
      setErrorMessage('Failed to connect wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <h1>Connect Your Wallet</h1>
      <p>Please connect your MetaNet Client wallet to proceed.</p>

      <button onClick={handleConnectWallet} disabled={isLoading}>
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {errorMessage && <p className="error-message">{errorMessage}</p>}
    </div>
  );
};

export default LoginPage;