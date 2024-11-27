import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Grid, Button } from '@mui/material';
import { getPublicKey } from '@babbage/sdk-ts';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { fetchUserRoleFromBlockchain, addKeyUser, getUserEmail } from '../services/blockchain/blockchain';

interface User {
  publicKey: string;
  role: string;
  email: string;
}

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const publicKey = await getPublicKey({ identityKey: true });
  
        // Fetch role and email
        const role = await fetchUserRoleFromBlockchain(publicKey) || 'Unknown';
        const email = await getUserEmail(publicKey) || 'No email provided';
  
        // Set user state with defaults
        setUser({ publicKey, role, email });
  
        // Fetch pending requests for the user
        const requestsResponse = await axios.get(`http://localhost:5000/api/messages/pending/${publicKey}`);
        if (requestsResponse.status === 200) {
          setPendingRequests(requestsResponse.data.pendingCount || 0); // Default to 0 if no messages
        } else {
          setPendingRequests(0); // Set to 0 explicitly on error or unexpected response
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };
  
    fetchUserData();
  }, []);
  
  

  // Conditional navigation buttons based on user role
  const roleNavigation = () => {
    if (user?.role === 'Manager') {
      return (
        <>
          <Button variant="contained" onClick={() => navigate('/view-general-journal')}>View General Journal</Button>
          <Button variant="contained" onClick={() => navigate('/view-account')}>View Accounts</Button>
        </>
      );
    } else if (user?.role === 'Staff') {
      return (
        <>
          <Button variant="contained" onClick={() => navigate('/budget')}>Budget Page</Button>
          <Button variant="contained" onClick={() => navigate('/upload-invoices')}>Upload Invoices</Button>
        </>
      );
    } else if (user?.role === 'KeyPerson') {
      return (
        <>
          <Button variant="contained" onClick={() => navigate('/view-general-journal')}>View General Journal</Button>
          <Button variant="contained" onClick={() => navigate('/budget')}>Budget Page</Button>
        </>
      );
    }
    return null;
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
        <Grid container spacing={2} justifyContent="center">
          {roleNavigation()}
        </Grid>
      </Grid>
    </Grid>
  );
};  

export default Dashboard;
