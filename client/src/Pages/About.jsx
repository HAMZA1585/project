import React from 'react';
import { Box, Container, Paper, Typography, Grid, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import { 
  Info as InfoIcon, 
  Code as CodeIcon, 
  Storage as StorageIcon, 
  Palette as PaletteIcon 
} from '@mui/icons-material';

const About = () => {
  const techStack = {
    backend: ['Python', 'Flask', 'SQLAlchemy', 'Redis', 'RQ (Task Queue)', 'JWT'],
    frontend: ['React', 'Vite', 'Redux Toolkit', 'React Query', 'Axios', 'MUI', 'TailwindCSS'],
    ai: ['Hugging Face Transformers', 'scikit-learn (TF-IDF)'],
    database: ['PostgreSQL (Production)', 'SQLite (Development)', 'FTS5 Search'],
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper 
          component={motion.div} 
          variants={itemVariants} 
          initial="hidden"
          animate="visible"
          elevation={3} 
          sx={{ 
            p: { xs: 3, md: 5 }, 
            borderRadius: 4 
          }}
        >
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box>
                <Typography 
                  variant="h3" 
                  component="h1" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 700,
                    background: 'linear-gradient(45deg, #4f46e5 30%, #a855f7 90%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  About NewsDesk
                </Typography>
                <Typography variant="h5" color="text.secondary" gutterBottom>
                  Real-time News Monitoring & AI Analysis
                </Typography>
                <Typography variant="body1" sx={{ mb: 3, fontSize: '1.1rem', lineHeight: 1.7 }}>
                  This application is a comprehensive, full-stack solution for monitoring, analyzing, and curating news articles in real-time. It leverages a modern technology stack to provide a powerful and responsive user experience.
                </Typography>
                <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.7 }}>
                  From AI-powered sentiment analysis and content summarization to advanced full-text search and interactive data visualizations, NewsDesk is designed to be a central hub for media intelligence.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <motion.div
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
              >
                <InfoIcon sx={{ fontSize: 120, color: 'primary.main', opacity: 0.8 }} />
              </motion.div>
            </Grid>
          </Grid>
          
          <Box sx={{ my: 5 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, textAlign: 'center' }}>
              Technology Stack
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <CodeIcon sx={{ mr: 1, color: 'secondary.main' }} /> Backend
                </Typography>
                <Box>
                  {techStack.backend.map(tech => (
                    <Chip key={tech} label={tech} sx={{ m: 0.5 }} color="secondary" variant="outlined" />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <PaletteIcon sx={{ mr: 1, color: 'primary.main' }} /> Frontend
                </Typography>
                <Box>
                  {techStack.frontend.map(tech => (
                    <Chip key={tech} label={tech} sx={{ m: 0.5 }} color="primary" variant="outlined" />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <StorageIcon sx={{ mr: 1, color: 'success.main' }} /> Database & AI
                </Typography>
                <Box>
                  {techStack.database.map(tech => (
                    <Chip key={tech} label={tech} sx={{ m: 0.5 }} color="success" variant="outlined" />
                  ))}
                  {techStack.ai.map(tech => (
                    <Chip key={tech} label={tech} sx={{ m: 0.5 }} color="warning" variant="outlined" />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Container>
    </motion.div>
  );
};

export default About;
