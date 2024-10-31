import express from 'express';
import cors from 'cors';
import {
  getUsers, addUser, removeUser, getUserRole,
  createAccountTable, insertAccountEntry, viewAccountEntries,
  insertGeneralJournalEntry, createGeneralJournalTable,
  getUserEmailByPublicKey, getLastEntry,
  addMessage, getMessagesForUser, updateMessageStatus,
  addPaymentToken, getPaymentTokensByStatus, updatePaymentTokenStatus,
  getPaymentTokenByTxid
} from './db';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Add a new user with blockchain transaction, tokenized, and encrypted data
app.post('/api/users', async (req, res) => {
  const { publicKey, email, role, txid, outputScript, tokenId, encryptedData, encryptionMetadata, metadata } = req.body;
  try {
    const newUser = await addUser(publicKey, email, role, txid, outputScript, tokenId, encryptedData, encryptionMetadata, metadata);
    res.json(newUser);
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ message: 'Error adding user' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Remove a user by email with blockchain transaction, tokenized, and encrypted data
app.delete('/api/users/:email', async (req, res) => {
  const { email } = req.params;
  const { txid, outputScript, tokenId, encryptedData, encryptionMetadata, metadata } = req.body;
  try {
    await removeUser(email, txid, outputScript, tokenId, encryptedData, encryptionMetadata, metadata);
    res.json({ message: `User with email ${email} removed successfully` });
  } catch (error) {
    console.error('Error removing user:', error);
    res.status(500).json({ message: 'Error removing user' });
  }
});

// Get role of a user based on public key
app.get('/api/users/role/:publicKey', async (req, res) => {
  const { publicKey } = req.params;
  try {
    const role = await getUserRole(publicKey);
    if (role) {
      res.json({ role });
    } else {
      res.status(404).json({ message: 'User not found. Assigning role.' });
    }
  } catch (error) {
    console.error('Error fetching user role:', error);
    res.status(500).json({ message: 'Error fetching user role' });
  }
});

// Create a new account table with a specified basket
app.post('/api/accounts/create', async (req, res) => {
  const { accountName, basket } = req.body; // Destructure basket from the request body
  try {
    await createAccountTable(accountName, basket); // Pass basket to the function
    res.json({ message: `Account table ${accountName} created successfully with basket ${basket}` });
  } catch (error) {
    console.error('Error creating account table:', error);
    res.status(500).json({ message: 'Error creating account table' });
  }
});


// Insert a new entry into an account table with tokenized and encrypted data
app.post('/api/accounts/entry', async (req, res) => {
  const {
    accountName,
    date,
    txid,
    outputScript,
    tokenId,
    encryptedData,
    encryptionMetadata,
    metadata,
  } = req.body;

  try {
    await insertAccountEntry(
      accountName,
      date,
      txid,
      outputScript,
      tokenId,
      encryptedData,
      encryptionMetadata,
      metadata
    );
    res.json({ message: `Entry added to account ${accountName} successfully` });
  } catch (error) {
    console.error('Error inserting entry:', error);
    res.status(500).json({ message: 'Error inserting entry into account' });
  }
});


// View all entries from an account table
app.get('/api/accounts/:accountName', async (req, res) => {
  const { accountName } = req.params;
  try {
    const entries = await viewAccountEntries(accountName);
    res.json(entries);
  } catch (error) {
    console.error('Error fetching account entries:', error);
    res.status(500).json({ message: 'Error fetching account entries' });
  }
});

// Create the General Journal table
app.post('/api/general-journal/create', async (req, res) => {
  try {
    await createGeneralJournalTable();
    res.json({ message: 'General Journal created successfully' });
  } catch (error) {
    console.error('Error creating General Journal:', error);
    res.status(500).json({ message: 'Error creating General Journal' });
  }
});

// Insert an entry into the General Journal with tokenized and encrypted data
app.post('/api/general-journal/entry', async (req, res) => {
  const {
    date,
    txid,
    outputScript,
    tokenId,
    encryptedData,
    encryptionMetadata,
    metadata,
  } = req.body;

  try {
    await insertGeneralJournalEntry(
      date,
      txid,
      outputScript,
      tokenId,
      encryptedData,
      encryptionMetadata,
      metadata
    );
    res.json({ message: 'Entry added to General Journal successfully' });
  } catch (error) {
    console.error('Error inserting entry into General Journal:', error);
    res.status(500).json({ message: 'Error inserting entry into General Journal' });
  }
});


// In your Express backend file
app.get('/api/users/email/:publicKey', async (req, res) => {
  const { publicKey } = req.params;
  try {
    const email = await getUserEmailByPublicKey(publicKey);
    if (email) {
      res.json({ email });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user email:', error);
    res.status(500).json({ message: 'Error fetching user email' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Get the last entry’s running total and basket for an account
app.get('/api/accounts/last-entry/:accountName', async (req, res) => {
  const { accountName } = req.params;

  try {
    const lastEntry = await getLastEntry(accountName);
    if (lastEntry) {
      res.json(lastEntry);
    } else {
      res.status(404).json({ message: `No entries found for account ${accountName}` });
    }
  } catch (error) {
    console.error(`Error fetching last entry for account ${accountName}:`, error);
    res.status(500).json({ message: 'Error retrieving last entry' });
  }
});

// Add a new message
app.post('/api/messages', async (req, res) => {
  const { messageId, senderPublicKey, recipientPublicKey, messageBody, messageType } = req.body;
  try {
    await addMessage(messageId, senderPublicKey, recipientPublicKey, messageBody, messageType);
    res.json({ message: `Message ${messageId} added successfully` });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ message: 'Error adding message' });
  }
});

// Retrieve messages for a specific user
app.get('/api/messages', async (req, res) => {
  const { recipient_public_key } = req.query;
  try {
    const messages = await getMessagesForUser(recipient_public_key as string);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Update message status
app.patch('/api/messages/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await updateMessageStatus(id, status);
    res.json({ message: `Message ${id} status updated to ${status}` });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({ message: 'Error updating message status' });
  }
});

// Endpoint to add a new payment token
app.post('/api/payment-tokens', async (req, res) => {
  const { encryptedData, txid, outputScript, tokenId, encryptionMetadata, metadata } = req.body;
  try {
    const result = await addPaymentToken(encryptedData, txid, outputScript, tokenId, encryptionMetadata, metadata);
    res.status(201).json({ message: 'Payment token added successfully', result });
  } catch (error) {
    console.error('Error adding payment token:', error);
    res.status(500).json({ message: 'Error adding payment token' });
  }
});

// Endpoint to retrieve payment tokens by transaction status
app.get('/api/payment-tokens/status/:status', async (req, res) => {
  const { status } = req.params;
  try {
    const tokens = await getPaymentTokensByStatus(status);
    res.json(tokens);
  } catch (error) {
    console.error('Error retrieving payment tokens by status:', error);
    res.status(500).json({ message: 'Error retrieving payment tokens' });
  }
});

// Endpoint to update the transaction status of a payment token
app.patch('/api/payment-tokens/:txid/status', async (req, res) => {
  const { txid } = req.params;
  const { status } = req.body;

  try {
    const result = await updatePaymentTokenStatus(txid, status);
    res.json({ message: `Payment token status updated to ${status}`, result });
  } catch (error) {
    console.error('Error updating payment token status:', error);
    res.status(500).json({ message: 'Error updating payment token status' });
  }
});

// Endpoint to retrieve a specific payment token by txid
app.get('/api/payment-tokens/:txid', async (req, res) => {
  const { txid } = req.params;
  try {
    const token = await getPaymentTokenByTxid(txid);
    if (token) {
      res.json(token);
    } else {
      res.status(404).json({ message: 'Payment token not found' });
    }
  } catch (error) {
    console.error('Error retrieving payment token by txid:', error);
    res.status(500).json({ message: 'Error retrieving payment token' });
  }
});