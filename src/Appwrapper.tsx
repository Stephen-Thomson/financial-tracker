import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { fetchUserRoleFromBlockchain } from './services/blockchain/blockchain';

// Import pages/components
import LoginPage from './pages/LoginPage';
import BudgetPage from './pages/BudgetPage';
import TransactionPage from './pages/TransactionPage';
import GeneralJournal from './components/GeneralJournal';
import CreateExpense from './components/CreateExpense';
import CreateIncome from './components/CreateIncome';
import CreateAsset from './components/CreateAsset';
import CreateLiability from './components/CreateLiability';
import CreateAccountsPage from './pages/CreateAccountsPage';
import ManagerPage from './pages/ManagerPage';
import Totals from './components/Totals';
import OnboardingPage from './pages/OnboardingPage';
import Dashboard from './pages/Dashboard';
import MessagePage from './pages/MessagePage';
import UHRPPage from './pages/UHRPPage';
import ViewAccountPage from './pages/ViewAccountPage';
import ViewGeneralJournalPage from './pages/ViewGeneralJournalPage';
import UploadInvoicesPage from './pages/UploadInvoicesPage';
import DownloadInvoicesPage from './pages/DownloadInvoicesPage';

const AppWrapper: React.FC = () => {
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isKeyPerson, setIsKeyPerson] = useState<boolean | null>(null);
  const [userPublicKey, setUserPublicKey] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasNavigated, setHasNavigated] = useState<boolean>(false);
  
  const navigate = useNavigate();
  const location = useLocation(); // Get the current path

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

  const handleLoginSuccess = async (publicKey: string, email: string) => {
    setUserPublicKey(publicKey);
    setUserEmail(email);
    await checkUserRole(publicKey);
  };

  // useEffect(() => {
  //   // Only run this effect if the user has not yet been navigated
  //   if (!hasNavigated && isKeyPerson !== null && isOnboarded !== null) {
  //     if (userRole !== 'Deleted') {
  //       if (isKeyPerson && !isOnboarded && location.pathname !== '/onboarding') {
  //         navigate('/onboarding');
  //         setHasNavigated(true); // Mark as navigated to avoid further redirects
  //       } else if (isOnboarded && location.pathname !== '/dashboard') {
  //         navigate('/dashboard');
  //         setHasNavigated(true); // Mark as navigated to avoid further redirects
  //       }
  //     }
  //   }
  // }, [isKeyPerson, isOnboarded, userRole, location, navigate, hasNavigated]);

  return (
    <div className="app-wrapper">
      {/* Header with navigation links based on user role */}
      <header>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          {['keyPerson', 'Manager', 'Accountant'].includes(userRole!) && (
            <>

              <Link to="/budget">Budget</Link>
              <Link to="/create-accounts">Create Accounts</Link>
              {userRole === 'keyPerson' && <Link to="/manager">Manage Team</Link>}
              <Link to="/transaction">Transaction</Link>
              <Link to="/generalJournal">General Journal</Link>
              <Link to="/viewAccount">View Accounts</Link>
              <Link to="/viewGeneralJournal">View General Journal</Link>
              <Link to="/downloadInvoices">Download Invoices</Link>
            </>
          )}
          {['keyPerson', 'Manager', 'Accountant', 'Staff'].includes(userRole!) && (
            <>
              <Link to="/totals">Totals</Link>
              <Link to="/message">Messages</Link>
              <Link to="/uhrp">UHRP Documents</Link>
              <Link to="/uploadInvoices">Upload Invoices</Link>
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
            <Route path="/generalJournal" element={<GeneralJournal />} />
            <Route path="/createExpense" element={<CreateExpense />} />
            <Route path="/createIncome" element={<CreateIncome />} />
            <Route path="/createAsset" element={<CreateAsset />} />
            <Route path="/createLiability" element={<CreateLiability />} />
            <Route path="/create-accounts" element={<CreateAccountsPage />} />
            <Route path="/manager" element={<ManagerPage onboarding={true} />} />
            <Route path="/totals" element={<Totals />} />
            <Route path="/message" element={<MessagePage />} />
            <Route path="/uhrp" element={<UHRPPage />} />
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
