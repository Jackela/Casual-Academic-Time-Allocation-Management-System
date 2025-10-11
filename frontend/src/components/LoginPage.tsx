import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { secureApiClient } from '../services/api-secure';
import { secureLogger } from '../utils/secure-logger';
// import './LoginPage.css'; // REMOVED

import type { LoginResponse } from '../types/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      secureLogger.debug('Login attempt', { email: formData.email });
      
      // Make API call to backend login endpoint using secure client
      const response = await secureApiClient.post<LoginResponse>(
        '/api/auth/login',
        {
          email: formData.email,
          password: formData.password
        }
      );

      // Handle successful login
      const { token, user } = response.data!;
      
      secureLogger.security('user_login', {
        userId: user.id,
        email: user.email,
        role: user.role
      });
      
      // Use the AuthContext login method
      login(token, user);
      
      setSuccess(true);
      
      // Reset form
      setFormData({ email: '', password: '' });
      
      // Navigate to dashboard after successful login
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
      
    } catch (error: unknown) {
      secureLogger.security('login_failed', {
        email: formData.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      const fallbackMessage = 'An unexpected error occurred. Please try again.';
      let resolvedMessage = fallbackMessage;

      if (!(error instanceof Error) && typeof error === 'object' && error) {
        const errorRecord = error as Record<string, unknown>;
        const directMessage = typeof errorRecord.message === 'string' ? errorRecord.message.trim() : '';
        const responseData = (errorRecord.response as { data?: { message?: string } } | undefined)?.data;
        const responseMessage = typeof responseData?.message === 'string' ? responseData.message.trim() : '';

        const candidate = directMessage || responseMessage;
        if (candidate) {
          resolvedMessage = candidate;
        }
      }

      setError(resolvedMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-primary to-brand-secondary p-4"
      data-testid="login-container"
    >
      <Card className="w-full max-w-md" data-testid="login-card">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight" data-testid="login-title">
            CATAMS
          </CardTitle>
          <CardDescription data-testid="login-subtitle">
            Casual Academic Time Allocation Management System
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success && (
            <div
              className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-center text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
              data-testid="success-message"
            >
              Login successful! Welcome to CATAMS.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
            <div className="space-y-2" data-testid="email-form-group">
              <label htmlFor="email" className="text-sm font-medium" data-testid="email-label">
                Email
              </label>
              <Input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={loading}
                placeholder="Enter your email"
                data-testid="email-input"
              />
            </div>

            <div className="space-y-2" data-testid="password-form-group">
              <label htmlFor="password" className="text-sm font-medium" data-testid="password-label">
                Password
              </label>
              <Input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={loading}
                placeholder="Enter your password"
                data-testid="password-input"
              />
            </div>

            {error && (
              <div
                className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive"
                data-testid="error-message"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !formData.email || !formData.password}
              className="w-full"
              data-testid="login-submit-button"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </CardContent>

        {/* Testing credentials for development only */}
        {__DEV_CREDENTIALS__ && (
          <CardFooter className="mt-4 flex-col items-start" data-testid="login-footer">
            <p className="text-sm font-semibold text-muted-foreground" data-testid="credentials-title">
              Testing Credentials:
            </p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground" data-testid="credentials-list">
              <div className="flex justify-between gap-4">
                <strong>Admin:</strong>
                <span>admin@example.com</span>
              </div>
              <div className="flex justify-between gap-4">
                <strong>Lecturer:</strong>
                <span>lecturer@example.com</span>
              </div>
              <div className="flex justify-between gap-4">
                <strong>Tutor:</strong>
                <span>tutor@example.com</span>
              </div>
              <small className="mt-2 block opacity-70">
                Use any password for testing
              </small>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default LoginPage;



