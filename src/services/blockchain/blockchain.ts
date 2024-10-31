import axios, { AxiosError } from 'axios';
import { createAction, getPublicKey } from '@babbage/sdk-ts';
import pushdrop from 'pushdrop';

type AllowedRoles = 'Manager' | 'Accountant' | 'Staff' | 'Viewer' | 'keyPerson' | 'limitedUser';

// Utility to check if an error is an AxiosError
const isAxiosError = (error: unknown): error is AxiosError => {
  return (error as AxiosError).isAxiosError !== undefined;
};

// Fetch the role of the current user based on their public key
export const fetchUserRoleFromBlockchain = async (publicKey: string): Promise<string | null> => {
  try {
    const response = await axios.get(`http://localhost:5000/api/users/role/${publicKey}`);
    return response.data.role;
  } catch (error) {
    if (isAxiosError(error)) {
      console.error('Error fetching user role from blockchain:', error.response?.data || error.message);
    } else {
      console.error('Unknown error:', error);
    }
    return null;
  }
};

// Fetch users from the blockchain (simulated by database)
export const fetchUsersFromBlockchain = async (): Promise<{ email: string; role: AllowedRoles }[]> => {
  try {
    const response = await axios.get(`http://localhost:5000/api/users`);
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      console.error('Error fetching users from blockchain:', error.response?.data || error.message);
    } else {
      console.error('Unknown error:', error);
    }
    return [];
  }
};

// Store a user on the blockchain with the full process
export const storeUserOnBlockchain = async (publicKey: string, email: string, role: AllowedRoles) => {
  try {
    // Step 1: Encrypt sensitive data (email and role)
    const encryptedEmail = await encryptData(email);
    const encryptedPublicKey = await encryptData(publicKey);

    // Step 2: Create a PushDrop Token with the encrypted fields
    const userPublicKey = await getPublicKey({ reason: 'User addition authorization', identityKey: true });
    const outputScript = await pushdrop.create({
      fields: [
        Buffer.from(new Date().toISOString()), // Timestamp
        Buffer.from(encryptedEmail),            // Encrypted email
        Buffer.from(encryptedPublicKey),             // Encrypted public key
        Buffer.from('User Addition'),           // Purpose of action
      ],
      protocolID: 'user-management',
      keyID: userPublicKey || 'default-key-id',
    });

    // Step 3: Create a Blockchain Action to log the addition
    const actionResult = await createAction({
      outputs: [{ satoshis: 1, script: outputScript, description: `Add user: ${email}` }],
      description: 'User addition transaction',
    });

    // Step 4: Store transaction details in the backend
    await axios.post('http://localhost:5000/api/users', {
      publicKey,
      email,
      role,
      txid: actionResult.txid,
      outputScript,
      metadata: { rawTx: actionResult.rawTx },
    });

    console.log(`User ${email} with role ${role} stored on the blockchain.`);
  } catch (error) {
    if (isAxiosError(error)) {
      console.error('Failed to store user on the blockchain:', error.response?.data || error.message);
    } else {
      console.error('Unknown error:', error);
    }
  }
};


// Remove a user from the blockchain
export const removeUserFromBlockchain = async (email: string) => {
  try {
    // Fetch user public key and other details for blockchain transaction
    const response = await axios.get(`http://localhost:5000/api/users/${email}`);
    const { publicKey: userPublicKey, txid, outputScript: lockingScript, amount } = response.data;

    if (!userPublicKey) {
      console.error(`Public key not found for user with email: ${email}`);
      return;
    }

    // Generate output script for deleting the user (redeem step)
    const unlockScript = await pushdrop.redeem({
      protocolID: 'user-management',
      keyID: userPublicKey || 'default-key-id',
      prevTxId: txid,
      outputIndex: 0, // assuming the index of the original user addition transaction is 0
      lockingScript,
      outputAmount: amount,
    });

    // Create blockchain action to redeem the user's token, marking it as deleted
    const redemptionAction = await createAction({
      inputs: {
        [txid]: {
          ...response.data, // include all relevant details from the original token
          outputsToRedeem: [
            {
              index: 0,
              unlockingScript: unlockScript,
            },
          ],
        },
      },
      description: `Redeem user: ${email} token (deletion)`,
    });

    // Generate blockchain entry for logging the user deletion
    const deleteOutputScript = await pushdrop.create({
      fields: [
        Buffer.from(new Date().toISOString()),
        Buffer.from(email),
        Buffer.from('deleted'),
        Buffer.from('User Deletion'),
      ],
      protocolID: 'user-management',
      keyID: userPublicKey || 'default-key-id',
    });

    const deletionAction = await createAction({
      outputs: [{ satoshis: 1, script: deleteOutputScript, description: `Delete user: ${email}` }],
      description: 'User deletion transaction',
    });

    // Update user status in backend
    await axios.delete(`http://localhost:5000/api/users/${email}`, {
      data: {
        txid: deletionAction.txid,
        outputScript: deleteOutputScript,
        metadata: { rawTx: deletionAction.rawTx },
      },
    });

    console.log(`User with email ${email} removed from the blockchain and marked as redeemed.`);
  } catch (error) {
    if (isAxiosError(error)) {
      console.error('Error removing user from blockchain:', error.response?.data || error.message);
    } else {
      console.error('Unknown error:', error);
    }
  }
};


// Transaction handling types and functions

type TransactionData = {
  accountName: string;
  date: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  userPublicKey: string;
};

type TransactionEntry = {
  date: string;
  description: string;
  debit: {
    accountName: string;
    amount: number;
  };
  credit: {
    accountName: string;
    amount: number;
  };
  userPublicKey: string;
};

// Validate that debit and credit amounts match for double-entry accounting
const validateTransaction = (debitAmount: number, creditAmount: number) => {
  if (debitAmount !== creditAmount) {
    throw new Error("Debit and Credit amounts must be equal.");
  }
};

// Adjusted handleTransaction to take only one entry at a time
export const handleTransaction = async (transaction: TransactionData) => {
  try {
    // Validate the single entry's debit and credit amounts
    validateTransaction(transaction.debitAmount, transaction.creditAmount);

    // Retrieve the user's public key
    const userPublicKey = await getPublicKey({ reason: 'Transaction authorization', identityKey: true });

    // Add public key to transaction data and post the transaction
    await postTransactionEntry({ ...transaction, userPublicKey });

  } catch (error) {
    console.error("Error in transaction handling:", error);
    throw error;
  }
};


// Function to encrypt data, including public key and email
const encryptData = async (data: string): Promise<string> => {
  const encrypted = await pushdrop.encrypt({
    plaintext: Buffer.from(data),
    protocolID: 'user-encryption',
    keyID: '1',
    returnType: 'string',
  });
  return encrypted;
};

// Function to add the key user with all necessary blockchain steps
export const addKeyUser = async (publicKey: string, email: string) => {
  try {
    // Encrypt the email and public key to secure sensitive information
    const encryptedEmail = await encryptData(email);
    const encryptedPublicKey = await encryptData(publicKey);

    // Generate the token for the user data
    const outputScript = await pushdrop.create({
      fields: [
        Buffer.from(new Date().toISOString()), // Date of entry
        Buffer.from(encryptedPublicKey),        // Encrypted public key
        Buffer.from(encryptedEmail),            // Encrypted email
        Buffer.from('keyPerson'),               // Role
        Buffer.from('Key User Creation'),       // Description of action
      ],
      protocolID: 'user-management',
      keyID: publicKey || 'default-key-id',
    });

    // Create a blockchain action to record the user creation
    const actionResult = await createAction({
      outputs: [{ satoshis: 1, script: outputScript, description: `Create key user: ${email}` }],
      description: 'Key user creation transaction',
    });

    // Store the key user in the backend database
    await axios.post('http://localhost:5000/api/users', {
      publicKey,
      email,
      role: 'keyPerson',
      txid: actionResult.txid,
      outputScript,
      tokenId: actionResult.txid, // Using the txid as a token identifier
      encryptedData: {
        publicKey: encryptedPublicKey,
        email: encryptedEmail,
      },
      encryptionMetadata: { keyID: '1', protocolID: 'user-encryption' },
      metadata: { rawTx: actionResult.rawTx },
    });

    console.log(`Key user ${email} added successfully with blockchain transaction ID ${actionResult.txid}`);
  } catch (error) {
    console.error('Error adding key user:', error);
    throw error;
  }
};

const postTransactionEntry = async (data: TransactionData) => {
  try {
    const runningTotal = await calculateRunningTotal(data.accountName, data.debitAmount, data.creditAmount);

    // Step 1: Encrypt relevant data fields
    const encryptedDescription = await encryptData(data.description);
    const encryptedDebit = await encryptData(data.debitAmount.toString());
    const encryptedCredit = await encryptData(data.creditAmount.toString());
    const encryptedRunningTotal = await encryptData(runningTotal.toString());
    const encryptedPublicKey = await encryptData(data.userPublicKey);

    // Combine all encrypted fields into a single blob
    const encryptedDataBlob = JSON.stringify({
      description: encryptedDescription,
      debit: encryptedDebit,
      credit: encryptedCredit,
      runningTotal: encryptedRunningTotal,
      publicKey: encryptedPublicKey
    });

    // Generate the pushdrop token for the transaction entry
    const outputScript = await pushdrop.create({
      fields: [
        Buffer.from(data.date),
        Buffer.from(encryptedDataBlob),
        Buffer.from(data.accountName),
      ],
      protocolID: 'financial-tracker-accountentry',
      keyID: encryptedPublicKey,
    });

    // Blockchain transaction for the entry
    const actionResult = await createAction({
      outputs: [{ satoshis: 1, script: outputScript, description: `Transaction entry for ${data.accountName}` }],
      description: 'Transaction entry transaction',
    });

    // Store the transaction entry in the backend
    await axios.post('/api/accounts/entry', {
      accountName: data.accountName,
      date: data.date,
      txid: actionResult.txid,
      outputScript,
      tokenId: actionResult.txid,
      encryptedData: encryptedDataBlob, // Store as a single blob
      encryptionMetadata: { 
        keyID: 'default-key-id',
        protocolID: 'financial-tracker-accountentry',
      },
      metadata: { rawTx: actionResult.rawTx },
    });

    // Enter entry into General Journal
    // Generate the pushdrop token for the journal entry
    const encryptedAccountName = await encryptData(data.accountName);

    // Combine all encrypted fields into a single blob
    const encryptedGJDataBlob = JSON.stringify({
      description: encryptedDescription,
      debit: encryptedDebit,
      credit: encryptedCredit,
      publicKey: encryptedPublicKey,
      accountName: encryptedAccountName,
    });

    // Generate the pushdrop token for the journal entry
    const journalOutputScript = await pushdrop.create({
      fields: [
        Buffer.from(data.date),
        Buffer.from(encryptedGJDataBlob),
      ],
      protocolID: 'financial-tracker-journalentry',
      keyID: encryptedPublicKey,
    });

    // Create the blockchain transaction for the journal entry
    const journalActionResult = await createAction({
      outputs: [{ satoshis: 1, script: journalOutputScript, description: `Journal entry for ${data.accountName}` }],
      description: 'General Journal entry transaction',
    });

    // Store the journal entry in the backend
    await axios.post('/api/general-journal/entry', {
      date: data.date,
      txid: journalActionResult.txid,
      outputScript: journalOutputScript,
      tokenId: journalActionResult.txid, // Use the txid as the token ID
      encryptedData: encryptedGJDataBlob, // Store as a single encrypted blob
      encryptionMetadata: { 
        keyID: 'default-key-id',
        protocolID: 'financial-tracker-journalentry',
      },
      metadata: { rawTx: journalActionResult.rawTx },
    });

    console.log(`Transaction entry successfully recorded for account ${data.accountName}`);

  } catch (error) {
    console.error("Error in posting transaction entry:", error);
    throw error;
  }
};



export const getUserEmail = async (publicKey: string): Promise<string | null> => {
  try {
    const response = await axios.get(`/api/users/email/${publicKey}`);
    return response.data.email;
  } catch (error) {
    console.error('Error fetching user email:', error);
    return null;
  }
};

// Helper function to calculate and retrieve the running total for the account entry
const calculateRunningTotal = async (accountName: string, debitAmount: number, creditAmount: number): Promise<number> => {
  try {
    // Step 1: Query backend for the basket and last running total of the account
    const response = await axios.get(`/api/accounts/last-entry/${accountName}`);
    const { runningTotal, basket } = response.data;

    // Step 2: Calculate the new running total based on basket type and amounts
    let newTotal: number;
    if (basket === 'asset' || basket === 'expense') {
      newTotal = runningTotal + debitAmount - creditAmount;
    } else {
      newTotal = runningTotal - debitAmount + creditAmount;
    }

    return newTotal;
  } catch (error) {
    console.error(`Error calculating running total for account ${accountName}:`, error);
    throw new Error(`Failed to calculate running total for ${accountName}`);
  }
};