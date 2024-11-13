import React, { useState, useEffect } from 'react';
import { Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import axios from 'axios';
import { decrypt } from '@babbage/sdk-ts';

interface JournalEntry {
  date: string;
  accountName: string;
  description: string;
  debit: string;
  credit: string;
}

// Decrypt function based on pushdrop
const decryptData = async (encryptedData: string): Promise<string> => {
  const decrypted = await decrypt({
    ciphertext: encryptedData,
    protocolID: [0, 'user encryption'],
    keyID: '1',
    returnType: 'string',
  });
  return typeof decrypted === 'string' ? decrypted : Buffer.from(decrypted).toString('utf8');
};

const ViewGeneralJournalPage: React.FC = () => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    const fetchJournalEntries = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/general-journal');
        const encryptedEntries = response.data;

        // Decrypt each field in the journal entry
        const decryptedEntries = await Promise.all(encryptedEntries.map(async (entry: any) => {
          const decryptedAccountName = await decryptData(entry.accountName);
          const decryptedDescription = await decryptData(entry.description);
          const decryptedDebit = await decryptData(entry.debit);
          const decryptedCredit = await decryptData(entry.credit);

          return {
            accountName: decryptedAccountName,
            description: decryptedDescription,
            debit: decryptedDebit,
            credit: decryptedCredit,
          };
        }));

        setJournalEntries(decryptedEntries);
      } catch (error) {
        console.error('Error fetching journal entries:', error);
      }
    };

    fetchJournalEntries();
  }, []);

  return (
    <Grid container spacing={3} justifyContent="center" alignItems="center" style={{ padding: '20px' }}>
      <Grid item xs={12}>
        <Typography variant="h4" align="center">General Journal</Typography>
      </Grid>

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
