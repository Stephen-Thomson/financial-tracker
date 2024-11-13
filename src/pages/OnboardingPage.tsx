import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { createAction, getPublicKey } from '@babbage/sdk-ts';
import pushdrop from 'pushdrop';

const OnboardingPage: React.FC<{ publicKey: string; email: string }> = ({ publicKey, email }) => {
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [backupCompleted, setBackupCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Create the General Journal with a blockchain entry as the onboarding starts
    const handleCreateGeneralJournal = async () => {
      setIsLoading(true);
      try {
        const userPublicKey = await getPublicKey({
          reason: 'General Journal creation authorization',
          identityKey: true,
        });

        // Step 1: Create the General Journal table on the backend
        await axios.post('http://localhost:5000/api/general-journal/create');

        // Check if the General Journal has the first entry
        const gjFirstEntry = await axios.get('http://localhost:5000/api/general-journal/first-entry');
        
        if (!gjFirstEntry.data.hasFirstEntry) {
          // Step 2: Generate the output script for the General Journal creation entry
          const journalCreationOutputScript = await pushdrop.create({
            fields: [
              Buffer.from(new Date().toISOString()), // Date of Entry
              Buffer.from("General Journal creation"), // Description of Entry
              Buffer.from("0"),                        // Debit Amount
              Buffer.from("0"),                        // Credit Amount
              Buffer.from("General Journal")           // Account Type
            ],
            protocolID: 'financial tracker journalentry', // Unique protocol ID
            keyID: userPublicKey || 'default-key-id'      // User’s public key
          });

          // Step 3: Create a blockchain transaction with the generated script
          const actionResult = await createAction({
            outputs: [
              {
                satoshis: 1,  // Set a minimum satoshi amount
                script: journalCreationOutputScript,
                description: 'General Journal creation entry'
              }
            ],
            description: 'Creating General Journal entry transaction'
          });

          // Extract transaction details
          const txid = actionResult.txid;
          const rawTx = actionResult.rawTx;

          // Step 4: Insert the General Journal creation entry into the backend
          await axios.post('http://localhost:5000/api/general-journal/entry', {
            date: new Date().toISOString().split('T')[0],
            description: 'General Journal creation',
            debit: 0,
            credit: 0,
            accountName: 'General Journal',
            viewPermission: 'Manager',
            txid,
            outputScript: journalCreationOutputScript,
            metadata: { rawTx }
          });

          console.log('General Journal created with blockchain entry');
        }
      } catch (error) {
        console.error('Error creating General Journal:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Run the General Journal creation once on load
    handleCreateGeneralJournal();
  }, []);

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
          <button onClick={() => navigate('/create-accounts', { state: { onboarding: true } })}>Set Up Accounts</button>
        </div>
      )}

      {/* Step 2: Add Team Members and Assign Roles */}
      {step === 2 && (
        <div>
          <h2>Add Team Members & Assign Roles</h2>
          <p>Click the button below to add team members and assign roles.</p>
          <button onClick={() => navigate('/manager?onboarding=true')}>Add Team Members</button>
        </div>
      )}

      {/* Step 3: Backup Wallet and Security */}
      {step === 3 && (
        <div>
          <h2>Backup & Security</h2>
          <p>It's important to back up your wallet to secure your financial data.</p>
          <button onClick={handleBackupComplete}>I Have Completed Backup</button>
          {backupCompleted && <p>Backup completed successfully!</p>}
        </div>
      )}

      {/* Step 4: Completion */}
      {step === 4 && (
        <div>
          <h2>Onboarding Complete</h2>
          <p>You've successfully completed the setup. You can now start managing your finances.</p>
          <button onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="onboarding-navigation">
        {step > 1 && <button onClick={handlePreviousStep}>Back</button>}
        <button onClick={handleNextStep} disabled={isLoading}>{step === 5 ? 'Complete Onboarding' : 'Next'}</button>
      </div>
    </div>
  );
};

export default OnboardingPage;
