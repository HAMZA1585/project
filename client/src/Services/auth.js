import api from "./api";
import axios from "axios";

// No need to save tokens - they're now stored in httpOnly cookies
export function logout() {
  // Call the backend logout endpoint to clear cookies
  api.post('/api/v1/auth/logout').catch(() => {
    // Ignore errors - cookies will be cleared by the backend
  });
}

export async function register(formData) {
  try {
    console.log("DEBUG: Auth service - register called with formData:", formData);
    console.log("DEBUG: Auth service - posting to /api/v1/auth/register");
    
    const res = await api.post("/api/v1/auth/register", formData);
    console.log("DEBUG: Auth service - register response:", res.data);
    
    // Tokens are now automatically stored in httpOnly cookies by the backend
    console.log("DEBUG: Auth service - tokens stored in httpOnly cookies");
    return res.data;
  } catch (err) {
    console.error("DEBUG: Auth service - register error:", err);
    console.error("DEBUG: Auth service - error response:", err.response?.data);
    throw err.response?.data?.error || "Signup failed";
  }
}

export async function login(credentials) {
  try {
    console.log("DEBUG: Auth service - login called with credentials:", credentials);
    const res = await api.post("/api/v1/auth/login", credentials);
    console.log("DEBUG: Auth service - login response:", res.data);
    
    // Tokens are now automatically stored in httpOnly cookies by the backend
    console.log("DEBUG: Auth service - tokens stored in httpOnly cookies");
    return res.data;
  } catch (err) {
    console.error("DEBUG: Auth service - login error:", err);
    console.error("DEBUG: Auth service - error response:", err.response?.data);
    console.error("DEBUG: Auth service - error status:", err.response?.status);
    console.error("DEBUG: Auth service - error message:", err.message);
    
    // Better error handling
    if (err.code === 'ERR_NETWORK' || err.message.includes('ERR_CONNECTION_REFUSED')) {
      throw new Error("Cannot connect to server. Please make sure the backend is running.");
    } else if (err.response?.status === 401) {
      throw new Error(err.response?.data?.error || "Invalid email or password");
    } else if (err.response?.data?.error) {
      throw new Error(err.response.data.error);
    } else {
      throw new Error("Login failed. Please try again.");
    }
  }
}

// No need for manual refreshToken function - handled automatically by the API interceptor
// No need for getRole function - role is returned by the backend in user data

export async function getUser() {
  try {
    const res = await api.get("/api/v1/auth/me");
    return res.data.user;
  } catch (err) {
    throw err.response?.data?.error || "Failed to fetch user";
  }
}