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

      if (role === 'keyPerson') {
        setIsKeyPerson(true);
        setIsOnboarded(false);
      } else if (role === 'limitedUser') {
        setIsKeyPerson(false);
        setIsOnboarded(true);
      } else {
        setIsKeyPerson(null);
        setIsOnboarded(null);
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
      if (isKeyPerson && !isOnboarded) {
        navigate('/onboarding');
      } else if (isOnboarded) {
        navigate('/dashboard');
      }
    }
  }, [isKeyPerson, isOnboarded, navigate]);

  return (
    <div className="app-wrapper">
      {/* Header with navigation links based on user role */}
      <header>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          {userRole === 'keyPerson' && (
            <>
              <Link to="/budget">Budget</Link>
              <Link to="/adjustableBudget">Adjustable Budget</Link>
              <Link to="/transaction">Transaction</Link>
              <Link to="/generalJournal">General Journal</Link>
              <Link to="/create-accounts">Create Accounts</Link>
              <Link to="/manager">Manage Team</Link>
              <Link to="/totals">Totals</Link>
            </>
          )}
          {userRole === 'limitedUser' && (
            <>
              <Link to="/transaction">Transaction</Link>
              <Link to="/generalJournal">General Journal</Link>
              <Link to="/totals">Totals</Link>
            </>
          )}
        </nav>
      </header>

      {/* Main content routes */}
      <Routes>
        <Route path="/" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
        {userPublicKey && userEmail && (
          <Route path="/onboarding" element={<OnboardingPage publicKey={userPublicKey} email={userEmail} />} />
        )}
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
      </Routes>
    </div>
  );
};

export default AppWrapper;
