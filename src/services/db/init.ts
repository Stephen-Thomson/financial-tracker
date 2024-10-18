import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Function to initialize the database
export const initializeDatabase = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
    });

    // Create the database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.MYSQL_DATABASE}`);

    // Switch to the newly created database
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
    connection.end();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Call the function to initialize the database when the program starts
initializeDatabase().catch((err) => console.error('Failed to initialize database', err));
