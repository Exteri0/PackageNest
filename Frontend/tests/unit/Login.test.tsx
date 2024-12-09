import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import axios from 'axios';
import Login from '../../src/components/Login'; // Adjust path as necessary

vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock utils
vi.mock('../../src/utils', () => ({
  validateStoredToken: vi.fn(),
  storeToken: vi.fn(),
}));

// Mock config
vi.mock('../../src/config', () => ({
  default: {
    apiBaseUrl: 'http://localhost:3000',
  },
}));

describe('Login Component', async () => {
  const { validateStoredToken, storeToken } = await import('../../src/utils');

  let originalLocation: Location;

  beforeAll(() => {
    // Save the original location
    originalLocation = window.location;
    // Delete the original location
    delete (window as any).location;
    // Redefine with a mockable reload method
    window.location = {
      ...originalLocation,
      reload: vi.fn(),
    } as unknown as Location;
  });

  afterAll(() => {
    // Restore the original location
    window.location = originalLocation;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls validateStoredToken on mount', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);
    render(<Login />);
    await waitFor(() => {
      expect(validateStoredToken).toHaveBeenCalled();
    });
  });

  it('shows an error if username or password is empty', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);
    render(<Login />);

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Please fill out all fields'),
      ).toBeInTheDocument();
    });
  });

  it('shows error if username or password are numeric only', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);
    render(<Login />);

    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByText('Submit');

    // Numeric only username
    fireEvent.change(usernameInput, { target: { value: '12345' } });
    fireEvent.change(passwordInput, { target: { value: 'validPassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Name and password cannot be just numbers'),
      ).toBeInTheDocument();
    });

    // Numeric only password
    fireEvent.change(usernameInput, { target: { value: 'validUser' } });
    fireEvent.change(passwordInput, { target: { value: '99999' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Name and password cannot be just numbers'),
      ).toBeInTheDocument();
    });
  });

  it('shows "Submitting" and then success message on successful login', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);
    mockedAxios.put.mockResolvedValueOnce({ data: 'mockToken' });

    render(<Login />);

    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByText('Submit');

    fireEvent.change(usernameInput, { target: { value: 'validUser' } });
    fireEvent.change(passwordInput, { target: { value: 'validPass' } });
    fireEvent.click(submitButton);

    // Check for "Submitting"
    await waitFor(() => {
      expect(screen.getByText('Submitting')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        'http://localhost:3000/authenticate',
        {
          User: { name: 'validUser', isAdmin: false },
          Secret: { password: 'validPass' },
        },
      );
      expect(screen.getByText('Logged in successfully')).toBeInTheDocument();
      expect(storeToken).toHaveBeenCalledWith('mockToken');
      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error message on failed login', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);
    mockedAxios.put.mockRejectedValueOnce(new Error('Login error'));

    render(<Login />);

    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByText('Submit');

    fireEvent.change(usernameInput, { target: { value: 'validUser' } });
    fireEvent.change(passwordInput, { target: { value: 'validPass' } });
    fireEvent.click(submitButton);

    // Initially "Submitting"
    await waitFor(() => {
      expect(screen.getByText('Submitting')).toBeInTheDocument();
    });

    // Then fails
    await waitFor(() => {
      expect(screen.getByText('Failed to login')).toBeInTheDocument();
      expect(storeToken).not.toHaveBeenCalled();
      expect(window.location.reload).not.toHaveBeenCalled();
    });
  });
});
