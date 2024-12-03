/**
 * File: MessagePage.tsx
 * Author: Stephen Thomson
 * Date Created: 11/30/2024
 * Description:
 * The MessagePage component facilitates communication and financial requests between users.
 * It allows users to send payment requests, approve or deny requests, and view messages.
 * The component integrates with the PeerServ messaging system and blockchain-based token 
 * mechanisms to handle message communication and financial approvals securely.
 *
 * Functionalities:
 * - Fetch and display messages using the PeerServ API.
 * - Allow users to send new payment requests with specified amounts and purposes.
 * - Facilitate approval or denial of payment requests, with blockchain-backed tokenization.
 * - Provide recipient selection and user management functionality.
 */

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

// Message interface for managing message data
interface Message {
  id: number;
  senderPublicKey: string;
  recipientPublicKey: string;
  messageBody: string;
  messageType: 'request' | 'approval' | 'notification' | 'payment';
  status: 'pending' | 'acknowledged' | 'error';
  createdAt: string;
}

// User interface for managing recipient data
interface User {
  email: string;
  public_key: string;
  role: string;
}

/**
 * Component: MessagePage
 * Description:
 * This component handles viewing and sending financial messages between users. It uses 
 * blockchain mechanisms to facilitate approvals, denials, and secure communication.
 */
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
        setUsers(response.data.members || []);
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

  /**
   * Function: fetchMessagesFromPeerServ
   * Fetches messages from PeerServ and formats them for use in the component.
   */
  const fetchMessagesFromPeerServ = async (): Promise<Message[]> => {
    try {
      const inboxMessages: Array<{
        messageId: number;
        body: string;
        sender: string;
        created_at: string;
      }> = await tokenator.listMessages({ messageBox: 'payment_requests' });

      return inboxMessages.map((msg) => ({
        id: msg.messageId,
        senderPublicKey: msg.sender,
        recipientPublicKey: '',
        messageBody: msg.body,
        messageType: 'notification',
        status: 'pending',
        createdAt: msg.created_at,
      }));
    } catch (error) {
      console.error('Error listing messages:', error);
      return [];
    }
  };

  /**
   * Function: handleNewRequestSubmit
   * Submits a new payment request to the recipient via PeerServ.
   */
  const handleNewRequestSubmit = async () => {
    if (!userPublicKey || !selectedRecipientKey) {
      console.error('User or recipient public key is missing.');
      return;
    }

    try {
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

  /**
   * Function: handleApproveRequest
   * Approves a payment request by sending a blockchain-backed token using PushDropTokenator.
   */
  const handleApproveRequest = async (recipientPublicKey: string, amount: number, purpose: string) => {
    try {
      const tokenator = new PushDropTokenator({
        peerServHost: 'https://staging-peerserv.babbage.systems',
        defaultTokenValue: 1,
        protocolID: 'paymentProtocol',
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

  /**
   * Function: handleSelectMessage
   * Opens the reply dialog for the selected message.
   */
  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    setIsReplyDialogOpen(true);
  };

  /**
   * Function: parseMessageBody
   * Parses the message body to extract amount and purpose, or returns defaults if parsing fails.
   */
  const parseMessageBody = (messageBody: string) => {
    try {
      const parsed = JSON.parse(messageBody);
      return {
        amount: parsed.amount || '[Unknown Amount]',
        purpose: parsed.purpose || '[Unknown Purpose]',
      };
    } catch {
      return {
        amount: '[Unknown Amount]',
        purpose: messageBody || '[No Details]',
      };
    }
  };

  /**
   * Function: handleReplySubmit
   * Processes the reply to a message, either approving or denying the request.
   */
  const handleReplySubmit = async (isApproved: boolean) => {
    if (isApproved && selectedMessage) {
      await handleApproveRequest(selectedMessage.senderPublicKey, newRequestAmount, newRequestPurpose);
    } else if (selectedMessage) {
      const denialNotification = {
        recipient: selectedMessage.senderPublicKey,
        messageBox: 'notifications_inbox',
        body: `Your payment request for ${newRequestAmount} was denied.`,
      };

      await tokenator.sendMessage(denialNotification);
    }

    setIsReplyDialogOpen(false);
  };

  /**
   * Function: handleRecipientSelect
   * Sets the selected recipient public key for a new request.
   */
  const handleRecipientSelect = (event: SelectChangeEvent<string>) => {
    setSelectedRecipientKey(event.target.value);
  };

  return (
    <div>
      <h1>Messages</h1>
      {/* Button to Open New Request Dialog */}
      <Button variant="contained" onClick={() => setIsRequestFormOpen(true)}>
        New Request
      </Button>

      {/* Messages List */}
      {messages.length > 0 ? (
        <List>
          {messages.map((message) => (
            <ListItem key={message.id} onClick={() => handleSelectMessage(message)}>
              <Button fullWidth>
                <ListItemText primary={message.messageType} secondary={message.messageBody} />
              </Button>
            </ListItem>
          ))}
        </List>
      ) : (
        <p>No messages available.</p>
      )}
      {/* New Request Dialog */}
      <Dialog open={isRequestFormOpen} onClose={() => setIsRequestFormOpen(false)}>
        <DialogTitle>New Payment Request</DialogTitle>
        <DialogContent>
          <FormControl fullWidth>
            <InputLabel>Select Recipient</InputLabel>
            <Select value={selectedRecipientKey || ''} onChange={handleRecipientSelect}>
              <MenuItem value="" disabled>Select Recipient</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.public_key} value={user.public_key}>
                  {user.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Amount" type="number" fullWidth value={newRequestAmount} onChange={(e) => setNewRequestAmount(Number(e.target.value))} />
          <TextField label="Purpose" fullWidth value={newRequestPurpose} onChange={(e) => setNewRequestPurpose(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsRequestFormOpen(false)}>Cancel</Button>
          <Button onClick={handleNewRequestSubmit} variant="contained">Submit Request</Button>
        </DialogActions>
      </Dialog>
      {/* Reply Dialog */}
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
          <Button onClick={() => handleReplySubmit(false)} color="secondary">Deny</Button>
          <Button onClick={() => handleReplySubmit(true)} color="primary">Approve</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default MessagePage;
