/**
 * File: blockchain.ts
 * Author: Stephen Thomson
 * Date Created: 11/30/2024
 * Last Modified: 11/30/2024
 * Description:
 * This module handles interactions with the blockchain and backend services for user and transaction management.
 * It includes functions for:
 * - Fetching user roles and details
 * - Managing users (adding, removing)
 * - Recording transactions on the blockchain and backend
 * - Encrypting and decrypting data securely
 */

import axios, { AxiosError } from 'axios';
import { createAction, getPublicKey } from '@babbage/sdk-ts';
import pushdrop from 'pushdrop';
import { encrypt, decrypt } from '@babbage/sdk-ts';

// Define allowed user roles
type AllowedRoles = 'Manager' | 'Accountant' | 'Staff' | 'Viewer' | 'keyPerson' | 'limitedUser';

// Utility function to check if an error is an AxiosError
const isAxiosError = (error: unknown): error is AxiosError => {
  return (error as AxiosError).isAxiosError !== undefined;
};

/**
 * Function: fetchUserRoleFromBlockchain
 * Description:
 * Retrieves the role of the user with the provided public key from the backend.
 *
 * @param {string} publicKey - The public key of the user.
 * @returns {Promise<string | null>} - The user's role or null if the user is not found.
 */
export const fetchUserRoleFromBlockchain = async (publicKey: string): Promise<string | null> => {
  try {
    const response = await axios.get(`http://localhost:5000/api/users/role/${publicKey}`);
    return response.data.role;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 404) {
        console.warn('No user found for this public key; assigning as initial key user.');
        return null;
      }
      console.error('Error fetching user role from blockchain:', error.response?.data || error.message);
    } else {
      console.error('Unknown error:', error);
    }
    return null;
  }
};


/**
 * Function: fetchUsersFromBlockchain
 * Description:
 * Fetches a list of users from the backend.
 *
 * @returns {Promise<{ email: string; role: AllowedRoles }[]>} - Array of users with email and roles.
 */
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

/**
 * Function: storeUserOnBlockchain
 * Description:
 * Adds a new user to the blockchain and backend with their details securely encrypted.
 *
 * @param {string} publicKey - The public key of the user.
 * @param {string} email - The email of the user.
 * @param {string} role - The role of the user.
 */
export const storeUserOnBlockchain = async (publicKey: string, email: string, role: string) => {
  try {
    // Step 1: Encrypt sensitive data (email and publicKey)
    const encryptedEmail = await encryptData(email);
    const encryptedPublicKey = await encryptData(publicKey);

    // Step 2: Create a PushDrop Token with the encrypted fields
    const userPublicKey = await getPublicKey({ reason: 'User addition authorization', identityKey: true });
    const outputScript = await pushdrop.create({
      fields: [
        Buffer.from(new Date().toISOString()),
        Buffer.from(encryptedEmail),
        Buffer.from(encryptedPublicKey),
        Buffer.from(role),
        Buffer.from('User Addition'),
      ],
      protocolID: 'user management',
      keyID: userPublicKey || 'default-key-id',
    });

    // Step 3: Create a Blockchain Action to log the addition
    const actionResult = await createAction({
      outputs: [{ satoshis: 1, script: outputScript }],
      description: `Add user: ${email}`,
    });

    // Step 4: Store transaction details in the backend database
    await axios.post('http://localhost:5000/api/users', {
      publicKey,
      email,
      role,
      txid: actionResult.txid,
      outputScript: outputScript.toString('hex'),
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

/**
 * Function: removeUserFromBlockchain
 * Description:
 * This function removes a user from the blockchain and marks them as deleted in the backend.
 * It performs the following steps:
 * 1. Fetches the user's public key and associated transaction details from the backend.
 * 2. Generates an unlock script to redeem the user's token.
 * 3. Creates a blockchain action to redeem the user's token and log the deletion.
 * 4. Updates the user's status in the backend to reflect the deletion.
 *
 * @param {string} email - The email address of the user to remove.
 * @returns {Promise<void>} - This function does not return a value but logs the result.
 */
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
      protocolID: 'user management',
      keyID: userPublicKey || 'default-key-id',
      prevTxId: txid,
      outputIndex: 0,
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
      protocolID: 'user management',
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

type TransactionData = {
  accountName: string;
  date: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  userPublicKey: string;
};

/**
 * Function: handleTransaction
 * Description:
 * Handles a single transaction entry by:
 * 1. Validating the transaction details.
 * 2. Retrieving the user's public key.
 * 3. Posting the transaction to the backend and blockchain.
 *
 * @param {TransactionData} transaction - The transaction details, including account name, amounts, and description.
 * @returns {Promise<void>} - This function does not return a value but logs the result.
 */
export const handleTransaction = async (transaction: TransactionData) => {
  try {
    // Retrieve the user's public key
    const userPublicKey = await getPublicKey({ reason: 'Transaction authorization', identityKey: true });

    // Add public key to transaction data and post the transaction
    await postTransactionEntry({ ...transaction, userPublicKey });

  } catch (error) {
    console.error("Error in transaction handling:", error);
    throw error;
  }
};

/**
 * Function: encryptData
 * Description:
 * Encrypts sensitive data, such as public keys or emails, for secure storage and transmission.
 * The function uses the specified encryption protocol and returns the encrypted data as a string.
 *
 * @param {string} data - The plaintext data to encrypt.
 * @returns {Promise<string>} - The encrypted data as a Base64-encoded string.
 * @throws {Error} - Throws an error if encryption fails.
 */
const encryptData = async (data: string): Promise<string> => {
  const encrypted = await encrypt({
    plaintext: Buffer.from(data),
    protocolID: [0, 'user encryption'],  // Update protocolID to match any previous settings
    keyID: '1',
    returnType: 'string',
  });
  
  // Ensure the return type is always a string
  return typeof encrypted === 'string' ? encrypted : Buffer.from(encrypted).toString('base64');
};


/**
 * Function: addKeyUser
 * Description:
 * Adds a new key user to the blockchain by performing the following steps:
 * 1. Encrypts sensitive user information (public key and email).
 * 2. Creates a PushDrop token to represent the user on the blockchain.
 * 3. Records the user creation as a blockchain action.
 * 4. Stores the user's details in the backend database for reference.
 *
 * @param {string} publicKey - The public key of the user to add.
 * @param {string} email - The email address of the user to add.
 * @returns {Promise<void>} - This function does not return a value but logs the result.
 * @throws {Error} - Throws an error if any of the steps fail.
 */
export const addKeyUser = async (publicKey: string, email: string) => {
  try {
    // Encrypt the email and public key to secure sensitive information
    const encryptedEmail = await encryptData(email);
    const encryptedPublicKey = await encryptData(publicKey);

    // Generate the token for the user data
    const outputScript = await pushdrop.create({
      fields: [
        Buffer.from(new Date().toISOString()),
        Buffer.from(encryptedPublicKey),
        Buffer.from(encryptedEmail),
        Buffer.from('keyPerson'),
        Buffer.from('Key User Creation'),
      ],
      protocolID: 'userManagement',
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
      tokenId: actionResult.txid,
      encryptedData: {
        publicKey: encryptedPublicKey,
        email: encryptedEmail,
      },
      encryptionMetadata: { keyID: '1', protocolID: 'userEncryption' },
      metadata: { rawTx: actionResult.rawTx },
    });

    console.log(`Key user ${email} added successfully with blockchain transaction ID ${actionResult.txid}`);
  } catch (error) {
    console.error('Error adding key user:', error);
    throw error;
  }
};

/**
 * Function: postTransactionEntry
 * Description:
 * Records a financial transaction in both the blockchain and the backend database. The transaction is 
 * encrypted to ensure confidentiality and linked to both a specific account and the general journal for auditing.
 * 
 * Steps:
 * 1. Calculate the running total for the account.
 * 2. Encrypt transaction fields (description, debit, credit, running total, public key).
 * 3. Create a blockchain transaction using PushDrop tokens.
 * 4. Save the transaction in the backend for persistence.
 * 5. Record a corresponding entry in the General Journal for auditing purposes.
 *
 * @param {TransactionData} data - The transaction data to record.
 * @returns {Promise<void>} - This function does not return a value but logs success.
 * @throws {Error} - Throws an error if any step in the transaction recording fails.
 */
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
      protocolID: 'financial tracker accountentry',
      keyID: encryptedPublicKey,
    });

    // Blockchain transaction for the entry
    const actionResult = await createAction({
      outputs: [{ satoshis: 1, script: outputScript, description: `Transaction entry for ${data.accountName}` }],
      description: 'Transaction entry transaction',
    });

    // Store the transaction entry in the backend
    await axios.post('http://localhost:5000/api/accounts/entry', {
      accountName: data.accountName,
      date: data.date,
      txid: actionResult.txid,
      outputScript,
      tokenId: actionResult.txid,
      encryptedData: encryptedDataBlob,
      encryptionMetadata: { 
        keyID: 'default-key-id',
        protocolID: 'financial tracker accountentry',
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
      protocolID: 'financial tracker journalentry',
      keyID: encryptedPublicKey,
    });

    // Create the blockchain transaction for the journal entry
    const journalActionResult = await createAction({
      outputs: [{ satoshis: 1, script: journalOutputScript, description: `Journal entry for ${data.accountName}` }],
      description: 'General Journal entry transaction',
    });

    // Store the journal entry in the backend
    await axios.post('http://localhost:5000/api/general-journal/entry', {
      date: data.date,
      txid: journalActionResult.txid,
      outputScript: journalOutputScript,
      tokenId: journalActionResult.txid,
      encryptedData: encryptedGJDataBlob,
      encryptionMetadata: { 
        keyID: 'default-key-id',
        protocolID: 'financial tracker journalentry',
      },
      metadata: { rawTx: journalActionResult.rawTx },
    });

    console.log(`Transaction entry successfully recorded for account ${data.accountName}`);

  } catch (error) {
    console.error("Error in posting transaction entry:", error);
    throw error;
  }
};

/**
 * Function: handleInitialTransaction
 * Description:
 * Records the initial financial transaction for a newly created account. The transaction is recorded 
 * on the blockchain and backend and includes an initial running total.
 *
 * @param {TransactionData} data - The initial transaction data to record.
 * @returns {Promise<void>} - This function does not return a value but logs success.
 * @throws {Error} - Throws an error if any step in the transaction recording fails.
 */
export const handleInitialTransaction = async (data: TransactionData) => {
  try {
    // Calculate the initial running total
    const runningTotal = data.debitAmount + data.creditAmount;

    // Encrypt relevant data fields
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
      publicKey: encryptedPublicKey,
    });

    // Generate the pushdrop token for the initial transaction entry
    const outputScript = await pushdrop.create({
      fields: [
        Buffer.from(data.date),
        Buffer.from(encryptedDataBlob),
        Buffer.from(data.accountName),
      ],
      protocolID: 'financial tracker accountentry',
      keyID: encryptedPublicKey,
    });

    // Blockchain transaction for the initial entry
    const actionResult = await createAction({
      outputs: [{ satoshis: 1, script: outputScript, description: `Initial entry for ${data.accountName}` }],
      description: 'Initial account entry transaction',
    });

    // Store the initial transaction entry in the backend
    await axios.post('http://localhost:5000/api/accounts/entry', {
      accountName: data.accountName,
      date: data.date,
      txid: actionResult.txid,
      outputScript,
      tokenId: actionResult.txid,
      encryptedData: encryptedDataBlob,
      encryptionMetadata: { 
        keyID: 'default-key-id',
        protocolID: 'financial tracker accountentry',
      },
      metadata: { rawTx: actionResult.rawTx },
    });

    console.log(`Initial transaction entry created for account: ${data.accountName}`);
  } catch (error) {
    console.error('Error creating initial transaction entry:', error);
    throw error;
  }
};

/**
 * Function: getUserEmail
 * Description:
 * Retrieves the email address of a user based on their public key by querying the backend API.
 *
 * @param {string} publicKey - The public key of the user.
 * @returns {Promise<string | null>} - The user's email address or null if not found.
 * @throws {Error} - Throws an error if the backend request fails.
 */
export const getUserEmail = async (publicKey: string): Promise<string | null> => {
  try {
    const response = await axios.get(`http://localhost:5000/api/users/email/${publicKey}`);
    return response.data.email;
  } catch (error) {
    console.error('Error fetching user email:', error);
    return null;
  }
};

/**
 * Function: calculateRunningTotal
 * Description:
 * Calculates the running total for a specific account by querying the backend for the latest transaction 
 * and adjusting the total based on the account type (basket) and the current transaction amounts.
 *
 * Steps:
 * 1. Fetch the last transaction entry's encrypted data and account basket type.
 * 2. Decrypt the running total from the last entry.
 * 3. Adjust the running total based on the account basket (asset, expense, liability, etc.).
 * 4. Return the updated running total.
 *
 * @param {string} accountName - The name of the account to calculate the running total for.
 * @param {number} debitAmount - The debit amount of the current transaction.
 * @param {number} creditAmount - The credit amount of the current transaction.
 * @returns {Promise<number>} - The updated running total for the account.
 * @throws {Error} - Throws an error if fetching or decrypting data fails.
 */
const calculateRunningTotal = async (accountName: string, debitAmount: number, creditAmount: number): Promise<number> => {
  try {
    // Step 1: Query backend for the last entry's encrypted data and basket
    const response = await axios.get(`http://localhost:5000/api/accounts/last-entry/${accountName}`);
    const { encryptedData, basket } = response.data;

    // Initialize running total
    let runningTotal = 0;

    try {
      // Parse the encrypted_data JSON string
      const encryptedFields = JSON.parse(encryptedData);

      // Decrypt the runningTotal
      runningTotal = Number(await decryptData(encryptedFields.runningTotal));
    } catch (parseError) {
      console.error('Error parsing or decrypting runningTotal:', parseError);
    }

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

/**
 * Function: decryptData
 * Description:
 * Decrypts encrypted data using the specified protocol and key identifiers. The function is designed 
 * to handle encrypted transaction data and ensures secure decryption for sensitive information.
 *
 * Steps:
 * 1. Verify that the input data is valid and not empty.
 * 2. Attempt to decrypt the ciphertext using the specified protocol and key IDs.
 * 3. Return the decrypted plaintext data as a string.
 * 4. Handle and log errors if decryption fails.
 *
 * @param {string | undefined} encryptedData - The encrypted data to decrypt.
 * @returns {Promise<string>} - The decrypted plaintext data.
 * @throws {Error} - Returns a placeholder message ('[Decryption Failed]') if decryption fails.
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
