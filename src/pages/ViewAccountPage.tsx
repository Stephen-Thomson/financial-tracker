import React, { useState, useEffect } from 'react';
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import axios from 'axios';
import { decrypt } from '@babbage/sdk-ts';

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
const decryptData = async (encryptedData: string | undefined): Promise<string> => {
  if (!encryptedData) {
    console.warn('Attempting to decrypt empty or undefined data.');
    return ''; // Return empty string if the data is invalid
  }
  try {
    const decrypted = await decrypt({
      ciphertext: encryptedData,
      protocolID: [0, 'user encryption'],
      keyID: '1',
      returnType: 'string',
    });
    return typeof decrypted === 'string' ? decrypted : Buffer.from(decrypted).toString('utf8');
  } catch (error) {
    console.error('Error decrypting data:', error);
    return '[Decryption Failed]';
  }
};

const ViewAccountPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [selectedAccountName, setSelectedAccountName] = useState<string | null>(null);
  const [accountEntries, setAccountEntries] = useState<AccountEntry[]>([]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/accounts');
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
          console.log('Fetching account entries for account:', selectedAccountName);
          const response = await axios.get(`http://localhost:5000/api/accounts/${selectedAccountName}/entries`);
          const encryptedEntries = response.data;
  
          console.log('Encrypted entries:', encryptedEntries);
  
          // Decrypt each field in the entry
          const decryptedEntries = await Promise.all(
            encryptedEntries.map(async (entry: any) => {
              let decryptedDescription = '[No Description]';
              let decryptedDebit = '0';
              let decryptedCredit = '0';
              let decryptedRunningTotal = '0';
  
              try {
                // Parse the encrypted_data JSON string
                const encryptedData = JSON.parse(entry.encrypted_data);
  
                // Decrypt each field
                decryptedDescription = await decryptData(encryptedData.description);
                decryptedDebit = await decryptData(encryptedData.debit);
                decryptedCredit = await decryptData(encryptedData.credit);
                decryptedRunningTotal = await decryptData(encryptedData.runningTotal);
              } catch (parseError) {
                console.error('Error parsing or decrypting entry:', parseError);
              }
  
              return {
                ...entry,
                description: decryptedDescription,
                debit: decryptedDebit,
                credit: decryptedCredit,
                runningTotal: decryptedRunningTotal,
              };
            })
          );
  
          setAccountEntries(decryptedEntries);
        } catch (error) {
          console.error('Error fetching account entries:', error);
        }
      }
    };
  
    fetchAccountEntries();
  }, [selectedAccountName]);
  
  const handleAccountSelect = (event: SelectChangeEvent<number>) => {
    const accountId = Number(event.target.value);
    setSelectedAccount(accountId);
    setAccountEntries([]); // Clear previous entries when a new account is selected

    // Set the name of the selected account
    const account = accounts.find((acc) => acc.id === accountId);
    setSelectedAccountName(account?.name || null);
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
          <Typography variant="h5" align="center">{selectedAccountName}</Typography>
          
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
