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
import constants from '../utils/constants';
import axios from 'axios';

const UploadInvoicesPage: React.FC = () => {
  const nanostoreURL = 'https://staging-nanostore.babbage.systems';
  const [hostingMinutes, setHostingMinutes] = useState<number>(180); // Default to 3 hours
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<{ hash: string; publicURL: string } | null>(null);
  const [isFormValid, setIsFormValid] = useState<boolean>(false);

  // Validate form inputs before enabling upload button
  useEffect(() => {
    setIsFormValid(!!file && hostingMinutes >= 180 && nanostoreURL.trim() !== '');
  }, [file, hostingMinutes, nanostoreURL]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      setFile(selectedFiles[0]);
    } else {
      setFile(null);
    }
  };

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
    <form onSubmit={handleUpload}>
      <Grid container spacing={3}>
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
          <input type="file" onChange={handleFileChange} />
        </Grid>

        {/* Upload Progress */}
        {isUploading && (
          <Grid item xs={12}>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Grid>
        )}

        {/* Submit Button */}
        <Grid item xs={12}>
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
    </form>
  );
};

export default UploadInvoicesPage;
