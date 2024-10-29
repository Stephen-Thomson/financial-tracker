import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createAction, getPublicKey } from '@babbage/sdk-ts';
import pushdrop from 'pushdrop'

const CreateAsset: React.FC = () => {
  const [accountName, setAccountName] = useState<string>('');
  const [editPermission, setEditPermission] = useState<'Manager' | 'Accountant' | 'Staff'>('Manager');
  const [viewPermission, setViewPermission] = useState<'Manager' | 'Accountant' | 'Staff' | 'Viewer'>('Viewer');
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
  
      // Create account in backend first
      await axios.post('/api/accounts/create', { accountName });
  
      // Generate the output script using pushdrop
      const accountEntryOutputScript = await pushdrop.create({
        fields: [
          Buffer.from(date.toISOString()),      // Date of Entry
          Buffer.from("Beginning balance"),     // Description of Entry
          Buffer.from(beginningBalance.toString()),  // Debit Amount
          Buffer.from("0"),                     // Credit Amount
          Buffer.from("Asset")                  // Account Type
        ],
        protocolID: 'financial-tracker-accountentry',  // Protocol ID for Financial Tracker
        keyID: userPublicKey || 'default-key-id'       // User’s public key
      });
  
      // Create blockchain transaction with generated script
      const actionResult = await createAction({
        outputs: [
          {
            satoshis: 1,  // Replace with desired satoshis for account creation
            script: accountEntryOutputScript,
            description: 'Asset account entry creation'
          }
        ],
        description: 'Creating asset account entry transaction'
      });
  
      // Extract transaction details
      const txid = actionResult.txid;
      const rawTx = actionResult.rawTx;
  
      // Insert initial entry as the first transaction in the account's table
      await axios.post('/api/accounts/entry', {
        accountName,
        date: date.toISOString().split('T')[0],
        description: 'Beginning balance',
        debit: beginningBalance,
        credit: 0,
        runningTotal: beginningBalance,
        typeOfAccount: 'Asset',
        editPermission,
        viewPermission,
        txid,
        outputScript: accountEntryOutputScript,
        metadata: { rawTx }
      });
  
      // Navigate to accounts page after completion
      navigate('/create-accounts');
    } catch (error) {
      console.error('Error creating asset account:', error);
    }
  };
  

  return (
    <div>
      <h1>Create Asset Account</h1>
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
      <button onClick={handleCreateAccount}>Create Asset Account</button>
    </div>
  );
};

export default CreateAsset;
