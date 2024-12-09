import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import axios from 'axios';
import DeleteUser from '../../src/components/DeleteUser'; // Adjust path if necessary

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

describe('DeleteUser Component', async () => {
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

  it('displays "Loading" initially', () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);
    render(<DeleteUser />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('displays "Please Login First" if user is not logged in', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);
    render(<DeleteUser />);
    await waitFor(() => {
      expect(screen.getByText('Please Login First')).toBeInTheDocument();
    });
  });

  it('displays option to delete profile if user is logged in but not admin', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'normalUser',
      isAdmin: false,
    });
    render(<DeleteUser />);

    await waitFor(() => {
      expect(
        screen.getByText('Do you want to delete your profile?'),
      ).toBeInTheDocument();
      expect(screen.getByText('Delete Account')).toBeInTheDocument();
    });
  });

  it('displays admin options when user is logged in as admin', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'adminUser',
      isAdmin: true,
    });

    render(<DeleteUser />);

    await waitFor(() => {
      expect(
        screen.getByText('You are authorized to delete users'),
      ).toBeInTheDocument();
      expect(screen.getByText('Get Users')).toBeInTheDocument();
    });
  });

  it('shows error if trying to delete default admin user (self)', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'ece30861defaultadminuser',
      isAdmin: false,
    });

    render(<DeleteUser />);

    await waitFor(() => {
      expect(
        screen.getByText('Do you want to delete your profile?'),
      ).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete Account');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(
        screen.getByText('Cannot delete default admin user'),
      ).toBeInTheDocument();
    });
  });

  it('successfully deletes user (non-admin self) and reloads', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'normalUser',
      isAdmin: false,
    });

    mockedAxios.delete.mockResolvedValueOnce({ status: 200 });

    render(<DeleteUser />);

    await waitFor(() => {
      expect(
        screen.getByText('Do you want to delete your profile?'),
      ).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete Account');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        'http://localhost:3000/deleteSelf',
        expect.objectContaining({
          headers: { 'X-Authorization': localStorage.getItem('token') },
        }),
      );
      expect(screen.getByText('User deleted successfully')).toBeInTheDocument();
      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error if failed to delete self (non-admin)', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'normalUser',
      isAdmin: false,
    });

    mockedAxios.delete.mockRejectedValueOnce(new Error('Network error'));

    render(<DeleteUser />);

    await waitFor(() => {
      expect(
        screen.getByText('Do you want to delete your profile?'),
      ).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete Account');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to delete user')).toBeInTheDocument();
      expect(window.location.reload).not.toHaveBeenCalled();
    });
  });

  it('admin gets users successfully', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'adminUser',
      isAdmin: true,
    });

    const mockUsers = [
      {
        id: '1',
        name: 'user1',
        isadmin: false,
        isbackend: false,
        hashed_password: 'hash1',
      },
      {
        id: '2',
        name: 'ece30861defaultadminuser',
        isadmin: true,
        isbackend: false,
        hashed_password: 'hash2',
      },
    ];
    mockedAxios.get.mockResolvedValueOnce({ data: mockUsers });

    render(<DeleteUser />);

    await waitFor(() => {
      expect(
        screen.getByText('You are authorized to delete users'),
      ).toBeInTheDocument();
    });

    const getUsersButton = screen.getByText('Get Users');
    fireEvent.click(getUsersButton);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3000/getUsers',
        expect.objectContaining({
          headers: { 'X-Authorization': localStorage.getItem('token') },
        }),
      );
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('ece30861defaultadminuser')).toBeInTheDocument();
    });
  });

  it('admin fails to get users', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'adminUser',
      isAdmin: true,
    });

    mockedAxios.get.mockRejectedValueOnce(new Error('Failed'));

    render(<DeleteUser />);

    await waitFor(() => {
      expect(
        screen.getByText('You are authorized to delete users'),
      ).toBeInTheDocument();
    });

    const getUsersButton = screen.getByText('Get Users');
    fireEvent.click(getUsersButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to get users')).toBeInTheDocument();
    });
  });

  it('admin tries to delete default admin user', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'adminUser',
      isAdmin: true,
    });

    const mockUsers = [
      {
        id: '99',
        name: 'ece30861defaultadminuser',
        isadmin: true,
        isbackend: false,
        hashed_password: 'hash2',
      },
    ];
    mockedAxios.get.mockResolvedValueOnce({ data: mockUsers });

    render(<DeleteUser />);
    await waitFor(() => {
      expect(
        screen.getByText('You are authorized to delete users'),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Get Users'));
    await waitFor(() => {
      expect(screen.getByText('ece30861defaultadminuser')).toBeInTheDocument();
    });

    const deleteUserButton = screen.getByText('Delete User');
    fireEvent.click(deleteUserButton);

    await waitFor(() => {
      expect(
        screen.getByText('Cannot delete default admin user'),
      ).toBeInTheDocument();
      expect(mockedAxios.delete).not.toHaveBeenCalled();
    });
  });

  it('admin deletes another user successfully', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'adminUser',
      isAdmin: true,
    });

    const mockUsers = [
      {
        id: '1',
        name: 'user1',
        isadmin: false,
        isbackend: false,
        hashed_password: 'hash1',
      },
    ];
    mockedAxios.get.mockResolvedValueOnce({ data: mockUsers });
    mockedAxios.delete.mockResolvedValueOnce({ status: 200 });

    render(<DeleteUser />);
    await waitFor(() => {
      expect(
        screen.getByText('You are authorized to delete users'),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Get Users'));
    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const deleteUserButton = screen.getByText('Delete User');
    fireEvent.click(deleteUserButton);

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        'http://localhost:3000/user/1',
        expect.objectContaining({
          headers: { 'X-Authorization': localStorage.getItem('token') },
        }),
      );
      expect(screen.getByText('User deleted successfully')).toBeInTheDocument();
      // Not the current user, so no reload
      expect(window.location.reload).not.toHaveBeenCalled();
      // The user1 should be removed from the list
      expect(screen.queryByText('user1')).not.toBeInTheDocument();
    });
  });

  it('admin fails to delete another user', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'adminUser',
      isAdmin: true,
    });

    const mockUsers = [
      {
        id: '2',
        name: 'user2',
        isadmin: false,
        isbackend: false,
        hashed_password: 'hash2',
      },
    ];
    mockedAxios.get.mockResolvedValueOnce({ data: mockUsers });
    mockedAxios.delete.mockRejectedValueOnce(new Error('Delete error'));

    render(<DeleteUser />);
    await waitFor(() => {
      expect(
        screen.getByText('You are authorized to delete users'),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Get Users'));
    await waitFor(() => {
      expect(screen.getByText('user2')).toBeInTheDocument();
    });

    const deleteUserButton = screen.getByText('Delete User');
    fireEvent.click(deleteUserButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to delete user')).toBeInTheDocument();
      expect(window.location.reload).not.toHaveBeenCalled();
      expect(screen.getByText('user2')).toBeInTheDocument(); // still there because deletion failed
    });
  });
});
