import axios from 'axios';
import { decrypt } from '@babbage/sdk-ts';

// Function to fetch the last entry's encrypted data and basket from the backend
export const fetchLastEntry = async (accountName: string) => {
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

// Decrypt data function
const decryptData = async (encryptedData: string | undefined): Promise<string> => {
  if (!encryptedData) {
    console.warn('Attempting to decrypt empty or undefined data.');
    return ''; // Return empty string if the data is invalid
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

// Function to extract and decrypt the running total from the encrypted data blob
export const getDecryptedRunningTotal = async (accountName: string): Promise<number> => {
  try {
    const encryptedData = await fetchLastEntry(accountName);

    // Parse the encrypted data blob
    const parsedData = JSON.parse(encryptedData);

    // Decrypt the running total specifically
    const decryptedRunningTotal = await decryptData(parsedData.runningTotal);

    // Convert the decrypted running total to a number
    return parseFloat(decryptedRunningTotal);
  } catch (error) {
    console.error('Error getting decrypted running total:', error);
    throw error;
  }
};

// Function to fetch distinct months and calculate the total number of months with entries
export const getTotalMonthsForAccount = async (accountName: string): Promise<number> => {
    try {
      const response = await axios.get(`http://localhost:5000/api/accounts/${accountName}/distinct-months`);
      const months = response.data; // Array of unique 'YYYY-MM' formatted strings
  
      return months.length; // Number of distinct months with entries
    } catch (error) {
      console.error('Error fetching total months:', error);
      throw error;
    }
  };

// Function to calculate the average monthly balance for an account
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

// Function to calculate the average monthly liability for a specific account
export const calculateLiabilities = async (accountName: string): Promise<number> => {
    try {
      // Fetch all entries for the account
      const response = await axios.get(`http://localhost:5000/api/accounts/${accountName}/entries`);
      const entries = response.data;
  
      let totalDebit = 0;
      let totalCredit = 0;
  
      for (const entry of entries) {
        // Parse and decrypt the encrypted data blob
        const parsedData = JSON.parse(entry.encrypted_data);
        const decryptedDebit = parseFloat(await decryptData(parsedData.debit));
        const decryptedCredit = parseFloat(await decryptData(parsedData.credit));
  
        totalDebit += decryptedDebit;
        totalCredit += decryptedCredit;
      }
  
      // Calculate the liability as total debit minus total credit
      const totalLiability = totalDebit - totalCredit;
  
      // Retrieve the total number of unique months for the account
      const totalMonths = await getTotalMonthsForAccount(accountName);
  
      // Calculate the average monthly liability
      return totalMonths > 0 ? totalLiability / totalMonths : 0;
    } catch (error) {
      console.error('Error calculating liabilities:', error);
      throw error;
    }
  };
  
