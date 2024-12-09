import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import axios from 'axios';
import UpdatePackage from '../../src/components/UpdatePackage'; // Adjust path as necessary

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

describe('UpdatePackage Component', async () => {
  const { validateStoredToken } = await import('../../src/utils');

  let originalLocation: Location;

  beforeAll(() => {
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
    render(<UpdatePackage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays "Please Login First" if user is not logged in', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);
    render(<UpdatePackage />);
    await waitFor(() => {
      expect(screen.getByText('Please Login First')).toBeInTheDocument();
    });
  });

  it('shows the main form if user is logged in', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    render(<UpdatePackage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /update package/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getByTitle('package-id')).toBeInTheDocument();
  });

  it('shows error if package ID is empty', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    render(<UpdatePackage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /update package/i }),
      ).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', {
      name: /update package/i,
    });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a package ID.'),
      ).toBeInTheDocument();
    });
  });

  it('shows error if package ID is not a number', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    render(<UpdatePackage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /update package/i }),
      ).toBeInTheDocument();
    });

    const idInput = screen.getByTitle('package-id');
    fireEvent.change(idInput, { target: { value: 'abc' } });

    const updateButton = screen.getByRole('button', {
      name: /update package/i,
    });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid package ID.'),
      ).toBeInTheDocument();
    });
  });

  it('shows error if name or jsProgram is empty', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    render(<UpdatePackage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /update package/i }),
      ).toBeInTheDocument();
    });

    const idInput = screen.getByTitle('package-id');
    fireEvent.change(idInput, { target: { value: '123' } });

    const updateButton = screen.getByRole('button', {
      name: /update package/i,
    });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a package name and JS program.'),
      ).toBeInTheDocument();
    });
  });

  it('shows error if uploadZip selected but no file chosen', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    const { container } = render(<UpdatePackage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /update package/i }),
      ).toBeInTheDocument();
    });

    const idInput = screen.getByTitle('package-id');
    fireEvent.change(idInput, { target: { value: '123' } });

    fireEvent.change(screen.getByPlaceholderText('Enter Package Name'), {
      target: { value: 'testPackage' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter New JS Program'), {
      target: { value: 'console.log("test")' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter New Package Version'), {
      target: { value: '1.0.1' },
    });

    const updateButton = screen.getByRole('button', {
      name: /update package/i,
    });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(
        screen.getByText('Please select a file to upload.'),
      ).toBeInTheDocument();
    });
  });

  it('shows error if uploadGithub selected but URL is empty', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    render(<UpdatePackage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /update package/i }),
      ).toBeInTheDocument();
    });

    const methodSelect = screen.getByTitle('select-upload-method');
    fireEvent.change(methodSelect, { target: { value: 'uploadGithub' } });

    const idInput = screen.getByTitle('package-id');
    fireEvent.change(idInput, { target: { value: '123' } });

    fireEvent.change(screen.getByPlaceholderText('Enter Package Name'), {
      target: { value: 'testPackage' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter New JS Program'), {
      target: { value: 'console.log("test")' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter New Package Version'), {
      target: { value: '1.0.1' },
    });

    const updateButton = screen.getByRole('button', {
      name: /update package/i,
    });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a URL.')).toBeInTheDocument();
    });
  });

  it('shows error if uploadGithub URL is invalid', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    render(<UpdatePackage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /update package/i }),
      ).toBeInTheDocument();
    });

    const methodSelect = screen.getByTitle('select-upload-method');
    fireEvent.change(methodSelect, { target: { value: 'uploadGithub' } });

    const idInput = screen.getByTitle('package-id');
    fireEvent.change(idInput, { target: { value: '123' } });

    fireEvent.change(screen.getByPlaceholderText('Enter Package Name'), {
      target: { value: 'testPackage' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter New JS Program'), {
      target: { value: 'console.log("test")' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter New Package Version'), {
      target: { value: '1.0.1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter GitHub or NPM URL'), {
      target: { value: 'http://invalidurl.com' },
    });

    const updateButton = screen.getByRole('button', {
      name: /update package/i,
    });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid GitHub or NPM URL.'),
      ).toBeInTheDocument();
    });
  });

  it('successful upload with zip file', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: { message: 'Success' },
    });

    const { container } = render(<UpdatePackage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /update package/i }),
      ).toBeInTheDocument();
    });

    // Fill in required fields
    fireEvent.change(screen.getByTitle('package-id'), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter Package Name'), {
      target: { value: 'testPackage' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter New JS Program'), {
      target: { value: 'console.log("test")' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter New Package Version'), {
      target: { value: '1.0.1' },
    });

    // Simulate choosing a file
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(['filecontent'], 'test.zip', {
      type: 'application/zip',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const updateButton = screen.getByRole('button', {
      name: /update package/i,
    });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(
        screen.getByText('File uploaded successfully!'),
      ).toBeInTheDocument();
    });
  });

  it('failed upload shows error', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    mockedAxios.post.mockRejectedValueOnce({ response: { status: 500 } });

    const { container } = render(<UpdatePackage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /update package/i }),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTitle('package-id'), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter Package Name'), {
      target: { value: 'testPackage' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter New JS Program'), {
      target: { value: 'console.log("test")' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter New Package Version'), {
      target: { value: '1.0.1' },
    });

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(['filecontent'], 'test.zip', {
      type: 'application/zip',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const updateButton = screen.getByRole('button', {
      name: /update package/i,
    });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to update package.')).toBeInTheDocument();
    });
  });

  it('upload from GitHub URL fails with a 400', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });
    mockedAxios.post.mockRejectedValueOnce({ response: { status: 400 } });

    render(<UpdatePackage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /update package/i }),
      ).toBeInTheDocument();
    });

    const methodSelect = screen.getByTitle('select-upload-method');
    fireEvent.change(methodSelect, { target: { value: 'uploadGithub' } });

    fireEvent.change(screen.getByTitle('package-id'), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter Package Name'), {
      target: { value: 'testPackage' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter New JS Program'), {
      target: { value: 'console.log("test")' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter New Package Version'), {
      target: { value: '1.0.1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter GitHub or NPM URL'), {
      target: { value: 'https://github.com/user/repo' },
    });

    const updateButton = screen.getByRole('button', {
      name: /update package/i,
    });
    fireEvent.click(updateButton);

    // The actual error message is multiline, let's match a distinctive part of it
    await waitFor(() => {
      // Partial match with a regex
      expect(
        screen.getByText(/Failed to upload file, reason for this may be:/i),
      ).toBeInTheDocument();
    });
  });
});
