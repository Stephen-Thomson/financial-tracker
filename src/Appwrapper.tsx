/**
 * File: AppWrapper.tsx
 * Author: Stephen Thomson
 * Date Created: 11/30/2024
 * Description:
 * The main application wrapper component for managing user authentication, navigation, and routing. 
 * This component dynamically renders content based on the user's role and onboarding status.
 *
 * Functionalities:
 * - Handles user login and role-based navigation.
 * - Renders different pages and components based on the user's role and state.
 * - Provides a navigation header with links appropriate to the user's role.
 *
 * Routes:
 * - LoginPage
 * - OnboardingPage
 * - Dashboard
 * - BudgetPage
 * - TransactionPage
 * - GeneralJournal
 * - Account creation pages (Income, Expense, Asset, Liability)
 * - ManagerPage
 * - Messaging and File Upload/Download Pages
 */

// Import dependencies
import React, { useState } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { fetchUserRoleFromBlockchain } from './services/blockchain/blockchain';

// Import pages/components
import LoginPage from './pages/LoginPage';
import BudgetPage from './pages/BudgetPage';
import TransactionPage from './pages/TransactionPage';
import CreateExpense from './components/CreateExpense';
import CreateIncome from './components/CreateIncome';
import CreateAsset from './components/CreateAsset';
import CreateLiability from './components/CreateLiability';
import CreateAccountsPage from './pages/CreateAccountsPage';
import ManagerPage from './pages/ManagerPage';
import OnboardingPage from './pages/OnboardingPage';
import Dashboard from './pages/Dashboard';
import MessagePage from './pages/MessagePage';
import ViewAccountPage from './pages/ViewAccountPage';
import ViewGeneralJournalPage from './pages/ViewGeneralJournalPage';
import UploadInvoicesPage from './pages/UploadInvoicesPage';
import DownloadInvoicesPage from './pages/DownloadInvoicesPage';

/**
 * Main application wrapper component
 */
const AppWrapper: React.FC = () => {
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isKeyPerson, setIsKeyPerson] = useState<boolean | null>(null);
  const [userPublicKey, setUserPublicKey] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation(); // Get the current path

  /**
   * Function: checkUserRole
   * Description:
   * Fetches the user's role from the blockchain and updates the state.
   *
   * @param {string} publicKey - User's public key.
   */
  const checkUserRole = async (publicKey: string) => {
    try {
      const role = await fetchUserRoleFromBlockchain(publicKey);
      setUserRole(role);

      if (role === 'Deleted') {
        alert('Access Denied: Your account has been deactivated.');
      } else if (role === 'keyPerson') {
        setIsKeyPerson(true);
        setIsOnboarded(false);
      } else {
        setIsKeyPerson(false);
        setIsOnboarded(true);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      setIsKeyPerson(null);
      setIsOnboarded(null);
    }
  };

  /**
   * Function: handleLoginSuccess
   * Description:
   * Handles successful login by setting the user's public key, email, and fetching their role.
   *
   * @param {string} publicKey - User's public key.
   * @param {string} email - User's email address.
   */
  const handleLoginSuccess = async (publicKey: string, email: string) => {
    setUserPublicKey(publicKey);
    setUserEmail(email);
    await checkUserRole(publicKey);
  };

  return (
    <div className="app-wrapper">
      {/* Header with navigation links based on user role */}
      <header>
        <nav>
          <Link to="/dashboard" style={{ marginRight: '16px' }}>Dashboard</Link>
          {['keyPerson', 'Manager', 'Accountant'].includes(userRole!) && (
            <>
              <Link to="/budget" style={{ marginRight: '16px' }}>Budget</Link>
              <Link to="/create-accounts" style={{ marginRight: '16px' }}>Create Accounts</Link>
              {userRole === 'keyPerson' && <Link to="/manager" style={{ marginRight: '16px' }}>Manage Team</Link>}
              <Link to="/transaction" style={{ marginRight: '16px' }}>Transaction</Link>
              <Link to="/viewAccount" style={{ marginRight: '16px' }}>View Accounts</Link>
              <Link to="/viewGeneralJournal" style={{ marginRight: '16px' }}>View General Journal</Link>
              <Link to="/downloadInvoices" style={{ marginRight: '16px' }}>Download Invoices</Link>
            </>
          )}
          {['keyPerson', 'Manager', 'Accountant', 'Staff'].includes(userRole!) && (
            <>
              <Link to="/message" style={{ marginRight: '16px' }}>Messages</Link>
              <Link to="/uploadInvoices" style={{ marginRight: '16px' }}>Upload Invoices</Link>
            </>
          )}
        </nav>
      </header>

      {/* Main content routes */}
      <Routes>
        <Route path="/" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
        {userPublicKey && userEmail && userRole !== 'Deleted' && (
          <>
            <Route path="/onboarding" element={<OnboardingPage publicKey={userPublicKey} email={userEmail} />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/transaction" element={<TransactionPage />} />
            <Route path="/createExpense" element={<CreateExpense />} />
            <Route path="/createIncome" element={<CreateIncome />} />
            <Route path="/createAsset" element={<CreateAsset />} />
            <Route path="/createLiability" element={<CreateLiability />} />
            <Route path="/create-accounts" element={<CreateAccountsPage />} />
            <Route path="/manager" element={<ManagerPage onboarding={true} />} />
            <Route path="/message" element={<MessagePage />} />
            <Route path="/viewAccount" element={<ViewAccountPage />} />
            <Route path="/viewGeneralJournal" element={<ViewGeneralJournalPage />} />
            <Route path="/uploadInvoices" element={<UploadInvoicesPage />} />
            <Route path="/downloadInvoices" element={<DownloadInvoicesPage />} />
          </>
        )}
      </Routes>
    </div>
  );
};

export default AppWrapper;
