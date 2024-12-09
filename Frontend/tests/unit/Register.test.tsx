import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, Mock } from 'vitest';
import axios from 'axios';
import Regsiter from '../../src/components/Register'; // Adjust path based on your structure

// Mocking the utils module
vi.mock('../../src/utils', async () => {
  return {
    // We'll control this mock in each test
    validateStoredToken: vi.fn(),
  };
});

// Mocking the config
vi.mock('../config', () => {
  return {
    default: {
      apiBaseUrl: 'http://localhost:3000',
    },
  };
});

// Since we're going to test behavior related to axios
// we mock axios to control responses
vi.mock('axios');

describe('Regsiter Component', async () => {
  const { validateStoredToken } = await import('../../src/utils'); // Get the mocked function

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('displays "Loading..." initially', () => {
    // validateStoredToken pending or not resolved yet means isLoggedIn is still 0
    // Actually, isLoggedIn is 0 at mount and changes after the effect runs.
    // We'll just render and check the loading state before it resolves:
    render(<Regsiter />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays "User is not logged in" if validateStoredToken returns falsy', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce(null);

    render(<Regsiter />);

    // Wait for the component to re-render after the useEffect
    await waitFor(() => {
      expect(screen.getByText('User is not logged in')).toBeInTheDocument();
    });
  });

  it('displays registration form if user is logged in', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });

    render(<Regsiter />);

    await waitFor(() => {
      expect(screen.getByText('Register users')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Submit' }),
      ).toBeInTheDocument();
    });
  });

  it('shows an error if name or password fields are empty', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });

    render(<Regsiter />);

    // Wait for the form to be displayed
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    });

    // Both fields are empty by default
    // Click submit
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Please fill out all fields'),
      ).toBeInTheDocument();
    });
  });

  it('shows an error if name or password are numeric-only', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });

    render(<Regsiter />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Name');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    fireEvent.change(nameInput, { target: { value: '12345' } });
    fireEvent.change(passwordInput, { target: { value: 'somePass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Name and password cannot be just numbers'),
      ).toBeInTheDocument();
    });

    // Now try a numeric-only password
    fireEvent.change(nameInput, { target: { value: 'ValidName' } });
    fireEvent.change(passwordInput, { target: { value: '99999' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Name and password cannot be just numbers'),
      ).toBeInTheDocument();
    });
  });

  it('submits and shows success message when registration succeeds', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });

    // Mock a successful axios post
    (axios.post as Mock).mockResolvedValueOnce({
      data: { message: 'User registered successfully' },
    });

    render(<Regsiter />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Name');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    // Fill valid data
    fireEvent.change(nameInput, { target: { value: 'TestUser123' } });
    fireEvent.change(passwordInput, { target: { value: 'secretPass' } });

    fireEvent.click(submitButton);

    // Expect interim message "Submitting user..." then success
    await waitFor(() => {
      expect(screen.getByText('Submitting user...')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText('Successfully registered user'),
      ).toBeInTheDocument();
    });
  });

  it('submits and shows error message when registration fails', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });

    // Mock a failed axios post
    (axios.post as Mock).mockRejectedValueOnce(new Error('API Error'));

    render(<Regsiter />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Name');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    fireEvent.change(nameInput, { target: { value: 'TestUserValid' } });
    fireEvent.change(passwordInput, { target: { value: 'secretPass' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Submitting user...')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to register user')).toBeInTheDocument();
    });
  });

  it('toggles isAdmin and isBackend switches', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });

    render(<Regsiter />);

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    const adminSwitch = screen.getByTitle('set-admin');
    const backendSwitch = screen.getByTitle('set-backend');

    expect(adminSwitch).not.toBeChecked();
    expect(backendSwitch).not.toBeChecked();

    fireEvent.click(adminSwitch);
    fireEvent.click(backendSwitch);

    // After toggling, they should now be checked
    // Note: Since these are antd Switch components, ensure
    // checked states reflect after fireEvent.click.
    expect(adminSwitch).toBeChecked();
    expect(backendSwitch).toBeChecked();
  });
});
