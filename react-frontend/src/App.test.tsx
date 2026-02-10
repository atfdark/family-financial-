import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';

// Mock the API module
jest.mock('./services/api', () => ({
  api: {
    getUser: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('App Component', () => {
  test('renders without crashing', () => {
    renderWithProviders(<App />);
    expect(document.body).toBeInTheDocument();
  });

  test('redirects to login when not authenticated', async () => {
    renderWithProviders(<App />);
    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
    });
  });

  test('shows loading state while checking authentication', () => {
    renderWithProviders(<App />);
    const loadingSpinner = document.querySelector('.animate-spin');
    expect(loadingSpinner).toBeInTheDocument();
  });
});
