import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, Mock } from 'vitest';
import ButtonPanel from '../../src/components/ButtonPanel';
import { validateStoredToken } from '../../src/utils';
import React from 'react';
import '@testing-library/jest-dom';

vi.mock('../../src/utils', () => ({
  validateStoredToken: vi.fn(),
}));

describe('ButtonPanel Component', () => {
  const mockSetSelectedAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all default buttons and no login/logout buttons initially', () => {
    render(<ButtonPanel setSelectedAction={mockSetSelectedAction} />);

    // Check default buttons
    expect(screen.getByText('Get Package')).toBeInTheDocument();
    expect(screen.getByText('Upload Package')).toBeInTheDocument();
    expect(screen.getByText('Update Package')).toBeInTheDocument();
    expect(screen.getByText('Reset Registry')).toBeInTheDocument();
    expect(screen.getByText('Cost package')).toBeInTheDocument();
    expect(screen.getByText('Rate Package')).toBeInTheDocument();
    expect(screen.getByText('Tracks')).toBeInTheDocument();

    // Login/Logout buttons should not appear initially
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    expect(screen.queryByText('Register Users')).not.toBeInTheDocument();
  });

  it('renders the "Login" button when user is not logged in', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce(null);

    render(<ButtonPanel setSelectedAction={mockSetSelectedAction} />);

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    expect(screen.queryByText('Register Users')).not.toBeInTheDocument();
  });

  it('renders the "Logout" and user-specific buttons when user is logged in', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce({
      id: 1,
      name: 'User',
    });

    render(<ButtonPanel setSelectedAction={mockSetSelectedAction} />);

    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument();
      expect(screen.getByText('Register Users')).toBeInTheDocument();
      expect(screen.getByText('Delete Users')).toBeInTheDocument();
    });

    expect(screen.queryByText('Login')).not.toBeInTheDocument();
  });

  it('triggers the correct action when a button is clicked', () => {
    render(<ButtonPanel setSelectedAction={mockSetSelectedAction} />);

    // Click "Get Package" button
    const getPackageButton = screen.getByText('Get Package');
    fireEvent.click(getPackageButton);

    expect(mockSetSelectedAction).toHaveBeenCalledWith('getPackage');

    // Click "Upload Package" button
    const uploadPackageButton = screen.getByText('Upload Package');
    fireEvent.click(uploadPackageButton);

    expect(mockSetSelectedAction).toHaveBeenCalledWith('uploadPackage');
  });

  it('renders and triggers "Login" action when user is not logged in', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce(null);

    render(<ButtonPanel setSelectedAction={mockSetSelectedAction} />);

    await waitFor(() => {
      const loginButton = screen.getByText('Login');
      expect(loginButton).toBeInTheDocument();

      fireEvent.click(loginButton);
      expect(mockSetSelectedAction).toHaveBeenCalledWith('login');
    });
  });

  it('renders and triggers "Logout" action when user is logged in', async () => {
    (validateStoredToken as Mock).mockResolvedValueOnce({
      id: 1,
      name: 'User',
    });

    render(<ButtonPanel setSelectedAction={mockSetSelectedAction} />);

    await waitFor(() => {
      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toBeInTheDocument();

      fireEvent.click(logoutButton);
      expect(mockSetSelectedAction).toHaveBeenCalledWith('logout');
    });
  });
});
