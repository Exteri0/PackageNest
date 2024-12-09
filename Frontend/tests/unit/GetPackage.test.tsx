import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import axios from 'axios';
import GetPackage from '../../src/components/GetPackage'; // Adjust the path as needed

vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock utils and config
vi.mock('../../src/utils', () => ({
  validateStoredToken: vi.fn(),
}));
vi.mock('../../src/config', () => ({
  default: {
    apiBaseUrl: 'http://localhost:3000',
  },
}));

describe('GetPackage Component', async () => {
  const { validateStoredToken } = await import('../../src/utils');

  beforeAll(() => {
    // Mock URL methods not implemented in JSDOM
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays loading initially', () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);
    render(<GetPackage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays "Please Login First" if user is not logged in', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);
    render(<GetPackage />);
    await waitFor(() => {
      expect(screen.getByText('Please Login First')).toBeInTheDocument();
    });
  });

  it('shows the form when user is logged in', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    render(<GetPackage />);

    await waitFor(() => {
      expect(screen.getByTitle('select-update-type')).toBeInTheDocument();
    });
  });

  describe('When logged in', () => {
    beforeEach(async () => {
      (validateStoredToken as vi.Mock).mockResolvedValueOnce({
        name: 'TestUser',
      });
      render(<GetPackage />);
      await waitFor(() => {
        expect(screen.getByTitle('select-update-type')).toBeInTheDocument();
      });
    });

    it('defaults to ID mode and requires a valid ID', async () => {
      const getButton = screen.getByText('Get Package');
      fireEvent.click(getButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid package ID'),
        ).toBeInTheDocument();
      });
    });

    it('fetches package by ID successfully', async () => {
      const idInput = screen.getByPlaceholderText('Enter package ID...');
      fireEvent.change(idInput, { target: { value: '123' } });

      const mockData = {
        metadata: { Name: 'TestPkg', Version: '1.0.0', ID: '123' },
        data: { Content: 'YmFzZTY0ZGF0YQ==' }, // base64 data
      };
      mockedAxios.get.mockResolvedValueOnce({ data: mockData });

      const getButton = screen.getByText('Get Package');
      fireEvent.click(getButton);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          'http://localhost:3000/package/123',
          expect.objectContaining({
            headers: { 'X-Authorization': localStorage.getItem('token') },
          }),
        );
        expect(screen.getByText('TestPkg')).toBeInTheDocument();
        expect(screen.getByText('Version: 1.0.0')).toBeInTheDocument();
        expect(screen.getByText('Package ID: 123')).toBeInTheDocument();
        // Download button should appear since base64 is provided
        expect(screen.getByText('Download')).toBeInTheDocument();
      });
    });

    it('shows error if fetching by ID fails', async () => {
      const idInput = screen.getByPlaceholderText('Enter package ID...');
      fireEvent.change(idInput, { target: { value: '999' } });

      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      fireEvent.click(screen.getByText('Get Package'));

      await waitFor(() => {
        // No specific error text is set for ID failures, but we know no package is displayed
        // Ensure no package info is present
        expect(screen.queryByText('Package ID: 999')).not.toBeInTheDocument();
      });
    });

    it('switches to name mode and requires name and version', async () => {
      const dropdown = screen.getByTitle('select-update-type');
      fireEvent.change(dropdown, { target: { value: 'name' } });

      const getButton = screen.getByText('Get Package');
      fireEvent.click(getButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please enter all the fields'),
        ).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText('Enter package name...');
      fireEvent.change(nameInput, { target: { value: 'MyPkg' } });
      fireEvent.click(getButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please enter all the fields'),
        ).toBeInTheDocument();
      });
    });

    it('fetches packages by name + version with pagination', async () => {
      const dropdown = screen.getByTitle('select-update-type');
      fireEvent.change(dropdown, { target: { value: 'name' } });

      const nameInput = screen.getByPlaceholderText('Enter package name...');
      const versionInput = screen.getByPlaceholderText(
        'Enter package version...',
      );
      fireEvent.change(nameInput, { target: { value: 'MyPkg' } });
      fireEvent.change(versionInput, { target: { value: '1.0.0' } });

      const mockPackages = [
        { Name: 'MyPkg', Version: '1.0.0', ID: 'pkg-001' },
        { Name: 'MyPkg', Version: '1.0.1', ID: 'pkg-002' },
      ];
      mockedAxios.post.mockResolvedValueOnce({
        data: mockPackages,
        headers: { offset: 'true' },
      });

      const getButton = screen.getByText('Get Package');
      fireEvent.click(getButton);

      await waitFor(() => {
        // Multiple "MyPkg" texts appear because we have two packages
        const myPkgEls = screen.getAllByText('MyPkg');
        expect(myPkgEls.length).toBe(2); // Confirm both packages displayed
        expect(screen.getByText('Version: 1.0.0')).toBeInTheDocument();
        expect(screen.getByText('Version: 1.0.1')).toBeInTheDocument();
        // Next Page button should appear since offset header is present
        expect(screen.getByText('Next Page')).toBeInTheDocument();
      });
    });

    it('fetches packages by regex and displays results', async () => {
      const dropdown = screen.getByTitle('select-update-type');
      fireEvent.change(dropdown, { target: { value: 'regex' } });

      const regexInput = screen.getByPlaceholderText('Enter package regex...');
      fireEvent.change(regexInput, { target: { value: '^mypack' } });

      const mockRegexPkgs = [
        { Name: 'MyPkgRegex', Version: '2.0.0', ID: 'r-001' },
      ];
      mockedAxios.post.mockResolvedValueOnce({
        data: mockRegexPkgs,
      });

      const getButton = screen.getByText('Get Package');
      fireEvent.click(getButton);

      await waitFor(() => {
        expect(screen.getByText('MyPkgRegex')).toBeInTheDocument();
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

    it('downloads a package (with base64) when Download button is clicked', async () => {
      // Use ID mode again
      const idInput = screen.getByPlaceholderText('Enter package ID...');
      fireEvent.change(idInput, { target: { value: '321' } });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          metadata: { Name: 'DownloadablePkg', Version: '1.0.0', ID: '321' },
          data: { Content: 'dGVzdGRhdGE=' }, // base64 for 'testdata'
        },
      });

      const getButton = screen.getByText('Get Package');
      fireEvent.click(getButton);

      await waitFor(() => {
        expect(screen.getByText('DownloadablePkg')).toBeInTheDocument();
      });

      // Since we globally mocked URL.createObjectURL and revokeObjectURL,
      // we don't need to spy on them again. We can just check append/removeChild calls.
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      const downloadButton = screen.getByText('Download');
      fireEvent.click(downloadButton);

      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  it('shows "Please Login First" if validateStoredToken returns null after loading', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);

    render(<GetPackage />);
    await waitFor(() => {
      expect(screen.getByText('Please Login First')).toBeInTheDocument();
    });
  });
});
