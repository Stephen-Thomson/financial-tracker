/**
 * File: Dashboard.tsx
 * Author: Stephen Thomson
 * Date Created: 11/30/2024
 * Description:
 * This component serves as the main dashboard for the application. It provides user-specific information,
 * including email, role, and pending requests, and offers quick navigation options based on the user's role.
 *
 * Functionalities:
 * - Displays user information retrieved from the blockchain and backend.
 * - Shows the count of pending requests for the user.
 * - Provides role-based navigation options for quick access to relevant pages.
 *
 * Key Features:
 * - Dynamic data fetching for user and pending requests.
 * - Conditional rendering of navigation options based on the user's role.
 * - Styled using Material-UI components for a responsive layout.
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Grid, Button, Box } from '@mui/material';
import { getPublicKey } from '@babbage/sdk-ts';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { fetchUserRoleFromBlockchain, getUserEmail } from '../services/blockchain/blockchain';

interface User {
  publicKey: string;
  role: string;
  email: string;
}

/**
 * Component: Dashboard
 * Description:
 * The main dashboard for displaying user information, pending requests, and quick navigation options.
 */
const Dashboard: React.FC = () => {
  // State for storing user data, pending requests, and navigation state
  const [user, setUser] = useState<User | null>(null);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const navigate = useNavigate();

  // Fetch user data and pending requests on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Retrieve the user's public key
        const publicKey = await getPublicKey({ identityKey: true });

        // Fetch user role and email from blockchain
        const role = await fetchUserRoleFromBlockchain(publicKey) || 'Unknown';
        const email = await getUserEmail(publicKey) || 'No email provided';

        // Update user state
        setUser({ publicKey, role, email });

        // Fetch pending requests from backend
        const requestsResponse = await axios.get(`http://localhost:5000/api/messages/pending/${publicKey}`);
        setPendingRequests(requestsResponse.data?.pendingCount || 0);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchUserData();
  }, []);

  /**
   * Function: roleNavigation
   * Description:
   * Renders role-specific navigation buttons based on the user's role.
   */
  const roleNavigation = () => {
    if (!user?.role) {
      return <Typography variant="body2" align="center">No navigation available.</Typography>;
    }

    switch (user.role) {
      case 'Manager':
        return (
          <>
            <Button variant="contained" onClick={() => navigate('/viewGeneralJournal')}>View General Journal</Button>
            <Button variant="contained" onClick={() => navigate('/viewAccount')}>View Accounts</Button>
            <Button variant="contained" onClick={() => navigate('/budget')}>Budget Page</Button>
            <Button variant="contained" onClick={() => navigate('/create-accounts')}>Create Accounts</Button>
            <Button variant="contained" onClick={() => navigate('/transaction')}>Transaction</Button>
            <Button variant="contained" onClick={() => navigate('/message')}>Messaging</Button>
            <Button variant="contained" onClick={() => navigate('/uploadInvoices')}>Upload Invoices</Button>
            <Button variant="contained" onClick={() => navigate('/downloadInvoices')}>Download Invoices</Button>
          </>
        );
      case 'Staff':
        return (
          <>
            <Button variant="contained" onClick={() => navigate('/viewGeneralJournal')}>View General Journal</Button>
            <Button variant="contained" onClick={() => navigate('/viewAccount')}>View Accounts</Button>
            <Button variant="contained" onClick={() => navigate('/budget')}>Budget Page</Button>
            <Button variant="contained" onClick={() => navigate('/transaction')}>Transaction</Button>
            <Button variant="contained" onClick={() => navigate('/message')}>Messaging</Button>
            <Button variant="contained" onClick={() => navigate('/uploadInvoices')}>Upload Invoices</Button>
            <Button variant="contained" onClick={() => navigate('/downloadInvoices')}>Download Invoices</Button>
          </>
        );
      case 'keyPerson':
        return (
          <>
            <Button variant="contained" onClick={() => navigate('/viewGeneralJournal')}>View General Journal</Button>
            <Button variant="contained" onClick={() => navigate('/viewAccount')}>View Accounts</Button>
            <Button variant="contained" onClick={() => navigate('/budget')}>Budget Page</Button>
            <Button variant="contained" onClick={() => navigate('/create-accounts')}>Create Accounts</Button>
            <Button variant="contained" onClick={() => navigate('/transaction')}>Transaction</Button>
            <Button variant="contained" onClick={() => navigate('/message')}>Messaging</Button>
            <Button variant="contained" onClick={() => navigate('/uploadInvoices')}>Upload Invoices</Button>
            <Button variant="contained" onClick={() => navigate('/downloadInvoices')}>Download Invoices</Button>
            <Button variant="contained" onClick={() => navigate('/manager')}>Manage Team</Button>
          </>
        );
      default:
        return <Typography variant="body2" align="center">No navigation available for this role.</Typography>;
    }
  };

  return (
    <Grid container spacing={3} justifyContent="center" alignItems="center" style={{ padding: '20px' }}>
      <Grid item xs={12}>
        <Typography variant="h4" align="center">Welcome to the Dashboard</Typography>
      </Grid>

      {/* User Information Section */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6">User Information</Typography>
            <Typography variant="body1"><strong>Email:</strong> {user?.email || 'Not Available'}</Typography>
            <Typography variant="body1"><strong>Role:</strong> {user?.role || 'Unknown Role'}</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Pending Requests Section */}
      <Grid item xs={12}>
        {pendingRequests > 0 ? (
          <Card style={{ backgroundColor: '#fff3cd' }}>
            <CardContent>
              <Typography variant="h6">Pending Requests</Typography>
              <Typography variant="body2">
                You have {pendingRequests} pending requests. Please check the{' '}
                <Button color="primary" onClick={() => navigate('/messaging')}>Messaging Page</Button>.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Typography variant="h6" align="center">No Pending Requests</Typography>
              <Typography variant="body2" align="center">
                You have no pending requests at the moment.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Grid>

      {/* Quick Navigation Section */}
      <Grid item xs={12}>
        <Typography variant="h6" align="center">Quick Navigation</Typography>
        <Box mt={2}>
          <Grid container spacing={2} justifyContent="center">
            {roleNavigation()}
          </Grid>
        </Box>
      </Grid>
    </Grid>
  );
};

export default Dashboard;
