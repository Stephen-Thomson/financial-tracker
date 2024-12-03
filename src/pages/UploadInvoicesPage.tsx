/**
 * File: UploadInvoicesPage.tsx
 * Author: Stephen Thomson
 * Date Created: 11/30/2024
 * Description:
 * This component provides an interface for uploading invoices or receipts to NanoStore for secure 
 * storage. The user can select a file, specify the retention duration, and securely upload the file. 
 * Upon successful upload, the file's details are saved in the backend database.
 *
 * Functionalities:
 * - Allows users to upload files to NanoStore.
 * - Supports retention durations from 3 hours to 3 months.
 * - Tracks and displays upload progress.
 * - Saves file metadata (UHRP hash, public URL, etc.) to the backend.
 *
 * Dependencies:
 * - React: For building the UI.
 * - @mui/material: For UI components.
 * - nanostore-publisher: For uploading files to NanoStore.
 * - axios: For making HTTP requests to the backend.
 */

import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import {
  Button,
  LinearProgress,
  Grid,
  Select,
  MenuItem,
  TextField,
  Typography,
  FormControl,
  InputLabel,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { publishFile } from 'nanostore-publisher';
import axios from 'axios';

/**
 * Component: UploadInvoicesPage
 * Description:
 * Provides a form for users to upload invoices or receipts to NanoStore. The component handles file
 * selection, upload progress tracking, and saving file metadata to the backend.
 */
const UploadInvoicesPage: React.FC = () => {
  const nanostoreURL = 'https://staging-nanostore.babbage.systems';
  const [hostingMinutes, setHostingMinutes] = useState<number>(180); // Default to 3 hours
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<{ hash: string; publicURL: string } | null>(null);
  const [isFormValid, setIsFormValid] = useState<boolean>(false);

  /**
   * Effect: Validate Form
   * Description:
   * Ensures the form is valid by checking if all required inputs are provided.
   */
  useEffect(() => {
    setIsFormValid(!!file && hostingMinutes >= 180 && nanostoreURL.trim() !== '');
  }, [file, hostingMinutes, nanostoreURL]);

  /**
   * Function: handleFileChange
   * Description:
   * Handles file selection from the file input field.
   */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      setFile(selectedFiles[0]);
    } else {
      setFile(null);
    }
  };

  /**
   * Function: handleUpload
   * Description:
   * Uploads the selected file to NanoStore and saves file details to the backend database.
   */
  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !isFormValid) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      console.log('Uploading to NanoStore:', nanostoreURL);

      // Upload the file to NanoStore
      const uploadResult = await publishFile({
        config: { nanostoreURL },
        file,
        retentionPeriod: hostingMinutes,
        progressTracker: (prog: ProgressEvent) => {
          const progress = prog.total > 0 ? (prog.loaded / prog.total) * 100 : 0;
          setUploadProgress(progress);
        },
      });

      // Update the UI with the upload result
      setUploadResult({ hash: uploadResult.hash, publicURL: uploadResult.publicURL });
      console.log('Upload successful:', uploadResult);

      // Save file details to the database
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + hostingMinutes);

      await axios.post('http://localhost:5000/api/uploaded-files', {
        fileName: file.name,
        uploadTime: new Date().toISOString(),
        expirationTime: expirationTime.toISOString(),
        uhrpHash: uploadResult.hash,
        publicUrl: uploadResult.publicURL,
      });

      console.log('File details saved to the database.');
    } catch (error: any) {
      console.error('Error uploading file or saving details:', error.message || error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div style={{ marginTop: '60px' }}>
      <Grid container spacing={3}>
        {/* Page Header */}
        <Grid item xs={12}>
          <Typography variant="h4">Upload Invoice or Receipt</Typography>
          <Typography color="textSecondary">Upload files to NanoStore for secure storage.</Typography>
        </Grid>
  
        {/* Retention Duration Selection */}
        <Grid item xs={12}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>Retention Duration</InputLabel>
            <Select
              value={hostingMinutes}
              onChange={(e) => setHostingMinutes(Number(e.target.value))}
              label="Retention Duration"
            >
              <MenuItem value={180}>3 Hours</MenuItem>
              <MenuItem value={1440}>1 Day</MenuItem>
              <MenuItem value={1440 * 7}>1 Week</MenuItem>
              <MenuItem value={1440 * 30}>1 Month</MenuItem>
              <MenuItem value={1440 * 90}>3 Months</MenuItem>
            </Select>
          </FormControl>
        </Grid>
  
        {/* File Input */}
        <Grid item xs={12}>
          <form onSubmit={handleUpload}> {/* Wrap only the file input and submit button */}
            <input type="file" onChange={handleFileChange} />
            {/* Upload Progress */}
            {isUploading && (
              <div style={{ margin: '20px 0' }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </div>
            )}
            {/* Submit Button */}
            <div style={{ marginTop: '20px' }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                type="submit"
                disabled={!isFormValid || isUploading}
                startIcon={<CloudUpload />}
              >
                Upload
              </Button>
            </div>
          </form>
        </Grid>
  
        {/* Upload Result */}
        {uploadResult && (
          <Grid item xs={12}>
            <Typography variant="h6">Upload Successful!</Typography>
            <Typography>UHRP Hash: {uploadResult.hash}</Typography>
            <Typography>
              Public URL:{' '}
              <a href={uploadResult.publicURL} target="_blank" rel="noopener noreferrer">
                {uploadResult.publicURL}
              </a>
            </Typography>
          </Grid>
        )}
      </Grid>
    </div>
  );  
};

export default UploadInvoicesPage;
