import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import axios from 'axios';
import RatePackage from '../../src/components/RatePackage'; // Adjust path if needed

// Mocking axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mocking utils and config
vi.mock('../../src/utils', () => ({
  validateStoredToken: vi.fn(),
}));

vi.mock('../../src/config', () => ({
  default: {
    apiBaseUrl: 'http://localhost:3000',
  },
}));

describe('RatePackage Component', async () => {
  const { validateStoredToken } = await import('../../src/utils');

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('displays "Loading" initially', () => {
    // Before validateStoredToken resolves, isLoggedIn = 0
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null); // Will resolve eventually
    render(<RatePackage />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('displays "Please Login First" when user is not logged in', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);
    render(<RatePackage />);

    await waitFor(() => {
      expect(screen.getByText('Please Login First')).toBeInTheDocument();
    });
  });

  it('displays the rating form when user is logged in', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    render(<RatePackage />);

    await waitFor(() => {
      expect(screen.getByText('Rate Package')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Enter Package ID'),
      ).toBeInTheDocument();
      expect(screen.getByText('Get Package Rating')).toBeInTheDocument();
    });
  });

  it('shows an error if package ID is empty and submit is clicked', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    render(<RatePackage />);

    await waitFor(() => {
      expect(screen.getByText('Get Package Rating')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Get Package Rating');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a package ID')).toBeInTheDocument();
    });
  });

  it('fetches and displays package rating successfully', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        BusFactor: 0.5,
        BusFactorLatency: 30,
        Correctness: 0.8,
        CorrectnessLatency: 40,
        RampUp: 0.7,
        RampUpLatency: 50,
        ResponsiveMaintainer: 0.9,
        ResponsiveMaintainerLatency: 60,
        LicenseScore: 1.0,
        LicenseScoreLatency: 10,
        GoodPinningPractice: 0.6,
        GoodPinningPracticeLatency: 20,
        PullRequest: 0.4,
        PullRequestLatency: 70,
        NetScore: 0.75,
        NetScoreLatency: 5,
      },
    });

    render(<RatePackage />);

    await waitFor(() => {
      expect(screen.getByText('Rate Package')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Enter Package ID');
    fireEvent.change(input, { target: { value: '123' } });

    const submitButton = screen.getByText('Get Package Rating');
    fireEvent.click(submitButton);

    // Initially shows "Fetching package rating..." message but as status[0] = 0 with that message,
    // we rely on no error message present and the fields appear after fetch
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3000/package/123/rate',
        expect.objectContaining({
          headers: {
            'X-Authorization': localStorage.getItem('token'),
          },
        }),
      );
    });

    // Check if a few rating fields appear after fetch
    await waitFor(() => {
      expect(
        screen.queryByText('Please enter a package ID'),
      ).not.toBeInTheDocument();
      expect(screen.getByText('BusFactor:')).toBeInTheDocument();
      expect(screen.getByText('0.5')).toBeInTheDocument();
      expect(screen.getByText('NetScore:')).toBeInTheDocument();
      expect(screen.getByText('0.75')).toBeInTheDocument();
    });
  });

  it('handles failed rating fetch', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

    render(<RatePackage />);

    await waitFor(() => {
      expect(screen.getByText('Rate Package')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Enter Package ID');
    fireEvent.change(input, { target: { value: '999' } });

    const submitButton = screen.getByText('Get Package Rating');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3000/package/999/rate',
        expect.any(Object),
      );
      expect(
        screen.getByText('Failed to fetch package rating'),
      ).toBeInTheDocument();
    });
  });
});
