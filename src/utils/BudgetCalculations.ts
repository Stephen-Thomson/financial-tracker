/**
 * File: BudgetCalculations.ts
 * Author: Stephen Thomson
 * Date Created: 11/30/2024
 * Description:
 * This file contains utility functions for financial calculations such as average monthly balances,
 * liabilities, and decryption of encrypted data for budget tracking purposes.
 *
 * Functionalities:
 * - Fetch and decrypt the last running total of an account.
 * - Calculate the average monthly balance and liabilities for accounts.
 * - Fetch distinct months with account entries to determine the duration of account activity.
 */

// Import dependencies
import axios from 'axios';
import { decrypt } from '@babbage/sdk-ts';

/**
 * Function: fetchLastEntry
 * Description:
 * Fetches the last entry's encrypted data for a specified account from the backend.
 * Throws an error if no entries are found for the account.
 *
 * @param {string} accountName - The name of the account.
 * @returns {Promise<string>} - Encrypted data from the last entry.
 */
export const fetchLastEntry = async (accountName: string): Promise<string> => {
  try {
    const response = await axios.get(`http://localhost:5000/api/accounts/last-entry/${accountName}`);
    if (response.data) {
      return response.data.encryptedData;
    } else {
      throw new Error(`No entries found for account ${accountName}`);
    }
  } catch (error) {
    console.error('Error fetching last entry:', error);
    throw error;
  }
};

/**
 * Function: decryptData
 * Description:
 * Decrypts the provided encrypted data using the Babbage SDK.
 * Returns a fallback string if decryption fails.
 *
 * @param {string | undefined} encryptedData - The encrypted data to decrypt.
 * @returns {Promise<string>} - The decrypted string.
 */
const decryptData = async (encryptedData: string | undefined): Promise<string> => {
  if (!encryptedData) {
    console.warn('Attempting to decrypt empty or undefined data.');
    return '';
  }
  try {
    const decrypted = await decrypt({
      ciphertext: encryptedData,
      protocolID: [0, 'user encryption'],
      keyID: '1',
      returnType: 'string',
    });
    return typeof decrypted === 'string' ? decrypted : Buffer.from(decrypted).toString('utf8');
  } catch (error) {
    console.error('Error decrypting data:', error);
    return '[Decryption Failed]';
  }
};

/**
 * Function: getDecryptedRunningTotal
 * Description:
 * Fetches the last entry's encrypted data for an account and decrypts the running total.
 *
 * @param {string} accountName - The name of the account.
 * @returns {Promise<number>} - The decrypted running total as a number.
 */
export const getDecryptedRunningTotal = async (accountName: string): Promise<number> => {
  try {
    const encryptedData = await fetchLastEntry(accountName);
    const parsedData = JSON.parse(encryptedData);
    const decryptedRunningTotal = await decryptData(parsedData.runningTotal);
    return parseFloat(decryptedRunningTotal);
  } catch (error) {
    console.error('Error getting decrypted running total:', error);
    throw error;
  }
};

/**
 * Function: getTotalMonthsForAccount
 * Description:
 * Fetches distinct months with entries for an account and returns the count.
 *
 * @param {string} accountName - The name of the account.
 * @returns {Promise<number>} - Total number of distinct months with entries.
 */
export const getTotalMonthsForAccount = async (accountName: string): Promise<number> => {
  try {
    const response = await axios.get(`http://localhost:5000/api/accounts/${accountName}/distinct-months`);
    const months = response.data;
    return months.length;
  } catch (error) {
    console.error('Error fetching total months:', error);
    throw error;
  }
};

/**
 * Function: calculateAccountAverage
 * Description:
 * Calculates the average monthly balance for an account by dividing the running total
 * by the total number of distinct months.
 *
 * @param {string} accountName - The name of the account.
 * @returns {Promise<number>} - Average monthly balance.
 */
export const calculateAccountAverage = async (accountName: string): Promise<number> => {
  try {
    const totalMonths = await getTotalMonthsForAccount(accountName);
    const runningTotal = await getDecryptedRunningTotal(accountName);

    if (totalMonths === 0) {
      console.warn(`No months with entries for account ${accountName}. Returning 0.`);
      return 0;
    }

    return runningTotal / totalMonths;
  } catch (error) {
    console.error('Error calculating average monthly balance:', error);
    throw error;
  }
};

/**
 * Function: calculateLiabilities
 * Description:
 * Calculates the average monthly liability for a specific account by analyzing debit and credit entries.
 *
 * @param {string} accountName - The name of the account.
 * @returns {Promise<number>} - Average monthly liability.
 */
export const calculateLiabilities = async (accountName: string): Promise<number> => {
  try {
    const response = await axios.get(`http://localhost:5000/api/accounts/${accountName}/entries`);
    const entries = response.data;

    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      const parsedData = JSON.parse(entry.encrypted_data);
      const decryptedDebit = parseFloat(await decryptData(parsedData.debit));
      const decryptedCredit = parseFloat(await decryptData(parsedData.credit));

      totalDebit += decryptedDebit;
      totalCredit += decryptedCredit;
    }

    const totalLiability = totalDebit - totalCredit;
    const totalMonths = await getTotalMonthsForAccount(accountName);

    return totalMonths > 0 ? totalLiability / totalMonths : 0;
  } catch (error) {
    console.error('Error calculating liabilities:', error);
    throw error;
  }
};
