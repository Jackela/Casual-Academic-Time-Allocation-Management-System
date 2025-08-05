import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import './LoginPage.css';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

interface LoginError {
  message: string;
  error?: string;
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
      // Make API call to backend login endpoint
      const response = await axios.post<LoginResponse>(
        `${API_BASE_URL}/api/auth/login`,
        {
          email: formData.email,
          password: formData.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );


      // Handle successful login
      const { token, user } = response.data;
      
      // Use the AuthContext login method
      login(token, user);
      
      setSuccess(true);
      
      // Reset form
      setFormData({ email: '', password: '' });
      
      // Navigate to dashboard after successful login
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
      
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorData = err.response?.data as LoginError;
        setError(errorData?.message || `Login failed: ${err.message}`);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" data-testid="login-container">
      <div className="login-card" data-testid="login-card">
        <div className="login-header" data-testid="login-header">
          <h1 data-testid="login-title">CATAMS</h1>
          <p data-testid="login-subtitle">Casual Academic Time Allocation Management System</p>
        </div>

        {success && (
          <div className="success-message" data-testid="success-message">
            Login successful! Welcome to CATAMS.
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form" data-testid="login-form">
          <div className="form-group" data-testid="email-form-group">
            <label htmlFor="email" data-testid="email-label">Email</label>
            <input
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

          <div className="form-group" data-testid="password-form-group">
            <label htmlFor="password" data-testid="password-label">Password</label>
            <input
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
            <div className="error-message" data-testid="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || !formData.email || !formData.password}
            className="login-button"
            data-testid="login-submit-button"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer" data-testid="login-footer">
          <p data-testid="credentials-title">Testing Credentials:</p>
          <small data-testid="credentials-list">
            • Admin: admin@example.com / Admin123!<br/>
            • Lecturer: lecturer@example.com / Lecturer123!<br/>
            • Tutor: tutor@example.com / Tutor123!
          </small>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;