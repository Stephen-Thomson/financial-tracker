import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createAction, getPublicKey } from '@babbage/sdk-ts';
import pushdrop from 'pushdrop';

const CreateExpense: React.FC = () => {
  const [accountName, setAccountName] = useState<string>('');
  const [editPermission, setEditPermission] = useState<'Manager' | 'Accountant' | 'Staff'>('Manager');
  const [viewPermission, setViewPermission] = useState<'Manager' | 'Accountant' | 'Staff' | 'Viewer'>('Viewer');
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
  
      // Generate the output script using pushdrop for account creation entry
      const accountCreationOutputScript = await pushdrop.create({
        fields: [
          Buffer.from(date.toISOString()),     // Date of Entry
          Buffer.from("Account creation"),     // Description of Entry
          Buffer.from("0"),                    // Debit Amount
          Buffer.from("0"),                    // Credit Amount
          Buffer.from("Expense")               // Account Type
        ],
        protocolID: 'financial-tracker-accountentry', // Protocol ID for Financial Tracker
        keyID: userPublicKey || 'default-key-id'      // User’s public key
      });
  
      // Create blockchain transaction with generated script
      const actionResult = await createAction({
        outputs: [
          {
            satoshis: 1,  // Set a minimum satoshi amount for creating the entry
            script: accountCreationOutputScript,
            description: 'Expense account creation entry'
          }
        ],
        description: 'Creating expense account entry transaction'
      });
  
      // Extract transaction details
      const txid = actionResult.txid;
      const rawTx = actionResult.rawTx;
  
      // Optionally store entry metadata in backend
      await axios.post('/api/accounts/entry', {
        accountName,
        date: date.toISOString().split('T')[0],
        description: 'Account creation',
        debit: 0,
        credit: 0,
        runningTotal: 0,
        typeOfAccount: 'Expense',
        editPermission,
        viewPermission,
        txid,
        outputScript: accountCreationOutputScript,
        metadata: { rawTx }
      });
  
      // Navigate back to accounts page
      navigate('/create-accounts');
    } catch (error) {
      console.error('Error creating expense account:', error);
    }
  };

  return (
    <div>
      <h1>Create Expense Account</h1>
      <label>Account Name:</label>
      <input
        type="text"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        placeholder="Enter account name"
      />
      <label>Edit Permission Level:</label>
      <select value={editPermission} onChange={(e) => setEditPermission(e.target.value as 'Manager' | 'Accountant' | 'Staff')}>
        <option value="Manager">Manager</option>
        <option value="Accountant">Accountant</option>
        <option value="Staff">Staff</option>
      </select>
      <label>View Permission Level:</label>
      <select value={viewPermission} onChange={(e) => setViewPermission(e.target.value as 'Manager' | 'Accountant' | 'Staff' | 'Viewer')}>
        <option value="Manager">Manager</option>
        <option value="Accountant">Accountant</option>
        <option value="Staff">Staff</option>
        <option value="Viewer">Viewer</option>
      </select>
      <label>Date:</label>
      <DatePicker
        selected={date}
        onChange={(date: Date | null) => {
          if (date) setDate(date);
        }}
      />
      <button onClick={handleCreateAccount}>Create Expense Account</button>
    </div>
  );
};

export default CreateExpense;
