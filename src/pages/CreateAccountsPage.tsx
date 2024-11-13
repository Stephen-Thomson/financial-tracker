import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const CreateAccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const onboarding = location.state?.onboarding || false;

  // Log the `location.state` to confirm the onboarding state
  console.log("CreateAccountsPage loaded with onboarding state:", onboarding);

  useEffect(() => {
    // Check if this is called unintentionally
    console.log("CreateAccountsPage mounted");
    return () => console.log("CreateAccountsPage unmounted");
  }, []);

  const handleAccountCreationComplete = () => {
    console.log("handleAccountCreationComplete called with onboarding:", onboarding);
    
    if (onboarding) {
      navigate('/onboarding'); // Temporary: Comment this line to test if it's causing the issue
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div>
      <h1>Create Accounts</h1>
      <p>Select which account you'd like to create:</p>
      <button onClick={() => navigate('/createIncome')}>Create Income Account</button>
      <button onClick={() => navigate('/createExpense')}>Create Expense Account</button>
      <button onClick={() => navigate('/createAsset')}>Create Asset Account</button>
      <button onClick={() => navigate('/createLiability')}>Create Liability Account</button>
      <button onClick={handleAccountCreationComplete}>Done</button>
    </div>
  );
};

export default CreateAccountsPage;
