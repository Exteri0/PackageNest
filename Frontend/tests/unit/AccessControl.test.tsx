import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { vi } from 'vitest';
import Tracks from '../../src/components/Tracks';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import '@testing-library/jest-dom';
import '@testing-library/react';

vi.mock('axios'); // Mock the axios library
vi.mock('../../src/config', () => ({
  default: {
    apiBaseUrl: 'https://mpnapi.xyz', // Mocked API base URL
  },
}));

describe('Tracks Component', () => {
  afterEach(() => {
    vi.restoreAllMocks(); // Reset mocks after each test
  });

  it('displays "Loading..." initially', () => {
    vi.spyOn(axios, 'get').mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: {} }), 10000),
        ),
    );
    render(<Tracks />);
    expect(screen.queryByText(/Loading.../)).toBeInTheDocument();
    expect(
      screen.queryByText(/Failed to fetch track data/),
    ).not.toBeInTheDocument();
  });

  it('displays the track data when API call is successful', async () => {
    vi.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { plannedTracks: 'Access Control Track' },
    });

    render(<Tracks />);

    await waitFor(() => {
      expect(
        screen.getByText('Our track is Access Control Track'),
      ).toBeInTheDocument();
    });
  });

  it('displays an error message when the API call fails', async () => {
    vi.spyOn(axios, 'get').mockRejectedValueOnce(new Error('API error'));

    render(<Tracks />);

    await waitFor(() => {
      expect(
        screen.getByText('Failed to fetch track data'),
      ).toBeInTheDocument();
    });
  });
});
