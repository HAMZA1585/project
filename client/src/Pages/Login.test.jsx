import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import authReducer, { loginUser } from '../store/slices/authSlice.js';
import Login from './Login.jsx';

// Mock the async thunk
vi.mock('../store/slices/authSlice.js', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    loginUser: vi.fn(() => ({ unwrap: () => Promise.resolve({ user: { username: 'test' }, token: 'abc' }) }))
  };
});

describe('Login Page', () => {
  const setup = () => {
    const store = configureStore({
      reducer: {
        auth: (state = { user: null, token: null, isAuthenticated: false, loading: false, error: null }, action) => state
      }
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>
    );
  };

  it('allows user to type email and password and submit', async () => {
    setup();
    const user = userEvent.setup();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(signInButton);

    expect(loginUser).toHaveBeenCalled();
  });
});
