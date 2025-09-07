/**
 * LoginPage Component Tests
 * Comprehensive test suite covering form validation, loading states, and API interaction
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import type { MockedFunction } from 'vitest';
import LoginPage from './LoginPage';
import { AuthProvider } from '../contexts/AuthContext';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);
const mockedIsAxiosError = vi.mocked(axios.isAxiosError);

// Mock react-router-dom hooks
const mockNavigate = vi.fn() as MockedFunction<(to: string | number, options?: { replace?: boolean }) => void>;
const mockLocation = { state: null as any };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// Mock API_BASE_URL
vi.mock('../config', () => ({
  API_BASE_URL: 'http://localhost:8084'
}));

// Test wrapper component that provides necessary context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('LoginPage Component Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Clear localStorage
    localStorage.clear();
    
    // Reset axios mock
    mockedAxios.post.mockReset();
    mockedIsAxiosError.mockReset();
    
    // Reset navigation mock
    mockNavigate.mockClear();
    
    // Reset location mock state
    mockLocation.state = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering and Initial State', () => {
    test('renders login form with all required elements', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Check page title and description
      expect(screen.getByRole('heading', { name: /catams/i })).toBeInTheDocument();
      expect(screen.getByText(/casual academic time allocation management system/i)).toBeInTheDocument();

      // Check form fields
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      
      // Check form fields have correct types
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');

      // Check submit button
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeInTheDocument();
      
      // Check testing credentials are displayed
      expect(screen.getByText(/testing credentials/i)).toBeInTheDocument();
      expect(screen.getByText(/admin@example.com/i)).toBeInTheDocument();
    });

    test('submit button is initially disabled when form is empty', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    test('validates email format in real-time using HTML5 validation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      
      // Test invalid email format
      await user.type(emailInput, 'invalid-email');
      
      // HTML5 validation should catch this
      expect(emailInput).toHaveValue('invalid-email');
      expect(emailInput).toBeInvalid();
    });

    test('accepts valid email format', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      
      // Test valid email format
      await user.type(emailInput, 'user@example.com');
      
      expect(emailInput).toHaveValue('user@example.com');
      expect(emailInput).toBeValid();
    });

    test('submit button remains disabled until both email and password are provided', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Initially disabled
      expect(submitButton).toBeDisabled();

      // Only email filled
      await user.type(emailInput, 'user@example.com');
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      }, { timeout: 3000 });

      // Only password filled (clear email first)
      await user.clear(emailInput);
      await waitFor(() => {
        expect(emailInput).toHaveValue('');
      }, { timeout: 2000 });
      
      await user.type(passwordInput, 'password123');
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      }, { timeout: 3000 });

      // Both fields filled
      await user.type(emailInput, 'user@example.com');
      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      }, { timeout: 3000 });
    });

    test('clears error message when user starts typing', async () => {
      const user = userEvent.setup();
      
      // Mock failed login response
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: { message: 'Invalid credentials' }
        }
      });
      mockedIsAxiosError.mockReturnValue(true);

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Fill form and submit to trigger error
      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'wrongpassword');
      
      // Wait for form to be ready for submission
      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      }, { timeout: 3000 });
      
      await user.click(submitButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Start typing in email field to clear the error
      await user.type(emailInput, 'a');

      // Wait for error to be cleared
      await waitFor(() => {
        expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Loading State', () => {
    test('shows loading state when form is submitted', async () => {
      const user = userEvent.setup();
      
      // Mock successful login response with delay
      mockedAxios.post.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              data: {
                token: 'mock-jwt-token',
                user: {
                  id: 1,
                  email: 'user@example.com',
                  name: 'Test User',
                  role: 'LECTURER'
                }
              }
            });
          }, 100); // 100ms delay to observe loading state
        });
      });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Fill form
      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');

      // Submit form
      await user.click(submitButton);

      // Check loading state immediately
      expect(screen.getByRole('button', { name: /signing in\.\.\./i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /signing in\.\.\./i })).toBeDisabled();
      
      // Form fields should be disabled during loading
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /signing in\.\.\./i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Successful Login', () => {
    test('handles successful API response correctly', async () => {
      const user = userEvent.setup();
      
      // Mock successful login response with realistic delay
      const mockLoginResponse = {
        data: {
          token: 'mock-jwt-token-12345',
          user: {
            id: 1,
            email: 'lecturer@example.com',
            name: 'Test Lecturer',
            role: 'LECTURER'
          }
        }
      };
      
      // Add a small delay to simulate network request
      mockedAxios.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockLoginResponse), 50))
      );

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Fill form
      await user.type(emailInput, 'lecturer@example.com');
      await user.type(passwordInput, 'Lecturer123!');
      
      // Wait for form to be ready
      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      }, { timeout: 2000 });
      
      // Submit form
      await user.click(submitButton);

      // Verify API call was made with correct parameters
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:8084/api/auth/login',
          {
            email: 'lecturer@example.com',
            password: 'Lecturer123!'
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }, { timeout: 5000 });

      // Check success message appears
      await waitFor(() => {
        expect(screen.getByText(/login successful! welcome to catams/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify navigation is called
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      }, { timeout: 3000 });

      // Note: In test environment, we focus on the behavior rather than localStorage
      // The AuthContext handles localStorage updates, which is tested separately
    });

    test('form is cleared after successful login', async () => {
      const user = userEvent.setup();
      
      // Mock with small delay to simulate real API
      mockedAxios.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: {
            token: 'mock-token',
            user: {
              id: 1,
              email: 'user@example.com',
              name: 'Test User',
              role: 'TUTOR'
            }
          }
        }), 50))
      );

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Fill form
      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');
      
      // Ensure form is ready for submission
      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      }, { timeout: 2000 });
      
      // Submit form
      await user.click(submitButton);

      // Wait for completion and verify form is cleared
      await waitFor(() => {
        expect(emailInput).toHaveValue('');
        expect(passwordInput).toHaveValue('');
      }, { timeout: 5000 });
    });
  });

  describe('Failed Login', () => {
    test('handles API error response gracefully with specific error message', async () => {
      const user = userEvent.setup();
      
      // Mock failed login response
      const mockError = {
        response: {
          data: {
            message: 'Invalid email or password. Please try again.'
          }
        }
      };
      
      mockedAxios.post.mockRejectedValueOnce(mockError);
      mockedIsAxiosError.mockReturnValue(true);

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Fill and submit form with invalid credentials
      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password. please try again./i)).toBeInTheDocument();
      });

      // Verify form is not cleared on error
      expect(emailInput).toHaveValue('wrong@example.com');
      expect(passwordInput).toHaveValue('wrongpassword');
      
      // Submit button should be re-enabled
      expect(submitButton).toBeEnabled();
      expect(submitButton).toHaveTextContent('Sign In');
    });

    test('handles API error without specific message', async () => {
      const user = userEvent.setup();
      
      // Mock failed login response without message
      const mockError = {
        response: {
          data: {}
        }
      };
      
      mockedAxios.post.mockRejectedValueOnce(mockError);
      mockedIsAxiosError.mockReturnValue(true);

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Fill and submit form
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password');
      await user.click(submitButton);

      // Verify default error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/login failed:/i)).toBeInTheDocument();
      });
    });

    test('handles non-axios errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock non-axios error (e.g., network error)
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      mockedIsAxiosError.mockReturnValue(false);

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Fill and submit form
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password');
      await user.click(submitButton);

      // Verify generic error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred. please try again./i)).toBeInTheDocument();
      });
    });
  });

  describe('Authentication State Integration', () => {
    test('renders login form when no authentication data is present', async () => {
      // Ensure localStorage is clean
      localStorage.clear();

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Should render the login form normally
      expect(screen.getByRole('heading', { name: /catams/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      
      // Should not attempt to navigate immediately
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('respects "from" location for redirect after login', async () => {
      const user = userEvent.setup();
      
      // Mock location state with "from" path
      mockLocation.state = {
        from: { pathname: '/protected-route' }
      };

      // Mock with realistic delay
      mockedAxios.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: {
            token: 'mock-token',
            user: {
              id: 1,
              email: 'user@example.com',
              name: 'Test User',
              role: 'ADMIN'
            }
          }
        }), 50))
      );

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Fill form
      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'Admin123!');
      
      // Wait for form to be ready
      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      }, { timeout: 2000 });
      
      // Submit form
      await user.click(submitButton);

      // Should redirect to the "from" location
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/protected-route', { replace: true });
      }, { timeout: 5000 });
    });
  });

  describe('Accessibility', () => {
    test('form has proper labels and accessibility attributes', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Check that form inputs have proper labels
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');

      // Check required attributes
      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();

      // Check placeholders
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email');
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password');
    });

    test('error messages are properly associated with the form', async () => {
      const user = userEvent.setup();
      
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: { message: 'Login failed' }
        }
      });
      mockedIsAxiosError.mockReturnValue(true);

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password');
      await user.click(submitButton);

      // Error message should be visible and accessible
      await waitFor(() => {
        const errorMessage = screen.getByText(/login failed/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('error-message');
      });
    });
  });
});