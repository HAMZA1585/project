import React from 'react';
import { 
  Box,
  Typography,
  Button,
  Container,
  useTheme,
  Paper,
  Grid
} from '@mui/material';
import { 
  SentimentVeryDissatisfied as ErrorIcon,
  Home as HomeIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const NotFoundPage = () => {
  const theme = useTheme();

  return (
    <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4,
          borderRadius: 4,
          textAlign: 'center',
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, #2c3e50 0%, #1a1a2e 100%)' 
            : 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)'
        }}
      >
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <ErrorIcon 
                sx={{ 
                  fontSize: 120,
                  color: theme.palette.error.main,
                  mb: 2
                }} 
              />
            </motion.div>
            
            <Typography 
              variant="h1" 
              sx={{ 
                fontSize: '5rem', 
                fontWeight: 900,
                mb: 1,
                background: theme.palette.mode === 'dark' 
                  ? 'linear-gradient(45deg, #ff4d4d 30%, #f9cb28 90%)' 
                  : 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              404
            </Typography>
            
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 600,
                mb: 2,
                color: theme.palette.text.primary
              }}
            >
              Oops! Page Not Found
            </Typography>
            
            <Typography 
              variant="body1" 
              sx={{ 
                mb: 4,
                color: theme.palette.text.secondary
              }}
            >
              The page you're looking for doesn't exist or has been moved. 
              Please check the URL or navigate back to safety.
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<HomeIcon />}
                href="/"
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
                }}
              >
                Go Home
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<BackIcon />}
                onClick={() => window.history.back()}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600
                }}
              >
                Go Back
              </Button>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
             
            </motion.div>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default NotFoundPage;