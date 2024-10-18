import mysql from 'mysql2/promise';
import { RowDataPacket } from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection pool setup
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Function to add a new user to the database
export const addUser = async (publicKey: string, role: 'keyPerson' | 'limitedUser') => {
    try {
        const connection = await pool.getConnection();
        const query = 'INSERT INTO users (public_key, role) VALUES (?, ?)';
        await connection.query(query, [publicKey, role]);
        connection.release();
    } catch (error) {
        console.error('Error adding user:', error);
        throw error;
    }
};

// Function to fetch a user by public key
export const getUserByPublicKey = async (publicKey: string) => {
    try {
        const connection = await pool.getConnection();
        const query = 'SELECT * FROM users WHERE public_key = ?';
        
        // Cast the result to the correct type
        const [rows] = await connection.query<RowDataPacket[]>(query, [publicKey]);
        connection.release();
        
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Error fetching user by public key:', error);
        throw error;
    }
};

// Function to add a team member
export const addTeamMember = async (userId: number, email: string, role: 'Manager' | 'Accountant' | 'Staff') => {
    try {
        const connection = await pool.getConnection();
        const query = 'INSERT INTO team_members (user_id, email, role) VALUES (?, ?, ?)';
        await connection.query(query, [userId, email, role]);
        connection.release();
    } catch (error) {
        console.error('Error adding team member:', error);
        throw error;
    }
};

// Function to retrieve team members
export const getTeamMembers = async (userId: number) => {
    try {
        const connection = await pool.getConnection();
        const query = 'SELECT * FROM team_members WHERE user_id = ?';
        const [rows] = await connection.query(query, [userId]);
        connection.release();
        return rows;
    } catch (error) {
        console.error('Error fetching team members:', error);
        throw error;
    }
};
