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

  const tokenator = new Tokenator({
    peerServHost: 'https://staging-peerserv.babbage.systems',
  });

  const fetchMessagesFromPeerServ = async (): Promise<Message[]> => {
    try {
      // Fetch messages from the specified message box
      const inboxMessages: { messageId: number; body: string; sender: string; created_at: string }[] =
        await tokenator.listMessages({ messageBox: 'payment_requests' });
  
      if (inboxMessages.length > 0) {
        // Log messages to console for debugging
        inboxMessages.forEach((message) => {
          console.log('Message ID:', message.messageId);
          console.log('Message Content:', message.body);
        });
  
        // Map to our Message interface structure
        const formattedMessages: Message[] = inboxMessages.map((msg) => ({
          id: msg.messageId,
          senderPublicKey: msg.sender,
          recipientPublicKey: '', // If not provided, leave as empty or adjust as needed
          messageBody: msg.body,
          messageType: 'notification', // Adjust if type is retrievable
          status: 'pending', // Adjust if status is retrievable
          createdAt: msg.created_at,
        }));
  
        return formattedMessages;
      } else {
        console.log('No messages in the inbox.');
        return [];
      }
    } catch (error) {
      console.error('Error listing messages:', error);
      return [];
    }
  };
  
  const handleNewRequestSubmit = async () => {
    if (!userPublicKey || !selectedRecipientKey) {
      console.error('User or recipient public key is missing.');
      return;
    }
  
    try {
      // Initialize Tokenator instance
      const tokenator = new Tokenator({
        peerServHost: 'https://staging-peerserv.babbage.systems'
      });
  
      // Define the message content
      const messageContent = {
        recipient: selectedRecipientKey, // Public key of the recipient
        messageBox: 'payment_requests', // Define a messageBox for categorizing
        body: {
          amount: newRequestAmount,
          purpose: newRequestPurpose,
          sender: userPublicKey,
          type: 'request'
        }
      };
  
      // Send the message
      const result = await tokenator.sendMessage(messageContent);
      console.log('Message sent successfully:', result);
  
      // Clear the form inputs after submission
      setNewRequestAmount(0);
      setNewRequestPurpose('');
      setIsRequestFormOpen(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  // Set up the PushDropTokenator instance
  const pushDropTokenator = new PushDropTokenator({
    peerServHost: 'https://staging-peerserv.babbage.systems',
    defaultTokenValue: 1,
    protocolID: 'paymentProtocol',
    protocolKeyID: 1,
    protocolBasketName: 'paymentRequests',
    protocolMessageBox: 'payment_requests_inbox',
    protocolAddress: 'UNIQUE_PROTOCOL_ADDRESS' // Replace with actual address as needed
  });

  const handleApproveRequest = async (recipientPublicKey: string, amount: number, purpose: string) => {
    try {
      const tokenator = new PushDropTokenator({
        peerServHost: 'https://staging-peerserv.babbage.systems',
        defaultTokenValue: amount,
        protocolID: 'paymentProtocol',
        protocolKeyID: 1,
        protocolBasketName: 'paymentRequests',
        protocolMessageBox: 'payment_approvals',
        protocolAddress: recipientPublicKey
      });
  
      await tokenator.sendPushDropToken({
        recipient: recipientPublicKey,
        title: 'Payment Approval',
        contents: `Purpose: ${purpose}`,
        htmlCode: `<html><body><h1>Approval for ${amount}</h1><p>Purpose: ${purpose}</p></body></html>`
      });
  
      console.log(`Approval token sent successfully to ${recipientPublicKey}`);
    } catch (error) {
      console.error('Error sending approval token:', error);
    }
  };
  

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    setIsReplyDialogOpen(true);
  };

  const handleReplySubmit = async (isApproved: boolean) => {
    if (isApproved && selectedMessage) {
      try {
        // Call handleApproveRequest to create and send the PushDrop token
        await handleApproveRequest(
          selectedMessage.senderPublicKey, // Assuming sender is the recipient for the token
          newRequestAmount,
          newRequestPurpose
        );
  
        console.log('Approval token sent successfully');
      } catch (error) {
        console.error('Error approving request and sending token:', error);
      }
    } else if (selectedMessage) {
      try {
        // Send a denial notification using Tokenator
        const denialNotification = {
          recipient: selectedMessage.senderPublicKey, // Send back to the original sender
          messageBox: 'notifications_inbox',
          body: `Your payment request for ${newRequestAmount} was denied. Reason: [Specify reason if needed]`
        };
  
        const result = await tokenator.sendMessage(denialNotification);
        console.log('Denial notification sent successfully:', result);
      } catch (error) {
        console.error('Error sending denial notification:', error);
      }
    }
    
    // Close the reply dialog after handling the response
    setIsReplyDialogOpen(false);
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
                <Select value={selectedRecipientKey || ''} onChange={handleRecipientSelect} displayEmpty>
                  <MenuItem value="" disabled>Select Recipient</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.publicKey} value={user.email}>
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
