import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storeTeamMemberOnBlockchain, createBlockchainFileForUser, checkUserExistsOnBlockchain } from '../services/blockchain/blockchain';

const OnboardingPage: React.FC<{ publicKey: string; email: string }> = ({ publicKey, email }) => {
  const navigate = useNavigate();

  // States for various sections of onboarding
  const [step, setStep] = useState<number>(1);
  const [primaryAccounts, setPrimaryAccounts] = useState({
    incomeAccounts: '',
    expenseAccounts: '',
    assetAccounts: '',
    liabilityAccounts: ''
  });
  const [budgetCategories, setBudgetCategories] = useState<string[]>(['Rent', 'Utilities', 'Salaries']);
  const [teamMembers, setTeamMembers] = useState<{ email: string; role: string }[]>([]);
  const [backupCompleted, setBackupCompleted] = useState<boolean>(false);

  // Check if the user already exists in the "blockchain" (i.e., in the database)
  useEffect(() => {
    const checkExistingUser = async () => {
      const userExists = await checkUserExistsOnBlockchain(publicKey);
      if (!userExists) {
        // Create a new blockchain entry for the key user if not already present
        await createBlockchainFileForUser(publicKey, email);
      }
    };

    checkExistingUser();
  }, [publicKey, email]);

  // Handlers for form inputs
  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    setPrimaryAccounts({
      ...primaryAccounts,
      [type]: e.target.value
    });
  };

  const handleBudgetChange = (index: number, value: string) => {
    const updatedCategories = [...budgetCategories];
    updatedCategories[index] = value;
    setBudgetCategories(updatedCategories);
  };

  const handleAddBudgetCategory = () => {
    setBudgetCategories([...budgetCategories, '']);
  };

  const handleRemoveBudgetCategory = (index: number) => {
    const updatedCategories = [...budgetCategories];
    updatedCategories.splice(index, 1);
    setBudgetCategories(updatedCategories);
  };

  // Add a team member and store them on the blockchain (in the database)
  const handleAddTeamMember = async (teamEmail: string, role: string) => {
    try {
      await storeTeamMemberOnBlockchain(publicKey, teamEmail, role); // Store team member on the blockchain
      setTeamMembers([...teamMembers, { email: teamEmail, role }]);
    } catch (error) {
      console.error('Error adding team member to blockchain:', error);
    }
  };

  const handleRemoveTeamMember = (index: number) => {
    const updatedMembers = [...teamMembers];
    updatedMembers.splice(index, 1);
    setTeamMembers(updatedMembers);
  };

  const handleBackupComplete = () => {
    setBackupCompleted(true);
  };

  const handleNextStep = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      // If all steps are complete, navigate to the dashboard
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
      <p>Step {step} of 5</p>

      {/* Step 1: Create Primary Accounts */}
      {step === 1 && (
        <div>
          <h2>Create Primary Accounts</h2>
          <div>
            <label>Income Accounts:</label>
            <input
              type="text"
              value={primaryAccounts.incomeAccounts}
              onChange={(e) => handleAccountChange(e, 'incomeAccounts')}
              placeholder="e.g., Sales, Consulting"
            />
          </div>
          <div>
            <label>Expense Accounts:</label>
            <input
              type="text"
              value={primaryAccounts.expenseAccounts}
              onChange={(e) => handleAccountChange(e, 'expenseAccounts')}
              placeholder="e.g., Rent, Utilities"
            />
          </div>
          <div>
            <label>Asset Accounts:</label>
            <input
              type="text"
              value={primaryAccounts.assetAccounts}
              onChange={(e) => handleAccountChange(e, 'assetAccounts')}
              placeholder="e.g., Property, Investments"
            />
          </div>
          <div>
            <label>Liability Accounts:</label>
            <input
              type="text"
              value={primaryAccounts.liabilityAccounts}
              onChange={(e) => handleAccountChange(e, 'liabilityAccounts')}
              placeholder="e.g., Loans, Accounts Payable"
            />
          </div>
        </div>
      )}

      {/* Step 2: Set Budget Categories */}
      {step === 2 && (
        <div>
          <h2>Set Up Budget Categories</h2>
          {budgetCategories.map((category, index) => (
            <div key={index}>
              <input
                type="text"
                value={category}
                onChange={(e) => handleBudgetChange(index, e.target.value)}
                placeholder={`Category ${index + 1}`}
              />
              <button onClick={() => handleRemoveBudgetCategory(index)}>Remove</button>
            </div>
          ))}
          <button onClick={handleAddBudgetCategory}>Add New Category</button>
        </div>
      )}

      {/* Step 3: Add Team Members and Assign Roles */}
      {step === 3 && (
        <div>
          <h2>Add Team Members & Assign Roles</h2>
          {teamMembers.map((member, index) => (
            <div key={index}>
              <p>{member.email} - {member.role}</p>
              <button onClick={() => handleRemoveTeamMember(index)}>Remove</button>
            </div>
          ))}
          <div>
            <label>Email:</label>
            <input type="email" id="team-email" placeholder="e.g., member@example.com" />
            <label>Role:</label>
            <select id="team-role">
              <option value="Manager">Manager</option>
              <option value="Accountant">Accountant</option>
              <option value="Staff">Staff</option>
            </select>
            <button onClick={() => handleAddTeamMember(
              (document.getElementById('team-email') as HTMLInputElement).value,
              (document.getElementById('team-role') as HTMLSelectElement).value
            )}>Add Team Member</button>
          </div>
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
