import React, { useState, FormEvent, useEffect } from 'react';
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
  SelectChangeEvent
} from '@mui/material';
import { CloudDownload } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { download } from 'nanoseek';
import constants from '../utils/constants'; // Import the constants

interface DownloadInvoicesPageProps {}

const DownloadInvoicesPage: React.FC<DownloadInvoicesPageProps> = () => {
  // Initialize overlayServiceURLs and set the default overlayServiceURL from constants
  const [overlayServiceURL, setOverlayServiceURL] = useState<string>(constants.confederacyURL);
  const [overlayServiceURLs, setOverlayServiceURLs] = useState<string[]>(constants.confederacyURLs);
  const [downloadURL, setDownloadURL] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [downloadedFileURL, setDownloadedFileURL] = useState<string | null>(null);
  const [newOption, setNewOption] = useState<string>('');
  const [openDialog, setOpenDialog] = useState<boolean>(false);

  useEffect(() => {
    // Set initial overlay service URL to the first in the constants array if available
    if (overlayServiceURLs.length > 0) {
      setOverlayServiceURL(overlayServiceURLs[0]);
    }
  }, [overlayServiceURLs]);

  const handleDownload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Use nanoseek for downloading from UHRP
      const { mimeType, data } = await download({
        UHRPUrl: downloadURL.trim(),
        confederacyHost: overlayServiceURL.trim()
      });

      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setDownloadedFileURL(url);

      toast.success('File downloaded successfully!');
    } catch (error) {
      toast.error('Error downloading the file.');
      console.error('Download error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    const selectedValue = event.target.value;
    if (selectedValue === 'add-new-option') {
      setOpenDialog(true);
    } else {
      setOverlayServiceURL(selectedValue);
    }
  };

  const handleAddOption = () => {
    if (newOption && !overlayServiceURLs.includes(newOption)) {
      setOverlayServiceURLs([...overlayServiceURLs, newOption]);
      setOverlayServiceURL(newOption);
    }
    setNewOption('');
    setOpenDialog(false);
  };

  return (
    <form onSubmit={handleDownload}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4">Download Invoices</Typography>
          <Typography color="textSecondary">
            Enter the UHRP URL of the invoice and select an overlay service to download.
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>Overlay Service URL</InputLabel>
            <Select value={overlayServiceURL} onChange={handleSelectChange} label="Overlay Service URL">
              {overlayServiceURLs.map((url, index) => (
                <MenuItem key={index} value={url}>
                  {url}
                </MenuItem>
              ))}
              <MenuItem value="add-new-option">+ Add New Option</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            variant="outlined"
            label="UHRP URL"
            value={downloadURL}
            onChange={(e) => setDownloadURL(e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            type="submit"
            disabled={loading || !downloadURL || !overlayServiceURL}
            startIcon={<CloudDownload />}
          >
            Download
          </Button>
          {loading && <LinearProgress />}
        </Grid>
        {downloadedFileURL && (
          <Grid item xs={12}>
            <Typography variant="h6">Downloaded File:</Typography>
            <iframe src={downloadedFileURL} title="Downloaded Invoice" width="100%" height="600px" />
          </Grid>
        )}
      </Grid>

      {/* Dialog for adding a new overlay service URL */}
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
