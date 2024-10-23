import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const OnboardingPage: React.FC<{ publicKey: string; email: string }> = ({ publicKey, email }) => {
  const navigate = useNavigate();

  // States for various sections of onboarding
  const [step, setStep] = useState<number>(1);
  const [backupCompleted, setBackupCompleted] = useState<boolean>(false);

  const handleBackupComplete = () => {
    setBackupCompleted(true);
  };

  const handleNextStep = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      navigate('/dashboard');
    }
  };

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="onboarding-page">
      <h1>Onboarding Process</h1>
      <p>Public Key: {publicKey}</p>
      <p>Email: {email}</p>
      <p>Step {step} of 5</p>

      {/* Step 1: Create Primary Accounts */}
      {step === 1 && (
        <div>
          <h2>Create Primary Accounts</h2>
          <p>Click the button below to set up your primary accounts (Income, Expenses, Assets, Liabilities).</p>
          <button onClick={() => navigate('/create-accounts?onboarding=true')}>Set Up Accounts</button>
        </div>
      )}

      {/* Step 3: Add Team Members and Assign Roles */}
      {step === 3 && (
        <div>
          <h2>Add Team Members & Assign Roles</h2>
          <p>Click the button below to add team members and assign roles.</p>
          <button onClick={() => navigate('/manager?onboarding=true')}>Add Team Members</button>
        </div>
      )}

      {/* Step 4: Backup Wallet and Security */}
      {step === 4 && (
        <div>
          <h2>Backup & Security</h2>
          <p>It's important to back up your wallet to secure your financial data.</p>
          <button onClick={handleBackupComplete}>I Have Completed Backup</button>
          {backupCompleted && <p>Backup completed successfully!</p>}
        </div>
      )}

      {/* Step 5: Completion */}
      {step === 5 && (
        <div>
          <h2>Onboarding Complete</h2>
          <p>You've successfully completed the setup. You can now start managing your finances.</p>
          <button onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="onboarding-navigation">
        {step > 1 && <button onClick={handlePreviousStep}>Back</button>}
        <button onClick={handleNextStep}>{step === 5 ? 'Complete Onboarding' : 'Next'}</button>
      </div>
    </div>
  );
};

export default OnboardingPage;
