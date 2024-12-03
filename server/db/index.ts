/**
 * Filename: index.ts
 * Author: Stephen Thomson
 * Date Created: 11/30/2024
 * 
 * Description:
 * This file sets up and manages database operations for the application,
 * including creating tables, interacting with user data, messages, accounts,
 * and handling blockchain-related operations.
 * 
 * Functions:
 * - initializeDatabase: Initializes the database and creates required tables.
 * - getUsers: Retrieves all users from the database.
 * - addUser: Adds a new user with blockchain transaction details.
 * - removeUser: Marks a user as deleted and logs the deletion transaction.
 * - getUserRole: Retrieves the role of a user based on their public key.
 * - createAccountTable: Creates a new account table for a user.
 * - insertAccountEntry: Adds an entry to a specific account table.
 * - createGeneralJournalTable: Creates the General Journal table.
 * - getUserCount: Gets the total count of users in the database.
 * - checkUserExists: Checks if a user exists by their public key.
 * - viewAccountEntries: Retrieves entries for a specific account.
 * - insertGeneralJournalEntry: Inserts an entry into the General Journal.
 * - getUserEmailByPublicKey: Retrieves a user's email by their public key.
 * - getLastEntry: Gets the last entry in an account table.
 * - addMessage: Adds a new message to the messages table.
 * - getMessagesForUser: Retrieves messages for a specific user.
 * - updateMessageStatus: Updates the status of a message.
 * - addPaymentToken: Adds a payment token to the database.
 * - getPaymentTokensByStatus: Retrieves payment tokens by status.
 * - updatePaymentTokenStatus: Updates the status of a payment token.
 * - getPaymentTokenByTxid: Retrieves a payment token by transaction ID.
 * - getAccounts: Retrieves all accounts from the database.
 * - getAccountEntries: Retrieves entries from a specific account.
 * - getGeneralJournalEntries: Retrieves all entries from the General Journal.
 * - getDistinctMonthsForAccount: Gets distinct months from an account's entries.
 * - checkGeneralJournalFirstEntry: Checks if the General Journal has any entries.
 * - addUploadedFile: Adds an uploaded file record to the database.
 * - getAllUploadedFiles: Retrieves all uploaded files from the database.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { RowDataPacket } from 'mysql2';

// Load environment variables
dotenv.config();

// Database connection pool setup
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

/**
 * Initializes the database and creates required tables if they do not exist.
 */
const initializeDatabase = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.MYSQL_DATABASE}`);
    console.log('Database created or already exists.');
    await connection.query(`USE ${process.env.MYSQL_DATABASE}`);

    // Create users table for storing user data
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        public_key VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) DEFAULT NULL,
        role ENUM('keyPerson', 'Manager', 'Accountant', 'Staff', 'Deleted') NOT NULL,
        basket VARCHAR(50) DEFAULT 'user',
        txid VARCHAR(255), -- Blockchain Transaction ID
        output_script TEXT, -- Output Script for blockchain entry
        token_id VARCHAR(255), -- Unique identifier for tokenization
        encrypted_data TEXT, -- Encrypted user data
        encryption_metadata JSON, -- Encryption metadata (keys, algorithms, etc.)
        metadata JSON, -- Additional metadata for tracking purposes
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create the Messages table for storing messages between users
    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id VARCHAR(255) NOT NULL, -- unique identifier from PeerServ
        sender_public_key VARCHAR(255) NOT NULL, -- public key of the sender
        recipient_public_key VARCHAR(255) NOT NULL, -- public key of the recipient
        message_body TEXT NOT NULL, -- the main content of the message
        message_type ENUM('request', 'approval', 'notification', 'payment') DEFAULT 'notification', -- categorize message types
        status ENUM('pending', 'acknowledged', 'error') DEFAULT 'pending', -- message status
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
  
    // Create Payment Tokens table for tracking payment transactions
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payment_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
        encrypted_data TEXT, -- Encrypted data for sensitive fields (e.g., amount, sender/recipient keys, custom instructions)
        txid VARCHAR(255) NOT NULL, -- Unique transaction ID for tracking
        output_script TEXT NOT NULL, -- Script associated with the transaction (generated via pushdrop.create)
        token_id VARCHAR(255), -- Unique identifier for the token
        basket VARCHAR(50) DEFAULT 'payment_token', -- Classification for overlay service and state management
        encryption_metadata JSON, -- Metadata for decryption (e.g., keys, algorithm info)
        metadata JSON, -- Additional non-encrypted metadata
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Create accounts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        basket ENUM('asset', 'income', 'expense', 'liability') NOT NULL DEFAULT 'asset',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create uploaded_files table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiration_time TIMESTAMP NOT NULL,
        uhrp_hash VARCHAR(255) NOT NULL,
        public_url TEXT NOT NULL
      );
    `);

    console.log('Database and tables initialized successfully');
    connection.end();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

/**
 * Retrieves all users from the database.
 * @returns {Promise<Array>} Array of user objects.
 */
export const getUsers = async () => {
  const [rows] = await pool.query('SELECT email, role, public_key FROM users');
  return rows;
};

/**
 * Adds a new user with blockchain transaction details to the database.
 * 
 * @param {string} publicKey - The user's public key.
 * @param {string} email - The user's email address.
 * @param {string} role - The user's role (e.g., 'keyPerson', 'Manager').
 * @param {string} txid - The blockchain transaction ID.
 * @param {string} outputScript - The blockchain output script.
 * @param {string} tokenId - The unique identifier for tokenization.
 * @param {object} encryptedData - Encrypted user data.
 * @param {object} encryptionMetadata - Metadata for encryption (keys, algorithms).
 * @param {object} metadata - Additional metadata for tracking purposes.
 * @throws {Error} Throws an error if the database insertion fails.
 */
export const addUser = async (
  publicKey: string,
  email: string,
  role: string,
  txid: string,
  outputScript: string,
  tokenId: string,
  encryptedData: object,
  encryptionMetadata: object,
  metadata: object
) => {
  try {
    await pool.query(
      `INSERT INTO users (public_key, email, role, basket, txid, output_script, token_id, encrypted_data, encryption_metadata, metadata)
       VALUES (?, ?, ?, "user", ?, ?, ?, ?, ?, ?)`,
      [
        publicKey,
        email,
        role,
        txid,
        outputScript,
        tokenId,
        JSON.stringify(encryptedData),
        JSON.stringify(encryptionMetadata),
        JSON.stringify(metadata),
      ]
    );
    console.log(`User ${email} added with role ${role} and blockchain transaction ID ${txid}`);
  } catch (error) {
    console.error('Error adding user to database:', error);
    throw error;
  }
};


/**
 * Marks a user as deleted and logs the deletion transaction.
 * 
 * @param {string} email - The user's email address.
 * @param {string} txid - The blockchain transaction ID.
 * @param {string} outputScript - The blockchain output script.
 * @param {string} tokenId - The unique identifier for tokenization.
 * @param {string} encryptedData - Encrypted user data.
 * @param {object} encryptionMetadata - Metadata for encryption (keys, algorithms).
 * @param {object} metadata - Additional metadata for tracking purposes.
 * @returns {Promise<object>} The email and transaction ID of the deleted user.
 * @throws {Error} Throws an error if the database update fails.
 */
export const removeUser = async (
  email: string,
  txid: string,
  outputScript: string,
  tokenId: string,
  encryptedData: string,
  encryptionMetadata: object,
  metadata: object
) => {
  try {
    await pool.query(
      'UPDATE users SET role = "Deleted", txid = ?, output_script = ?, token_id = ?, encrypted_data = ?, encryption_metadata = ?, metadata = ? WHERE email = ?',
      [txid, outputScript, tokenId, encryptedData, JSON.stringify(encryptionMetadata), JSON.stringify(metadata), email]
    );
    console.log(`User ${email} marked as Deleted with blockchain transaction ID ${txid}`);
    return { email, txid };
  } catch (error) {
    console.error('Error marking user as Deleted in database:', error);
    throw error;
  }
};

/**
 * Retrieves the role of a user based on their public key.
 * 
 * @param {string} publicKey - The user's public key.
 * @returns {Promise<string | null>} The user's role or null if no role exists.
 * @throws {Error} Throws an error if the query fails.
 */
export const getUserRole = async (publicKey: string) => {
  const [userCountRows]: [RowDataPacket[], any] = await pool.query('SELECT COUNT(*) as count FROM users');
  const userCount = userCountRows[0].count;

  if (userCount === 0) {
    return null; // No users exist, return null
  }

  const [rows]: [RowDataPacket[], any] = await pool.query('SELECT role FROM users WHERE public_key = ?', [publicKey]);
  return rows.length ? rows[0].role : null;
};

/**
 * Creates a new account-specific table and adds the account to the `accounts` table.
 * 
 * @param {string} accountName - The name of the account.
 * @param {string} basket - The basket type (e.g., 'asset', 'income').
 * @throws {Error} Throws an error if table creation or insertion fails.
 */
export const createAccountTable = async (accountName: string, basket: string) => {
  try {
    const tableName = `account_${accountName}`;

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        txid VARCHAR(255) NOT NULL,
        output_script TEXT NOT NULL,
        token_id VARCHAR(255),
        encrypted_data TEXT,
        encryption_metadata JSON,
        metadata JSON,
        basket ENUM('asset', 'income', 'expense', 'liability') NOT NULL DEFAULT '${basket}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createTableQuery);
    console.log(`Table ${tableName} created successfully with basket '${basket}'`);

    const insertAccountQuery = `
      INSERT INTO accounts (name, basket)
      VALUES (?, ?)
    `;

    await pool.query(insertAccountQuery, [accountName, basket]);
    console.log(`Account ${accountName} added to accounts table with basket '${basket}'`);
  } catch (error) {
    console.error(`Error creating table ${accountName}:`, error);
    throw error;
  }
};

/**
 * Inserts an entry into an account-specific table.
 * 
 * @param {string} accountName - The name of the account table.
 * @param {string} date - The date of the transaction.
 * @param {string} txid - The blockchain transaction ID.
 * @param {string} outputScript - The blockchain output script.
 * @param {string} tokenId - The unique identifier for tokenization.
 * @param {string} encryptedData - Encrypted transaction data.
 * @param {object} encryptionMetadata - Metadata for encryption.
 * @param {object} metadata - Additional transaction metadata.
 * @throws {Error} Throws an error if the entry insertion fails.
 */
export const insertAccountEntry = async (
  accountName: string,
  date: string,
  txid: string,
  outputScript: string,
  tokenId: string,
  encryptedData: string,
  encryptionMetadata: object,
  metadata: object
) => {
  try {
    const tableName = `account_${accountName}`;

    const insertQuery = `
      INSERT INTO ${tableName} 
      (date, txid, output_script, token_id, encrypted_data, encryption_metadata, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `;

    await pool.query(insertQuery, [
      date,
      txid,
      outputScript,
      tokenId,
      encryptedData,
      JSON.stringify(encryptionMetadata),
      JSON.stringify(metadata)
    ]);

    console.log(`New entry added to ${tableName}`);
  } catch (error) {
    console.error(`Error inserting entry into ${accountName}:`, error);
    throw error;
  }
};


/**
 * Creates the General Journal table if it does not already exist.
 * 
 * @throws {Error} Throws an error if the table creation fails.
 */
export const createGeneralJournalTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS general_journal (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        basket VARCHAR(50) DEFAULT 'general_journal',
        txid VARCHAR(255) NOT NULL,
        output_script TEXT NOT NULL,
        token_id VARCHAR(255),
        encrypted_data TEXT,
        encryption_metadata JSON,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createTableQuery);
    console.log('General Journal table created successfully');
  } catch (error) {
    console.error('Error creating General Journal table:', error);
    throw error;
  }
};

/**
 * Retrieves the total count of users from the `users` table.
 * 
 * @returns {Promise<number>} The total number of users.
 * @throws {Error} Throws an error if the query fails.
 */
export const getUserCount = async () => {
  const [rows]: [RowDataPacket[], any] = await pool.query('SELECT COUNT(*) as count FROM users');
  return rows[0].count;
};

/**
 * Checks if a user exists in the `users` table based on their public key.
 * 
 * @param {string} publicKey - The public key of the user to check.
 * @returns {Promise<boolean>} `true` if the user exists, otherwise `false`.
 * @throws {Error} Throws an error if the query fails.
 */
export const checkUserExists = async (publicKey: string): Promise<boolean> => {
  const [rows]: [RowDataPacket[], any] = await pool.query('SELECT COUNT(*) as count FROM users WHERE public_key = ?', [publicKey]);
  return rows[0].count > 0;
};

/**
 * Retrieves all entries for a specific account table.
 * 
 * @param {string} accountName - The name of the account whose entries are to be retrieved.
 * @returns {Promise<any[]>} An array of account entries.
 * @throws {Error} Throws an error if the query fails.
 */
export const viewAccountEntries = async (accountName: string) => {
  try {
    const tableName = `account_${accountName}`;

    const selectQuery = `
      SELECT id, date, type_of_account, txid, token_id, encrypted_data, encryption_metadata
      FROM ${tableName};
    `;

    const [rows] = await pool.query(selectQuery);

    console.log(`Entries for ${tableName} retrieved successfully`);
    return rows;
  } catch (error) {
    console.error(`Error fetching entries from ${accountName}:`, error);
    throw error;
  }
};

/**
 * Inserts an entry into the General Journal table.
 * 
 * @param {string} date - The date of the entry.
 * @param {string} txid - The blockchain transaction ID.
 * @param {string} outputScript - The blockchain output script.
 * @param {string} tokenId - The unique identifier for tokenization.
 * @param {string} encryptedData - Encrypted data for the entry.
 * @param {object} encryptionMetadata - Metadata for encryption.
 * @param {object} metadata - Additional metadata for the entry.
 * @throws {Error} Throws an error if the insertion fails.
 */
export const insertGeneralJournalEntry = async (
  date: string,
  txid: string,
  outputScript: string,
  tokenId: string,
  encryptedData: string,
  encryptionMetadata: object,
  metadata: object
) => {
  try {
    const insertQuery = `
      INSERT INTO general_journal 
      (date, basket, txid, output_script, token_id, encrypted_data, encryption_metadata, metadata)
      VALUES (?, 'general_journal', ?, ?, ?, ?, ?, ?);
    `;

    await pool.query(insertQuery, [
      date,
      txid,
      outputScript,
      tokenId,
      encryptedData,
      JSON.stringify(encryptionMetadata),
      JSON.stringify(metadata)
    ]);

    console.log('New entry added to General Journal');
  } catch (error) {
    console.error('Error inserting entry into General Journal:', error);
    throw error;
  }
};

/**
 * Retrieves the email of a user based on their public key.
 * 
 * @param {string} publicKey - The public key of the user.
 * @returns {Promise<string | null>} The email address of the user if found, otherwise `null`.
 * @throws {Error} Throws an error if the query fails.
 */
export const getUserEmailByPublicKey = async (publicKey: string): Promise<string | null> => {
  const [rows] = await pool.query<RowDataPacket[]>( // Specify the query result type
    'SELECT email FROM users WHERE public_key = ?', 
    [publicKey]
  );
  
  return rows.length > 0 ? (rows[0] as RowDataPacket).email : null;
};

/**
 * Retrieves the last entry's encrypted data blob and basket for a specific account.
 * 
 * @param {string} accountName - The name of the account to query.
 * @returns {Promise<{ encryptedData: string; basket: string } | null>} 
 * An object containing the `encryptedData` and `basket` if found, otherwise `null`.
 * @throws {Error} Throws an error if the query fails.
 */
export const getLastEntry = async (accountName: string) => {
  const tableName = `account_${accountName}`;

  const query = `
    SELECT encrypted_data, basket
    FROM ${tableName}
    ORDER BY id DESC
    LIMIT 1;
  `;

  const [rows]: [RowDataPacket[], any] = await pool.query(query);
  return rows.length > 0 ? { encryptedData: rows[0].encrypted_data, basket: rows[0].basket } : null;
};

/**
 * Adds a new message to the `messages` table.
 * 
 * @param {string} messageId - A unique identifier for the message.
 * @param {string} senderPublicKey - The public key of the sender.
 * @param {string} recipientPublicKey - The public key of the recipient.
 * @param {string} messageBody - The content of the message.
 * @param {'request' | 'approval' | 'notification' | 'payment'} messageType - The type of the message.
 * @returns {Promise<void>} Resolves when the message is successfully added.
 * @throws {Error} Throws an error if the query fails.
 */
export const addMessage = async (
  messageId: string,
  senderPublicKey: string,
  recipientPublicKey: string,
  messageBody: string,
  messageType: 'request' | 'approval' | 'notification' | 'payment'
) => {
  try {
    await pool.query(
      'INSERT INTO messages (message_id, sender_public_key, recipient_public_key, message_body, message_type, status) VALUES (?, ?, ?, ?, ?, "pending")',
      [messageId, senderPublicKey, recipientPublicKey, messageBody, messageType]
    );
    console.log(`Message ${messageId} added successfully`);
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
};

/**
 * Retrieves all messages for a given recipient public key.
 * 
 * @param {string} recipientPublicKey - The recipient's public key.
 * @returns {Promise<any[]>} An array of messages.
 * @throws {Error} Throws an error if the query fails.
 */
export const getMessagesForUser = async (recipientPublicKey: string) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM messages WHERE recipient_public_key = ?',
      [recipientPublicKey]
    );
    if (!rows || rows.length === 0) {
      console.log(`No messages found for user ${recipientPublicKey}`);
      return []; // Return an empty array when no messages exist
    }
    console.log(`Messages retrieved for user ${recipientPublicKey}`);
    return rows;
  } catch (error) {
    console.error('Error retrieving messages:', error);
    throw error;
  }
};

/**
 * Updates the status of a message in the `messages` table.
 * 
 * @param {string} messageId - The ID of the message.
 * @param {'pending' | 'acknowledged' | 'error'} status - The new status of the message.
 * @throws {Error} Throws an error if the update fails.
 */
export const updateMessageStatus = async (messageId: string, status: 'pending' | 'acknowledged' | 'error') => {
  try {
    await pool.query(
      'UPDATE messages SET status = ? WHERE message_id = ?',
      [status, messageId]
    );
    console.log(`Message ${messageId} status updated to ${status}`);
  } catch (error) {
    console.error('Error updating message status:', error);
    throw error;
  }
};

/**
 * Adds a new payment token to the `payment_tokens` table.
 * 
 * @param {string} encryptedData - The encrypted data of the payment token.
 * @param {string} txid - The transaction ID associated with the token.
 * @param {string} outputScript - The output script of the transaction.
 * @param {string} tokenId - The unique identifier for the token.
 * @param {object} encryptionMetadata - Metadata related to the encryption (e.g., keys, algorithms).
 * @param {object} metadata - Additional metadata associated with the token.
 * @returns {Promise<any>} The result of the database insert operation.
 * @throws {Error} Throws an error if the query fails.
 */
export const addPaymentToken = async (
  encryptedData: string,
  txid: string,
  outputScript: string,
  tokenId: string,
  encryptionMetadata: object,
  metadata: object
) => {
  try {
    const [result] = await pool.query(
      `INSERT INTO payment_tokens 
       (transaction_status, encrypted_data, txid, output_script, token_id, encryption_metadata, metadata) 
       VALUES ('pending', ?, ?, ?, ?, ?, ?)`,
      [encryptedData, txid, outputScript, tokenId, JSON.stringify(encryptionMetadata), JSON.stringify(metadata)]
    );
    return result;
  } catch (error) {
    console.error('Error adding payment token:', error);
    throw error;
  }
};

/**
 * Retrieves payment tokens by their transaction status.
 * 
 * @param {string} status - The transaction status to filter by (e.g., 'pending', 'completed').
 * @returns {Promise<RowDataPacket[]>} An array of payment tokens with the specified status.
 * @throws {Error} Throws an error if the query fails.
 */
export const getPaymentTokensByStatus = async (status: string) => {
  try {
    const [rows]: [RowDataPacket[], any] = await pool.query(
      'SELECT * FROM payment_tokens WHERE transaction_status = ?',
      [status]
    );
    return rows;
  } catch (error) {
    console.error('Error retrieving payment tokens by status:', error);
    throw error;
  }
};

/**
 * Updates the transaction status of a specific payment token.
 * 
 * @param {string} txid - The transaction ID of the token to update.
 * @param {string} status - The new status to set (e.g., 'completed', 'failed').
 * @returns {Promise<any>} The result of the update operation.
 * @throws {Error} Throws an error if the query fails.
 */
export const updatePaymentTokenStatus = async (txid: string, status: string) => {
  try {
    const [result] = await pool.query(
      `UPDATE payment_tokens 
       SET transaction_status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE txid = ?`,
      [status, txid]
    );
    return result;
  } catch (error) {
    console.error('Error updating payment token status:', error);
    throw error;
  }
};

/**
 * Retrieves a specific payment token by its transaction ID (txid).
 * 
 * @param {string} txid - The transaction ID of the token to retrieve.
 * @returns {Promise<RowDataPacket | null>} The payment token object if found, otherwise `null`.
 * @throws {Error} Throws an error if the query fails.
 */
export const getPaymentTokenByTxid = async (txid: string) => {
  try {
    const [rows]: [RowDataPacket[], any] = await pool.query(
      'SELECT * FROM payment_tokens WHERE txid = ?',
      [txid]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error retrieving payment token by txid:', error);
    throw error;
  }
};

/**
 * Retrieves a list of all accounts from the `accounts` table.
 * 
 * @returns {Promise<RowDataPacket[]>} An array of account objects.
 * @throws {Error} Throws an error if the query fails.
 */
export const getAccounts = async () => {
  try {
    const [rows] = await pool.query('SELECT id, name, basket FROM accounts');
    return rows;
  } catch (error) {
    console.error('Error retrieving accounts:', error);
    throw error;
  }
};

/**
 * Retrieves all entries for a specific account.
 * 
 * @param {string} accountName - The name of the account whose entries are to be retrieved.
 * @returns {Promise<RowDataPacket[]>} An array of account entry objects.
 * @throws {Error} Throws an error if the query fails.
 */
export const getAccountEntries = async (accountName: string) => {
  try {
    const tableName = `account_${accountName}`;
    const query = `SELECT date, encrypted_data, encryption_metadata FROM ${tableName}`;
    const [rows] = await pool.query(query);
    return rows;
  } catch (error) {
    console.error(`Error fetching entries from account ${accountName}:`, error);
    throw error;
  }
};

/**
 * Retrieves all entries from the General Journal table.
 * 
 * @returns {Promise<any[]>} An array of General Journal entries.
 * @throws {Error} Throws an error if the query fails.
 */
export const getGeneralJournalEntries = async () => {
  try {
    const query = `SELECT date, encrypted_data, encryption_metadata FROM general_journal`;
    const [rows] = await pool.query(query);
    return rows;
  } catch (error) {
    console.error('Error fetching general journal entries:', error);
    throw error;
  }
};

/**
 * Retrieves distinct months from an account's entries.
 * 
 * @param {string} accountName - The name of the account.
 * @returns {Promise<string[]>} An array of unique months in 'YYYY-MM' format.
 * @throws {Error} Throws an error if the query fails.
 */
export const getDistinctMonthsForAccount = async (accountName: string) => {
  const tableName = `account_${accountName}`;

  const query = `
    SELECT DISTINCT DATE_FORMAT(date, '%Y-%m') as month
    FROM ${tableName}
    ORDER BY month;
  `;

  const [rows]: [RowDataPacket[], any] = await pool.query(query);
  return rows.map(row => row.month); // Return an array of unique 'YYYY-MM' formatted strings
};

/**
 * Checks if there is an existing first entry in the General Journal.
 * 
 * This function queries the `general_journal` table to count the number of entries
 * and determines if the journal has at least one entry.
 * 
 * @returns {Promise<boolean>} A boolean indicating whether the General Journal has at least one entry.
 * @throws {Error} Throws an error if the query fails.
 */
export const checkGeneralJournalFirstEntry = async () => {
  try {
    const [rows]: [RowDataPacket[], any] = await pool.query(`
      SELECT COUNT(*) as count FROM general_journal
    `);
    return rows[0].count > 0;
  } catch (error) {
    console.error('Error checking first entry in General Journal:', error);
    throw error;
  }
};

/**
 * Adds an uploaded file to the `uploaded_files` table.
 * 
 * @param {string} fileName - The name of the uploaded file.
 * @param {Date} uploadTime - The time the file was uploaded.
 * @param {Date} expirationTime - The expiration time for the file.
 * @param {string} uhrpHash - The UHRP hash of the file.
 * @param {string} publicUrl - The public URL of the uploaded file.
 * @throws {Error} Throws an error if the insertion fails.
 */
export const addUploadedFile = async (
  fileName: string,
  uploadTime: Date,
  expirationTime: Date,
  uhrpHash: string,
  publicUrl: string
) => {
  try {
    await pool.query(`
      INSERT INTO uploaded_files (file_name, upload_time, expiration_time, uhrp_hash, public_url)
      VALUES (?, ?, ?, ?, ?)
    `, [fileName, uploadTime, expirationTime, uhrpHash, publicUrl]);
    console.log(`File "${fileName}" added to the uploaded_files table.`);
  } catch (error) {
    console.error('Error adding file to uploaded_files table:', error);
    throw error;
  }
};

/**
 * Retrieves all uploaded files from the `uploaded_files` table.
 * 
 * @returns {Promise<any[]>} An array of uploaded files.
 * @throws {Error} Throws an error if the query fails.
 */
export const getAllUploadedFiles = async () => {
  try {
    const [rows]: [RowDataPacket[], any] = await pool.query(`
      SELECT * FROM uploaded_files
    `);
    console.log('Retrieved all uploaded files:', rows);
    return rows;
  } catch (error) {
    console.error('Error retrieving uploaded files:', error);
    throw error;
  }
};


// Call the function to initialize the database when the program starts
initializeDatabase().catch((err) => console.error('Failed to initialize database', err));
