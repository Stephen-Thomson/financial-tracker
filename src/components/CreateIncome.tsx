import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getPublicKey } from '@babbage/sdk-ts';
import { handleTransaction } from '../services/blockchain/blockchain';

const CreateIncome: React.FC = () => {
  const [accountName, setAccountName] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const navigate = useNavigate();

  const handleCreateAccount = async () => {
    try {
      // Fetch the user’s public key
      const userPublicKey = await getPublicKey({
        reason: 'Account creation authorization',
        identityKey: true,
      });
  
      // Create the account in the backend first
      await axios.post('/api/accounts/create', { accountName });
  
      // Prepare data for the initial transaction entry
      const transactionData = {
        accountName,
        date: date.toISOString().split('T')[0],
        description: 'Account creation',
        debitAmount: 0,
        creditAmount: 0,
        userPublicKey,
      };
  
      // Call handleTransaction to manage blockchain and backend entry
      await handleTransaction(transactionData);

      // Navigate back to accounts page
      navigate('/create-accounts');
    } catch (error) {
      console.error('Error creating income account:', error);
    }
  };

  return (
    <div>
      <h1>Create Income Account</h1>
      <label>Account Name:</label>
      <input
        type="text"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        placeholder="Enter account name"
      />
      <label>Date:</label>
      <DatePicker
        selected={date}
        onChange={(date: Date | null) => {
          if (date) setDate(date);
        }}
      />
      <button onClick={handleCreateAccount}>Create Income Account</button>
    </div>
  );
};

export default CreateIncome;
