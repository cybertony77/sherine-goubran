import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Title from "../components/Title";
import apiClient from '../lib/axios';
import NeedHelp from '../components/NeedHelp';

// Access Denied Preloader Component (same as _app.js)
function AccessDeniedPreloader() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 15, 16, 0.92)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      color: '#F7F4EE',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '4px solid rgba(201, 169, 106, 0.25)',
        borderTop: '4px solid #C9A96A',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <div>🔒 Access Denied</div>
      <div style={{ fontSize: '1rem', opacity: 0.8, color: '#8A8A8A' }}>Redirecting to login...</div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function ForgotPassword() {
  const router = useRouter();
  const { id, sig } = router.query;
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);

  const allFieldsFilled =
    form.newPassword.trim().length > 0 && form.confirmPassword.trim().length > 0;

  // Verify HMAC signature
  useEffect(() => {
    const verifySignature = async () => {
      if (!id || !sig) {
        setShowAccessDenied(true);
        setTimeout(() => {
          setShowAccessDenied(false);
          router.push('/login');
        }, 1500);
        return;
      }

      try {
        const response = await apiClient.post('/api/auth/forgot-password/verify-signature', {
          id: id,
          sig: sig
        });

        if (response.data.valid) {
          setIsAuthorized(true);
          // Save username/id to sessionStorage
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('forgot_password_username', id);
          }
        } else {
          // Invalid signature - show access denied preloader then redirect
          setShowAccessDenied(true);
          setTimeout(() => {
            setShowAccessDenied(false);
            router.push('/login');
          }, 1500);
          return;
        }
      } catch (err) {
        // Invalid signature - show access denied preloader then redirect
        setShowAccessDenied(true);
        setTimeout(() => {
          setShowAccessDenied(false);
          router.push('/login');
        }, 1500);
        return;
      } finally {
        setIsChecking(false);
      }
    };

    verifySignature();
  }, [id, sig, router]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (!resetSuccess) return;
    const timer = setTimeout(() => {
      router.push('/login');
    }, 2000);
    return () => clearTimeout(timer);
  }, [resetSuccess, router]);

  useEffect(() => {
    if (!resetFailed) return;
    const timer = setTimeout(() => {
      setResetFailed(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, [resetFailed]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setForm({ ...form, [e.target.name]: newValue });
    setError("");
    setResetFailed(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (resetSuccess || resetFailed) return;
    setError("");
    setResetSuccess(false);
    setResetFailed(false);

    // Validation
    if (!form.newPassword || !form.confirmPassword) {
      setError("❌ All fields are required");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("❌ New password and confirm password do not match");
      return;
    }

    if (form.newPassword.length < 8) {
      setError("❌ New password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.post('/api/auth/forgot-password/reset', {
        id: id,
        newPassword: form.newPassword,
        sig: sig
      });

      setIsSubmitting(false);
      setResetSuccess(true);
      setForm({ newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err.response?.data?.error || "❌ Failed to reset password");
      setIsSubmitting(false);
      setResetFailed(true);
    }
  };

  // Show access denied preloader
  if (showAccessDenied) {
    return <AccessDeniedPreloader />;
  }

  if (isChecking) {
    return (
      <div className="forgot-page">
        <div className="verifying-container">
          <p className="verifying-text">Verifying signature...</p>
          <div className="verifying-spinner" />
        </div>
        <style jsx>{`
          .forgot-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
            background:
              radial-gradient(ellipse 80% 55% at 50% -10%, rgba(201, 169, 106, 0.28) 0%, transparent 55%),
              radial-gradient(ellipse 50% 40% at 100% 100%, rgba(233, 221, 208, 0.12) 0%, transparent 50%),
              var(--system-page-bg, #0F0F10);
          }
          .verifying-container {
            background: linear-gradient(165deg, #FFFEFB 0%, #F7F4EE 100%);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 24px 64px rgba(15, 15, 16, 0.35);
            border: 1px solid rgba(201, 169, 106, 0.35);
            max-width: 360px;
            width: 100%;
          }
          .verifying-text {
            color: #2B2B2B;
            font-size: 1rem;
            margin: 0 0 20px;
            font-weight: 600;
          }
          .verifying-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(201, 169, 106, 0.22);
            border-top: 4px solid #C9A96A;
            border-radius: 50%;
            margin: 0 auto;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="forgot-page">
        <div className="forgot-password-wrapper">
          <div className="error-message">
            {error || 'Unauthorized. Please verify OTP first.'}
          </div>
        </div>
        <style jsx>{`
          .forgot-page {
            min-height: 100vh;
            padding: 24px 16px;
            background:
              radial-gradient(ellipse 80% 55% at 50% -10%, rgba(201, 169, 106, 0.28) 0%, transparent 55%),
              var(--system-page-bg, #0F0F10);
          }
          .forgot-password-wrapper {
            max-width: 600px;
            margin: 40px auto;
            padding: 24px;
          }
          .error-message {
            background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
            color: white;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            font-weight: 600;
            box-shadow: 0 4px 16px rgba(220, 53, 69, 0.3);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="forgot-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
      }}
    >
      <div className="forgot-password-wrapper">
        <style jsx>{`
          .forgot-page {
            min-height: 100vh;
            min-height: 100dvh;
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
          }
          .forgot-password-wrapper {
            max-width: 520px;
            width: 100%;
            margin: 0 auto;
            padding: 0;
          }
          .form-container {
            background: linear-gradient(165deg, #FFFEFB 0%, #F7F4EE 55%, #F3EEE6 100%);
            border-radius: 24px;
            padding: 36px 32px 28px;
            box-shadow:
              0 1px 0 rgba(255, 255, 255, 0.65) inset,
              0 24px 64px rgba(15, 15, 16, 0.35),
              0 8px 24px rgba(201, 169, 106, 0.12);
            border: 1px solid rgba(201, 169, 106, 0.35);
            position: relative;
            overflow: hidden;
          }
          .form-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
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
            box-shadow: 0 0 16px rgba(201, 169, 106, 0.75);
          }
          @keyframes goldShine {
            0% { background-position: 100% 0; }
            100% { background-position: -100% 0; }
          }
          .form-group {
            margin-bottom: 24px;
            position: relative;
            z-index: 1;
          }
          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2B2B2B;
            font-size: 0.95rem;
          }
          .form-input {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #E9DDD0;
            border-radius: 12px;
            font-size: 1rem;
            transition: all 0.3s ease;
            box-sizing: border-box;
            background: #FFFFFF;
            color: #2B2B2B;
          }
          .form-input:focus {
            outline: none;
            border-color: #C9A96A;
            background: #FFFFFF;
            box-shadow: 0 0 0 4px rgba(201, 169, 106, 0.18);
          }
          .form-input::placeholder {
            color: #8A8A8A;
          }
          .hint-text {
            color: #8A8A8A;
            font-size: 0.85rem;
            margin-top: 6px;
            display: block;
          }
          .toggle-visibility {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.7;
            transition: opacity 0.2s ease;
          }
          .toggle-visibility:hover {
            opacity: 1;
          }
          .submit-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #C9A96A 0%, #B8954F 55%, #A8894A 100%);
            color: #FFFFFF;
            border: none;
            border-radius: 14px;
            font-size: 1.08rem;
            font-weight: 700;
            letter-spacing: 0.03em;
            cursor: pointer;
            transition:
              background 0.45s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.55s cubic-bezier(0.22, 1, 0.36, 1),
              transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
              opacity 0.35s ease;
            box-shadow:
              0 1px 0 rgba(255, 255, 255, 0.28) inset,
              0 10px 28px rgba(201, 169, 106, 0.38);
            margin-top: 8px;
            overflow: hidden;
            position: relative;
            isolation: isolate;
            z-index: 1;
          }
          .submit-btn.ready {
            background: linear-gradient(135deg, #D4B57A 0%, #C9A96A 50%, #B8954F 100%);
            box-shadow:
              0 1px 0 rgba(255, 255, 255, 0.32) inset,
              0 12px 30px rgba(201, 169, 106, 0.42);
          }
          .submit-btn::before {
            content: '';
            position: absolute;
            inset: 0;
            background:
              linear-gradient(105deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 42%),
              linear-gradient(90deg, #22a84a 0%, #2ecc71 52%, #1fbf8f 100%);
            transform: scaleX(0);
            transform-origin: left center;
            transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 1;
            pointer-events: none;
          }
          .submit-btn::after {
            content: '';
            position: absolute;
            inset: 0;
            background:
              linear-gradient(105deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 42%),
              linear-gradient(90deg, #dc3545 0%, #e74c3c 55%, #c0392b 100%);
            transform: scaleX(0);
            transform-origin: left center;
            transition: transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 1;
            pointer-events: none;
          }
          .submit-btn:hover:not(:disabled):not(.success):not(.error):not(.loading) {
            transform: translateY(-2px);
            box-shadow:
              0 1px 0 rgba(255, 255, 255, 0.35) inset,
              0 14px 34px rgba(201, 169, 106, 0.48);
          }
          .submit-btn:disabled:not(.success):not(.error):not(.loading) {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }
          .submit-btn.loading {
            opacity: 1;
            cursor: wait;
            background: linear-gradient(90deg, #8A8A8A 0%, #2B2B2B 100%);
            box-shadow: 0 8px 26px rgba(15, 15, 16, 0.28);
          }
          .submit-btn.success {
            opacity: 1;
            cursor: default;
            box-shadow: 0 12px 32px rgba(40, 167, 69, 0.38);
          }
          .submit-btn.success::before {
            transform: scaleX(1);
          }
          .submit-btn.error {
            opacity: 1;
            cursor: default;
            box-shadow: 0 12px 32px rgba(220, 53, 69, 0.35);
          }
          .submit-btn.error::after {
            transform: scaleX(1);
          }
          .submit-btn-content {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            min-height: 28px;
            position: relative;
            z-index: 2;
          }
          .submit-btn.success .submit-btn-content,
          .submit-btn.error .submit-btn-content {
            animation: resetContentSlide 0.7s 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
          }
          .submit-btn-spinner {
            width: 20px;
            height: 20px;
            border: 2.5px solid rgba(255, 255, 255, 0.28);
            border-top-color: #fff;
            border-radius: 50%;
            animation: resetSpin 0.85s linear infinite;
          }
          .submit-btn-check,
          .submit-btn-x {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.22);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            animation: resetCheckPop 0.55s 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
          }
          .submit-btn-check svg,
          .submit-btn-x svg {
            width: 15px;
            height: 15px;
            stroke: #fff;
            stroke-width: 3;
            fill: none;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-dasharray: 28;
            stroke-dashoffset: 28;
            animation: resetCheckDraw 0.55s 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }
          @keyframes resetContentSlide {
            from { opacity: 0; transform: translateX(-36px); filter: blur(2px); }
            to { opacity: 1; transform: translateX(0); filter: blur(0); }
          }
          @keyframes resetCheckPop {
            from { opacity: 0; transform: translateX(-14px) scale(0.7); }
            to { opacity: 1; transform: translateX(0) scale(1); }
          }
          @keyframes resetCheckDraw {
            to { stroke-dashoffset: 0; }
          }
          @keyframes resetSpin {
            to { transform: rotate(360deg); }
          }
          .error-message {
            background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
            color: white;
            border-radius: 12px;
            padding: 16px;
            margin-top: 16px;
            text-align: center;
            font-weight: 600;
            box-shadow: 0 4px 16px rgba(220, 53, 69, 0.3);
            position: relative;
            z-index: 1;
          }
          
          @media (max-width: 768px) {
            .form-container {
              padding: 28px 22px 24px !important;
            }
            
            .form-group {
              margin-bottom: 20px !important;
            }
            
            .form-group label {
              font-size: 0.9rem !important;
            }
            
            .form-input {
              padding: 12px 14px !important;
              font-size: 0.95rem !important;
            }
            
            .submit-btn {
              padding: 14px !important;
              font-size: 1rem !important;
            }
            
            .error-message {
              padding: 14px !important;
              font-size: 0.9rem !important;
            }

            .forgot-password-wrapper {
              padding: 0 !important;
              margin: 0 auto !important;
            }
          }
          
          @media (max-width: 480px) {
            .forgot-password-wrapper {
              padding: 0 !important;
              margin: 0 auto !important;
            }
            
            .form-container {
              padding: 24px 18px 20px !important;
              border-radius: 18px !important;
            }
            
            .form-group {
              margin-bottom: 18px !important;
            }
            
            .form-group label {
              font-size: 0.85rem !important;
              margin-bottom: 6px !important;
            }
            
            .form-input {
              padding: 12px 14px !important;
              font-size: 0.9rem !important;
              border-radius: 10px !important;
            }
            
            .submit-btn {
              padding: 14px !important;
              font-size: 0.95rem !important;
              border-radius: 12px !important;
            }
            
            .error-message {
              padding: 12px !important;
              font-size: 0.85rem !important;
              border-radius: 10px !important;
            }
          }
        `}</style>
        <Title backText="Back to Login" href="/">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Image src="/refresh.svg" alt="Reset Password" width={32} height={32} />
            Reset Password
          </div>
        </Title>
        <div className="form-container">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={form.newPassword}
                  onChange={handleChange}
                  style={{ paddingRight: '50px' }}
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  <img 
                    src={showNewPassword ? "/hide.svg" : "/show.svg"} 
                    alt={showNewPassword ? "Hide password" : "Show password"}
                    style={{ width: '20px', height: '20px' }}
                  />
                </button>
              </div>
              <small className="hint-text">
                Must be at least 8 characters long
              </small>
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  style={{ paddingRight: '50px' }}
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <img 
                    src={showConfirmPassword ? "/hide.svg" : "/show.svg"} 
                    alt={showConfirmPassword ? "Hide password" : "Show password"}
                    style={{ width: '20px', height: '20px' }}
                  />
                </button>
              </div>
            </div>
            <button 
              type="submit" 
              className={`submit-btn ${allFieldsFilled && !isSubmitting && !resetSuccess && !resetFailed ? 'ready' : ''} ${isSubmitting ? 'loading' : ''} ${resetSuccess ? 'success' : ''} ${resetFailed ? 'error' : ''}`}
              disabled={resetSuccess || resetFailed || isSubmitting || !allFieldsFilled}
            >
              <span className="submit-btn-content">
                {resetSuccess ? (
                  <>
                    <span className="submit-btn-check" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>Password Reset</span>
                  </>
                ) : resetFailed ? (
                  <>
                    <span className="submit-btn-x" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </span>
                    <span>Reset Failed</span>
                  </>
                ) : isSubmitting ? (
                  <>
                    <span className="submit-btn-spinner" aria-hidden="true" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <span>Reset Password</span>
                )}
              </span>
            </button>
          </form>
          {error && !resetSuccess && <div className="error-message">{error}</div>}
          <NeedHelp style={{ borderTop: '1px solid #E9DDD0', marginTop: 20, paddingTop: 16 }} />
        </div>
      </div>
    </div>
  );
}
