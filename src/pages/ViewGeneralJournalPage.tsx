/**
 * File: ViewGeneralJournalPage.tsx
 * Author: Stephen Thomson
 * Date Created: 11/30/2024
 * Description:
 * This component retrieves and displays general journal entries in a tabular format. The data is 
 * fetched from the backend as encrypted entries, which are decrypted on the client side before being displayed.
 *
 * Functionalities:
 * - Fetches encrypted journal entries from the backend API.
 * - Decrypts journal entry data fields such as account name, description, debit, and credit.
 * - Displays the decrypted journal entries in a Material-UI table.
 * - Provides a clear and user-friendly layout to view the general journal.
 */

import React, { useState, useEffect } from 'react';
import { Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import axios from 'axios';
import { decrypt } from '@babbage/sdk-ts';

/**
 * Interface representing a decrypted journal entry.
 */
interface JournalEntry {
  date: string;
  accountName: string;
  description: string;
  debit: string;
  credit: string;
}

/**
 * Function: decryptData
 * @description Decrypts encrypted data using the Babbage SDK.
 * @param encryptedData - The encrypted string to be decrypted.
 * @returns A promise that resolves to the decrypted string.
 */
const decryptData = async (encryptedData: string | undefined): Promise<string> => {
  if (!encryptedData) {
    console.warn('Attempting to decrypt empty or undefined data.');
    return '';
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
 * Component: ViewGeneralJournalPage
 * @description Fetches and displays decrypted journal entries in a table format.
 */
const ViewGeneralJournalPage: React.FC = () => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  /**
   * Fetch and decrypt journal entries from the backend.
   */
  useEffect(() => {
    const fetchJournalEntries = async () => {
      try {
        // Fetch encrypted journal entries from the backend
        const response = await axios.get('http://localhost:5000/api/general-journal');
        const encryptedEntries = response.data;

        console.log('Encrypted journal entries:', encryptedEntries);

        // Decrypt each field in the journal entry
        const decryptedEntries = await Promise.all(
          encryptedEntries.map(async (entry: any) => {
            let decryptedAccountName = '[Unknown Account]';
            let decryptedDescription = '[No Description]';
            let decryptedDebit = '0';
            let decryptedCredit = '0';

            try {
              // Parse and decrypt each field
              const encryptedData = JSON.parse(entry.encrypted_data);

              decryptedAccountName = await decryptData(encryptedData.accountName);
              decryptedDescription = await decryptData(encryptedData.description);
              decryptedDebit = await decryptData(encryptedData.debit);
              decryptedCredit = await decryptData(encryptedData.credit);
            } catch (decryptError) {
              console.error('Error decrypting journal entry:', decryptError);
            }

            return {
              ...entry,
              accountName: decryptedAccountName,
              description: decryptedDescription,
              debit: decryptedDebit,
              credit: decryptedCredit,
            };
          })
        );

        // Update state with decrypted journal entries
        setJournalEntries(decryptedEntries);
      } catch (error) {
        console.error('Error fetching journal entries:', error);
      }
    };

    fetchJournalEntries();
  }, []);

  return (
    <Grid container spacing={3} justifyContent="center" alignItems="center" style={{ padding: '20px' }}>
      {/* Page Title */}
      <Grid item xs={12}>
        <Typography variant="h4" align="center">
          General Journal
        </Typography>
      </Grid>

      {/* Journal Entries Table */}
      <Grid item xs={12}>
        <TableContainer component={Paper} style={{ marginTop: '20px' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Debit</TableCell>
                <TableCell>Credit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {journalEntries.map((entry, index) => (
                <TableRow key={index}>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell>{entry.accountName}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell>{entry.debit}</TableCell>
                  <TableCell>{entry.credit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
    </Grid>
  );
};

export default ViewGeneralJournalPage;
