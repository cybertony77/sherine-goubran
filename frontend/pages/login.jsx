import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from 'next/image';
import { TextInput, PasswordInput, Anchor, Group, Text, Modal } from '@mantine/core';
import { FloatingLabelInput } from '../components/FloatingLabelInput';
import { useLogin } from '../lib/api/auth';
import NeedHelp from '../components/NeedHelp';

/** Only same-origin relative paths — blocks open redirects. */
function isSafeRedirectPath(path) {
  if (!path || typeof path !== 'string') return false;
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return false;
  }
  return (
    decoded.startsWith('/') &&
    !decoded.startsWith('//') &&
    !decoded.includes('://')
  );
}

export default function Login() {
  const [assistant_id, setAssistantId] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [redirectMessage, setRedirectMessage] = useState("");
  const [otpPopupOpen, setOtpPopupOpen] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devToolsDetected, setDevToolsDetected] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const router = useRouter();
  
  // React Query login mutation
  const loginMutation = useLogin();

  // Initialize device_id for this browser (only persist later for non-developers)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      let storedId = localStorage.getItem('demo_device_id');
      if (storedId) {
        // Reuse existing device id if it was previously stored (non-developer login)
        setDeviceId(storedId);
      } else {
        // Generate an in-memory device id candidate; will only be saved
        // to localStorage after a successful non-developer login
        let generatedId;
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
          generatedId = window.crypto.randomUUID();
        } else {
          generatedId = `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        }
        setDeviceId(generatedId);
      }
    } catch (e) {
      // If localStorage is unavailable, fall back to an in-memory id
      const fallbackId = `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setDeviceId(fallbackId);
    }
  }, []);

  // DevTools detection on login page (show for ALL users including developers)
  useEffect(() => {
    let checkInterval;
    
    // Check user role (but don't skip detection for developers on login page)
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          setUserRole(userData.role);
        }
      } catch (error) {
        // Ignore errors - user not logged in yet
      }
      
      // Run devtools detection for ALL users on login page
      const detectDevTools = () => {
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;
        
        if (widthDiff > 160 || heightDiff > 160) {
          setDevToolsDetected(true);
          return;
        }

        const consoleStart = performance.now();
        console.log('%c', '');
        const consoleEnd = performance.now();
        
        if (consoleEnd - consoleStart > 1) {
          setDevToolsDetected(true);
          return;
        }

        setDevToolsDetected(false);
      };

      // Start detection for all users
      checkInterval = setInterval(detectDevTools, 500);
      detectDevTools();
    };
    
    checkUserRole();

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (forgotMsg) {
      const timer = setTimeout(() => setForgotMsg("") , 5000);
      return () => clearTimeout(timer);
    }
  }, [forgotMsg]);

  useEffect(() => {
    if (otpError) {
      const timer = setTimeout(() => setOtpError(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [otpError]);

  useEffect(() => {
    // Load username from sessionStorage (never store passwords)
    const storedId = sessionStorage.getItem('student_id');
    if (storedId) {
      setAssistantId(storedId);
    }

    // Check if user is already authenticated by making a request to the server
    const checkAuthStatus = async () => {
      try {
        // Make a request to check authentication status
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include' // This will include HttpOnly cookies
        });
        
        if (response.ok) {
          // User is authenticated, go to website dashboard
          window.location.href = "/dashboard";
          return;
        }
        // If response is not ok (401 or other), user is not authenticated, stay on login page
        // Don't log 401 errors as they're expected for unauthenticated users
      } catch (error) {
        // Error checking auth status, stay on login page
        // Suppress console errors for expected 401 responses
        if (error.name !== 'TypeError' || !error.message.includes('fetch')) {
        console.log('Auth check failed:', error);
        }
      }
    };

    // Check authentication status
    checkAuthStatus();

    // Prefill username only (from forgot password page) — password stays in React state
    if (typeof window !== 'undefined') {
      const savedUsername = sessionStorage.getItem('forgot_password_username');
      if (savedUsername) {
        setAssistantId(savedUsername);
      }
    }

    // Check if user was redirected from a protected page
    const cookies = document.cookie.split(';');
    const redirectCookie = cookies.find(cookie => cookie.trim().startsWith('redirectAfterLogin='));
    const rawRedirect = redirectCookie ? redirectCookie.split('=').slice(1).join('=') : null;
    const redirectPath = isSafeRedirectPath(rawRedirect) ? decodeURIComponent(rawRedirect) : null;
    
    if (redirectPath && redirectPath !== "/" && redirectPath !== "/dashboard") {
      setRedirectMessage(`You must log in first to access: ${redirectPath}`);
    }
  }, []);

  useEffect(() => {
    if (redirectMessage) {
      const timer = setTimeout(() => setRedirectMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [redirectMessage]);

  useEffect(() => {
    if (usernameError) {
      const timer = setTimeout(() => setUsernameError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [usernameError]);

  useEffect(() => {
    if (passwordError) {
      const timer = setTimeout(() => setPasswordError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [passwordError]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Check resend_expiration from database when OTP popup opens
  useEffect(() => {
    const checkResendExpiration = async () => {
      if (!otpPopupOpen || !assistant_id || assistant_id.trim() === '') return;

      try {
        const response = await fetch('/api/auth/forgot-password/check-resend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: assistant_id.trim() })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.resend_expiration) {
            const expiration = new Date(data.resend_expiration);
            const now = new Date();
            const secondsRemaining = Math.max(0, Math.floor((expiration - now) / 1000));
            setResendCooldown(secondsRemaining);
          }
        }
      } catch (error) {
        console.error('Failed to check resend expiration:', error);
      }
    };

    checkResendExpiration();
  }, [otpPopupOpen, assistant_id]);

  const handleForgotPassword = async () => {
    if (!assistant_id || assistant_id.trim() === '') {
      setForgotMsg('Please Enter username first');
      return;
    }

    // First, check if user exists and get resend_expiration status
    try {
      setIsSendingOtp(true);
      setOtpError('');
      setForgotMsg('');
      
      // Check user and resend expiration status
      const checkResponse = await fetch('/api/auth/forgot-password/check-resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assistant_id.trim() })
      });
      
      const checkData = await checkResponse.json();
      
      if (!checkResponse.ok) {
        if (checkResponse.status === 404) {
          setForgotMsg('ACCOUNT_NOT_FOUND');
        } else {
          setForgotMsg(checkData.error || 'Failed to check user');
        }
        setIsSendingOtp(false);
        return;
      }

      // Check if we can send OTP (only if resend_expiration is null or has passed)
      const now = new Date();
      let canSendOtp = true;
      let secondsRemaining = 0;
      
      if (checkData.resend_expiration) {
        const expiration = new Date(checkData.resend_expiration);
        secondsRemaining = Math.max(0, Math.floor((expiration - now) / 1000));
        // Only allow sending if expiration has passed
        canSendOtp = expiration < now;
      }
      
      // Set cooldown timer
      setResendCooldown(secondsRemaining);
      
      // Open OTP popup
      setOtpPopupOpen(true);
      setOtp(['', '', '', '', '', '', '', '']);
      setForgotMsg('');
      
      // Only send OTP if resend_expiration is null or has passed
      if (canSendOtp) {
        console.log('📤 Sending OTP request for username:', assistant_id.trim());
        
        const response = await fetch('/api/auth/forgot-password/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: assistant_id.trim() })
        });
        
        const data = await response.json();
        
        console.log('📥 OTP response:', { status: response.status, data });
        
        if (response.ok && data.success) {
          // Update resend cooldown from response
          if (data.resend_expiration) {
            const expiration = new Date(data.resend_expiration);
            const now = new Date();
            const secondsRemaining = Math.max(0, Math.floor((expiration - now) / 1000));
            setResendCooldown(secondsRemaining);
          }
        } else {
          // Handle error - show generic message for email sending errors
          console.error('❌ OTP send error:', data.error || data.details || 'Failed to send OTP');
          if (data.resend_expiration) {
            // Update cooldown even if email wasn't sent
            const expiration = new Date(data.resend_expiration);
            const now = new Date();
            const secondsRemaining = Math.max(0, Math.floor((expiration - now) / 1000));
            setResendCooldown(secondsRemaining);
          }
          setOtpError('Sorry, there was a problem sending the email. Please try again later.');
        }
      } else {
        // Cooldown is still active, don't send OTP but show message
        setOtpError("Please wait before requesting a new OTP.");
      }
    } catch (error) {
      console.error('❌ OTP send exception:', error);
      setOtpError('Sorry, there was a problem sending the email. Please try again later.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const rawValue = value;
    const sanitized = rawValue.replace(/[^0-9]/g, '');

    if (!sanitized) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      setOtpError('');
      return;
    }

    const newOtp = [...otp];

    // 🔥 If full code pasted into first input
    if (sanitized.length >= 8 && index === 0) {
      const digits = sanitized.slice(0, 8).split('');
      setOtp(digits);
      setOtpError('');

      setTimeout(() => {
        const lastInput = document.querySelector(`input[name="otp-7"]`);
        if (lastInput) lastInput.focus();
      }, 0);

      return;
    }

    // 🔥 If multiple characters pasted (partial paste)
    if (sanitized.length > 1) {
      for (let i = 0; i < sanitized.length && index + i < 8; i++) {
        newOtp[index + i] = sanitized[i];
      }

      setOtp(newOtp);
      setOtpError('');

      const nextIndex = Math.min(index + sanitized.length, 7);
      setTimeout(() => {
        const nextInput = document.querySelector(`input[name="otp-${nextIndex}"]`);
        if (nextInput) nextInput.focus();
      }, 0);

      return;
    }

    // Normal single character
    newOtp[index] = sanitized;
    setOtp(newOtp);
    setOtpError('');

    if (index < 7) {
      const nextInput = document.querySelector(`input[name="otp-${index + 1}"]`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpPaste = (e, index) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const sanitized = pastedText.replace(/[^0-9]/g, '').slice(0, 8);
    if (sanitized.length === 0) return;

    const newOtp = [...otp];
    const startIdx = sanitized.length === 8 ? 0 : index;
    for (let i = 0; i < sanitized.length && (startIdx + i) < 8; i++) {
      newOtp[startIdx + i] = sanitized[i];
    }
    setOtp(newOtp);
    setOtpError('');
    const lastIndex = Math.min(startIdx + sanitized.length - 1, 7);
    setTimeout(() => {
      const lastInput = document.querySelector(`input[name="otp-${lastIndex}"]`);
      if (lastInput) lastInput.focus();
    }, 0);
  };

  const handleOtpKeyDown = (e, index) => {
    // Handle Enter key to verify OTP
    if (e.key === 'Enter') {
      e.preventDefault();
      const otpCode = otp.join('');
      if (otpCode.length === 8 && !isVerifyingOtp) {
        handleVerifyOtp();
      }
      return;
    }
    // Handle backspace to move to previous input
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.querySelector(`input[name="otp-${index - 1}"]`);
      if (prevInput) prevInput.focus();
    }
    // Handle arrow keys
    else if (e.key === 'ArrowLeft' && index > 0) {
      const prevInput = document.querySelector(`input[name="otp-${index - 1}"]`);
      if (prevInput) prevInput.focus();
    } else if (e.key === 'ArrowRight' && index < 7) {
      const nextInput = document.querySelector(`input[name="otp-${index + 1}"]`);
      if (nextInput) nextInput.focus();
    }
    // Auto-advance to next input on character entry
    else if (e.key !== 'Backspace' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && otp[index] && index < 7) {
      const nextInput = document.querySelector(`input[name="otp-${index + 1}"]`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    
    try {
      setIsSendingOtp(true);
      setOtpError('');
      
      const response = await fetch('/api/auth/forgot-password/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assistant_id.trim() })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Set cooldown from database resend_expiration
        if (data.resend_expiration) {
          const expiration = new Date(data.resend_expiration);
          const now = new Date();
          const secondsRemaining = Math.max(0, Math.floor((expiration - now) / 1000));
          setResendCooldown(secondsRemaining);
        } else {
          setResendCooldown(180); // 3 minutes = 180 seconds (fallback)
        }
        setOtpError('');
      } else {
        // Show generic message for email sending errors
        setOtpError('Sorry, there was a problem sending the email. Please try again later.');
      }
    } catch (error) {
      // Show generic message for email sending errors
      setOtpError('Sorry, there was a problem sending the email. Please try again later.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 8) {
      setOtpError('Please enter the complete OTP code');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');

    try {
      const response = await fetch('/api/auth/forgot-password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: assistant_id.trim(),
          otp: otpCode
        })
      });

      const data = await response.json();

      if (response.ok) {
        const sig = data.sig;
        const target = `/forgot_password?id=${encodeURIComponent(assistant_id.trim())}&sig=${encodeURIComponent(sig)}`;
        setIsVerifyingOtp(false);
        setOtpVerified(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setOtpPopupOpen(false);
        setOtpVerified(false);
        router.push(target);
      } else {
        setOtpError(data.error || 'Invalid OTP');
        setIsVerifyingOtp(false);
      }
    } catch (error) {
      setOtpError('Failed to verify OTP. Please try again.');
      setIsVerifyingOtp(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setUsernameError("");
    setPasswordError("");

    // Don't block login - let it proceed
    // DevToolsProtection in _app.js will handle protection after login
    // and will bypass for developers

    // Trim whitespaces from username before sending
    const trimmedUsername = assistant_id.trim();

    loginMutation.mutate(
      { assistant_id: trimmedUsername, password, device_id: deviceId || null },
      {
        onSuccess: (data) => {
          // Set user role for devtools check
          setUserRole(data.role);

          // Persist device_id only for non-developer roles
          if (typeof window !== 'undefined') {
            try {
              if (data.role !== 'developer' && deviceId) {
                localStorage.setItem('demo_device_id', deviceId);
              }
            } catch (e) {
              // Ignore storage errors
            }
          }
          
          // Remove username sessionStorage items after successful login
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('student_id');
            sessionStorage.removeItem('forgot_password_username');
          }
          
          // Check if there's a redirect path saved in cookies (relative paths only)
          const cookies = document.cookie.split(';');
          const redirectCookie = cookies.find(cookie => cookie.trim().startsWith('redirectAfterLogin='));
          const rawRedirect = redirectCookie ? redirectCookie.split('=').slice(1).join('=') : null;
          const redirectPath = isSafeRedirectPath(rawRedirect) ? decodeURIComponent(rawRedirect) : null;
          
          // Small delay to ensure token is stored and auth state updates
          setTimeout(() => {
            document.cookie = "redirectAfterLogin=; path=/; max-age=0";
            if (
              redirectPath &&
              redirectPath !== "/" &&
              redirectPath !== "/login" &&
              redirectPath !== "/dashboard"
            ) {
              window.location.href = redirectPath;
            } else {
              window.location.href = "/dashboard";
            }
          }, 100);
        },
        onError: (err) => {
          if (err.response?.status === 429) {
            setMessage(err.response?.data?.error || "Too many login attempts. Please try again later.");
          } else if (
            err.response?.data?.error === 'invalid_credentials' ||
            err.response?.data?.error === 'user_not_found' ||
            err.response?.data?.error === 'wrong_password'
          ) {
            setMessage("Wrong username or password");
          } else if (err.response?.data?.error === 'account_deactivated') {
            setMessage("Access unavailable: This account is deactivated. Please contact Tony Joseph (developer).");
          } else if (err.response?.data?.error === 'student_account_deactivated') {
            setMessage("student_account_deactivated"); // Special marker for custom rendering
          } else if (err.response?.data?.error === 'device_limit_reached') {
            setMessage("device_limit_reached");
          } else if (err.response?.data?.error === 'subscription_inactive' || err.response?.data?.error === 'subscription_expired') {
            setMessage(err.response?.data?.message || "Access unavailable: Subscription expired. Please contact Tony Joseph (developer) to renew.");
          } else {
            setMessage("Wrong username or password");
          }
        }
      }
    );
  };

  return (
    <div
      className="login-page"
      style={{
        minHeight: '100vh',
        width: '100vw',
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
        overflow: 'auto',
      }}
    >
        <style jsx>{`
          .login-page {
            min-height: 100vh;
            min-height: 100dvh;
            width: 100vw;
            position: fixed;
            top: 0;
            left: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
            box-sizing: border-box;
            background:
              radial-gradient(ellipse 80% 55% at 50% -10%, rgba(201, 169, 106, 0.28) 0%, transparent 55%),
              radial-gradient(ellipse 50% 40% at 100% 100%, rgba(233, 221, 208, 0.12) 0%, transparent 50%),
              radial-gradient(ellipse 45% 35% at 0% 80%, rgba(201, 169, 106, 0.1) 0%, transparent 45%),
              var(--system-page-bg, #0F0F10);
            overflow: auto;
          }
          .login-container {
            background: linear-gradient(165deg, #FFFEFB 0%, #F7F4EE 55%, #F3EEE6 100%);
            backdrop-filter: blur(16px);
            border-radius: 24px;
            padding: 44px 40px 36px;
            box-shadow:
              0 1px 0 rgba(255, 255, 255, 0.65) inset,
              0 24px 64px rgba(15, 15, 16, 0.38),
              0 8px 24px rgba(201, 169, 106, 0.12);
            border: 1px solid rgba(201, 169, 106, 0.35);
            max-width: 440px;
            width: 100%;
            position: relative;
            overflow: hidden;
            animation: cardIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .login-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 7px;
            background: linear-gradient(
              90deg,
              #A8894A 0%,
              #C9A96A 18%,
              #F0E2C4 38%,
              #FFFFFF 50%,
              #F0E2C4 62%,
              #C9A96A 82%,
              #A8894A 100%
            );
            background-size: 220% 100%;
            animation: goldShine 2.4s linear infinite;
            box-shadow:
              0 0 18px rgba(201, 169, 106, 0.85),
              0 4px 16px rgba(201, 169, 106, 0.45);
            z-index: 3;
          }
          .login-container::after {
            content: '';
            position: absolute;
            top: 7px;
            left: 0;
            right: 0;
            height: 56px;
            background: linear-gradient(180deg, rgba(201, 169, 106, 0.18) 0%, transparent 100%);
            pointer-events: none;
            z-index: 1;
          }
          @keyframes goldShine {
            0% { background-position: 100% 0; }
            100% { background-position: -100% 0; }
          }
          @keyframes cardIn {
            from {
              opacity: 0;
              transform: translateY(18px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .logo-section {
            text-align: center;
            margin-bottom: 36px;
            position: relative;
            z-index: 2;
          }
          .logo-ring {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 5px;
            border-radius: 50%;
            background: linear-gradient(145deg, #C9A96A 0%, #E9DDD0 45%, #C9A96A 100%);
            box-shadow:
              0 10px 28px rgba(201, 169, 106, 0.35),
              0 2px 0 rgba(255, 255, 255, 0.5) inset;
            margin-bottom: 18px;
          }
          .logo-icon {
            width: 88px !important;
            height: 88px !important;
            border-radius: 50%;
            object-fit: cover;
            background: #FFFFFF;
            display: block;
          }
          .title {
            font-size: 2.15rem;
            font-weight: 800;
            color: #0F0F10;
            margin: 0 0 10px;
            letter-spacing: -0.02em;
            line-height: 1.15;
          }
          .subtitle {
            color: #8A8A8A;
            font-size: 0.98rem;
            margin: 0;
            line-height: 1.5;
            font-weight: 500;
          }
          .form-group {
            margin-bottom: 24px;
            position: relative;
            z-index: 2;
          }
          .form-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2B2B2B;
            font-size: 0.95rem;
          }
          .form-input {
            width: 100%;
            padding: 16px 20px;
            border: 2px solid #E9DDD0;
            border-radius: 12px;
            font-size: 1rem;
            transition: all 0.3s ease;
            box-sizing: border-box;
            background: #FFFFFF;
            position: relative;
            color: #2B2B2B;
          }
          .form-input:focus {
            outline: none;
            border-color: var(--system-secondary, #C9A96A);
            background: #FFFFFF;
            box-shadow: 0 0 0 4px rgba(201, 169, 106, 0.18);
            transform: translateY(-2px);
          }
          .form-input::placeholder {
            color: #8A8A8A;
          }
          .input-wrapper {
            position: relative;
          }
          .input-icon {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: #8A8A8A;
            font-size: 1.1rem;
          }
          .input-with-icon {
            padding-left: 48px;
          }
          .forgot-link {
            color: #C9A96A;
            cursor: pointer;
            font-weight: 600;
            text-decoration: none;
            font-size: 0.86rem;
            letter-spacing: 0.01em;
            border-bottom: 1px solid transparent;
            transition: color 0.2s ease, border-color 0.2s ease;
          }
          .forgot-link:hover {
            color: #B8954F;
            border-bottom-color: rgba(184, 149, 79, 0.7);
          }
          .login-btn {
            width: 100%;
            padding: 17px 16px;
            background: linear-gradient(135deg, #C9A96A 0%, #B8954F 55%, #A8894A 100%);
            color: #FFFFFF;
            border: none;
            border-radius: 14px;
            font-size: 1.08rem;
            font-weight: 700;
            letter-spacing: 0.04em;
            cursor: pointer;
            transition: all 0.28s ease;
            box-shadow:
              0 1px 0 rgba(255, 255, 255, 0.28) inset,
              0 10px 28px rgba(201, 169, 106, 0.38);
            position: relative;
            overflow: hidden;
            z-index: 2;
          }
          .login-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
            transition: left 0.55s ease;
          }
          .login-btn:hover:not(:disabled)::before {
            left: 100%;
          }
          .login-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, #D4B57A 0%, #C9A96A 50%, #B8954F 100%);
            transform: translateY(-2px);
            box-shadow:
              0 1px 0 rgba(255, 255, 255, 0.35) inset,
              0 14px 34px rgba(201, 169, 106, 0.48);
          }
          .login-btn:active:not(:disabled) {
            transform: translateY(0);
          }
          .login-btn:disabled {
            opacity: 0.72;
            cursor: wait;
            transform: none;
          }
          .error-message {
            background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
            color: white;
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 20px;
            text-align: center;
            font-weight: 600;
            box-shadow: 0 4px 16px rgba(220, 53, 69, 0.3);
            animation: shake 0.5s ease-in-out;
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
          .form-input.error-border {
            border-color: #dc3545 !important;
            background: #fff5f5 !important;
          }
          @media (max-width: 480px) {
            .login-page {
              padding: 20px 12px;
              align-items: center;
            }
            .login-container {
              padding: 34px 22px 28px;
              border-radius: 20px;
            }
            .login-container::before {
              height: 6px;
            }
            .title {
              font-size: 1.85rem;
            }
            .logo-icon {
              width: 76px !important;
              height: 76px !important;
            }
            .login-btn {
              padding: 16px;
              font-size: 1.05rem;
            }
          }
          
          @media (max-width: 768px) {
            .login-btn {
              padding: 16px;
              font-size: 1.1rem;
            }
          }
          .vac-input {
            width: 45px;
            height: 55px;
            text-align: center;
            font-size: 1.5rem;
            font-weight: 700;
            border: 2px solid #E9DDD0;
            border-radius: 10px;
            background: #F7F4EE;
            color: #0F0F10;
            transition: border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease, transform 0.25s ease;
            box-shadow: 0 2px 6px rgba(201, 169, 106, 0.16);
            outline: none;
          }
          .vac-input:focus {
            outline: none;
            border-color: var(--system-secondary) !important;
            box-shadow: 0 0 0 4px rgba(201, 169, 106, 0.2) !important;
            background: #ffffff !important;
            transform: scale(1.05);
          }
          .vac-input.error-border {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.12) !important;
            background: #fff8f8 !important;
          }
          .vac-input.error-border:focus {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.16) !important;
            background: #fff8f8 !important;
            transform: scale(1.05);
          }
          .otp-feedback {
            margin-top: 14px;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 12px;
            font-size: 0.9rem;
            font-weight: 600;
            letter-spacing: 0.01em;
            line-height: 1.35;
            border: 1px solid transparent;
            text-align: left;
            animation: otpFeedbackIn 0.35s cubic-bezier(0.22, 1, 0.36, 1);
          }
          .otp-feedback-icon {
            flex-shrink: 0;
            width: 34px;
            height: 34px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            color: #fff;
          }
          .otp-feedback-text {
            flex: 1;
            min-width: 0;
          }
          .otp-feedback-title {
            display: block;
            font-size: 0.92rem;
            font-weight: 700;
          }
          .otp-feedback-sub {
            display: block;
            margin-top: 2px;
            font-size: 0.78rem;
            font-weight: 500;
            opacity: 0.85;
          }
          .otp-feedback.invalid {
            color: #a11f2e;
            background: linear-gradient(135deg, rgba(220, 53, 69, 0.1) 0%, rgba(255, 107, 129, 0.14) 100%);
            border-color: rgba(220, 53, 69, 0.28);
            box-shadow: 0 8px 24px rgba(220, 53, 69, 0.1);
          }
          .otp-feedback.invalid .otp-feedback-icon {
            background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.35);
          }
          .otp-feedback.checking {
            color: #2B2B2B;
            background: linear-gradient(135deg, rgba(201, 169, 106, 0.14) 0%, rgba(233, 221, 208, 0.45) 100%);
            border-color: rgba(201, 169, 106, 0.35);
            box-shadow: 0 8px 24px rgba(201, 169, 106, 0.12);
          }
          .otp-feedback.checking .otp-feedback-icon {
            background: linear-gradient(135deg, var(--system-secondary) 0%, var(--system-secondary-hover) 100%);
            box-shadow: 0 4px 12px rgba(201, 169, 106, 0.35);
          }
          .otp-feedback-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.35);
            border-top-color: #fff;
            border-radius: 50%;
            animation: otpSpin 0.75s linear infinite;
          }
          .otp-feedback.valid {
            color: #0f7a3a;
            background: linear-gradient(135deg, rgba(40, 167, 69, 0.12) 0%, rgba(46, 204, 113, 0.16) 100%);
            border-color: rgba(40, 167, 69, 0.28);
            box-shadow: 0 8px 24px rgba(40, 167, 69, 0.12);
          }
          .otp-feedback.valid .otp-feedback-icon {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.35);
          }
          .otp-verify-btn {
            padding: 12px 24px;
            background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.45s ease, box-shadow 0.45s ease, opacity 0.3s ease;
            box-shadow: 0 4px 14px rgba(40, 167, 69, 0.3);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            min-width: 160px;
            overflow: hidden;
            position: relative;
            isolation: isolate;
          }
          .otp-verify-btn::before {
            content: '';
            position: absolute;
            inset: 0;
            background:
              linear-gradient(105deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 42%),
              linear-gradient(90deg, #22a84a 0%, #2ecc71 52%, #1fbf8f 100%);
            transform: scaleX(0);
            transform-origin: left center;
            transition: transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 0;
            pointer-events: none;
          }
          .otp-verify-btn:disabled:not(.success):not(.loading) {
            opacity: 0.55;
            cursor: not-allowed;
            box-shadow: none;
          }
          .otp-verify-btn.loading {
            opacity: 1;
            cursor: wait;
            background: linear-gradient(90deg, #8A8A8A 0%, #2B2B2B 100%);
            box-shadow: 0 4px 14px rgba(15, 15, 16, 0.28);
          }
          .otp-verify-btn.success {
            opacity: 1;
            cursor: default;
            box-shadow: 0 8px 22px rgba(40, 167, 69, 0.38);
          }
          .otp-verify-btn.success::before {
            transform: scaleX(1);
          }
          .otp-verify-btn-content {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            position: relative;
            z-index: 1;
          }
          .otp-verify-btn.success .otp-verify-btn-content {
            animation: otpSuccessSlide 0.55s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
          }
          .otp-verify-spinner {
            width: 18px;
            height: 18px;
            border: 2.5px solid rgba(255, 255, 255, 0.28);
            border-top-color: #fff;
            border-radius: 50%;
            animation: otpSpin 0.85s linear infinite;
          }
          .otp-verify-check {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.22);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .otp-verify-check svg {
            width: 13px;
            height: 13px;
            stroke: #fff;
            stroke-width: 3;
            fill: none;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-dasharray: 24;
            stroke-dashoffset: 24;
            animation: otpCheckDraw 0.45s 0.35s ease forwards;
          }
          @keyframes otpFeedbackIn {
            from { opacity: 0; transform: translateY(6px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes otpSuccessSlide {
            from { opacity: 0; transform: translateX(-18px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes otpCheckDraw {
            to { stroke-dashoffset: 0; }
          }
          @keyframes otpSpin {
            to { transform: rotate(360deg); }
          }
          
          /* OTP Modal Responsive Styles */
          :global(.otp-modal-content) {
            max-width: 500px !important;
            margin: 10px !important;
          }
          
          :global(.otp-modal-body) {
            padding: 24px !important;
          }
          
          @media (max-width: 768px) {
            :global(.otp-modal-content) {
              max-width: 95% !important;
              margin: 5px !important;
            }
            
            :global(.otp-modal-body) {
              padding: 20px !important;
            }
            
            .vac-input {
              width: 38px !important;
              height: 48px !important;
              font-size: 1.3rem !important;
            }
          }
          
          @media (max-width: 480px) {
            :global(.otp-modal-content) {
              max-width: 98% !important;
              margin: 2px !important;
            }
            
            :global(.otp-modal-body) {
              padding: 16px !important;
            }
            
            .otp-title {
              font-size: 1.3rem !important;
              margin-bottom: 6px !important;
            }
            
            .otp-subtitle {
              font-size: 0.85rem !important;
            }
            
            .otp-inputs-container {
              gap: 6px !important;
              margin-bottom: 12px !important;
            }
            
            .vac-input {
              width: 35px !important;
              height: 45px !important;
              font-size: 1.2rem !important;
            }
            
            .otp-buttons-container {
              flex-direction: column !important;
              gap: 10px !important;
            }
            
            .otp-cancel-btn,
            .otp-verify-btn {
              width: 100% !important;
              padding: 12px !important;
              font-size: 0.95rem !important;
            }
            
            .otp-resend-container {
              margin-top: 12px !important;
            }
            
            .otp-resend-btn {
              width: 100% !important;
              padding: 10px !important;
              font-size: 0.85rem !important;
            }
          }
          
          @media (max-width: 768px) {
            .otp-buttons-container {
              gap: 10px !important;
            }
            
            .otp-cancel-btn,
            .otp-verify-btn {
              padding: 11px 20px !important;
              font-size: 0.95rem !important;
            }
            
            .otp-resend-btn {
              padding: 10px 18px !important;
              font-size: 0.88rem !important;
            }
          }
        `}</style>

        <div className="login-container">
          <div className="logo-section">
            <div className="logo-ring">
              <Image src="/logo.png" alt="Logo" width={88} height={88} className="logo-icon" style={{ borderRadius: '50%' }} priority />
            </div>
            <h1 className="title">Login</h1>
            <p className="subtitle">Welcome back! Please sign in to continue</p>
          </div>

        <form onSubmit={handleLogin} autoComplete="off">
            <div className="form-group" style={{ marginBottom: usernameError ? 4 : 38 }}>
              <FloatingLabelInput
                label="Username"
                value={assistant_id}
                onChange={e => {
                  // Remove spaces from username input
                  const value = e.target.value.replace(/\s/g, '');
                  setAssistantId(value);
                  
                  // Remove from sessionStorage if input is empty
                  if (typeof window !== 'undefined') {
                    if (value === '') {
                      sessionStorage.removeItem('forgot_password_username');
                    } else {
                      sessionStorage.setItem('forgot_password_username', value);
                    }
                  }
                }}
                onKeyDown={(e) => {
                  // Prevent space key from being entered
                  if (e.key === ' ') {
                    e.preventDefault();
                  }
                }}
                error={usernameError || undefined}
                autoComplete="username"
                type="text"
              />
            </div>
            <div className="form-group" style={{ marginBottom: passwordError ? 4 : 24 }}>
              <FloatingLabelInput
                label="Password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                }}
                error={passwordError || undefined}
                autoComplete="current-password"
                type="password"
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 }}>
                <a
                  href="#"
                  className="forgot-link"
                  onClick={e => { 
                    e.preventDefault();
                    handleForgotPassword();
                  }}
                >
                  Forgot your password?
                </a>
              </div>
              {/* Remove duplicate message display */}
            </div>

            {/* Show redirect message */}
            {redirectMessage && (
              <div
                className="redirect-message"
                style={{
                  background: '#0F0F10',
                  color: '#F7F4EE',
                  borderRadius: 12,
                  padding: '12px 16px',
                  margin: '16px 0 0 0',
                  fontWeight: 600,
                  boxShadow: '0 4px 16px rgba(15, 15, 16, 0.2)',
                  border: '1.5px solid #C9A96A',
                  textAlign: 'center',
                  fontSize: '0.95rem',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  gap: 8,
                  overflow: 'hidden',
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.3 }}>🔒</span>
                <span
                  style={{
                    minWidth: 0,
                    flex: 1,
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                    lineHeight: 1.45,
                  }}
                >
                  {redirectMessage}
                </span>
              </div>
            )}

            {/* Show error messages */}
            {(message || forgotMsg) && (
              <div style={{
                background: 'linear-gradient(135deg, #dc3545 0%, #e74c3c 100%)',
                color: 'white',
                borderRadius: 8,
                padding: '12px 16px',
                margin: '16px 0 0 0',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(220, 53, 69, 0.15)',
                textAlign: 'center',
                fontSize: '1rem',
                maxWidth: 400,
                marginLeft: 'auto',
                marginRight: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                flexWrap: 'nowrap'
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>❗</span> 
                {message === 'student_account_deactivated' ? (
                  <span>
                    Access unavailable: This account is deactivated. Please contact{' '}
                    <a
                      href="/contact_developer"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push('/contact_developer');
                      }}
                      style={{
                        color: 'white',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                    >
                      developer
                    </a>
                  </span>
                ) : message === 'device_limit_reached' ? (
                  <span>
                    Access unavailable: You have reached the maximum number of allowed devices for your account. Contact{' '}
                    <a
                      href="/contact_developer"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push('/contact_developer');
                      }}
                      style={{
                        color: 'white',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                    >
                      developer
                    </a>
                  </span>
                ) : message === 'ACCOUNT_NOT_FOUND_SIGNUP' || forgotMsg === 'ACCOUNT_NOT_FOUND' ? (
                  <span>
                    Account Not Found. Please contact{' '}
                    <a
                      href="/contact_developer"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push('/contact_developer');
                      }}
                      style={{
                        color: 'white',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                    >
                      developer
                    </a>
                  </span>
                ) : forgotMsg ? (
                  <span>{forgotMsg}</span>
                ) : message && message.includes('developer') ? (
                    <span>
                      {message.split('(developer)').map((part, index, array) => {
                        if (index === array.length - 1) {
                          return part;
                        }
                        return (
                          <span key={index}>
                            {part}(
                            <a
                              href="/contact_developer"
                              style={{ 
                                color: 'white', 
                                textDecoration: 'underline', 
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                router.push('/contact_developer');
                              }}
                            >
                              developer
                            </a>
                            )
                          </span>
                        );
                      })}
                    </span>
                  ) : (
                    message
                  )}
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loginMutation.isPending} style={{ marginTop: 10 }}>
              {loginMutation.isPending ? "Logging in..." : "Continue"}
            </button>
          </form>

        </div>

        {/* OTP Popup Modal */}
        <Modal
          opened={otpPopupOpen}
          onClose={() => {
            setOtpPopupOpen(false);
            setOtp(['', '', '', '', '', '', '', '']);
            setOtpError('');
            setOtpVerified(false);
          }}
          title={null}
          centered
          radius="md"
          size="md"
          withCloseButton={false}
          overlayProps={{ backgroundOpacity: 0.55, blur: 3, color: '#0F0F10' }}
          styles={{
            content: {
              background: 'linear-gradient(165deg, #FFFEFB 0%, #F7F4EE 100%)',
              boxShadow: '0 24px 64px rgba(15, 15, 16, 0.35), 0 0 0 1px rgba(201, 169, 106, 0.28)',
              border: '1px solid rgba(201, 169, 106, 0.35)',
              borderRadius: 20,
              maxWidth: '500px',
              margin: '10px',
              overflow: 'hidden',
            },
            header: {
              display: 'none',
            },
            body: {
              padding: '28px 24px 24px',
              position: 'relative',
            }
          }}
          classNames={{
            content: 'otp-modal-content',
            body: 'otp-modal-body'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 className="otp-title" style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0F0F10', marginBottom: '8px' }}>
              Enter OTP Code
            </h2>
            <p className="otp-subtitle" style={{ color: '#8A8A8A', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              We've sent an 8-digit code to your <Image src="/mail.svg" alt="Email" width={20} height={20} /> email
            </p>
            <p
              className="otp-spam-hint"
              style={{
                marginTop: '10px',
                marginBottom: 0,
                color: '#8a939b',
                fontSize: '13px',
                lineHeight: 1.45,
                fontWeight: 400,
              }}
            >
              Didn&apos;t receive the email? Check your{' '}
              <span style={{ color: '#5c6770', fontWeight: 600 }}>
                Spam or Junk folder
              </span>
              .
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div className="vac-inputs-container otp-inputs-container" style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '8px',
              marginBottom: '16px'
            }}>
              {otp.map((char, index) => (
                <input
                  key={index}
                  name={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  value={char}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  onPaste={(e) => handleOtpPaste(e, index)}
                  className={otpError ? 'vac-input error-border' : 'vac-input'}
                />
              ))}
            </div>
            {isVerifyingOtp && !otpVerified && (
              <div className="otp-feedback checking">
                <span className="otp-feedback-icon" aria-hidden="true">
                  <span className="otp-feedback-spinner" />
                </span>
                <span className="otp-feedback-text">
                  <span className="otp-feedback-title">Verifying your code</span>
                  <span className="otp-feedback-sub">Please wait while we confirm your OTP</span>
                </span>
              </div>
            )}
            {otpVerified && (
              <div className="otp-feedback valid">
                <span className="otp-feedback-icon" aria-hidden="true">✓</span>
                <span className="otp-feedback-text">
                  <span className="otp-feedback-title">OTP verified successfully</span>
                  <span className="otp-feedback-sub">Redirecting you to reset your password…</span>
                </span>
              </div>
            )}
            {!isVerifyingOtp && !otpVerified && otpError && (
              <div className="otp-feedback invalid">
                <span className="otp-feedback-icon" aria-hidden="true">✕</span>
                <span className="otp-feedback-text">
                  <span className="otp-feedback-title">{otpError}</span>
                  <span className="otp-feedback-sub">
                    {otpError.toLowerCase().includes('complete')
                      ? 'Enter all 8 digits of your OTP code'
                      : otpError.toLowerCase().includes('expired')
                      ? 'Request a new code and try again'
                      : 'Double-check the code from your email and try again'}
                  </span>
                </span>
              </div>
            )}
            <div className="otp-resend-container" style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                className="otp-resend-btn"
                onClick={handleResendOtp}
                disabled={isSendingOtp || resendCooldown > 0}
                style={{
                  background: resendCooldown > 0 ? 'linear-gradient(135deg, #8A8A8A 0%, #2B2B2B 100%)' : 'linear-gradient(135deg, var(--system-secondary) 0%, var(--system-secondary-hover) 100%)',
                  border: 'none',
                  color: 'white',
                  cursor: (isSendingOtp || resendCooldown > 0) ? 'not-allowed' : 'pointer',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  padding: '10px 20px',
                  boxShadow: resendCooldown > 0 ? '0 2px 8px rgba(15, 15, 16, 0.2)' : '0 4px 12px rgba(201, 169, 106, 0.3)',
                  transition: 'all 0.3s ease',
                  opacity: (isSendingOtp || resendCooldown > 0) ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isSendingOtp && resendCooldown === 0) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(201, 169, 106, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSendingOtp && resendCooldown === 0) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(201, 169, 106, 0.3)';
                  }
                }}
              >
                {isSendingOtp 
                  ? 'Sending...' 
                  : resendCooldown > 0 
                    ? `Resend OTP (${Math.floor(resendCooldown / 60)}:${String(resendCooldown % 60).padStart(2, '0')})`
                    : 'Resend OTP'
                }
              </button>
            </div>
          </div>

          <div className="otp-buttons-container" style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            <button
              className={`otp-verify-btn ${isVerifyingOtp ? 'loading' : ''} ${otpVerified ? 'success' : ''}`}
              onClick={handleVerifyOtp}
              disabled={otpVerified || isVerifyingOtp || otp.join('').length !== 8}
            >
              <span className="otp-verify-btn-content">
                {otpVerified ? (
                  <>
                    <span className="otp-verify-check" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>Verified</span>
                  </>
                ) : isVerifyingOtp ? (
                  <>
                    <span className="otp-verify-spinner" aria-hidden="true" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify</span>
                )}
              </span>
            </button>
            <button
              onClick={() => {
                setOtpPopupOpen(false);
                setOtp(['', '', '', '', '', '', '', '']);
                setOtpError('');
                setOtpVerified(false);
              }}
              disabled={isVerifyingOtp || otpVerified}
              style={{
                padding: '12px 24px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isVerifyingOtp ? 'not-allowed' : 'pointer',
                opacity: isVerifyingOtp ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              Cancel
            </button>
          </div>

          <NeedHelp style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #E9DDD0' }} />
        </Modal>
    </div>
  );
}