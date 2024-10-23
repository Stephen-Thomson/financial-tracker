import React from 'react';
import { useNavigate } from 'react-router-dom';

interface CreateAccountsPageProps {
  onboarding: boolean;
}

const CreateAccountsPage: React.FC<CreateAccountsPageProps> = ({ onboarding }) => {
  const navigate = useNavigate();

  const handleAccountCreationComplete = () => {
    if (onboarding) {
      navigate('/onboarding');
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
