/**
 * File: CreateLiability.tsx
 * Author: Stephen Thomson
 * Date Created: 11/30/2024
 * Description:
 * This component allows users to create a new liability account. It interacts with the backend 
 * to create the account and initializes an entry in the blockchain ledger for transaction tracking.
 *
 * Functionalities:
 * - Users can input the account name, beginning balance, and starting date of the account.
 * - Upon submission, the account is created in the backend, and an initial transaction is recorded on the blockchain.
 * - Navigates back to the accounts page after successful account creation.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getPublicKey } from '@babbage/sdk-ts';
import { handleInitialTransaction } from '../services/blockchain/blockchain';

/**
 * Component: CreateLiability
 * Description:
 * This component renders a form for creating a new liability account. It collects the account name, 
 * beginning balance, and start date from the user and sends the data to the backend and blockchain.
 */
const CreateLiability: React.FC = () => {
  // State variables for form inputs
  const [accountName, setAccountName] = useState<string>('');
  const [beginningBalance, setBeginningBalance] = useState<number>(0);
  const [date, setDate] = useState<Date>(new Date());

  // Navigation hook for redirecting after account creation
  const navigate = useNavigate();

  /**
   * Function: handleCreateAccount
   * Description:
   * Handles the account creation process by:
   * 1. Fetching the user's public key for blockchain operations.
   * 2. Sending account creation details to the backend.
   * 3. Recording the initial transaction in the blockchain ledger.
   * 4. Navigating the user back to the accounts page upon success.
   *
   * Errors during the process are logged to the console.
   */
  const handleCreateAccount = async () => {
    try {
      // Fetch the user’s public key
      const userPublicKey = await getPublicKey({
        reason: 'Account creation authorization',
        identityKey: true,
      });

      // Define account parameters
      const accountData = {
        accountName,
        basket: 'liability', // Indicates the type of account
      };

      // Create account in the backend
      await axios.post('http://localhost:5000/api/accounts/create', accountData);

      // Prepare data for the initial transaction entry
      const transactionData = {
        accountName,
        date: date.toISOString().split('T')[0], // Format date as 'YYYY-MM-DD'
        description: 'Beginning balance',
        debitAmount: 0, // Initial credit balance for liability accounts
        creditAmount: beginningBalance,
        userPublicKey,
      };

      // Call handleInitialTransaction to manage blockchain and backend entry
      await handleInitialTransaction(transactionData);

      // Navigate to accounts page after completion
      navigate('/create-accounts');
    } catch (error) {
      console.error('Error creating liability account:', error);
    }
  };

  return (
    <div>
      <h1>Create Liability Account</h1>
      {/* Input field for account name */}
      <label>Account Name:</label>
      <input
        type="text"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        placeholder="Enter account name"
      />

      {/* Input field for beginning balance */}
      <label>Beginning Balance:</label>
      <input
        type="number"
        value={beginningBalance}
        onChange={(e) => setBeginningBalance(parseFloat(e.target.value))}
        placeholder="Enter beginning balance"
      />

      {/* Date picker for selecting the account start date */}
      <label>Date:</label>
      <DatePicker
        selected={date}
        onChange={(date: Date | null) => {
          if (date) setDate(date);
        }}
      />

      {/* Button to trigger the account creation process */}
      <button onClick={handleCreateAccount}>Create Liability Account</button>
    </div>
  );
};

export default CreateLiability;
