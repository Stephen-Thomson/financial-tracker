/**
 * File: TransactionPage.tsx
 * Author: Stephen Thomson
 * Date Created: 11/30/2024
 * Description:
 * This component provides an interface for recording financial transactions. It integrates
 * with blockchain technology for secure transaction management and backend APIs for account data.
 *
 * Functionalities:
 * - Allows users to select debit and credit accounts from a list of available accounts.
 * - Records transactions by creating both debit and credit entries.
 * - Ensures that the debit and credit amounts match before submission.
 * - Displays form validation and prevents submission if inputs are invalid.
 * - Communicates with blockchain and backend services to securely store transactions.
 *
 * Dependencies:
 * - React: For building the UI.
 * - react-datepicker: For selecting transaction dates.
 * - @babbage/sdk-ts: For blockchain integration and retrieving the user's public key.
 * - axios: For making HTTP requests to the backend.
 */

import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { handleTransaction } from '../services/blockchain/blockchain';
import { getPublicKey } from '@babbage/sdk-ts';
import axios from 'axios';

interface Account {
  name: string;
  basket: string;
}

/**
 * Component: TransactionPage
 * Description:
 * Provides a form for recording financial transactions. Users can specify debit and credit
 * accounts, amounts, descriptions, and transaction dates. Validates user input and interacts
 * with the blockchain for secure transaction logging.
 */
const TransactionPage: React.FC = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [accountDebit, setAccountDebit] = useState<string>('');
  const [accountCredit, setAccountCredit] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [debitAmount, setDebitAmount] = useState<number>(0);
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userPublicKey, setUserPublicKey] = useState<string>('');
  const [accounts, setAccounts] = useState<Account[]>([]);

  /**
   * Effect: Fetch Accounts and Public Key
   * Description:
   * Fetches the user's public key and a list of accounts from the backend on component mount.
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const publicKey = await getPublicKey({ reason: 'Transaction authorization', identityKey: true });
        setUserPublicKey(publicKey || '');

        const response = await axios.get('http://localhost:5000/api/accounts');
        if (response.status === 200) {
          setAccounts(response.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  /**
   * Function: handleSubmit
   * Description:
   * Validates and processes the transaction form. Records both debit and credit entries
   * in the blockchain and backend if the inputs are valid.
   */
  const handleSubmit = async () => {
    if (debitAmount !== creditAmount) {
      alert('Debit and Credit amounts must match.');
      return;
    }

    setIsLoading(true);
    try {
      const formattedDate = date.toISOString().split('T')[0];

      const debitEntry = {
        accountName: accountDebit,
        date: formattedDate,
        description,
        debitAmount,
        creditAmount: 0,
        userPublicKey,
      };

      const creditEntry = {
        accountName: accountCredit,
        date: formattedDate,
        description,
        debitAmount: 0,
        creditAmount,
        userPublicKey,
      };

      await handleTransaction(debitEntry);
      await handleTransaction(creditEntry);

      setDate(new Date());
      setAccountDebit('');
      setAccountCredit('');
      setDescription('');
      setDebitAmount(0);
      setCreditAmount(0);
      alert('Transaction successfully recorded.');
    } catch (error) {
      alert('Error recording transaction. Please check input and try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1>Record New Transaction</h1>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
        }}
      >
        {/* Transaction Date */}
        <label>Date:</label>
        <DatePicker selected={date} onChange={(date: Date | null) => date && setDate(date)} />

        {/* Debit Account Selection */}
        <label>Debit Account:</label>
        <select
          value={accountDebit}
          onChange={(e) => setAccountDebit(e.target.value)}
          style={{ padding: '10px', fontSize: '16px' }}
        >
          <option value="" disabled>
            Select Account
          </option>
          {accounts.map((account) => (
            <option key={account.name} value={account.name}>
              {account.name} ({account.basket})
            </option>
          ))}
        </select>

        {/* Credit Account Selection */}
        <label>Credit Account:</label>
        <select
          value={accountCredit}
          onChange={(e) => setAccountCredit(e.target.value)}
          style={{ padding: '10px', fontSize: '16px' }}
        >
          <option value="" disabled>
            Select Account
          </option>
          {accounts.map((account) => (
            <option key={account.name} value={account.name}>
              {account.name} ({account.basket})
            </option>
          ))}
        </select>

        {/* Transaction Description */}
        <label>Description (optional):</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter transaction description"
          style={{ padding: '10px', fontSize: '16px' }}
        />

        {/* Debit Amount Input */}
        <label>Debit Amount:</label>
        <input
          type="number"
          value={debitAmount}
          onChange={(e) => setDebitAmount(Number(e.target.value))}
          placeholder="Enter debit amount"
          style={{ padding: '10px', fontSize: '16px' }}
        />

        {/* Credit Amount Input */}
        <label>Credit Amount:</label>
        <input
          type="number"
          value={creditAmount}
          onChange={(e) => setCreditAmount(Number(e.target.value))}
          placeholder="Enter credit amount"
          style={{ padding: '10px', fontSize: '16px' }}
        />

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading || debitAmount !== creditAmount}
          style={{
            padding: '10px',
            fontSize: '16px',
            backgroundColor: debitAmount === creditAmount ? '#007bff' : '#ccc',
            color: '#fff',
            cursor: debitAmount === creditAmount ? 'pointer' : 'not-allowed',
            border: 'none',
          }}
        >
          {isLoading ? 'Processing...' : 'Post Transaction'}
        </button>
      </div>
    </div>
  );
};

export default TransactionPage;
