import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { fetchUserRoleFromBlockchain } from './services/blockchain/blockchain';

// Import pages/components
import LoginPage from './pages/LoginPage';
import AdjustableBudgetPage from './pages/AdjustableBudgetPage';
import BudgetPage from './pages/BudgetPage';
import TransactionPage from './pages/TransactionPage';
import GeneralJournal from './components/GeneralJournal';
import CreateExpense from './components/CreateExpense';
import CreateIncome from './components/CreateIncome';
import CreateAsset from './components/CreateAsset';  // Add CreateAsset
import CreateLiability from './components/CreateLiability';  // Add CreateLiability
import CreateAccountsPage from './pages/CreateAccountsPage';  // Add CreateAccountsPage
import ManagerPage from './pages/ManagerPage';  // Add ManagerPage
import Totals from './components/Totals';
import OnboardingPage from './pages/OnboardingPage';
import Dashboard from './pages/Dashboard';

const Appwrapper: React.FC = () => {
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isKeyPerson, setIsKeyPerson] = useState<boolean | null>(null);
  const [userPublicKey, setUserPublicKey] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  const checkUserRole = async (publicKey: string) => {
    try {
      const role = await fetchUserRoleFromBlockchain(publicKey);

      if (role === 'keyPerson') {
        setIsKeyPerson(true);
        setIsOnboarded(false); // Assume not onboarded until proven otherwise
      } else if (role === 'limitedUser') {
        setIsKeyPerson(false);
        setIsOnboarded(true); // Limited users bypass onboarding
      } else {
        setIsKeyPerson(null); // No valid role found
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
    await checkUserRole(publicKey); // Wait for role check to complete
  };

  useEffect(() => {
    if (isKeyPerson !== null && isOnboarded !== null) {
      if (isKeyPerson && !isOnboarded) {
        navigate('/onboarding'); // Key person not onboarded, go to onboarding
      } else if (isOnboarded) {
        navigate('/dashboard'); // Go to dashboard if onboarded or limited user
      }
    }
  }, [isKeyPerson, isOnboarded, navigate]);

  return (
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
      <Route path="/createAsset" element={<CreateAsset />} /> {/* Add CreateAsset */}
      <Route path="/createLiability" element={<CreateLiability />} /> {/* Add CreateLiability */}
      <Route path="/create-accounts" element={<CreateAccountsPage onboarding={true} />} /> {/* Add CreateAccountsPage */}
      <Route path="/manager" element={<ManagerPage onboarding={true} />} /> {/* Add ManagerPage */}
      <Route path="/totals" element={<Totals />} />
    </Routes>
  );
};

export default Appwrapper;
