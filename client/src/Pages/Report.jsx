import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  Box, Typography, Button, Radio, RadioGroup, FormControlLabel, FormControl, CircularProgress, Paper
} from '@mui/material';
import { Download, PictureAsPdf, TableChart } from '@mui/icons-material';
import { generateReport } from '../Services/api.js';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const Report = () => {
  const user = useSelector(state => state.auth.user);
  const [format, setFormat] = useState('pdf');
  const navigate = useNavigate();

  // Redirect if not logged in
  if (!user) {
    toast.error("You must be logged in to access this page");
    navigate('/login');
    return null;
  }

  // Use React Query mutation for report generation
  const generateReportMutation = useMutation({
    mutationFn: async ({ format }) => {
      const response = await generateReport({ format });
      return response;
    },
    onSuccess: (response) => {
      if (response.filename) {
        toast.success('Report generated successfully!');
        // Trigger the download by opening the download URL
        const downloadUrl = `${API_BASE}/api/v1/report/download/${response.filename}`;
        window.open(downloadUrl, '_blank');
      } else {
        throw new Error(response.error || 'An unknown error occurred');
      }
    },
    onError: (error) => {
      toast.error(`Failed to generate report: ${error.message}`);
      console.error("Report generation error:", error);
    },
  });

  const handleFormatChange = (event) => {
    setFormat(event.target.value);
  };

  const handleExport = () => {
    const toastId = toast.loading(`Generating ${format.toUpperCase()} report...`);
    generateReportMutation.mutate({ format });
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 'bold' }}>
        Generate Reports
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 4, color: 'text.secondary' }}>
        Export the latest 50 news articles into a downloadable file.
      </Typography>

      <Paper sx={{ p: 3, borderRadius: '12px', boxShadow: 3 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
          1. Select Report Format
        </Typography>

        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <RadioGroup row name="report-format" value={format} onChange={handleFormatChange}>
            <FormControlLabel
              value="pdf"
              control={<Radio />}
              label={<Box sx={{ display: 'flex', alignItems: 'center' }}><PictureAsPdf sx={{ mr: 1 }} /> PDF</Box>}
            />
            <FormControlLabel
              value="csv"
              control={<Radio />}
              label={<Box sx={{ display: 'flex', alignItems: 'center' }}><TableChart sx={{ mr: 1 }} /> CSV</Box>}
            />
          </RadioGroup>
        </FormControl>

        <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
          2. Generate & Download
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Button
            variant="contained"
            startIcon={generateReportMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <Download />}
            onClick={handleExport}
            disabled={generateReportMutation.isPending}
            sx={{ px: 4, py: 1.5, borderRadius: '8px', minWidth: '200px', textTransform: 'none', fontSize: '1rem' }}
          >
            {generateReportMutation.isPending ? 'Generating...' : 'Generate Report'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Report;