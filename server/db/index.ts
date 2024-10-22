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
    // Create a temporary connection for the initial database setup
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
    });

    // Create the database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.MYSQL_DATABASE}`);

    console.log('Database created or already exists.');

    // Now switch to the newly created database
    await connection.query(`USE ${process.env.MYSQL_DATABASE}`);

    // Create users table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        public_key VARCHAR(255) UNIQUE NOT NULL,
        role ENUM('keyPerson', 'limitedUser') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create team_members table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        role ENUM('Manager', 'Accountant', 'Staff') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    console.log('Database and tables initialized successfully');
    connection.end(); // Close the connection after database initialization
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Get all team members
export const getTeamMembers = async () => {
  const [rows] = await pool.query('SELECT email, role FROM team_members');
  return rows;
};

// Add a new team member
export const addTeamMember = async (publicKey: string, email: string, role: string) => {
  // Fetch the user based on the public key
  const [userRows]: [RowDataPacket[], any] = await pool.query('SELECT id FROM users WHERE public_key = ?', [publicKey]);

  // Check if user exists
  if (userRows.length === 0) {
    throw new Error('User not found');
  }

  const userId = userRows[0].id;

  // Insert the new team member
  await pool.query('INSERT INTO team_members (user_id, email, role) VALUES (?, ?, ?)', [userId, email, role]);
  return { email, role };
};

// Remove a team member
export const removeTeamMember = async (email: string) => {
  await pool.query('DELETE FROM team_members WHERE email = ?', [email]);
};

export const getUserRole = async (publicKey: string) => {
  // Check the total number of users in the database
  const [userCountRows]: [RowDataPacket[], any] = await pool.query('SELECT COUNT(*) as count FROM users');
  const userCount = userCountRows[0].count;

  // If no users exist, create the first user as the key person
  if (userCount === 0) {
    await pool.query('INSERT INTO users (public_key, role) VALUES (?, ?)', [publicKey, 'keyPerson']);
    return 'keyPerson'; // Return the newly created key person role
  }

  // If users exist, fetch the role of the current user
  const [rows]: [RowDataPacket[], any] = await pool.query('SELECT role FROM users WHERE public_key = ?', [publicKey]);

  // If no user found, return null
  if (rows.length === 0) {
    return null;
  }

  // Return the role of the user
  return rows[0].role;
};



// Function to get the count of users in the database
export const getUserCount = async () => {
  const [rows]: [RowDataPacket[], any] = await pool.query('SELECT COUNT(*) as count FROM users');
  return rows[0].count;
};

// Function to add a user with a specific role
export const addUser = async (publicKey: string, role: string) => {
  await pool.query('INSERT INTO users (public_key, role) VALUES (?, ?)', [publicKey, role]);
};

// Check if a user exists by public key
export const checkUserExists = async (publicKey: string): Promise<boolean> => {
  const [rows]: [RowDataPacket[], any] = await pool.query('SELECT COUNT(*) as count FROM users WHERE public_key = ?', [publicKey]);
  return rows[0].count > 0;
};

// Call the function to initialize the database when the program starts
initializeDatabase().catch((err) => console.error('Failed to initialize database', err));
