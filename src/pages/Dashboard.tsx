import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Grid, Button } from '@mui/material';
import { getPublicKey } from '@babbage/sdk-ts';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface User {
  publicKey: string;
  role: string;
  email: string;
}

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const navigate = useNavigate();
  
  // Fetch the user’s information and pending requests
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const publicKey = await getPublicKey({ reason: 'User identification for Dashboard', identityKey: true });
        const userResponse = await axios.get(`http://localhost:5000/api/users/role/${publicKey}`);
        if (userResponse.status === 200) {
          setUser({ ...userResponse.data, publicKey });
        }

        // Fetch pending requests for the user
        const requestsResponse = await axios.get(`http://localhost:5000/api/messages/pending/${publicKey}`);
        if (requestsResponse.status === 200) {
          setPendingRequests(requestsResponse.data.pendingCount);
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
      
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6">User Information</Typography>
            <Typography variant="body1"><strong>Email:</strong> {user?.email}</Typography>
            <Typography variant="body1"><strong>Role:</strong> {user?.role}</Typography>
          </CardContent>
        </Card>
      </Grid>

      {pendingRequests > 0 && (
        <Grid item xs={12}>
          <Card style={{ backgroundColor: '#fff3cd' }}>
            <CardContent>
              <Typography variant="h6">Pending Requests</Typography>
              <Typography variant="body2">
                You have {pendingRequests} pending requests. Please check the <Button color="primary" onClick={() => navigate('/messaging')}>Messaging Page</Button>.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )}

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
