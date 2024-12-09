import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import DynamicContent from '../../src/components/DynamicContent'; // Adjust this path if needed

// Mock validateStoredToken from utils
vi.mock('../../src/utils', () => ({
  validateStoredToken: vi.fn(),
  storeToken: vi.fn(),
  clearToken: vi.fn(),
}));

const { validateStoredToken } = await import('../../src/utils');

describe('DynamicContent Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders EmptyContent by default (unknown action)', async () => {
    // For EmptyContent, assume no user logged in
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);

    render(<DynamicContent selectedAction="unknownAction" />);

    // EmptyContent actually shows "Select an action to see details"
    expect(
      screen.getByText(/Select an action to see details/i),
    ).toBeInTheDocument();
  });

  it('renders GetPackage when selectedAction is getPackage', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });

    render(<DynamicContent selectedAction="getPackage" />);

    // Wait for final UI
    await waitFor(() => {
      expect(screen.getByText(/Result of the queries/i)).toBeInTheDocument();
    });
  });

  it('renders UploadPackage when selectedAction is uploadPackage', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });

    render(<DynamicContent selectedAction="uploadPackage" />);

    await waitFor(() => {
      expect(screen.getByText(/Upload Package/i)).toBeInTheDocument();
    });
  });

  it('renders UpdatePackage when selectedAction is updatePackage', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });

    render(<DynamicContent selectedAction="updatePackage" />);

    // Use getByRole to avoid multiple matches of "Update Package"
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Update Package/i }),
      ).toBeInTheDocument();
    });
  });

  it('renders RatePackage when selectedAction is ratePackage', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });

    render(<DynamicContent selectedAction="ratePackage" />);

    await waitFor(() => {
      expect(screen.getByText(/Rate Package/i)).toBeInTheDocument();
    });
  });

  it('renders Reset when selectedAction is resetRegistry', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });

    render(<DynamicContent selectedAction="resetRegistry" />);

    await waitFor(() => {
      expect(
        screen.getByText(/Do you want to reset Database\?/i),
      ).toBeInTheDocument();
    });
  });

  it('renders EmptyContent when selectedAction is authenticate', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);

    render(<DynamicContent selectedAction="authenticate" />);
    expect(
      screen.getByText(/Select an action to see details/i),
    ).toBeInTheDocument();
  });

  it('renders CostPackage when selectedAction is costPackage', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });

    render(<DynamicContent selectedAction="costPackage" />);

    // Match the actual text from CostPackage: "Cost of package with id:"
    await waitFor(() => {
      expect(screen.getByText(/Cost of package with id:/i)).toBeInTheDocument();
    });
  });

  it('renders Tracks when selectedAction is tracks', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });

    render(<DynamicContent selectedAction="tracks" />);
    await waitFor(() => {
      expect(screen.getByText(/Our track is/i)).toBeInTheDocument();
    });
  });

  it('renders Login when selectedAction is login', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce(null);

    render(<DynamicContent selectedAction="login" />);
    await waitFor(() => {
      expect(screen.getByText(/Login/i)).toBeInTheDocument();
    });
  });

  it('renders Register when selectedAction is register', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });

    render(<DynamicContent selectedAction="register" />);
    await waitFor(() => {
      expect(screen.getByText(/Register users/i)).toBeInTheDocument();
    });
  });

  it('renders Logout when selectedAction is logout', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });

    render(<DynamicContent selectedAction="logout" />);
    // Logout shows "Do you want to log out?"
    await waitFor(() => {
      expect(screen.getByText(/Do you want to log out\?/i)).toBeInTheDocument();
    });
  });

  it('renders DeleteUser when selectedAction is deleteUser', async () => {
    (validateStoredToken as vi.Mock).mockResolvedValueOnce({
      name: 'TestUser',
    });

    render(<DynamicContent selectedAction="deleteUser" />);
    // DeleteUser shows "Do you want to delete your profile?"
    await waitFor(() => {
      expect(
        screen.getByText(/Do you want to delete your profile\?/i),
      ).toBeInTheDocument();
    });
  });
});
