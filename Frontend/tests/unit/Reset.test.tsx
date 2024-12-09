import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import axios from 'axios';
import Reset from '../../src/components/Reset'; // Adjust the path as necessary

vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

vi.mock('../../src/utils', () => ({
  validateStoredToken: vi.fn(),
}));

vi.mock('../../src/config', () => ({
  default: {
    apiBaseUrl: 'http://localhost:3000',
  },
}));

describe('Reset Component', async () => {
  const { validateStoredToken } = await import('../../src/utils');

  let originalLocation: Location;

  beforeAll(() => {
    // Store original location
    originalLocation = window.location;

    // Remove the read-only location property
    delete (window as any).location;

    // Define a new location with a mockable reload
    window.location = {
      ...originalLocation,
      reload: vi.fn(),
    } as unknown as Location;
  });

  afterAll(() => {
    // Restore the original location after tests
    window.location = originalLocation;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays "Loading" initially', () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);
    render(<Reset />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('displays "Please Login First" if user is not logged in', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);
    render(<Reset />);
    await waitFor(() => {
      expect(screen.getByText('Please Login First')).toBeInTheDocument();
    });
  });

  it('displays reset button when user is logged in', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    render(<Reset />);
    await waitFor(() => {
      expect(
        screen.getByText('Do you want to reset Database?'),
      ).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });
  });

  it('shows an error message if reset fails', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    mockedAxios.delete.mockRejectedValueOnce(new Error('Network error'));

    render(<Reset />);
    await waitFor(() => {
      expect(
        screen.getByText('Do you want to reset Database?'),
      ).toBeInTheDocument();
    });

    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        'http://localhost:3000/reset',
        expect.objectContaining({
          headers: { 'X-Authorization': localStorage.getItem('token') },
        }),
      );
      expect(
        screen.getByText('An error happened, please check console'),
      ).toBeInTheDocument();
    });
  });

  it('shows success message and reloads the page after successful reset', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    mockedAxios.delete.mockResolvedValueOnce({ status: 200, data: {} });

    render(<Reset />);
    await waitFor(() => {
      expect(
        screen.getByText('Do you want to reset Database?'),
      ).toBeInTheDocument();
    });

    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        'http://localhost:3000/reset',
        expect.objectContaining({
          headers: { 'X-Authorization': localStorage.getItem('token') },
        }),
      );
      expect(screen.getByText('DB IS RESET SUCCESSFULLY')).toBeInTheDocument();
    });

    vi.useFakeTimers();
    vi.runAllTimers();
    vi.useRealTimers();

    expect(window.location.reload).toHaveBeenCalledTimes(0);
  });

  it('handles non-200 responses as errors', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    mockedAxios.delete.mockResolvedValueOnce({ status: 500, data: {} });

    render(<Reset />);
    await waitFor(() => {
      expect(
        screen.getByText('Do you want to reset Database?'),
      ).toBeInTheDocument();
    });

    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(
        screen.getByText('An error happened, please check console'),
      ).toBeInTheDocument();
    });
  });
});
