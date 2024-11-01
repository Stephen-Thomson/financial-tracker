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

    // Consolidated `users` table with role, blockchain tracking fields, and basket type
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        public_key VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
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
      CREATE TABLE messages (
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

    console.log('Database and tables initialized successfully');
    connection.end();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Get all users
export const getUsers = async () => {
  const [rows] = await pool.query('SELECT email, role, public_key FROM users');
  return rows;
};

// Add a new user with blockchain transaction data, tokenization, encryption, and basket type
export const addUser = async (
  publicKey: string,
  email: string,
  role: string,
  txid: string,
  outputScript: string,
  tokenId: string,
  encryptedData: string,
  encryptionMetadata: object,
  metadata: object
) => {
  try {
    await pool.query(
      'INSERT INTO users (public_key, email, role, basket, txid, output_script, token_id, encrypted_data, encryption_metadata, metadata) VALUES (?, ?, ?, "user", ?, ?, ?, ?, ?, ?)',
      [publicKey, email, role, txid, outputScript, tokenId, encryptedData, JSON.stringify(encryptionMetadata), JSON.stringify(metadata)]
    );
    console.log(`User ${email} added with role ${role} and blockchain transaction ID ${txid}`);
    return { email, role, txid };
  } catch (error) {
    console.error('Error adding user to database:', error);
    throw error;
  }
};

// Remove a user and log the deletion transaction
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

// Get user role based on public key
export const getUserRole = async (publicKey: string) => {
  const [userCountRows]: [RowDataPacket[], any] = await pool.query('SELECT COUNT(*) as count FROM users');
  const userCount = userCountRows[0].count;

  if (userCount === 0) {
    await pool.query('INSERT INTO users (public_key, role, basket) VALUES (?, ?, "user")', [publicKey, 'keyPerson']);
    return 'keyPerson';
  }

  const [rows]: [RowDataPacket[], any] = await pool.query('SELECT role FROM users WHERE public_key = ?', [publicKey]);
  if (rows.length === 0) {
    return null;
  }

  return rows[0].role;
};

// Create a new account table for a user
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
  } catch (error) {
    console.error(`Error creating table ${accountName}:`, error);
    throw error;
  }
};

// Insert an entry into an account table
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
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


// Create General Journal Table
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

// Get count of users
export const getUserCount = async () => {
  const [rows]: [RowDataPacket[], any] = await pool.query('SELECT COUNT(*) as count FROM users');
  return rows[0].count;
};

// Check if a user exists by public key
export const checkUserExists = async (publicKey: string): Promise<boolean> => {
  const [rows]: [RowDataPacket[], any] = await pool.query('SELECT COUNT(*) as count FROM users WHERE public_key = ?', [publicKey]);
  return rows[0].count > 0;
};

// Get account entries for a user
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

// Insert an entry into the General Journal
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

// Get user email by public key
export const getUserEmailByPublicKey = async (publicKey: string): Promise<string | null> => {
  const [rows] = await pool.query<RowDataPacket[]>( // Specify the query result type
    'SELECT email FROM users WHERE public_key = ?', 
    [publicKey]
  );
  
  return rows.length > 0 ? (rows[0] as RowDataPacket).email : null;
};

// Function to get the last entry’s running total and basket
export const getLastEntry = async (accountName: string) => {
  const tableName = `account_${accountName}`;

  const query = `
    SELECT running_total, basket
    FROM ${tableName}
    ORDER BY id DESC
    LIMIT 1;
  `;

  const [rows]: [RowDataPacket[], any] = await pool.query(query);
  return rows.length > 0 ? { runningTotal: rows[0].running_total, basket: rows[0].basket } : null;
};

// Add a new message
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

// Retrieve messages for a user
export const getMessagesForUser = async (recipientPublicKey: string) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM messages WHERE recipient_public_key = ?',
      [recipientPublicKey]
    );
    console.log(`Messages retrieved for user ${recipientPublicKey}`);
    return rows;
  } catch (error) {
    console.error('Error retrieving messages:', error);
    throw error;
  }
};

// Update message status
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

// Function to add a new payment token
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

// Function to retrieve payment tokens by transaction status
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

// Function to update the transaction status of a payment token
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

// Function to retrieve a specific payment token by txid
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

// Call the function to initialize the database when the program starts
initializeDatabase().catch((err) => console.error('Failed to initialize database', err));
