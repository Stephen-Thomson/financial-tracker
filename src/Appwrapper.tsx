import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { fetchUserRoleFromBlockchain } from './services/blockchain/blockchain';

// Import pages/components
import LoginPage from './pages/LoginPage';
import AdjustableBudgetPage from './pages/AdjustableBudgetPage';
import BudgetPage from './pages/BudgetPage';
import TransactionPage from './pages/TransactionPage';
import GeneralJournal from './components/GeneralJournal';
import CreateExpense from './components/CreateExpense';
import CreateIncome from './components/CreateIncome';
import Totals from './components/Totals';
import OnboardingPage from './pages/OnboardingPage';
import Dashboard from './pages/Dashboard';

// Wrapper for the app, responsible for routing
const Appwrapper: React.FC = () => {
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null); // Track if the user has completed onboarding
  const [isKeyPerson, setIsKeyPerson] = useState<boolean | null>(null); // Track if the user is the key person
  const navigate = useNavigate();

  // Function to check user's role from blockchain
  const checkUserRole = async (publicKey: string) => {
    try {
      const role = await fetchUserRoleFromBlockchain(publicKey);

      if (role === 'keyPerson') {
        setIsKeyPerson(true); // User is key person
        setIsOnboarded(false); // Assume not onboarded until proven otherwise
      } else if (role === 'limitedUser') {
        setIsKeyPerson(false); // Limited user, not key person
        setIsOnboarded(true);  // Limited users are assumed to bypass onboarding
      } else {
        setIsKeyPerson(null); // No valid role found
        setIsOnboarded(null);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  // Handle login success by routing to the appropriate page
  const handleLoginSuccess = async (publicKey: string) => {
    await checkUserRole(publicKey);

    if (isKeyPerson && !isOnboarded) {
      navigate('/onboarding'); // Key person not onboarded, go to onboarding
    } else if (isOnboarded) {
      navigate('/dashboard'); // Go to dashboard if onboarded or limited user
    } else {
      console.error('No valid role or onboarding status found.');
    }
  };

  return (
    <Router>
      <Routes>
        {/* Define the routes for each page or component */}
        <Route path="/" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/adjustableBudget" element={<AdjustableBudgetPage />} />
        <Route path="/transaction" element={<TransactionPage />} />
        <Route path="/generalJournal" element={<GeneralJournal />} />
        <Route path="/createExpense" element={<CreateExpense />} />
        <Route path="/createIncome" element={<CreateIncome />} />
        <Route path="/totals" element={<Totals />} />
        {/* Add more routes as needed */}
      </Routes>
    </Router>
  );
};

export default Appwrapper;
