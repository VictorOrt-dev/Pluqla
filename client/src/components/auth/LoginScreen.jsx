import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useTranslation } from 'react-i18next';
import authService from '../../services/authService';
import AuthLayout from './AuthLayout';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import '../../styles/auth.css';

const LoginScreen = () => {
  const { t } = useTranslation();
  const { login, error, clearError } = useAuth();
  const { setCurrentScreen } = useNavigation();

  const [isLoginMode, setIsLoginMode] = useState(() => {
    const authMode = localStorage.getItem('authMode');
    const loginMode = authMode === 'register' ? false : true;
    return loginMode;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Clear server errors when switching modes
  React.useEffect(() => {
    setServerError(null);
    if (error) {
      clearError();
    }
  }, [isLoginMode, error, clearError]);

  // Handle login submission
  const handleLoginSubmit = async (email, password) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const result = await login(email, password);
      if (result.success) {
        localStorage.removeItem('authMode');
        setCurrentScreen('home', true, true);
      } else {
        setServerError(result.message || t('auth.errors.loginError'));
      }
    } catch (err) {
      console.error('Login error:', err);
      setServerError(t('auth.errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle signup submission
  const handleSignupSubmit = async (formData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const registerResult = await authService.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      if (registerResult.success) {
        // Auto-login after successful registration
        const loginResult = await login(formData.email, formData.password);
        if (loginResult.success) {
          localStorage.removeItem('authMode');
          localStorage.setItem('isNewUser', 'true');
          setCurrentScreen('onboarding', true, true);
        } else {
          setServerError(loginResult.message || t('auth.errors.loginError'));
        }
      } else {
        console.error('❌ Registration error:', registerResult.message);
        setServerError(registerResult.message || t('auth.errors.registerError'));
      }
    } catch (err) {
      console.error('Signup error:', err);
      setServerError(t('auth.errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Switch between login and signup modes
  const switchToSignup = () => {
    setIsLoginMode(false);
    setServerError(null);
    localStorage.removeItem('authMode');
  };

  const switchToLogin = () => {
    setIsLoginMode(true);
    setServerError(null);
    localStorage.removeItem('authMode');
  };

  return (
    <AuthLayout>
      {isLoginMode ? (
        <LoginForm
          onSubmit={handleLoginSubmit}
          isLoading={isLoading}
          serverError={serverError || error}
          onSwitchToSignup={switchToSignup}
        />
      ) : (
        <SignupForm
          onSubmit={handleSignupSubmit}
          isLoading={isLoading}
          serverError={serverError || error}
          onSwitchToLogin={switchToLogin}
        />
      )}
    </AuthLayout>
  );
};

export default LoginScreen;