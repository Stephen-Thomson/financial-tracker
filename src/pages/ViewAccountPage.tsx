/**
 * File: ViewAccountPage.tsx
 * Author: Stephen Thomson
 * Date Created: 11/30/2024
 * Description:
 * This component allows users to view account entries for a selected account. The data is fetched
 * from the backend, and encrypted entries are decrypted before being displayed in a table.
 *
 * Functionalities:
 * - Fetches a list of available accounts from the backend.
 * - Allows users to select an account to view its entries.
 * - Fetches and decrypts account entries for the selected account.
 * - Displays decrypted account entries in a tabular format.
 *
 * Dependencies:
 * - React: For building the UI.
 * - @mui/material: For UI components.
 * - axios: For making HTTP requests to the backend.
 * - @babbage/sdk-ts: For decrypting encrypted data.
 */

import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import axios from 'axios';
import { decrypt } from '@babbage/sdk-ts';

/**
 * Interface: Account
 * Represents the structure of an account object.
 */
interface Account {
  id: number;
  name: string;
}

/**
 * Interface: AccountEntry
 * Represents the structure of an account entry.
 */
interface AccountEntry {
  date: string;
  description: string;
  debit: string;
  credit: string;
  runningTotal: string;
}

/**
 * Function: decryptData
 * Description:
 * Decrypts encrypted data using the Babbage SDK.
 * Returns the decrypted string or a fallback message if decryption fails.
 */
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

/**
 * Component: ViewAccountPage
 * Description:
 * Displays account entries for a selected account. Allows users to select an account and view its
 * entries after decrypting the data.
 */
const ViewAccountPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [selectedAccountName, setSelectedAccountName] = useState<string | null>(null);
  const [accountEntries, setAccountEntries] = useState<AccountEntry[]>([]);

  /**
   * Effect: Fetch Accounts
   * Description:
   * Fetches the list of accounts from the backend and stores them in state.
   */
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

  /**
   * Effect: Fetch Account Entries
   * Description:
   * Fetches and decrypts the entries for the selected account from the backend.
   */
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

  /**
   * Function: handleAccountSelect
   * Description:
   * Handles the selection of an account from the dropdown. Updates the state with the selected account.
   */
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

      {/* Account Selection Dropdown */}
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

      {/* Account Entries Table */}
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
