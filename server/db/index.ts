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
        role ENUM('keyPerson', 'limitedUser', 'Manager', 'Accountant', 'Staff', 'Viewer', 'Deleted') NOT NULL,
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

    console.log('Database and tables initialized successfully');
    connection.end();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Get all users
export const getUsers = async () => {
  const [rows] = await pool.query('SELECT email, role, basket FROM users');
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

export const createAccountTable = async (accountName: string, basket: string) => {
  try {
    const tableName = `account_${accountName}`;

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        description TEXT NOT NULL,
        debit DECIMAL(10, 2) DEFAULT 0.00,
        credit DECIMAL(10, 2) DEFAULT 0.00,
        running_total DECIMAL(10, 2) DEFAULT 0.00,
        type_of_account ENUM('Asset', 'Liability', 'Income', 'Expense') NOT NULL,
        edit_permission ENUM('Manager', 'Accountant', 'Staff') NOT NULL,
        view_permission ENUM('Manager', 'Accountant', 'Staff', 'Viewer') NOT NULL,
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

export const insertAccountEntry = async (
  accountName: string,
  date: string,
  description: string,
  debit: number,
  credit: number,
  runningTotal: number,
  typeOfAccount: 'Asset' | 'Liability' | 'Income' | 'Expense',
  editPermission: 'Manager' | 'Accountant' | 'Staff',
  viewPermission: 'Manager' | 'Accountant' | 'Staff' | 'Viewer',
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
      (date, description, debit, credit, running_total, type_of_account, basket, edit_permission, view_permission, txid, output_script, token_id, encrypted_data, encryption_metadata, metadata)
      VALUES (?, ?, ?, ?, ?, ?, '${accountName}', ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    await pool.query(insertQuery, [
      date,
      description,
      debit,
      credit,
      runningTotal,
      typeOfAccount,
      editPermission,
      viewPermission,
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
        description TEXT NOT NULL,
        debit DECIMAL(10, 2) DEFAULT 0.00,
        credit DECIMAL(10, 2) DEFAULT 0.00,
        account_name VARCHAR(255) NOT NULL,
        basket VARCHAR(50) DEFAULT 'general_journal',
        view_permission ENUM('Manager', 'Accountant', 'Staff', 'Viewer') NOT NULL,
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

export const viewAccountEntries = async (accountName: string) => {
  try {
    const tableName = `account_${accountName}`;

    const selectQuery = `
      SELECT id, date, description, debit, credit, running_total, type_of_account, edit_permission, view_permission, txid, token_id, encrypted_data, encryption_metadata
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
  description: string,
  debit: number,
  credit: number,
  accountName: string,
  viewPermission: 'Manager' | 'Accountant' | 'Staff' | 'Viewer',
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
      (date, description, debit, credit, account_name, basket, view_permission, txid, output_script, token_id, encrypted_data, encryption_metadata, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    await pool.query(insertQuery, [
      date,
      description,
      debit,
      credit,
      accountName,
      accountName,  // Assuming basket is set based on account name for journal entries
      viewPermission,
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

export const getUserEmailByPublicKey = async (publicKey: string): Promise<string | null> => {
  const [rows] = await pool.query<RowDataPacket[]>( // Specify the query result type
    'SELECT email FROM users WHERE public_key = ?', 
    [publicKey]
  );
  
  return rows.length > 0 ? (rows[0] as RowDataPacket).email : null;
};


// Call the function to initialize the database when the program starts
initializeDatabase().catch((err) => console.error('Failed to initialize database', err));
