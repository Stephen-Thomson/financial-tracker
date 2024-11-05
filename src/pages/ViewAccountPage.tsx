import React, { useState, useEffect } from 'react';
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import axios from 'axios';
import pushdrop from 'pushdrop';

interface Account {
  id: number;
  name: string;
}

interface AccountEntry {
  date: string;
  description: string;
  debit: string;
  credit: string;
  runningTotal: string;
}

// Decrypt data function
const decryptData = async (encryptedData: string): Promise<string> => {
  const decrypted = await pushdrop.decrypt({
    ciphertext: encryptedData,
    protocolID: 'user-encryption',
    keyID: '1',
    returnType: 'string',
  });
  return decrypted;
};

const ViewAccountPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [accountEntries, setAccountEntries] = useState<AccountEntry[]>([]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await axios.get('/api/accounts');
        setAccounts(response.data);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    const fetchAccountEntries = async () => {
      if (selectedAccount) {
        try {
          const response = await axios.get(`/api/accounts/${selectedAccount}/entries`);
          const encryptedEntries = response.data;

          // Decrypt each field in the entry
          const decryptedEntries = await Promise.all(encryptedEntries.map(async (entry: any) => {
            const decryptedDescription = await decryptData(entry.description);
            const decryptedDebit = await decryptData(entry.debit);
            const decryptedCredit = await decryptData(entry.credit);
            const decryptedRunningTotal = await decryptData(entry.runningTotal);

            return {
              ...entry,
              description: decryptedDescription,
              debit: decryptedDebit,
              credit: decryptedCredit,
              runningTotal: decryptedRunningTotal,
            };
          }));

          setAccountEntries(decryptedEntries);
        } catch (error) {
          console.error('Error fetching account entries:', error);
        }
      }
    };

    fetchAccountEntries();
  }, [selectedAccount]);

  const handleAccountSelect = (event: SelectChangeEvent<number>) => {
    setSelectedAccount(Number(event.target.value));
    setAccountEntries([]); // Clear previous entries when a new account is selected
  };

  return (
    <Grid container spacing={3} justifyContent="center" alignItems="center" style={{ padding: '20px' }}>
      <Grid item xs={12}>
        <Typography variant="h4" align="center">View Account</Typography>
      </Grid>

      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Select Account</InputLabel>
          <Select value={selectedAccount || ''} onChange={handleAccountSelect} label="Select Account">
            <MenuItem value="" disabled>Select Account</MenuItem>
            {accounts.map((account) => (
              <MenuItem key={account.id} value={account.id}>
                {account.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {selectedAccount && (
        <Grid item xs={12}>
          <Typography variant="h5" align="center">{accounts.find(acc => acc.id === selectedAccount)?.name}</Typography>
          
          <TableContainer component={Paper} style={{ marginTop: '20px' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Debit</TableCell>
                  <TableCell>Credit</TableCell>
                  <TableCell>Running Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accountEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>{entry.debit}</TableCell>
                    <TableCell>{entry.credit}</TableCell>
                    <TableCell>{entry.runningTotal}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      )}
    </Grid>
  );
};

export default ViewAccountPage;
