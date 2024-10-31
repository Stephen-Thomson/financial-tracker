import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link } from 'react-router-dom';
import { fetchUserRoleFromBlockchain } from './services/blockchain/blockchain';

// Import pages/components
import LoginPage from './pages/LoginPage';
import AdjustableBudgetPage from './pages/AdjustableBudgetPage';
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
import PaymentPage from './pages/PaymentPage';
import ViewAccountPage from './pages/ViewAccountPage'; // New page
import ViewGeneralJournalPage from './pages/ViewGeneralJournalPage'; // New page

const AppWrapper: React.FC = () => {
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isKeyPerson, setIsKeyPerson] = useState<boolean | null>(null);
  const [userPublicKey, setUserPublicKey] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // Store user role
  const navigate = useNavigate();

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

  useEffect(() => {
    if (isKeyPerson !== null && isOnboarded !== null) {
      if (userRole !== 'Deleted') {
        if (isKeyPerson && !isOnboarded) {
          navigate('/onboarding');
        } else if (isOnboarded) {
          navigate('/dashboard');
        }
      }
    }
  }, [isKeyPerson, isOnboarded, userRole, navigate]);

  return (
    <div className="app-wrapper">
      {/* Header with navigation links based on user role */}
      <header>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          {['keyPerson', 'Manager', 'Accountant'].includes(userRole!) && (
            <>
              <Link to="/adjustableBudget">Adjustable Budget</Link>
              <Link to="/budget">Budget</Link>
              <Link to="/create-accounts">Create Accounts</Link>
              {userRole === 'keyPerson' && <Link to="/manager">Manage Team</Link>}
              <Link to="/transaction">Transaction</Link>
              <Link to="/generalJournal">General Journal</Link>
              <Link to="/viewAccount">View Accounts</Link>
              <Link to="/viewGeneralJournal">View General Journal</Link>
            </>
          )}
          {['keyPerson', 'Manager', 'Accountant', 'Staff'].includes(userRole!) && (
            <>
              <Link to="/totals">Totals</Link>
              <Link to="/message">Messages</Link>
              <Link to="/uhrp">UHRP Documents</Link>
              <Link to="/payment">Payments</Link>
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
            <Route path="/adjustableBudget" element={<AdjustableBudgetPage />} />
            <Route path="/transaction" element={<TransactionPage />} />
            <Route path="/generalJournal" element={<GeneralJournal />} />
            <Route path="/createExpense" element={<CreateExpense />} />
            <Route path="/createIncome" element={<CreateIncome />} />
            <Route path="/createAsset" element={<CreateAsset />} />
            <Route path="/createLiability" element={<CreateLiability />} />
            <Route path="/create-accounts" element={<CreateAccountsPage onboarding={true} />} />
            <Route path="/manager" element={<ManagerPage onboarding={true} />} />
            <Route path="/totals" element={<Totals />} />
            <Route path="/message" element={<MessagePage />} />
            <Route path="/uhrp" element={<UHRPPage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/viewAccount" element={<ViewAccountPage />} />
            <Route path="/viewGeneralJournal" element={<ViewGeneralJournalPage />} />
          </>
        )}
      </Routes>
    </div>
  );
};

export default AppWrapper;
