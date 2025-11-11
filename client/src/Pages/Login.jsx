import React, { useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../store/slices/authSlice';
import { useNavigate, Link as RouterLink } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Button,
  TextField,
  Link,
  Grid,
  Box,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert
} from "@mui/material";
import { Email, Lock, Visibility, VisibilityOff } from "@mui/icons-material";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const dispatch = useDispatch();
  const { loading, error } = useSelector(state => state.auth);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setIsLoggingIn(true);
    
    try {
      await dispatch(loginUser({ email, password })).unwrap();
      toast.success("Login successful!");
      // Redirect to dashboard on successful login
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err.message || "Login failed";
      setFormError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <Grid container component="main" sx={{ height: '100vh' }}>
      <Grid size={{ xs: 12, sm: 7, md: 5 }} component={Paper} elevation={6} square>
        <Box
          sx={{
            my: 8,
            mx: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
            Welcome Back
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
            Sign in to access your news monitoring dashboard
          </Typography>
          
          <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Email /></InputAdornment>,
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            {(error || formError) && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {formError || error}
              </Alert>
            )}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoggingIn}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {isLoggingIn ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
            
            <Grid container justifyContent="center">
              <Grid>
                <Link component={RouterLink} to="/signup" variant="body2">
                  Don't have an account? Sign up
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Grid>
      
      <Grid
        size={{ xs: false, sm: 5, md: 7 }}
        sx={{
          backgroundImage: 'url(https://source.unsplash.com/random?news,desk,office)',
          backgroundRepeat: 'no-repeat',
          backgroundColor: (t) => t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: { xs: 'none', sm: 'flex' },
          flexDirection: 'column',
          justifyContent: 'flex-end',
          p: 4,
          color: 'white',
        }}
      >
        <Box sx={{ bgcolor: 'rgba(0, 0, 0, 0.5)', p: 3, borderRadius: 2 }}>
          <Typography component="h1" variant="h4" sx={{ fontWeight: 'bold' }}>
            Stay Informed
          </Typography>
          <Typography variant="subtitle1">
            Access real-time news insights and comprehensive analytics to make informed decisions.
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );
};

export default Login;