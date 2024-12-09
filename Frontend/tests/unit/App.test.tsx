import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import App from '../../src/App'; // Adjust path as needed

// Mocking utils if needed
vi.mock('../../src/utils', () => ({
  validateStoredToken: vi.fn().mockResolvedValue(null), // assume not logged in initially
}));

// Mock ButtonPanel: We'll simulate it having a button for "Get Package"
vi.mock('../../src/components/ButtonPanel', () => ({
  __esModule: true,
  default: ({
    setSelectedAction,
  }: {
    setSelectedAction: (action: string) => void;
  }) => (
    <div>
      <button onClick={() => setSelectedAction('getPackage')}>
        Get Package Action
      </button>
      {/* Add other buttons if needed */}
    </div>
  ),
}));

// Mock DynamicContent to just display the selectedAction
vi.mock('../../src/components/DynamicContent', () => ({
  __esModule: true,
  default: ({ selectedAction }: { selectedAction: string }) => (
    <div data-testid="dynamic-content">
      Selected Action: {selectedAction || 'None'}
    </div>
  ),
}));

describe('App Component', () => {
  it('renders the layout with title and logo', () => {
    render(<App />);

    // Check for the title
    expect(screen.getByText('MPN Package Manager')).toBeInTheDocument();
    // Check for the image
    const image = screen.getByAltText('Package');
    expect(image).toBeInTheDocument();

    // Check initial selected action is empty
    expect(screen.getByTestId('dynamic-content')).toHaveTextContent(
      'Selected Action: None',
    );
  });

  it('updates dynamic content when an action is selected from ButtonPanel', async () => {
    render(<App />);

    // Initially "None"
    expect(screen.getByTestId('dynamic-content')).toHaveTextContent(
      'Selected Action: None',
    );

    // Click the button in ButtonPanel to set "getPackage"
    fireEvent.click(screen.getByText('Get Package Action'));

    await waitFor(() => {
      // After clicking the button, selectedAction should be "getPackage"
      expect(screen.getByTestId('dynamic-content')).toHaveTextContent(
        'Selected Action: getPackage',
      );
    });
  });
});
