/**
 * File: DownloadInvoicesPage.tsx
 * Author: Stephen Thomson
 * Date Created: 11/30/2024
 * Description:
 * This component allows users to download invoices from uploaded files stored in the system. It provides
 * options for selecting a file and choosing an overlay service to retrieve the file.
 *
 * Functionalities:
 * - Displays a list of uploaded files fetched from the backend.
 * - Allows users to select a file and an overlay service for downloading.
 * - Downloads the file using the specified overlay service and displays it in the browser.
 * - Provides an option to add a new overlay service URL.
 *
 * Key Features:
 * - Uses Material-UI for a responsive and accessible interface.
 * - Integration with the backend to fetch file details and perform downloads.
 * - Includes progress tracking and error handling during file download.
 */

import React, { useState, useEffect, FormEvent } from 'react';
import {
  Button,
  TextField,
  Typography,
  LinearProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  SelectChangeEvent,
} from '@mui/material';
import { CloudDownload } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { download } from 'nanoseek';
import axios from 'axios';

interface UploadedFile {
  id: number;
  file_name: string;
  upload_time: string;
  expiration_time: string;
  uhrp_hash: string;
  public_url: string;
}

/**
 * Component: DownloadInvoicesPage
 * Description:
 * This component renders a form for downloading uploaded invoices. Users can select a file, choose
 * an overlay service, and download the file directly to their browser.
 */
const DownloadInvoicesPage: React.FC = () => {
  const [overlayServiceURL, setOverlayServiceURL] = useState<string>('https://staging-confederacy.babbage.systems');
  const [overlayServiceURLs, setOverlayServiceURLs] = useState<string[]>(['https://staging-confederacy.babbage.systems']);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloadedFileURL, setDownloadedFileURL] = useState<string | null>(null);
  const [newOption, setNewOption] = useState<string>('');
  const [openDialog, setOpenDialog] = useState<boolean>(false);

  // Fetch the list of uploaded files on page load
  useEffect(() => {
    const fetchUploadedFiles = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/uploaded-files');
        setUploadedFiles(response.data);
        console.log('Uploaded files:', response.data);
      } catch (error) {
        console.error('Error fetching uploaded files:', error);
        toast.error('Failed to load uploaded files.');
      }
    };

    fetchUploadedFiles();
  }, []);

  /**
   * Function: handleDownload
   * Description:
   * Handles the file download process by:
   * 1. Validating the selected file.
   * 2. Initiating the download through the overlay service.
   * 3. Creating a blob URL for the downloaded file and updating the state.
   * 4. Displaying appropriate success or error messages.
   */
  const handleDownload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFileId) {
      toast.error('Please select a file to download.');
      return;
    }

    setLoading(true);
    try {
      const selectedFile = uploadedFiles.find((file) => file.id === selectedFileId);
      if (!selectedFile) {
        toast.error('Selected file not found.');
        return;
      }

      const { mimeType, data } = await download({
        UHRPUrl: selectedFile.uhrp_hash.trim(),
        confederacyHost: overlayServiceURL.trim(),
      });

      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setDownloadedFileURL(url);

      toast.success('File downloaded successfully!');
    } catch (error: any) {
      toast.error('Error downloading the file.');
      console.error('Download error:', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Function: handleSelectFile
   * Description:
   * Updates the selected file ID when a file is chosen from the dropdown menu.
   */
  const handleSelectFile = (event: SelectChangeEvent<string>) => {
    const fileId = parseInt(event.target.value, 10); // Convert the string value to a number
    setSelectedFileId(fileId);
  };

  /**
   * Function: handleAddOption
   * Description:
   * Adds a new overlay service URL to the list if it is valid and unique.
   */
  const handleAddOption = () => {
    if (newOption.trim() && !overlayServiceURLs.includes(newOption.trim())) {
      setOverlayServiceURLs([...overlayServiceURLs, newOption.trim()]);
      setOverlayServiceURL(newOption.trim());
    }
    setNewOption('');
    setOpenDialog(false);
  };

  /**
   * Function: formatDate
   * Description:
   * Converts a date string to a user-friendly format. Returns "Invalid Date" for invalid inputs.
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) ? date.toLocaleString() : 'Invalid Date';
  };

  return (
    <div style={{ marginTop: '60px' }}>
      <form onSubmit={handleDownload}>
        <Grid container spacing={3}>
          {/* Page Header */}
          <Grid item xs={12}>
            <Typography variant="h4" align="center">Download Invoices</Typography>
            <Typography color="textSecondary" align="center" style={{ marginTop: '10px' }}>
              Select a file and an overlay service to download the invoice.
            </Typography>
          </Grid>
  
          {/* File Selection */}
          <Grid item xs={12}>
            <FormControl fullWidth variant="outlined" style={{ marginTop: '20px' }}>
              <InputLabel>Select File</InputLabel>
              <Select
                value={selectedFileId ? selectedFileId.toString() : ''}
                onChange={(event: SelectChangeEvent<string>) => handleSelectFile(event)}
                label="Select File"
              >
                {uploadedFiles.map((file) => (
                  <MenuItem key={file.id} value={file.id.toString()}>
                    {file.file_name} - {formatDate(file.upload_time)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
  
          {/* Overlay Service Selection */}
          <Grid item xs={12}>
            <FormControl fullWidth variant="outlined" style={{ marginTop: '20px' }}>
              <InputLabel>Overlay Service URL</InputLabel>
              <Select
                value={overlayServiceURL}
                onChange={(e) => setOverlayServiceURL(e.target.value as string)}
                label="Overlay Service URL"
              >
                {overlayServiceURLs.map((url, index) => (
                  <MenuItem key={index} value={url}>
                    {url}
                  </MenuItem>
                ))}
                <MenuItem value="add-new-option">+ Add New Option</MenuItem>
              </Select>
            </FormControl>
          </Grid>
  
          {/* Download Button */}
          <Grid item xs={12} style={{ marginTop: '20px' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              type="submit"
              disabled={loading || !selectedFileId}
              startIcon={<CloudDownload />}
            >
              Download
            </Button>
            {loading && <LinearProgress style={{ marginTop: '10px' }} />}
          </Grid>
  
          {/* Downloaded File Preview */}
          {downloadedFileURL && (
            <Grid item xs={12} style={{ marginTop: '20px' }}>
              <Typography variant="h6" align="center">Downloaded File:</Typography>
              <iframe
                src={downloadedFileURL}
                title="Downloaded Invoice"
                width="100%"
                height="600px"
                style={{ marginTop: '10px', border: '1px solid #ccc' }}
              />
            </Grid>
          )}
        </Grid>
  
        {/* Dialog for Adding Overlay Service URL */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Add Overlay Service URL</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label="URL"
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              style={{ marginTop: '10px' }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleAddOption}>Add</Button>
          </DialogActions>
        </Dialog>
      </form>
    </div>
  );  
};

export default DownloadInvoicesPage;
