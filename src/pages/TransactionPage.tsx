import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { handleTransaction } from '../services/blockchain/blockchain';
import { getPublicKey } from '@babbage/sdk-ts';

const TransactionPage: React.FC = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [accountDebit, setAccountDebit] = useState<string>('');
  const [accountCredit, setAccountCredit] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [debitAmount, setDebitAmount] = useState<number>(0);
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userPublicKey, setUserPublicKey] = useState<string>('');

  // Fetch user's public key when the page loads
  useEffect(() => {
    const fetchPublicKey = async () => {
      const publicKey = await getPublicKey({ reason: 'Transaction authorization', identityKey: true });
      setUserPublicKey(publicKey || ''); // Set a default empty string if publicKey is undefined
    };
    fetchPublicKey();
  }, []);

  // Handle transaction submission
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Prepare date in required format
      const formattedDate = date.toISOString().split('T')[0];
      
      // Prepare entries for debit and credit transactions
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

      // Call handleTransaction for both entries
      await handleTransaction(debitEntry);
      await handleTransaction(creditEntry);

      // Reset the form on successful submission
      setDate(new Date());
      setAccountDebit('');
      setAccountCredit('');
      setDescription('');
      setDebitAmount(0);
      setCreditAmount(0);
      alert("Transaction successfully recorded.");
    } catch (error) {
      alert("Error recording transaction. Please check input and try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="transaction-page">
      <h1>Record New Transaction</h1>

      {/* Transaction Date */}
      <label>Date:</label>
      <DatePicker
        selected={date}
        onChange={(date: Date | null) => date && setDate(date)}
      />

      {/* Debit Account Selection */}
      <label>Debit Account:</label>
      <select value={accountDebit} onChange={(e) => setAccountDebit(e.target.value)}>
        <option value="" disabled>Select Account</option>
        <option value="cash">Cash</option>
        <option value="inventory">Inventory</option>
        {/* Add more accounts as needed */}
      </select>

      {/* Credit Account Selection */}
      <label>Credit Account:</label>
      <select value={accountCredit} onChange={(e) => setAccountCredit(e.target.value)}>
        <option value="" disabled>Select Account</option>
        <option value="revenue">Revenue</option>
        <option value="accounts_payable">Accounts Payable</option>
        {/* Add more accounts as needed */}
      </select>

      {/* Transaction Description */}
      <label>Description (optional):</label>
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Enter transaction description"
      />

      {/* Debit and Credit Amounts */}
      <label>Debit Amount:</label>
      <input
        type="number"
        value={debitAmount}
        onChange={(e) => setDebitAmount(Number(e.target.value))}
        placeholder="Enter debit amount"
      />

      <label>Credit Amount:</label>
      <input
        type="number"
        value={creditAmount}
        onChange={(e) => setCreditAmount(Number(e.target.value))}
        placeholder="Enter credit amount"
      />

      {/* Submit Button */}
      <button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Post Transaction'}
      </button>
    </div>
  );
};

export default TransactionPage;
