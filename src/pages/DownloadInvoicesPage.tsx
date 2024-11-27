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
        console.log('Uploaded files const:', uploadedFiles);
      } catch (error) {
        console.error('Error fetching uploaded files:', error);
        toast.error('Failed to load uploaded files.');
      }
    };

    fetchUploadedFiles();
  }, []);

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

  const handleSelectFile = (event: SelectChangeEvent<string>) => {
    const fileId = parseInt(event.target.value, 10); // Convert the string value to a number
    setSelectedFileId(fileId);
  };  

  const handleAddOption = () => {
    if (newOption.trim() && !overlayServiceURLs.includes(newOption.trim())) {
      setOverlayServiceURLs([...overlayServiceURLs, newOption.trim()]);
      setOverlayServiceURL(newOption.trim());
    }
    setNewOption('');
    setOpenDialog(false);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return !isNaN(date.getTime())
      ? date.toLocaleString()
      : "Invalid Date";
  };  

  return (
    <form onSubmit={handleDownload}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4">Download Invoices</Typography>
          <Typography color="textSecondary">
            Select a file and an overlay service to download the invoice.
          </Typography>
        </Grid>

        {/* File Selection */}
        <Grid item xs={12}>
          <FormControl fullWidth variant="outlined">
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
          <FormControl fullWidth variant="outlined">
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
        <Grid item xs={12}>
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
          {loading && <LinearProgress />}
        </Grid>

        {/* Downloaded File Preview */}
        {downloadedFileURL && (
          <Grid item xs={12}>
            <Typography variant="h6">Downloaded File:</Typography>
            <iframe src={downloadedFileURL} title="Downloaded Invoice" width="100%" height="600px" />
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddOption}>Add</Button>
        </DialogActions>
      </Dialog>
    </form>
  );
};

export default DownloadInvoicesPage;
