import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, Mock } from 'vitest';
import axios from 'axios';
import CostPackage from '../../src/components/CostPackage';
import { validateStoredToken } from '../../src/utils';
import React from 'react';

vi.mock('axios'); // Mock axios library
vi.mock('../../src/utils', () => ({
  validateStoredToken: vi.fn(),
}));

describe('CostPackage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Loading" state initially', () => {
    (validateStoredToken as Mock).mockResolvedValueOnce(null);

    render(<CostPackage />);

    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('renders "Please Login First" if user is not logged in', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce(null);

    render(<CostPackage />);

    await waitFor(() => {
      expect(screen.getByText('Please Login First')).toBeInTheDocument();
    });
  });

  it('renders the input and submit button if user is logged in', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce({
      id: 1,
      name: 'User',
    });

    render(<CostPackage />);

    await waitFor(() => {
      expect(screen.getByText('Cost of package with id:')).toBeInTheDocument();
      expect(screen.getByTitle('package-id')).toBeInTheDocument();
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });
  });

  it('displays an error message if the package id is empty', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce({
      id: 1,
      name: 'User',
    });

    render(<CostPackage />);

    await waitFor(() => {
      expect(screen.getByText('Cost of package with id:')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    expect(screen.getByText('Please enter a package id')).toBeInTheDocument();
  });

  it('fetches and displays cost data successfully', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce({
      id: 1,
      name: 'User',
    });
    (axios.get as Mock).mockResolvedValueOnce({
      data: {
        '123': {
          standaloneCost: 50,
          totalCost: 100,
        },
      },
    });

    render(<CostPackage />);

    await waitFor(() => {
      expect(screen.getByText('Cost of package with id:')).toBeInTheDocument();
    });

    const input = screen.getByTitle('package-id');
    fireEvent.change(input, { target: { value: '123' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Standalone Cost: 50')).toBeInTheDocument();
      expect(screen.getByText('Total Cost: 100')).toBeInTheDocument();
    });
  });

  it('displays an error if the API response structure is invalid', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce({
      id: 1,
      name: 'User',
    });
    (axios.get as Mock).mockResolvedValueOnce({
      data: {}, // Invalid response structure
    });

    render(<CostPackage />);

    await waitFor(() => {
      expect(screen.getByText('Cost of package with id:')).toBeInTheDocument();
    });

    const input = screen.getByTitle('package-id');
    fireEvent.change(input, { target: { value: '123' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Invalid response structure'),
      ).toBeInTheDocument();
    });
  });

  it('displays an error if the API call fails', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce({
      id: 1,
      name: 'User',
    });
    (axios.get as Mock).mockRejectedValueOnce(new Error('Network Error'));

    render(<CostPackage />);

    await waitFor(() => {
      expect(screen.getByText('Cost of package with id:')).toBeInTheDocument();
    });

    const input = screen.getByTitle('package-id');
    fireEvent.change(input, { target: { value: '123' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch cost data')).toBeInTheDocument();
    });
  });
});
