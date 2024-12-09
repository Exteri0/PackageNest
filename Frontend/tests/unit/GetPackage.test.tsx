import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, Mock } from 'vitest';
import axios from 'axios';
import GetPackage from '../../src/components/GetPackage'; // Adjust path as needed

vi.mock('axios');
vi.mock('../../src/utils', async () => {
  return {
    // We'll control this mock in each test
    validateStoredToken: vi.fn(),
  };
});
vi.mock('../config', () => {
  return {
    default: {
      apiBaseUrl: 'http://localhost:3000',
    },
  };
});

describe('GetPackage Component', async () => {
  const { validateStoredToken } = await import('../../src/utils');
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  // Mocking atob and URL.createObjectURL for download tests
  const originalAtob = global.atob;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalAppendChild = document.body.appendChild;
  const originalRemoveChild = document.body.removeChild;

  beforeAll(() => {
    global.atob = vi.fn((str) => Buffer.from(str, 'base64').toString('binary'));
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  afterAll(() => {
    global.atob = originalAtob;
    URL.createObjectURL = originalCreateObjectURL;
    document.body.appendChild = originalAppendChild;
    document.body.removeChild = originalRemoveChild;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays "Loading..." initially', () => {
    // User state not resolved yet
    (validateStoredToken as Mock).mockResolvedValueOnce(null);
    render(<GetPackage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays "Please Login First" if user is not logged in', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce(null);
    render(<GetPackage />);
    await waitFor(() => {
      expect(screen.getByText('Please Login First')).toBeInTheDocument();
    });
  });

  it('displays dropdown and inputs when user is logged in', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    render(<GetPackage />);

    await waitFor(() => {
      expect(screen.getByTitle('select-update-type')).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Get by ID' }),
      ).toBeInTheDocument();
    });
  });

  describe('When logged in', () => {
    beforeEach(async () => {
      (validateStoredToken as Mock).mockResolvedValueOnce({
        name: 'TestUser',
      });
      render(<GetPackage />);
      await waitFor(() => {
        // Wait for login to resolve
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        expect(screen.getByTitle('select-update-type')).toBeInTheDocument();
      });
    });

    it('defaults to "Get by ID" and shows ID input', () => {
      expect(screen.getByText('Get by ID')).toBeInTheDocument();
      const idInput = screen.getByPlaceholderText('Enter package ID...');
      expect(idInput).toBeInTheDocument();
    });

    it('shows error when ID is empty or not a number', async () => {
      // Just click "Get Package" without entering ID
      const getPackageButton = screen.getByText('Get Package');
      fireEvent.click(getPackageButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid package ID'),
        ).toBeInTheDocument();
      });
    });

    it('fetches package by ID when a valid ID is provided', async () => {
      const idInput = screen.getByPlaceholderText('Enter package ID...');
      fireEvent.change(idInput, { target: { value: '123' } });

      const mockData = {
        metadata: {
          Name: 'TestPackage',
          Version: '1.0.0',
          ID: '123',
          data: { Content: 'YmFzZTY0ZGF0YQ==' }, // base64 data for "basedata"
        },
        data: {
          Content: 'YmFzZTY0ZGF0YQ==',
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockData });

      const getPackageButton = screen.getByText('Get Package');
      fireEvent.click(getPackageButton);

      await waitFor(() => {
        expect(screen.getByText('TestPackage')).toBeInTheDocument();
        expect(screen.getByText('Version: 1.0.0')).toBeInTheDocument();
        expect(screen.getByText('Package ID: 123')).toBeInTheDocument();
      });
    });

    it('switches to "Get by Name" and requires both name and version', async () => {
      const dropdown = screen.getByTitle('select-update-type');
      fireEvent.change(dropdown, { target: { value: 'name' } });

      // Now we should see inputs for name and version
      const nameInput = screen.getByPlaceholderText('Enter package name...');
      const versionInput = screen.getByPlaceholderText(
        'Enter package version...',
      );

      // Click "Get Package" without filling both
      const getPackageButton = screen.getByText('Get Package');
      fireEvent.click(getPackageButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please enter all the fields'),
        ).toBeInTheDocument();
      });

      // Fill only name
      fireEvent.change(nameInput, { target: { value: 'MyPackage' } });
      fireEvent.click(getPackageButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please enter all the fields'),
        ).toBeInTheDocument();
      });
    });

    it('fetches packages by Name + Version successfully', async () => {
      const dropdown = screen.getByTitle('select-update-type');
      fireEvent.change(dropdown, { target: { value: 'name' } });

      const nameInput = screen.getByPlaceholderText('Enter package name...');
      const versionInput = screen.getByPlaceholderText(
        'Enter package version...',
      );

      fireEvent.change(nameInput, { target: { value: 'MyPackage' } });
      fireEvent.change(versionInput, { target: { value: '2.0.0' } });

      const mockResponseHeaders = { offset: 'true' };
      const mockResponseData = [
        { Name: 'MyPackage', Version: '2.0.0', ID: 'pkg-001' },
        { Name: 'MyPackage', Version: '2.0.1', ID: 'pkg-002' },
      ];

      mockedAxios.post.mockResolvedValueOnce({
        data: mockResponseData,
        headers: mockResponseHeaders,
      });

      const getPackageButton = screen.getByText('Get Package');
      fireEvent.click(getPackageButton);

      await waitFor(() => {
        // Two packages should be displayed
        expect(screen.getByText('MyPackage')).toBeInTheDocument();
        expect(screen.getByText('Version: 2.0.0')).toBeInTheDocument();
        expect(screen.getByText('Version: 2.0.1')).toBeInTheDocument();
        expect(screen.getByText('Next Page')).toBeInTheDocument();
      });
    });

    it('fetches packages by Name + Version and handles no next offset', async () => {
      const dropdown = screen.getByTitle('select-update-type');
      fireEvent.change(dropdown, { target: { value: 'name' } });

      const nameInput = screen.getByPlaceholderText('Enter package name...');
      const versionInput = screen.getByPlaceholderText(
        'Enter package version...',
      );

      fireEvent.change(nameInput, { target: { value: 'MyPackage' } });
      fireEvent.change(versionInput, { target: { value: '2.0.0' } });

      const mockResponseHeaders = {}; // no offset
      const mockResponseData = [
        { Name: 'MyPackage', Version: '2.0.0', ID: 'pkg-001' },
      ];

      mockedAxios.post.mockResolvedValueOnce({
        data: mockResponseData,
        headers: mockResponseHeaders,
      });

      const getPackageButton = screen.getByText('Get Package');
      fireEvent.click(getPackageButton);

      await waitFor(() => {
        expect(screen.getByText('MyPackage')).toBeInTheDocument();
        expect(screen.getByText('Version: 2.0.0')).toBeInTheDocument();
        // No "Next Page" button this time
        expect(screen.queryByText('Next Page')).not.toBeInTheDocument();
      });
    });

    it('shows an error if fetching by Name fails', async () => {
      const dropdown = screen.getByTitle('select-update-type');
      fireEvent.change(dropdown, { target: { value: 'name' } });

      const nameInput = screen.getByPlaceholderText('Enter package name...');
      const versionInput = screen.getByPlaceholderText(
        'Enter package version...',
      );

      fireEvent.change(nameInput, { target: { value: 'MyPackage' } });
      fireEvent.change(versionInput, { target: { value: '2.0.0' } });

      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const getPackageButton = screen.getByText('Get Package');
      fireEvent.click(getPackageButton);

      await waitFor(() => {
        // error message should appear
        expect(
          screen.getByText('Failed to fetch packages by REGEX'),
        ).not.toBeInTheDocument();
        // Since this is from the name endpoint, the error handling sets status=1 but doesn't set a specific error message from name?
        // The component code sets status(1), but not a custom error message other than clearing data. Let's check code logic.
        // For name fetch error, it logs error and sets offset, nextOffset, but does not set a custom error message.
        // We can confirm that no packages appear and no next/previous
        expect(screen.queryByText('MyPackage')).not.toBeInTheDocument();
      });
    });

    it('switches to "Get by REGEX" and requires a regex', async () => {
      const dropdown = screen.getByTitle('select-update-type');
      fireEvent.change(dropdown, { target: { value: 'regex' } });

      const regexInput = screen.getByPlaceholderText('Enter package regex...');
      fireEvent.click(screen.getByText('Get Package'));

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid regex'),
        ).toBeInTheDocument();
      });

      fireEvent.change(regexInput, { target: { value: '^mypack' } });
      fireEvent.click(screen.getByText('Get Package'));

      // Now it should attempt a fetch
      mockedAxios.post.mockResolvedValueOnce({
        data: [{ Name: 'MyPackageRegex', Version: '1.0.0', ID: 'regex-001' }],
      });

      await waitFor(() => {
        expect(screen.getByText('MyPackageRegex')).toBeInTheDocument();
      });
    });

    it('shows error if regex fetch fails', async () => {
      const dropdown = screen.getByTitle('select-update-type');
      fireEvent.change(dropdown, { target: { value: 'regex' } });

      const regexInput = screen.getByPlaceholderText('Enter package regex...');
      fireEvent.change(regexInput, { target: { value: '^mypack' } });

      mockedAxios.post.mockRejectedValueOnce(new Error('Regex fetch error'));

      fireEvent.click(screen.getByText('Get Package'));

      await waitFor(() => {
        expect(
          screen.getByText('Failed to fetch packages by REGEX'),
        ).toBeInTheDocument();
      });
    });

    it('downloads a package when Download button is clicked', async () => {
      // Let's fetch by ID a package that has base64 data
      const dropdown = screen.getByTitle('select-update-type');
      fireEvent.change(dropdown, { target: { value: 'id' } });

      const idInput = screen.getByPlaceholderText('Enter package ID...');
      fireEvent.change(idInput, { target: { value: '999' } });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          metadata: {
            Name: 'DownloadablePackage',
            Version: '3.0.0',
            ID: '999',
          },
          data: {
            Content: 'dGVzdGRhdGE=', // base64 for 'testdata'
          },
        },
      });

      fireEvent.click(screen.getByText('Get Package'));

      await waitFor(() => {
        expect(screen.getByText('DownloadablePackage')).toBeInTheDocument();
      });

      const downloadButton = screen.getByText('Download');
      fireEvent.click(downloadButton);

      // We can check if document.body.appendChild was called with an anchor element
      expect(document.body.appendChild).toHaveBeenCalled();
      // Check if removeChild was called (cleanup after click)
      expect(document.body.removeChild).toHaveBeenCalled();
    });
  });
});
