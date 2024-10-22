import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storeTeamMemberOnBlockchain } from '../services/blockchain/blockchain'; 

// Define the valid account types to ensure type safety
type AccountType = 'incomeAccounts' | 'expenseAccounts' | 'assetAccounts' | 'liabilityAccounts';

const OnboardingPage: React.FC<{ publicKey: string; email: string }> = ({ publicKey, email }) => {
  const navigate = useNavigate();

  // States for various sections of onboarding
  const [step, setStep] = useState<number>(1);
  const [primaryAccounts, setPrimaryAccounts] = useState<{
    incomeAccounts: string;
    expenseAccounts: string;
    assetAccounts: string;
    liabilityAccounts: string;
  }>({
    incomeAccounts: '',
    expenseAccounts: '',
    assetAccounts: '',
    liabilityAccounts: ''
  });
  const [budgetCategories, setBudgetCategories] = useState<string[]>(['Rent', 'Utilities', 'Salaries']);
  const [teamMembers, setTeamMembers] = useState<{ email: string; role: string }[]>([]);
  const [backupCompleted, setBackupCompleted] = useState<boolean>(false);
  const [teamEmail, setTeamEmail] = useState<string>('');
  const [teamRole, setTeamRole] = useState<string>('Manager');

  // Handlers for form inputs
  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>, type: AccountType) => {
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
  const handleAddTeamMember = async () => {
    try {
      if (!teamEmail) {
        return;
      }
      await storeTeamMemberOnBlockchain(publicKey, teamEmail, teamRole);
      setTeamMembers([...teamMembers, { email: teamEmail, role: teamRole }]);
      setTeamEmail('');
      setTeamRole('Manager');
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
      navigate('/dashboard');
    }
  };

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const accountTypes: AccountType[] = ['incomeAccounts', 'expenseAccounts', 'assetAccounts', 'liabilityAccounts'];

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
          {accountTypes.map((type) => (
            <div key={type}>
              <label>{type.replace(/Accounts$/, ' Accounts')}:</label>
              <input
                type="text"
                value={primaryAccounts[type]}
                onChange={(e) => handleAccountChange(e, type)}
                placeholder={`e.g., ${type === 'incomeAccounts' ? 'Sales, Consulting' : ''}`}
              />
            </div>
          ))}
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
            <input
              type="email"
              value={teamEmail}
              onChange={(e) => setTeamEmail(e.target.value)}
              placeholder="e.g., member@example.com"
            />
            <label>Role:</label>
            <select value={teamRole} onChange={(e) => setTeamRole(e.target.value)}>
              <option value="Manager">Manager</option>
              <option value="Accountant">Accountant</option>
              <option value="Staff">Staff</option>
            </select>
            <button onClick={handleAddTeamMember}>Add Team Member</button>
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
