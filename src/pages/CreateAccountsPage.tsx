/**
 * File: CreateAccountsPage.tsx
 * Author: Stephen Thomson
 * Date Created: 11/30/2024
 * Description:
 * This component serves as a hub for creating various types of accounts, including income, expense, asset,
 * and liability accounts. It also provides navigation to the appropriate page based on the completion status of onboarding.
 *
 * Functionalities:
 * - Provides buttons to navigate to the respective account creation pages.
 * - Logs the state of the page to ensure correct handling of the onboarding process.
 * - Includes a "Done" button that navigates to either the onboarding or dashboard page based on the current state.
 */

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Component: CreateAccountsPage
 * Description:
 * Provides an interface for creating different types of accounts (income, expense, asset, liability).
 * Handles navigation to onboarding or dashboard upon completion of account creation.
 */
const CreateAccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const onboarding = location.state?.onboarding || false;

  // Log the onboarding state for debugging purposes
  console.log('CreateAccountsPage loaded with onboarding state:', onboarding);

  useEffect(() => {
    console.log('CreateAccountsPage mounted');
    return () => console.log('CreateAccountsPage unmounted');
  }, []);

  /**
   * Function: handleAccountCreationComplete
   * Description:
   * Handles navigation when the "Done" button is clicked.
   * If the user is onboarding, navigates back to the onboarding page.
   * Otherwise, navigates to the dashboard.
   */
  const handleAccountCreationComplete = () => {
    console.log('handleAccountCreationComplete called with onboarding:', onboarding);

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

      {/* Navigation buttons for creating specific account types */}
      <button onClick={() => navigate('/createIncome')}>Create Income Account</button>
      <button onClick={() => navigate('/createExpense')}>Create Expense Account</button>
      <button onClick={() => navigate('/createAsset')}>Create Asset Account</button>
      <button onClick={() => navigate('/createLiability')}>Create Liability Account</button>

      {/* Done button to navigate based on onboarding state */}
      <button onClick={handleAccountCreationComplete}>Done</button>
    </div>
  );
};

export default CreateAccountsPage;
