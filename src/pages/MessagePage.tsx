import React, { useState, useEffect } from 'react';
import {
  Button, TextField, List, ListItem, ListItemText, Dialog,
  DialogTitle, DialogContent, DialogActions, MenuItem, Select,
  FormControl, InputLabel, SelectChangeEvent
} from '@mui/material';
import axios from 'axios';
import { getPublicKey } from '@babbage/sdk-ts';
const Tokenator = require('@babbage/tokenator');
const PushDropTokenator = require('pushdrop-tokenator');

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
  public_key: string;
  role: string;
}

const MessagePage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [newRequestAmount, setNewRequestAmount] = useState<number>(0);
  const [newRequestPurpose, setNewRequestPurpose] = useState<string>('');
  const [isRequestFormOpen, setIsRequestFormOpen] = useState<boolean>(false);
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState<boolean>(false);
  const [userPublicKey, setUserPublicKey] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRecipientKey, setSelectedRecipientKey] = useState<string | null>(null);

  // Fetch user's public key on component mount
  useEffect(() => {
    const fetchUserPublicKey = async () => {
      try {
        const publicKey = await getPublicKey({ reason: 'Retrieve Key for Messages', identityKey: true });
        setUserPublicKey(publicKey);
      } catch (error) {
        console.error('Error fetching user public key:', error);
      }
    };

    fetchUserPublicKey();
  }, []);

  // Fetch users list for recipient selection
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/users');
        console.log('Users API response:', response.data); // Log the full API response
  
        if (response.data && Array.isArray(response.data.members)) {
          setUsers(response.data.members); // Set the users to the members array
        } else {
          console.warn('Users API did not return the expected members array:', response.data);
          setUsers([]); // Fallback to an empty array
        }
      } catch (error) {
        console.error('Error loading users:', error);
        setUsers([]); // Ensure `users` is always an array
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
      const inboxMessages: Array<{
        messageId: number;
        body: string;
        sender: string;
        created_at: string;
      }> = await tokenator.listMessages({ messageBox: 'payment_requests' });

      if (inboxMessages.length > 0) {
        return inboxMessages.map((msg) => ({
          id: msg.messageId,
          senderPublicKey: msg.sender,
          recipientPublicKey: '',
          messageBody: msg.body,
          messageType: 'notification',
          status: 'pending',
          createdAt: msg.created_at,
        }));
      } else {
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
      const tokenator = new Tokenator({
        peerServHost: 'https://staging-peerserv.babbage.systems',
      });

      const messageContent = {
        recipient: selectedRecipientKey,
        messageBox: 'payment_requests',
        body: {
          amount: newRequestAmount,
          purpose: newRequestPurpose,
          sender: userPublicKey,
          type: 'request',
        },
      };

      await tokenator.sendMessage(messageContent);
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
      protocolAddress: 'UNIQUE_PROTOCOL_ADDRESS'
    });
  
    const handleApproveRequest = async (recipientPublicKey: string, amount: number, purpose: string) => {
      try {
        const tokenator = new PushDropTokenator({
          peerServHost: 'https://staging-peerserv.babbage.systems',
          defaultTokenValue: 1,
          protocolID: 'paymentProtocol',
          protocolKeyID: 1,
          protocolBasketName: 'paymentRequests',
          protocolMessageBox: 'payment_approvals',
          protocolAddress: recipientPublicKey,
        });
    
        await tokenator.sendPushDropToken({
          recipient: recipientPublicKey,
          title: 'Payment Approval',
          contents: `Purpose: ${purpose}`,
          htmlCode: `<html><body><h1>Approval for ${amount}</h1><p>Purpose: ${purpose}</p></body></html>`,
          satoshis: 1,
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
    
    const parseMessageBody = (messageBody: string) => {
      try {
        const parsed = JSON.parse(messageBody);
        return {
          amount: parsed.amount || '[Unknown Amount]',
          purpose: parsed.purpose || '[Unknown Purpose]',
        };
      } catch {
        // Fallback for non-JSON message bodies
        return {
          amount: '[Unknown Amount]',
          purpose: messageBody || '[No Details]',
        };
      }
    };
  
    const handleReplySubmit = async (isApproved: boolean) => {
      if (isApproved && selectedMessage) {
        try {
          // Call handleApproveRequest to create and send the PushDrop token
          await handleApproveRequest(
            selectedMessage.senderPublicKey,
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

  const handleRecipientSelect = (event: SelectChangeEvent<string>) => {
    console.log('Selected recipient:', event.target.value);
    const selectedPublicKey = event.target.value;
    setSelectedRecipientKey(selectedPublicKey);
    console.log('Selected recipient key:', selectedPublicKey);
  };
  

  return (
    <div>
      <h1>Messages</h1>
  
      {messages.length > 0 ? (
        <List>
          {messages.map((message) => (
            <ListItem
              key={message.id}
              onClick={() => {
                setSelectedMessage(message);
                setIsReplyDialogOpen(true);
              }}
            >
              <Button fullWidth>
                <ListItemText primary={message.messageType} secondary={message.messageBody} />
              </Button>
            </ListItem>
          ))}
        </List>
      ) : (
        <p>No messages available.</p>
      )}


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
              <MenuItem value="" disabled>Select Recipient</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.public_key} value={user.public_key}>
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

      {/* Approval/Reply Dialog */}
      <Dialog open={isReplyDialogOpen} onClose={() => setIsReplyDialogOpen(false)}>
        <DialogTitle>Respond to Request</DialogTitle>
        <DialogContent>
          {selectedMessage && (
            <div>
              {(() => {
                const { amount, purpose } = parseMessageBody(selectedMessage.messageBody);
                return (
                  <>
                    <p><strong>Amount:</strong> {amount}</p>
                    <p><strong>Purpose:</strong> {purpose}</p>
                  </>
                );
              })()}
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
    </div>
  );
};

export default MessagePage;
