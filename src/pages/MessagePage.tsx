import React, { useState, useEffect } from 'react';
import { Button, TextField, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel, SelectChangeEvent } from '@mui/material';
const Tokenator = require('@babbage/tokenator');
const PushDropTokenator = require('pushdrop-tokenator');
import axios from 'axios';
import { getPublicKey } from '@babbage/sdk-ts';

// Define the Message interface for managing message data
interface Message {
  id: number;
  senderPublicKey: string;
  recipientPublicKey: string;
  messageBody: string;
  messageType: 'request' | 'approval' | 'notification' | 'payment';
  status: 'pending' | 'acknowledged' | 'error';
  createdAt: string;
}

interface User {
  email: string;
  publicKey: string;
  role: string;
}

const MessagePage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [newRequestAmount, setNewRequestAmount] = useState<number>(0);
  const [newRequestPurpose, setNewRequestPurpose] = useState<string>('');
  const [isRequestFormOpen, setIsRequestFormOpen] = useState<boolean>(false);
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userPublicKey, setUserPublicKey] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRecipientKey, setSelectedRecipientKey] = useState<string | null>(null);

  // Fetch user's public key and role on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const publicKey = await getPublicKey({ reason: 'Retrieve Key for Messages', identityKey: true });
        setUserPublicKey(publicKey);

        const response = await axios.get(`/api/users/role/${publicKey}`);
        if (response.status === 200) {
          setUserRole(response.data.role);
        } else {
          setUserRole('Staff');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, []);

  // Fetch users list for recipient selection
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await axios.get('/api/users');
        setUsers(response.data);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadUsers();
  }, []);

  // Fetch messages on component mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const messages = await fetchMessagesFromPeerServ();
        setMessages(messages);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    loadMessages();
  }, []);

  const fetchMessagesFromPeerServ = async (): Promise<Message[]> => {
    return []; // Placeholder for actual Tokenator call
  };

  const handleNewRequestSubmit = async () => {
    // Code to send a request message using Tokenator
  };

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    setIsReplyDialogOpen(true);
  };

  const handleReplySubmit = async (isApproved: boolean) => {
    if (isApproved) {
      // Code to create a PushDrop token on approval
    } else {
      // Code to handle denial, possibly sending a notification
    }
  };

  // Handle selecting a recipient from the dropdown
  const handleRecipientSelect = (event: SelectChangeEvent<string>) => {
    const selectedEmail = event.target.value;
    const recipient = users.find(user => user.email === selectedEmail);
    if (recipient) {
      setSelectedRecipientKey(recipient.publicKey);
    }
  };

  return (
    <div>
      <h1>Messages</h1>

      {/* Message List */}
      <List>
        {messages.map((message) => (
          <ListItem key={message.id} onClick={() => handleSelectMessage(message)}>
            <Button fullWidth>
              <ListItemText primary={message.messageType} secondary={message.messageBody} />
            </Button>
          </ListItem>
        ))}
      </List>

      {/* New Request Form (Staff Only) */}
      {userRole === 'Staff' && (
        <div>
          <Button variant="contained" onClick={() => setIsRequestFormOpen(true)}>
            New Request
          </Button>
          <Dialog open={isRequestFormOpen} onClose={() => setIsRequestFormOpen(false)}>
            <DialogTitle>New Payment Request</DialogTitle>
            <DialogContent>
              <FormControl fullWidth>
                <InputLabel>Select Recipient</InputLabel>
                <Select
                  value={selectedRecipientKey || ''}
                  onChange={handleRecipientSelect}
                >
                  {users.map((user) => (
                    <MenuItem key={user.publicKey} value={user.publicKey}>
                      {user.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Amount"
                type="number"
                fullWidth
                value={newRequestAmount}
                onChange={(e) => setNewRequestAmount(Number(e.target.value))}
              />
              <TextField
                label="Purpose"
                fullWidth
                value={newRequestPurpose}
                onChange={(e) => setNewRequestPurpose(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setIsRequestFormOpen(false)}>Cancel</Button>
              <Button onClick={handleNewRequestSubmit} variant="contained">
                Submit Request
              </Button>
            </DialogActions>
          </Dialog>
        </div>
      )}

      {/* Approval/Reply Dialog (Manager/Key Person Only) */}
      {userRole === 'Manager' || userRole === 'KeyPerson' ? (
        <Dialog open={isReplyDialogOpen} onClose={() => setIsReplyDialogOpen(false)}>
          <DialogTitle>Respond to Request</DialogTitle>
          <DialogContent>
            {selectedMessage && (
              <div>
                <p><strong>Amount:</strong> {selectedMessage.messageBody}</p>
                <p><strong>Purpose:</strong> {/* Placeholder for purpose text */}</p>
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => handleReplySubmit(false)} color="secondary">
              Deny
            </Button>
            <Button onClick={() => handleReplySubmit(true)} color="primary">
              Approve
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </div>
  );
};

export default MessagePage;
