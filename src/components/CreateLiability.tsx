import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getPublicKey } from '@babbage/sdk-ts';
import { handleTransaction } from '../services/blockchain/blockchain';

const CreateLiability: React.FC = () => {
  const [accountName, setAccountName] = useState<string>('');
  const [beginningBalance, setBeginningBalance] = useState<number>(0);
  const [date, setDate] = useState<Date>(new Date());
  const navigate = useNavigate();

  const handleCreateAccount = async () => {
    try {
      // Fetch the user’s public key
      const userPublicKey = await getPublicKey({
        reason: 'Account creation authorization',
        identityKey: true,
      });
  
      // Create the account in the backend
      await axios.post('/api/accounts/create', { accountName });
  
      // Prepare data for the initial transaction entry
      const transactionData = {
        accountName,
        date: date.toISOString().split('T')[0],
        description: 'Beginning balance',
        debitAmount: 0,                         // Debit is 0 for liabilities
        creditAmount: beginningBalance,          // Credit holds the beginning balance
        userPublicKey,
      };
  
      // Call handleTransaction to manage blockchain and backend entry
      await handleTransaction(transactionData);

      // Navigate to accounts page after completion
      navigate('/create-accounts');
    } catch (error) {
      console.error('Error creating liability account:', error);
    }
  };

  return (
    <div>
      <h1>Create Liability Account</h1>
      <label>Account Name:</label>
      <input
        type="text"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        placeholder="Enter account name"
      />
      <label>Beginning Balance:</label>
      <input
        type="number"
        value={beginningBalance}
        onChange={(e) => setBeginningBalance(parseFloat(e.target.value))}
        placeholder="Enter beginning balance"
      />
      <label>Date:</label>
      <DatePicker
        selected={date}
        onChange={(date: Date | null) => {
          if (date) setDate(date);
        }}
      />
      <button onClick={handleCreateAccount}>Create Liability Account</button>
    </div>
  );
};

export default CreateLiability;
