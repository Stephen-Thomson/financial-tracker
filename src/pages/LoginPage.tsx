/**
 * File: LoginPage.tsx
 * Author: Stephen Thomson
 * Date Created: 11/30/2024
 * Description:
 * The LoginPage component facilitates user authentication using the MetaNet Client wallet. It connects to the wallet,
 * retrieves the user's public key, and determines the user's role. Depending on the role, users are redirected to the appropriate
 * section of the application. New users are prompted to register with their email if not already set up.
 *
 * Functionalities:
 * - Connects to the MetaNet Client wallet.
 * - Retrieves the user's public key and role from the blockchain.
 * - Prompts for email registration if the user is not yet registered.
 * - Redirects key persons to onboarding and limited users to the dashboard.
 *
 * Key Features:
 * - Role-based navigation and email prompts for new users.
 * - Loading states and error handling during authentication.
 * - Integration with blockchain for user role and email retrieval.
 */

import React, { useState } from 'react';
import { isAuthenticated, waitForAuthentication, getPublicKey } from '@babbage/sdk-ts';
import { useNavigate } from 'react-router-dom';
import { fetchUserRoleFromBlockchain, addKeyUser, getUserEmail } from '../services/blockchain/blockchain';

/**
 * Function: connectWallet
 * Description:
 * Handles wallet authentication and retrieves the user's public key. Ensures the user is authenticated
 * before returning the key.
 * @returns {Promise<string | null>} The public key if successfully connected, or null if an error occurs.
 */
const connectWallet = async () => {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      await waitForAuthentication();
    }
    const publicKey = await getPublicKey({ identityKey: true });
    return publicKey;
  } catch (error) {
    console.error('Error connecting to wallet:', error);
    return null;
  }
};

/**
 * Component: LoginPage
 * Props:
 * - onLoginSuccess: Function called after successful login with the user's public key and email.
 * Description:
 * This component handles user login via wallet authentication. It identifies user roles and navigates
 * them to the appropriate part of the application. New users are prompted for email registration.
 */
const LoginPage: React.FC<{ onLoginSuccess: (publicKey: string, email: string) => void }> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [emailPrompt, setEmailPrompt] = useState(false);
  const navigate = useNavigate();

  /**
   * Function: handleConnectWallet
   * Description:
   * Connects to the user's wallet, fetches their public key, determines their role, and navigates them
   * to the appropriate page. If the user is new, prompts them to register their email.
   */
  const handleConnectWallet = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const publicKey = await connectWallet();
      if (publicKey) {
        const role = await fetchUserRoleFromBlockchain(publicKey);
        if (role) {
          const userEmail = await getUserEmail(publicKey);

          // Navigate based on role
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
          // Prompt for email if role is null
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

  /**
   * Function: handleEmailSubmit
   * Description:
   * Registers a new user with their public key and email, then navigates them to the onboarding page.
   */
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

      {/* Wallet Connect Button */}
      <button onClick={handleConnectWallet} disabled={isLoading}>
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {/* Email Registration Prompt */}
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

      {/* Error Message */}
      {errorMessage && <p className="error-message">{errorMessage}</p>}
    </div>
  );
};

export default LoginPage;
