import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import axios from 'axios';
import UploadPackage from '../../src/components/UploadPackage'; // Adjust path if necessary

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

describe('UploadPackage Component', async () => {
  const { validateStoredToken } = await import('../../src/utils');

  let originalLocation: Location;

  beforeAll(() => {
    // Mock window.location.reload if needed
    originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      reload: vi.fn(),
    } as unknown as Location;
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays "Loading..." initially', () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);
    render(<UploadPackage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays "Please Login First" if user is not logged in', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);
    render(<UploadPackage />);
    await waitFor(() => {
      expect(screen.getByText('Please Login First')).toBeInTheDocument();
    });
  });

  it('shows the upload form if user is logged in', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    render(<UploadPackage />);

    await waitFor(() => {
      // Wait until logged in
      expect(screen.getByTitle('select-upload-method')).toBeInTheDocument();
    });
  });

  it('shows error if zip upload chosen but no file selected', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    const { container } = render(<UploadPackage />);

    await waitFor(() => {
      expect(screen.getByTitle('select-upload-method')).toBeInTheDocument();
    });

    // Zip upload is default
    // Fill name and jsProgram so it doesn't fail on that
    fireEvent.change(screen.getByPlaceholderText('Enter Package Name'), {
      target: { value: 'testPackage' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter JS Program'), {
      target: { value: 'console.log("test")' },
    });

    const uploadButton = screen.getByRole('button', {
      name: /upload package/i,
    });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(
        screen.getByText('Please select a file to upload.'),
      ).toBeInTheDocument();
    });
  });

  it('shows error if zip upload chosen but name or jsProgram is empty', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    const { container } = render(<UploadPackage />);

    await waitFor(() => {
      expect(screen.getByTitle('select-upload-method')).toBeInTheDocument();
    });

    // Simulate choosing a file
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(['filecontent'], 'test.zip', {
      type: 'application/zip',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Don't fill name or jsProgram
    const uploadButton = screen.getByRole('button', {
      name: /upload package/i,
    });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a package name and JS program.'),
      ).toBeInTheDocument();
    });
  });

  it('shows error if GitHub URL upload chosen but URL is empty', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    render(<UploadPackage />);

    await waitFor(() => {
      expect(screen.getByTitle('select-upload-method')).toBeInTheDocument();
    });

    const methodSelect = screen.getByTitle('select-upload-method');
    fireEvent.change(methodSelect, { target: { value: 'uploadGithub' } });

    const uploadButton = screen.getByRole('button', {
      name: /upload package/i,
    });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a URL.')).toBeInTheDocument();
    });
  });

  it('shows error if GitHub URL upload chosen but URL is invalid', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    render(<UploadPackage />);

    await waitFor(() => {
      expect(screen.getByTitle('select-upload-method')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTitle('select-upload-method'), {
      target: { value: 'uploadGithub' },
    });

    fireEvent.change(screen.getByPlaceholderText('Enter GitHub URL'), {
      target: { value: 'http://invalid.com' },
    });

    const uploadButton = screen.getByRole('button', {
      name: /upload package/i,
    });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid GitHub or NPM URL.'),
      ).toBeInTheDocument();
    });
  });

  it('successfully uploads a zip file', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });

    const { container } = render(<UploadPackage />);

    await waitFor(() => {
      expect(screen.getByTitle('select-upload-method')).toBeInTheDocument();
    });

    // Fill data
    fireEvent.change(screen.getByPlaceholderText('Enter Package Name'), {
      target: { value: 'testPackage' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter JS Program'), {
      target: { value: 'console.log("test")' },
    });

    // Choose a file
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(['filecontent'], 'test.zip', {
      type: 'application/zip',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadButton = screen.getByRole('button', {
      name: /upload package/i,
    });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(
        screen.getByText('File uploaded successfully!'),
      ).toBeInTheDocument();
    });
  });

  it('fails to upload a zip file', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    mockedAxios.post.mockRejectedValueOnce(new Error('Upload error'));

    const { container } = render(<UploadPackage />);

    await waitFor(() => {
      expect(screen.getByTitle('select-upload-method')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Enter Package Name'), {
      target: { value: 'testPackage' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter JS Program'), {
      target: { value: 'console.log("test")' },
    });

    // Choose a file
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(['filecontent'], 'test.zip', {
      type: 'application/zip',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadButton = screen.getByRole('button', {
      name: /upload package/i,
    });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to upload file.')).toBeInTheDocument();
    });
  });

  it('successfully uploads via GitHub URL', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });

    render(<UploadPackage />);

    await waitFor(() => {
      expect(screen.getByTitle('select-upload-method')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTitle('select-upload-method'), {
      target: { value: 'uploadGithub' },
    });

    fireEvent.change(screen.getByPlaceholderText('Enter GitHub URL'), {
      target: { value: 'https://github.com/user/repo' },
    });

    const uploadButton = screen.getByRole('button', {
      name: /upload package/i,
    });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(
        screen.getByText('File uploaded successfully!'),
      ).toBeInTheDocument();
    });
  });

  it('fails to upload via GitHub URL', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    mockedAxios.post.mockRejectedValueOnce(new Error('Upload error'));

    render(<UploadPackage />);

    await waitFor(() => {
      expect(screen.getByTitle('select-upload-method')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTitle('select-upload-method'), {
      target: { value: 'uploadGithub' },
    });

    fireEvent.change(screen.getByPlaceholderText('Enter GitHub URL'), {
      target: { value: 'https://github.com/user/repo' },
    });

    const uploadButton = screen.getByRole('button', {
      name: /upload package/i,
    });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to upload file.')).toBeInTheDocument();
    });
  });
});
